'use client'
import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { GlobalActionBar } from './GlobalActionBar'
import { Conversational } from './Conversational'
import { Canvas } from './Canvas'
import { LinkedInPreview } from './LinkedInPreview'
import type { StreamItem, AttachedImage, Narration } from './types'
import { createSupabaseBrowserClient } from '@/lib/supabase-client'
import {
  type LinkedInPost,
  createPost,
  updatePost,
  getLinkedInPostUrl,
  formatRelativeDate,
} from '@/lib/posts'

type Props = {
  initialPost: LinkedInPost | null // null이면 새 글
  profileName?: string
  profileSub?: string
}

const INITIAL_WELCOME: StreamItem = {
  kind: 'message',
  role: 'ai',
  text: '안녕하세요! 오늘은 어떤 소재로 써볼까요?',
}

// 사용자 입력(또는 chip 문구)에 따라 교정 진행 내레이션을 결정
// 키워드 매칭 우선 → 못 맞으면 첫 교정은 '내 말투', 이후는 '수정 중'
function getCorrectionNarration(userText: string, historyCount: number): string {
  const mapping: { keyword: string; narration: string }[] = [
    { keyword: '더 짧게', narration: '글을 더 짧게 수정 중...' },
    { keyword: '캐주얼', narration: '톤을 캐주얼하게 조정 중...' },
    { keyword: '해시태그', narration: '해시태그 추가 중...' },
    { keyword: '이모지', narration: '이모지 제거 중...' },
    { keyword: '이미지 제안', narration: '이미지 3안 생성 중...' },
  ]
  for (const { keyword, narration } of mapping) {
    if (userText.includes(keyword)) return narration
  }
  return historyCount === 0 ? '내 말투로 교정 중...' : '수정 중...'
}

