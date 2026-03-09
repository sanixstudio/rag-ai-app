import { listDocuments } from "@/actions/documents";
import { DocumentUploadForm } from "@/components/documents/document-upload-form";
import { DocumentList } from "@/components/documents/document-list";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = {
  title: "Knowledge base | Internal RAG",
  description: "Upload and manage documents in your internal knowledge base.",
};

export default async function DocumentsPage() {
  const documents = await listDocuments();

  return (
    <div className="flex flex-1 flex-col overflow-auto">
      <div className="mx-auto w-full max-w-4xl px-6 py-10 sm:px-8">
        <header className="mb-10">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Knowledge base
          </h1>
          <p className="mt-2 text-muted-foreground max-w-xl">
            Upload PDF or TXT files. They are chunked, embedded, and used to answer questions in chat. Only internal users can access this area.
          </p>
        </header>

        <Card className="mb-10 border-border/60 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Upload document</CardTitle>
            <CardDescription>Add a file to index and make it searchable in chat.</CardDescription>
          </CardHeader>
          <CardContent>
            <DocumentUploadForm />
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Documents in base</CardTitle>
            <CardDescription>Search, filter, and manage indexed documents.</CardDescription>
          </CardHeader>
          <CardContent>
            <DocumentList initialDocuments={documents} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
