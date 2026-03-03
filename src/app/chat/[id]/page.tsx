import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { getChatSession } from "@/actions/session";
import { ChatPanel } from "@/components/chat/chat-panel";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ChatSessionPage({ params }: PageProps) {
  const { id } = await params;
  const { userId: clerkId } = await auth();
  const session = await getChatSession(id, clerkId ?? null);
  if (!session) notFound();

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <ChatPanel
        initialSessionId={session.id}
        initialMessages={session.messages.map((m) => ({
          id: m.id,
          role: m.role as "user" | "assistant" | "system",
          content: m.content,
        }))}
      />
    </div>
  );
}
