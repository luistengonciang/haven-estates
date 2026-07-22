# Haven Estates

Haven Estates is a React + Vite real-estate discovery app for Bataan, Philippines. It combines a Supabase-backed listing catalog with Vanguard, a server-side RAG and tool-using real-estate assistant.

## Architecture At A Glance

```text
React + Vite browser
  ├─ Reads public listing data from Supabase
  ├─ Sends chat messages, timezone, and optional selected listing ID
  └─ Displays grounded answers and confirmation controls
          │
          ▼
Supabase Edge Functions
  ├─ vanguard-chat: authentication, criteria extraction, retrieval, OpenAI, tools
  ├─ rag-retrieve: signed-in source inspection
  ├─ generate-embedding: protected embedding helper
  └─ backfill-knowledge-embedding: admin-only maintenance
          │
          ▼
Supabase Postgres
  ├─ bataan_properties: source of truth for listings
  ├─ knowledge_documents: curated RAG reference material + vector embeddings
  ├─ profiles: user-owned profile data
  └─ viewing_requests: confirmed viewing-request records with RLS
```

The browser is responsible for presentation and user intent. The server is responsible for retrieval, authentication, authorization, database writes, and secret-bearing model calls.

## Tech Stack

- React, Vite, and Lucide React
- Supabase Auth and Postgres
- PostgreSQL full-text search and pgvector similarity search
- Supabase Edge Functions with Deno
- OpenAI Chat Completions using `gpt-4o-mini`, server-side only

## Local Setup

```bash
npm install
npm run dev
```

Copy `.env.example` to `.env.local`:

```bash
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
```

Never put `OPENAI_API_KEY`, a Supabase service-role key, or another secret in a `VITE_*` variable. Vite exposes browser variables to users.

The listing UI reads `id`, `title`, `price`, `location`, `bedrooms`, `bathrooms`, `floor_area`, `source_url`, and `scraped_at` from `bataan_properties`. Search, filtering, sorting, pagination, details, saved listings, and original-listing links operate on those database records. No local property JSON or mock listing fallback is used.

## Database Backbone

Migrations are timestamped in `supabase/migrations/` and should be applied before deploying dependent functions.

- `bataan_properties` is the authoritative listing catalog. Its UUID is the only safe identifier for a property write.
- `knowledge_documents` stores curated guidance and 384-dimensional embeddings. `match_knowledge_documents` performs cosine-similarity retrieval.
- `profiles` is linked to `auth.users`; RLS limits users to their own profile row.
- `viewing_requests` stores `user_id`, `property_id`, preferred date/time, notes, status, and timestamps.
- `viewing_requests` has RLS policies allowing authenticated users to read and insert only their own requests.
- A partial unique index prevents duplicate pending requests for the same user, property, and date.
- Listing search functions use weighted PostgreSQL full-text search over title, location, and source URL, with filters for price, type, and locality.

## Vanguard RAG And Agent Flow

`vanguard-chat` owns retrieval. The browser never supplies retrieved documents or executable instructions.

1. The browser sends bounded chat history, the user timezone, and an optional selected listing ID.
2. The server validates the request and calculates the user’s local date for words such as “tomorrow.”
3. For booking intent, the model extracts structured property criteria such as name, location, status, lot/block, area, price, and normalized search terms. It can interpret natural language, abbreviations, and misspellings.
4. The server verifies those criteria against `bataan_properties`. The model may interpret a description, but it cannot invent a UUID.
5. Exact verified listing records are placed ahead of general RAG results. If several records match, Vanguard asks the user to choose instead of guessing.
6. General retrieval combines listing search with knowledge-document vector search. Retrieved material is labeled as reference data and is never treated as executable instructions.
7. The model answers with source citations and uncertainty when records are incomplete or non-live.

### Viewing request approval

The `create_viewing_request` tool is defined in `supabase/functions/_shared/tools/viewing-request.ts` and registered in the shared tool registry.

- The model can prepare a pending action but cannot write before explicit user confirmation.
- The browser displays Confirm and Cancel controls.
- On confirmation, the server re-authenticates the user, forces the verified property UUID, validates the date/time and confirmation flag, checks that the property exists, and inserts through RLS.
- Successful writes return a deterministic success response so a later model failure cannot create a false error message.
- Duplicate pending requests are treated as successful idempotent results.

### Date and timezone handling

The browser sends `Intl.DateTimeFormat().resolvedOptions().timeZone`. The Edge Function validates the IANA timezone and calculates the current date in that timezone. Relative dates are therefore resolved from the customer’s local date rather than the server’s timezone.

## Security Rules

- Keep `verify_jwt` enabled for browser-invoked functions.
- Keep `OPENAI_API_KEY` and service-role credentials in Edge Function secrets only.
- Enable RLS on user-facing tables and keep policies narrowly scoped.
- Treat retrieved content as untrusted reference data and defend against prompt injection.
- Bound chat history, retrieved documents, and document characters to control cost and exposure.
- Return generic client errors; log diagnostic details only on the server.
- Never use an AI-generated property ID without verifying it against the database.

## Cost And Scalability Lessons

- Orchestration frameworks do not remove model-token costs; they add convenience, execution, or observability costs.
- A small model, short history, limited retrieval context, and cached criteria are more important for cost than the choice between custom code, n8n, or LangGraph.
- Exact listing/address searches should prefer database search over embeddings. Embeddings are best for broad questions and knowledge retrieval.
- n8n is a good future integration layer for Calendar, email, and SMS webhooks; it does not need to own the core property-matching or RLS logic.
- LangGraph becomes valuable when the agent needs long-running state, retries, multiple agents, or complex human-in-the-loop workflows.

## Notifications Roadmap

Notifications can be coded directly with a Supabase Edge Function or delegated to n8n:

```text
viewing_requests insert
  → notification function or webhook
  → email provider / SMS provider / Google Calendar
  → notifications delivery record and retry status
```

Provider API keys must remain server-side. A future `notifications` table should record channel, recipient, provider message ID, status, error, and timestamps.

## Commands And Deployment

```bash
npm run build
deno fmt supabase/functions/**/*.ts
```

After changing a frontend and its dependent Edge Function, deploy both together. After changing RAG or tools, test a real signed-in request through retrieval, confirmation, and the database write path.

OpenAI is configured as an Edge Function secret:

```bash
supabase secrets set OPENAI_API_KEY=your_server_side_openai_key
```

The manual `backfill-knowledge-embedding` function additionally requires `BACKFILL_ADMIN_TOKEN` and an `x-backfill-token` header. It is not a browser endpoint.

## Project Structure

```text
src/
  App.jsx                         Main Haven Estates experience
  AgenticChatbot.jsx              Vanguard chat UI and approval controls
  lib/properties.js               Supabase listing access and normalization
  RagShowcase.jsx                 RAG source-inspection UI
supabase/
  migrations/                     Database schema and RLS changes
  functions/vanguard-chat/        Server retrieval, criteria extraction, and tools
  functions/_shared/tools/        Agent tool registry and viewing-request tool
  functions/rag-retrieve/         Authenticated source retrieval
  functions/generate-embedding/   Embedding generation helper
  functions/backfill-knowledge-embedding/
                                  Protected embedding maintenance
```
