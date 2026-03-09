import { getDocumentTags, getDocumentCount } from "@/actions/documents";
import { ChatPanel } from "@/components/chat/chat-panel";

export default async function ChatPage() {
  const [initialTags, documentCount] = await Promise.all([
    getDocumentTags(),
    getDocumentCount(),
  ]);
  const isKnowledgeBaseEmpty = documentCount === 0;
  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <ChatPanel
        initialTags={initialTags}
        isKnowledgeBaseEmpty={isKnowledgeBaseEmpty}
      />
    </div>
  );
}
