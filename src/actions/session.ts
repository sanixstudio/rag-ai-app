"use server";

import { revalidatePath } from "next/cache";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { getAllowedEmailDomains } from "@/config/env";
import { requireOrganizationId } from "@/lib/tenant";
import { prisma } from "@/db";

/**
 * Get or create a User record from the Clerk id. Used to link Clerk users to internal User rows.
 */
export async function getOrCreateUserByClerk(clerkId: string) {
  const existing = await prisma.user.findUnique({
    where: { clerkId },
  });
  if (existing) return existing;

  let email: string | undefined;
  try {
    const client = await clerkClient();
    const u = await client.users.getUser(clerkId);
    email = u.emailAddresses[0]?.emailAddress ?? undefined;
  } catch {
    // ignore
  }

  return prisma.user.create({
    data: {
      clerkId,
      email,
    },
  });
}

/**
 * List chat sessions for the current user in the given organization (tenant).
 */
export async function getChatSessions(userId: string | null, organizationId: string) {
  if (!userId) return [];
  return prisma.chatSession.findMany({
    where: { userId, organizationId },
    orderBy: { updatedAt: "desc" },
    include: { messages: { take: 1, orderBy: { createdAt: "desc" } } },
  });
}

/**
 * Get a single chat session with messages (for viewing history).
 * Ensures the session belongs to the given organization (tenant).
 */
export async function getChatSession(
  sessionId: string,
  clerkIdOrUserId: string | null,
  organizationId: string
) {
  const session = await prisma.chatSession.findUnique({
    where: { id: sessionId },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
  if (!session || session.organizationId !== organizationId) return null;
  if (!session.userId) return session; // Anonymous session: allow anyone in org
  if (!clerkIdOrUserId) return null;
  const ourUser = await prisma.user.findFirst({
    where: {
      OR: [{ clerkId: clerkIdOrUserId }, { id: clerkIdOrUserId }],
    },
  });
  if (!ourUser || session.userId !== ourUser.id) return null;
  return session;
}

/**
 * Update a chat session title. Only the session owner can update.
 */
export async function updateSessionTitle(
  sessionId: string,
  title: string
): Promise<{ success: boolean; error?: string }> {
  const { userId: clerkId } = await auth();
  if (!clerkId) return { success: false, error: "Sign in to rename." };
  const session = await prisma.chatSession.findUnique({
    where: { id: sessionId },
    select: { userId: true, organizationId: true },
  });
  if (!session) return { success: false, error: "Chat not found." };
  const { organizationId } = await requireOrganizationId();
  if (!organizationId || session.organizationId !== organizationId) {
    return { success: false, error: "Not allowed." };
  }
  if (session.userId) {
    const user = await getOrCreateUserByClerk(clerkId);
    if (!user || session.userId !== user.id)
      return { success: false, error: "Not allowed." };
  }
  const trimmed = title.trim().slice(0, 200) || "New chat";
  await prisma.chatSession.update({
    where: { id: sessionId },
    data: { title: trimmed, updatedAt: new Date() },
  });
  revalidatePath("/chat");
  revalidatePath(`/chat/${sessionId}`);
  return { success: true };
}

/**
 * Delete a chat session and its messages (cascade). Only the session owner can delete.
 * @returns { success: true } or { success: false, error: string }
 */
export async function deleteChatSession(sessionId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    return { success: false, error: "Sign in to delete chats." };
  }

  const session = await prisma.chatSession.findUnique({
    where: { id: sessionId },
    select: { id: true, userId: true, organizationId: true },
  });
  if (!session) {
    return { success: false, error: "Chat not found." };
  }
  const { organizationId } = await requireOrganizationId();
  if (!organizationId || session.organizationId !== organizationId) {
    return { success: false, error: "Not allowed." };
  }
  if (session.userId) {
    const user = await prisma.user.findFirst({
      where: { OR: [{ clerkId }, { id: clerkId }] },
    });
    if (!user || session.userId !== user.id) {
      return { success: false, error: "You can only delete your own chats." };
    }
  }

  try {
    await prisma.chatSession.delete({ where: { id: sessionId } });
    revalidatePath("/chat");
    revalidatePath(`/chat/${sessionId}`);
    return { success: true };
  } catch (err) {
    console.error("deleteChatSession error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to delete chat",
    };
  }
}

/**
 * Check if the signed-in user is allowed to use the app (internal access).
 * When ALLOWED_EMAIL_DOMAINS is set, only users whose email domain is in that list are allowed.
 * When unset, all signed-in users are allowed.
 */
export async function checkInternalAccess(clerkId: string): Promise<{
  allowed: boolean;
}> {
  const allowedDomains = getAllowedEmailDomains();
  if (allowedDomains.length === 0) return { allowed: true };

  let email: string | undefined;
  try {
    const user = await prisma.user.findUnique({ where: { clerkId } });
    if (user?.email) {
      email = user.email;
    } else {
      const client = await clerkClient();
      const u = await client.users.getUser(clerkId);
      email = u.emailAddresses[0]?.emailAddress ?? undefined;
    }
  } catch {
    return { allowed: false };
  }

  if (!email) return { allowed: false };
  const domain = email.split("@")[1]?.toLowerCase();
  if (!domain) return { allowed: false };
  return { allowed: allowedDomains.includes(domain) };
}

/**
 * Simple analytics counts for the current organization (tenant).
 * Requires auth and active org.
 */
export async function getAnalyticsCounts(organizationId: string): Promise<{
  messageCount: number;
  documentCount: number;
  embeddingCount: number;
  feedbackUp: number;
  feedbackDown: number;
} | null> {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) return null;
    const [documentCount, embeddingCount, sessionIds] = await Promise.all([
      prisma.document.count({ where: { organizationId } }),
      prisma.embedding.count({
        where: { document: { organizationId } },
      }),
      prisma.chatSession.findMany({
        where: { organizationId },
        select: { id: true },
      }),
    ]);
    const sessionIdList = sessionIds.map((s: { id: string }) => s.id);
    const [messageCount, feedbackUp, feedbackDown] = await Promise.all([
      prisma.message.count({
        where: { sessionId: { in: sessionIdList } },
      }),
      prisma.message.count({
        where: {
          sessionId: { in: sessionIdList },
          role: "assistant",
          feedback: 1,
        },
      }),
      prisma.message.count({
        where: {
          sessionId: { in: sessionIdList },
          role: "assistant",
          feedback: -1,
        },
      }),
    ]);
    return {
      messageCount,
      documentCount,
      embeddingCount,
      feedbackUp,
      feedbackDown,
    };
  } catch {
    return null;
  }
}
