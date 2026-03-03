import Link from "next/link";
import {
  Search,
  Shield,
  Zap,
  MessageSquare,
  ArrowRight,
  BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { auth } from "@clerk/nextjs/server";

const CONTENT_MAX = "max-w-6xl";

export default async function HomePage() {
  let userId: string | null = null;
  try {
    const session = await auth();
    userId = session?.userId ?? null;
  } catch {
    // Clerk not configured or unavailable
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border/40 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80">
        <div className={`mx-auto ${CONTENT_MAX} flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8`}>
          <Link
            href="/"
            className="flex items-center gap-2.5 font-semibold text-foreground hover:opacity-90 transition-opacity"
          >
            <BookOpen className="h-6 w-6 text-primary shrink-0" />
            <span className="hidden sm:inline">RAG Knowledge Assistant</span>
            <span className="sm:hidden">RAG Assistant</span>
          </Link>
          <nav className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm" className="shrink-0">
              <Link href="/documents">Knowledge base</Link>
            </Button>
            <ThemeToggle />
            {userId ? (
              <Button asChild size="sm" className="shrink-0">
                <Link href="/chat">Open Chat</Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm" className="shrink-0">
                  <Link href="/sign-in">Sign in</Link>
                </Button>
                <Button asChild size="sm" className="shrink-0">
                  <Link href="/sign-up">Get started</Link>
                </Button>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className={`mx-auto ${CONTENT_MAX} px-4 sm:px-6 lg:px-8 pt-20 pb-16 sm:pt-28 sm:pb-24`}>
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl md:text-6xl">
              Your internal knowledge, one question away
            </h1>
            <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
              Ask questions in plain language. Get accurate answers grounded in your
              company docs—with semantic search, security, and speed built in.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button asChild size="lg" className="w-full sm:w-auto min-w-[200px]">
                <Link href={userId ? "/chat" : "/sign-up"} className="inline-flex items-center justify-center gap-2">
                  Start asking questions
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="w-full sm:w-auto min-w-[200px]">
                <Link href="/chat">Try without account</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="border-t border-border/40 bg-muted/30 py-16 sm:py-24">
          <div className={`mx-auto ${CONTENT_MAX} px-4 sm:px-6 lg:px-8`}>
            <div className="mx-auto max-w-2xl text-center mb-12">
              <h2 className="text-2xl font-semibold text-foreground sm:text-3xl">
                Why use this assistant
              </h2>
              <p className="mt-3 text-muted-foreground">
                Built for teams that need reliable, fast answers from their own data.
              </p>
            </div>
            <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <FeatureCard
                icon={<Search className="h-5 w-5" />}
                title="Semantic search"
                description="Find answers by meaning, not just keywords. Understands context and intent."
              />
              <FeatureCard
                icon={<Shield className="h-5 w-5" />}
                title="Secure & internal"
                description="Your data stays in your control. No public indexing, enterprise-ready."
              />
              <FeatureCard
                icon={<Zap className="h-5 w-5" />}
                title="Fast retrieval"
                description="Vector search over embeddings. Get relevant chunks in milliseconds."
              />
              <FeatureCard
                icon={<MessageSquare className="h-5 w-5" />}
                title="Chat history"
                description="Signed-in users can save and revisit conversations anytime."
              />
              <FeatureCard
                icon={<BookOpen className="h-5 w-5" />}
                title="Grounded answers"
                description="Responses cite your knowledge base. No hallucination from external web."
              />
            </ul>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-border/40 py-8">
          <div className={`mx-auto ${CONTENT_MAX} px-4 sm:px-6 lg:px-8 text-center text-sm text-muted-foreground`}>
            <p>
              Built with Next.js, OpenAI, Neon PostgreSQL (pgvector), and Clerk.
              Deploy on Vercel in minutes.
            </p>
          </div>
        </footer>
      </main>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <li className="rounded-xl border border-border bg-card p-6 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </div>
      <h3 className="mt-4 font-semibold text-foreground">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{description}</p>
    </li>
  );
}
