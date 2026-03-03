# RAG AI Chatbot — Production-Ready Knowledge Assistant

A production-ready RAG (Retrieval-Augmented Generation) AI chatbot that answers questions using your internal knowledge base. Built with Next.js (App Router), OpenAI, Neon PostgreSQL (pgvector), Clerk, and ShadCN UI.

## Features

- **Semantic search** over internal documents via vector embeddings (OpenAI + pgvector)
- **Grounded answers** — responses cite your knowledge base; no hallucination from external web
- **Clerk authentication** — signed-in users get persisted chat history; anonymous users can try without account (session-only)
- **Light/dark theme** with ShadCN UI
- **Server Actions** for embedding, retrieval, and chat (no OpenAI calls on the client)
- **Zod** validation and type-safe forms

## Tech Stack

| Layer        | Choice                |
|-------------|------------------------|
| Framework   | Next.js 16 (App Router) |
| Language   | TypeScript             |
| Database   | Neon PostgreSQL        |
| Vectors    | pgvector               |
| ORM        | Prisma 7               |
| Auth       | Clerk                  |
| UI         | ShadCN, Tailwind       |
| AI         | OpenAI (embeddings + chat) |
| Validation | Zod                    |

## Prerequisites

- Node.js 20+
- [Neon](https://neon.tech) account (PostgreSQL with pgvector)
- [OpenAI](https://platform.openai.com) API key
- [Clerk](https://clerk.com) account (publishable + secret keys)

## Setup

### 1. Clone and install

```bash
cd rag-app-ai
npm install
```

### 2. Environment variables

Copy `.env.example` to `.env` and fill in:

```bash
cp .env.example .env
```

- **DATABASE_URL** — Neon connection string (with `?sslmode=require` for Neon).
- **OPENAI_API_KEY** — OpenAI API key (server-side only).
- **NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY** / **CLERK_SECRET_KEY** — from Clerk dashboard.

### 3. Database and pgvector

Neon supports pgvector; enable it and run migrations:

```bash
# Generate Prisma Client
npm run db:generate

# Apply migrations (creates tables + pgvector extension and embedding column)
npm run db:migrate
```

If you prefer to push schema without migration history (e.g. dev):

```bash
npx prisma db push
```

Then run the custom migration SQL once to add the vector extension and `embedding` column on `Embedding` (see `prisma/migrations/20240302000000_init/migration.sql`). If you use the provided migration as-is, it already includes everything.

### 4. Ingest sample documents

Run the example ingestion script to index sample docs and populate embeddings:

```bash
npm run ingest
```

This uses `scripts/ingest-embeddings.ts`: chunks text, generates embeddings via OpenAI, and inserts into `Document` and `Embedding` (vector column via raw SQL).

### 5. Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You can sign up/sign in (Clerk) or use “Try without account” to use the chat with session-only storage.

## Project structure

```
src/
├── actions/          # Server Actions (chat, session)
├── ai/               # RAG: embeddings, retrieval, chat
├── components/      # UI (ShadCN + chat, theme)
├── db/               # Prisma client + vector queries
├── app/              # App Router (landing, chat, layout)
├── lib/              # Utils, validation (Zod)
prisma/
├── schema.prisma     # Models (vector column in migration only)
├── migrations/       # Init + pgvector migration
scripts/
└── ingest-embeddings.ts  # Example ingestion
```

## Database schema (summary)

- **User** — Clerk-linked user (chat ownership).
- **Document** — Source documents (title, content, metadata).
- **Embedding** — Chunks per document; `embedding` column is `vector(1536)` (added in migration).
- **ChatSession** — Chat session (optional `userId` for persistence).
- **Message** — Messages per session (role + content).

Vector similarity search is implemented in `src/db/vectors.ts` via raw SQL (`<=>` cosine distance).

## RAG flow

1. User submits a question (form → Server Action).
2. **Embed** query with OpenAI `text-embedding-3-small`.
3. **Retrieve** top-k similar chunks from Neon (pgvector cosine similarity).
4. **Build** system prompt with retrieved context.
5. **Generate** reply with OpenAI Chat API (`gpt-4o-mini`).
6. Save user + assistant messages; optional redirect to `/chat/[sessionId]` and refresh.

All OpenAI and DB access are server-side only.

## Deployment (Vercel + Neon)

1. **Vercel**  
   - Import the repo, set root directory if needed.  
   - Add env vars: `DATABASE_URL`, `OPENAI_API_KEY`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`.

2. **Neon**  
   - Create a project and copy the connection string.  
   - Enable pgvector (Neon supports it; the migration creates the extension).  
   - Use the same `DATABASE_URL` in Vercel.

3. **Clerk**  
   - Set allowed redirect origins to your Vercel URL (e.g. `https://your-app.vercel.app`).

4. **Build**  
   - Run migrations against the production DB (e.g. in CI or once from your machine with production `DATABASE_URL`).  
   - Run ingestion (or your own pipeline) to populate documents and embeddings.

5. **Rate limiting**  
   - Add rate limiting (e.g. Vercel KV or Upstash) in front of the chat Server Action when you go to production.

## Security and practices

- No OpenAI or DB credentials on the client; all in Server Actions.
- Clerk middleware protects routes you mark non-public (see `src/middleware.ts`).
- Inputs validated with Zod; raw SQL uses parameterized queries for embeddings.

## License

MIT.
