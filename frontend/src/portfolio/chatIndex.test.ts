import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clear, createStore } from "idb-keyval";

import {
  CURRENT_VERSION,
  PORTFOLIO_HASH_KEY,
  PORTFOLIO_VERSION_KEY,
} from "./chatIndexConstants";
import { loadPrecomputedIndex, ensurePortfolioIndex } from "./chatIndex";
import { buildPortfolioContext } from "./chatContext";
import { addChunks } from "../storage";

// Reset IndexedDB and localStorage between tests.
const chunksTestStore = createStore("portfolio-rag-chunks", "chunks");

async function resetStores(): Promise<void> {
  await clear(chunksTestStore);
  try {
    localStorage.clear();
  } catch {
    /* noop */
  }
}

beforeEach(async () => {
  await resetStores();
  vi.restoreAllMocks();
});

afterEach(async () => {
  await resetStores();
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a valid precomputed artifact for the current KB. */
async function buildValidArtifact(): Promise<object> {
  const chunks = buildPortfolioContext();
  const texts = chunks.map((c) => c.text);
  const combined = texts.join("\x00");
  const encoder = new TextEncoder();
  const data = encoder.encode(combined);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const contentHash = Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return {
    version: CURRENT_VERSION,
    contentHash,
    dim: 3,
    count: chunks.length,
    chunks: chunks.map((c) => ({
      filename: c.filename,
      chunk_index: c.chunk_index,
      text: c.text,
      vector: [0.1, 0.2, 0.3],
    })),
  };
}

function mockFetchWith(payload: unknown, status = 200): void {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      json: () => Promise.resolve(payload),
    }),
  );
}

function mockFetchNotFound(): void {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: () => Promise.resolve(null),
    }),
  );
}

// ---------------------------------------------------------------------------
// loadPrecomputedIndex
// ---------------------------------------------------------------------------

describe("loadPrecomputedIndex", () => {
  it("returns null when /portfolio-index.json returns 404", async () => {
    mockFetchNotFound();
    const chunks = buildPortfolioContext();
    const result = await loadPrecomputedIndex(chunks);
    expect(result).toBeNull();
  });

  it("returns null when fetch rejects (network error)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network")));
    const chunks = buildPortfolioContext();
    const result = await loadPrecomputedIndex(chunks);
    expect(result).toBeNull();
  });

  it("returns null when JSON is malformed / wrong shape", async () => {
    mockFetchWith({ notAnIndex: true });
    const chunks = buildPortfolioContext();
    const result = await loadPrecomputedIndex(chunks);
    expect(result).toBeNull();
  });

  it("returns null when version does not match CURRENT_VERSION", async () => {
    const artifact = await buildValidArtifact();
    mockFetchWith({ ...(artifact as Record<string, unknown>), version: "v-old" });
    const chunks = buildPortfolioContext();
    const result = await loadPrecomputedIndex(chunks);
    expect(result).toBeNull();
  });

  it("returns null when count does not match chunk count", async () => {
    const artifact = await buildValidArtifact();
    mockFetchWith({ ...(artifact as Record<string, unknown>), count: 9999 });
    const chunks = buildPortfolioContext();
    const result = await loadPrecomputedIndex(chunks);
    expect(result).toBeNull();
  });

  it("returns null when contentHash does not match current KB", async () => {
    const artifact = await buildValidArtifact();
    mockFetchWith({
      ...(artifact as Record<string, unknown>),
      contentHash: "0000000000000000000000000000000000000000000000000000000000000000",
    });
    const chunks = buildPortfolioContext();
    const result = await loadPrecomputedIndex(chunks);
    expect(result).toBeNull();
  });

  it("returns the artifact when all validations pass", async () => {
    const artifact = await buildValidArtifact();
    mockFetchWith(artifact);
    const chunks = buildPortfolioContext();
    const result = await loadPrecomputedIndex(chunks);
    expect(result).not.toBeNull();
    expect(result?.version).toBe(CURRENT_VERSION);
    expect(result?.count).toBe(chunks.length);
  });
});

// ---------------------------------------------------------------------------
// ensurePortfolioIndex — precomputed path vs runtime fallback
// ---------------------------------------------------------------------------

