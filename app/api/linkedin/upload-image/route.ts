import { NextRequest, NextResponse } from 'next/server'
import { getLinkedInToken, initializeImageUpload, uploadImageBinary } from '@/lib/linkedin'
import { uploadImage, deleteImage, getSignedUrl } from '@/lib/storage'
import sharp from 'sharp'

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
const MAX_SIZE_BYTES = 5 * 1024 * 1024 // 5MB
const MIN_WIDTH = 552
const MIN_HEIGHT = 276
const MAX_PIXELS = 36_000_000 // ~36MP
const MIN_RATIO = 1 / 2.4
const MAX_RATIO = 2.4

export async function POST(req: NextRequest) {
  const token = await getLinkedInToken()
  if (!token) {
    return NextResponse.json({ error: 'LinkedIn 연결이 필요합니다', code: 'NOT_CONNECTED' }, { status: 401 })
  }

  let file: File
  try {
    const formData = await req.formData()
    const raw = formData.get('image')
    if (!raw || typeof raw === 'string') {
      return NextResponse.json({ error: '이미지 파일이 없습니다' }, { status: 400 })
    }
    file = raw as File
  } catch {
    return NextResponse.json({ error: '요청 형식이 올바르지 않습니다' }, { status: 400 })
  }

  // ── 포맷 검증 ──
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'JPG, PNG, GIF, WEBP 형식만 지원합니다' }, { status: 400 })
  }

  // ── 크기 검증 ──
  if (file.size > MAX_SIZE_BYTES) {
    const sizeMB = (file.size / 1024 / 1024).toFixed(1)
    return NextResponse.json({ error: `이미지가 너무 큽니다 (현재 ${sizeMB}MB, 최대 5MB)` }, { status: 400 })
  }

  // ── 이미지 메타데이터 추출 + 해상도/비율 검증 ──
  const buffer = Buffer.from(await file.arrayBuffer())
  let width: number, height: number

  try {
    sharp.cache(false)
    const metadata = await sharp(buffer).metadata()
    width = metadata.width ?? 0
    height = metadata.height ?? 0
  } catch {
    return NextResponse.json({ error: '이미지 메타데이터를 읽을 수 없습니다. 파일이 손상되었을 수 있습니다' }, { status: 400 })
  }

  if (width < MIN_WIDTH || height < MIN_HEIGHT) {
    return NextResponse.json({
      error: `이미지가 너무 작습니다 (현재 ${width}×${height}px, 최소 ${MIN_WIDTH}×${MIN_HEIGHT}px)`,
    }, { status: 400 })
  }

  if (width * height > MAX_PIXELS) {
    return NextResponse.json({
      error: `이미지 해상도가 너무 높습니다 (현재 ${width}×${height}px, 최대 약 6000×6000px)`,
    }, { status: 400 })
  }

  const ratio = width / height
  if (ratio < MIN_RATIO || ratio > MAX_RATIO) {
    return NextResponse.json({
      error: `이미지 비율이 LinkedIn 규격을 벗어납니다 (현재 ${ratio.toFixed(2)}:1, 허용 1:2.4 ~ 2.4:1)`,
    }, { status: 400 })
  }

  // ── Supabase Storage 아카이브 ──
  const ext = file.name.split('.').pop() ?? 'jpg'
  const storagePath = `${crypto.randomUUID()}/${Date.now()}.${ext}`
  let signedUrl: string

  try {
    await uploadImage(storagePath, buffer, file.type)
    signedUrl = await getSignedUrl(storagePath)
  } catch (err) {
    console.error('Supabase Storage upload error:', err)
    return NextResponse.json({ error: '이미지 저장에 실패했습니다' }, { status: 500 })
  }

  // ── LinkedIn 업로드 ──
  let imageUrn: string
  try {
    const { uploadUrl, imageUrn: urn } = await initializeImageUpload(token.access_token, token.person_urn)
    await uploadImageBinary(uploadUrl, buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength), file.type)
    imageUrn = urn
  } catch (err) {
    // LinkedIn 실패 → Supabase 롤백
    console.error('LinkedIn upload error (rolling back storage):', err)
    await deleteImage(storagePath).catch(() => {})
    return NextResponse.json({
      error: `LinkedIn 이미지 업로드에 실패했습니다: ${err instanceof Error ? err.message : String(err)}`,
    }, { status: 500 })
  }

  return NextResponse.json({
    image_urn: imageUrn,
    image_storage_path: storagePath,
    image_url: signedUrl,
    image_meta: {
      filename: file.name,
      size: file.size,
      width,
      height,
      mimeType: file.type,
    },
  })
}
