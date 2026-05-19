import { useState } from "react";
import { Database, MessagesSquare } from "lucide-react";

import { RagView } from "../views/RagView";

export function RagApp() {
  const [documentCount, setDocumentCount] = useState(0);

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Local Workspace</p>
          <h1>Portfolio RAG</h1>
        </div>
        <nav className="tab-bar" aria-label="Vues">
          <span className="tab active">
            <MessagesSquare size={16} aria-hidden="true" />
            Console RAG
          </span>
        </nav>
        <div className="topbar-stats" aria-label="Statistiques">
          <span>
            <Database size={16} aria-hidden="true" />
            {documentCount} documents
          </span>
          <span className="local-mode-badge">Local Mode</span>
        </div>
      </header>

      <RagView onDocumentCountChange={setDocumentCount} />

      <footer className="status-footer" aria-label="Statut">
        <div className="status-footer-group">
          <span className="status-pill">
            <span className="status-dot status-dot-ready" />
            System: Ready
          </span>
          <span className="status-pill">
            <span className="status-dot status-dot-info" />
            RAG Active
          </span>
        </div>
        <span className="status-version">v1.0.0-local</span>
      </footer>
    </main>
  );
}
