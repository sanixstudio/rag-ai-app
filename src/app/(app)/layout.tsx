import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { getOrCreateUserByClerk, getChatSessions, checkInternalAccess } from "@/actions/session";
import { ChatLayout } from "@/components/chat/chat-layout";

/**
 * Internal app shell: chat and knowledge base. Requires sign-in and optional allowlist.
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId: clerkId } = await auth();
  if (!clerkId) redirect("/sign-in");

  const access = await checkInternalAccess(clerkId);
  if (!access.allowed) {
    redirect("/sign-in?error=access_restricted");
  }

  const user = await getOrCreateUserByClerk(clerkId);
  const sessions = user
    ? (await getChatSessions(user.id)).map((s) => ({ id: s.id, title: s.title }))
    : [];

  return (
    <ChatLayout initialSessions={sessions}>
      {children}
    </ChatLayout>
  );
}
