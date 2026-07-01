import { supabaseAdmin as supabase } from '@/lib/supabase-admin'

const LINKEDIN_AUTH_URL = 'https://www.linkedin.com/oauth/v2/authorization'
const LINKEDIN_TOKEN_URL = 'https://www.linkedin.com/oauth/v2/accessToken'
const LINKEDIN_API_URL = 'https://api.linkedin.com/v2'

function getRedirectUri(): string {
  return process.env.LINKEDIN_REDIRECT_URI ?? 'http://localhost:3000/auth/linkedin/callback'
}

export function getLinkedInAuthUrl(state: string): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.LINKEDIN_CLIENT_ID!,
    redirect_uri: getRedirectUri(),
    scope: 'openid profile w_member_social',
    state,
  })
  return `${LINKEDIN_AUTH_URL}?${params.toString()}`
}

export async function exchangeCodeForToken(code: string): Promise<{ access_token: string; expires_in: number }> {
  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: getRedirectUri(),
    client_id: process.env.LINKEDIN_CLIENT_ID!,
    client_secret: process.env.LINKEDIN_CLIENT_SECRET!,
  })

  const res = await fetch(LINKEDIN_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Token exchange failed: ${text}`)
  }

  return res.json()
}

export async function getPersonUrn(accessToken: string): Promise<string> {
  const res = await fetch(`${LINKEDIN_API_URL}/userinfo`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!res.ok) {
    throw new Error(`Failed to get LinkedIn user info: ${res.statusText}`)
  }

  const data = await res.json()
  return `urn:li:person:${data.sub}`
}

export async function saveLinkedInToken(
  accessToken: string,
  personUrn: string,
  expiresIn: number
): Promise<void> {
  const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString()
  const { error } = await supabase
    .from('linkedin_tokens')
    .upsert({ access_token: accessToken, person_urn: personUrn, expires_at: expiresAt }, { onConflict: 'person_urn' })
  if (error) throw error
}

export async function getLinkedInToken(): Promise<{ access_token: string; person_urn: string } | null> {
  const { data, error } = await supabase
    .from('linkedin_tokens')
    .select('access_token, person_urn, expires_at')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error || !data) return null
  if (data.expires_at && new Date(data.expires_at) < new Date()) return null

  return { access_token: data.access_token, person_urn: data.person_urn }
}

export async function initializeImageUpload(
  accessToken: string,
  personUrn: string
): Promise<{ uploadUrl: string; imageUrn: string }> {
  const res = await fetch('https://api.linkedin.com/rest/images?action=initializeUpload', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'LinkedIn-Version': '202601',
      'X-Restli-Protocol-Version': '2.0.0',
    },
    body: JSON.stringify({
      initializeUploadRequest: { owner: personUrn },
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`LinkedIn initializeUpload failed [${res.status}]: ${text}`)
  }

  const data = await res.json()
  const uploadUrl = data.value.uploadUrl
  if (!uploadUrl) throw new Error(`LinkedIn initializeUpload: uploadUrl missing. Response: ${JSON.stringify(data)}`)
  return {
    uploadUrl,
    imageUrn: data.value.image,
  }
}

export async function uploadImageBinary(
  uploadUrl: string,
  buffer: ArrayBuffer,
  mimeType: string
): Promise<void> {
  const res = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': mimeType },
    body: new Blob([buffer], { type: mimeType }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`LinkedIn image binary upload failed: ${text}`)
  }
}

// LinkedIn Posts API의 commentary는 Little Text Format을 사용한다.
// Reserved chars가 unescaped면 LTF 파서가 깨져 그 이후 텍스트가 잘린다.
// `#word` 패턴은 HashtagElement로 정상 파싱되므로 단독 `#`만 이스케이프한다.
// 스펙: https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/little-text-format
export function escapeLittleTextFormat(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/#(?![\w가-힣])/g, '\\#')
    .replace(/[|{}@[\]()<>*_~]/g, '\\$&')
}

export async function publishPost(
  text: string,
  accessToken: string,
  personUrn: string,
  imageUrn?: string
): Promise<string> {
  const body: Record<string, unknown> = {
    author: personUrn,
    commentary: escapeLittleTextFormat(text),
    visibility: 'PUBLIC',
    distribution: {
      feedDistribution: 'MAIN_FEED',
      targetEntities: [],
      thirdPartyDistributionChannels: [],
    },
    lifecycleState: 'PUBLISHED',
    isReshareDisabledByAuthor: false,
  }

  if (imageUrn) {
    body.content = {
      media: {
        altText: '',
        id: imageUrn,
      },
    }
  }

  const res = await fetch('https://api.linkedin.com/rest/posts', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'LinkedIn-Version': '202601',
      'X-Restli-Protocol-Version': '2.0.0',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`LinkedIn publish failed: ${errText}`)
  }

  return res.headers.get('x-restli-id') ?? ''
}
