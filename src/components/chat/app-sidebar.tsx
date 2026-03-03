"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { MessageSquare, Plus, BookOpen, Trash2, Loader2 } from "lucide-react";
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
