"use server";

import { getDocumentProxy, extractText as unpdfExtractText } from "unpdf";
import { nanoid } from "nanoid";
import { chunkText } from "@/lib/chunking";
import { embedTexts } from "@/ai/embeddings";
import { prisma } from "@/db";

const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const ALLOWED_TYPES = ["application/pdf", "text/plain"] as const;

export type UploadResult =
  | { success: true; documentId: string; title: string; chunks: number }
  | { success: false; error: string };

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
 */
export async function uploadDocument(formData: FormData): Promise<UploadResult> {
  const file = formData.get("file") as File | null;
  if (!file || !(file instanceof File)) {
    return { success: false, error: "No file provided." };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return { success: false, error: `File too large. Max ${MAX_FILE_SIZE_MB} MB.` };
  }

  const allowed = ALLOWED_TYPES.some((t) => file.type === t) || file.name.endsWith(".txt") || file.name.toLowerCase().endsWith(".pdf");
  if (!allowed) {
    return { success: false, error: "Only PDF and TXT files are supported." };
  }

  try {
    const text = await extractTextFromFile(file);
    if (!text.trim()) {
      return { success: false, error: "File contains no extractable text." };
    }

    const title = file.name.replace(/\.[^.]+$/, "") || "Untitled";
    const chunks = chunkText(text);
    if (chunks.length === 0) {
      return { success: false, error: "No text chunks could be created." };
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
