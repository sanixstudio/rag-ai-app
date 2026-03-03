"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@clerk/nextjs/server";
import { generateRagResponse } from "@/ai/chat";
import { prisma } from "@/db";
import { ERROR_MESSAGES } from "@/lib/errors";
import { sendMessageSchema } from "@/lib/validations";
import { getOrCreateUserByClerk } from "./session";

/**
 * Process a user message: optionally create or use a session, run RAG, save messages, return assistant reply.
 */
export async function sendMessage(formData: FormData) {
  const raw = {
    content: formData.get("content") ?? "",
    sessionId: formData.get("sessionId") ?? undefined,
  };
  const parsed = sendMessageSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.flatten().fieldErrors,
      sessionId: undefined,
      message: undefined,
    };
  }

  const { content, sessionId: existingSessionId } = parsed.data;
  let sessionId = existingSessionId;
  let userId: string | null = null;

  try {
    const { userId: clerkId } = await auth();
    if (clerkId) {
      const user = await getOrCreateUserByClerk(clerkId);
      userId = user?.id ?? null;
    }
  } catch {
    // Auth unavailable (e.g. Clerk not configured)
  }

  try {
    if (!sessionId) {
      const session = await prisma.chatSession.create({
        data: {
          userId,
          title: content.slice(0, 50) || "New chat",
        },
      });
      sessionId = session.id;
    }

    await prisma.message.create({
      data: {
        sessionId,
        role: "user",
        content,
      },
    });

    const assistantContent = await generateRagResponse(content);

    await prisma.message.create({
      data: {
        sessionId,
        role: "assistant",
        content: assistantContent,
      },
    });

    await prisma.chatSession.update({
      where: { id: sessionId },
      data: { updatedAt: new Date() },
    });

    revalidatePath("/chat");
    if (sessionId) revalidatePath(`/chat/${sessionId}`);

    return {
      success: true,
      sessionId,
      message: assistantContent,
      error: undefined,
    };
  } catch (err) {
    console.error("sendMessage error:", err);
    return {
      success: false,
      error: { content: [ERROR_MESSAGES.chat.generic] },
      sessionId: undefined,
      message: undefined,
    };
  }
}
