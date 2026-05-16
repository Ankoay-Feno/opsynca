import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Database, MessagesSquare } from "lucide-react";

import { ChatPanel } from "../components/ChatPanel";
import { ConversationsPanel } from "../components/ConversationsPanel";
import { DocumentsPanel } from "../components/DocumentsPanel";
import { listDocuments } from "../api";
import {
  ConversationMeta,
  StoredConversation,
  deleteConversation,
  deriveTitle,
  listConversations,
  loadConversation,
  renameConversation,
  saveConversation,
  tryPersistStorage,
} from "../storage";
import type { ChatMessage, IndexedDocument } from "../types";
import { errorMessage, uniqueId } from "../utils";

type Props = {
  onDocumentCountChange: (count: number) => void;
};

type SidebarTab = "chats" | "docs";

const DRAFT_KEY = "__draft__";

export function RagView({ onDocumentCountChange }: Props) {
  const [documents, setDocuments] = useState<IndexedDocument[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(true);
  const [documentsError, setDocumentsError] = useState<string | null>(null);
  const [conversations, setConversations] = useState<ConversationMeta[]>([]);
  const [currentId, setCurrentId] = useState<string>(DRAFT_KEY);
  const [currentMessages, setCurrentMessages] = useState<ChatMessage[]>([]);
  const [tab, setTab] = useState<SidebarTab>("chats");
  const persistRef = useRef<number | null>(null);

  const refreshDocuments = useCallback(async () => {
    setDocumentsLoading(true);
    setDocumentsError(null);
    try {
      const list = await listDocuments();
      setDocuments(list);
      onDocumentCountChange(list.length);
    } catch (caught) {
      setDocumentsError(errorMessage(caught));
    } finally {
      setDocumentsLoading(false);
    }
  }, [onDocumentCountChange]);

  useEffect(() => {
    void refreshDocuments();
  }, [refreshDocuments]);

  useEffect(() => {
    void tryPersistStorage();
    void (async () => {
      const list = await listConversations();
      setConversations(list);
    })();
  }, []);

  const selectConversation = useCallback(async (id: string) => {
    if (id === DRAFT_KEY) {
      setCurrentId(DRAFT_KEY);
      setCurrentMessages([]);
      return;
    }
    const stored = await loadConversation(id);
    if (!stored) return;
    setCurrentId(id);
    setCurrentMessages(stored.messages);
  }, []);

  const handleNewConversation = useCallback(() => {
    setCurrentId(DRAFT_KEY);
    setCurrentMessages([]);
  }, []);

  const handleRename = useCallback(async (id: string, title: string) => {
    await renameConversation(id, title);
    const list = await listConversations();
    setConversations(list);
  }, []);

  const handleDelete = useCallback(
    async (id: string) => {
      await deleteConversation(id);
      const list = await listConversations();
      setConversations(list);
      if (id === currentId) {
        setCurrentId(DRAFT_KEY);
        setCurrentMessages([]);
      }
    },
    [currentId],
  );

  const handleMessagesChange = useCallback(
    (messages: ChatMessage[]) => {
      const hasUser = messages.some((message) => message.role === "user");
      if (!hasUser) return;

      if (persistRef.current) {
        window.clearTimeout(persistRef.current);
      }
      persistRef.current = window.setTimeout(() => {
        void (async () => {
          const now = Date.now();
          const id = currentId === DRAFT_KEY ? uniqueId() : currentId;
          const existing = currentId === DRAFT_KEY ? null : await loadConversation(currentId);
          const conversation: StoredConversation = {
            id,
            title: existing?.title ?? deriveTitle(messages),
            createdAt: existing?.createdAt ?? now,
            updatedAt: now,
            messages,
          };
          await saveConversation(conversation);
          if (currentId === DRAFT_KEY) {
            setCurrentId(id);
          }
          const list = await listConversations();
          setConversations(list);
        })();
      }, 300);
    },
    [currentId],
  );

  useEffect(() => {
    return () => {
      if (persistRef.current) window.clearTimeout(persistRef.current);
    };
  }, []);

  const sidebarContent = useMemo(() => {
    if (tab === "chats") {
      return (
        <ConversationsPanel
          conversations={conversations}
          currentId={currentId === DRAFT_KEY ? null : currentId}
          onSelect={(id) => void selectConversation(id)}
          onNew={handleNewConversation}
          onRename={(id, title) => void handleRename(id, title)}
          onDelete={(id) => void handleDelete(id)}
        />
      );
    }
    return (
      <DocumentsPanel
        documents={documents}
        loading={documentsLoading}
        error={documentsError}
        onRefresh={refreshDocuments}
        onDocumentsChanged={refreshDocuments}
        onError={setDocumentsError}
      />
    );
  }, [
    tab,
    conversations,
    currentId,
    documents,
    documentsLoading,
    documentsError,
    refreshDocuments,
    selectConversation,
    handleNewConversation,
    handleRename,
    handleDelete,
  ]);

  return (
    <div className="workspace">
      <aside className="sidebar" aria-label="Navigation laterale">
        <nav className="sidebar-tabs" aria-label="Sections">
          <button
            type="button"
            className={`sidebar-tab ${tab === "chats" ? "active" : ""}`}
            onClick={() => setTab("chats")}
          >
            <MessagesSquare size={15} aria-hidden="true" />
            Chats
          </button>
          <button
            type="button"
            className={`sidebar-tab ${tab === "docs" ? "active" : ""}`}
            onClick={() => setTab("docs")}
          >
            <Database size={15} aria-hidden="true" />
            Documents
          </button>
        </nav>
        <div className="sidebar-content">{sidebarContent}</div>
      </aside>
      <ChatPanel
        key={currentId}
        initialMessages={currentMessages}
        onMessagesChange={handleMessagesChange}
      />
    </div>
  );
}
