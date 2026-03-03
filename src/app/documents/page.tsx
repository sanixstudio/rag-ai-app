import Link from "next/link";
import { FileText, ArrowLeft, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DocumentUploadForm } from "@/components/documents/document-upload-form";

export const metadata = {
  title: "Knowledge base | RAG Assistant",
  description: "Upload documents to your internal knowledge base.",
};

export default function DocumentsPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-10 border-b border-border/40 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80">
        <div className="mx-auto max-w-4xl flex h-16 items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/" aria-label="Back to home">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <span className="font-semibold">Knowledge base</span>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-4xl px-4 sm:px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-foreground">Upload documents</h1>
          <p className="mt-1 text-muted-foreground">
            Add PDF or TXT files. They will be chunked, embedded, and used to answer questions in chat.
          </p>
        </div>

        <DocumentUploadForm />
      </main>
    </div>
  );
}
