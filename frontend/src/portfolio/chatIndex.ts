import { embedTexts } from "../api";
import { listAllChunks, addChunks, type StoredChunk } from "../storage";
import { VectorIndex } from "../vectorSearch";
import type { ContextChunkInput } from "../types";
import { buildPortfolioContext } from "./chatContext";
import {
  PORTFOLIO_DOC_ID,
  PORTFOLIO_VERSION_KEY,
  PORTFOLIO_HASH_KEY,
  CURRENT_VERSION,
  makeChunkId,
} from "./chatIndexConstants";

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

// Shape of the precomputed artifact served from /portfolio-index.json.
type PrecomputedChunk = {
  filename: string | null;
  chunk_index: number | null;
  text: string;
  vector: number[];
};

type PrecomputedIndex = {
  version: string;
  contentHash: string;
  dim: number;
  count: number;
  chunks: PrecomputedChunk[];
};

function isPrecomputedIndex(value: unknown): value is PrecomputedIndex {
  if (!value || typeof value !== "object") return false;
  const v = value as Partial<PrecomputedIndex>;
  return (
    typeof v.version === "string" &&
    typeof v.contentHash === "string" &&
    typeof v.dim === "number" &&
    typeof v.count === "number" &&
    Array.isArray(v.chunks)
  );
}

// Using Web Crypto API (crypto.subtle) on both sides (browser + Node >= 15)
// guarantees byte-identical SHA-256 hashes without any extra dependency.
async function sha256Hex(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Must match the same function in scripts/precompute-index.ts.
async function computeContentHash(texts: string[]): Promise<string> {
  const combined = texts.join("\x00");
  return sha256Hex(combined);
}

/**
 * Fetches /portfolio-index.json and validates it against the current KB.
 * Returns null (without throwing) if the asset is absent, malformed, or stale.
 */
export async function loadPrecomputedIndex(
  chunks: ContextChunkInput[],
): Promise<PrecomputedIndex | null> {
  let raw: unknown;
  try {
    const res = await fetch("/portfolio-index.json");
    if (!res.ok) return null;
    raw = await res.json();
  } catch {
    return null;
  }

  if (!isPrecomputedIndex(raw)) {
    console.warn("precomputed index: invalid shape, fallback to runtime embedding");
    return null;
  }

  if (raw.version !== CURRENT_VERSION) {
    console.warn(
      `precomputed index stale: version "${raw.version}" !== "${CURRENT_VERSION}", fallback to runtime embedding`,
    );
    return null;
  }

  if (raw.count !== chunks.length) {
    console.warn(
      `precomputed index stale: count ${raw.count} !== ${chunks.length}, fallback to runtime embedding`,
    );
    return null;
  }

  const expectedHash = await computeContentHash(chunks.map((c) => c.text));
  if (raw.contentHash !== expectedHash) {
    console.warn(
      "precomputed index stale: contentHash mismatch, fallback to runtime embedding",
    );
    return null;
  }

  return raw;
}

function isCurrentVersion(): boolean {
  try {
    return localStorage.getItem(PORTFOLIO_VERSION_KEY) === CURRENT_VERSION;
  } catch {
    return false;
  }
}

function isCurrentHash(hash: string): boolean {
  try {
    return localStorage.getItem(PORTFOLIO_HASH_KEY) === hash;
  } catch {
    return false;
  }
}

// Version = schema/model changes (e.g. Gemini 768d → local 384d: same text, different vectors).
// Hash    = text changes (content edits that don't need a version bump).
// Both must match to safely reuse the IDB cache.
function markCurrentVersionAndHash(hash: string): void {
  try {
    localStorage.setItem(PORTFOLIO_VERSION_KEY, CURRENT_VERSION);
    localStorage.setItem(PORTFOLIO_HASH_KEY, hash);
  } catch {
    /* noop — private browsing mode may forbid writes */
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
 * Priority order:
 *  1. IndexedDB cache (valid version) — no network calls.
 *  2. Precomputed static asset /portfolio-index.json — no /api/embed call.
 *  3. Runtime fallback — calls /api/embed for every KB chunk.
 *
 * Progress is reported via onProgress so the UI can show the indexing animation.
 */
export async function ensurePortfolioIndex(
  onProgress?: (status: IndexStatus) => void,
): Promise<{ index: VectorIndex; total: number }> {
  const context: ContextChunkInput[] = buildPortfolioContext();
  const expected = context.length;

  // Compute once; reused for IDB cache validation and for persisting after (re)indexing.
  const currentHash = await computeContentHash(context.map((c) => c.text));

  // 1. IndexedDB cache — valid only when version AND content hash AND chunk shape all match.
  // Version catches model/dimension changes; hash catches text edits without a version bump.
  if (isCurrentVersion() && isCurrentHash(currentHash)) {
    try {
      const cached = await loadExistingChunks();
      if (chunksLookValid(cached, expected)) {
        const index = new VectorIndex();
        index.rebuild(cached);
        onProgress?.({ kind: "ready", index, total: cached.length });
        return { index, total: cached.length };
      }
    } catch {
      // fall through
    }
  }

  onProgress?.({
    kind: "indexing",
    progress: 0,
    total: expected,
    phase: "Préparation des chunks",
  });

  // 2. Precomputed static asset
  const precomputed = await loadPrecomputedIndex(context);
  if (precomputed !== null) {
    onProgress?.({
      kind: "indexing",
      progress: 0,
      total: expected,
      phase: "Chargement de l'index précalculé",
    });

    const stored: StoredChunk[] = precomputed.chunks.map((c, idx) => ({
      id: makeChunkId(idx),
      documentId: PORTFOLIO_DOC_ID,
      chunkIndex: idx,
      text: c.text,
      vector: c.vector,
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

    markCurrentVersionAndHash(currentHash);

    const index = new VectorIndex();
    index.rebuild(stored);
    onProgress?.({ kind: "ready", index, total: stored.length });
    return { index, total: stored.length };
  }

  // 3. Runtime fallback: embed every KB chunk via /api/embed
  let vectors: number[][] = [];
  try {
    onProgress?.({
      kind: "indexing",
      progress: 0,
      total: expected,
      phase: "Génération des embeddings",
    });
    vectors = await embedTexts(context.map((c) => c.text));
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

  markCurrentVersionAndHash(currentHash);

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
