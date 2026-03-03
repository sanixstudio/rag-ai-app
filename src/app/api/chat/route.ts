import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { generateRagResponseStream } from "@/ai/chat";
import type { SimilarChunk } from "@/db/vectors";
import { prisma } from "@/db";
import { getOrCreateUserByClerk, getChatSession } from "@/actions/session";
import { sendMessageSchema } from "@/lib/validations";
import { ERROR_MESSAGES } from "@/lib/errors";

/**
 * POST /api/chat — Stream RAG response.
 * Body: { content: string, sessionId?: string }
 * Response: stream of UTF-8 text chunks; header X-Session-Id set for client redirect.
 * Creates session and saves user message before streaming; saves assistant message when stream ends.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const parsed = sendMessageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { content, sessionId: existingSessionId, tagFilter } = parsed.data;
  let sessionId = existingSessionId;

  const { userId: clerkId } = await auth();
  if (!clerkId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await getOrCreateUserByClerk(clerkId);
  const userId = user?.id ?? null;

  if (existingSessionId) {
    const session = await getChatSession(existingSessionId, clerkId);
    if (!session) {
      return NextResponse.json(
        { error: "Chat not found or access denied." },
        { status: 403 }
      );
    }
  }

  try {
    if (!sessionId) {
      const session = await prisma.chatSession.create({
        data: {
          userId,
          title: content.slice(0, 50) || "New chat",
        },
      });
      sessionId = session.id;
    }

    await prisma.message.create({
      data: {
        sessionId,
        role: "user",
        content,
      },
    });

    const encoder = new TextEncoder();
    let fullContent = "";
    const sourcesChunks: { documentId: string; documentTitle: string; chunkIndex: number; chunkText: string }[] = [];

    const streamWithPersistence = new ReadableStream({
      async start(controller) {
        try {
          for await (const delta of generateRagResponseStream(content, {
            tagFilter: tagFilter ?? undefined,
            onRetrieval(chunks: SimilarChunk[]) {
              sourcesChunks.push(
                ...chunks.map((c: SimilarChunk) => ({
                  documentId: c.documentId,
                  documentTitle: c.documentTitle,
                  chunkIndex: c.chunkIndex,
                  chunkText: c.chunkText.slice(0, 300),
                }))
              );
            },
          })) {
            fullContent += delta;
            controller.enqueue(encoder.encode(delta));
          }
        } catch (err) {
          console.error("RAG stream error:", err);
          const fallback = "\n\nSorry, something went wrong. Please try again.";
          fullContent += fallback;
          controller.enqueue(encoder.encode(fallback));
        }

        try {
          if (sessionId && fullContent) {
            const sources = sourcesChunks.length > 0
              ? sourcesChunks.map((s: { documentId: string; documentTitle: string; chunkIndex: number; chunkText: string }) => ({
                  documentId: s.documentId,
                  documentTitle: s.documentTitle,
                  chunkIndex: s.chunkIndex,
                  chunkSnippet: s.chunkText,
                }))
              : undefined;
            await prisma.message.create({
              data: {
                sessionId,
                role: "assistant",
                content: fullContent,
                sources: sources ?? undefined,
              },
            });
            await prisma.chatSession.update({
              where: { id: sessionId },
              data: { updatedAt: new Date() },
            });
          }
        } catch (dbErr) {
          console.error("Failed to persist assistant message:", dbErr);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(streamWithPersistence, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "X-Session-Id": sessionId ?? "",
      },
    });
  } catch (err) {
    console.error("POST /api/chat error:", err);
    return NextResponse.json(
      { error: ERROR_MESSAGES.chat.generic },
      { status: 500 }
    );
  }
}
