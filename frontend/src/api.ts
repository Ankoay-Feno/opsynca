import type {
  AnswerResponse,
  ChatHistoryMessage,
  ContextChunkInput,
  CvJobSearchResponse,
  ExtractResponse,
  JobFilters,
  JobSearchResponse,
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

export async function fetchAnswer(
  message: string,
  context: ContextChunkInput[],
  history: ChatHistoryMessage[],
  signal?: AbortSignal,
): Promise<AnswerResponse> {
  return requestJson<AnswerResponse>("/api/answer", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, context, history }),
    signal,
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

export async function searchJobs(
  query: string,
  filters: JobFilters,
  signal?: AbortSignal,
): Promise<JobSearchResponse> {
  const params = new URLSearchParams();
  const trimmed = query.trim();
  if (trimmed) params.set("q", trimmed);
  params.set("madagascar", String(filters.madagascar));
  params.set("remote", String(filters.remote));
  return requestJson<JobSearchResponse>(`/api/jobs?${params.toString()}`, { signal });
}

export async function searchJobsFromCv(
  file: File,
  filters: JobFilters,
  signal?: AbortSignal,
): Promise<CvJobSearchResponse> {
  const params = new URLSearchParams();
  params.set("madagascar", String(filters.madagascar));
  params.set("remote", String(filters.remote));

  const formData = new FormData();
  formData.append("file", file);

  return requestJson<CvJobSearchResponse>(`/api/jobs/from-cv?${params.toString()}`, {
    method: "POST",
    body: formData,
    signal,
  });
}

export async function searchJobsFromProfile(
  profile: { metier: string | null; mots_cles: string[] },
  filters: JobFilters,
  signal?: AbortSignal,
): Promise<CvJobSearchResponse> {
  const params = new URLSearchParams();
  params.set("madagascar", String(filters.madagascar));
  params.set("remote", String(filters.remote));

  return requestJson<CvJobSearchResponse>(`/api/jobs/from-profile?${params.toString()}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ metier: profile.metier, mots_cles: profile.mots_cles }),
    signal,
  });
}

// Le backend tourne en scale-to-zero (Azure Container Apps) : la premiere requete
// apres une periode d'inactivite tombe pendant le reveil du conteneur (~10-15s) et
// echoue (erreur reseau "connection refused" ou 502/503/504 du gateway). On absorbe
// ce cold start avec un retry a backoff, transparent pour l'utilisateur.
const WAKE_RETRY_STATUSES = new Set([502, 503, 504]);
const WAKE_RETRY_DELAYS_MS = [1000, 2000, 4000, 6000];

async function requestJson<T>(path: string, options: RequestInit = {}): Promise<T> {
  const { response, data } = await fetchWithWakeRetry(`${API_BASE_URL}${path}`, options);

  if (!response.ok) {
    throw new Error(formatApiError(data, response.status));
  }

  return data as T;
}

async function fetchWithWakeRetry(
  url: string,
  options: RequestInit,
): Promise<{ response: Response; data: unknown }> {
  for (let attempt = 0; ; attempt++) {
    const isLast = attempt >= WAKE_RETRY_DELAYS_MS.length;
    try {
      const response = await fetch(url, options);
      const data = await response.json().catch(() => null);
      // Cold start : le gateway renvoie un 502/503/504 dont le corps n'est PAS notre
      // JSON d'erreur (data === null). Nos erreurs applicatives sont du JSON => pas de retry.
      if (isLast || !WAKE_RETRY_STATUSES.has(response.status) || data !== null) {
        return { response, data };
      }
    } catch (error) {
      // fetch jette = erreur reseau (connection refused pendant le reveil).
      if (isLast || options.signal?.aborted) throw error;
    }
    await delay(WAKE_RETRY_DELAYS_MS[attempt], options.signal);
  }
}

function delay(ms: number, signal?: AbortSignal | null): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    const onAbort = () => {
      clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    signal?.addEventListener("abort", onAbort, { once: true });
  });
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
