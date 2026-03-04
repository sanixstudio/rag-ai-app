import { RAG_CONFIG } from "@/config/rag";
import { findSimilarChunks, type SimilarChunk } from "@/db/vectors";
import { prisma } from "@/db";
import { embedText } from "./embeddings";

export interface RetrievalResult {
  chunks: SimilarChunk[];
  context: string;
}

export interface RetrieveOptions {
  /** Current workspace (tenant); required for tenant isolation */
  organizationId: string;
  /** Restrict retrieval to documents that have this tag */
  tagFilter?: string;
}

/**
 * RAG retrieval: embed query, find similar chunks, return formatted context.
 * Scoped to the given organization (tenant). Uses config for topK and minSimilarity.
 */
export async function retrieveContext(
  query: string,
  topK: number = RAG_CONFIG.defaultTopK,
  options: RetrieveOptions
): Promise<RetrievalResult> {
  const { organizationId, tagFilter } = options;
  const queryEmbedding = await embedText(query);
  let filterDocumentIds: string[] | undefined;
  if (tagFilter?.trim()) {
    const docs = await prisma.document.findMany({
      where: {
        organizationId,
        tags: { has: tagFilter.trim() },
      },
      select: { id: true },
    });
    const ids = docs.map((d: { id: string }) => d.id);
    if (ids.length === 0) {
      return { chunks: [], context: "" };
    }
    filterDocumentIds = ids;
  }
  const chunks = await findSimilarChunks(
    queryEmbedding,
    topK,
    organizationId,
    filterDocumentIds
  );
  const filtered = chunks.filter((c) => c.similarity >= RAG_CONFIG.minSimilarity);
  const toUse =
    filtered.length > 0
      ? filtered
      : chunks.slice(0, RAG_CONFIG.fallbackChunkCount);
  const context = toUse.map((c: SimilarChunk) => c.chunkText).join("\n\n---\n\n");
  return { chunks: toUse, context };
}
