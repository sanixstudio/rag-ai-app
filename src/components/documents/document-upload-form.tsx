"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Upload, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { uploadDocument } from "@/actions/documents";

export function DocumentUploadForm() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [state, formAction, isPending] = useActionState(
    async (_: unknown, formData: FormData) => uploadDocument(formData),
    null as Awaited<ReturnType<typeof uploadDocument>> | null
  );

  useEffect(() => {
    if (!state) return;
    if (state.success) {
      toast.success(`"${state.title}" added (${state.chunks} chunks).`);
      queueMicrotask(() => setSelectedFile(null));
      router.refresh();
    } else {
      toast.error(state.error);
    }
  }, [state, router]);

  const formKey = state?.success ? state.documentId : "upload";

  return (
    <form key={formKey} action={formAction} className="space-y-5">
      <div
        className="rounded-2xl border-2 border-dashed border-border/70 bg-muted/20 p-10 transition-all duration-200 hover:border-primary/30 hover:bg-muted/40 focus-within:border-primary/40 focus-within:bg-muted/40 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2"
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}
        role="button"
        tabIndex={0}
      >
        <input
          ref={fileInputRef}
          type="file"
          name="file"
          accept=".pdf,.txt,application/pdf,text/plain"
          className="sr-only"
          disabled={isPending}
          required
          onChange={(e) => setSelectedFile(e.target.files?.[0]?.name ?? null)}
        />
        <label className="flex flex-col items-center gap-3 cursor-pointer pointer-events-none">
          {selectedFile ? (
            <>
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <FileText className="h-6 w-6" />
              </span>
              <span className="text-sm font-medium text-foreground truncate max-w-xs">{selectedFile}</span>
              <span className="text-xs text-muted-foreground">Ready to upload</span>
            </>
          ) : (
            <>
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                <Upload className="h-6 w-6" />
              </span>
              <span className="text-sm font-medium text-foreground">Drop a file or click to browse</span>
              <span className="text-xs text-muted-foreground">PDF or TXT · Max 10 MB</span>
            </>
          )}
        </label>
      </div>
      <div className="space-y-2">
        <label htmlFor="tags" className="text-sm font-medium text-foreground">
          Tags (optional)
        </label>
        <input
          id="tags"
          name="tags"
          type="text"
          placeholder="e.g. HR, Engineering (comma-separated)"
          className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm transition-[color,box-shadow] outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:border-ring disabled:opacity-50"
          disabled={isPending}
        />
      </div>
      <Button type="submit" disabled={isPending || !selectedFile} size="lg" className="rounded-xl shadow-sm">
        {isPending ? "Uploading…" : "Upload to knowledge base"}
      </Button>
    </form>
  );
}
