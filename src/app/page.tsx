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
      <header className="sticky top-0 z-10 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className={`mx-auto ${CONTENT_MAX} flex h-16 items-center justify-between px-6 sm:px-8 lg:px-10`}>
          <Link
            href="/"
            className="flex items-center gap-3 font-semibold text-foreground hover:opacity-80 transition-opacity"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <BookOpen className="h-5 w-5" />
            </div>
            <span className="hidden sm:inline tracking-tight">Internal Knowledge Base</span>
            <span className="sm:hidden tracking-tight">Knowledge Base</span>
          </Link>
          <nav className="flex items-center gap-3">
            <ThemeToggle />
            <Button asChild size="default" className="rounded-xl px-5 font-medium shadow-sm">
              <Link href="/sign-in">Sign in</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section className={`mx-auto ${CONTENT_MAX} px-6 sm:px-8 lg:px-10 pt-24 pb-20 sm:pt-32 sm:pb-28`}>
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl md:text-6xl lg:text-6xl/none">
              Your knowledge base, one question away
            </h1>
            <p className="mt-6 text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto">
              Sign in to ask questions grounded in your company docs. Access is
              restricted to internal users only.
            </p>
            <div className="mt-10">
              <Button asChild size="lg" className="rounded-xl px-8 h-12 text-base font-medium shadow-md hover:shadow-lg transition-shadow">
                <Link href="/sign-in" className="inline-flex items-center justify-center gap-2">
                  Sign in to continue
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="border-t border-border/50 bg-muted/40 py-20 sm:py-28">
          <div className={`mx-auto ${CONTENT_MAX} px-6 sm:px-8 lg:px-10`}>
            <div className="mx-auto max-w-2xl text-center mb-14">
              <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
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

        <footer className="border-t border-border/50 py-10">
          <div className={`mx-auto ${CONTENT_MAX} px-6 sm:px-8 lg:px-10 text-center text-sm text-muted-foreground`}>
            <p>Internal RAG app · Next.js, OpenAI, Neon (pgvector), Clerk</p>
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
    <li className="group rounded-2xl border border-border/60 bg-card p-6 shadow-sm transition-all duration-200 hover:shadow-md hover:border-border">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary/15">
        {icon}
      </div>
      <h3 className="mt-4 font-semibold tracking-tight text-foreground">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{description}</p>
    </li>
  );
}
