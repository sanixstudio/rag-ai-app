import { SignIn } from "@clerk/nextjs";

interface SignInPageProps {
  searchParams: Promise<{ error?: string }>;
}

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const { error } = await searchParams;
  const isRestricted = error === "access_restricted";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4">
      {isRestricted && (
        <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 px-4 py-3 text-center text-sm text-amber-800 dark:text-amber-200">
          Access is restricted to internal users. If you believe you should have
          access, contact your administrator.
        </div>
      )}
      <SignIn
        appearance={{
          elements: {
            rootBox: "mx-auto",
          },
        }}
      />
    </div>
  );
}
