"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { sendMessage } from "@/actions/chat";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Send } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
}

interface ChatPanelProps {
  initialSessionId?: string;
  initialMessages?: ChatMessage[];
}

export function ChatPanel({
  initialSessionId,
  initialMessages = [],
}: ChatPanelProps) {
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [state, formAction, isPending] = useActionState(
    async (_: unknown, formData: FormData) => {
      return sendMessage(formData);
    },
    null
  );

  const sessionId = state?.sessionId ?? initialSessionId;
  const messages: ChatMessage[] = initialMessages ?? [];

  useEffect(() => {
    if (!state?.success) return;
    if (state.sessionId && !initialSessionId) {
      router.replace(`/chat/${state.sessionId}`);
    }
    router.refresh();
  }, [state?.success, state?.sessionId, initialSessionId, router]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const displayMessages = messages;

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1 px-4 py-6">
        <div className="mx-auto max-w-2xl space-y-6">
          {displayMessages.length === 0 && (
            <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
              <p className="font-medium">Ask anything from your knowledge base</p>
              <p className="mt-1 text-sm">
                Your question will be answered using semantic search over internal docs.
              </p>
            </div>
          )}
          {displayMessages.map((m) => (
            <div
              key={m.id}
              className={cn(
                "flex gap-3",
                m.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              <div
                className={cn(
                  "max-w-[85%] rounded-lg px-4 py-2.5",
                  m.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                )}
              >
                <p className="text-sm whitespace-pre-wrap">{m.content}</p>
              </div>
            </div>
          ))}
          {isPending && (
            <div className="flex justify-start gap-3">
              <div className="max-w-[85%] rounded-lg bg-muted px-4 py-2.5">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            </div>
          )}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      <div className="border-t bg-background p-4">
        <form
          action={formAction}
          className="mx-auto max-w-2xl flex gap-2"
        >
          <input
            type="hidden"
            name="sessionId"
            value={sessionId ?? ""}
          />
          <Textarea
            name="content"
            placeholder="Ask a question..."
            rows={1}
            className="min-h-[44px] max-h-32 resize-none"
            disabled={isPending}
            required
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                e.currentTarget.form?.requestSubmit();
              }
            }}
          />
          <Button type="submit" size="icon" disabled={isPending} className="shrink-0 h-11 w-11">
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            <span className="sr-only">Send</span>
          </Button>
        </form>
        {state?.error?.content && (
          <p className="mx-auto max-w-2xl mt-2 text-sm text-destructive">
            {state.error.content[0]}
          </p>
        )}
      </div>
    </div>
  );
}
