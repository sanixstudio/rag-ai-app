import OpenAI from "openai";
import { getOpenAiApiKey } from "@/config/env";
import { RAG_CONFIG } from "@/config/rag";
import { retrieveContext } from "./retrieval";

const SYSTEM_PROMPT = `You are a helpful AI assistant that answers questions based only on the provided internal knowledge base context.
If the context does not contain relevant information, say so clearly and do not invent facts.
Cite the context when possible. Be concise and accurate.`;

/**
 * Generate a RAG response: retrieve context, then chat completion with context in system prompt.
 * @param userMessage - User query
 * @param options.topK - Number of chunks to retrieve (default from config)
 */
export async function generateRagResponse(
  userMessage: string,
  options: { topK?: number } = {}
): Promise<string> {
  const { context } = await retrieveContext(
    userMessage,
    options.topK ?? RAG_CONFIG.defaultTopK
  );
  const systemContent = context
    ? `${SYSTEM_PROMPT}\n\n## Context from knowledge base\n${context}`
    : `${SYSTEM_PROMPT}\n\n(No relevant context was found in the knowledge base for this query.)`;

  const openai = new OpenAI({ apiKey: getOpenAiApiKey() });
  const completion = await openai.chat.completions.create({
    model: RAG_CONFIG.chatModel,
    messages: [
      { role: "system", content: systemContent },
      { role: "user", content: userMessage },
    ],
    max_tokens: RAG_CONFIG.chatMaxTokens,
  });

  const content = completion.choices[0]?.message?.content;
  if (content == null) {
    throw new Error("Empty completion response");
  }
  return content;
}

/**
 * Generate a RAG response as a stream of content chunks (for live UI updates).
 * Yields each delta from the model; caller can accumulate for persistence.
 *
 * @param userMessage - User query
 * @param options.topK - Number of chunks to retrieve (default from config)
 * @yields Content delta strings from the completion stream
 */
export async function* generateRagResponseStream(
  userMessage: string,
  options: { topK?: number } = {}
): AsyncGenerator<string, string, undefined> {
  const { context } = await retrieveContext(
    userMessage,
    options.topK ?? RAG_CONFIG.defaultTopK
  );
  const systemContent = context
    ? `${SYSTEM_PROMPT}\n\n## Context from knowledge base\n${context}`
    : `${SYSTEM_PROMPT}\n\n(No relevant context was found in the knowledge base for this query.)`;

  const openai = new OpenAI({ apiKey: getOpenAiApiKey() });
  const stream = await openai.chat.completions.create({
    model: RAG_CONFIG.chatModel,
    messages: [
      { role: "system", content: systemContent },
      { role: "user", content: userMessage },
    ],
    max_tokens: RAG_CONFIG.chatMaxTokens,
    stream: true,
  });

  let fullContent = "";
  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content ?? "";
    if (delta) {
      fullContent += delta;
      yield delta;
    }
  }
  return fullContent;
}
