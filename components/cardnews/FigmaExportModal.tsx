'use client'

import { useState } from 'react'

interface Props {
  urls: string[]
  onClose: () => void
}

const BULK_IMPORTER_URL =
  'https://www.figma.com/community/plugin/1266419660538162271/bulk-image-importer'

export default function FigmaExportModal({ urls, onClose }: Props) {
  const [copied, setCopied] = useState(false)
  const joined = urls.join('\n')

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(joined)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // ignore
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl max-w-[560px] w-full shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 pt-6 pb-4 border-b border-[var(--border)]">
          <h2 className="text-lg font-bold mb-1">🅵 Figma 로 내보내기</h2>
          <p className="text-xs text-[var(--muted)] leading-relaxed">
            PNG 7장을 공개 URL 로 업로드했어요. Figma 에서{' '}
            <a
              href={BULK_IMPORTER_URL}
              target="_blank"
              rel="noreferrer"
              className="underline font-medium text-[var(--fg)]"
            >
              Bulk Image Importer
            </a>{' '}
            플러그인을 실행하고, 아래 URL 들을 붙여넣으면 일괄 import 됩니다.
          </p>
        </div>

        <div className="px-6 py-4">
          <div className="text-[11px] text-[var(--subtle)] mb-2 font-semibold uppercase tracking-wider">
            복사할 URL 목록 · 총 {urls.length}장
          </div>
          <textarea
            value={joined}
            readOnly
            rows={urls.length}
            className="w-full text-[11px] font-mono border border-[var(--border)] rounded-lg p-3 resize-none bg-[var(--bg)]"
          />
          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={copy}
              className="flex-1 px-4 py-2.5 rounded-full bg-[var(--fg)] text-white text-sm font-semibold hover:bg-black"
            >
              {copied ? '✓ 복사됨' : '📋 전체 복사'}
            </button>
            <a
              href={BULK_IMPORTER_URL}
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2.5 rounded-full border border-[var(--border)] bg-white text-sm hover:border-[var(--fg)]"
            >
              🔗 플러그인 열기
            </a>
          </div>
        </div>

        <div className="px-6 py-4 bg-[var(--bg)] border-t border-[var(--border)] text-[11px] text-[var(--subtle)]">
          <div className="font-semibold text-[var(--muted)] mb-1">순서 안내</div>
          <ol className="space-y-0.5 list-decimal list-inside">
            <li>Figma 파일 열기 → 플러그인 메뉴 → Bulk Image Importer 실행</li>
            <li>위 URL 전체 복사 → 플러그인 입력창에 붙여넣기</li>
            <li>Import 클릭 → 7장이 캔버스에 배치됨</li>
          </ol>
        </div>

        <div className="px-6 py-3 flex justify-end border-t border-[var(--border)]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-full border border-[var(--border)] text-xs text-[var(--muted)] hover:border-[var(--fg)] hover:text-[var(--fg)]"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  )
}
