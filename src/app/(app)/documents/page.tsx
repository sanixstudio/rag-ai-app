import { listDocuments } from "@/actions/documents";
import { DocumentUploadForm } from "@/components/documents/document-upload-form";
import { DocumentList } from "@/components/documents/document-list";

export const metadata = {
  title: "Knowledge base | Internal RAG",
  description: "Upload and manage documents in your internal knowledge base.",
};

export default async function DocumentsPage() {
  const documents = await listDocuments();

  return (
    <div className="flex flex-1 flex-col overflow-auto">
      <div className="mx-auto w-full max-w-4xl px-6 py-10 sm:px-8">
        <div className="mb-10">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Knowledge base
          </h1>
          <p className="mt-2 text-muted-foreground">
            Upload PDF or TXT files. They are chunked, embedded, and used to
            answer questions in chat. Only internal users can access this area.
          </p>
        </div>

        <section className="mb-12">
          <h2 className="text-lg font-medium tracking-tight text-foreground mb-4">
            Upload document
          </h2>
          <DocumentUploadForm />
        </section>

        <section>
          <h2 className="text-lg font-medium tracking-tight text-foreground mb-4">
            Documents in base
          </h2>
          <DocumentList initialDocuments={documents} />
        </section>
      </div>
    </div>
  );
}
