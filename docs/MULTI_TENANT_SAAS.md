# Multi-Tenant SaaS: Architecture Analysis & Implementation Plan

This document analyzes the current app architecture and describes how to turn it into a **multi-tenant SaaS**: any company or individual can sign up, get an isolated workspace (knowledge base + chats), and manage members (Admins vs Members) within that workspace.

---

## 1. Current Architecture Summary

### 1.1 Data model (Prisma)

| Model       | Purpose                    | Tenant / isolation today |
|------------|----------------------------|---------------------------|
| **User**   | Links Clerk user to app    | Global (one row per Clerk user). |
| **Document** | Knowledge base content   | **None** – shared across all users. |
| **Embedding** | Vector chunks for RAG   | Scoped by Document (no tenant). |
| **ChatSession** | Conversation container  | Scoped by **userId** (optional). |
| **Message** | Chat messages            | Scoped by ChatSession (no direct tenant). |

- **Documents** are global: `listDocuments()` returns every document; upload/delete apply to this single shared set. RAG retrieval searches over all documents.
- **Chat sessions** are per-user: `getChatSessions(userId)` and session ownership checks use `userId` only. No concept of “workspace” or “organization.”
- **Analytics** (`getAnalyticsCounts`) count all messages, documents, embeddings, feedback globally.

### 1.2 Auth & access

- **Clerk**: Sign-in/sign-up; `auth()` gives `userId` (and optionally `orgId`, `orgRole` if Organizations are used).
- **Optional allowlist**: `ALLOWED_EMAIL_DOMAINS` restricts access to certain email domains (single-tenant / internal use).
- **No tenant concept**: No `organizationId` or `tenantId` in schema or in any query.

### 1.3 Where data is read/written

| Layer            | Documents | ChatSession | Message | Notes |
|------------------|-----------|-------------|---------|--------|
| **session.ts**   | —         | findMany, findUnique, update, delete | count | Sessions by userId; analytics global. |
| **documents.ts** | create, findMany, findUnique, delete, update | — | — | All doc queries unscoped. |
| **chat.ts** (actions) | — | create, update | create, findUnique, update | Session by userId. |
| **api/chat/route.ts** | — | create, getChatSession, update | create | Same. |
| **retrieval.ts** | findMany (for tag filter) | — | — | Doc IDs for filter only. |
| **db/vectors.ts** | — (raw SQL over Embedding + Document) | — | — | Search all embeddings/documents. |

Conclusion: **multi-tenancy is not present today**. To support it we must introduce a **tenant boundary** and scope every document and session (and thus messages and retrieval) by that tenant.

---

## 2. Is Multi-Tenancy Possible? Yes.

Multi-tenant SaaS is **possible and fits the current stack** with:

1. **Clerk Organizations as the tenant boundary** – one Clerk Organization = one workspace (company or team). Use `auth().orgId` as the tenant id; no separate “tenant” table required if we only need isolation and optional org metadata from Clerk.
2. **Schema changes** – add a tenant/organization id to `Document` and `ChatSession`; keep `User` global (one Clerk user can belong to many orgs).
3. **Query and API changes** – every document and session query (and retrieval) filters by the current org id; create operations set it from `auth().orgId`.
4. **Auth and onboarding** – require an active organization (or a “personal” workspace implemented as a special org). Remove or make optional the domain allowlist for open SaaS signup. Use Clerk’s org roles (e.g. Admin / Member) for “who can manage KB” inside each tenant.

No change to embedding model or vector search algorithm; only to **which** documents are visible and which are searched.

---

## 3. Recommended Design: Clerk Organizations as Tenant

### 3.1 Tenant = Clerk Organization

- **Tenant id** = Clerk Organization id (e.g. `org_xxx`). Stored as `organizationId` in our DB.
- **Per-tenant data**: Documents and ChatSessions (and thus Messages and Embeddings via Document) belong to one organization.
- **Users**: Same Clerk user can be in multiple orgs (e.g. “Acme Corp” and “Side project”). Current org = `auth().orgId`; switching org in Clerk changes the “workspace” and thus the data shown.
- **Roles inside a tenant**: Use your existing Clerk Default role set (e.g. `org:admin`, `org:member`). Admins can manage KB; Members can only chat and view. Optional and can be added after multi-tenancy.

