import { CHUNK_CONFIG } from "@/config/rag";

/**
 * Split text into overlapping chunks for embedding.
 * Used by upload action and ingest script.
 * @param text - Full document text
 * @param chunkSize - Target size in characters (default from config)
 * @param overlap - Overlap between consecutive chunks (default from config)
 */
export function chunkText(
  text: string,
  chunkSize: number = CHUNK_CONFIG.chunkSize,
  overlap: number = CHUNK_CONFIG.chunkOverlap
): string[] {
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    let end = Math.min(start + chunkSize, text.length);
    if (end < text.length) {
      const lastSpace = text.lastIndexOf(" ", end);
      if (lastSpace > start) end = lastSpace;
    }
    chunks.push(text.slice(start, end).trim());
    start = end - (end < text.length ? overlap : 0);
  }
  return chunks.filter(Boolean);
}
