import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { getChatSession } from "@/actions/session";
import { getDocumentTags, getDocumentCount } from "@/actions/documents";
import { requireOrganizationId } from "@/lib/tenant";
import { ChatPanel } from "@/components/chat/chat-panel";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ChatSessionPage({ params }: PageProps) {
  const { id } = await params;
  const { userId: clerkId } = await auth();
  const { organizationId } = await requireOrganizationId();
  if (!organizationId) notFound();
  const [session, initialTags, documentCount] = await Promise.all([
    getChatSession(id, clerkId ?? null, organizationId),
    getDocumentTags(),
    getDocumentCount(),
  ]);
  if (!session) notFound();
  const isKnowledgeBaseEmpty = documentCount === 0;

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <ChatPanel
        initialSessionId={session.id}
        initialTags={initialTags}
        initialMessages={session.messages.map((m: { id: string; role: string; content: string; sources: unknown; feedback: number | null }) => ({
          id: m.id,
          role: m.role as "user" | "assistant" | "system",
          content: m.content,
          sources: (m.sources ?? undefined) as
            | { documentId: string; documentTitle: string; chunkIndex?: number; chunkSnippet?: string }[]
            | undefined,
          feedback: m.feedback ?? undefined,
        }))}
        isKnowledgeBaseEmpty={isKnowledgeBaseEmpty}
      />
    </div>
  );
}
