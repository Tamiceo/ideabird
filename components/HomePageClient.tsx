'use client'
import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { LinkedInPost } from '@/lib/posts'
import { getLinkedInPostUrl, formatRelativeDate, getPostPreview } from '@/lib/posts'
import { createSupabaseBrowserClient } from '@/lib/supabase-client'
import { deletePost, duplicatePost } from '@/lib/posts'

export type InstagramRow = {
  id: string
  source_text: string
  topic: string | null
  stage: 'sourcing' | 'planning' | 'rendered' | 'published'
  status: 'draft' | 'published'
  updated_at: string
}

type Props = {
  posts: LinkedInPost[]
  instagramRows?: InstagramRow[]
  userName?: string
}

const PAGE_SIZE = 10

const INSTAGRAM_CTA: Record<InstagramRow['stage'], string> = {
  sourcing: '기획 이어가기',
  planning: '구조·스타일 고르기',
  rendered: '편집 계속',
  published: '다시 보기',
}

const INSTAGRAM_PATH: Record<InstagramRow['stage'], (id: string) => string> = {
  sourcing: (id) => `/instagram/${id}?stage=1`,
  planning: (id) => `/instagram/${id}?stage=2`,
  rendered: (id) => `/instagram/${id}`,
  published: (id) => `/instagram/${id}`,
}

