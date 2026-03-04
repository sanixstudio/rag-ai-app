import { getAnalyticsCounts } from "@/actions/session";
import { requireOrganizationId } from "@/lib/tenant";
import { MessageSquare, FileText, Layers, ThumbsUp, ThumbsDown } from "lucide-react";

export const metadata = {
  title: "Analytics | Knowledge Base",
  description: "Usage and feedback analytics for this workspace.",
};

export default async function AnalyticsPage() {
  const { organizationId } = await requireOrganizationId();
  const counts = organizationId ? await getAnalyticsCounts(organizationId) : null;

  if (!counts) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-10">
        <p className="text-muted-foreground">Sign in to view analytics.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-10 sm:px-8">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl mb-8">Analytics</h1>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          icon={<MessageSquare className="h-5 w-5" />}
          label="Total messages"
          value={counts.messageCount}
        />
        <StatCard
          icon={<FileText className="h-5 w-5" />}
          label="Documents in base"
          value={counts.documentCount}
        />
        <StatCard
          icon={<Layers className="h-5 w-5" />}
          label="Chunks indexed"
          value={counts.embeddingCount}
        />
        <StatCard
          icon={<ThumbsUp className="h-5 w-5" />}
          label="Thumbs up"
          value={counts.feedbackUp}
        />
        <StatCard
          icon={<ThumbsDown className="h-5 w-5" />}
          label="Thumbs down"
          value={counts.feedbackDown}
        />
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">{icon}</div>
      <p className="mt-3 text-2xl font-semibold tracking-tight text-foreground">{value.toLocaleString()}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}
