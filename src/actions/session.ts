"use server";

import { auth, clerkClient } from "@clerk/nextjs/server";
import { prisma } from "@/db";

/**
 * Get or create a User record from the current Clerk user.
 * Returns null if not signed in.
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
 * List chat sessions for the current user (or by session ids for anonymous).
 */
export async function getChatSessions(userId: string | null) {
  if (userId) {
    return prisma.chatSession.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      include: { messages: { take: 1, orderBy: { createdAt: "desc" } } },
    });
  }
  return [];
}

/**
 * Get a single chat session with messages (for viewing history).
 * @param sessionId - Chat session id
 * @param clerkIdOrUserId - Clerk user id (we resolve to internal User id) or internal userId; null for anonymous
 */
export async function getChatSession(
  sessionId: string,
  clerkIdOrUserId: string | null
) {
  const session = await prisma.chatSession.findUnique({
    where: { id: sessionId },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
  if (!session) return null;
  if (!session.userId) return session; // Anonymous session: allow anyone
  if (!clerkIdOrUserId) return null; // Session belongs to a user, viewer is anonymous
  const ourUser = await prisma.user.findFirst({
    where: {
      OR: [{ clerkId: clerkIdOrUserId }, { id: clerkIdOrUserId }],
    },
  });
  if (!ourUser || session.userId !== ourUser.id) return null;
  return session;
}
