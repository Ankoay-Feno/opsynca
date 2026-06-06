// Shared between chatIndex.ts (browser) and scripts/precompute-index.ts (Node).
// Keep in sync: changing CURRENT_VERSION forces a cache bust + new precompute run.

export const PORTFOLIO_DOC_ID = "me-portfolio";
export const PORTFOLIO_VERSION_KEY = "pf-chat-index-version";
// Separate from the version key: captures text changes that don't bump the version
// (e.g. editing a bio paragraph without changing the embedding model).
export const PORTFOLIO_HASH_KEY = "pf-chat-index-hash";

// Bump this when KB content or embedding model changes.
// Old precomputed JSON and IndexedDB caches become stale automatically.
export const CURRENT_VERSION = "v5-2026-06-local-embed";

export function makeChunkId(idx: number): string {
  return `${PORTFOLIO_DOC_ID}-${idx}`;
}
