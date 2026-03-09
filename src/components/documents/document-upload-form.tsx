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
    <form key={formKey} action={formAction} className="space-y-4">
      <div
        className="rounded-2xl border border-dashed border-border/60 bg-muted/30 p-8 transition-colors hover:bg-muted/50"
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
        <label className="flex flex-col items-center gap-2 cursor-pointer pointer-events-none">
          {selectedFile ? (
            <>
              <FileText className="h-10 w-10 text-primary" />
              <span className="text-sm font-medium text-foreground truncate max-w-xs">{selectedFile}</span>
            </>
          ) : (
            <>
              <Upload className="h-10 w-10 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">Choose a PDF or TXT file</span>
              <span className="text-xs text-muted-foreground">Max 10 MB</span>
            </>
          )}
        </label>
      </div>
      <div>
        <label htmlFor="tags" className="text-sm font-medium text-foreground">
          Tags (optional)
        </label>
        <input
          id="tags"
          name="tags"
          type="text"
          placeholder="e.g. HR, Engineering (comma-separated)"
          className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
          disabled={isPending}
        />
      </div>
      <Button type="submit" disabled={isPending || !selectedFile}>
        {isPending ? "Uploading…" : "Upload to knowledge base"}
      </Button>
    </form>
  );
}
