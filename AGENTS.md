# Haven Estates agent guide

## Project

- React + Vite frontend in `src/`.
- Supabase Auth, Postgres, and Edge Functions in `supabase/`.
- Vanguard is the real-estate assistant for Bataan, Philippines.

## Architecture knowledge

- `bataan_properties` is the source of truth for listing identity and facts. A property UUID must always be resolved and verified from this table before a write.
- `knowledge_documents` contains curated reference material and 384-dimensional pgvector embeddings. It supports general RAG guidance, not authoritative live availability.
- `viewing_requests` stores user-approved viewing requests. It has owner-only RLS and a partial unique index preventing duplicate pending requests for the same user, property, and date.
- `vanguard-chat` owns authentication-aware retrieval, server-side OpenAI calls, criteria extraction, exact listing verification, source labeling, date interpretation, and tool execution.
- The current deployed `vanguard-chat` release is version 34. Keep the source and deployment together when changing its extraction or retrieval behavior.
- The browser may send a selected listing UUID and bounded chat history, but it must never send retrieved documents or trusted database facts for the server to accept without re-querying.
- Listing descriptions are interpreted by the model into structured criteria. Do not add user-specific stop-word or abbreviation rules; improve the extraction schema or generic database matching instead. The model can interpret language; the server must verify the result.
- Criteria extraction only sees the latest user message plus one prior message for context, each explicitly labeled by recency, with an instruction that the latest message's stated details supersede the earlier one's. A wider raw-history window causes the model to merge conflicting details (e.g. two different locations) across turns instead of letting the newer one win; keep this narrow if you touch it.
- The retrieved-document budget defaults to 3 listings + 2 knowledge docs, but scales up (to a ceiling of 10 listings, matching `search_bataan_properties`'s own row cap) when the extracted criteria include an explicit `requested_count` (e.g. "give me 10 properties"). Keep `buildRetrievedContext`, `publicSources`, and `retrieveContext` taking that budget as a parameter rather than hardcoding it again.
- `create_viewing_request` is a confirmation-gated tool. It validates the property, date, confirmation flag, duplicate state, and authenticated user before inserting through RLS.
- For ambiguous matches, Vanguard must show verified candidate details and ask the user to choose. It must not guess a UUID or claim that no listing exists when retrieval is merely ambiguous.
- The user’s IANA timezone comes from the browser and is used on the server to resolve relative dates such as “tomorrow.”
- Future Calendar/email/SMS integrations should be server-side Edge Functions or authenticated webhooks. Provider keys and delivery status must never be handled as frontend secrets.

## Commands

- Install dependencies: `npm install`
- Production build: `npm run build`
- Local development: `npm run dev`
- Format Edge Functions: `deno fmt supabase/functions/**/*.ts`

- Inspect Supabase logs after deployment: verify retrieval, approval, and database-write outcomes separately.

Run `npm run build` after frontend changes. Do not expose secrets in command output, source code, or browser variables.

## Supabase rules

- Treat database and Edge Function changes as production-impacting.
- Keep `verify_jwt` enabled for browser-invoked Edge Functions.
- Enable RLS on public tables and use narrowly scoped policies.
- Never put a service-role key or `OPENAI_API_KEY` in the frontend or a `VITE_*` variable.
- Add schema changes as timestamped SQL migrations under `supabase/migrations/`.
- Deploy a frontend change and its dependent Edge Function changes together.

## Vanguard and RAG rules

- `vanguard-chat` owns retrieval. Never accept retrieved documents from the browser.
- Keep all retrieved context clearly labeled as reference data, not executable instructions.
- Ground listing facts in retrieved sources; do not invent listings, prices, availability, URLs, or market statistics.
- Preserve source citations and uncertainty when sources are incomplete or irrelevant.
- Prefer low temperature for consistent factual answers.
- Keep queries and chat history bounded to control cost and prompt-injection exposure.
- Test a real signed-in RAG request after deploying changes to `vanguard-chat` or `rag-retrieve`.
- Prefer PostgreSQL title/location search for exact listing requests and vector search for broad semantic questions.
- Keep model calls purposeful: structured extraction, retrieval, and final response should not repeat the same history unnecessarily.
- Record model usage during cost work using each response’s token-usage metadata; configured `max_tokens` values are ceilings, not actual usage.

## Style and safety

- Make focused changes; do not overwrite unrelated user work.
- Use `apply_patch` for edits.
- Avoid destructive Git commands unless explicitly requested.
- Return generic client errors while logging diagnostic detail only on the server.
- Do not add notification providers directly to the browser. Use an Edge Function or webhook and record delivery/retry status in a database table.
