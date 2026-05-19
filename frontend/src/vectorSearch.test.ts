import { beforeEach, describe, expect, it } from "vitest";

import type { StoredChunk } from "./storage";
import { VectorIndex } from "./vectorSearch";

function makeChunk(id: string, vector: number[], overrides: Partial<StoredChunk> = {}): StoredChunk {
  return {
    id,
    documentId: "doc-1",
    chunkIndex: 0,
    text: `text-${id}`,
    vector,
    ...overrides,
  };
}

describe("VectorIndex", () => {
  let index: VectorIndex;

  beforeEach(() => {
    index = new VectorIndex();
  });

  it("starts empty", () => {
    expect(index.size()).toBe(0);
    expect(index.search([1, 0, 0], 3)).toEqual([]);
  });

  it("indexes chunks and finds the nearest neighbor", () => {
    index.addChunks([
      makeChunk("a", [1, 0, 0]),
      makeChunk("b", [0, 1, 0]),
      makeChunk("c", [0, 0, 1]),
    ]);
    expect(index.size()).toBe(3);

    const hits = index.search([0.9, 0.1, 0], 1);
    expect(hits).toHaveLength(1);
    expect(hits[0].chunkId).toBe("a");
  });

  it("returns up to k hits, capped by current size", () => {
    index.addChunks([
      makeChunk("a", [1, 0, 0]),
      makeChunk("b", [0, 1, 0]),
    ]);
    const hits = index.search([1, 0, 0], 10);
    expect(hits).toHaveLength(2);
  });

  it("returns empty when k is non-positive", () => {
    index.addChunks([makeChunk("a", [1, 0, 0])]);
    expect(index.search([1, 0, 0], 0)).toEqual([]);
    expect(index.search([1, 0, 0], -1)).toEqual([]);
  });

  it("addChunks is a no-op for empty array", () => {
    index.addChunks([]);
    expect(index.size()).toBe(0);
  });

  it("can add more chunks after an initial index", () => {
    index.addChunks([makeChunk("a", [1, 0, 0])]);
    index.addChunks([makeChunk("b", [0, 1, 0])]);
    expect(index.size()).toBe(2);
    const hits = index.search([0, 1, 0], 1);
    expect(hits[0].chunkId).toBe("b");
  });

  it("rebuild replaces the entire index", () => {
    index.addChunks([makeChunk("old", [1, 0, 0])]);
    index.rebuild([makeChunk("new", [0, 1, 0])]);
    expect(index.size()).toBe(1);
    const hits = index.search([0, 1, 0], 1);
    expect(hits[0].chunkId).toBe("new");
  });

  it("clears the index", () => {
    index.addChunks([makeChunk("a", [1, 0, 0])]);
    index.clear();
    expect(index.size()).toBe(0);
    expect(index.search([1, 0, 0], 1)).toEqual([]);
  });

  it("removes chunks from the index", () => {
    const chunkA = makeChunk("a", [1, 0, 0]);
    const chunkB = makeChunk("b", [0, 1, 0]);
    index.addChunks([chunkA, chunkB]);
    index.removeChunks([chunkA]);
    expect(index.size()).toBe(1);
  });
});
