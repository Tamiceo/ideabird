CREATE TABLE contents (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title          text NOT NULL,
  card_type      text NOT NULL CHECK (card_type IN ('A', 'B')),
  idea_text      text,
  character      text CHECK (character IN ('wonder-ellie', 'mr-dou', 'wiggle-lou')),
  card_count     int NOT NULL DEFAULT 1,
  status         text DEFAULT 'draft' CHECK (status IN ('draft', 'running', 'done')),
  corrected_copy text,
  instagram_url  text,
  figma_url      text,
  drive_url      text,
  created_at     timestamptz DEFAULT now(),
  published_at   timestamptz
);

-- RLS는 MVP 단계에서는 비활성화 (1인 내부 도구)
-- 추후 외부 접근 시 활성화 필요:
-- ALTER TABLE contents ENABLE ROW LEVEL SECURITY;
