import { getDocumentTags } from "@/actions/documents";
import { ChatPanel } from "@/components/chat/chat-panel";

export default async function ChatPage() {
  const initialTags = await getDocumentTags();
  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <ChatPanel initialTags={initialTags} />
    </div>
  );
}
