import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { clear, createStore, set as idbSet } from "idb-keyval";

import type { ChatMessage } from "./types";
import {
  addChunks,
  deleteChunksByDocument,
  deleteConversation,
  deleteDocument,
  deriveTitle,
  getDocument,
  listAllChunks,
  listChunksByDocument,
  listConversations,
  listDocuments,
  loadConversation,
  renameConversation,
  saveConversation,
  saveDocument,
  type StoredChunk,
  type StoredConversation,
  type StoredDocument,
} from "./storage";

const testStore = createStore("portfolio-rag", "conversations");
const docsTestStore = createStore("portfolio-rag-documents", "documents");
const chunksTestStore = createStore("portfolio-rag-chunks", "chunks");

function makeConversation(overrides: Partial<StoredConversation> = {}): StoredConversation {
  const now = Date.now();
  const messages: ChatMessage[] = [
    { id: "u1", role: "user", content: "Bonjour assistant" },
    { id: "a1", role: "assistant", content: "Salut !" },
  ];
  return {
    id: "conv-1",
    title: "Conversation",
    createdAt: now,
    updatedAt: now,
    messages,
    ...overrides,
  };
}

function makeDocument(overrides: Partial<StoredDocument> = {}): StoredDocument {
  return {
    documentId: "doc-1",
    filename: "spec.pdf",
    contentType: "application/pdf",
    extension: ".pdf",
    chunksCount: 3,
    createdAt: Date.now(),
    ...overrides,
  };
}

function makeChunk(overrides: Partial<StoredChunk> = {}): StoredChunk {
  return {
    id: "chunk-1",
    documentId: "doc-1",
    chunkIndex: 0,
    text: "Texte du chunk",
    vector: [0.1, 0.2, 0.3],
    ...overrides,
  };
}

async function resetStore() {
  await clear(testStore);
  await clear(docsTestStore);
  await clear(chunksTestStore);
}

beforeEach(async () => {
  await resetStore();
});

afterEach(async () => {
  await resetStore();
});

describe("storage", () => {
  it("saves and loads a conversation", async () => {
    const conversation = makeConversation();
    await saveConversation(conversation);
    const loaded = await loadConversation(conversation.id);
    expect(loaded?.id).toBe(conversation.id);
    expect(loaded?.messages).toHaveLength(2);
    expect(loaded?.messages[0].content).toBe("Bonjour assistant");
  });

  it("returns null when conversation does not exist", async () => {
    expect(await loadConversation("missing")).toBeNull();
  });

  it("lists conversations sorted by updatedAt desc", async () => {
    await saveConversation(makeConversation({ id: "older", updatedAt: 100 }));
    await saveConversation(makeConversation({ id: "newer", updatedAt: 200 }));
    await saveConversation(makeConversation({ id: "middle", updatedAt: 150 }));
    const list = await listConversations();
    expect(list.map((c) => c.id)).toEqual(["newer", "middle", "older"]);
  });

  it("ignores legacy __index__ key when listing", async () => {
    await idbSet("__index__", [{ id: "stale" }], testStore);
    await saveConversation(makeConversation({ id: "real" }));
    const list = await listConversations();
    expect(list.map((c) => c.id)).toEqual(["real"]);
  });

  it("deletes a conversation", async () => {
    const conversation = makeConversation();
    await saveConversation(conversation);
    await deleteConversation(conversation.id);
    expect(await loadConversation(conversation.id)).toBeNull();
    expect(await listConversations()).toEqual([]);
  });

  it("renames a conversation and locks the title", async () => {
    const conversation = makeConversation({ titleLocked: false });
    await saveConversation(conversation);
    await renameConversation(conversation.id, "Nouveau titre");
    const reloaded = await loadConversation(conversation.id);
    expect(reloaded?.title).toBe("Nouveau titre");
    expect(reloaded?.titleLocked).toBe(true);
    expect(reloaded?.updatedAt).toBeGreaterThanOrEqual(conversation.updatedAt);
  });

  it("does nothing when renaming a missing conversation", async () => {
    await expect(renameConversation("ghost", "x")).resolves.toBeUndefined();
  });

  it("overwrites in place when saving the same id twice", async () => {
    const v1 = makeConversation({ title: "v1" });
    await saveConversation(v1);
    const v2 = { ...v1, title: "v2", updatedAt: v1.updatedAt + 10 };
    await saveConversation(v2);
    const list = await listConversations();
    expect(list).toHaveLength(1);
    expect(list[0].title).toBe("v2");
  });
});

