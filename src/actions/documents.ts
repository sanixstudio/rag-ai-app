"use server";

import { auth } from "@clerk/nextjs/server";
import { getDocumentProxy, extractText as unpdfExtractText } from "unpdf";
import { nanoid } from "nanoid";
import { UPLOAD_CONFIG, TAG_CONFIG } from "@/config/rag";
import { embedTexts } from "@/ai/embeddings";
import { prisma } from "@/db";
import { chunkText } from "@/lib/chunking";
import { ERROR_MESSAGES } from "@/lib/errors";
import { documentIdSchema } from "@/lib/validations";
import { requireOrganizationId } from "@/lib/tenant";

export type UploadResult =
  | { success: true; documentId: string; title: string; chunks: number }
  | { success: false; error: string };

const ALLOWED_EXTENSIONS = [".pdf", ".txt"] as const;

function isAllowedFile(file: File): boolean {
  const byMime = UPLOAD_CONFIG.allowedMimeTypes.includes(
    file.type as (typeof UPLOAD_CONFIG.allowedMimeTypes)[number]
  );
  const byExt = ALLOWED_EXTENSIONS.some((ext) =>
    file.name.toLowerCase().endsWith(ext)
  );
  return byMime || byExt;
}

/**
 * Extract text from an uploaded file (PDF or plain text).
 */
async function extractTextFromFile(file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const type = file.type as string;

  if (type === "text/plain" || file.name.endsWith(".txt")) {
    return buffer.toString("utf-8");
  }

  if (type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
    const pdf = await getDocumentProxy(new Uint8Array(buffer));
    const { text } = await unpdfExtractText(pdf, { mergePages: true });
    return text ?? "";
  }

  throw new Error(`Unsupported file type: ${type}. Use PDF or TXT.`);
}

/**
 * Upload a file to the knowledge base: extract text, chunk, embed, store.
 * Requires an authenticated user (internal app).
 */
export async function uploadDocument(formData: FormData): Promise<UploadResult> {
  const { userId } = await auth();
  if (!userId) {
    return { success: false, error: "Sign in to upload documents." };
  }
  const { organizationId } = await requireOrganizationId();
  if (!organizationId) {
    return { success: false, error: "Select or create a workspace first." };
  }

  const file = formData.get("file") as File | null;
  if (!file || !(file instanceof File)) {
    return { success: false, error: ERROR_MESSAGES.upload.noFile };
  }

  if (file.size > UPLOAD_CONFIG.maxFileSizeBytes) {
    const maxMb = UPLOAD_CONFIG.maxFileSizeBytes / (1024 * 1024);
    return { success: false, error: ERROR_MESSAGES.upload.fileTooLarge(maxMb) };
  }

  if (!isAllowedFile(file)) {
    return { success: false, error: ERROR_MESSAGES.upload.unsupportedType };
  }

  try {
    const text = await extractTextFromFile(file);
    if (!text.trim()) {
      return { success: false, error: ERROR_MESSAGES.upload.noText };
    }

    const title = file.name.replace(/\.[^.]+$/, "") || "Untitled";
    const rawTags = (formData.get("tags") as string | null)?.trim() ?? "";
    const tags = rawTags
      ? rawTags
          .split(",")
          .map((t) => t.trim().slice(0, TAG_CONFIG.maxTagLength))
          .filter(Boolean)
          .slice(0, TAG_CONFIG.maxTagsPerDocument)
      : [];

    const chunks = chunkText(text);
    if (chunks.length === 0) {
      return { success: false, error: ERROR_MESSAGES.upload.noChunks };
    }

    const embeddings = await embedTexts(chunks);

    const document = await prisma.document.create({
      data: {
        organizationId,
        title,
        content: text,
        sourceUrl: null,
        metadata: { originalName: file.name, chunkCount: chunks.length },
        tags,
      },
    });

    for (let i = 0; i < chunks.length; i++) {
      const vectorStr = `[${embeddings[i].join(",")}]`;
      const id = nanoid();
      await prisma.$executeRawUnsafe(
        `INSERT INTO "Embedding" (id, "documentId", "chunkIndex", "chunkText", embedding, "createdAt")
         VALUES ($1, $2, $3, $4, $5::vector, NOW())`,
        id,
        document.id,
        i,
        chunks[i],
        vectorStr
      );
    }

    return {
      success: true,
      documentId: document.id,
      title: document.title,
      chunks: chunks.length,
    };
  } catch (err) {
    console.error("uploadDocument error:", err);
    const message = err instanceof Error ? err.message : "Upload failed.";
    return { success: false, error: message };
  }
}

