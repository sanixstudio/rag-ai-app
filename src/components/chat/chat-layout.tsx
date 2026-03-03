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
        <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b px-4">
          <div className="flex items-center gap-2">
            <SidebarTrigger />
            <span className="text-sm font-medium text-muted-foreground">
              Internal Knowledge Base
            </span>
          </div>
          <UserButton
            afterSignOutUrl="/"
            appearance={{
              elements: { avatarBox: "h-8 w-8" },
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
