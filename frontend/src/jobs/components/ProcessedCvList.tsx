import { FileText, RefreshCw, Trash2 } from "lucide-react";

import type { ProcessedCv } from "../jobsStore";

type ProcessedCvListProps = {
  items: ProcessedCv[];
  activeKey: string | null;
  refreshingKey: string | null;
  onSelect: (item: ProcessedCv) => void;
  onRefresh: (item: ProcessedCv) => void;
  onRefreshAll: () => void;
  onDelete: (cacheKey: string) => void;
};

export function ProcessedCvList({
  items,
  activeKey,
  refreshingKey,
  onSelect,
  onRefresh,
  onRefreshAll,
  onDelete,
}: ProcessedCvListProps) {
  if (items.length === 0) return null;

  const busy = refreshingKey !== null;

  return (
    <div className="jobs-cvlist">
      <div className="jobs-cvlist-head">
        <h2 className="jobs-cvlist-title">CVs déjà traités</h2>
        <button
          type="button"
          className="jobs-cvlist-refreshall"
          onClick={onRefreshAll}
          disabled={busy}
        >
          <RefreshCw size={13} className={busy ? "jobs-spin" : undefined} aria-hidden="true" />
          Tout relancer
        </button>
      </div>
      <ul className="jobs-cvlist-items">
        {items.map((item) => {
          const refreshing = refreshingKey === item.cacheKey;
          return (
            <li
              key={item.cacheKey}
              className="jobs-cvlist-row"
              data-active={item.cacheKey === activeKey}
            >
              <button type="button" className="jobs-cvlist-open" onClick={() => onSelect(item)}>
                <FileText size={15} aria-hidden="true" />
                <span className="jobs-cvlist-name">{item.filename}</span>
                <span className="jobs-cvlist-meta">
                  {item.response.metier ?? "—"} · {item.response.count} offres ·{" "}
                  {new Date(item.storedAt).toLocaleDateString("fr-FR")}
                </span>
              </button>
              <button
                type="button"
                className="jobs-cvlist-action"
                aria-label={`Relancer la recherche pour ${item.filename}`}
                onClick={() => onRefresh(item)}
                disabled={busy}
              >
                <RefreshCw
                  size={15}
                  className={refreshing ? "jobs-spin" : undefined}
                  aria-hidden="true"
                />
              </button>
              <button
                type="button"
                className="jobs-cvlist-action jobs-cvlist-del"
                aria-label={`Supprimer ${item.filename}`}
                onClick={() => onDelete(item.cacheKey)}
                disabled={busy}
              >
                <Trash2 size={15} aria-hidden="true" />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
