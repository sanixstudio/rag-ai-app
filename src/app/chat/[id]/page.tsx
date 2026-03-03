import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { getChatSession } from "@/actions/session";
import { ChatPanel } from "@/components/chat/chat-panel";
import { Button } from "@/components/ui/button";
import { MessageSquare, ArrowLeft } from "lucide-react";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ChatSessionPage({ params }: PageProps) {
  const { id } = await params;
  const { userId: clerkId } = await auth();
  const session = await getChatSession(id, clerkId ?? null);
  if (!session) notFound();

  return (
    <div className="flex flex-col h-screen bg-background">
      <header className="border-b shrink-0">
        <div className="container flex h-14 items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/chat" aria-label="Back to chat">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            <span className="font-semibold truncate">{session.title}</span>
          </div>
        </div>
      </header>
      <main className="flex-1 overflow-hidden">
        <ChatPanel
          initialSessionId={session.id}
          initialMessages={session.messages.map((m) => ({
            id: m.id,
            role: m.role as "user" | "assistant" | "system",
            content: m.content,
          }))}
        />
      </main>
    </div>
  );
}
