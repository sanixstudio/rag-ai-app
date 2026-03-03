/**
 * Vector similarity search using pgvector via raw SQL.
 * Embedding column is not in Prisma schema; it is added by migration.
 */

import { RAG_CONFIG } from "@/config/rag";
import { prisma } from "./index";

const EMBEDDING_DIMENSION = RAG_CONFIG.embeddingDimension;

export interface SimilarChunk {
  id: string;
  documentId: string;
  chunkIndex: number;
  chunkText: string;
  similarity: number;
}

/**
 * Find the top-k embedding chunks most similar to the query vector (cosine similarity).
 * @param queryEmbedding - Float32Array or number[] of length 1536
 * @param topK - Max number of chunks to return
 * @returns Chunks with similarity scores, ordered by similarity descending
 */
export async function findSimilarChunks(
  queryEmbedding: number[],
  topK: number = 5
): Promise<SimilarChunk[]> {
  if (queryEmbedding.length !== EMBEDDING_DIMENSION) {
    throw new Error(
      `Expected embedding dimension ${EMBEDDING_DIMENSION}, got ${queryEmbedding.length}`
    );
  }
  const vectorStr = `[${queryEmbedding.join(",")}]`;
  const result = await prisma.$queryRawUnsafe<SimilarChunk[]>(
    `
    SELECT id, "documentId", "chunkIndex", "chunkText",
           1 - (embedding <=> $1::vector) AS similarity
    FROM "Embedding"
    WHERE embedding IS NOT NULL
    ORDER BY embedding <=> $1::vector
    LIMIT $2
    `,
    vectorStr,
    topK
  );
  return result;
}
