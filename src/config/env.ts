/**
 * Environment configuration. Validates required env vars when accessed from server code.
 * Use getRequiredEnv() only in server contexts (actions, API routes, server components that need DB/OpenAI).
 */

function getRequiredEnv(key: string): string {
  const value = process.env[key];
  if (value == null || value.trim() === "") {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function getOptionalEnv(key: string): string | undefined {
  const value = process.env[key];
  return value?.trim() || undefined;
}

/** DATABASE_URL for Neon PostgreSQL. Required for any DB operation. */
export function getDatabaseUrl(): string {
  return getRequiredEnv("DATABASE_URL");
}

/** OpenAI API key. Required for embeddings and chat. */
export function getOpenAiApiKey(): string {
  return getRequiredEnv("OPENAI_API_KEY");
}

/** Clerk publishable key. Optional; when missing, auth is disabled. */
export function getClerkPublishableKey(): string | undefined {
  return getOptionalEnv("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY");
}

/** Clerk secret key. Required when Clerk is used. */
export function getClerkSecretKey(): string | undefined {
  return getOptionalEnv("CLERK_SECRET_KEY");
}

/**
 * Comma-separated list of allowed email domains for internal access (e.g. "company.com,partner.org").
 * When set, only users whose email domain is in this list can use the app; others are restricted.
 */
export function getAllowedEmailDomains(): string[] {
  const raw = getOptionalEnv("ALLOWED_EMAIL_DOMAINS");
  if (!raw) return [];
  return raw.split(",").map((d) => d.trim().toLowerCase()).filter(Boolean);
}
