'use client'
import { useEffect, useState } from 'react'

type ConnectionStatus = 'connected' | 'expired' | 'disconnected' | 'loading'

type Props = {
  open: boolean
  onClose: () => void
  email: string | null
  onLogout: () => void
}

export function SettingsModal({ open, onClose, email, onLogout }: Props) {
  const [linkedin, setLinkedin] = useState<ConnectionStatus>('loading')
  const [daysRemaining, setDaysRemaining] = useState<number | null>(null)

  useEffect(() => {
    if (!open) return
    fetch('/api/connections/status')
      .then(r => r.json())
      .then(d => {
        setLinkedin(d.linkedin ?? 'disconnected')
        setDaysRemaining(d.linkedin_days_remaining ?? null)
      })
      .catch(() => setLinkedin('disconnected'))
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const userName = email?.split('@')[0] ?? '사용자'

  const linkedinChip = () => {
    if (linkedin === 'loading') return <span className="value">확인 중…</span>
    if (linkedin === 'connected') {
      const daysText = daysRemaining ? ` · ${daysRemaining}일 남음` : ''
      return <span className="connection-chip">● 연결됨{daysText}</span>
    }
    if (linkedin === 'expired') return <span className="connection-chip expired">● 만료됨</span>
    return <span className="connection-chip disconnected">● 미연결</span>
  }

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-modal" onClick={e => e.stopPropagation()}>
        <div className="settings-header">
          <h2>⚙ 설정</h2>
          <button className="close" onClick={onClose} aria-label="닫기">×</button>
        </div>

        <div className="settings-body">
          <div className="settings-section">
            <h3>계정</h3>
            <div className="settings-row">
              <div className="label">
                <div style={{ fontWeight: 600 }}>{userName}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>{email ?? '—'}</div>
              </div>
              <button className="btn-danger" onClick={onLogout}>로그아웃</button>
            </div>
          </div>

          <div className="settings-section">
            <h3>연결된 플랫폼</h3>
            <div className="settings-row">
              <div className="label">💼 LinkedIn</div>
              {linkedinChip()}
              {linkedin !== 'loading' && (
                <a href="/auth/linkedin" className="btn-outline">
                  {linkedin === 'connected' ? '재연결' : '연결하기'}
                </a>
              )}
            </div>
            <div className="settings-row" style={{ opacity: 0.5 }}>
              <div className="label">📸 Instagram</div>
              <span className="value">Phase B 예정</span>
            </div>
            <div className="settings-row" style={{ opacity: 0.5 }}>
              <div className="label">🎬 YouTube</div>
              <span className="value">Phase C 예정</span>
            </div>
          </div>

          <div className="settings-section">
            <h3>스타일 지침</h3>
            <div className="style-guide-preview">
              lib/prompts.ts
              <br />
              <span style={{ color: 'var(--muted)' }}>내 말투·포맷·금칙어·선호 구조</span>
            </div>
            <div className="style-guide-note">
              Obsidian/NotebookLM에서 정제한 내용을 이 파일에 붙여넣으세요 (Phase A는 읽기 전용)
            </div>
          </div>

          <div className="settings-section" style={{ background: 'var(--bg)' }}>
            <div style={{ fontSize: 11, color: 'var(--muted)', textAlign: 'center' }}>
              IdeaBird v2 · 2026-04-19
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
