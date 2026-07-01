'use client'

import { toPng } from 'html-to-image'
import JSZip from 'jszip'
import { saveAs } from 'file-saver'

// Source DOM 540×675, html2canvas scale 2 → 출력 PNG 1080×1350 (IG 공식 카드뉴스 규격)
const SOURCE_W = 540
const SOURCE_H = 675
const OUTPUT_SCALE = 2

async function ensureFontsLoadedFor(text: string): Promise<void> {
  if (!document.fonts) return
  const coverageSample =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789%@·—가나다라마바사아자차카타파하'
  const targetText = text + coverageSample
  const weights = ['400', '500', '600', '700', '800']
  const sizes = ['14px', '60px', '108px']
  const families = [`'Pretendard Variable'`, `Pretendard`]
  const tasks: Promise<FontFace[]>[] = []
  for (const w of weights) {
    for (const s of sizes) {
      for (const f of families) {
        try {
          tasks.push(document.fonts.load(`${w} ${s} ${f}`, targetText))
        } catch {
          // ignore
        }
      }
    }
  }
  await Promise.allSettled(tasks)
  await document.fonts.ready

  // 보험: 보이지 않는 프로브 DOM 에 Latin+Korean 을 weight 별로 렌더해 강제 페인트
  const probe = document.createElement('div')
  probe.setAttribute('aria-hidden', 'true')
  probe.style.cssText =
    'position:fixed;left:-9999px;top:0;visibility:hidden;pointer-events:none;'
  probe.innerHTML = weights
    .map(
      (w) => `<span style="font-family:'Pretendard Variable',Pretendard;font-weight:${w};font-size:24px">${coverageSample}</span>`
    )
    .join('')
  document.body.appendChild(probe)
  // 2 프레임 대기 후 제거
  await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())))
  probe.remove()
}

export async function captureCardToBlob(
  container: HTMLElement,
  order: number
): Promise<Blob> {
  const node = container.querySelector<HTMLElement>(`[data-card-order="${order}"]`)
  if (!node) {
    throw new Error(`카드 #${order} DOM 을 찾을 수 없어요`)
  }

  // 이 카드의 실제 텍스트 기반으로 font subset 로딩
  const cardText = node.innerText ?? ''
  await ensureFontsLoadedFor(cardText || 'abc가나다')

  // html-to-image 는 font-face 를 data URL 로 embed 해서 Variable font Latin weight 문제 해결
  const dataUrl = await toPng(node, {
    width: SOURCE_W,
    height: SOURCE_H,
    pixelRatio: OUTPUT_SCALE,
    cacheBust: false,
    fontEmbedCSS: undefined, // 자동 embed 허용
  })

  // data URL → Blob 변환
  const res = await fetch(dataUrl)
  return await res.blob()
}

export async function captureAllCards(
  container: HTMLElement,
  orders: number[],
  onProgress?: (done: number, total: number) => void
): Promise<Blob[]> {
  const blobs: Blob[] = []
  for (let i = 0; i < orders.length; i++) {
    const blob = await captureCardToBlob(container, orders[i])
    blobs.push(blob)
    onProgress?.(i + 1, orders.length)
  }
  return blobs
}

export async function downloadZip(
  blobs: Blob[],
  baseName: string
): Promise<void> {
  const zip = new JSZip()
  blobs.forEach((blob, i) => {
    zip.file(`${String(i + 1).padStart(2, '0')}.png`, blob)
  })
  const zipped = await zip.generateAsync({ type: 'blob' })
  saveAs(zipped, `${baseName}.zip`)
}

export async function uploadBlobsToServer(
  id: string,
  blobs: Blob[],
  onProgress?: (done: number, total: number) => void
): Promise<string[]> {
  const urls: string[] = []
  for (let i = 0; i < blobs.length; i++) {
    const form = new FormData()
    form.append('file', blobs[i], `${String(i + 1).padStart(2, '0')}.png`)
    form.append('order', String(i))
    const res = await fetch(`/api/instagram/${id}/upload-png`, {
      method: 'POST',
      body: form,
    })
    if (!res.ok) {
      const j = (await res.json().catch(() => null)) as { error?: string } | null
      throw new Error(j?.error ?? '업로드 실패')
    }
    const data = (await res.json()) as { url: string }
    urls.push(data.url)
    onProgress?.(i + 1, blobs.length)
  }
  return urls
}

export function sanitizeFilename(name: string): string {
  return (
    name
      .replace(/[/\\?%*:|"<>]/g, '')
      .replace(/\s+/g, '_')
      .slice(0, 60) || 'cardnews'
  )
}
