'use client'

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="error-wrap">
      <div className="error-card">
        <div className="error-bird tilt-right">🐦</div>
        <div className="error-code">500</div>
        <p className="error-msg">
          아이디어버드가 잠깐 숨이 차요
          <br />잠시 후 다시 시도해주세요
        </p>
        <button type="button" className="error-btn" onClick={reset}>🔄 새로고침</button>
      </div>
    </div>
  )
}
