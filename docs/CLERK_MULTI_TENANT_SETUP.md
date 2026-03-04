# Clerk Setup for Multi-Tenant SaaS

This app uses **Clerk Organizations** as workspaces (tenants). Each organization has its own knowledge base and chats. Follow these steps in the Clerk Dashboard so sign-up, workspace creation, and switching work correctly.

---

## 1. Enable Organizations

1. In [Clerk Dashboard](https://dashboard.clerk.com), select your application.
2. Go to **Configure** → **Organizations** (or **Settings** → **Organizations**).
3. **Enable Organizations** if not already on.
4. Optionally configure:
   - **Organization creation**: Who can create organizations (e.g. all signed-in users, or only certain roles).
   - **Personal workspace**: If you want each user to have a “personal” org by default, you can use Clerk’s “Personal account” / “Personal workspace” behavior if your plan supports it; otherwise the app requires users to create or join an org (recommended).

---

## 2. Organization URLs and redirects

Set these in **Configure** → **Paths** (or **Domains & URLs**), or via environment variables:

| Setting | Recommended value | Purpose |
|--------|--------------------|--------|
| **After sign-in URL** | `/chat` or `/workspace` | If `/chat`: users without an org are redirected by the app to `/workspace`. If `/workspace`: users land on “Create workspace” when they have no org. |
| **After sign-up URL** | Same as after sign-in | New users go to workspace creation or chat. |
| **After create organization URL** | `/chat` | Set in code already (`afterCreateOrganizationUrl="/chat"`). After creating a workspace, user is sent to chat. |
| **After select organization URL** | `/chat` | Set in code (`afterSelectOrganizationUrl="/chat"`). After switching workspace, user is sent to chat. |

The app already uses:

- `CreateOrganization` on `/workspace` with `afterCreateOrganizationUrl="/chat"`.
- `OrganizationSwitcher` in the header with `afterCreateOrganizationUrl="/chat"` and `afterSelectOrganizationUrl="/chat"`.

So in Clerk you only need to ensure the **base** after-sign-in/after-sign-up URL is either `/chat` or `/workspace` (both work; app layout redirects no-org users to `/workspace`).

---

## 3. Optional: Restrict sign-up by domain (e.g. internal SaaS)

If you want only certain email domains to use the app (e.g. `mulletjobs.com`):

1. **Configure** → **Restrictions** (or **User & Authentication** → **Email, Phone, Username**): use **Allowlist** or **Blocklist** for email domains if your plan supports it.
2. Or keep using the app’s **`ALLOWED_EMAIL_DOMAINS`** env var: when set, the app redirects users whose email domain is not in the list to sign-in with `?error=access_restricted`. Leave it unset for open SaaS.

No change to Organizations is required for this.

---

## 4. Optional: Roles inside a workspace (Admin / Member)

You can use Clerk’s **organization roles** so that inside each workspace only some users can manage the knowledge base (e.g. “Admin” can upload/delete documents, “Member” can only chat and view).

1. **Configure** → **Organizations** → **Roles** (or **Default role set**).
2. Define at least two roles, for example:
   - **Admin** (key e.g. `org:admin`) – can manage documents.
   - **Member** (key e.g. `org:member`) – can use chat and view documents only.
3. Assign roles when inviting members or when users create an org (creator often gets Admin).

The app does **not** enforce org roles by default after the multi-tenant change. To enforce them you would:

- In document upload/delete/reingest actions, call `auth()` and check `orgRole === 'org:admin'` (or your admin role key).
- Show/hide “Upload”, “Delete”, “Re-ingest” in the UI based on role.

This is optional and can be added later.

---

## 5. Summary checklist

- [ ] Organizations enabled in Clerk.
- [ ] After sign-in / sign-up URL set (e.g. `/chat` or `/workspace`).
- [ ] (Optional) Domain allowlist in Clerk or `ALLOWED_EMAIL_DOMAINS` in env.
- [ ] (Optional) Organization roles (e.g. Admin / Member) created and assigned; app logic for admin-only document actions added if desired.

No webhooks or custom session claims are required for basic multi-tenancy; the app uses `auth().orgId` and `auth().orgSlug` from the current request.