export type DocumentListItem = {
  id: string;
  title: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  chunkCount: number;
};

/**
 * Get distinct tags from all documents in the current workspace (for filter dropdowns).
 */
export async function getDocumentTags(): Promise<string[]> {
  const { userId } = await auth();
  if (!userId) return [];
  const { organizationId } = await requireOrganizationId();
  if (!organizationId) return [];
  const docs = await prisma.document.findMany({
    where: { organizationId },
    select: { tags: true },
  });
  const set = new Set<string>();
  for (const d of docs as { tags: string[] }[]) {
    for (const t of d.tags) set.add(t);
  }
  return Array.from(set).sort();
}

/**
 * List all documents in the current workspace (tenant).
 * Requires an authenticated user and active org.
 */
export async function listDocuments(): Promise<DocumentListItem[]> {
  const { userId } = await auth();
  if (!userId) return [];
  const { organizationId } = await requireOrganizationId();
  if (!organizationId) return [];

  const docs = await prisma.document.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { embeddings: true } } },
  });
  return docs.map((d: { id: string; title: string; tags: string[]; createdAt: Date; updatedAt: Date; _count: { embeddings: number } }) => ({
    id: d.id,
    title: d.title,
    tags: d.tags ?? [],
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
    chunkCount: d._count.embeddings,
  }));
}

/**
 * Delete a document and its embeddings (cascade). Internal use only; requires auth.
 */
export async function deleteDocument(documentId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const parsed = documentIdSchema.safeParse(documentId);
  if (!parsed.success) {
    return { success: false, error: "Invalid document id." };
  }
  const { userId } = await auth();
  if (!userId) {
    return { success: false, error: "Sign in to delete documents." };
  }
  const { organizationId } = await requireOrganizationId();
  if (!organizationId) {
    return { success: false, error: "Select a workspace first." };
  }
  const doc = await prisma.document.findUnique({
    where: { id: parsed.data },
    select: { organizationId: true },
  });
  if (!doc || doc.organizationId !== organizationId) {
    return { success: false, error: "Document not found." };
  }
  try {
    await prisma.document.delete({ where: { id: parsed.data } });
    return { success: true };
  } catch (err) {
    console.error("deleteDocument error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to delete document",
    };
  }
}

/**
 * Re-ingest a document: re-chunk, re-embed, replace existing embeddings. Keeps title, content, tags.
 */
export async function reingestDocument(documentId: string): Promise<{
  success: boolean;
  chunks?: number;
  error?: string;
}> {
  const parsed = documentIdSchema.safeParse(documentId);
  if (!parsed.success) {
    return { success: false, error: "Invalid document id." };
  }
  const docId = parsed.data;
  const { userId } = await auth();
  if (!userId) {
    return { success: false, error: "Sign in to re-index documents." };
  }
  const { organizationId } = await requireOrganizationId();
  if (!organizationId) {
    return { success: false, error: "Select a workspace first." };
  }
  try {
    const doc = await prisma.document.findUnique({
      where: { id: docId },
    });
    if (!doc || doc.organizationId !== organizationId) {
      return { success: false, error: "Document not found." };
    }

    await prisma.embedding.deleteMany({ where: { documentId: docId } });

    const chunks = chunkText(doc.content);
    if (chunks.length === 0) {
      return { success: false, error: "No chunks produced." };
    }

    const embeddings = await embedTexts(chunks);
    for (let i = 0; i < chunks.length; i++) {
      const vectorStr = `[${embeddings[i].join(",")}]`;
      const embeddingId = nanoid();
      await prisma.$executeRawUnsafe(
        `INSERT INTO "Embedding" (id, "documentId", "chunkIndex", "chunkText", embedding, "createdAt")
         VALUES ($1, $2, $3, $4, $5::vector, NOW())`,
        embeddingId,
        docId,
        i,
        chunks[i],
        vectorStr
      );
    }

    const metadata =
      doc.metadata && typeof doc.metadata === "object"
        ? { ...(doc.metadata as Record<string, unknown>), chunkCount: chunks.length }
        : { chunkCount: chunks.length };
    await prisma.document.update({
      where: { id: docId },
      data: { updatedAt: new Date(), metadata },
    });

    return { success: true, chunks: chunks.length };
  } catch (err) {
    console.error("reingestDocument error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to re-index",
    };
  }
}
