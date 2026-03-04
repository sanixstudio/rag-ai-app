"use server";

import { auth } from "@clerk/nextjs/server";

/**
 * Clerk Organization id = tenant id. One org = one workspace (knowledge base + chats).
 */

/**
 * Get the current tenant (Clerk organization) id, if any.
 * Returns null when the user is not in an organization context (e.g. signed in but no org selected).
 */
export async function getOrganizationId(): Promise<string | null> {
  const { orgId } = await auth();
  return orgId ?? null;
}

/**
 * Require an active organization. Use in app layout and data operations.
 * Returns the org id or null; caller should redirect when null (e.g. to create/join workspace).
 */
export async function requireOrganizationId(): Promise<{
  organizationId: string | null;
  shouldRedirectToWorkspace: boolean;
}> {
  const organizationId = await getOrganizationId();
  return {
    organizationId,
    shouldRedirectToWorkspace: organizationId == null,
  };
}
