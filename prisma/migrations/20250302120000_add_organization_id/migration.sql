-- Multi-tenant: add organizationId (Clerk org id) to Document and ChatSession.
-- Default 'org_legacy' backfills existing rows. New rows must set organizationId from auth.

-- Document
ALTER TABLE "Document" ADD COLUMN "organizationId" TEXT NOT NULL DEFAULT 'org_legacy';
CREATE INDEX "Document_organizationId_idx" ON "Document"("organizationId");
CREATE INDEX "Document_organizationId_createdAt_idx" ON "Document"("organizationId", "createdAt");
ALTER TABLE "Document" ALTER COLUMN "organizationId" DROP DEFAULT;

-- ChatSession
ALTER TABLE "ChatSession" ADD COLUMN "organizationId" TEXT NOT NULL DEFAULT 'org_legacy';
CREATE INDEX "ChatSession_organizationId_idx" ON "ChatSession"("organizationId");
CREATE INDEX "ChatSession_organizationId_userId_idx" ON "ChatSession"("organizationId", "userId");
CREATE INDEX "ChatSession_organizationId_updatedAt_idx" ON "ChatSession"("organizationId", "updatedAt");
ALTER TABLE "ChatSession" ALTER COLUMN "organizationId" DROP DEFAULT;
