"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { MessageSquare, Plus, BookOpen, Trash2, Loader2, Pencil, BarChart3 } from "lucide-react";
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
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { deleteChatSession, updateSessionTitle } from "@/actions/session";

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
  const [pendingDelete, setPendingDelete] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  function openDeleteConfirm(e: React.MouseEvent, session: ChatSessionItem) {
    e.preventDefault();
    e.stopPropagation();
    setPendingDelete({ id: session.id, title: session.title });
  }

  async function handleRename(e: React.MouseEvent, session: ChatSessionItem) {
    e.preventDefault();
    e.stopPropagation();
    const newTitle = window.prompt("Rename chat", session.title);
    if (newTitle != null && newTitle.trim()) {
      const result = await updateSessionTitle(session.id, newTitle.trim());
      if (result.success) {
        router.refresh();
        toast.success("Chat renamed.");
      } else {
        toast.error(result.error);
      }
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    setIsDeleting(true);
    const result = await deleteChatSession(pendingDelete.id);
    setIsDeleting(false);
    setPendingDelete(null);
    if (result.success) {
      if (pathname === `/chat/${pendingDelete.id}`) {
        router.push("/chat");
      }
      router.refresh();
      toast.success("Chat deleted.");
    } else {
      toast.error(result.error ?? "Failed to delete chat");
    }
  }

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border/80">
      <SidebarHeader className="border-b border-sidebar-border/80 px-2 py-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={pathname === "/chat"} className="rounded-xl">
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
          <SidebarGroupLabel className="text-xs font-medium tracking-wide text-muted-foreground/90">History</SidebarGroupLabel>
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
                        className="flex-1 min-w-0 rounded-xl"
                      >
                        <Link href={`/chat/${session.id}`}>
                          <MessageSquare className="h-4 w-4 shrink-0" />
                          <span className="truncate">{session.title}</span>
                        </Link>
                      </SidebarMenuButton>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
                        onClick={(e) => handleRename(e, session)}
                        aria-label={`Rename ${session.title}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                        onClick={(e) => openDeleteConfirm(e, session)}
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
      <SidebarFooter className="border-t border-sidebar-border/80 px-2 py-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={pathname === "/documents"} className="rounded-xl">
              <Link href="/documents">
                <BookOpen className="h-4 w-4" />
                <span>Knowledge base</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={pathname === "/analytics"} className="rounded-xl">
              <Link href="/analytics">
                <BarChart3 className="h-4 w-4" />
                <span>Analytics</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete chat?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this conversation. This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={isDeleting}
              onClick={confirmDelete}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Deleting…
                </>
              ) : (
                "Delete"
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Sidebar>
  );
}
