import type { SupabaseClient } from '@supabase/supabase-js'

// ── DB row ──────────────────────────────────────────────────────────

export type PostStatus = 'draft' | 'published'

export type ImageMeta = {
  filename: string
  size: number
  width: number
  height: number
  mimeType: string
}

// 대화 스트림 아이템 (Conversational + Canvas 패턴)
// editor/types.ts의 StreamItem과 동일 구조 — DB 저장용으로 중복 정의 방지 위해 공용 타입 사용
export type ConversationItem = {
  kind: 'message' | 'narration' | 'image-choices'
  [k: string]: unknown
}

export type LinkedInPost = {
  id: string
  keywords: string | null
  final_text: string | null
  conversation: ConversationItem[]
  conversation_summary: string | null
  correction_history: string[]
  image_urn: string | null
  image_storage_path: string | null
  image_url: string | null
  image_meta: ImageMeta | null
  status: PostStatus
  linkedin_post_id: string | null
  created_at: string
  updated_at: string
  published_at: string | null
}

// Create/Update에 쓸 수 있는 필드만
export type LinkedInPostFields = Partial<
  Omit<LinkedInPost, 'id' | 'created_at' | 'updated_at'>
>

// ── Queries ─────────────────────────────────────────────────────────

const TABLE = 'linkedin_posts'

const SELECT_COLS =
  'id, keywords, final_text, conversation, conversation_summary, correction_history, image_urn, image_storage_path, image_url, image_meta, status, linkedin_post_id, created_at, updated_at, published_at'

export async function listPosts(supabase: SupabaseClient): Promise<LinkedInPost[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select(SELECT_COLS)
    .order('updated_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as unknown as LinkedInPost[]
}

export async function getPost(
  supabase: SupabaseClient,
  id: string,
): Promise<LinkedInPost | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select(SELECT_COLS)
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  return (data as unknown as LinkedInPost) ?? null
}

export async function createPost(
  supabase: SupabaseClient,
  fields: LinkedInPostFields,
): Promise<LinkedInPost> {
  const { data, error } = await supabase
    .from(TABLE)
    .insert({ status: 'draft', ...fields })
    .select(SELECT_COLS)
    .single()
  if (error) throw error
  return data as unknown as LinkedInPost
}

export async function updatePost(
  supabase: SupabaseClient,
  id: string,
  fields: LinkedInPostFields,
): Promise<LinkedInPost> {
  const { data, error } = await supabase
    .from(TABLE)
    .update(fields)
    .eq('id', id)
    .select(SELECT_COLS)
    .single()
  if (error) throw error
  return data as unknown as LinkedInPost
}

export async function deletePost(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase.from(TABLE).delete().eq('id', id)
  if (error) throw error
}

export async function duplicatePost(
  supabase: SupabaseClient,
  id: string,
): Promise<LinkedInPost> {
  const src = await getPost(supabase, id)
  if (!src) throw new Error('원본을 찾을 수 없습니다')
  return createPost(supabase, {
    keywords: src.keywords,
    final_text: src.final_text,
    conversation: [],
    conversation_summary: null,
    correction_history: [],
    image_urn: null,
    image_storage_path: null,
    image_url: null,
    image_meta: null,
    status: 'draft',
    linkedin_post_id: null,
    published_at: null,
  })
}

// ── Formatting helpers ──────────────────────────────────────────────

export function getLinkedInPostUrl(linkedinPostId: string | null): string | null {
  if (!linkedinPostId) return null
  const urn = linkedinPostId.startsWith('urn:li:')
    ? linkedinPostId
    : `urn:li:share:${linkedinPostId}`
  return `https://www.linkedin.com/feed/update/${urn}/`
}

export function formatRelativeDate(timestamp: string): string {
  const now = Date.now()
  const t = new Date(timestamp).getTime()
  if (Number.isNaN(t)) return '—'
  const diff = now - t
  const sec = Math.floor(diff / 1000)
  if (sec < 60) return '방금'
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}분 전`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}시간 전`
  const day = Math.floor(hr / 24)
  if (day < 7) return `${day}일 전`
  if (day < 30) return `${Math.floor(day / 7)}주 전`
  if (day < 365) return `${Math.floor(day / 30)}개월 전`
  return `${Math.floor(day / 365)}년 전`
}

// 피드 카드 표시용 preview 텍스트 (final_text 우선, 없으면 keywords)
export function getPostPreview(post: LinkedInPost): string {
  return (post.final_text ?? post.keywords ?? '').trim() || '(제목 없음)'
}
