import { NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '@/lib/supabase-admin'

export async function GET() {
  const { data, error } = await supabase
    .from('linkedin_tokens')
    .select('expires_at')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error || !data) {
    return NextResponse.json({ linkedin: 'disconnected' })
  }

  const isExpired = data.expires_at && new Date(data.expires_at) < new Date()
  return NextResponse.json({ linkedin: isExpired ? 'expired' : 'connected' })
}
