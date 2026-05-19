import type {
  AnswerResponse,
  ChatHistoryMessage,
  ContextChunkInput,
  ExtractResponse,
} from "./types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

export async function extractFile(file: File): Promise<ExtractResponse> {
  const formData = new FormData();
  formData.append("file", file);

  return requestJson<ExtractResponse>("/api/extract", {
    method: "POST",
    body: formData,
  });
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (!texts.length) return [];
  const result = await requestJson<{ embeddings: number[][] }>("/api/embed", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ texts }),
  });
  return result.embeddings;
}

export async function requestAnswer(
  message: string,
  context: ContextChunkInput[],
  history: ChatHistoryMessage[],
): Promise<AnswerResponse> {
  return requestJson<AnswerResponse>("/api/answer", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, context, history }),
  });
}

export async function generateConversationTitle(
  messages: ChatHistoryMessage[],
): Promise<string> {
  const result = await requestJson<{ title: string }>("/api/title", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages }),
  });
  return result.title;
}

async function requestJson<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, options);
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(formatApiError(data, response.status));
  }

  return data as T;
}

function formatApiError(data: unknown, status: number): string {
  if (typeof data === "object" && data !== null && "detail" in data) {
    const detail = (data as { detail: unknown }).detail;
    if (typeof detail === "string") {
      return detail;
    }
    if (typeof detail === "object" && detail !== null) {
      const message = "message" in detail ? String((detail as { message: unknown }).message) : null;
      const fix = "fix" in detail ? String((detail as { fix: unknown }).fix) : null;
      const error = "error" in detail ? String((detail as { error: unknown }).error) : null;
      return [message, fix, error].filter(Boolean).join(" ");
    }
  }

  if (typeof data === "object" && data !== null && "message" in data) {
    return String((data as { message: unknown }).message);
  }

  return `Erreur HTTP ${status}`;
}
