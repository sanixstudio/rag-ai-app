import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { getOrCreateUserByClerk, getChatSessions, checkInternalAccess } from "@/actions/session";
import { requireOrganizationId } from "@/lib/tenant";
import { ChatLayout } from "@/components/chat/chat-layout";

/**
 * App shell: chat and knowledge base. Requires sign-in, optional allowlist, and an active workspace (Clerk org).
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId: clerkId } = await auth();
  if (!clerkId) redirect("/sign-in");

  const access = await checkInternalAccess(clerkId);
  if (!access.allowed) {
    redirect("/sign-in?error=access_restricted");
  }

  const { organizationId, shouldRedirectToWorkspace } = await requireOrganizationId();
  if (shouldRedirectToWorkspace || !organizationId) {
    redirect("/workspace");
  }

  const user = await getOrCreateUserByClerk(clerkId);
  const sessions = user
    ? (await getChatSessions(user.id, organizationId)).map((s: { id: string; title: string }) => ({ id: s.id, title: s.title }))
    : [];

  return (
    <ChatLayout initialSessions={sessions} organizationId={organizationId}>
      {children}
    </ChatLayout>
  );
}
