# Architecture

This document describes the high-level architecture, data flow, and design decisions of the RAG AI Chatbot.

## Overview

The application is a **RAG (Retrieval-Augmented Generation)** chatbot that:

1. Lets users upload documents (PDF, TXT) into a knowledge base.
2. Chunks and embeds that content using OpenAI embeddings; stores vectors in Neon PostgreSQL (pgvector).
3. Answers user questions by retrieving relevant chunks and generating answers with OpenAI, grounded in that context.

All AI and database access runs **server-side only** (Next.js Server Actions). The client never receives API keys or raw embeddings.

---

## High-level architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              Client (Browser)                             │
│  Landing │ Chat (sidebar + messages) │ Documents (upload) │ Auth (Clerk) │
└─────────────────────────────────────────────────────────────────────────┘
                    │                    │                    │
                    ▼                    ▼                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         Next.js App Router (Server)                       │
│  Server Actions: sendMessage, uploadDocument, getChatSession, …          │
└─────────────────────────────────────────────────────────────────────────┘
                    │                    │                    │
        ┌───────────┴───────────┐         │         ┌──────────┴──────────┐
        ▼                     ▼         ▼         ▼                     ▼
┌───────────────┐    ┌───────────────┐  ┌───────────────┐    ┌───────────────┐
│  AI layer     │    │  DB layer    │  │  Config       │    │  Auth (Clerk)  │
│  embeddings   │    │  Prisma      │  │  env, rag     │    │  middleware    │
│  retrieval   │    │  vectors     │  │               │    │               │
│  chat         │    │              │  │               │    │               │
└───────┬───────┘    └───────┬──────┘  └───────────────┘    └───────────────┘
        │                    │
        ▼                    ▼
┌───────────────┐    ┌───────────────┐
│  OpenAI API   │    │  Neon Postgres│
│  embeddings   │    │  pgvector     │
│  chat         │    │               │
└───────────────┘    └───────────────┘
```

- **Client**: React components, forms, sidebar; no secrets, no direct OpenAI/DB.
- **Server**: Server Actions handle chat, upload, and session logic; they call the AI layer, DB layer, and config.
- **AI layer**: Embeddings, retrieval (vector search), and RAG chat completion.
- **DB layer**: Prisma for CRUD; raw SQL for vector similarity (pgvector).
- **Config**: Centralized env and RAG constants so behavior is tunable in one place.

---

## RAG pipeline

End-to-end flow when a user sends a message:

```
1. User submits message (form → sendMessage action)
2. Validation (Zod): content length, optional sessionId
3. Resolve user: Clerk auth → getOrCreateUserByClerk (internal User id)
4. Create or reuse ChatSession; persist user message
5. RAG:
   a. Embed query (OpenAI text-embedding-3-small) → vector q
   b. Vector search: top-k chunks by cosine similarity (pgvector <=>)
   c. Filter by minSimilarity; if none pass, use top fallbackChunkCount
   d. Build system prompt: instructions + "Context from knowledge base" + chunks
   e. Chat completion (OpenAI gpt-4o-mini) with system + user message
6. Persist assistant message; update session.updatedAt
7. Revalidate /chat and /chat/[id]; return { success, sessionId, message }
8. Client: optional redirect to /chat/[sessionId], refresh, show reply
```

- **Embeddings**: Single vector per query; chunk texts are already embedded at ingest time.
- **Retrieval**: Cosine similarity `1 - (embedding <=> $query::vector)`; ordered by distance, then `LIMIT topK`.
- **Generation**: System prompt instructs the model to answer only from the provided context and to say when context is missing or irrelevant.

---

## Data flow

### Document ingestion (upload or script)

```
File (PDF/TXT) → extract text (unpdf / UTF-8)
  → chunkText(content) → list of strings
  → embedTexts(chunks) → list of vectors (OpenAI)
  → Document row + N Embedding rows (vector column via raw SQL)
