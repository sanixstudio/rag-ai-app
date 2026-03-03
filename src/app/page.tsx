import Link from "next/link";
import { redirect } from "next/navigation";
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
  const { userId } = await auth();
  if (userId) redirect("/chat");

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-10 border-b border-border/40 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80">
        <div className={`mx-auto ${CONTENT_MAX} flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8`}>
          <Link
            href="/"
            className="flex items-center gap-2.5 font-semibold text-foreground hover:opacity-90 transition-opacity"
          >
            <BookOpen className="h-6 w-6 text-primary shrink-0" />
            <span className="hidden sm:inline">Internal Knowledge Base</span>
            <span className="sm:hidden">Knowledge Base</span>
          </Link>
          <nav className="flex items-center gap-2">
            <ThemeToggle />
            <Button asChild size="sm" className="shrink-0">
              <Link href="/sign-in">Sign in</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section className={`mx-auto ${CONTENT_MAX} px-4 sm:px-6 lg:px-8 pt-20 pb-16 sm:pt-28 sm:pb-24`}>
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl md:text-6xl">
              Internal knowledge base, one question away
            </h1>
            <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
              Sign in to ask questions grounded in your company docs. Access is
              restricted to internal users only.
            </p>
            <div className="mt-10">
              <Button asChild size="lg" className="min-w-[200px]">
                <Link href="/sign-in" className="inline-flex items-center justify-center gap-2">
                  Sign in to continue
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="border-t border-border/40 bg-muted/30 py-16 sm:py-24">
          <div className={`mx-auto ${CONTENT_MAX} px-4 sm:px-6 lg:px-8`}>
            <div className="mx-auto max-w-2xl text-center mb-12">
              <h2 className="text-2xl font-semibold text-foreground sm:text-3xl">
                For internal use only
              </h2>
              <p className="mt-3 text-muted-foreground">
                Upload documents, then ask questions. Only authenticated users
                with allowed access can use the app.
              </p>
            </div>
            <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <FeatureCard
                icon={<Search className="h-5 w-5" />}
                title="Semantic search"
                description="Find answers by meaning, not just keywords."
              />
              <FeatureCard
                icon={<Shield className="h-5 w-5" />}
                title="Access controlled"
                description="Sign-in required. Optional allowlist by email domain."
              />
              <FeatureCard
                icon={<Zap className="h-5 w-5" />}
                title="Fast retrieval"
                description="Vector search over your knowledge base."
              />
              <FeatureCard
                icon={<MessageSquare className="h-5 w-5" />}
                title="Chat history"
                description="Save and revisit conversations anytime."
              />
              <FeatureCard
                icon={<BookOpen className="h-5 w-5" />}
                title="Grounded answers"
                description="Responses cite your docs only. No external web."
              />
            </ul>
          </div>
        </section>

        <footer className="border-t border-border/40 py-8">
          <div className={`mx-auto ${CONTENT_MAX} px-4 sm:px-6 lg:px-8 text-center text-sm text-muted-foreground`}>
            <p>Internal RAG app. Next.js, OpenAI, Neon (pgvector), Clerk.</p>
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
