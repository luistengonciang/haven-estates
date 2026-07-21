# Haven Estates

A polished real-estate discovery landing page built with React and Vite. Listings are loaded from the Supabase `public.bataan_properties` table; the app does not use local property JSON, mock listings, or live scraping.

## Tech stack

- React
- Vite
- Lucide React

## Run locally

```bash
npm install
npm run dev
```

The AI advisor retrieves relevant sample knowledge from Supabase before sending a response. Copy `.env.example` to `.env.local` and provide the Supabase publishable connection values. Do not put OpenAI API keys in any `VITE_*` variable because those values are bundled into the browser.

The listing UI fetches and normalizes `id`, `title`, `price`, `location`, `bedrooms`, `bathrooms`, `floor_area`, `source_url`, and `scraped_at` from `bataan_properties`. Search, price/type filtering, sorting, pagination, details, and original-listing links operate on that Supabase response. The legacy `Scraped data/` utility is not imported or run by the application.

The hosted Supabase project uses the `knowledge_documents` table, pgvector similarity search, and the `rag-retrieve` and `vanguard-chat` Edge Functions. Sample Bay Area real-estate documents are included in the migration.

Configure OpenAI only as a Supabase Edge Function secret:

```bash
supabase secrets set OPENAI_API_KEY=your_server_side_openai_key
```

The chat function is locked to `gpt-4o-mini` in server-side code.

The chat endpoint performs retrieval server-side; it never accepts source documents from the browser. Keep the Edge Function JWT check enabled and deploy the knowledge-access migration before deploying the updated functions. The manual embedding-backfill endpoint additionally requires a `BACKFILL_ADMIN_TOKEN` Edge Function secret and an `x-backfill-token` request header; it is not intended for browser use.

## Authentication

Haven uses Supabase Auth for email/password sign-in and sign-up. Authenticated users get a private `profiles` row protected by Row Level Security; users can only read or change their own profile.

For email confirmation links to return to the app, add each local and deployed app origin in **Supabase Dashboard → Authentication → URL Configuration**. For example, add `http://localhost:5173` while developing and your production URL before launch.

To create a production build:

```bash
npm run build
```

## Project structure

```text
src/
  App.jsx             Main Haven Estates experience
  AgenticChatbot.jsx  Vanguard AI Advisor interface
  main.jsx            React entry point
  styles.css          Responsive application styles
supabase/
  functions/
    vanguard-chat/    Server-side OpenAI chat completion proxy
```
