# System Design Document

**Product:** Multi-tenant RAG (Retrieval-Augmented Generation) knowledge-base chat application  
**Document version:** 1.0  
**Audience:** Engineering, product, and new team members

---

## 1. Purpose and scope

### 1.1 What this system does

The application is a **SaaS RAG chatbot** that:

1. **Multi-tenant workspaces** — Each customer (company or team) is a Clerk Organization. Each org has an isolated knowledge base and chat history.
2. **Knowledge base** — Users upload documents (PDF, TXT). The system chunks text, generates embeddings via OpenAI, and stores vectors in PostgreSQL (pgvector).
3. **RAG chat** — Users ask questions; the system retrieves relevant chunks from the current workspace’s documents, then generates answers with an LLM grounded in that context. Chats are scoped per workspace and per user within the org.

### 1.2 Out of scope (for this document)

- Detailed API request/response schemas (see [API.md](./API.md))
- Step-by-step deployment (see [DEPLOYMENT.md](./DEPLOYMENT.md))
- Clerk Dashboard configuration (see [CLERK_MULTI_TENANT_SETUP.md](./CLERK_MULTI_TENANT_SETUP.md))

---

## 2. Goals and constraints

| Goal | How the system addresses it |
|------|----------------------------|
| **Tenant isolation** | Every document and chat session is keyed by `organizationId` (Clerk org id). All reads/writes and vector search filter by this id. |
| **Security** | No API keys or DB credentials on the client. Auth and tenant context are resolved server-side (Clerk + `requireOrganizationId()`). |
| **Scalability** | Stateless app tier; DB connection via Prisma + adapter; vector search is indexed (HNSW). Tuning (topK, chunk size) is centralized in config. |
| **Operability** | Single codebase; config via env and `rag.ts`; migrations and scripts for ingest and backfill. |

**Constraints:** OpenAI for embeddings and chat; PostgreSQL with pgvector for persistence and similarity search; Clerk for auth and organizations.

---

## 3. System context

```
                    ┌──────────────────────────────────────────────────────────┐
                    │                     External users                         │
                    │         (signed-in users in a Clerk organization)         │
                    └──────────────────────────────────────────────────────────┘
                                              │
                                              │ HTTPS
                                              ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                        RAG Knowledge Base Application (Next.js)                          │
│  • Landing, sign-in/up, workspace creation                                                │
│  • Chat UI (sessions, messages, RAG stream)                                               │
│  • Documents (upload, list, delete, reingest)                                             │
│  • Analytics (counts per workspace)                                                       │
└─────────────────────────────────────────────────────────────────────────────────────────┘
                    │                                    │
                    │ Server Actions / API / Server Cmp   │
                    ▼                                    ▼
        ┌───────────────────────┐            ┌───────────────────────┐
        │   OpenAI API           │            │   Clerk                │
        │   • Embeddings         │            │   • Auth               │
        │   • Chat completions   │            │   • Organizations      │
        │                        │            │   • orgId / userId      │
        └───────────────────────┘            └───────────────────────┘
                    │
                    │
                    ▼
        ┌───────────────────────┐
        │   PostgreSQL (Neon)    │
        │   • Prisma (CRUD)      │
        │   • pgvector (similarity) │
        └───────────────────────┘
```

- **Users** interact only with the Next.js app (browser). They sign in with Clerk and must have an active organization (workspace); otherwise they are sent to a “Create workspace” flow.
- **Next.js** is the single application tier: it handles UI, auth (Clerk), tenant resolution, server actions, and the streaming chat API. It calls OpenAI for embeddings and chat, and the database for persistence and vector search.
- **Clerk** provides identity and organization membership; the app uses `auth().userId` and `auth().orgId` as the source of truth for “who” and “which workspace.”
- **PostgreSQL** holds all persistent data; pgvector stores embedding vectors and supports cosine similarity search.

---

## 4. High-level architecture

### 4.1 Layered view

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  Presentation layer                                                               │
│  App Router (layouts, pages), React components (ChatLayout, ChatPanel,            │
│  DocumentList, etc.), Clerk UI (SignIn, CreateOrganization, OrganizationSwitcher)│
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│  Application / orchestration layer                                               │
│  Server Actions (session, documents, chat), API route (POST /api/chat),          │
│  tenant helpers (getOrganizationId, requireOrganizationId)                       │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
                    ┌───────────────────┼───────────────────┐
                    ▼                   ▼                   ▼
