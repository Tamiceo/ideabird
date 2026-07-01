CREATE TABLE linkedin_tokens (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  access_token text NOT NULL,
  person_urn   text NOT NULL UNIQUE,
  expires_at   timestamptz,
  created_at   timestamptz DEFAULT now()
);

CREATE TABLE linkedin_posts (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  keywords         text NOT NULL,
  generated_text   text,
  final_text       text,
  status           text DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  linkedin_post_id text,
  published_at     timestamptz,
  created_at       timestamptz DEFAULT now()
);
