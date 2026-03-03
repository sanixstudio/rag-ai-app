import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const EMBEDDING_MODEL = "text-embedding-3-small";
export const EMBEDDING_DIMENSION = 1536;

/**
 * Generate embedding vector for a single text using OpenAI.
 * Server-side only; do not call from client.
 */
export async function embedText(text: string): Promise<number[]> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not set");
  }
  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text.slice(0, 8191), // model limit
  });
  const vector = response.data[0]?.embedding;
  if (!vector || vector.length !== EMBEDDING_DIMENSION) {
    throw new Error("Invalid embedding response");
  }
  return vector;
}

/**
 * Generate embeddings for multiple texts in one request (batch).
 */
export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not set");
  }
  const trimmed = texts.map((t) => t.slice(0, 8191));
  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: trimmed,
  });
  const sorted = response.data.sort((a, b) => a.index - b.index);
  return sorted.map((d) => d.embedding);
}
