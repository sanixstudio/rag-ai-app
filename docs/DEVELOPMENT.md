# Development

Local development workflow, scripts, and conventions.

## Scripts

| Command | Description |
|--------|-------------|
| `npm run dev` | Start Next.js dev server (default: [http://localhost:3000](http://localhost:3000)). |
| `npm run build` | Production build. |
| `npm run start` | Run production build locally (run `build` first). |
| `npm run lint` | Run Next.js ESLint. |
| `npm run typecheck` | Run `tsc --noEmit` to check types. |
| `npm run db:generate` | Generate Prisma client from schema. |
| `npm run db:migrate` | Apply migrations (uses `DATABASE_URL` from env). |
| `npm run db:push` | Push schema to DB without migration history (dev only). |
| `npm run ingest` | Run sample document ingestion (requires `DATABASE_URL`, `OPENAI_API_KEY`). |

## Workflow

1. **Env:** Copy `.env.example` to `.env` and set at least `DATABASE_URL` and `OPENAI_API_KEY` for full functionality.
2. **DB:** Run `npm run db:generate` and `npm run db:migrate` (or `db:push` for a quick dev DB).
3. **Optional:** Run `npm run ingest` to seed sample docs.
4. **Run:** `npm run dev` and open the app.
5. **Before commit:** Run `npm run lint` and `npm run typecheck`.

## Code organization

- **Server-only code** (DB, OpenAI, config env) must not be imported from client components. Keep them in `actions/`, `ai/`, `db/`, `config/` and use them only from Server Components or Server Actions.
- **Config:** Change behavior (models, limits, similarity) in `src/config/rag.ts` and env in `src/config/env.ts`.
- **Errors:** User-facing strings live in `src/lib/errors.ts`.
- **Validation:** Zod schemas in `src/lib/validations.ts`; use `.safeParse()` in actions and handle `success: false`.

## Adding a new Server Action

1. Create the function in `src/actions/` with `"use server"` at the top.
2. Validate input with Zod (or use schemas from `lib/validations.ts`).
3. Return a discriminated result (e.g. `{ success: true, ... }` or `{ success: false, error: ... }`).
4. Use `ERROR_MESSAGES` from `lib/errors.ts` for user-facing error text.
5. Call `revalidatePath()` if you mutate data that affects cached pages.

## Database changes

1. Edit `prisma/schema.prisma`.
2. Run `npx prisma migrate dev --name descriptive_name` to create and apply a migration (or `db:push` for local-only).
3. Run `npm run db:generate` if not auto-run.
4. If you add or change the vector column or pgvector, update the migration SQL in `prisma/migrations/` as needed (vector column is managed there, not in the schema).

## Testing the RAG flow

1. Upload a PDF or TXT from **Knowledge base** (`/documents`), or run `npm run ingest`.
2. Open **Chat** and ask a question that should be answered by the uploaded content.
3. If answers are missing context, tune `defaultTopK` or `minSimilarity` in `src/config/rag.ts` (see [CONFIGURATION.md](./CONFIGURATION.md#rag-config)).

## Docs

- [Architecture](./ARCHITECTURE.md) — Design and data flow.
- [Setup](./SETUP.md) — First-time setup.
- [Configuration](./CONFIGURATION.md) — Env and RAG config.
- [API](./API.md) — Server actions and types.
- [Deployment](./DEPLOYMENT.md) — Production deploy.
