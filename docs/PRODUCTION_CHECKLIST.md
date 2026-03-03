# Production Readiness Checklist

This document summarizes how the app is built for production: security, validation, error handling, and what to verify before deploy.

---

## Security

| Area | Implementation |
|------|----------------|
| **Auth** | Middleware protects `/chat`, `/chat/*`, `/documents`, `/analytics`, `/api/*`. Only `/`, `/sign-in`, `/sign-up`, `/api/webhooks/*` are public. Unauthenticated API requests receive 401. |
| **Session ownership** | `POST /api/chat` verifies that when `sessionId` is provided, the current user owns that session (via `getChatSession`). Returns 403 if not. |
| **Chat actions** | `updateSessionTitle`, `deleteChatSession`, `submitMessageFeedback` all verify the current user owns the session or message. |
| **Document actions** | `uploadDocument`, `listDocuments`, `deleteDocument`, `reingestDocument`, `getDocumentTags` require auth; no per-document ownership (shared internal KB). |
| **Input validation** | All server entry points validate input: Zod schemas for chat body (`sendMessageSchema`), document IDs (`documentIdSchema`), message IDs (`messageIdSchema`), feedback (`feedbackSchema`). |

---

## Validation & Data Integrity

| Item | Detail |
|------|--------|
| **Chat** | Content 1–4000 chars; `sessionId` optional CUID; `tagFilter` optional string max 100. |
| **Documents** | Document IDs validated as CUID before delete/reingest. Tags: max 20 per document, max 50 chars per tag (from `TAG_CONFIG`). |
| **Feedback** | Only `1` or `-1` accepted; message ID must be CUID. |
| **Session title** | Trimmed, max 200 chars; empty becomes "New chat". |

---

## Error Handling

| Layer | Approach |
|------|----------|
| **API route** | 400 for invalid JSON or validation errors; 401 if not authenticated; 403 if session access denied; 500 with generic message on server errors. RAG/stream errors send a fallback message to the client and log; assistant message may still be persisted when possible. |
| **Server actions** | Return `{ success: false, error: string }` (or field errors) instead of throwing. Errors logged server-side; user sees toast or inline error. |
| **Centralized copy** | `ERROR_MESSAGES` in `src/lib/errors.ts` for chat and upload; use in actions and API. |

---

## Configuration

| Config | Location | Purpose |
|--------|----------|---------|
| **Env** | `src/config/env.ts` | `DATABASE_URL`, `OPENAI_API_KEY`, Clerk keys, `ALLOWED_EMAIL_DOMAINS`. |
| **RAG** | `src/config/rag.ts` | Models, topK, similarity, chunk size, upload limits, `TAG_CONFIG`. |
| **No hardcoded secrets** | — | All secrets from env; no API keys in client code. |

---

## Database & Migrations

| Item | Detail |
|------|--------|
| **Migrations** | Prisma migrations in `prisma/migrations/`; run `npm run db:migrate` for deploy. |
| **Vector column** | `Embedding.embedding` added via raw SQL in migration; Prisma schema documents it. |
| **Cascades** | Delete document → embeddings cascade; delete session → messages cascade. |

---

## Best Practices in Code

- **Single responsibility** | Actions and API handlers do one clear job; retrieval/embedding/chat in separate modules.
- **DRY** | Shared validation schemas, config, and error messages.
- **Typing** | TypeScript throughout; no `any`; exported types for messages, documents, and API shapes.
- **Docs** | TSDoc on public functions and key modules; `docs/` for architecture, API, setup, deployment.

---

## Pre-Deploy Verification

1. **Env** – Set `DATABASE_URL`, `OPENAI_API_KEY`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`. Optionally `ALLOWED_EMAIL_DOMAINS`.
2. **DB** – Run `npm run db:migrate` (and `npm run db:generate` if needed).
3. **Build** – `npm run build` succeeds; `npm run typecheck` and `npm run lint` pass.
4. **Clerk** – Sign-in/sign-up and after-sign-in URL (e.g. `/chat`) configured in dashboard.
5. **Smoke test** – Sign in → upload a document (with optional tags) → ask a question → check sources and feedback; rename/delete chat; re-index document; open Analytics.

---

## Optional Hardening (Future)

- **Rate limiting** – Per user or per IP on `/api/chat` and upload.
- **Audit log** – Log document delete/reingest and chat delete for compliance.
- **Document ownership** – If needed, add `userId` to `Document` and restrict delete/reingest to owner or admin.
