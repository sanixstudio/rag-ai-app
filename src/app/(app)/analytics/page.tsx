import { getAnalyticsCounts } from "@/actions/session";
import { requireOrganizationId } from "@/lib/tenant";
import { MessageSquare, FileText, Layers, ThumbsUp, ThumbsDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = {
  title: "Analytics | Knowledge Base",
  description: "Usage and feedback analytics for this workspace.",
};

export default async function AnalyticsPage() {
  const { organizationId } = await requireOrganizationId();
  const counts = organizationId ? await getAnalyticsCounts(organizationId) : null;

  if (!counts) {
    return (
      <div className="flex flex-1 flex-col overflow-auto">
        <div className="mx-auto max-w-2xl px-6 py-10">
          <p className="text-muted-foreground">Sign in to view analytics.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-auto">
      <div className="mx-auto w-full max-w-4xl px-6 py-10 sm:px-8">
        <header className="mb-10">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Analytics
          </h1>
          <p className="mt-2 text-muted-foreground max-w-xl">
            Usage and feedback metrics for your workspace knowledge base.
          </p>
        </header>
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
    <Card className="border-border/60 shadow-sm transition-all duration-200 hover:shadow-md hover:border-border/80">
      <CardContent className="flex flex-col gap-3 pt-6">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          {icon}
        </span>
        <p className="text-2xl font-semibold tracking-tight text-foreground">{value.toLocaleString()}</p>
        <p className="text-sm text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}
