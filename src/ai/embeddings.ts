import OpenAI from "openai";
import { getOpenAiApiKey } from "@/config/env";
import { RAG_CONFIG } from "@/config/rag";

/** Embedding dimension; re-exported for consumers that need it. */
export const EMBEDDING_DIMENSION = RAG_CONFIG.embeddingDimension;

/**
 * Generate embedding vector for a single text using OpenAI.
 * Server-side only; do not call from client.
 */
export async function embedText(text: string): Promise<number[]> {
  const openai = new OpenAI({ apiKey: getOpenAiApiKey() });
  const response = await openai.embeddings.create({
    model: RAG_CONFIG.embeddingModel,
    input: text.slice(0, RAG_CONFIG.embeddingInputLimit),
  });
  const vector = response.data[0]?.embedding;
  if (!vector || vector.length !== RAG_CONFIG.embeddingDimension) {
    throw new Error("Invalid embedding response");
  }
  return vector;
}

/**
 * Generate embeddings for multiple texts in one request (batch).
 */
export async function embedTexts(texts: string[]): Promise<number[][]> {
  const openai = new OpenAI({ apiKey: getOpenAiApiKey() });
  const trimmed = texts.map((t) => t.slice(0, RAG_CONFIG.embeddingInputLimit));
  const response = await openai.embeddings.create({
    model: RAG_CONFIG.embeddingModel,
    input: trimmed,
  });
  const sorted = response.data.sort((a, b) => a.index - b.index);
  return sorted.map((d: { embedding: number[] }) => d.embedding);
}