export function LinkedInEditor({
  initialPost,
  profileName = 'minsoo park',
  profileSub = 'Chief Everything Officer · 대한민국',
}: Props) {
  const router = useRouter()
  const supabase = createSupabaseBrowserClient()

  // ── 상태 ──────────────────────────────────────────────────────────
  const [items, setItems] = useState<StreamItem[]>(
    initialPost?.conversation?.length
      ? (initialPost.conversation as unknown as StreamItem[])
      : [INITIAL_WELCOME],
  )
  const [draft, setDraft] = useState(initialPost?.final_text ?? '')
  const [correctionHistory, setCorrectionHistory] = useState<string[]>(
    initialPost?.correction_history ?? [],
  )
  const [image, setImage] = useState<AttachedImage | null>(
    initialPost?.image_urn && initialPost.image_url && initialPost.image_meta
      ? {
          url: initialPost.image_url,
          filename: initialPost.image_meta.filename,
          meta: `${initialPost.image_meta.width}×${initialPost.image_meta.height} · ${Math.round(initialPost.image_meta.size / 1024)} KB`,
          source: 'uploaded',
        }
      : null,
  )
  const imageUrnRef = useRef<string | null>(initialPost?.image_urn ?? null)
  const imageStoragePathRef = useRef<string | null>(initialPost?.image_storage_path ?? null)
  const imageSignedUrlRef = useRef<string | null>(initialPost?.image_url ?? null)
  const imageMetaRef = useRef<LinkedInPost['image_meta']>(initialPost?.image_meta ?? null)

  const [postId, setPostId] = useState<string | null>(initialPost?.id ?? null)
  const postIdRef = useRef<string | null>(initialPost?.id ?? null)

  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'dirty'>(
    initialPost ? 'saved' : 'idle',
  )
  const [publishing, setPublishing] = useState(false)
  const [busy, setBusy] = useState(false) // AI 생성/교정 중 입력 잠금

  const lastSavedAtRef = useRef<string | null>(
    initialPost?.updated_at ? formatRelativeDate(initialPost.updated_at) : null,
  )

  // ── 내레이션 헬퍼 ─────────────────────────────────────────────────
  const pushItem = (item: StreamItem) => setItems(prev => [...prev, item])
  const narrate = (
    tone: Narration['tone'],
    text: string,
    extra?: Pick<Narration, 'link' | 'skeletons'>,
  ) => pushItem({ kind: 'narration', tone, text, ...extra })

  const replaceLastProgress = (
    toneReplacement: Narration['tone'],
    newText: string,
    extra?: Pick<Narration, 'link' | 'skeletons'>,
  ) =>
    setItems(prev => {
      const idx = [...prev]
        .reverse()
        .findIndex(it => it.kind === 'narration' && it.tone === 'progress')
      if (idx === -1) {
        return [...prev, { kind: 'narration', tone: toneReplacement, text: newText, ...extra }]
      }
      const realIdx = prev.length - 1 - idx
      const next = [...prev]
      next[realIdx] = { kind: 'narration', tone: toneReplacement, text: newText, ...extra }
      return next
    })

  const markDirty = () => setSaveState('dirty')

  // ── 메시지 전송 (generate / correct) ─────────────────────────────
  const handleSend = async (text: string) => {
    if (busy) return
    pushItem({ kind: 'message', role: 'user', text })
    markDirty()

    const hasDraft = draft.trim().length > 0

    if (!hasDraft) {
      // 초안 생성
      narrate('done', '소재 이해 완료')
      narrate('progress', '아이디어버드가 초안 작성 중...')
      setBusy(true)
      try {
        const res = await fetch('/api/linkedin/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ keywords: text }),
        })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error ?? '생성 실패')
        replaceLastProgress('done', '초안 작성 완료')
        setDraft(json.text ?? '')
        if (Array.isArray(json.fact_check) && json.fact_check.length > 0) {
          narrate('warn', `팩트체크 확인 필요: ${json.fact_check.join(' · ')}`)
        }
        pushItem({
          kind: 'message',
          role: 'ai',
          text: '초안 작성했어요. 오른쪽 캔버스에서 확인하고 다듬어볼까요?',
        })
      } catch (err) {
        replaceLastProgress(
          'warn',
          `AI 생성 실패 (${err instanceof Error ? err.message : '네트워크 오류'})`,
        )
      } finally {
        setBusy(false)
      }
      return
    }

    // 교정 요청
    narrate('progress', getCorrectionNarration(text, correctionHistory.length))
    setBusy(true)
    try {
      const res = await fetch('/api/linkedin/correct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          original_text: draft,
          extra_instruction: text,
          correction_history: correctionHistory.slice(-3),
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? '교정 실패')
      const changes: string[] = Array.isArray(json.changes) ? json.changes : []
      replaceLastProgress(
        'done',
        `교정 완료${changes.length ? ` (${changes.join(' · ')})` : ''}`,
      )
      setDraft(json.corrected_text ?? draft)
      if (changes.length) setCorrectionHistory(prev => [...prev, ...changes])
    } catch (err) {
      replaceLastProgress(
        'warn',
        `AI 교정 실패 (${err instanceof Error ? err.message : '네트워크 오류'})`,
      )
    } finally {
      setBusy(false)
    }
  }

  const handleChipClick = (chip: string) => {
    if (!draft.trim()) {
      pushItem({ kind: 'narration', tone: 'warn', text: '소재를 먼저 입력해서 글을 생성해 주세요.' })
      return
    }
    if (chip.includes('이미지 제안')) {
      pushItem({ kind: 'narration', tone: 'warn', text: '이미지 제안 기능은 곧 출시 예정입니다.' })
      return
    }
    const text = chip.replace(/^\+\s*/, '')
    handleSend(text)
  }

  // ── 이미지 첨부 ──────────────────────────────────────────────────
  const handleAttachImage = async (file: File) => {
    if (busy) return
    const previewUrl = URL.createObjectURL(file)
    const sizeStr = `${(file.size / 1024 / 1024).toFixed(1)}MB`
    pushItem({
      kind: 'message',
      role: 'user',
      text: '',
      image: { url: previewUrl, filename: file.name, size: sizeStr },
    })
    narrate('progress', '이미지 규격 확인 중...')
    setBusy(true)
    try {
      const fd = new FormData()
      fd.append('image', file)
      const res = await fetch('/api/linkedin/upload-image', { method: 'POST', body: fd })
      const json = await res.json()
      if (!res.ok) {
        if (json.code === 'NOT_CONNECTED') {
          replaceLastProgress('warn', 'LinkedIn 연결이 필요해요', {
            link: { label: '⚙ 재연결', href: '/auth/linkedin', variant: 'warning' },
          })
        } else {
          replaceLastProgress('warn', json.error ?? '이미지 업로드 실패')
        }
        return
      }
      imageUrnRef.current = json.image_urn
      imageStoragePathRef.current = json.image_storage_path
      imageSignedUrlRef.current = json.image_url
      imageMetaRef.current = json.image_meta
      const meta = json.image_meta
      const ratio = (meta.width / meta.height).toFixed(2)
      replaceLastProgress(
        'done',
        `이미지 첨부 완료 (${meta.width}×${meta.height}, ${ratio}:1)`,
      )
      setImage({
        url: json.image_url,
        filename: meta.filename,
        meta: `${meta.width}×${meta.height} · ${Math.round(meta.size / 1024)} KB`,
        source: 'uploaded',
      })
      markDirty()
    } catch (err) {
      replaceLastProgress(
        'warn',
        `이미지 업로드 실패 (${err instanceof Error ? err.message : '네트워크 오류'})`,
      )
    } finally {
      setBusy(false)
    }
  }

  const handleRemoveImage = () => {
    setImage(null)
    imageUrnRef.current = null
    imageStoragePathRef.current = null
    imageSignedUrlRef.current = null
    imageMetaRef.current = null
    markDirty()
  }

  // ── 캔버스 편집 ──────────────────────────────────────────────────
  const handleTextChange = (next: string) => {
    setDraft(next)
    if (saveState !== 'saving') markDirty()
  }

  // ── 저장 ─────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (saveState === 'saving') return
    setSaveState('saving')
    narrate('progress', '전체저장 중...')
    try {
      // items는 저장 시점에 stale할 수 있으니 functional 캡처 대신 현재 React state 사용
      const payload = {
        final_text: draft,
        conversation: items,
        correction_history: correctionHistory,
        keywords: items.find(i => i.kind === 'message' && i.role === 'user') &&
        // 첫 user 메시지를 keywords 대용으로 저장 (목록 프리뷰용)
        (items.find(i => i.kind === 'message' && i.role === 'user') as { text?: string } | undefined)?.text
          ? ((items.find(i => i.kind === 'message' && i.role === 'user') as { text?: string }).text ?? null)
          : null,
        image_urn: imageUrnRef.current,
        image_storage_path: imageStoragePathRef.current,
        image_url: imageSignedUrlRef.current,
        image_meta: imageMetaRef.current,
      }

      if (postIdRef.current) {
        await updatePost(supabase, postIdRef.current, payload)
      } else {
        const created = await createPost(supabase, payload)
        postIdRef.current = created.id
        setPostId(created.id)
      }
      lastSavedAtRef.current = '방금'
      setSaveState('saved')
      replaceLastProgress('done', '저장 완료')
    } catch (err) {
      replaceLastProgress(
        'warn',
        `저장 실패 (${err instanceof Error ? err.message : '알 수 없는 오류'})`,
      )
      setSaveState('dirty')
    }
  }

  // ── 발행 ─────────────────────────────────────────────────────────
  const handlePublish = async () => {
    if (publishing || saveState !== 'saved' || !postIdRef.current) return
    if (!draft.trim()) {
      narrate('warn', '발행할 본문이 없습니다')
      return
    }
    setPublishing(true)
    narrate('progress', 'LinkedIn 발행 중...')
    try {
      const res = await fetch('/api/linkedin/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ post_id: postIdRef.current }),
      })
      const json = await res.json()
      if (!res.ok) {
        if (json.code === 'NOT_CONNECTED') {
          replaceLastProgress('warn', 'LinkedIn 토큰이 만료됐거나 연결되지 않았어요', {
            link: { label: '⚙ 재연결', href: '/auth/linkedin', variant: 'warning' },
          })
          return
        }
        if (res.status >= 500) {
          replaceLastProgress('warn', 'LinkedIn 5xx 일시 오류 — 초안은 저장됐어요', {
            link: { label: '🔁 재발행', href: '#retry', variant: 'linkedin' },
          })
          return
        }
        throw new Error(json.error ?? '발행 실패')
      }
      const url = getLinkedInPostUrl(json.linkedin_post_id)
      replaceLastProgress('success', '발행 완료!', {
        link: url
          ? { label: '🔗 LinkedIn에서 보기', href: url, variant: 'linkedin' }
          : undefined,
      })
      // 발행 후 홈으로 돌아가거나 현 페이지 유지? — 그 자리에 머물러 다시 발행·편집 가능하게
    } catch (err) {
      replaceLastProgress(
        'warn',
        `발행 실패 (${err instanceof Error ? err.message : '네트워크 오류'})`,
      )
    } finally {
      setPublishing(false)
    }
  }

  const title = postId ? `포스팅 편집 · #${postId.slice(0, 6)}` : '포스팅 편집'

  return (
    <>
      <GlobalActionBar
        title={title}
        backHref="/"
        saveState={saveState}
        lastSavedAt={saveState === 'saved' ? lastSavedAtRef.current : null}
        onSave={handleSave}
        onPublish={handlePublish}
        canPublish={saveState === 'saved' && !!postIdRef.current && !busy}
        publishing={publishing}
      />
      <div className="editor-main">
        <Conversational
          items={items}
          onSend={handleSend}
          onChipClick={handleChipClick}
          onAttachImage={handleAttachImage}
          disabled={busy}
        />
        <Canvas image={image} onRemoveImage={handleRemoveImage}>
          <LinkedInPreview
            profileName={profileName}
            profileSub={profileSub}
            text={draft}
            onTextChange={handleTextChange}
            imageUrl={image?.url ?? null}
            unsaved={saveState === 'dirty'}
          />
        </Canvas>
      </div>
    </>
  )
}
