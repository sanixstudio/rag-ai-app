import { RAG_CONFIG } from "@/config/rag";
import { findSimilarChunks, type SimilarChunk } from "@/db/vectors";
import { embedText } from "./embeddings";

export interface RetrievalResult {
  chunks: SimilarChunk[];
  context: string;
}

/**
 * RAG retrieval: embed query, find similar chunks, return formatted context.
 * Uses config for topK and minSimilarity; falls back to top chunks when all are below threshold.
 */
export async function retrieveContext(
  query: string,
  topK: number = RAG_CONFIG.defaultTopK
): Promise<RetrievalResult> {
  const queryEmbedding = await embedText(query);
  const chunks = await findSimilarChunks(queryEmbedding, topK);
  const filtered = chunks.filter((c) => c.similarity >= RAG_CONFIG.minSimilarity);
  const toUse =
    filtered.length > 0
      ? filtered
      : chunks.slice(0, RAG_CONFIG.fallbackChunkCount);
  const context = toUse.map((c) => c.chunkText).join("\n\n---\n\n");
  return { chunks: toUse, context };
}
