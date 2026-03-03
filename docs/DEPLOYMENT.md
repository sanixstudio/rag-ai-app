# Deployment Guide

How to deploy the RAG AI Chatbot to production (Vercel + Neon + Clerk) and what to check before and after.

---

## Overview

- **App**: Next.js on [Vercel](https://vercel.com).
- **Database**: [Neon](https://neon.tech) PostgreSQL with pgvector.
- **Auth**: [Clerk](https://clerk.com) (optional but recommended for persisted chat history).

All secrets and config are provided via environment variables.

---

## Pre-deployment checklist

- [ ] **Code**: `npm run build` and `npm run typecheck` pass.
- [ ] **Lint**: `npm run lint` passes.
- [ ] **Env**: You have production values for `DATABASE_URL`, `OPENAI_API_KEY`, and (if using auth) Clerk keys.
- [ ] **DB**: Production Neon project created; connection string includes `?sslmode=require`.
- [ ] **Clerk**: Application created; you have publishable and secret keys and will set redirect URLs for the production domain.

---

## 1. Vercel

1. Import the repo (GitHub/GitLab/Bitbucket) into Vercel.
2. Set the **Root Directory** if the app is not at the repo root (leave blank if it is).
3. **Build command**: `npm run build` (default).
4. **Output**: Next.js is auto-detected; no override needed.
5. **Node version**: 20.x (set in Vercel project settings or `.nvmrc` if you use it).

### Environment variables (Vercel)

Add these in **Project → Settings → Environment Variables**. Prefer **Production** (and optionally **Preview** if you use preview deployments).

| Name | Value | Notes |
|------|--------|--------|
| `DATABASE_URL` | Neon connection string | Use the production Neon DB URL; include `?sslmode=require`. |
| `OPENAI_API_KEY` | Your OpenAI key | Server-only; never exposed to client. |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key | Safe to expose; used by client. |
| `CLERK_SECRET_KEY` | Clerk secret key | Server-only. |

Optional Clerk redirects (if you need custom URLs):

- `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL` — e.g. `https://your-app.vercel.app`
- `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL` — same or a welcome path

Redeploy after changing env vars (or rely on automatic redeploy if linked to git).

---

## 2. Neon

1. Create a **project** in the [Neon console](https://console.neon.tech).
2. Create a **database** (or use the default).
3. Copy the **connection string** from the dashboard (Connection details). It should look like:
   `postgresql://user:password@ep-xxx.region.aws.neon.tech/neondb?sslmode=require`
4. Use this as `DATABASE_URL` in Vercel.
5. **pgvector**: Neon supports it; the app’s migration runs `CREATE EXTENSION IF NOT EXISTS vector` and creates the `embedding` column. No extra Neon setup needed.

For preview branches you can use a separate Neon branch or the same DB; set the appropriate `DATABASE_URL` in Vercel for Preview if different.

---

## 3. Run migrations

Migrations must be run against the **production** database before the app expects the schema.

**Option A — From your machine (one-time):**

```bash
# Set production DATABASE_URL in .env (or .env.production) then:
npm run db:migrate
```

**Option B — From CI (e.g. GitHub Actions):**

- Add a job that runs after deploy (or before) with `DATABASE_URL` from secrets.
- Run: `npm run db:generate && npm run db:migrate`.

Do **not** run `prisma db push` in production if you use migrations; use `db:migrate` so history stays consistent.

---

## 4. Clerk

1. In [Clerk Dashboard](https://dashboard.clerk.com) → your application → **Paths** / **URLs**:
   - Add your production domain (e.g. `https://your-app.vercel.app`) to allowed origins/redirect URLs.
   - Set sign-in and sign-up redirect URLs if you use custom paths (see [CONFIGURATION.md](./CONFIGURATION.md#optional-clerk-urls)).
2. Ensure **NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY** and **CLERK_SECRET_KEY** in Vercel match the **Production** instance in Clerk.
3. If you use webhooks (e.g. user sync), add the webhook URL and subscribe to the needed events; store the signing secret in env if your app verifies signatures.

---

## 5. Post-deploy: seed knowledge base

The app does not auto-seed documents. After first deploy:

- Use the **Knowledge base** page (`/documents`) to upload PDFs/TXT, or
- Run the ingest script once against production (with production `DATABASE_URL` and `OPENAI_API_KEY`):

  ```bash
  DATABASE_URL="postgresql://..." OPENAI_API_KEY="sk-..." npm run ingest
  ```

---

## Production checklist (summary)

- [ ] Vercel env vars set: `DATABASE_URL`, `OPENAI_API_KEY`, Clerk keys (if used).
- [ ] Neon project created; connection string in `DATABASE_URL` with `?sslmode=require`.
- [ ] Migrations applied: `npm run db:migrate` against production DB.
- [ ] Clerk redirect URLs and allowed origins include your production domain.
- [ ] Knowledge base populated (upload or ingest script).
- [ ] (Recommended) Rate limiting added for chat and/or upload (e.g. Vercel KV, Upstash Redis) to avoid abuse.
- [ ] CI runs `npm run lint` and `npm run typecheck` (and optionally `npm run build`).

---

## Troubleshooting

### Build fails: “Missing required environment variable”

- Routes that use DB or OpenAI import code that calls `getDatabaseUrl()` or `getOpenAiApiKey()`. For **build**, Vercel may not have access to env if they’re not set for the build environment.
- **Fix:** Add `DATABASE_URL` and `OPENAI_API_KEY` in Vercel and enable them for **Build** (not only Runtime) if your build runs code that touches DB/OpenAI. Alternatively, ensure no server code that requires these runs at build time (e.g. only in Server Actions that run at request time).

### Runtime: “Missing required environment variable: DATABASE_URL”

- The Server Action or API path that uses Prisma is running without `DATABASE_URL`.
- **Fix:** Set `DATABASE_URL` in Vercel for Production (and Preview if you use it). Redeploy.

### Chat or upload works locally but not on Vercel

- Check Vercel function logs (Runtime Logs) for the actual error.
- Confirm env vars are set for the correct environment (Production/Preview).
- For Neon: ensure the connection string is for the right project/branch and includes `?sslmode=require`.

### “No relevant context” for every question

- No documents in the knowledge base, or retrieval too strict.
- **Fix:** Upload documents via `/documents` or run the ingest script with production env. Optionally tune `defaultTopK` and `minSimilarity` in `src/config/rag.ts` (see [CONFIGURATION.md](./CONFIGURATION.md#rag-config)).

### Clerk: redirect loop or “Invalid redirect URL”

- Production URL not allowed in Clerk.
- **Fix:** In Clerk Dashboard, add the exact production origin (e.g. `https://your-app.vercel.app`) to allowed redirect URLs and/or allowed origins.

---

## Rate limiting (recommended)

To avoid abuse of chat and upload:

1. Use a store such as **Vercel KV** or **Upstash Redis** to track requests per user or IP.
2. In middleware or inside the Server Action, check count and return an error or redirect if over limit.
3. Apply limits per action (e.g. N messages per minute per user, M uploads per hour).

Implementation details depend on your chosen store and auth (e.g. Clerk user id vs. IP for anonymous users).

---

## Security reminder

- Never commit `.env` or real keys.
- Use Vercel (and Clerk) env for production; avoid hardcoding.
- All OpenAI and DB access stays in Server Actions or server code; the client never receives API keys or raw embeddings.
- Keep dependencies updated (`npm audit`, upgrade Prisma/Next/Clerk/OpenAI as needed).
