import { NextRequest, NextResponse } from 'next/server'
import { exchangeCodeForToken, getPersonUrn, saveLinkedInToken } from '@/lib/linkedin'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  if (error) {
    return NextResponse.redirect(new URL('/linkedin?error=oauth_denied', req.url))
  }

  const storedState = req.cookies.get('linkedin_oauth_state')?.value
  if (!code || !state || state !== storedState) {
    return NextResponse.redirect(new URL('/linkedin?error=invalid_state', req.url))
  }

  try {
    const { access_token, expires_in } = await exchangeCodeForToken(code)
    const personUrn = await getPersonUrn(access_token)
    await saveLinkedInToken(access_token, personUrn, expires_in)

    const response = NextResponse.redirect(new URL('/linkedin?connected=true', req.url))
    response.cookies.delete('linkedin_oauth_state')
    return response
  } catch (err) {
    console.error('LinkedIn OAuth callback error:', err)
    return NextResponse.redirect(new URL('/linkedin?error=token_exchange', req.url))
  }
}
