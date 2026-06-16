import { del, entries, get, set, type UseStore } from "idb-keyval";

import type { ChatMessage } from "./types";

const LEGACY_INDEX_KEY = "__index__";

export function createResilientStore(dbName: string, storeName: string): UseStore {
  let dbPromise: Promise<IDBDatabase> | null = null;

  function openDb(): Promise<IDBDatabase> {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(dbName);
      request.onerror = () => reject(request.error);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(storeName)) {
          db.createObjectStore(storeName);
        }
      };
      request.onsuccess = () => {
        const db = request.result;
        if (db.objectStoreNames.contains(storeName)) {
          resolve(db);
          return;
        }
        const nextVersion = db.version + 1;
        db.close();
        const upgrade = indexedDB.open(dbName, nextVersion);
        upgrade.onerror = () => reject(upgrade.error);
        upgrade.onupgradeneeded = () => {
          upgrade.result.createObjectStore(storeName);
        };
        upgrade.onsuccess = () => resolve(upgrade.result);
      };
    });
    return dbPromise;
  }

  return ((txMode, callback) =>
    openDb().then((db) =>
      callback(db.transaction(storeName, txMode).objectStore(storeName)),
    )) as UseStore;
}

const conversationsStore = createResilientStore("portfolio-rag", "conversations");
const chunksStore = createResilientStore("portfolio-rag-chunks", "chunks");
const documentsStore = createResilientStore("portfolio-rag-documents", "documents");

export type ConversationMeta = {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
};

export type StoredConversation = ConversationMeta & {
  messages: ChatMessage[];
  titleLocked?: boolean;
};

export type StoredDocument = {
  documentId: string;
  filename: string;
  contentType: string | null;
  extension: string;
  chunksCount: number;
  createdAt: number;
};

export type StoredChunk = {
  id: string;
  documentId: string;
  chunkIndex: number;
  text: string;
  vector: number[];
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
  const all = (await entries(conversationsStore)) as [IDBValidKey, unknown][];
  const list: ConversationMeta[] = [];
  for (const [key, value] of all) {
    if (typeof key !== "string" || key === LEGACY_INDEX_KEY) continue;
    if (!isStoredConversation(value)) continue;
    list.push({
      id: value.id,
      title: value.title,
      createdAt: value.createdAt,
      updatedAt: value.updatedAt,
    });
  }
  return list.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function loadConversation(id: string): Promise<StoredConversation | null> {
  return (await get<StoredConversation>(id, conversationsStore)) ?? null;
}

export async function saveConversation(conversation: StoredConversation): Promise<void> {
  await set(conversation.id, conversation, conversationsStore);
}

export async function renameConversation(id: string, title: string): Promise<void> {
  const conversation = await loadConversation(id);
  if (!conversation) return;
  conversation.title = title;
  conversation.titleLocked = true;
  conversation.updatedAt = Date.now();
  await saveConversation(conversation);
}

export async function deleteConversation(id: string): Promise<void> {
  await del(id, conversationsStore);
}

export function deriveTitle(messages: ChatMessage[]): string {
  const firstUser = messages.find((message) => message.role === "user");
  if (!firstUser) return "Nouvelle conversation";
  const trimmed = firstUser.content.trim().replace(/\s+/g, " ");
  return trimmed.length > 60 ? `${trimmed.slice(0, 57)}...` : trimmed;
}

export async function listDocuments(): Promise<StoredDocument[]> {
  const all = (await entries(documentsStore)) as [IDBValidKey, unknown][];
  const list: StoredDocument[] = [];
  for (const [key, value] of all) {
    if (typeof key !== "string") continue;
    if (!isStoredDocument(value)) continue;
    list.push(value);
  }
  return list.sort((a, b) => b.createdAt - a.createdAt);
}

export async function getDocument(documentId: string): Promise<StoredDocument | null> {
  return (await get<StoredDocument>(documentId, documentsStore)) ?? null;
}

export async function saveDocument(document: StoredDocument): Promise<void> {
  await set(document.documentId, document, documentsStore);
}

export async function deleteDocument(documentId: string): Promise<void> {
  await deleteChunksByDocument(documentId);
  await del(documentId, documentsStore);
}

export async function addChunks(chunks: StoredChunk[]): Promise<void> {
  if (!chunks.length) return;
  await Promise.all(chunks.map((chunk) => set(chunk.id, chunk, chunksStore)));
}

export async function getChunk(chunkId: string): Promise<StoredChunk | null> {
  const value = await get<StoredChunk>(chunkId, chunksStore);
  return value ?? null;
}

export async function listAllChunks(): Promise<StoredChunk[]> {
  const all = (await entries(chunksStore)) as [IDBValidKey, unknown][];
  const list: StoredChunk[] = [];
  for (const [, value] of all) {
    if (!isStoredChunk(value)) continue;
    list.push(value);
  }
  return list;
}

export async function listChunksByDocument(documentId: string): Promise<StoredChunk[]> {
  const all = await listAllChunks();
  return all.filter((chunk) => chunk.documentId === documentId);
}

export async function deleteChunksByDocument(documentId: string): Promise<void> {
  const chunks = await listChunksByDocument(documentId);
  await Promise.all(chunks.map((chunk) => del(chunk.id, chunksStore)));
}

function isStoredConversation(value: unknown): value is StoredConversation {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<StoredConversation>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.title === "string" &&
    typeof candidate.createdAt === "number" &&
    typeof candidate.updatedAt === "number" &&
    Array.isArray(candidate.messages)
  );
}

function isStoredDocument(value: unknown): value is StoredDocument {
  if (!value || typeof value !== "object") return false;
  const c = value as Partial<StoredDocument>;
  return (
    typeof c.documentId === "string" &&
    typeof c.filename === "string" &&
    typeof c.extension === "string" &&
    typeof c.chunksCount === "number" &&
    typeof c.createdAt === "number"
  );
}

function isStoredChunk(value: unknown): value is StoredChunk {
  if (!value || typeof value !== "object") return false;
  const c = value as Partial<StoredChunk>;
  return (
    typeof c.id === "string" &&
    typeof c.documentId === "string" &&
    typeof c.chunkIndex === "number" &&
    typeof c.text === "string" &&
    Array.isArray(c.vector)
  );
}
