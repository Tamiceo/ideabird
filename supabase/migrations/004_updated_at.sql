-- updated_at 컬럼 추가 + 자동 갱신 트리거
-- 홈 피드의 상대 시각("2일 전")을 수정 시각 기준으로 보여주기 위해 필요

ALTER TABLE linkedin_posts
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- 기존 행은 created_at 값으로 backfill
UPDATE linkedin_posts
  SET updated_at = created_at
  WHERE updated_at IS NULL;

-- 공용 트리거 함수 (멱등)
CREATE OR REPLACE FUNCTION set_updated_at_now()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_linkedin_posts_updated_at ON linkedin_posts;
CREATE TRIGGER trg_linkedin_posts_updated_at
  BEFORE UPDATE ON linkedin_posts
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at_now();
