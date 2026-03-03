"use client";

import { UserButton } from "@clerk/nextjs";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { AppSidebar, type ChatSessionItem } from "./app-sidebar";

interface ChatLayoutProps {
  initialSessions: ChatSessionItem[];
  children: React.ReactNode;
}

export function ChatLayout({ initialSessions, children }: ChatLayoutProps) {
  return (
    <SidebarProvider>
      <AppSidebar sessions={initialSessions} />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-border/50 bg-background/80 backdrop-blur-sm px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <SidebarTrigger />
            <span className="text-sm font-medium tracking-tight text-muted-foreground">
              Internal Knowledge Base
            </span>
          </div>
          <UserButton
            afterSignOutUrl="/"
            appearance={{
              elements: { avatarBox: "h-8 w-8 rounded-xl" },
            }}
          />
        </header>
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
