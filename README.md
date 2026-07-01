# IdeaBird

AI-powered social publishing studio. Draft, refine, and publish **LinkedIn posts** and **Instagram card news** — with Claude doing the writing and correction, and a card-news editor that exports print-ready PNGs.

> Built with Next.js 16 (App Router) + Supabase + the Anthropic Claude API.
> This is an open-source reference version of an internal tool.

## Features

- ✍️ **LinkedIn** — generate a draft from keywords, refine it with AI corrections, and publish directly via the LinkedIn Posts API (with image upload).
- 🎴 **Instagram card news** — a 4-stage flow (source → planning → style → editor) that turns text into a multi-card carousel and exports each card as a PNG.
- 🔐 **Domain-restricted Google login** — only emails on your allowed domain can sign in (via Supabase Auth).
- 💾 **DB as source of truth** — drafts live in Supabase; external publishing always reads from the DB.

## Tech stack

| Layer | Tech |
|-------|------|
| Framework | Next.js 16 (App Router), React 19, TypeScript |
| Styling | Tailwind CSS v4 |
| Database / Auth | Supabase (Postgres + Auth) |
| AI | Anthropic Claude API (`@anthropic-ai/sdk`) |
| Image export | `html-to-image`, `sharp` |
| Publishing | LinkedIn Posts API (`LinkedIn-Version: 202601`) |

## Getting started

### 1. Install

```bash
git clone https://github.com/<your-org>/ideabird.git
cd ideabird
npm install
```

### 2. Configure environment

Copy the example env file and fill in your own keys:

```bash
cp .env.example .env.local
```

See [`.env.example`](.env.example) for the full list. You'll need:

- A **Supabase** project (URL + anon key + service-role key)
- An **Anthropic** API key
- A **LinkedIn** developer app (client id/secret, scopes: `openid profile w_member_social`)
- `ALLOWED_EMAIL_DOMAIN` — the email domain permitted to sign in (e.g. `@example.com`)

### 3. Set up the database

Run the SQL migrations in [`supabase/migrations/`](supabase/migrations/) against your Supabase project, in order:

```
001_contents.sql      → legacy content table
002_linkedin.sql      → linkedin_posts, linkedin_tokens
003_conversation.sql  → conversation / correction history
004_updated_at.sql    → updated_at triggers
```

You can paste them into the Supabase SQL editor, or use the Supabase CLI.

### 4. Configure Google login (Supabase Auth)

Enable the Google provider in your Supabase project's Auth settings, and set the
OAuth redirect to `<your-app-url>/auth/callback`. Only users whose email ends
with `ALLOWED_EMAIL_DOMAIN` will be allowed in.

### 5. Run

```bash
npm run dev
```

Open http://localhost:3000.

## Project structure

```
app/
  linkedin/       LinkedIn draft, editor, publish routes
  instagram/      Instagram card-news routes
  api/            API routes (generate, correct, publish, render, …)
  auth/           OAuth callbacks (Google + LinkedIn)
components/
  editor/         LinkedIn editor UI
  cardnews/       Card-news 4-stage flow + renderer
lib/              Supabase client, LinkedIn API, Anthropic helpers
supabase/
  migrations/     Database schema
```

## License

[Apache-2.0](LICENSE) © 2026 allroundplay