### 3.2 “Personal” workspace for individuals

Two options:

- **A) Require an organization for everyone**  
  User must create or join an org (Clerk “Create organization” or “Join organization”). No “personal” mode; even solo users have one org (e.g. “John’s workspace”). Simplest.

- **B) Personal workspace when not in an org**  
  If `auth().orgId` is null, treat the user as in a “personal” tenant. You must still isolate data: e.g. synthetic tenant id `personal_<userId>` and store that in `organizationId`. All flows (create session/document, list, retrieval) use this id when there is no org. Slightly more logic; same schema.

Recommendation: **Start with A** (require org). Add B later if you want true “no org” usage.

### 3.3 Schema changes (minimal)

Add **one column** to two models:

```prisma
model Document {
  id              String      @id @default(cuid())
  organizationId  String      // Clerk org id (tenant)
  title           String
  content         String      @db.Text
  // ... rest unchanged
  @@index([organizationId])
  @@index([organizationId, createdAt])
}

model ChatSession {
  id              String    @id @default(cuid())
  organizationId  String    // Clerk org id (tenant)
  userId         String?
  // ... rest unchanged
  @@index([organizationId])
  @@index([organizationId, userId])
  @@index([organizationId, updatedAt])
}
```

- **User**: unchanged (global; no `organizationId`).
- **Message**: unchanged (scoped by session).
- **Embedding**: unchanged (scoped by document).

Migration and backfill:

- Add `organizationId` (nullable first if you have existing data).
- Backfill: assign all existing rows to a single “legacy” org id (e.g. create one Clerk org and use its id, or use a constant like `org_legacy` and document that it’s for pre-migration data).
- Then alter column to `NOT NULL` if desired.

### 3.4 Config and auth flow

- **ALLOWED_EMAIL_DOMAINS**: For open SaaS, remove the check or make it optional (e.g. only apply when set). When unset, any signed-in user can use the app after they have an org.
- **App layout / middleware**: After sign-in, require an active org:
  - If `auth().orgId` is set → proceed; pass `organizationId` into data layer.
  - If not set → redirect to “Create or join a workspace” (Clerk’s organization creation or a custom page that calls Clerk’s createOrganization).
- **Clerk**: Enable **Organizations**. Optionally use **OrganizationSwitcher** so users in multiple orgs can switch. No need to store org list in our DB unless you want a cache (name, etc.).

### 3.5 Data layer: “current tenant” and scoping

- **Get current tenant**: e.g. `getOrganizationId(): Promise<string | null>` that returns `auth().orgId` or null. In app layout, if null, redirect to create/join org (or to personal-workspace flow if you implement B).
- **All document operations**:
  - **Create**: set `organizationId` from `getOrganizationId()` (required).
  - **Read/List/Delete/Update**: add `where: { organizationId }` (and keep existing filters like document id, tags, etc.).
- **All session operations**:
  - **Create**: set `organizationId` from `getOrganizationId()`.
  - **List**: `getChatSessions(userId, organizationId)` with `where: { userId, organizationId }`.
  - **Get one / Update / Delete**: load session, then verify `session.organizationId === current organizationId` (and existing ownership checks).
- **Retrieval (RAG)**:
  - **Tag filter**: in `retrieval.ts`, when resolving document ids by tag, add `where: { organizationId, tags: { has: ... } }`.
  - **Vector search**: either (1) pass only document ids that belong to the current org (already done when using tag filter), or (2) add `AND d."organizationId" = $currentOrgId` to the raw SQL in `findSimilarChunks` and always pass `organizationId` into it. Option 2 is safer (no accidental cross-tenant search).
- **Analytics**: `getAnalyticsCounts(organizationId)` – count messages/sessions/documents/feedback where `organizationId` (and for messages, via session) matches.

### 3.6 Where to pass `organizationId`

