import { supabaseAdmin as supabase } from '@/lib/supabase-admin'

const BUCKET = 'linkedin-images'

export async function uploadImage(
  path: string,
  buffer: Buffer,
  mimeType: string
): Promise<string> {
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, buffer, {
      contentType: mimeType,
      upsert: true,
    })

  if (error) throw new Error(`Supabase Storage 업로드 실패: ${error.message}`)
  return path
}

export async function deleteImage(path: string): Promise<void> {
  await supabase.storage.from(BUCKET).remove([path])
}

export async function getSignedUrl(path: string, expiresIn = 3600): Promise<string> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, expiresIn)

  if (error || !data?.signedUrl) {
    throw new Error(`Signed URL 생성 실패: ${error?.message ?? 'unknown'}`)
  }
  return data.signedUrl
}
