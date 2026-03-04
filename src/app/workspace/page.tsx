import { CreateOrganization } from "@clerk/nextjs";

export const metadata = {
  title: "Create workspace | Knowledge Base",
  description: "Create or join a workspace to get started.",
};

/**
 * Shown when the user is signed in but has no active organization.
 * Clerk Organizations = workspaces (each has its own knowledge base and chats).
 */
export default function WorkspacePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 py-12">
      <div className="w-full max-w-md space-y-4 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Create your workspace
        </h1>
        <p className="text-muted-foreground">
          A workspace is your team&apos;s knowledge base and chat. Create one to
          start uploading documents and asking questions.
        </p>
      </div>
      <CreateOrganization
        afterCreateOrganizationUrl="/chat"
        appearance={{
          elements: {
            rootBox: "mx-auto",
            card: "shadow-lg rounded-2xl",
          },
        }}
      />
    </div>
  );
}
