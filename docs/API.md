# API Reference

This document describes the server-side API surface: Server Actions, validation schemas, and types. There are no public REST API routes; all server entry points are Next.js Server Actions.

---

## Server Actions

### Chat

#### `sendMessage(formData: FormData)`

Processes a user message: validates input, creates or reuses a chat session, runs RAG, persists messages, and returns the assistant reply.

**Location:** `src/actions/chat.ts`

**Form fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `content` | string | Yes | User message. 1–4000 characters (validated by Zod). |
| `sessionId` | string (CUID) | No | Existing chat session id. If empty or omitted, a new session is created. |

**Returns:**

```ts
type SendMessageResult =
  | {
      success: true;
      sessionId: string;
      message: string;
      error?: undefined;
    }
  | {
      success: false;
      error: { content?: string[] };
      sessionId?: undefined;
      message?: undefined;
    };
```

- **On success**: `message` is the assistant’s reply; `sessionId` is the session (new or existing). Client can redirect to `/chat/[sessionId]` and call `router.refresh()`.
- **On validation failure**: `error` contains field errors (e.g. `error.content`).
- **On server error**: `success: false`, `error.content` with a generic message (see `ERROR_MESSAGES.chat.generic`).

**Example (client):**

```tsx
const [state, formAction] = useActionState(async (_, formData) => sendMessage(formData), null);
// Form: <form action={formAction}> with input name="content" and input name="sessionId" (optional)
```

---

### Documents

#### `uploadDocument(formData: FormData)`

Uploads a single file (PDF or TXT) to the knowledge base: extracts text, chunks, generates embeddings, stores Document and Embedding rows.

**Location:** `src/actions/documents.ts`

**Form fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | File | Yes | PDF or TXT; max size from `UPLOAD_CONFIG.maxFileSizeBytes` (default 10 MB). |

**Returns:**

```ts
type UploadResult =
  | {
      success: true;
      documentId: string;
      title: string;
      chunks: number;
    }
  | {
      success: false;
      error: string;
    };
```

- **On success**: `documentId` (Prisma Document id), `title` (derived from filename), `chunks` (number of embedding rows).
- **On failure**: `error` is a user-facing string (e.g. file too large, unsupported type, no text).

**Example (client):**

```tsx
const [state, formAction] = useActionState(async (_, formData) => uploadDocument(formData), null);
// Form: <form action={formAction}> with <input type="file" name="file" accept=".pdf,.txt" />
```

---

### Session

#### `getOrCreateUserByClerk(clerkId: string)`

Ensures an internal `User` row exists for the given Clerk user id; creates one if missing. Used to link chat sessions to users.

**Location:** `src/actions/session.ts`

**Returns:** `Promise<User>` (Prisma User model). Never returns null; creates a user if needed.

---

#### `getChatSessions(userId: string | null)`

Lists chat sessions for a user. For anonymous users (`userId === null`) returns an empty array.

**Location:** `src/actions/session.ts`

**Returns:** `Promise<ChatSession[]>` with `messages: { take: 1 }` for preview. Ordered by `updatedAt` descending.

---

#### `getChatSession(sessionId: string, clerkIdOrUserId: string | null)`

Fetches a single chat session with all messages. Respects ownership: anonymous sessions are visible to anyone; sessions with a userId are visible only to that user (resolved from Clerk id or internal User id).

**Location:** `src/actions/session.ts`

**Returns:** `Promise<ChatSession | null>`. Null if not found or not allowed.

---

## Validation schemas

Defined in `src/lib/validations.ts`. Used by actions to parse and validate input.

### sendMessageSchema

```ts
z.object({
  content: z.string().min(1, "Message cannot be empty").max(4000, "Message too long"),
  sessionId: z.preprocess(
    (val) => (val === "" || val == null ? undefined : val),
    z.cuid().optional()
  ),
});
```

- **content**: Non-empty, max 4000 characters.
- **sessionId**: Optional CUID; empty string is coerced to `undefined`.

**Inferred type:** `SendMessageInput` (exported).

### createSessionSchema

```ts
z.object({
  title: z.string().max(200).optional(),
});
```

**Inferred type:** `CreateSessionInput` (exported).

---

## Types (exported)

- **SendMessageInput** — Parsed shape for `sendMessage` (content, sessionId?).
- **CreateSessionInput** — Parsed shape for session creation (title?).
- **UploadResult** — Success/failure union for `uploadDocument` (see above).
- **ChatSessionItem** — `{ id: string; title: string }` for sidebar (from `src/components/chat/app-sidebar.tsx`).
- **SimilarChunk** — `{ id, documentId, chunkIndex, chunkText, similarity }` from `src/db/vectors.ts`.
- **RetrievalResult** — `{ chunks: SimilarChunk[]; context: string }` from `src/ai/retrieval.ts`.

---

## AI layer (internal)

These are used by actions, not by the client directly.

- **embedText(text: string): Promise<number[]>** — Single embedding vector.
- **embedTexts(texts: string[]): Promise<number[][]>** — Batch embeddings.
- **retrieveContext(query: string, topK?: number): Promise<RetrievalResult>** — Embed query, vector search, format context.
- **generateRagResponse(userMessage: string, options?: { topK?: number }): Promise<string>** — Full RAG: retrieve + chat completion.

All live under `src/ai/` and use `config/env.ts` and `config/rag.ts`.

---

## Database access

- **Prisma client:** `import { prisma } from "@/db";` — Use for all CRUD on User, Document, ChatSession, Message, and Embedding (non-vector columns).
- **Vector search:** `import { findSimilarChunks } from "@/db/vectors";` — Raw SQL for similarity search; expects an embedding array and returns `SimilarChunk[]`.

Embedding rows are inserted via `prisma.$executeRawUnsafe` in the upload action and ingest script because the `embedding` column is not on the Prisma schema (it’s added in the migration).

---

## Error messages

User-facing strings are in `src/lib/errors.ts`:

- **ERROR_MESSAGES.chat** — generic, emptyMessage, messageTooLong.
- **ERROR_MESSAGES.upload** — noFile, fileTooLarge(maxMb), unsupportedType, noText, noChunks.

Actions return these (or Zod field errors) on failure; no stack traces or internal details are exposed to the client.
