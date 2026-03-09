"use client";

import { OrganizationSwitcher, UserButton } from "@clerk/nextjs";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { AppSidebar, type ChatSessionItem } from "./app-sidebar";

interface ChatLayoutProps {
  initialSessions: ChatSessionItem[];
  organizationId: string;
  children: React.ReactNode;
}

export function ChatLayout({ initialSessions, organizationId, children }: ChatLayoutProps) {
  return (
    <SidebarProvider>
      <AppSidebar sessions={initialSessions} />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-border/50 bg-background/95 backdrop-blur-md px-4 sm:px-6 transition-colors duration-200">
          <div className="flex min-w-0 items-center gap-3">
            <SidebarTrigger className="rounded-xl hover:bg-sidebar-accent" />
            <OrganizationSwitcher
              hidePersonal
              afterCreateOrganizationUrl="/chat"
              afterSelectOrganizationUrl="/chat"
              appearance={{
                elements: {
                  rootBox: "flex items-center",
                },
              }}
            />
          </div>
          <UserButton
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
