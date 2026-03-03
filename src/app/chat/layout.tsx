import { auth } from "@clerk/nextjs/server";
import { getOrCreateUserByClerk } from "@/actions/session";
import { getChatSessions } from "@/actions/session";
import { ChatLayout } from "@/components/chat/chat-layout";

export default async function ChatRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let sessions: { id: string; title: string }[] = [];

  try {
    const { userId: clerkId } = await auth();
    if (clerkId) {
      const user = await getOrCreateUserByClerk(clerkId);
      if (user) {
        const list = await getChatSessions(user.id);
        sessions = list.map((s) => ({ id: s.id, title: s.title }));
      }
    }
  } catch {
    // Clerk not configured or DB error
  }

  return <ChatLayout initialSessions={sessions}>{children}</ChatLayout>;
}
