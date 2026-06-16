import { del, entries, get, set } from "idb-keyval";

import { createResilientStore } from "../storage";
import type { CvJobSearchResponse, JobFilters } from "../types";

const jobsStore = createResilientStore("portfolio-jobs", "jobs");

const APPLIED_KEY = "applied";
const CV_CACHE_PREFIX = "cv:";
// Les offres evoluent : au-dela de 30 min on relance la recherche (mais le CV
// reste dans la liste des CVs traites, consultable a tout moment).
const CV_CACHE_TTL_MS = 30 * 60 * 1000;

export type ProcessedCv = {
  cacheKey: string;
  filename: string;
  filters: JobFilters;
  response: CvJobSearchResponse;
  storedAt: number;
};

/** Empreinte SHA-256 du CONTENU du fichier (pas du nom) → clé de cache stable. */
export async function hashFile(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

/** Résultat caché seulement s'il est encore frais (TTL) — pour la ré-utilisation auto. */
export async function getFreshCv(cacheKey: string): Promise<CvJobSearchResponse | null> {
  const cached = await get<ProcessedCv>(`${CV_CACHE_PREFIX}${cacheKey}`, jobsStore);
  if (!cached) return null;
  if (Date.now() - cached.storedAt > CV_CACHE_TTL_MS) return null;
  return cached.response;
}

export async function saveProcessedCv(record: ProcessedCv): Promise<void> {
  await set(`${CV_CACHE_PREFIX}${record.cacheKey}`, record, jobsStore);
}

/** Tous les CVs traites (meme expires) — pour la liste consultable. */
export async function listProcessedCvs(): Promise<ProcessedCv[]> {
  const all = (await entries(jobsStore)) as [IDBValidKey, unknown][];
  const list: ProcessedCv[] = [];
  for (const [key, value] of all) {
    if (typeof key !== "string" || !key.startsWith(CV_CACHE_PREFIX)) continue;
    if (isProcessedCv(value)) list.push(value);
  }
  return list.sort((a, b) => b.storedAt - a.storedAt);
}

export async function deleteProcessedCv(cacheKey: string): Promise<void> {
  await del(`${CV_CACHE_PREFIX}${cacheKey}`, jobsStore);
}

export async function getAppliedIds(): Promise<Set<string>> {
  const ids = await get<string[]>(APPLIED_KEY, jobsStore);
  return new Set(ids ?? []);
}

export async function setApplied(id: string, applied: boolean): Promise<Set<string>> {
  const ids = await getAppliedIds();
  if (applied) {
    ids.add(id);
  } else {
    ids.delete(id);
  }
  await set(APPLIED_KEY, Array.from(ids), jobsStore);
  return ids;
}

function isProcessedCv(value: unknown): value is ProcessedCv {
  if (!value || typeof value !== "object") return false;
  const c = value as Partial<ProcessedCv>;
  return (
    typeof c.cacheKey === "string" &&
    typeof c.filename === "string" &&
    typeof c.storedAt === "number" &&
    !!c.response &&
    Array.isArray(c.response.jobs)
  );
}
