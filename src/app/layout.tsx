import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { getClerkPublishableKey } from "@/config/env";
import "./globals.css";

const clerkPublishableKey = getClerkPublishableKey();

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Internal Knowledge Base | AI-Powered Search",
  description:
    "Ask questions and get answers grounded in your internal knowledge base. Secure, fast, semantic search.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const content = (
    <html lang="en" suppressHydrationWarning>
      <body className={`${plusJakarta.variable} font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster richColors position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  );

  if (!clerkPublishableKey) {
    return content;
  }
  return <ClerkProvider publishableKey={clerkPublishableKey}>{content}</ClerkProvider>;
}