| File / layer            | Change |
|-------------------------|--------|
| **App layout**          | Call `getOrganizationId()`; if null, redirect to create/join org. Pass `organizationId` to layout children or a small context if needed (or re-read in each server action/route). |
| **session.ts**          | `getChatSessions(userId, organizationId)`, `getChatSession(id, clerkId, organizationId)`, update/delete session with org check. `getAnalyticsCounts(organizationId)`. |
| **documents.ts**        | All document queries and creates take/use `organizationId`. |
| **api/chat/route.ts**   | Get `organizationId` from auth; create session with it; pass org into `getChatSession` and into retrieval (so RAG is tenant-scoped). |
| **actions/chat.ts**     | Same: require org, pass into session create and into any retrieval. |
| **retrieval.ts**        | Accept `organizationId`; tag-filter doc query and vector search filter by org. |
| **db/vectors.ts**       | `findSimilarChunks(..., organizationId?)` and add `WHERE d."organizationId" = $orgId` (and keep `filterDocumentIds` logic if you still use it). |

### 3.7 Admin vs Member (optional, after multi-tenancy)

- Use Clerk’s org roles (e.g. `org:admin`, `org:member`) from `auth().orgRole`.
- **Admins**: can upload/delete/reingest documents in that org.
- **Members**: can only chat and view documents in that org.
- Enforce in document upload/delete/reingest actions by checking `orgRole === 'org:admin'` (or your configured admin role key).

---

## 4. Implementation Phases

### Phase 1: Schema and migration

1. Add `organizationId` to `Document` and `ChatSession` (nullable for migration).
2. Create and run migration.
3. Backfill existing rows with a default org id (e.g. `org_legacy` or first created Clerk org).
4. If desired, add NOT NULL and drop default handling.

### Phase 2: Tenant context and auth

1. Add `getOrganizationId()` (and optionally “require org” helper that redirects if null).
2. In app layout: require org; redirect to “create/join workspace” when missing.
3. Add Clerk Organization creation/selection UI (or use Clerk’s components).
4. Remove or relax `ALLOWED_EMAIL_DOMAINS` for SaaS; keep `checkInternalAccess` only when allowlist is set.

### Phase 3: Scope all data by org

1. **Documents**: Update `documents.ts` (list, create, getTags, delete, reingest) to take and filter by `organizationId`.
2. **Sessions and messages**: Update `session.ts` and chat API/actions to pass and filter by `organizationId`; verify org on get/update/delete.
3. **Retrieval**: Update `retrieval.ts` and `db/vectors.ts` to restrict by `organizationId` (tag filter + vector search).
4. **Analytics**: Scope counts by `organizationId`.

### Phase 4: UI and polish

1. Show current org name in header (from Clerk or cache).
2. Add OrganizationSwitcher if you support multiple orgs per user.
3. Optional: re-enforce org roles (Admin/Member) for KB management.

### Phase 5: Documentation and ops

1. Update CONFIGURATION.md and PRODUCTION_CHECKLIST.md for multi-tenant and org requirement.
2. Document migration path for existing deployments (backfill strategy).
3. Document Clerk setup: Organizations enabled, create/join flow, optional roles.

---

## 5. Risks and Considerations

- **Existing data**: Backfill must assign a valid org id; define policy for “legacy” org (e.g. one shared org for pre-migration data).
- **Performance**: Index `organizationId` (and composite indexes for common queries) so tenant-scoped queries stay fast.
- **Vector search**: Ensure raw SQL in `findSimilarChunks` always restricts by `organizationId` so one tenant never sees another’s documents.
- **Clerk limits**: Check Organizations pricing and limits (members per org, orgs per app) for your plan.
- **Switching org**: Re-read `auth().orgId` on every request; no server-side cache of “current org” per user (Clerk handles active org in the session).

**Clerk configuration:** See [CLERK_MULTI_TENANT_SETUP.md](./CLERK_MULTI_TENANT_SETUP.md) for step-by-step Clerk Dashboard setup (enable Organizations, URLs, optional roles).

---

## 6. Summary

