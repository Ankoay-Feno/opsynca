import { Mail, MapPin } from "lucide-react";

import { profile, socials } from "../data";
import { StatusDot } from "./Atoms";

const NAV_LINKS = [
  { id: "about", label: "À propos" },
  { id: "experience", label: "Expérience" },
  { id: "projects", label: "Projets" },
  { id: "stack", label: "Stack" },
  { id: "certifications", label: "Certifications" },
  { id: "blog", label: "Blog" },
  { id: "contact", label: "Contact" },
];

export function Footer() {
  const year = new Date().getFullYear();

  const handleAnchor = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    // Depuis une autre page (ex: /emplois) : retour au portfolio a l'ancre.
    window.location.href = `/#${id}`;
  };

  return (
    <footer className="pf-footer">
      <div className="pf-footer-inner">
        <div className="pf-footer-brand-col">
          <div className="pf-footer-brand">
            <span className="pf-footer-brand-logo" aria-hidden="true">
              <img src={profile.photoPath} alt="" draggable={false} />
            </span>
            <span className="pf-footer-brand-text">
              <span className="pf-footer-brand-name">ankoay</span>
              <span className="pf-footer-brand-tld">.dev</span>
            </span>
          </div>
          <p className="pf-footer-bio">
            {profile.title} basé à {profile.location.split(",")[0]} — disponible pour collaborer.
          </p>
          <div className="pf-footer-status">
            <StatusDot variant="running" />
            <span>Open to opportunities</span>
          </div>
        </div>

        <div className="pf-footer-col">
          <h4 className="pf-footer-col-title">Navigation</h4>
          <ul className="pf-footer-list">
            {NAV_LINKS.map((l) => (
              <li key={l.id}>
                <button type="button" onClick={() => handleAnchor(l.id)}>
                  {l.label}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="pf-footer-col">
          <h4 className="pf-footer-col-title">Réseaux</h4>
          <ul className="pf-footer-list">
            {socials.map((s) => (
              <li key={s.label}>
                <a href={s.href} target="_blank" rel="noopener noreferrer">
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div className="pf-footer-col">
          <h4 className="pf-footer-col-title">Contact</h4>
          <ul className="pf-footer-list pf-footer-list-icons">
            <li>
              <a href={`mailto:${profile.email}`}>
                <Mail size={13} aria-hidden="true" />
                {profile.email}
              </a>
            </li>
            <li>
              <span>
                <MapPin size={13} aria-hidden="true" />
                {profile.location}
              </span>
            </li>
          </ul>
        </div>
      </div>

      <div className="pf-footer-bottom">
        <span className="pf-footer-copy">
          © {year} {profile.shortName} · {profile.title}
        </span>
      </div>
    </footer>
  );
}
