/**
 * Example embedding ingestion script.
 * Run with: npx tsx scripts/ingest-embeddings.ts
 *
 * Prerequisites:
 * - DATABASE_URL and OPENAI_API_KEY in .env
 * - Migrations applied (including pgvector)
 *
 * This script:
 * 1. Reads sample documents (or use your own source)
 * 2. Chunks text
 * 3. Generates embeddings via OpenAI
 * 4. Inserts into Document + Embedding tables (vector via raw SQL)
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import OpenAI from "openai";
import { nanoid } from "nanoid";

const EMBEDDING_MODEL = "text-embedding-3-small";
const EMBEDDING_DIMENSION = 1536;
const CHUNK_SIZE = 800;
const CHUNK_OVERLAP = 100;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function chunkText(text: string): string[] {
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    let end = Math.min(start + CHUNK_SIZE, text.length);
    if (end < text.length) {
      const lastSpace = text.lastIndexOf(" ", end);
      if (lastSpace > start) end = lastSpace;
    }
    chunks.push(text.slice(start, end).trim());
    start = end - (end < text.length ? CHUNK_OVERLAP : 0);
  }
  return chunks.filter(Boolean);
}

async function embedBatch(texts: string[]): Promise<number[][]> {
  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: texts.map((t) => t.slice(0, 8191)),
  });
  const sorted = response.data.sort((a, b) => a.index - b.index);
  return sorted.map((d) => d.embedding);
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL required");
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY required");

  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter });

  const sampleDocs = [
    {
      title: "Getting Started",
      content: `Welcome to the internal knowledge base. This RAG assistant answers questions using semantic search over your documents.
        To get the best answers, ask clear questions. You can ask about processes, policies, or any documented topic.
        All answers are grounded in the ingested content.`,
    },
    {
      title: "API Usage",
      content: `Our API uses REST. Base URL: https://api.example.com/v1. Authentication is via Bearer token in the Authorization header.
        Rate limits: 100 requests per minute per key. Contact support for higher limits.`,
    },
  ];

  for (const doc of sampleDocs) {
    const chunks = chunkText(doc.content);
    if (chunks.length === 0) continue;

    const embeddings = await embedBatch(chunks);

    const document = await prisma.document.create({
      data: {
        title: doc.title,
        content: doc.content,
        sourceUrl: null,
        metadata: {},
      },
    });

    for (let i = 0; i < chunks.length; i++) {
      const vectorStr = `[${embeddings[i].join(",")}]`;
      const id = nanoid();
      await prisma.$executeRawUnsafe(
        `INSERT INTO "Embedding" (id, "documentId", "chunkIndex", "chunkText", embedding, "createdAt")
         VALUES ($1, $2, $3, $4, $5::vector, NOW())`,
        id,
        document.id,
        i,
        chunks[i],
        vectorStr
      );
    }
    console.log(`Ingested "${doc.title}" with ${chunks.length} chunks.`);
  }

  console.log("Done.");
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
