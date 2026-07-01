import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="error-wrap">
      <div className="error-card">
        <div className="error-bird tilt-left">🐦</div>
        <div className="error-code">404</div>
        <p className="error-msg">
          이 페이지는 못 찾았어요
          <br />다른 곳으로 날아갔나 봐요
        </p>
        <Link href="/" className="error-btn">🏠 홈으로 돌아가기</Link>
      </div>
    </div>
  )
}
