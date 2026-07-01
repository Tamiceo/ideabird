import { NextResponse } from 'next/server'
import { getLinkedInAuthUrl } from '@/lib/linkedin'

export async function GET() {
  const state = Math.random().toString(36).substring(2, 10)
  const url = getLinkedInAuthUrl(state)

  const response = NextResponse.redirect(url)
  response.cookies.set('linkedin_oauth_state', state, {
    httpOnly: true,
    maxAge: 600,
    sameSite: 'lax',
    path: '/',
  })

  return response
}