describe("deriveTitle", () => {
  it("returns fallback when no user message", () => {
    expect(deriveTitle([])).toBe("Nouvelle conversation");
    expect(
      deriveTitle([{ id: "a", role: "assistant", content: "Salut" }]),
    ).toBe("Nouvelle conversation");
  });

  it("uses the first user message content", () => {
    const messages: ChatMessage[] = [
      { id: "u", role: "user", content: "Quels documents avez-vous ?" },
    ];
    expect(deriveTitle(messages)).toBe("Quels documents avez-vous ?");
  });

  it("truncates long titles to 60 chars with ellipsis", () => {
    const long = "a".repeat(120);
    const messages: ChatMessage[] = [{ id: "u", role: "user", content: long }];
    const title = deriveTitle(messages);
    expect(title.length).toBe(60);
    expect(title.endsWith("...")).toBe(true);
  });

  it("collapses whitespace in titles", () => {
    const messages: ChatMessage[] = [
      { id: "u", role: "user", content: "  hello   world  \n\t  again  " },
    ];
    expect(deriveTitle(messages)).toBe("hello world again");
  });
});

describe("documents storage", () => {
  it("saves and gets a document", async () => {
    const doc = makeDocument();
    await saveDocument(doc);
    const loaded = await getDocument(doc.documentId);
    expect(loaded?.documentId).toBe(doc.documentId);
    expect(loaded?.filename).toBe("spec.pdf");
    expect(loaded?.chunksCount).toBe(3);
  });

  it("returns null when document does not exist", async () => {
    expect(await getDocument("ghost")).toBeNull();
  });

  it("lists documents sorted by createdAt desc", async () => {
    await saveDocument(makeDocument({ documentId: "older", createdAt: 100 }));
    await saveDocument(makeDocument({ documentId: "newer", createdAt: 300 }));
    await saveDocument(makeDocument({ documentId: "middle", createdAt: 200 }));
    const list = await listDocuments();
    expect(list.map((d) => d.documentId)).toEqual(["newer", "middle", "older"]);
  });

  it("overwrites a document on save with same id", async () => {
    await saveDocument(makeDocument({ chunksCount: 1 }));
    await saveDocument(makeDocument({ chunksCount: 5 }));
    const list = await listDocuments();
    expect(list).toHaveLength(1);
    expect(list[0].chunksCount).toBe(5);
  });

  it("deletes a document and cascades to its chunks", async () => {
    await saveDocument(makeDocument({ documentId: "doc-a" }));
    await addChunks([
      makeChunk({ id: "c1", documentId: "doc-a", chunkIndex: 0 }),
      makeChunk({ id: "c2", documentId: "doc-a", chunkIndex: 1 }),
    ]);
    await deleteDocument("doc-a");
    expect(await getDocument("doc-a")).toBeNull();
    expect(await listChunksByDocument("doc-a")).toEqual([]);
  });
});

describe("chunks storage", () => {
  it("adds and lists all chunks", async () => {
    await addChunks([
      makeChunk({ id: "c1", chunkIndex: 0 }),
      makeChunk({ id: "c2", chunkIndex: 1 }),
      makeChunk({ id: "c3", chunkIndex: 2 }),
    ]);
    const all = await listAllChunks();
    expect(all).toHaveLength(3);
    expect(all.map((c) => c.id).sort()).toEqual(["c1", "c2", "c3"]);
  });

  it("returns empty list when no chunks stored", async () => {
    expect(await listAllChunks()).toEqual([]);
  });

  it("addChunks is a no-op for empty array", async () => {
    await expect(addChunks([])).resolves.toBeUndefined();
    expect(await listAllChunks()).toEqual([]);
  });

  it("filters chunks by document id", async () => {
    await addChunks([
      makeChunk({ id: "a1", documentId: "doc-a" }),
      makeChunk({ id: "a2", documentId: "doc-a" }),
      makeChunk({ id: "b1", documentId: "doc-b" }),
    ]);
    const a = await listChunksByDocument("doc-a");
    const b = await listChunksByDocument("doc-b");
    expect(a.map((c) => c.id).sort()).toEqual(["a1", "a2"]);
    expect(b.map((c) => c.id)).toEqual(["b1"]);
  });

  it("deletes only chunks for the given document", async () => {
    await addChunks([
      makeChunk({ id: "a1", documentId: "doc-a" }),
      makeChunk({ id: "b1", documentId: "doc-b" }),
    ]);
    await deleteChunksByDocument("doc-a");
    expect(await listChunksByDocument("doc-a")).toEqual([]);
    expect(await listChunksByDocument("doc-b")).toHaveLength(1);
  });

  it("preserves vector values across save and load", async () => {
    const vector = [0.42, -0.31, 0.99];
    await addChunks([makeChunk({ id: "v1", vector })]);
    const all = await listAllChunks();
    expect(all[0].vector).toEqual(vector);
  });
});
