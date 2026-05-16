import type {
  ChatHistoryMessage,
  ChatResponse,
  IndexedDocument,
  IndexResponse,
} from "./types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

export async function listDocuments(): Promise<IndexedDocument[]> {
  return requestJson<IndexedDocument[]>("/api/rag/documents");
}

export async function uploadDocument(file: File): Promise<IndexResponse> {
  const formData = new FormData();
  formData.append("file", file);

  return requestJson<IndexResponse>("/api/rag/upload", {
    method: "POST",
    body: formData,
  });
}

export async function deleteDocument(documentId: string): Promise<void> {
  await requestJson(`/api/rag/documents/${documentId}`, { method: "DELETE" });
}

export async function sendQuestion(
  message: string,
  topK: number,
  history: ChatHistoryMessage[],
): Promise<ChatResponse> {
  return requestJson<ChatResponse>("/api/rag/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, top_k: topK, history }),
  });
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
