# Haven Estates agent guide

## Project

- React + Vite frontend in `src/`.
- Supabase Auth, Postgres, and Edge Functions in `supabase/`.
- Vanguard is the real-estate assistant for Bataan, Philippines.

## Commands

- Install dependencies: `npm install`
- Production build: `npm run build`
- Local development: `npm run dev`
- Format Edge Functions: `deno fmt supabase/functions/**/*.ts`

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

## Style and safety

- Make focused changes; do not overwrite unrelated user work.
- Use `apply_patch` for edits.
- Avoid destructive Git commands unless explicitly requested.
- Return generic client errors while logging diagnostic detail only on the server.
