import OpenAI from "openai";
import { retrieveContext } from "./retrieval";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const MODEL = "gpt-4o-mini";

const SYSTEM_PROMPT = `You are a helpful AI assistant that answers questions based only on the provided internal knowledge base context.
If the context does not contain relevant information, say so clearly and do not invent facts.
Cite the context when possible. Be concise and accurate.`;

/**
 * Generate a RAG response: retrieve context, then chat completion with context in system prompt.
 */
export async function generateRagResponse(
  userMessage: string,
  options: { topK?: number } = {}
): Promise<string> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not set");
  }
  const { context } = await retrieveContext(userMessage, options.topK ?? 5);
  const systemContent = context
    ? `${SYSTEM_PROMPT}\n\n## Context from knowledge base\n${context}`
    : `${SYSTEM_PROMPT}\n\n(No relevant context was found in the knowledge base for this query.)`;

  const completion = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: systemContent },
      { role: "user", content: userMessage },
    ],
    max_tokens: 1024,
  });

  const content = completion.choices[0]?.message?.content;
  if (content == null) {
    throw new Error("Empty completion response");
  }
  return content;
}
