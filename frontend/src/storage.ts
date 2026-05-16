import { createStore, del, get, set } from "idb-keyval";

import type { ChatMessage } from "./types";

const store = createStore("portfolio-rag", "conversations");
const INDEX_KEY = "__index__";

export type ConversationMeta = {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
};

export type StoredConversation = ConversationMeta & {
  messages: ChatMessage[];
};

export async function tryPersistStorage(): Promise<void> {
  if (typeof navigator === "undefined" || !navigator.storage?.persist) return;
  try {
    await navigator.storage.persist();
  } catch {
    // ignore — storage still works, just not pinned
  }
}

export async function listConversations(): Promise<ConversationMeta[]> {
  const index = (await get<ConversationMeta[]>(INDEX_KEY, store)) ?? [];
  return [...index].sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function loadConversation(id: string): Promise<StoredConversation | null> {
  return (await get<StoredConversation>(id, store)) ?? null;
}

export async function saveConversation(conversation: StoredConversation): Promise<void> {
  await set(conversation.id, conversation, store);
  const index = (await get<ConversationMeta[]>(INDEX_KEY, store)) ?? [];
  const meta: ConversationMeta = {
    id: conversation.id,
    title: conversation.title,
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
  };
  const next = [meta, ...index.filter((entry) => entry.id !== conversation.id)];
  await set(INDEX_KEY, next, store);
}

export async function renameConversation(id: string, title: string): Promise<void> {
  const conversation = await loadConversation(id);
  if (!conversation) return;
  conversation.title = title;
  conversation.updatedAt = Date.now();
  await saveConversation(conversation);
}

export async function deleteConversation(id: string): Promise<void> {
  await del(id, store);
  const index = (await get<ConversationMeta[]>(INDEX_KEY, store)) ?? [];
  await set(
    INDEX_KEY,
    index.filter((entry) => entry.id !== id),
    store,
  );
}

export function deriveTitle(messages: ChatMessage[]): string {
  const firstUser = messages.find((message) => message.role === "user");
  if (!firstUser) return "Nouvelle conversation";
  const trimmed = firstUser.content.trim().replace(/\s+/g, " ");
  return trimmed.length > 60 ? `${trimmed.slice(0, 57)}...` : trimmed;
}
