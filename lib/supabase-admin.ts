import { createClient } from '@supabase/supabase-js'

// 서버 전용 Supabase 클라이언트 (service_role 키).
// service_role 은 RLS 를 우회하므로 — 절대 클라이언트 컴포넌트에서 import 하지 말 것.
// 단일 테넌트(1인용) + 모든 테이블 접근이 서버사이드라, 데이터 접근은 이 클라이언트로 통일한다.
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } }
)
