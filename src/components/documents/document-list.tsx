"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { FileText, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteDocument } from "@/actions/documents";
import { toast } from "sonner";
import type { DocumentListItem } from "@/actions/documents";

interface DocumentListProps {
  initialDocuments: DocumentListItem[];
}

export function DocumentList({ initialDocuments }: DocumentListProps) {
  const [documents, setDocuments] = useState(initialDocuments);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(id: string) {
    if (deletingId) return;
    setDeletingId(id);
    const result = await deleteDocument(id);
    setDeletingId(null);
    if (result.success) {
      setDocuments((prev) => prev.filter((d) => d.id !== id));
      toast.success("Document removed from knowledge base.");
    } else {
      toast.error(result.error ?? "Failed to delete");
    }
  }

  if (documents.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-muted/30 p-8 text-center text-muted-foreground">
        <FileText className="mx-auto h-10 w-10 opacity-50" />
        <p className="mt-2 font-medium">No documents yet</p>
        <p className="text-sm">Upload a PDF or TXT above to build your knowledge base.</p>
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {documents.map((doc) => (
        <li
          key={doc.id}
          className="flex items-center justify-between gap-4 rounded-lg border border-border bg-card px-4 py-3"
        >
          <div className="flex min-w-0 items-center gap-3">
            <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
            <div className="min-w-0">
              <p className="truncate font-medium text-foreground">{doc.title}</p>
              <p className="text-xs text-muted-foreground">
                {doc.chunkCount} chunks · added{" "}
                {formatDistanceToNow(new Date(doc.createdAt), { addSuffix: true })}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 text-muted-foreground hover:text-destructive"
            onClick={() => handleDelete(doc.id)}
            disabled={deletingId !== null}
            aria-label={`Delete ${doc.title}`}
          >
            {deletingId === doc.id ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
          </Button>
        </li>
      ))}
    </ul>
  );
}
