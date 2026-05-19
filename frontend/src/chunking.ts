export interface TextChunk {
  index: number;
  text: string;
}

export interface ChunkOptions {
  chunkSize?: number;
  overlap?: number;
}

const DEFAULT_CHUNK_SIZE = 1200;
const DEFAULT_OVERLAP = 180;

export function cleanForIndexing(text: string): string {
  let result = text.replace(/\x00/g, " ");
  result = result.replace(/[ \t]+/g, " ");
  result = result.replace(/\n[ \t]+/g, "\n");
  result = result.replace(/\n{3,}/g, "\n\n");
  result = result
    .split(/\r\n|\r|\n/)
    .map((line) => line.trim())
    .join("\n");
  return result.trim();
}

export function chunkText(text: string, options: ChunkOptions = {}): TextChunk[] {
  const chunkSize = options.chunkSize ?? DEFAULT_CHUNK_SIZE;
  const overlap = options.overlap ?? DEFAULT_OVERLAP;

  const cleaned = cleanForIndexing(text);
  if (!cleaned) {
    return [];
  }

  const paragraphs = cleaned
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);

  const chunks: TextChunk[] = [];
  let current = "";

  for (const paragraph of paragraphs) {
    if (paragraph.length > chunkSize) {
      chunks.push(..._splitLongText(paragraph, chunkSize, overlap, chunks.length));
      current = "";
      continue;
    }

    const candidate = current ? `${current}\n\n${paragraph}`.trim() : paragraph;
    if (candidate.length <= chunkSize) {
      current = candidate;
      continue;
    }

    if (current) {
      chunks.push({ index: chunks.length, text: current });
    }
    current = paragraph;
  }

  if (current) {
    chunks.push({ index: chunks.length, text: current });
  }

  return chunks;
}

function _splitLongText(
  text: string,
  chunkSize: number,
  overlap: number,
  start: number,
): TextChunk[] {
  const chunks: TextChunk[] = [];
  let cursor = 0;

  while (cursor < text.length) {
    const end = Math.min(cursor + chunkSize, text.length);
    const piece = text.slice(cursor, end).trim();
    if (piece) {
      chunks.push({ index: start + chunks.length, text: piece });
    }
    if (end === text.length) {
      break;
    }
    cursor = Math.max(end - overlap, cursor + 1);
  }

  return chunks;
}
