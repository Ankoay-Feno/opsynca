/**
 * Precomputes portfolio KB embeddings at build-time.
 *
 * Usage:
 *   PRECOMPUTE_API_BASE=https://your-api.example.com npm run precompute
 *
 * The script calls the same /api/embed endpoint used at runtime, guaranteeing
 * identical model and vector dimensions. The output JSON is committed to
 * frontend/public/ so browsers can load it as a static asset instead of
 * calling /api/embed on every first visit.
 *
 * Requires the backend to be running and reachable at PRECOMPUTE_API_BASE.
 */

import { webcrypto } from "node:crypto";
import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildPortfolioContext } from "../src/portfolio/chatContext.js";
import { CURRENT_VERSION } from "../src/portfolio/chatIndexConstants.js";

const API_BASE = process.env["PRECOMPUTE_API_BASE"] ?? "http://localhost:8000";
// fileURLToPath(import.meta.url) plutôt que import.meta.dirname (Node < 20.11).
const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const OUT_PATH = resolve(SCRIPT_DIR, "../public/portfolio-index.json");

// Web Crypto API is available in Node >= 15 — same implementation as the browser.
// Using it on both sides guarantees byte-identical hashes without extra deps.
async function sha256Hex(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  // webcrypto (et non le global `crypto`, absent avant Node 19) : meme algo
  // que crypto.subtle cote navigateur => hash byte-identique.
  const hashBuffer = await webcrypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function computeContentHash(texts: string[]): Promise<string> {
  // Stable: join with a separator that cannot appear in normal text.
  const combined = texts.join("\x00");
  return sha256Hex(combined);
}

async function embedTexts(texts: string[]): Promise<number[][]> {
  const url = `${API_BASE}/api/embed`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ texts }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`POST ${url} failed with ${response.status}: ${body}`);
  }

  const data = (await response.json()) as { embeddings: number[][] };
  return data.embeddings;
}

async function main(): Promise<void> {
  const chunks = buildPortfolioContext();
  const texts = chunks.map((c) => c.text);

  console.log(`Precomputing embeddings for ${chunks.length} chunks…`);
  console.log(`  API: ${API_BASE}/api/embed`);
  console.log(`  Version: ${CURRENT_VERSION}`);

  const [vectors, contentHash] = await Promise.all([
    embedTexts(texts),
    computeContentHash(texts),
  ]);

  if (vectors.length !== chunks.length) {
    throw new Error(
      `Embedding count mismatch: got ${vectors.length}, expected ${chunks.length}`,
    );
  }

  const dim = vectors[0]?.length ?? 0;
  if (dim === 0) {
    throw new Error("Received zero-dimension embeddings — check the backend response.");
  }

  const artifact = {
    version: CURRENT_VERSION,
    contentHash,
    dim,
    count: chunks.length,
    chunks: chunks.map((c, idx) => ({
      filename: c.filename,
      chunk_index: c.chunk_index,
      text: c.text,
      vector: vectors[idx] as number[],
    })),
  };

  writeFileSync(OUT_PATH, JSON.stringify(artifact), "utf-8");

  console.log(`Done. Written to ${OUT_PATH}`);
  console.log(`  dim=${dim}, count=${chunks.length}, contentHash=${contentHash}`);
}

main().catch((err: unknown) => {
  console.error("precompute-index failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