export function HomePageClient({ posts, instagramRows = [], userName = '사용자' }: Props) {
  const router = useRouter()
  const [filter, setFilter] = useState<'all' | 'draft' | 'published'>('all')
  const [openKebabId, setOpenKebabId] = useState<string | null>(null)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [isPending, startTransition] = useTransition()

  const filtered = posts.filter(p => filter === 'all' || p.status === filter)
  const visible = filtered.slice(0, visibleCount)

  const openPost = (id: string) => {
    router.push(`/linkedin/${id}`)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('이 포스트를 삭제할까요? 되돌릴 수 없습니다.')) return
    const supabase = createSupabaseBrowserClient()
    try {
      await deletePost(supabase, id)
      setOpenKebabId(null)
      startTransition(() => router.refresh())
    } catch (err) {
      alert(`삭제 실패: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  const handleDuplicate = async (id: string) => {
    const supabase = createSupabaseBrowserClient()
    try {
      const created = await duplicatePost(supabase, id)
      setOpenKebabId(null)
      router.push(`/linkedin/${created.id}`)
    } catch (err) {
      alert(`복제 실패: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  return (
    <main className="home-main">
      <div className="home-greet">
        <h1>안녕하세요 {userName}!</h1>
        <p>무엇을 쓸까요?</p>
      </div>

      <div className="new-grid">
        <Link href="/linkedin/post" className="new-card" style={{ textDecoration: 'none' }}>
          <div className="platform">
            <span className="platform-badge linkedin">in</span>
            <span>LinkedIn 포스트</span>
          </div>
          <h3>+ 새 포스트</h3>
          <p>텍스트 · 최대 3,000자 · 이미지 1장</p>
        </Link>

        <Link href="/instagram/post" className="new-card" style={{ textDecoration: 'none' }}>
          <div className="platform">
            <span className="platform-badge instagram">📸</span>
            <span>Instagram 카드뉴스</span>
          </div>
          <h3>+ 새 카드뉴스</h3>
          <p>3~10장 슬라이드 · 1080×1350</p>
        </Link>

        <div className="new-card disabled" aria-disabled="true">
          <span className="coming-soon">Coming Soon</span>
          <div className="platform">
            <span className="platform-badge youtube">▶</span>
            <span>YouTube 기획</span>
          </div>
          <h3>+ 새 기획서</h3>
          <p>스크립트 · 제목 · 타임라인 · Phase C</p>
        </div>
      </div>

      <div className="recent-header">
        <h2>최근 작업</h2>
        <div className="filter-group">
          {(['all', 'draft', 'published'] as const).map(k => (
            <button
              key={k}
              className={`filter-chip${filter === k ? ' active' : ''}`}
              onClick={() => {
                setFilter(k)
                setVisibleCount(PAGE_SIZE)
              }}
              type="button"
            >
              {k === 'all' ? '전체' : k === 'draft' ? '초안' : '발행됨'}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="icon">🐦</div>
          <h3>아직 작성한 글이 없어요</h3>
          <p>위의 플랫폼 카드를 눌러 첫 글을 시작해보세요</p>
        </div>
      ) : (
        <>
          <div className="feed">
            {visible.map(post => {
              const linkedinUrl = getLinkedInPostUrl(post.linkedin_post_id)
              const hasImage = !!post.image_urn
              return (
                <div
                  key={post.id}
                  className="feed-card"
                  onClick={() => openPost(post.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => {
                    if (e.key === 'Enter') openPost(post.id)
                  }}
                >
                  <span className="badge in">IN</span>
                  <div className="body">
                    <div className="content">{getPostPreview(post)}</div>
                    <div className="meta">
                      <span className={`status-chip-sm ${post.status}`}>
                        {post.status === 'draft' ? '초안' : '발행됨'}
                      </span>
                      <span>{formatRelativeDate(post.updated_at)}</span>
                      {hasImage ? <span>🖼 이미지 첨부</span> : null}
                      {linkedinUrl ? (
                        <a
                          href={linkedinUrl}
                          onClick={e => e.stopPropagation()}
                          target="_blank"
                          rel="noreferrer"
                        >
                          🔗 LinkedIn에서 보기
                        </a>
                      ) : null}
                    </div>
                  </div>
                  {hasImage ? (
                    <div
                      className="thumb"
                      style={
                        post.image_url
                          ? {
                              backgroundImage: `url(${post.image_url})`,
                              backgroundSize: 'cover',
                              backgroundPosition: 'center',
                            }
                          : undefined
                      }
                    />
                  ) : null}
                  <div className="kebab-wrap" onClick={e => e.stopPropagation()}>
                    <button
                      className="kebab-btn"
                      onClick={() =>
                        setOpenKebabId(openKebabId === post.id ? null : post.id)
                      }
                      aria-label="메뉴"
                    >
                      ⋯
                    </button>
                    {openKebabId === post.id && (
                      <div className="kebab-menu">
                        <button type="button" onClick={() => handleDuplicate(post.id)}>
                          📋 복제
                        </button>
                        {linkedinUrl ? (
                          <button
                            type="button"
                            onClick={() => {
                              window.open(linkedinUrl, '_blank')
                              setOpenKebabId(null)
                            }}
                          >
                            🔗 LinkedIn에서 열기
                          </button>
                        ) : null}
                        <button
                          type="button"
                          className="danger"
                          onClick={() => handleDelete(post.id)}
                          disabled={isPending}
                        >
                          🗑 삭제
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {filtered.length > visible.length && (
            <div className="load-more">
              <button
                type="button"
                onClick={() => setVisibleCount(c => c + PAGE_SIZE)}
              >
                더 보기 ↓ ({visible.length}건 표시됨 / 전체 {filtered.length}건)
              </button>
            </div>
          )}
        </>
      )}

      {instagramRows.length > 0 && (
        <section style={{ marginTop: 40 }}>
          <div className="recent-header">
            <h2>Instagram 카드뉴스</h2>
            <span style={{ fontSize: 12, color: 'var(--subtle)' }}>
              {instagramRows.length}건
            </span>
          </div>
          <div className="feed">
            {instagramRows.map(row => {
              const preview = row.topic ?? row.source_text.slice(0, 60) ?? '(제목 없음)'
              const href = INSTAGRAM_PATH[row.stage](row.id)
              return (
                <Link
                  key={row.id}
                  href={href}
                  className="feed-card"
                  style={{ textDecoration: 'none', color: 'inherit' }}
                >
                  <span className="badge" style={{ background: '#E1306C', color: '#fff' }}>
                    IG
                  </span>
                  <div className="body">
                    <div className="content">{preview}</div>
                    <div className="meta">
                      <span
                        className={`status-chip-sm ${row.status}`}
                        style={{ textTransform: 'uppercase', fontSize: 10 }}
                      >
                        {row.stage}
                      </span>
                      <span>{formatRelativeDate(row.updated_at)}</span>
                      <span style={{ fontWeight: 600 }}>{INSTAGRAM_CTA[row.stage]} →</span>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </section>
      )}
    </main>
  )
}