┌───────────────────────┐ ┌───────────────────────┐ ┌───────────────────────┐
│  AI layer              │ │  Data access layer    │ │  Config / env         │
│  embeddings, retrieval,│ │  Prisma (CRUD),        │ │  env.ts, rag.ts       │
│  chat (RAG + stream)   │ │  vectors (raw SQL)     │ │                       │
└───────────────────────┘ └───────────────────────┘ └───────────────────────┘
                    │                   │
                    ▼                   ▼
┌───────────────────────┐ ┌───────────────────────┐
│  OpenAI               │ │  PostgreSQL + pgvector│
└───────────────────────┘ └───────────────────────┘
```

- **Presentation:** Next.js App Router and React; no business logic or secrets.
- **Application:** Server actions and the chat API route; they enforce auth, resolve tenant, validate input, and coordinate AI and DB.
- **AI layer:** Embeddings, retrieval (with tenant and optional tag filter), and RAG generation (one-shot and stream). No UI or HTTP.
- **Data access:** Prisma for all CRUD; a dedicated vectors module for similarity search (raw SQL) so pgvector operators and tenant filters are applied in one place.
- **Config:** Centralized env and RAG/chunk/upload/tag constants to avoid magic numbers and to keep tuning in one place.

### 4.2 Multi-tenancy model

- **Tenant identifier:** `organizationId` = Clerk Organization id (e.g. `org_xxx`). Obtained from `auth().orgId` on every request where the app shell or an action runs.
- **Tenant boundary:** All data that must be isolated is either:
  - **Document** and its **Embedding** rows (Document has `organizationId`; Embedding is tied to Document), or
  - **ChatSession** and its **Message** rows (ChatSession has `organizationId`).
- **User model:** **User** is global (one row per Clerk user). A user can belong to multiple organizations; the “current” org is determined by Clerk’s active organization (e.g. OrganizationSwitcher). No `organizationId` on User.
- **Enforcement:** Before any document or session read/write, the app calls `requireOrganizationId()` (or equivalent) and passes `organizationId` into queries and into retrieval. Vector search always restricts by `d.organizationId` in SQL.

---

## 5. Component breakdown

### 5.1 Route and layout structure

| Route / segment | Purpose | Auth / tenant |
|-----------------|--------|----------------|
| `/` | Public landing; redirect signed-in users to `/chat`. | Public. |
| `/sign-in`, `/sign-up` | Clerk auth. | Public. |
| `/workspace` | Create or join organization (Clerk CreateOrganization). Redirect to `/chat` after create/select. | Signed-in; no org required. |
| `/(app)/*` | App shell: chat, documents, analytics. | Signed-in; `checkInternalAccess` (optional domain allowlist); **require org** or redirect to `/workspace`. |
| `/(app)/chat` | New chat; loads tags, renders ChatPanel. | App shell. |
| `/(app)/chat/[id]` | Existing thread; loads session (with org check) and messages. | App shell. |
| `/(app)/documents` | List documents, upload form, document list (search/filter/sort, delete, reingest). | App shell. |
| `/(app)/analytics` | Workspace-level counts (messages, documents, embeddings, feedback). | App shell. |
| `POST /api/chat` | Streaming RAG response; creates session if needed; persists user and assistant messages; returns stream and `X-Session-Id`. | Signed-in; require org; session ownership checked when reusing `sessionId`. |

### 5.2 Server actions and API

| Module / entry | Responsibility | Tenant handling |
|----------------|----------------|-----------------|
| **session.ts** | getOrCreateUserByClerk, getChatSessions(userId, organizationId), getChatSession(id, clerkId, organizationId), updateSessionTitle, deleteChatSession, checkInternalAccess(clerkId), getAnalyticsCounts(organizationId). | All session and analytics operations take or verify `organizationId`. |
| **documents.ts** | uploadDocument (chunk, embed, store with org), listDocuments, getDocumentTags, deleteDocument, reingestDocument. | Every operation uses `requireOrganizationId()` and filters or sets `organizationId`. |
| **chat.ts** | sendMessage (validate, create session with org, RAG, persist both messages), submitMessageFeedback (with org and ownership checks). | requireOrganizationId; session created with org; feedback checks message.session.organizationId. |
| **POST /api/chat** | Validate body (sendMessageSchema); resolve user and org; create session if needed; stream via generateRagResponseStream(organizationId, tagFilter, onRetrieval); persist assistant message. | organizationId required; session and retrieval are org-scoped. |

### 5.3 AI pipeline

| Component | Inputs | Outputs | Tenant |
|-----------|--------|---------|--------|
| **embeddings.ts** | embedText(text), embedTexts(texts). | Vector(s); dimension from RAG_CONFIG. | None (stateless). |
| **retrieval.ts** | retrieveContext(query, topK, { organizationId, tagFilter? }). | { chunks, context } (chunks + concatenated text). | Restricts document ids by org (and tag); passes organizationId to vector search. |
| **db/vectors.ts** | findSimilarChunks(queryEmbedding, topK, organizationId, filterDocumentIds?). | SimilarChunk[] (id, documentId, documentTitle, chunkIndex, chunkText, similarity). | Raw SQL always includes `AND d."organizationId" = $orgId`. |
| **chat.ts** | generateRagResponse(message, { organizationId, topK?, tagFilter? }); generateRagResponseStream(message, options with organizationId). | Full reply or stream of deltas; optional onRetrieval(chunks) for citations. | organizationId passed into retrieveContext so retrieval is tenant-scoped. |

### 5.4 Configuration and env

- **env.ts:** DATABASE_URL, OPENAI_API_KEY, Clerk keys (optional), ALLOWED_EMAIL_DOMAINS (optional allowlist by domain).
- **rag.ts:** RAG_CONFIG (models, dimensions, topK, minSimilarity, fallbackChunkCount), CHUNK_CONFIG, UPLOAD_CONFIG, TAG_CONFIG.
- **tenant.ts:** getOrganizationId(), requireOrganizationId(); used by layout and all tenant-scoped actions/API.

---

## 6. Data model

### 6.1 Entity relationship (conceptual)

```
User (1) ─────────────── (*) ChatSession
  │                           │
  │ clerkId (Clerk)           │ organizationId (tenant)
  │                           │ userId (nullable)
  │                           │
  │                           │ (1) ───── (*) Message
  │
  │ (no direct link to Document)
  │
Document (*) ───────────── (*) Embedding
  │ organizationId              │ documentId (FK CASCADE)
  │ title, content, tags       │ chunkText, embedding (vector)
```

- **User:** Maps Clerk identity to an internal id; used to own ChatSessions. Not tenant-scoped.
- **Document:** Belongs to one tenant (`organizationId`). Has many Embeddings (chunks with vectors).
- **Embedding:** Stored with raw SQL for the vector column; Prisma models the rest. Search is always filtered by Document.organizationId.
- **ChatSession:** Belongs to one tenant (`organizationId`) and optionally to one User. Has many Messages.
- **Message:** Role, content, optional sources (citations), optional feedback. Scoped by session (hence by org).

### 6.2 Indexes and access patterns

- **Document:** organizationId, (organizationId, createdAt); list and filter by org and time.
- **ChatSession:** organizationId, (organizationId, userId), (organizationId, updatedAt); list “my chats in this org” and sort by updated.
- **Embedding:** documentId; vector index (HNSW) for similarity search; tenant filter applied via JOIN on Document.organizationId.

---

## 7. Key flows

### 7.1 User and workspace lifecycle

1. User lands on `/` or goes to `/sign-in` / `/sign-up`.
2. After sign-in, Clerk redirects (e.g. to `/chat`). App layout under `(app)` runs: if no `orgId`, redirect to `/workspace`.
3. On `/workspace`, user creates or selects an organization (Clerk). After create/select, redirect to `/chat`.
4. Subsequent requests in `(app)` have `auth().orgId` set; layout loads sessions for current user and org and renders ChatLayout with OrganizationSwitcher. User can switch org; each org sees only its own documents and chats.

### 7.2 RAG chat (streaming) flow

1. Client POSTs to `/api/chat` with `{ content, sessionId?, tagFilter? }`. Session id is optional (new thread vs continue).
2. Server: validate (sendMessageSchema); require auth and organizationId; getOrCreateUserByClerk; if sessionId, getChatSession(id, clerkId, organizationId) and reject if not found or wrong org.
3. If no sessionId, create ChatSession with organizationId and userId; persist user Message.
4. generateRagResponseStream(content, { organizationId, tagFilter, onRetrieval }):
   - retrieveContext(query, topK, { organizationId, tagFilter }) → embed query; optionally get document ids by org + tag; findSimilarChunks(embedding, topK, organizationId, filterDocumentIds); filter by minSimilarity / fallback; build context string.
   - onRetrieval(chunks) used to collect sources for the assistant message.
   - Build system prompt with context; stream OpenAI chat completion; yield deltas.
5. After stream ends: persist assistant Message (with sources from onRetrieval); update ChatSession.updatedAt; close stream; response includes `X-Session-Id`.
6. Client consumes stream, shows message and citations; can navigate to `/chat/[sessionId]`.

### 7.3 Document upload and retrieval

1. **Upload:** User submits file + optional tags. uploadDocument: requireOrganizationId; validate file type/size; extract text (unpdf/UTF-8); chunkText; embedTexts; create Document with organizationId; insert Embedding rows (raw SQL for vector). Return documentId and chunk count.
2. **Retrieval (during RAG):** retrieveContext receives organizationId; tag filter (if any) resolves document ids in that org; findSimilarChunks runs raw SQL with `WHERE d."organizationId" = $orgId` (and optional document id list). Only that workspace’s chunks participate in similarity search.

---

## 8. Cross-cutting concerns

### 8.1 Security

- **Secrets:** Only on server; read via config (env.ts). Client never receives OpenAI or DB credentials.
- **Auth:** Clerk middleware protects all non-public routes; API returns 401 when unauthenticated. App layout enforces optional domain allowlist (ALLOWED_EMAIL_DOMAINS) and required org.
- **Tenant isolation:** Every document and session operation and every vector query is scoped by organizationId derived from auth().orgId. No cross-tenant reads or writes.
- **Input validation:** Zod schemas for chat body, document id, message id, feedback. File type and size enforced on upload. Parameterized SQL; no string interpolation of user input.

### 8.2 Error handling and validation

- Server actions return `{ success, error? }` (or field errors). API returns appropriate HTTP status and JSON errors. Centralized user-facing copy in lib/errors.ts.
- Validation failures (Zod) result in 400 or structured error response; missing auth/org in 401/403.

### 8.3 Observability and operations

- No dedicated APM in this doc; logging is ad hoc (e.g. console.error in catch blocks). Production checklist recommends verifying env, DB migrations, and smoke tests. Analytics page exposes workspace-level counts (messages, documents, embeddings, feedback).

---

## 9. Deployment view

- **Application:** Next.js on Vercel (or similar); serverless functions for API and server components/actions. Build: `prisma generate && next build`; postinstall can run `prisma generate`.
- **Database:** PostgreSQL (Neon) with pgvector extension; migrations applied via `prisma migrate deploy`. Connection via Prisma with adapter (e.g. PrismaPg) and DATABASE_URL.
- **External services:** OpenAI (embeddings + chat); Clerk (auth and organizations). No on-prem components.

---

## 10. Design decisions and trade-offs

| Decision | Rationale | Trade-off |
|----------|-----------|-----------|
| **Clerk Organizations as tenant** | Reuse existing auth and org model; no custom org CRUD; org id is stable and available in every request. | Coupling to Clerk; org lifecycle and limits are governed by Clerk. |
| **organizationId on Document and ChatSession only** | Minimal schema change; User stays global so one user can belong to many orgs; Embedding and Message are isolated via Document and ChatSession. | Backfill and default (`org_legacy`) required for existing data. |
| **Vector search in raw SQL** | Prisma does not model pgvector; full control over similarity operator and tenant filter in one place. | Bypasses Prisma type-safety for that query; must keep SQL in sync with schema. |
| **Streaming only via API route** | Chat UI needs a stream and a session id header; Server Actions are not ideal for long-lived streams. | Two entry points for “send message” (action for non-streaming path if any; API for main UX). |
| **Single Prisma client singleton** | Avoid connection exhaustion in serverless; reuse across requests in dev. | Global state; must be careful with multiple DBs or test fixtures. |
| **Centralized RAG and upload config** | One place to tune models, topK, chunk size, similarity, limits. | Changes require code/config deploy; no runtime feature flags in this design. |

---

## 11. References

- [ARCHITECTURE.md](./ARCHITECTURE.md) — Original high-level architecture and RAG pipeline (pre–multi-tenant).
- [MULTI_TENANT_SAAS.md](./MULTI_TENANT_SAAS.md) — Multi-tenant design and implementation plan.
- [CLERK_MULTI_TENANT_SETUP.md](./CLERK_MULTI_TENANT_SETUP.md) — Clerk configuration for organizations.
- [API.md](./API.md) — Server actions and types.
- [CONFIGURATION.md](./CONFIGURATION.md) — Env and RAG/config options.
- [PRODUCTION_CHECKLIST.md](./PRODUCTION_CHECKLIST.md) — Security, validation, and pre-deploy verification.
