import { Home } from "lucide-react";

import { ThemeToggle } from "./ThemeToggle";

export function NotFound() {
  function goHome() {
    window.history.pushState({}, "", "/");
    window.dispatchEvent(new PopStateEvent("popstate"));
  }

  return (
    <main className="notfound" role="main">
      <div className="notfound-toggle">
        <ThemeToggle />
      </div>
      <section className="notfound-card" aria-labelledby="notfound-title">
        <p className="notfound-eyebrow">Erreur 404</p>
        <p className="notfound-code" aria-hidden="true">404</p>
        <h1 id="notfound-title" className="notfound-title">Page introuvable</h1>
        <p className="notfound-text">
          Cette page n&apos;existe pas ou a ete deplacee. Verifie l&apos;URL ou retourne a
          l&apos;accueil.
        </p>
        <div className="notfound-actions">
          <button type="button" className="primary-button" onClick={goHome}>
            <Home size={16} aria-hidden="true" />
            Retour a l&apos;accueil
          </button>
        </div>
      </section>
    </main>
  );
}
