'use client'

type Active = 1 | 2 | 3 | 4

const STEPS: Array<{ n: Active; label: string }> = [
  { n: 1, label: '소재 입력' },
  { n: 2, label: 'AI 기획' },
  { n: 3, label: '구조·스타일' },
  { n: 4, label: '편집·발행' },
]

interface Props {
  active: Active
}

export default function WizardStepper({ active }: Props) {
  return (
    <div className="flex-shrink-0 bg-[var(--bg)] border-b border-[var(--border)]">
      <div className="max-w-[1600px] mx-auto px-6 py-2 flex items-center gap-3 text-xs">
        <span className="text-[11px] text-[var(--subtle)] uppercase tracking-wider font-semibold">
          Instagram 카드뉴스
        </span>
        <span
          className="inline-block w-px h-[14px] bg-[var(--border)]"
          aria-hidden="true"
        />
        {STEPS.map((step, i) => {
          const isDone = step.n < active
          const isActive = step.n === active
          return (
            <div key={step.n} className="contents">
              <div
                className={`flex items-center gap-1.5 ${isDone || isActive ? '' : 'opacity-40'}`}
              >
                <span
                  className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[11px] font-semibold ${
                    isDone || isActive
                      ? 'bg-[var(--fg)] text-white'
                      : 'bg-[var(--border)] text-[var(--subtle)]'
                  }`}
                >
                  {isDone ? '✓' : step.n}
                </span>
                <span className={isActive ? 'font-semibold text-[var(--fg)]' : 'text-[var(--muted)]'}>{step.label}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={`flex-1 h-px max-w-[60px] ${step.n < active ? 'bg-[var(--fg)]' : 'bg-[var(--border)]'}`}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