```

- One **Document** per file; many **Embedding** rows (one per chunk) with `chunkText` and `embedding` (vector).

### Chat session and history

- **Anonymous**: `ChatSession.userId = null`; session is created and messages stored, but not tied to a user. List in sidebar is empty for anonymous users.
- **Signed-in**: `ChatSession.userId` set to internal `User.id` (from Clerk via `getOrCreateUserByClerk`). Sidebar lists sessions for that user; they persist across visits.

---

## Folder structure (detailed)

```
src/
├── config/
│   ├── env.ts          # getDatabaseUrl(), getOpenAiApiKey(), getClerkPublishableKey(), …
│   └── rag.ts          # RAG_CONFIG, CHUNK_CONFIG, UPLOAD_CONFIG
├── actions/
│   ├── chat.ts         # sendMessage(formData) — validate, persist, RAG, return reply
│   ├── documents.ts    # uploadDocument(formData) — parse file, chunk, embed, store
│   └── session.ts      # getOrCreateUserByClerk, getChatSessions, getChatSession
├── ai/
│   ├── embeddings.ts   # embedText(), embedTexts() — OpenAI embeddings
│   ├── retrieval.ts    # retrieveContext(query, topK) — embed + vector search + format
│   └── chat.ts         # generateRagResponse(userMessage, options) — retrieve + LLM
├── db/
│   ├── index.ts        # Prisma client singleton (adapter-pg, DATABASE_URL)
│   └── vectors.ts      # findSimilarChunks(embedding, topK) — raw SQL pgvector
├── lib/
│   ├── chunking.ts     # chunkText(text, chunkSize, overlap) — for ingest & upload
│   ├── errors.ts       # ERROR_MESSAGES — user-facing copy for actions
│   ├── validations.ts  # sendMessageSchema, createSessionSchema (Zod)
│   └── utils.ts        # cn() (classnames)
├── components/
│   ├── chat/           # ChatPanel, AppSidebar, ChatLayout
│   ├── documents/      # DocumentUploadForm
│   ├── ui/             # ShadCN (button, card, input, sidebar, …)
│   ├── theme-provider.tsx
│   └── theme-toggle.tsx
├── app/
│   ├── layout.tsx      # Root: ClerkProvider (optional), ThemeProvider, Toaster
│   ├── page.tsx        # Landing
│   ├── chat/           # layout (sidebar + sessions), page (new chat), [id] (thread)
│   ├── documents/      # Upload page
│   └── sign-in, sign-up/  # Clerk routes
└── middleware.ts       # Clerk; public routes: /, /chat, /documents, sign-in/up
```

- **config**: Single source of truth for env and RAG/chunk/upload constants.
- **actions**: Entry points from the UI; orchestrate AI, DB, and validation.
- **ai**: Pure RAG logic (embed, retrieve, generate); no UI.
- **db**: Data access; vectors use raw SQL for pgvector.
- **lib**: Shared utilities, validation, and error copy.

---

## Key design decisions

| Decision | Rationale |
|----------|-----------|
| **Server Actions only for AI/DB** | No API keys or embeddings on the client; simpler and secure. |
| **Centralized config** | One place to change models, topK, similarity, chunk size, upload limits. |
| **Prisma + raw SQL for vectors** | Prisma for CRUD; pgvector column and similarity search via raw SQL (Prisma doesn’t model vector type). |
| **Optional Clerk** | App runs without Clerk (e.g. build); when keys are set, auth and persisted history are enabled. |
| **Fallback when similarity is low** | If all chunks are below `minSimilarity`, still send top `fallbackChunkCount` so the model can try to use them. |
| **Single Prisma client** | Singleton in `db/index.ts` to avoid connection exhaustion in serverless. |

---

## Security model

- **Secrets**: Only on server; read via `config/env.ts` (e.g. `getOpenAiApiKey()`, `getDatabaseUrl()`).
- **Input**: Validated with Zod in actions; file type and size enforced in `uploadDocument`.
- **SQL**: Parameterized queries for vector and document IDs; no string interpolation of user input.
- **Auth**: Clerk middleware protects non-public routes; session resolution uses Clerk id and internal User id.

For more on deployment and production hardening, see [DEPLOYMENT.md](./DEPLOYMENT.md).
