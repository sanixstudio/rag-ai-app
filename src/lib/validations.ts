import { z } from "zod";

/** Schema for chat message form (content + optional sessionId + optional tag filter). */
export const sendMessageSchema = z.object({
  content: z
    .string()
    .min(1, "Message cannot be empty")
    .max(4000, "Message too long"),
  sessionId: z.preprocess(
    (val) => (val === "" || val == null ? undefined : val),
    z.cuid().optional()
  ),
  /** Restrict answers to documents with this tag */
  tagFilter: z.string().max(100).optional(),
});

export type SendMessageInput = z.infer<typeof sendMessageSchema>;

/** Schema for creating a chat session (optional title). */
export const createSessionSchema = z.object({
  title: z.string().max(200).optional(),
});

export type CreateSessionInput = z.infer<typeof createSessionSchema>;
