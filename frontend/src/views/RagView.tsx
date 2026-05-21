import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Database, MessagesSquare, ShieldCheck } from "lucide-react";

import { ChatPanel } from "../components/ChatPanel";
import { ConversationsPanel } from "../components/ConversationsPanel";
import { DocumentsPanel } from "../components/DocumentsPanel";
import { generateConversationTitle } from "../api";
import {
  ConversationMeta,
  StoredConversation,
  StoredDocument,
  deleteConversation,
  deriveTitle,
  listAllChunks,
  listConversations,
  listDocuments,
  loadConversation,
  renameConversation,
  saveConversation,
  tryPersistStorage,
} from "../storage";
import type { ChatMessage } from "../types";
import { errorMessage, uniqueId } from "../utils";
import { getVectorIndex } from "../vectorSearch";

type Props = {
  onDocumentCountChange: (count: number) => void;
};

type SidebarTab = "chats" | "docs";

const DRAFT_KEY = "__draft__";

export function RagView({ onDocumentCountChange }: Props) {
  const [documents, setDocuments] = useState<StoredDocument[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(true);
  const [documentsError, setDocumentsError] = useState<string | null>(null);
  const [conversations, setConversations] = useState<ConversationMeta[]>([]);
  const [currentId, setCurrentId] = useState<string>(DRAFT_KEY);
  const [currentMessages, setCurrentMessages] = useState<ChatMessage[]>([]);
  const [sessionKey, setSessionKey] = useState(0);
  const [tab, setTab] = useState<SidebarTab>("chats");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const storageIdRef = useRef<string>(DRAFT_KEY);
  const titleInFlightRef = useRef<Set<string>>(new Set());

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
      const [convs, chunks] = await Promise.all([listConversations(), listAllChunks()]);
      setConversations(convs);
      if (chunks.length) {
        getVectorIndex().rebuild(chunks);
      }
    })();
  }, []);

  useEffect(() => {
    if (!drawerOpen) return;
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") setDrawerOpen(false);
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [drawerOpen]);

  const selectConversation = useCallback(async (id: string) => {
    setDrawerOpen(false);
    if (id === DRAFT_KEY) {
      storageIdRef.current = DRAFT_KEY;
      setCurrentId(DRAFT_KEY);
      setCurrentMessages([]);
      setSessionKey((key) => key + 1);
      return;
    }
    const stored = await loadConversation(id);
    if (!stored) return;
    storageIdRef.current = id;
    setCurrentId(id);
    setCurrentMessages(stored.messages);
    setSessionKey((key) => key + 1);
  }, []);

  const handleNewConversation = useCallback(() => {
    setDrawerOpen(false);
    storageIdRef.current = DRAFT_KEY;
    setCurrentId(DRAFT_KEY);
    setCurrentMessages([]);
    setSessionKey((key) => key + 1);
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
        storageIdRef.current = DRAFT_KEY;
        setCurrentId(DRAFT_KEY);
        setCurrentMessages([]);
        setSessionKey((key) => key + 1);
      }
    },
    [currentId],
  );

  const handleMessagesChange = useCallback((messages: ChatMessage[]) => {
    setCurrentMessages(messages);

    const hasUser = messages.some((message) => message.role === "user");
    if (!hasUser) return;

    const wasDraft = storageIdRef.current === DRAFT_KEY;
    const id = wasDraft ? uniqueId() : storageIdRef.current;
    if (wasDraft) {
      storageIdRef.current = id;
    }

    void (async () => {
      const now = Date.now();
      const existing = await loadConversation(id);
      const conversation: StoredConversation = {
        id,
        title: existing?.title ?? deriveTitle(messages),
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
        messages,
        titleLocked: existing?.titleLocked,
      };
      await saveConversation(conversation);
      if (wasDraft && storageIdRef.current === id) {
        setCurrentId(id);
      }
      setConversations(await listConversations());

      if (
        !existing?.titleLocked &&
        messages.length > 5 &&
        !titleInFlightRef.current.has(id)
      ) {
        titleInFlightRef.current.add(id);
        void (async () => {
          try {
            const history = messages
              .filter((m) => m.content.trim().length > 0)
              .map((m) => ({ role: m.role, content: m.content }));
            const aiTitle = await generateConversationTitle(history);
            if (!aiTitle) return;
            const latest = await loadConversation(id);
            if (!latest || latest.titleLocked) return;
            await saveConversation({
              ...latest,
              title: aiTitle,
              titleLocked: true,
              updatedAt: Date.now(),
            });
            setConversations(await listConversations());
          } catch {
            // titre IA optionnel: on garde le titre derive
          } finally {
            titleInFlightRef.current.delete(id);
          }
        })();
      }
    })().catch(() => {
      // best-effort: si l'IDB echoue, on n'interrompt pas l'UI
    });
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
      <div
        className={`drawer-backdrop ${drawerOpen ? "open" : ""}`}
        onClick={() => setDrawerOpen(false)}
        aria-hidden="true"
      />
      <aside
        className={`sidebar ${drawerOpen ? "drawer-open" : ""}`}
        aria-label="Navigation laterale"
      >
        <div className="brand-block">
          <div className="brand-logo">
            <ShieldCheck size={20} aria-hidden="true" />
          </div>
          <div>
            <p className="brand-title">Local Workspace</p>
            <p className="brand-caption">
              <span className="brand-status-dot" />
              Local Storage Active
            </p>
          </div>
        </div>
        <nav className="sidebar-tabs" aria-label="Sections">
          <button
            type="button"
            className={`sidebar-tab ${tab === "chats" ? "active" : ""}`}
            onClick={() => setTab("chats")}
          >
            <MessagesSquare size={15} aria-hidden="true" />
            Conversations
          </button>
          <button
            type="button"
            className={`sidebar-tab ${tab === "docs" ? "active" : ""}`}
            onClick={() => setTab("docs")}
          >
            <Database size={15} aria-hidden="true" />
            Knowledge Base
          </button>
        </nav>
        <div className="sidebar-content">{sidebarContent}</div>
      </aside>
      <ChatPanel
        key={sessionKey}
        initialMessages={currentMessages}
        onMessagesChange={handleMessagesChange}
        onMenuClick={() => setDrawerOpen((open) => !open)}
      />
    </div>
  );
}
