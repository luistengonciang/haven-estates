# Haven Estates

Haven Estates is a React + Vite real-estate discovery app for Bataan, Philippines. Listings are loaded from Supabase's `public.bataan_properties` table; the application does not use local property JSON, mock listings, or live scraping.

## Tech stack

- React
- Vite
- Lucide React
- Supabase Auth, Postgres, pgvector, and Edge Functions
- OpenAI Chat Completions (server-side only)

## Local setup

```bash
npm install
npm run dev
```

Copy `.env.example` to `.env.local` and set the Supabase URL and publishable key:

```bash
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
```

Never put `OPENAI_API_KEY`, a Supabase service-role key, or any other secret in a `VITE_*` variable: Vite exposes those values to the browser.

The listing UI fetches and normalizes `id`, `title`, `price`, `location`, `bedrooms`, `bathrooms`, `floor_area`, `source_url`, and `scraped_at` from `bataan_properties`. Search, price/type filtering, sorting, pagination, details, and original-listing links operate on that Supabase response. The legacy `Scraped data/` utility is not imported or run by the application.

## Vanguard AI and RAG

Vanguard retrieves relevant Bataan listing and knowledge-base records inside the server-side `vanguard-chat` Edge Function, then sends only that grounded context to the model. The browser never supplies documents to the model context.

- `knowledge_documents` stores curated material and normalized pgvector embeddings.
- `rag-retrieve` powers the source-inspection UI for signed-in users.
- `vanguard-chat` performs its own retrieval for every chat request, cites retrieved sources, and clearly marks incomplete or non-live data.
- RAG uses cosine similarity and an HNSW vector index for fast lookup.

OpenAI is configured only as a Supabase Edge Function secret:

Configure OpenAI only as a Supabase Edge Function secret:

```bash
supabase secrets set OPENAI_API_KEY=your_server_side_openai_key
```

The chat function uses `gpt-4o-mini` in server-side code. Keep `verify_jwt` enabled for both `vanguard-chat` and `rag-retrieve`.

The manual `backfill-knowledge-embedding` endpoint additionally requires a `BACKFILL_ADMIN_TOKEN` Edge Function secret and an `x-backfill-token` request header. It is not intended for browser use.

After changing an Edge Function, deploy it together with any dependent frontend or migration update. After changing RAG, test a signed-in request end-to-end.

## Authentication

Haven uses Supabase Auth for email/password sign-in and sign-up. Authenticated users get a private `profiles` row protected by Row Level Security; users can only read or change their own profile.

For email confirmation links to return to the app, add each local and deployed app origin in **Supabase Dashboard → Authentication → URL Configuration**. For example, add `http://localhost:5173` while developing and your production URL before launch.

To create a production build:

```bash
npm run build
```

## Database migrations

Apply all SQL migrations in `supabase/migrations/` to the target project before deploying dependent functions. Public tables must have RLS enabled, and knowledge documents are restricted to authenticated users.

## Project structure

```text
src/
  App.jsx             Main Haven Estates experience
  AgenticChatbot.jsx  Vanguard AI Advisor interface
  RagShowcase.jsx     RAG source-inspection UI
  main.jsx            React entry point
  styles.css          Responsive application styles
supabase/
  migrations/         Database schema and access-control changes
  functions/
    rag-retrieve/     Authenticated RAG source retrieval
    vanguard-chat/    Server-side retrieval and OpenAI chat
    backfill-knowledge-embedding/  Protected embedding maintenance
```
