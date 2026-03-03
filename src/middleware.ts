import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

/** Routes that do not require authentication (internal app is gated). */
const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/webhooks(.*)",
]);

/** API routes: return 401 when unauthenticated so the client can handle. */
function isApiRoute(pathname: string): boolean {
  return pathname.startsWith("/api/");
}

export default clerkMiddleware(async (auth, request) => {
  if (isPublicRoute(request)) return;

  const session = await auth();
  if (!session.userId) {
    if (isApiRoute(request.nextUrl.pathname)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await session.redirectToSignIn();
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ico|woff2?|ttf|eot)).*)",
    "/(api|trpc)(.*)",
  ],
};