describe("ensurePortfolioIndex", () => {
  it("uses precomputed artifact when valid — no call to /api/embed", async () => {
    const artifact = await buildValidArtifact();
    // First fetch call goes to /portfolio-index.json; there should be no further fetch.
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(artifact),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { total } = await ensurePortfolioIndex();

    expect(total).toBe(buildPortfolioContext().length);
    // Only one fetch call: to /portfolio-index.json — never to /api/embed.
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const firstCall = fetchMock.mock.calls[0] as [string, ...unknown[]];
    expect(firstCall[0]).toBe("/portfolio-index.json");
  });

  it("falls back to /api/embed when artifact is absent (404)", async () => {
    const chunks = buildPortfolioContext();
    const fakeVectors = chunks.map(() => [0.1, 0.2, 0.3]);

    const fetchMock = vi
      .fn()
      // First call → /portfolio-index.json → 404
      .mockResolvedValueOnce({ ok: false, status: 404, json: () => Promise.resolve(null) })
      // Second call → /api/embed → success
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ embeddings: fakeVectors }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const { total } = await ensurePortfolioIndex();

    expect(total).toBe(chunks.length);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    // Second call must target /api/embed
    const secondCall = fetchMock.mock.calls[1] as [string, unknown];
    expect(secondCall[0]).toContain("/api/embed");
  });

  it("falls back to /api/embed when artifact version is stale", async () => {
    const artifact = await buildValidArtifact();
    const chunks = buildPortfolioContext();
    const fakeVectors = chunks.map(() => [0.5, 0.5, 0.5]);

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ ...(artifact as Record<string, unknown>), version: "v-stale" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ embeddings: fakeVectors }),
      });
    vi.stubGlobal("fetch", fetchMock);

    await ensurePortfolioIndex();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const secondCall = fetchMock.mock.calls[1] as [string, unknown];
    expect(secondCall[0]).toContain("/api/embed");
  });

  // ---------------------------------------------------------------------------
  // IDB cache + hash validation
  // ---------------------------------------------------------------------------

  it("reuses IDB cache without any fetch when version AND hash both match", async () => {
    // Pre-populate IDB with valid chunks matching current KB.
    const chunks = buildPortfolioContext();

    // Compute the hash the same way ensurePortfolioIndex does.
    const texts = chunks.map((c) => c.text);
    const combined = texts.join("\x00");
    const encoder = new TextEncoder();
    const data = encoder.encode(combined);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const currentHash = Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    const storedChunks = chunks.map((c, idx) => ({
      id: `me-portfolio-${idx}`,
      documentId: "me-portfolio",
      chunkIndex: idx,
      text: c.text,
      vector: [0.1, 0.2, 0.3],
    }));
    await addChunks(storedChunks);

    localStorage.setItem(PORTFOLIO_VERSION_KEY, CURRENT_VERSION);
    localStorage.setItem(PORTFOLIO_HASH_KEY, currentHash);

    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const { total } = await ensurePortfolioIndex();

    // IDB hit: no network call whatsoever.
    expect(fetchMock).not.toHaveBeenCalled();
    expect(total).toBe(chunks.length);
  });

  it("bypasses IDB cache and re-indexes when hash differs even though version matches", async () => {
    // Pre-populate IDB with valid chunks, but record a stale hash in localStorage.
    const chunks = buildPortfolioContext();
    const storedChunks = chunks.map((c, idx) => ({
      id: `me-portfolio-${idx}`,
      documentId: "me-portfolio",
      chunkIndex: idx,
      text: c.text,
      vector: [0.1, 0.2, 0.3],
    }));
    await addChunks(storedChunks);

    localStorage.setItem(PORTFOLIO_VERSION_KEY, CURRENT_VERSION);
    // Deliberately wrong hash — simulates a content edit without a version bump.
    localStorage.setItem(PORTFOLIO_HASH_KEY, "0000000000000000000000000000000000000000000000000000000000000000");

    const artifact = await buildValidArtifact();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(artifact),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { total } = await ensurePortfolioIndex();

    // Cache was stale — must have fallen through to the precomputed artifact path.
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const firstCall = fetchMock.mock.calls[0] as [string, ...unknown[]];
    expect(firstCall[0]).toBe("/portfolio-index.json");
    expect(total).toBe(chunks.length);
  });
});
