"use client";

import { useState, useMemo } from "react";
import { formatDistanceToNow } from "date-fns";
import { FileText, Trash2, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { deleteDocument, reingestDocument } from "@/actions/documents";
import { toast } from "sonner";
import type { DocumentListItem } from "@/actions/documents";

interface DocumentListProps {
  initialDocuments: DocumentListItem[];
}

export function DocumentList({ initialDocuments }: DocumentListProps) {
  const [documents, setDocuments] = useState(initialDocuments);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [reingestingId, setReingestingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [sort, setSort] = useState<"date" | "title">("date");

  const filteredAndSorted = useMemo(() => {
    let list = documents;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((d) => d.title.toLowerCase().includes(q));
    }
    if (tagFilter) {
      list = list.filter((d) => d.tags?.includes(tagFilter));
    }
    if (sort === "title") {
      list = [...list].sort((a, b) => a.title.localeCompare(b.title));
    } else {
      list = [...list].sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
    }
    return list;
  }, [documents, search, tagFilter, sort]);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    for (const d of documents) {
      for (const t of d.tags ?? []) set.add(t);
    }
    return Array.from(set).sort();
  }, [documents]);

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

  async function handleReingest(doc: DocumentListItem) {
    if (reingestingId) return;
    setReingestingId(doc.id);
    const result = await reingestDocument(doc.id);
    setReingestingId(null);
    if (result.success) {
      setDocuments((prev) =>
        prev.map((d) =>
          d.id === doc.id
            ? { ...d, chunkCount: result.chunks ?? d.chunkCount, updatedAt: new Date() }
            : d
        )
      );
      toast.success(`Re-indexed "${doc.title}" (${result.chunks} chunks).`);
    } else {
      toast.error(result.error ?? "Failed to re-index");
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
    <div className="space-y-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
        <Input
          placeholder="Search by title..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs rounded-xl border-border/60"
        />
        <select
          value={tagFilter}
          onChange={(e) => setTagFilter(e.target.value)}
          className="rounded-xl border border-input bg-background px-3 py-2 text-sm max-w-[180px]"
        >
          <option value="">All tags</option>
          {allTags.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as "date" | "title")}
          className="rounded-xl border border-input bg-background px-3 py-2 text-sm max-w-[180px]"
        >
          <option value="date">Sort by date</option>
          <option value="title">Sort by title</option>
        </select>
      </div>
      <ul className="space-y-2">
        {filteredAndSorted.map((doc) => (
          <li
            key={doc.id}
            className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border/60 bg-card px-4 py-3 shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
              <div className="min-w-0">
                <p className="truncate font-medium text-foreground">{doc.title}</p>
                <p className="text-xs text-muted-foreground">
                  {doc.chunkCount} chunks
                  {doc.tags?.length ? ` · ${doc.tags.join(", ")}` : ""}
                  {" · "}
                  last indexed {formatDistanceToNow(new Date(doc.updatedAt), { addSuffix: true })}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-foreground"
                onClick={() => handleReingest(doc)}
                disabled={reingestingId !== null}
                aria-label={`Re-index ${doc.title}`}
              >
                {reingestingId === doc.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-destructive"
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
            </div>
          </li>
        ))}
      </ul>
      {filteredAndSorted.length === 0 && (
        <p className="text-sm text-muted-foreground">No documents match your filters.</p>
      )}
    </div>
  );
}
