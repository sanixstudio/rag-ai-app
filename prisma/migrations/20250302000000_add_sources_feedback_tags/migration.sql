-- AlterTable Document: add tags array
ALTER TABLE "Document" ADD COLUMN IF NOT EXISTS "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable Message: add sources (citations) and feedback (thumbs up/down)
ALTER TABLE "Message" ADD COLUMN IF NOT EXISTS "sources" JSONB;
ALTER TABLE "Message" ADD COLUMN IF NOT EXISTS "feedback" INTEGER;
