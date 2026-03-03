# Setup Guide

Step-by-step instructions to run the RAG AI Chatbot locally.

## Prerequisites

- **Node.js** 20 or later (LTS recommended).
- **npm** (or pnpm/yarn); commands below use `npm`.
- Accounts and keys (see below).

## 1. Clone and install

```bash
cd rag-app-ai
npm install
```

This installs Next.js, Prisma, Clerk, OpenAI SDK, ShadCN-related dependencies, unpdf, zod, and the rest of the stack.

## 2. Environment variables

Create a `.env` file in the project root (copy from `.env.example`):

```bash
cp .env.example .env
```

Edit `.env` and set:

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes (for DB features) | Neon PostgreSQL connection string. Must include `?sslmode=require` for Neon. |
| `OPENAI_API_KEY` | Yes (for chat & ingest) | OpenAI API key. Used for embeddings and chat completion. |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | No | Clerk publishable key. If omitted, auth is disabled and the app still runs. |
| `CLERK_SECRET_KEY` | No | Clerk secret key. Set when using Clerk. |

Example `.env`:

```env
DATABASE_URL="postgresql://user:password@ep-xxx.region.aws.neon.tech/neondb?sslmode=require"
OPENAI_API_KEY="sk-..."
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_..."
CLERK_SECRET_KEY="sk_..."
```

- **Neon**: Create a project at [neon.tech](https://neon.tech), copy the connection string from the dashboard.
- **OpenAI**: Create an API key at [platform.openai.com](https://platform.openai.com/api-keys).
- **Clerk**: Create an application at [dashboard.clerk.com](https://dashboard.clerk.com); use API Keys for publishable and secret.

## 3. Database setup

The app uses PostgreSQL with the **pgvector** extension. The migration creates tables and the vector column.

Generate the Prisma client:

```bash
npm run db:generate
```

Apply migrations (creates all tables and enables pgvector):

```bash
npm run db:migrate
```

If the database is empty and you prefer to sync the schema without migration history:

```bash
npx prisma db push
```

Note: The provided migration in `prisma/migrations/20240302000000_init/migration.sql` already includes `CREATE EXTENSION IF NOT EXISTS vector` and the `embedding vector(1536)` column on `Embedding`. No extra manual SQL is needed when using that migration.

## 4. (Optional) Seed the knowledge base

To have sample content for the chatbot, run the ingest script:

```bash
npm run ingest
```

This adds a few sample documents and their embeddings. You can also upload PDFs or TXT files later from the **Knowledge base** page (`/documents`).

## 5. Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

- **Landing**: Hero and "Sign in" CTA; signed-in users are redirected to /chat.
- **Chat**: Sign in first (required). Ask questions; the sidebar shows "New chat" and chat history.
- **Knowledge base** (`/documents`): Upload PDF or TXT files to add them to the RAG index.

## Verifying the setup

1. **Without Clerk keys**: Chat and documents routes are protected by middleware; Clerk keys are required for the internal app to work.
2. **With Clerk keys**: Sign up / sign in; chats are tied to your user and appear in the sidebar.
3. **With DB + OpenAI**: Send a message and get a RAG reply (from ingested docs or uploads). If no documents are ingested, the model will say no relevant context was found.
4. **Upload**: Go to **Knowledge base**, upload a small PDF or TXT; then ask a question about its content in the chat.

## Troubleshooting

- **“Missing required environment variable: DATABASE_URL”**  
  You’re hitting code that uses the DB (e.g. chat or documents). Set `DATABASE_URL` in `.env` and restart.

- **“Missing required environment variable: OPENAI_API_KEY”**  
  Set `OPENAI_API_KEY` in `.env` and restart.

- **Migrations fail (e.g. “relation already exists”)**  
  The DB may already have schema. Use `npx prisma migrate resolve` if you’ve applied the same migration manually, or reset with `npx prisma migrate reset` (destroys data).

- **Chat returns “No relevant context”**  
  Run `npm run ingest` or upload documents from `/documents` so the vector store has content.

- **Clerk redirect or session issues**  
  In the Clerk dashboard, set the correct redirect URLs (e.g. `http://localhost:3000` for dev). See [CONFIGURATION.md](./CONFIGURATION.md#clerk) for optional env vars.

For production deployment, see [DEPLOYMENT.md](./DEPLOYMENT.md).
