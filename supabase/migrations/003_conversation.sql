-- IdeaBird v2: Conversational + Canvas 대화 기록 저장
-- conversation: 대화 전체 기록 (user/assistant 메시지 + narration 메타)
-- conversation_summary: 리스트 페이지 경량 쿼리용 (첫 사용자 메시지 앞 100자)
ALTER TABLE linkedin_posts ADD COLUMN IF NOT EXISTS conversation jsonb DEFAULT '[]'::jsonb;
ALTER TABLE linkedin_posts ADD COLUMN IF NOT EXISTS conversation_summary text;
