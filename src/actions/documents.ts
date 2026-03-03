"use server";

import { auth } from "@clerk/nextjs/server";
import { getDocumentProxy, extractText as unpdfExtractText } from "unpdf";
import { nanoid } from "nanoid";
import { UPLOAD_CONFIG } from "@/config/rag";
import { embedTexts } from "@/ai/embeddings";
import { prisma } from "@/db";
import { chunkText } from "@/lib/chunking";
import { ERROR_MESSAGES } from "@/lib/errors";

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
    const chunks = chunkText(text);
    if (chunks.length === 0) {
      return { success: false, error: ERROR_MESSAGES.upload.noChunks };
    }

    const embeddings = await embedTexts(chunks);

    const document = await prisma.document.create({
      data: {
        title,
        content: text,
        sourceUrl: null,
        metadata: { originalName: file.name, chunkCount: chunks.length },
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
  createdAt: Date;
  chunkCount: number;
};

/**
 * List all documents in the knowledge base (for internal users).
 * Requires an authenticated user.
 */
export async function listDocuments(): Promise<DocumentListItem[]> {
  const { userId } = await auth();
  if (!userId) return [];

  const docs = await prisma.document.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { embeddings: true } } },
  });
  return docs.map((d) => ({
    id: d.id,
    title: d.title,
    createdAt: d.createdAt,
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
  const { userId } = await auth();
  if (!userId) {
    return { success: false, error: "Sign in to delete documents." };
  }
  try {
    await prisma.document.delete({ where: { id: documentId } });
    return { success: true };
  } catch (err) {
    console.error("deleteDocument error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to delete document",
    };
  }
}
