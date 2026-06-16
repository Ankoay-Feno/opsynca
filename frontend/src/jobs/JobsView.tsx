import { useEffect, useRef, useState } from "react";

import { searchJobs, searchJobsFromCv, searchJobsFromProfile } from "../api";
import type { Job, JobFilters } from "../types";
import { CvSummary } from "./components/CvSummary";
import { JobsFooter } from "./components/JobsFooter";
import { JobsHeader } from "./components/JobsHeader";
import { CvUpload } from "./components/CvUpload";
import { JobCard } from "./components/JobCard";
import { JobSearchForm } from "./components/JobSearchForm";
import { ProcessedCvList } from "./components/ProcessedCvList";
import {
  type ProcessedCv,
  deleteProcessedCv,
  getAppliedIds,
  getFreshCv,
  hashFile,
  listProcessedCvs,
  saveProcessedCv,
  setApplied,
} from "./jobsStore";
import "./jobs.css";

type Mode = "keyword" | "cv";
type CvProfile = { metier: string | null; motsCles: string[] };

export function JobsView() {
  const [mode, setMode] = useState<Mode>("keyword");
  const [query, setQuery] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [filters, setFilters] = useState<JobFilters>({ madagascar: true, remote: true });
  const [jobs, setJobs] = useState<Job[]>([]);
  const [cvProfile, setCvProfile] = useState<CvProfile | null>(null);
  const [processedCvs, setProcessedCvs] = useState<ProcessedCv[]>([]);
  const [activeCvKey, setActiveCvKey] = useState<string | null>(null);
  const [refreshingKey, setRefreshingKey] = useState<string | null>(null);
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const previousTitle = document.title;
    document.title = "Recherche d'emploi";
    document.body.classList.add("pf-body");
    void getAppliedIds().then(setAppliedIds);
    void listProcessedCvs().then(setProcessedCvs);
    return () => {
      document.title = previousTitle;
      document.body.classList.remove("pf-body");
      controllerRef.current?.abort();
    };
  }, []);

  const hasSource = filters.madagascar || filters.remote;

  async function run(fetcher: (signal: AbortSignal) => Promise<Job[]>) {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;

    setLoading(true);
    setError(null);
    setHasSearched(true);
    try {
      const found = await fetcher(controller.signal);
      setJobs(found);
    } catch (err) {
      if (controller.signal.aborted) return;
      setError(err instanceof Error ? err.message : "Erreur inconnue.");
      setJobs([]);
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }

  function runKeywordSearch() {
    setCvProfile(null);
    setActiveCvKey(null);
    void run(async (signal) => {
      const result = await searchJobs(query, filters, signal);
      return result.jobs;
    });
  }

  async function runCvSearch() {
    if (!file) return;
    // Clé de cache = empreinte du CV + filtres (les résultats en dépendent).
    const cacheKey = `${await hashFile(file)}:${filters.madagascar}:${filters.remote}`;
    const fresh = await getFreshCv(cacheKey);
    if (fresh) {
      showResult(cacheKey, fresh.metier, fresh.mots_cles, fresh.jobs);
      return;
    }
    const filename = file.name;
    void run(async (signal) => {
      const result = await searchJobsFromCv(file, filters, signal);
      setCvProfile({ metier: result.metier, motsCles: result.mots_cles });
      setActiveCvKey(cacheKey);
      await saveProcessedCv({
        cacheKey,
        filename,
        filters,
        response: result,
        storedAt: Date.now(),
      });
      setProcessedCvs(await listProcessedCvs());
      return result.jobs;
    });
  }

  function showResult(
    cacheKey: string,
    metier: string | null,
    motsCles: string[],
    foundJobs: Job[],
  ) {
    setMode("cv");
    setCvProfile({ metier, motsCles });
    setJobs(foundJobs);
    setActiveCvKey(cacheKey);
    setHasSearched(true);
    setError(null);
  }

  function selectProcessedCv(item: ProcessedCv) {
    showResult(item.cacheKey, item.response.metier, item.response.mots_cles, item.response.jobs);
  }

  async function removeProcessedCv(cacheKey: string) {
    await deleteProcessedCv(cacheKey);
    setProcessedCvs(await listProcessedCvs());
    if (activeCvKey === cacheKey) setActiveCvKey(null);
  }

  // Relance la recherche d'un CV deja traite (nouvelles offres) sans le fichier
  // ni le LLM : on reutilise le profil deja extrait, on re-cherche et re-score.
  async function refreshOne(item: ProcessedCv) {
    const result = await searchJobsFromProfile(
      { metier: item.response.metier, mots_cles: item.response.mots_cles },
      item.filters,
    );
    await saveProcessedCv({ ...item, response: result, storedAt: Date.now() });
    return result;
  }

  async function refreshProcessedCv(item: ProcessedCv) {
    setRefreshingKey(item.cacheKey);
    setError(null);
    try {
      const result = await refreshOne(item);
      setProcessedCvs(await listProcessedCvs());
      showResult(item.cacheKey, result.metier, result.mots_cles, result.jobs);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de la relance.");
    } finally {
      setRefreshingKey(null);
    }
  }

  async function refreshAllProcessedCvs() {
    setError(null);
    for (const item of processedCvs) {
      setRefreshingKey(item.cacheKey);
      try {
        await refreshOne(item);
      } catch {
        // une relance qui echoue ne bloque pas les autres
      }
    }
    setRefreshingKey(null);
    setProcessedCvs(await listProcessedCvs());
  }

  function toggleApplied(id: string, applied: boolean) {
    void setApplied(id, applied).then(setAppliedIds);
  }

  return (
    <div className="pf-root jobs-root">
      <JobsHeader />
      <main className="jobs-main">
      <header className="jobs-header">
        <h1 className="jobs-h1">Recherche d'emploi</h1>
        <p className="jobs-sub">
          Cherche par mot-clé, ou laisse ton CV trouver les offres pour toi.
        </p>
      </header>

      <div className="jobs-panel">
        <div className="jobs-tabs" role="tablist" aria-label="Mode de recherche">
          <button
            type="button"
            role="tab"
            aria-selected={mode === "keyword"}
            className="jobs-tab"
            data-active={mode === "keyword"}
            onClick={() => setMode("keyword")}
          >
            Par mot-clé
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "cv"}
            className="jobs-tab"
            data-active={mode === "cv"}
            onClick={() => setMode("cv")}
          >
            Depuis mon CV
          </button>
        </div>

        <fieldset className="jobs-form-filters">
          <legend className="jobs-form-label">Sources</legend>
          <label className="jobs-checkbox">
            <input
              type="checkbox"
              checked={filters.madagascar}
              onChange={(event) =>
                setFilters({ ...filters, madagascar: event.target.checked })
              }
            />
            Madagascar
          </label>
          <label className="jobs-checkbox">
            <input
              type="checkbox"
              checked={filters.remote}
              onChange={(event) => setFilters({ ...filters, remote: event.target.checked })}
            />
            Remote
          </label>
        </fieldset>

        {mode === "keyword" ? (
          <JobSearchForm
            query={query}
            loading={loading}
            disabled={loading || !hasSource}
            onQueryChange={setQuery}
            onSubmit={runKeywordSearch}
          />
        ) : (
          <CvUpload
            file={file}
            loading={loading}
            disabled={loading || !hasSource || !file}
            onFileChange={setFile}
            onSubmit={() => void runCvSearch()}
          />
        )}
      </div>

      {mode === "cv" ? (
        <div className="jobs-results">
          <ProcessedCvList
            items={processedCvs}
            activeKey={activeCvKey}
            refreshingKey={refreshingKey}
            onSelect={selectProcessedCv}
            onRefresh={(item) => void refreshProcessedCv(item)}
            onRefreshAll={() => void refreshAllProcessedCvs()}
            onDelete={(key) => void removeProcessedCv(key)}
          />
          {cvProfile ? <CvSummary metier={cvProfile.metier} motsCles={cvProfile.motsCles} /> : null}
        </div>
      ) : null}

      <section className="jobs-results" aria-live="polite" aria-busy={loading}>
        {error ? <p className="jobs-error">{error}</p> : null}

        {!error && hasSearched && !loading ? (
          <p className="jobs-count">
            {jobs.length} offre{jobs.length > 1 ? "s" : ""} trouvée
            {jobs.length > 1 ? "s" : ""}
          </p>
        ) : null}

        {!error && hasSearched && !loading && jobs.length === 0 ? (
          <p className="jobs-empty">Aucune offre trouvée. Essaie d'autres mots-clés ou sources.</p>
        ) : null}

        <div className="jobs-list">
          {jobs.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              applied={appliedIds.has(job.id)}
              onToggleApplied={toggleApplied}
            />
          ))}
        </div>
      </section>
      </main>
      <JobsFooter />
    </div>
  );
}
