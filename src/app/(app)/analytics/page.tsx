import { getAnalyticsCounts } from "@/actions/session";
import { MessageSquare, FileText, Layers, ThumbsUp, ThumbsDown } from "lucide-react";

export const metadata = {
  title: "Analytics | Internal Knowledge Base",
  description: "Usage and feedback analytics.",
};

export default async function AnalyticsPage() {
  const counts = await getAnalyticsCounts();

  if (!counts) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <p className="text-muted-foreground">Sign in to view analytics.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-semibold text-foreground mb-6">Analytics</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-muted-foreground">{icon}</div>
      <p className="mt-2 text-2xl font-semibold text-foreground">{value.toLocaleString()}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}
