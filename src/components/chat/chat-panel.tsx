"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import Link from "next/link";
import { Loader2, Send, ThumbsUp, ThumbsDown, FileText, ChevronRight, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import { submitMessageFeedback } from "@/actions/chat";

export interface MessageSource {
  documentId: string;
  documentTitle: string;
  chunkIndex?: number;
  chunkSnippet?: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  sources?: MessageSource[];
  feedback?: number | null;
}

interface ChatPanelProps {
  initialSessionId?: string;
  initialMessages?: ChatMessage[];
  /** Tags for "Filter by source" dropdown */
  initialTags?: string[];
  /** When true, show a prompt to add documents (PDF/TXT) in the empty state */
  isKnowledgeBaseEmpty?: boolean;
}

export function ChatPanel({
  initialSessionId,
  initialMessages = [],
  initialTags = [],
  isKnowledgeBaseEmpty = false,
}: ChatPanelProps) {
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [pendingUserMessage, setPendingUserMessage] = useState<string | null>(null);
  const [streamingContent, setStreamingContent] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [tagFilter, setTagFilter] = useState<string>("");
  const [feedbackLoadingId, setFeedbackLoadingId] = useState<string | null>(null);

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
      const content = (form.elements.namedItem("content") as HTMLTextAreaElement)?.value?.trim();
      if (!content || content.length > 4000) {
        if (content && content.length > 4000) toast.error("Message too long");
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
            tagFilter: tagFilter || undefined,
          }),
        });

        const newSessionId = res.headers.get("X-Session-Id") ?? undefined;

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          const message = data?.error?.content?.[0] ?? data?.error ?? "Something went wrong";
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
    [sessionId, initialSessionId, router, tagFilter]
  );

  async function handleFeedback(messageId: string, value: 1 | -1) {
    setFeedbackLoadingId(messageId);
    const result = await submitMessageFeedback(messageId, value);
    setFeedbackLoadingId(null);
    if (result.success) {
      router.refresh();
      toast.success(value === 1 ? "Thanks for your feedback" : "Feedback recorded");
    } else {
      toast.error(result.error);
    }
  }

  const displayMessages = initialMessages ?? [];
  const showThinking = isStreaming && !streamingContent && pendingUserMessage != null;

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1 px-4 py-6">
        <div className="mx-auto max-w-2xl space-y-6">
          {displayMessages.length === 0 && !pendingUserMessage && (
            <div className="rounded-2xl border border-dashed border-border/60 bg-muted/30 p-10 text-center">
              <p className="font-semibold tracking-tight text-foreground">
                Ask anything from your knowledge base
              </p>
              <p className="mt-2 text-sm text-muted-foreground max-w-sm mx-auto">
                Your question will be answered using semantic search over your workspace documents.
              </p>
              {isKnowledgeBaseEmpty && (
                <div className="mt-5 flex flex-col items-center gap-2">
                  <p className="text-sm text-muted-foreground">
                    No documents yet. Add PDF or TXT files so the assistant can answer from your content.
                  </p>
                  <Button variant="outline" size="sm" asChild className="rounded-xl">
                    <Link href="/documents" className="inline-flex items-center gap-2">
                      <Upload className="h-4 w-4" aria-hidden />
                      Add documents
                    </Link>
                  </Button>
                </div>
              )}
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
                  "max-w-[85%] rounded-2xl px-4 py-3 shadow-sm",
                  m.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/80 border border-border/40"
                )}
              >
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.content}</p>
                {m.role === "assistant" && (
                  <>
                    {m.sources && m.sources.length > 0 ? (
                      <div className="mt-3 pt-3 border-t border-border/50 space-y-2">
                        <p className="text-xs font-medium text-muted-foreground">Sources</p>
                        <ul className="text-xs text-muted-foreground space-y-1">
                          {m.sources.map((s, i) => (
                            <li key={i}>
                              <span className="font-medium">{s.documentTitle}</span>
                              {s.chunkSnippet && (
                                <span className="block mt-0.5 opacity-90 truncate max-w-full">
                                  {s.chunkSnippet}
                                </span>
                              )}
                            </li>
                          ))}
                        </ul>
                        <details className="group mt-2">
                          <summary className="flex items-center gap-1 text-xs cursor-pointer list-none text-muted-foreground hover:text-foreground">
                            <ChevronRight className="h-3 w-3 group-open:rotate-90 transition-transform" />
                            Why this answer?
                          </summary>
                          <ul className="mt-2 pl-4 space-y-2 text-xs text-muted-foreground">
                            {m.sources.map((s, i) => (
                              <li key={i} className="flex gap-2">
                                <FileText className="h-3 w-3 shrink-0 mt-0.5" />
                                <span>
                                  <strong>{s.documentTitle}</strong>
                                  {s.chunkSnippet && (
                                    <span className="block mt-0.5 italic">&quot;{s.chunkSnippet}&quot;</span>
                                  )}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </details>
                      </div>
                    ) : (
                      <p className="mt-2 text-xs text-muted-foreground italic">
                        No matching documents were used for this answer.
                      </p>
                    )}
                    <div className="flex gap-1 mt-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-green-600"
                        onClick={() => handleFeedback(m.id, 1)}
                        disabled={feedbackLoadingId === m.id}
                        aria-label="Thumbs up"
                      >
                        <ThumbsUp
                          className={cn("h-3.5 w-3.5", m.feedback === 1 && "fill-current")}
                        />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-red-600"
                        onClick={() => handleFeedback(m.id, -1)}
                        disabled={feedbackLoadingId === m.id}
                        aria-label="Thumbs down"
                      >
                        <ThumbsDown
                          className={cn("h-3.5 w-3.5", m.feedback === -1 && "fill-current")}
                        />
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </div>
          ))}
          {pendingUserMessage != null && (
            <div className="flex justify-end gap-3">
              <div className="max-w-[85%] rounded-2xl bg-primary text-primary-foreground px-4 py-3 shadow-sm">
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{pendingUserMessage}</p>
              </div>
            </div>
          )}
          {showThinking && (
            <div className="flex justify-start gap-3">
              <div className="max-w-[85%] rounded-2xl bg-muted/80 border border-border/40 px-4 py-3 flex items-center gap-2 shadow-sm">
                <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Thinking…</span>
              </div>
            </div>
          )}
          {streamingContent && (
            <div className="flex justify-start gap-3">
              <div className="max-w-[85%] rounded-2xl bg-muted/80 border border-border/40 px-4 py-3 shadow-sm">
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{streamingContent}</p>
              </div>
            </div>
          )}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      <div className="border-t border-border/50 bg-background/95 backdrop-blur-sm p-4">
        <form onSubmit={handleSubmit} className="mx-auto max-w-2xl space-y-3">
          {initialTags.length > 0 && (
            <div className="flex items-center gap-2">
              <label htmlFor="tag-filter" className="text-xs font-medium text-muted-foreground shrink-0">
                Filter by source:
              </label>
              <select
                id="tag-filter"
                value={tagFilter}
                onChange={(e) => setTagFilter(e.target.value)}
                className="rounded-xl border border-input bg-background px-3 py-1.5 text-sm"
              >
                <option value="">All documents</option>
                {initialTags.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="flex gap-2">
            <input type="hidden" name="sessionId" value={sessionId ?? ""} />
            <Textarea
              ref={textareaRef}
              name="content"
              placeholder="Ask a question..."
              rows={1}
              className="min-h-[46px] max-h-32 resize-none rounded-xl border-border/60 focus-visible:ring-2"
              disabled={isStreaming}
              required
              onKeyDown={(e) => {
                if (e.key === "Enter" && (!e.shiftKey || e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  e.currentTarget.form?.requestSubmit();
                }
                if (e.key === "Escape") {
                  (e.target as HTMLTextAreaElement).blur();
                }
              }}
            />
            <Button
              type="submit"
              size="icon"
              disabled={isStreaming}
              className="shrink-0 h-11 w-11 rounded-xl shadow-sm"
            >
              {isStreaming ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              <span className="sr-only">Send</span>
            </Button>
          </div>
        </form>
        {submitError && (
          <p className="mx-auto max-w-2xl mt-2 text-sm text-destructive">{submitError}</p>
        )}
      </div>
    </div>
  );
}
