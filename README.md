# Internal Knowledge Base — RAG AI App

A production-ready **internal-only** RAG app: upload documents to a shared knowledge base and ask questions with answers grounded in your docs. Built with Next.js (App Router), OpenAI, Neon PostgreSQL (pgvector), Clerk, and ShadCN UI.

## Features

- **Internal-only access** — sign-in required for chat and knowledge base; no anonymous use. Optional allowlist by email domain (`ALLOWED_EMAIL_DOMAINS`) to restrict to your organization.
- **Knowledge base** — upload PDF/TXT, list and delete documents; chunked and embedded for semantic search.
- **Semantic search** — vector embeddings (OpenAI + pgvector) over your docs.
- **Streaming chat** — ask questions; answers stream in and cite the knowledge base.
- **Clerk authentication** — sign-in/sign-out, user menu in app header; chat history per user.
- **Light/dark theme** with ShadCN UI
- **Server Actions** for upload, list, delete, and API route for streaming chat
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

## Documentation

Detailed documentation is in the **[`docs/`](./docs/README.md)** folder:

| Document | Description |
|----------|-------------|
| [**ARCHITECTURE**](./docs/ARCHITECTURE.md) | System design, RAG pipeline, data flow, folder structure |
| [**SETUP**](./docs/SETUP.md) | Step-by-step setup and first run |
| [**CONFIGURATION**](./docs/CONFIGURATION.md) | Environment variables, RAG tuning, upload limits |
| [**API**](./docs/API.md) | Server actions, validation schemas, types |
| [**DEPLOYMENT**](./docs/DEPLOYMENT.md) | Production deploy (Vercel, Neon, Clerk), checklist, troubleshooting |
| [**DEVELOPMENT**](./docs/DEVELOPMENT.md) | Local dev workflow, scripts, conventions |

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
- **NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY** / **CLERK_SECRET_KEY** — from Clerk dashboard (required for this app; chat and documents are gated).
- **ALLOWED_EMAIL_DOMAINS** (optional) — comma-separated domains (e.g. `company.com`) so only those users can access the app after sign-in.

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
├── config/           # Env validation (env.ts), RAG constants (rag.ts)
├── actions/          # Server Actions (chat, documents, session)
├── ai/               # RAG: embeddings, retrieval, chat
├── components/       # UI (ShadCN, chat sidebar, theme)
├── db/               # Prisma client + vector similarity (vectors.ts)
├── app/              # App Router (landing, chat, documents, auth)
├── lib/              # Utils, validation (Zod), errors (user-facing copy)
prisma/
├── schema.prisma     # Models (vector column in migration only)
├── migrations/       # Init + pgvector migration
scripts/
└── ingest-embeddings.ts  # Example ingestion
```

## Configuration

- **Environment** — `src/config/env.ts` validates required vars (`DATABASE_URL`, `OPENAI_API_KEY`) when used; optional Clerk keys for auth. See [docs/CONFIGURATION.md](./docs/CONFIGURATION.md).
- **RAG tuning** — `src/config/rag.ts` holds embedding/chat model names, `topK`, `minSimilarity`, chunk size/overlap, and upload limits. See [docs/CONFIGURATION.md](./docs/CONFIGURATION.md#rag-config).
- **Errors** — `src/lib/errors.ts` centralizes user-facing error messages for actions.

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
- Clerk middleware protects `/chat`, `/documents`, and `/api/*`; only `/` and sign-in/up are public (see `src/middleware.ts`).
- Inputs validated with Zod; raw SQL uses parameterized queries for embeddings.
- Env is validated in `config/env.ts`; never read secrets from client bundles.

## Production checklist

- [ ] Set all required env vars in Vercel (and optionally use Vercel env for previews).
- [ ] Run `npm run db:migrate` against production DB before first deploy.
- [ ] Add rate limiting for chat and upload actions (e.g. Upstash Redis).
- [ ] Configure Clerk redirect URLs and (if needed) webhooks.
- [ ] Run `npm run lint` and `npm run typecheck` in CI.

## License

MIT.
