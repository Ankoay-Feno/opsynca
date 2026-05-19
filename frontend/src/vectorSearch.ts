import { Voy } from "voy-search/voy_search.js";

import type { StoredChunk } from "./storage";

export type SearchHit = {
  chunkId: string;
};

export class VectorIndex {
  private voy: Voy;
  private currentSize = 0;

  constructor() {
    this.voy = new Voy();
  }

  rebuild(chunks: StoredChunk[]): void {
    this.voy.clear();
    this.currentSize = 0;
    this.addChunks(chunks);
  }

  addChunks(chunks: StoredChunk[]): void {
    if (!chunks.length) return;
    const resource = { embeddings: chunks.map(toEmbeddedResource) };
    if (this.currentSize === 0) {
      this.voy.index(resource);
    } else {
      this.voy.add(resource);
    }
    this.currentSize += chunks.length;
  }

  removeChunks(chunks: StoredChunk[]): void {
    if (!chunks.length || this.currentSize === 0) return;
    const resource = { embeddings: chunks.map(toEmbeddedResource) };
    this.voy.remove(resource);
    this.currentSize = Math.max(0, this.currentSize - chunks.length);
  }

  search(queryVector: number[], k: number): SearchHit[] {
    if (this.currentSize === 0 || k <= 0) return [];
    const query = new Float32Array(queryVector);
    const requested = Math.min(k, this.currentSize);
    const result = this.voy.search(query, requested);
    return result.neighbors.map((neighbor) => ({ chunkId: neighbor.id }));
  }

  size(): number {
    return this.currentSize;
  }

  clear(): void {
    this.voy.clear();
    this.currentSize = 0;
  }
}

let sharedIndex: VectorIndex | null = null;

export function getVectorIndex(): VectorIndex {
  if (!sharedIndex) {
    sharedIndex = new VectorIndex();
  }
  return sharedIndex;
}

export function resetVectorIndex(): void {
  sharedIndex = null;
}

function toEmbeddedResource(chunk: StoredChunk) {
  return {
    id: chunk.id,
    title: chunk.documentId,
    url: String(chunk.chunkIndex),
    embeddings: chunk.vector,
  };
}
