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
  documentTitle: string;
  chunkIndex: number;
  chunkText: string;
  similarity: number;
}

/**
 * Find the top-k embedding chunks most similar to the query vector (cosine similarity).
 * Optionally restrict to documents whose id is in filterDocumentIds (e.g. by tag).
 *
 * @param queryEmbedding - number[] of length 1536
 * @param topK - Max number of chunks to return
 * @param filterDocumentIds - Optional list of document IDs to restrict search
 */
export async function findSimilarChunks(
  queryEmbedding: number[],
  topK: number = 5,
  filterDocumentIds?: string[]
): Promise<SimilarChunk[]> {
  if (queryEmbedding.length !== EMBEDDING_DIMENSION) {
    throw new Error(
      `Expected embedding dimension ${EMBEDDING_DIMENSION}, got ${queryEmbedding.length}`
    );
  }
  const vectorStr = `[${queryEmbedding.join(",")}]`;
  if (filterDocumentIds == null || filterDocumentIds.length === 0) {
    const result = await prisma.$queryRawUnsafe<SimilarChunk[]>(
      `
      SELECT e.id, e."documentId", d.title AS "documentTitle", e."chunkIndex", e."chunkText",
             1 - (e.embedding <=> $1::vector) AS similarity
      FROM "Embedding" e
      JOIN "Document" d ON d.id = e."documentId"
      WHERE e.embedding IS NOT NULL
      ORDER BY e.embedding <=> $1::vector
      LIMIT $2
      `,
      vectorStr,
      topK
    );
    return result;
  }
  const result = await prisma.$queryRawUnsafe<SimilarChunk[]>(
    `
    SELECT e.id, e."documentId", d.title AS "documentTitle", e."chunkIndex", e."chunkText",
           1 - (e.embedding <=> $1::vector) AS similarity
    FROM "Embedding" e
    JOIN "Document" d ON d.id = e."documentId"
    WHERE e.embedding IS NOT NULL AND e."documentId" = ANY($3::text[])
    ORDER BY e.embedding <=> $1::vector
    LIMIT $2
    `,
    vectorStr,
    topK,
    filterDocumentIds
  );
  return result;
}
