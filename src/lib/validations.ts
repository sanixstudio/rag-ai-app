import { z } from "zod";

export const sendMessageSchema = z.object({
  content: z
    .string()
    .min(1, "Message cannot be empty")
    .max(4000, "Message too long"),
  sessionId: z.preprocess(
    (val) => (val === "" || val == null ? undefined : val),
    z.cuid().optional()
  ),
});

export type SendMessageInput = z.infer<typeof sendMessageSchema>;

export const createSessionSchema = z.object({
  title: z.string().max(200).optional(),
});

export type CreateSessionInput = z.infer<typeof createSessionSchema>;
