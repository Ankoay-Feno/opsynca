import { describe, expect, it } from "vitest";

import { chunkText, cleanForIndexing } from "./chunking";

describe("cleanForIndexing", () => {
  it("strips null chars and collapses whitespace", () => {
    const raw = "Hello\x00 world\n\n\n\n  next  line   with  spaces ";
    const cleaned = cleanForIndexing(raw);
    expect(cleaned).not.toContain("\x00");
    expect(cleaned.replace(/\n/g, "")).not.toContain("  ");
    expect(cleaned).not.toContain("\n\n\n");
    expect(cleaned.startsWith("Hello world")).toBe(true);
  });

  it("returns empty on blank input", () => {
    expect(cleanForIndexing("   \n\t  ")).toBe("");
  });

  it("strips leading whitespace after newlines", () => {
    expect(cleanForIndexing("ligne1\n   ligne2")).toBe("ligne1\nligne2");
  });

  it("normalizes CRLF and CR line endings", () => {
    expect(cleanForIndexing("a\r\nb\rc")).toBe("a\nb\nc");
  });
});

describe("chunkText", () => {
  it("returns no chunks on empty input", () => {
    expect(chunkText("")).toEqual([]);
  });

  it("returns no chunks on whitespace-only input", () => {
    expect(chunkText("   \n\t  ")).toEqual([]);
  });

  it("keeps short paragraphs together", () => {
    const chunks = chunkText("Premier paragraphe.\n\nDeuxieme paragraphe.", {
      chunkSize: 200,
      overlap: 20,
    });
    expect(chunks).toHaveLength(1);
    expect(chunks[0].text).toContain("Premier");
    expect(chunks[0].text).toContain("Deuxieme");
    expect(chunks[0].index).toBe(0);
  });

  it("splits long paragraphs with overlap", () => {
    const longParagraph = "Phrase. ".repeat(400);
    const chunks = chunkText(longParagraph, { chunkSize: 500, overlap: 50 });
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every((c) => c.text.length <= 500)).toBe(true);
    expect(chunks.map((c) => c.index)).toEqual(
      Array.from({ length: chunks.length }, (_, i) => i),
    );
  });

  it("keeps contiguous indices after a long paragraph", () => {
    const long = "A".repeat(2000);
    const chunks = chunkText(`Court paragraphe.\n\n${long}`, {
      chunkSize: 300,
      overlap: 20,
    });
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.map((c) => c.index)).toEqual(
      Array.from({ length: chunks.length }, (_, i) => i),
    );
    expect(chunks.every((c) => c.text.length <= 300)).toBe(true);
  });

  it("flushes accumulated paragraphs before starting a new one", () => {
    const chunks = chunkText("A".repeat(100) + "\n\n" + "B".repeat(100), {
      chunkSize: 120,
      overlap: 10,
    });
    expect(chunks).toHaveLength(2);
    expect(chunks[0].text).toBe("A".repeat(100));
    expect(chunks[1].text).toBe("B".repeat(100));
    expect(chunks.map((c) => c.index)).toEqual([0, 1]);
  });
});
