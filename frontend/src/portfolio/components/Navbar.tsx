import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";

import { ThemeToggle } from "../../components/ThemeToggle";
import { profile } from "../data";
import { StatusDot } from "./Atoms";

const SECTIONS = [
  { id: "about", label: "À propos" },
  { id: "experience", label: "Expérience" },
  { id: "projects", label: "Projets" },
  { id: "stack", label: "Stack" },
  { id: "certifications", label: "Certifications" },
  { id: "blog", label: "Blog" },
  { id: "contact", label: "Contact" },
];

export function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleAnchor = (id: string) => {
    setOpen(false);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    // Sur une autre page (ex: /emplois), la section n'existe pas ici : on
    // revient au portfolio en ciblant l'ancre.
    window.location.href = `/#${id}`;
  };

  return (
    <header className={`pf-nav ${scrolled ? "pf-nav-scrolled" : ""}`}>
      <div className="pf-nav-inner">
        <button
          type="button"
          className="pf-nav-brand"
          onClick={() => handleAnchor("hero")}
          aria-label="Retour en haut"
        >
          <span className="pf-nav-brand-logo" aria-hidden="true">
            <img src={profile.photoPath} alt="" draggable={false} />
          </span>
          <span className="pf-nav-brand-text">
            <span className="pf-nav-brand-name">ankoay</span>
            <span className="pf-nav-brand-dot">.</span>
            <span className="pf-nav-brand-tld">dev</span>
          </span>
          <span className="pf-nav-brand-status" aria-hidden="true">
            <StatusDot variant="running" />
          </span>
        </button>

        <nav className="pf-nav-links" aria-label="Sections du portfolio">
          {SECTIONS.map((s) => (
            <button key={s.id} type="button" className="pf-nav-link" onClick={() => handleAnchor(s.id)}>
              {s.label}
            </button>
          ))}
        </nav>

        <div className="pf-nav-actions">

          <ThemeToggle />
          <button
            type="button"
            className="pf-nav-burger"
            aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X size={18} aria-hidden="true" /> : <Menu size={18} aria-hidden="true" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="pf-nav-mobile" role="menu">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              role="menuitem"
              className="pf-nav-mobile-link"
              onClick={() => handleAnchor(s.id)}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}
    </header>
  );
}
