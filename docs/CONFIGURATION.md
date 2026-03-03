# Configuration

This document describes all configuration options: environment variables, RAG tuning, and where to change behavior.

## Environment variables

Handled in `src/config/env.ts`. Required vars are validated when first used (e.g. when a Server Action runs).

### Required (for full functionality)

| Variable | Used by | Description |
|----------|---------|-------------|
| `DATABASE_URL` | Prisma, migrations | PostgreSQL connection string. For Neon, include `?sslmode=require`. |
| `OPENAI_API_KEY` | AI layer (embeddings, chat) | OpenAI API key. Must be set for chat and document ingestion. |

### Optional (authentication)

| Variable | Used by | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Layout, ClerkProvider | Clerk publishable key. If unset, Clerk is not loaded and auth is effectively disabled. |
| `CLERK_SECRET_KEY` | Clerk server-side | Clerk secret key. Set when using Clerk. |

### Optional (Clerk URLs)

Clerk uses defaults if these are not set. Override only if you need custom paths or redirects.

- `NEXT_PUBLIC_CLERK_SIGN_IN_URL` — Sign-in path (default: `/sign-in`).
- `NEXT_PUBLIC_CLERK_SIGN_UP_URL` — Sign-up path (default: `/sign-up`).
- `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL` — Where to send after sign-in (default: `/`).
- `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL` — Where to send after sign-up (default: `/`).

### Access in code

- **Server only**: Use helpers from `@/config/env` (e.g. `getDatabaseUrl()`, `getOpenAiApiKey()`). Do not import config in client components.
- **Build time**: For static generation, the app avoids requiring `DATABASE_URL` or `OPENAI_API_KEY` on routes that don’t use them. Routes that do (e.g. chat, documents) need these set when that code runs (e.g. in production or when testing with DB/OpenAI).

---

## RAG config

Defined in `src/config/rag.ts`. Change these to tune retrieval and generation without scattering magic numbers.

### RAG_CONFIG

| Key | Default | Description |
|-----|---------|-------------|
| `embeddingModel` | `"text-embedding-3-small"` | OpenAI model for embeddings. Changing may require a different dimension and re-embedding. |
| `embeddingDimension` | `1536` | Vector size. Must match the embedding model; do not change without re-embedding all documents. |
| `embeddingInputLimit` | `8191` | Max characters per input to the embedding API (model limit). |
| `chatModel` | `"gpt-4o-mini"` | OpenAI model for RAG answers. |
| `chatMaxTokens` | `1024` | Max tokens per chat reply. |
| `defaultTopK` | `10` | Number of chunks to retrieve from vector search. |
| `minSimilarity` | `0.3` | Minimum cosine similarity (0–1) to keep a chunk. Lower = more permissive. |
| `fallbackChunkCount` | `5` | If every chunk is below `minSimilarity`, how many top chunks to still send to the model. |

**Tuning tips:**

- **Answers miss relevant content**: Increase `defaultTopK` (e.g. 15) or lower `minSimilarity` (e.g. 0.25).
- **Answers are noisy or off-topic**: Raise `minSimilarity` (e.g. 0.4) or reduce `defaultTopK`.
- **Longer answers**: Increase `chatMaxTokens`.

### CHUNK_CONFIG

| Key | Default | Description |
|-----|---------|-------------|
| `chunkSize` | `800` | Target characters per chunk. |
| `chunkOverlap` | `100` | Overlap between consecutive chunks to preserve context at boundaries. |

Used by `src/lib/chunking.ts`, upload action, and ingest script. Larger chunks = fewer, richer chunks; smaller = more granular retrieval and more vectors.

### UPLOAD_CONFIG

| Key | Default | Description |
|-----|---------|-------------|
| `maxFileSizeBytes` | `10 * 1024 * 1024` (10 MB) | Max upload size. |
| `allowedMimeTypes` | `["application/pdf", "text/plain"]` | Allowed MIME types. |
| `allowedExtensions` | `[".pdf", ".txt"]` | Allowed file extensions. |

Used in `src/actions/documents.ts`. To support more types, add parsing logic and extend these (and the upload UI).

---

## Error messages

User-facing strings for actions are in `src/lib/errors.ts` under `ERROR_MESSAGES`:

- **chat**: e.g. generic failure, empty message, message too long.
- **upload**: no file, file too large, unsupported type, no text, no chunks.

Change these to adjust copy or localization without touching action logic.

---

## Public routes (middleware)

In `src/middleware.ts`, these paths are **public** (no sign-in required):

- `/`
- `/chat`, `/chat/*`
- `/documents`
- `/sign-in`, `/sign-up` (and Clerk catch-all)
- `/api/webhooks/*`

All other routes require a signed-in user (Clerk). To protect more routes, remove them from the `isPublicRoute` matcher in `middleware.ts`.

---

## Summary table

| What you want to change | File / place |
|-------------------------|--------------|
| DB or OpenAI keys, Clerk keys | `.env` (and `config/env.ts` if adding new vars) |
| Embedding/chat model, topK, similarity, chunk size | `src/config/rag.ts` |
| Upload size or allowed types | `src/config/rag.ts` → `UPLOAD_CONFIG` |
| User-facing error text | `src/lib/errors.ts` |
| Which routes require auth | `src/middleware.ts` |
