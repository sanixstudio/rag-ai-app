import { embedText } from "./embeddings";
import { findSimilarChunks, type SimilarChunk } from "@/db/vectors";

const DEFAULT_TOP_K = 5;
const MIN_SIMILARITY = 0.5;

export interface RetrievalResult {
  chunks: SimilarChunk[];
  context: string;
}

/**
 * RAG retrieval: embed query, find similar chunks, return formatted context.
 */
export async function retrieveContext(
  query: string,
  topK: number = DEFAULT_TOP_K
): Promise<RetrievalResult> {
  const queryEmbedding = await embedText(query);
  const chunks = await findSimilarChunks(queryEmbedding, topK);
  const filtered = chunks.filter((c) => c.similarity >= MIN_SIMILARITY);
  const context = filtered
    .map((c) => c.chunkText)
    .join("\n\n---\n\n");
  return { chunks: filtered, context };
}
