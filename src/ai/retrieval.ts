import { embedText } from "./embeddings";
import { findSimilarChunks, type SimilarChunk } from "@/db/vectors";

const DEFAULT_TOP_K = 10;
/** Lower threshold so broad queries (e.g. "Tell me about Adnan") still get resume/doc chunks. */
const MIN_SIMILARITY = 0.3;

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
  // If everything was filtered out, still use top chunks so the model has something to work with
  const toUse = filtered.length > 0 ? filtered : chunks.slice(0, 5);
  const context = toUse
    .map((c) => c.chunkText)
    .join("\n\n---\n\n");
  return { chunks: toUse, context };
}
