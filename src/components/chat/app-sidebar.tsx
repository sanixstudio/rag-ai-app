"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { MessageSquare, Plus, BookOpen, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { deleteChatSession } from "@/actions/session";

export interface ChatSessionItem {
  id: string;
  title: string;
}

interface AppSidebarProps {
  sessions: ChatSessionItem[];
}

export function AppSidebar({ sessions }: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleDeleteSession(e: React.MouseEvent, sessionId: string) {
    e.preventDefault();
    e.stopPropagation();
    const result = await deleteChatSession(sessionId);
    if (result.success) {
      if (pathname === `/chat/${sessionId}`) {
        router.push("/chat");
      }
      router.refresh();
      toast.success("Chat deleted.");
    } else {
      toast.error(result.error ?? "Failed to delete chat");
    }
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={pathname === "/chat"}>
              <Link href="/chat">
                <Plus className="h-4 w-4" />
                <span>New chat</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>History</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {sessions.length === 0 ? (
                <SidebarMenuItem>
                  <span className="px-2 py-1.5 text-sm text-muted-foreground">
                    No chats yet
                  </span>
                </SidebarMenuItem>
              ) : (
                sessions.map((session) => (
                  <SidebarMenuItem key={session.id}>
                    <div className="flex w-full items-center gap-0.5">
                      <SidebarMenuButton
                        asChild
                        isActive={pathname === `/chat/${session.id}`}
                        className="flex-1 min-w-0"
                      >
                        <Link href={`/chat/${session.id}`}>
                          <MessageSquare className="h-4 w-4 shrink-0" />
                          <span className="truncate">{session.title}</span>
                        </Link>
                      </SidebarMenuButton>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                        onClick={(e) => handleDeleteSession(e, session.id)}
                        aria-label={`Delete ${session.title}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </SidebarMenuItem>
                ))
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link href="/documents">
                <BookOpen className="h-4 w-4" />
                <span>Knowledge base</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
