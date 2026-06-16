import { Building2, ExternalLink, MapPin } from "lucide-react";

import type { Job } from "../../types";

type JobCardProps = {
  job: Job;
  applied: boolean;
  onToggleApplied: (id: string, applied: boolean) => void;
};

export function JobCard({ job, applied, onToggleApplied }: JobCardProps) {
  return (
    <article className="jobs-card" data-applied={applied}>
      <div className="jobs-card-head">
        <h3 className="jobs-card-title">{job.titre}</h3>
        <div className="jobs-card-badges">
          {applied ? <span className="jobs-card-applied-tag">Postulé</span> : null}
          {job.match !== null ? (
            <span className="jobs-card-match" title="Pertinence vs ton CV">
              {job.match}%
            </span>
          ) : null}
          <span className="jobs-card-source" data-remote={job.remote}>
            {job.remote ? "Remote" : job.source}
          </span>
        </div>
      </div>

      <div className="jobs-card-meta">
        {job.entreprise ? (
          <span className="jobs-card-meta-item">
            <Building2 size={14} aria-hidden="true" />
            {job.entreprise}
          </span>
        ) : null}
        {job.lieu ? (
          <span className="jobs-card-meta-item">
            <MapPin size={14} aria-hidden="true" />
            {job.lieu}
          </span>
        ) : null}
      </div>

      <div className="jobs-card-actions">
        <a
          className="jobs-card-link"
          href={job.lien}
          target="_blank"
          rel="noopener noreferrer"
        >
          Voir l'offre
          <ExternalLink size={14} aria-hidden="true" />
        </a>
        <label className="jobs-card-applied">
          <input
            type="checkbox"
            checked={applied}
            onChange={(event) => onToggleApplied(job.id, event.target.checked)}
          />
          Déjà postulé
        </label>
      </div>
    </article>
  );
}
