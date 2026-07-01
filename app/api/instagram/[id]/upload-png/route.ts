import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

type Ctx = { params: Promise<{ id: string }> }

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest, { params }: Ctx) {
  const { id } = await params

  const form = await req.formData()
  const file = form.get('file')
  const orderRaw = form.get('order')
  if (!(file instanceof Blob) || typeof orderRaw !== 'string') {
    return NextResponse.json(
      { error: 'file, order 필드 필요', code: 'BAD_REQUEST' },
      { status: 400 }
    )
  }
  const order = Number(orderRaw)
  if (!Number.isFinite(order) || order < 0 || order > 99) {
    return NextResponse.json(
      { error: 'order 범위 오류', code: 'BAD_REQUEST' },
      { status: 400 }
    )
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    return NextResponse.json(
      { error: 'SUPABASE 환경변수 없음', code: 'ENV_MISSING' },
      { status: 500 }
    )
  }

  const admin = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const path = `${id}/${String(order).padStart(2, '0')}.png`
  const buf = Buffer.from(await file.arrayBuffer())
  const { error } = await admin.storage
    .from('cardnews-exports')
    .upload(path, buf, {
      contentType: 'image/png',
      upsert: true,
    })
  if (error) {
    return NextResponse.json(
      { error: error.message, code: 'UPLOAD_FAILED' },
      { status: 500 }
    )
  }

  const { data } = admin.storage.from('cardnews-exports').getPublicUrl(path)
  return NextResponse.json({ url: data.publicUrl, path })
}
