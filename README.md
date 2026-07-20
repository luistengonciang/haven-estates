# Haven Estates

A polished real-estate discovery landing page built with React and Vite. It includes a responsive property search interface, featured listings, and the Vanguard AI Advisor chat experience.

## Tech stack

- React
- Vite
- Lucide React

## Run locally

```bash
npm install
npm run dev
```

The AI advisor retrieves relevant sample knowledge from Supabase before sending a response. Copy `.env.example` to `.env.local` and provide the Supabase publishable connection values plus the existing OpenAI model settings.

The hosted Supabase project uses the `knowledge_documents` table, pgvector similarity search, and the `rag-retrieve` Edge Function. Sample Bay Area real-estate documents are included in the migration.

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
```
