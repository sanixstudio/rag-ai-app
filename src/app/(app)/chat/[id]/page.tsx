import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { getChatSession } from "@/actions/session";
import { getDocumentTags } from "@/actions/documents";
import { ChatPanel } from "@/components/chat/chat-panel";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ChatSessionPage({ params }: PageProps) {
  const { id } = await params;
  const { userId: clerkId } = await auth();
  const [session, initialTags] = await Promise.all([
    getChatSession(id, clerkId ?? null),
    getDocumentTags(),
  ]);
  if (!session) notFound();

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <ChatPanel
        initialSessionId={session.id}
        initialTags={initialTags}
        initialMessages={session.messages.map((m) => ({
          id: m.id,
          role: m.role as "user" | "assistant" | "system",
          content: m.content,
          sources: (m.sources ?? undefined) as
            | { documentId: string; documentTitle: string; chunkIndex?: number; chunkSnippet?: string }[]
            | undefined,
          feedback: m.feedback ?? undefined,
        }))}
      />
    </div>
  );
}
