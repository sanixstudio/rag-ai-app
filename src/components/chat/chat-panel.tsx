"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [pendingUserMessage, setPendingUserMessage] = useState<string | null>(
    null
  );
  const [streamingContent, setStreamingContent] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const sessionId = initialSessionId ?? undefined;

  const scrollToBottom = useCallback(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [initialMessages?.length, pendingUserMessage, streamingContent, scrollToBottom]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setSubmitError(null);
      const form = e.currentTarget;
      const content = (form.elements.namedItem("content") as HTMLTextAreaElement)
        ?.value?.trim();
      if (!content || content.length > 4000) {
        if (content && content.length > 4000) {
          toast.error("Message too long");
        }
        return;
      }

      setPendingUserMessage(content);
      setStreamingContent("");
      setIsStreaming(true);
      if (textareaRef.current) textareaRef.current.value = "";

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content,
            sessionId: sessionId || undefined,
          }),
        });

        const newSessionId = res.headers.get("X-Session-Id") ?? undefined;

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          const message =
            data?.error?.content?.[0] ?? data?.error ?? "Something went wrong";
          const errMsg = typeof message === "string" ? message : "Something went wrong";
          setSubmitError(errMsg);
          toast.error(errMsg);
          setPendingUserMessage(null);
          setStreamingContent("");
          setIsStreaming(false);
          return;
        }

        const reader = res.body?.getReader();
        if (!reader) {
          setSubmitError("No response body");
          setPendingUserMessage(null);
          setStreamingContent("");
          setIsStreaming(false);
          return;
        }

        const decoder = new TextDecoder();
        let accumulated = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          accumulated += decoder.decode(value, { stream: true });
          setStreamingContent(accumulated);
        }

        if (newSessionId && !initialSessionId) {
          router.replace(`/chat/${newSessionId}`);
        }
        router.refresh();
      } catch (err) {
        console.error("Stream fetch error:", err);
        const message = err instanceof Error ? err.message : "Something went wrong";
        setSubmitError(message);
        toast.error(message);
      } finally {
        setPendingUserMessage(null);
        setStreamingContent("");
        setIsStreaming(false);
      }
    },
    [sessionId, initialSessionId, router]
  );
  const displayMessages = initialMessages ?? [];
  const showThinking =
    isStreaming && !streamingContent && pendingUserMessage != null;

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1 px-4 py-6">
        <div className="mx-auto max-w-2xl space-y-6">
          {displayMessages.length === 0 && !pendingUserMessage && (
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
          {pendingUserMessage != null && (
            <div className="flex justify-end gap-3">
              <div className="max-w-[85%] rounded-lg bg-primary text-primary-foreground px-4 py-2.5">
                <p className="text-sm whitespace-pre-wrap">
                  {pendingUserMessage}
                </p>
              </div>
            </div>
          )}
          {showThinking && (
            <div className="flex justify-start gap-3">
              <div className="max-w-[85%] rounded-lg bg-muted px-4 py-2.5 flex items-center gap-2">
                <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Thinking…</span>
              </div>
            </div>
          )}
          {streamingContent && (
            <div className="flex justify-start gap-3">
              <div className="max-w-[85%] rounded-lg bg-muted px-4 py-2.5">
                <p className="text-sm whitespace-pre-wrap">{streamingContent}</p>
              </div>
            </div>
          )}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      <div className="border-t bg-background p-4">
        <form
          onSubmit={handleSubmit}
          className="mx-auto max-w-2xl flex gap-2"
        >
          <input
            type="hidden"
            name="sessionId"
            value={sessionId ?? ""}
          />
          <Textarea
            ref={textareaRef}
            name="content"
            placeholder="Ask a question..."
            rows={1}
            className="min-h-[44px] max-h-32 resize-none"
            disabled={isStreaming}
            required
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                e.currentTarget.form?.requestSubmit();
              }
            }}
          />
          <Button
            type="submit"
            size="icon"
            disabled={isStreaming}
            className="shrink-0 h-11 w-11"
          >
            {isStreaming ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            <span className="sr-only">Send</span>
          </Button>
        </form>
        {submitError && (
          <p className="mx-auto max-w-2xl mt-2 text-sm text-destructive">
            {submitError}
          </p>
        )}
      </div>
    </div>
  );
}
