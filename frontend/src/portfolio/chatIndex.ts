import { embedTexts } from "../api";
import { listAllChunks, addChunks, type StoredChunk } from "../storage";
import { VectorIndex } from "../vectorSearch";
import type { ContextChunkInput } from "../types";
import { buildPortfolioContext } from "./chatContext";

const PORTFOLIO_DOC_ID = "me-portfolio";
const PORTFOLIO_VERSION_KEY = "pf-chat-index-version";
const CURRENT_VERSION = "v4-2026-05-azure";

export type IndexStatus =
  | { kind: "idle" }
  | { kind: "indexing"; progress: number; total: number; phase: string }
  | { kind: "ready"; index: VectorIndex; total: number }
  | { kind: "error"; message: string };

export type RetrievedChunk = {
  filename: string;
  chunk_index: number;
  text: string;
};

function makeChunkId(idx: number): string {
  return `${PORTFOLIO_DOC_ID}-${idx}`;
}

function isCurrentVersion(): boolean {
  try {
    return localStorage.getItem(PORTFOLIO_VERSION_KEY) === CURRENT_VERSION;
  } catch {
    return false;
  }
}

function markCurrentVersion(): void {
  try {
    localStorage.setItem(PORTFOLIO_VERSION_KEY, CURRENT_VERSION);
  } catch {
    /* noop */
  }
}

async function loadExistingChunks(): Promise<StoredChunk[]> {
  try {
    const all = await listAllChunks();
    return all.filter((c) => c.documentId === PORTFOLIO_DOC_ID);
  } catch {
    return [];
  }
}

function chunksLookValid(chunks: StoredChunk[], expectedCount: number): boolean {
  if (chunks.length < expectedCount) return false;
  return chunks.every(
    (c) => Array.isArray(c.vector) && c.vector.length > 0 && typeof c.text === "string" && c.text.length > 0,
  );
}

/**
 * Ensures the portfolio knowledge base is indexed and ready in voy-search.
 *
 * - First load (or after IDB clear/version bump): embeds all chunks via /api/embed,
 *   stores in IndexedDB, builds VectorIndex.
 * - Subsequent loads: rebuilds VectorIndex from cached chunks (no API calls).
 * - If anything is missing or corrupted, falls back to re-indexing.
 *
 * Progress is reported via onProgress so the UI can show a "transfert de connaissance" animation.
 */
export async function ensurePortfolioIndex(
  onProgress?: (status: IndexStatus) => void,
): Promise<{ index: VectorIndex; total: number }> {
  const context: ContextChunkInput[] = buildPortfolioContext();
  const expected = context.length;

  // Try cache first
  if (isCurrentVersion()) {
    try {
      const cached = await loadExistingChunks();
      if (chunksLookValid(cached, expected)) {
        const index = new VectorIndex();
        index.rebuild(cached);
        onProgress?.({ kind: "ready", index, total: cached.length });
        return { index, total: cached.length };
      }
    } catch {
      // fall through to re-index
    }
  }

  // Index from scratch
  onProgress?.({
    kind: "indexing",
    progress: 0,
    total: expected,
    phase: "Préparation des chunks",
  });

  const texts = context.map((c) => c.text);
  let vectors: number[][] = [];

  try {
    onProgress?.({
      kind: "indexing",
      progress: 0,
      total: expected,
      phase: "Génération des embeddings",
    });
    vectors = await embedTexts(texts);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Impossible de contacter le service d'embedding.";
    onProgress?.({ kind: "error", message });
    throw err;
  }

  if (vectors.length !== expected) {
    const message = `Embeddings reçus ${vectors.length}/${expected}`;
    onProgress?.({ kind: "error", message });
    throw new Error(message);
  }

  const stored: StoredChunk[] = context.map((c, idx) => ({
    id: makeChunkId(idx),
    documentId: PORTFOLIO_DOC_ID,
    chunkIndex: idx,
    text: c.text,
    vector: vectors[idx] as number[],
  }));

  onProgress?.({
    kind: "indexing",
    progress: expected,
    total: expected,
    phase: "Stockage dans IndexedDB",
  });

  try {
    await addChunks(stored);
  } catch {
    // IndexedDB may be unavailable (private mode, etc.) — proceed in-memory only
  }

  markCurrentVersion();

  const index = new VectorIndex();
  index.rebuild(stored);
  onProgress?.({ kind: "ready", index, total: stored.length });

  return { index, total: stored.length };
}

/**
 * Retrieves top-k chunks from the index given a question.
 * Always prepends the persona chunk (chunk 0) so the LLM keeps the first-person role.
 */
export async function retrieveContext(
  question: string,
  index: VectorIndex,
  topK = 5,
): Promise<RetrievedChunk[]> {
  const allContext = buildPortfolioContext();
  const personaChunk = allContext[0];

  let topChunks: ContextChunkInput[] = [];
  try {
    const [queryVec] = await embedTexts([question]);
    if (queryVec) {
      const hits = index.search(queryVec, topK);
      const byId = new Map<string, ContextChunkInput>();
      allContext.forEach((c, idx) => byId.set(makeChunkId(idx), c));
      topChunks = hits
        .map((h) => byId.get(h.chunkId))
        .filter((c): c is ContextChunkInput => c !== undefined);
    }
  } catch {
    // If embed fails or index is empty, fallback to sending all chunks
    topChunks = allContext.slice(1);
  }

  // Always include persona at top + deduplicated top-k
  const result: RetrievedChunk[] = [];
  if (personaChunk) {
    result.push({
      filename: personaChunk.filename ?? "persona.md",
      chunk_index: 0,
      text: personaChunk.text,
    });
  }
  for (const c of topChunks) {
    if (personaChunk && c === personaChunk) continue;
    result.push({
      filename: c.filename ?? "chunk.md",
      chunk_index: c.chunk_index ?? 0,
      text: c.text,
    });
  }
  return result;
}
