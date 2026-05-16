import { useState } from "react";
import { Check, MessageSquarePlus, Pencil, Trash2, X } from "lucide-react";

import type { ConversationMeta } from "../storage";

type Props = {
  conversations: ConversationMeta[];
  currentId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
};

export function ConversationsPanel({
  conversations,
  currentId,
  onSelect,
  onNew,
  onRename,
  onDelete,
}: Props) {
  return (
    <div className="conversations">
      <button className="primary-button new-conversation" type="button" onClick={onNew}>
        <MessageSquarePlus size={18} aria-hidden="true" />
        Nouvelle conversation
      </button>
      <p className="sidebar-section-label">Local History</p>
      {conversations.length === 0 ? (
        <div className="empty-state">Aucune conversation.</div>
      ) : (
        <ul className="conversation-list">
          {conversations.map((conversation) => (
            <ConversationItem
              key={conversation.id}
              conversation={conversation}
              active={conversation.id === currentId}
              onSelect={() => onSelect(conversation.id)}
              onRename={(title) => onRename(conversation.id, title)}
              onDelete={() => onDelete(conversation.id)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function ConversationItem({
  conversation,
  active,
  onSelect,
  onRename,
  onDelete,
}: {
  conversation: ConversationMeta;
  active: boolean;
  onSelect: () => void;
  onRename: (title: string) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(conversation.title);

  function commit() {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== conversation.title) {
      onRename(trimmed);
    }
    setEditing(false);
  }

  function cancel() {
    setDraft(conversation.title);
    setEditing(false);
  }

  if (editing) {
    return (
      <li className={`conversation-item ${active ? "active" : ""} editing`}>
        <input
          autoFocus
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              commit();
            } else if (event.key === "Escape") {
              event.preventDefault();
              cancel();
            }
          }}
        />
        <button type="button" className="icon-button" title="Valider" onClick={commit}>
          <Check size={14} aria-hidden="true" />
        </button>
        <button type="button" className="icon-button" title="Annuler" onClick={cancel}>
          <X size={14} aria-hidden="true" />
        </button>
      </li>
    );
  }

  return (
    <li className={`conversation-item ${active ? "active" : ""}`}>
      <button type="button" className="conversation-select" onClick={onSelect} title={conversation.title}>
        <span className="conversation-title">{conversation.title}</span>
      </button>
      <button
        type="button"
        className="icon-button ghost"
        title="Renommer"
        onClick={() => {
          setDraft(conversation.title);
          setEditing(true);
        }}
      >
        <Pencil size={14} aria-hidden="true" />
      </button>
      <button
        type="button"
        className="icon-button ghost danger"
        title="Supprimer"
        onClick={() => {
          if (window.confirm("Supprimer cette conversation ?")) onDelete();
        }}
      >
        <Trash2 size={14} aria-hidden="true" />
      </button>
    </li>
  );
}