| Question | Answer |
|----------|--------|
| Is multi-tenant SaaS possible with the current stack? | **Yes.** |
| Recommended tenant model? | **Clerk Organization = tenant.** One org id stored on Document and ChatSession; all queries and RAG scoped by it. |
| Schema change? | Add **`organizationId`** to Document and ChatSession; backfill; index it. |
| Auth change? | Require an active org (or implement “personal” tenant); remove or make optional domain allowlist for open signup. |
| Scope of code changes? | All document and session CRUD, retrieval (tag + vector), and analytics; app layout and chat API/actions. |
| Admin/Member? | Optional; implement after multi-tenancy using Clerk org roles (`org:admin` / `org:member`). |

This gives you a clear path from the current single-tenant/internal app to a multi-tenant SaaS where each company/team has its own knowledge base and chats, with optional per-tenant roles.

---

## 7. File-by-File Implementation Checklist

Use this as a checklist when implementing; order follows the phases above.

### Schema & DB

| File | Change |
|------|--------|
| `prisma/schema.prisma` | Add `organizationId String` (+ indexes) to `Document` and `ChatSession`. |
| New migration | Add columns (nullable first), backfill, then NOT NULL if desired. |

### Tenant context & auth

| File | Change |
|------|--------|
| `src/lib/tenant.ts` (new) | Add `getOrganizationId(): Promise<string | null>`, `requireOrganizationId(): Promise<string>` (redirect or throw if null). |
| `src/app/(app)/layout.tsx` | Call `requireOrganizationId()` (or get org id and redirect if null to `/create-workspace` or similar). Pass org id to children or rely on reading in each action. |
| `src/actions/session.ts` | `checkInternalAccess`: when going SaaS, skip or relax domain check when `ALLOWED_EMAIL_DOMAINS` is unset. Optional: still enforce when set. |

### Documents (all scoped by org)

| File | Change |
|------|--------|
| `src/actions/documents.ts` | `uploadDocument`: get org id, set `organizationId` on create. `listDocuments`: add `where: { organizationId }`. `getDocumentTags`: same. `deleteDocument`: verify doc’s `organizationId` matches current. `reingestDocument`: same. All need `organizationId` param or read from auth. |

### Sessions & chat (all scoped by org)

| File | Change |
|------|--------|
| `src/actions/session.ts` | `getChatSessions(userId, organizationId)`: add `where: { organizationId }`. `getChatSession`: add org id param, verify `session.organizationId === current`. `updateSessionTitle`, `deleteChatSession`: verify session org. `getAnalyticsCounts(organizationId)`: count only sessions/documents/messages for that org. |
| `src/app/api/chat/route.ts` | Get org id from auth; create session with `organizationId`; pass org to `getChatSession`; pass org to retrieval so RAG is tenant-scoped. |
| `src/actions/chat.ts` | Same: require org; create session with `organizationId`; pass org into session and retrieval. |

### Retrieval (RAG) and vectors

| File | Change |
|------|--------|
| `src/ai/retrieval.ts` | `retrieveContext`: accept `organizationId`; when fetching doc ids by tag, add `where: { organizationId }`; pass org to `findSimilarChunks`. |
| `src/db/vectors.ts` | `findSimilarChunks`: add param `organizationId: string`; in raw SQL add `AND d."organizationId" = $orgId` (and keep `filterDocumentIds` logic if used). |
| `src/ai/chat.ts` | Pass `organizationId` from caller into `retrieveContext` (via options). |

### UI and Clerk

| File | Change |
|------|--------|
| New page or Clerk | “Create or join workspace” when `orgId` is null (e.g. `/create-workspace` that uses Clerk’s createOrganization or redirects to Clerk). |
| Header / layout | Optionally show current org name and OrganizationSwitcher (Clerk component). |

### Config and docs

| File | Change |
|------|--------|
| `docs/CONFIGURATION.md` | Document multi-tenant mode, Clerk Organizations, optional `ALLOWED_EMAIL_DOMAINS` for restricted signup. |
| `docs/PRODUCTION_CHECKLIST.md` | Add row for tenant isolation (all queries scoped by org); document backfill and migration. |
