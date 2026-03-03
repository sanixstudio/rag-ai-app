import { RAG_CONFIG } from "@/config/rag";
import { findSimilarChunks, type SimilarChunk } from "@/db/vectors";
import { prisma } from "@/db";
import { embedText } from "./embeddings";

export interface RetrievalResult {
  chunks: SimilarChunk[];
  context: string;
}

export interface RetrieveOptions {
  /** Restrict retrieval to documents that have this tag */
  tagFilter?: string;
}

/**
 * RAG retrieval: embed query, find similar chunks, return formatted context.
 * Uses config for topK and minSimilarity; falls back to top chunks when all are below threshold.
 * Optional tagFilter restricts to documents that have the given tag.
 */
export async function retrieveContext(
  query: string,
  topK: number = RAG_CONFIG.defaultTopK,
  options: RetrieveOptions = {}
): Promise<RetrievalResult> {
  const queryEmbedding = await embedText(query);
  let filterDocumentIds: string[] | undefined;
  if (options.tagFilter?.trim()) {
    const docs = await prisma.document.findMany({
      where: { tags: { has: options.tagFilter.trim() } },
      select: { id: true },
    });
    filterDocumentIds = docs.map((d) => d.id);
    if (filterDocumentIds.length === 0) {
      return { chunks: [], context: "" };
    }
  }
  const chunks = await findSimilarChunks(
    queryEmbedding,
    topK,
    filterDocumentIds
  );
  const filtered = chunks.filter((c) => c.similarity >= RAG_CONFIG.minSimilarity);
  const toUse =
    filtered.length > 0
      ? filtered
      : chunks.slice(0, RAG_CONFIG.fallbackChunkCount);
  const context = toUse.map((c) => c.chunkText).join("\n\n---\n\n");
  return { chunks: toUse, context };
}
