/**
 * RAG and AI configuration. Single place to tune models, limits, and retrieval behavior.
 */

export const RAG_CONFIG = {
  /** OpenAI embedding model (must match dimension below). */
  embeddingModel: "text-embedding-3-small",
  /** Embedding vector size. Do not change without re-embedding all documents. */
  embeddingDimension: 1536,
  /** Max input length per chunk for embeddings (model limit). */
  embeddingInputLimit: 8191,

  /** Chat model for RAG completion. */
  chatModel: "gpt-4o-mini",
  /** Max tokens in chat response. */
  chatMaxTokens: 1024,

  /** Number of chunks to retrieve from vector search. */
  defaultTopK: 10,
  /** Minimum cosine similarity to include a chunk (0–1). Lower = more permissive. */
  minSimilarity: 0.3,
  /** When all chunks are below minSimilarity, still pass this many top chunks to the model. */
  fallbackChunkCount: 5,
} as const;

export const CHUNK_CONFIG = {
  /** Target size in characters per chunk. */
  chunkSize: 800,
  /** Overlap between consecutive chunks. */
  chunkOverlap: 100,
} as const;

export const UPLOAD_CONFIG = {
  /** Max file size in bytes (10 MB). */
  maxFileSizeBytes: 10 * 1024 * 1024,
  allowedMimeTypes: ["application/pdf", "text/plain"] as const,
  allowedExtensions: [".pdf", ".txt"] as const,
} as const;

/** Document tags: max per document and max length per tag. */
export const TAG_CONFIG = {
  maxTagsPerDocument: 20,
  maxTagLength: 50,
} as const;
