import { Brain, CheckCircle2, AlertTriangle } from "lucide-react";

import type { IndexStatus } from "../chatIndex";

type Props = {
  status: IndexStatus;
  onRetry?: () => void;
};

const NODES = 6;

export function KnowledgeTransfer({ status, onRetry }: Props) {
  const isIndexing = status.kind === "indexing";
  const isReady = status.kind === "ready";
  const isError = status.kind === "error";

  const percent =
    status.kind === "indexing" && status.total > 0
      ? Math.min(100, Math.round((status.progress / status.total) * 100))
      : status.kind === "ready"
      ? 100
      : 0;

  return (
    <div className="pf-kt" role="status" aria-live="polite">
      <div className="pf-kt-orbits" aria-hidden="true">
        <svg viewBox="0 0 240 240" className="pf-kt-svg">
          <defs>
            <radialGradient id="ktGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#00d4ff" stopOpacity="0.9" />
              <stop offset="60%" stopColor="#326ce5" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#326ce5" stopOpacity="0" />
            </radialGradient>
          </defs>
          {/* Outer ring */}
          <circle cx="120" cy="120" r="100" className="pf-kt-ring pf-kt-ring-outer" />
          <circle cx="120" cy="120" r="72" className="pf-kt-ring pf-kt-ring-mid" />
          <circle cx="120" cy="120" r="46" className="pf-kt-ring pf-kt-ring-inner" />
          {/* Center glow */}
          <circle cx="120" cy="120" r="60" fill="url(#ktGlow)" />
          {/* Orbiting nodes */}
          {Array.from({ length: NODES }).map((_, i) => {
            const angle = (i / NODES) * Math.PI * 2;
            const r = 100;
            const cx = 120 + Math.cos(angle) * r;
            const cy = 120 + Math.sin(angle) * r;
            return (
              <g key={i} className={`pf-kt-node pf-kt-node-${i}`}>
                <line
                  x1="120"
                  y1="120"
                  x2={cx}
                  y2={cy}
                  className="pf-kt-line"
                />
                <circle cx={cx} cy={cy} r="5" className="pf-kt-dot" />
              </g>
            );
          })}
        </svg>
        <div className="pf-kt-center">
          {isError ? (
            <AlertTriangle size={36} className="pf-kt-icon pf-kt-icon-error" aria-hidden="true" />
          ) : isReady ? (
            <CheckCircle2 size={36} className="pf-kt-icon pf-kt-icon-ready" aria-hidden="true" />
          ) : (
            <Brain size={36} className="pf-kt-icon pf-kt-icon-active" aria-hidden="true" />
          )}
        </div>
      </div>

      <div className="pf-kt-text">
        {isError ? (
          <>
            <h3 className="pf-kt-title">Échec du transfert</h3>
            <p className="pf-kt-phase">
              {"message" in status ? status.message : "Erreur inconnue"}
            </p>
            {onRetry && (
              <button type="button" className="pf-btn pf-btn-primary" onClick={onRetry}>
                Réessayer
              </button>
            )}
          </>
        ) : isReady ? (
          <>
            <h3 className="pf-kt-title">Connaissance prête ✓</h3>
            <p className="pf-kt-phase">{status.total} fragments indexés en local</p>
          </>
        ) : (
          <>
            <h3 className="pf-kt-title">
              <span className="pf-kt-pulse-text">Transfert de connaissance</span>
              <span className="pf-kt-dots">
                <span></span>
                <span></span>
                <span></span>
              </span>
            </h3>
            <p className="pf-kt-phase">{isIndexing ? status.phase : "Démarrage…"}</p>
            <div className="pf-kt-bar" aria-label={`Progression ${percent}%`}>
              <span className="pf-kt-bar-fill" style={{ width: `${percent}%` }} />
            </div>
            <p className="pf-kt-meta">
              {isIndexing ? `${status.progress}/${status.total} fragments` : "..."}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
