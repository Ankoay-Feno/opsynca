import { ArrowUp, Github, Linkedin } from "lucide-react";

import { profile, socials } from "../data";
import { StatusDot } from "./Atoms";

const SOCIAL_ICON_MAP: Record<string, typeof Github | undefined> = {
  GitHub: Github,
  LinkedIn: Linkedin,
};

export function StatusBar() {
  const handleTop = () =>
    window.scrollTo({ top: 0, behavior: "smooth" });

  return (
    <aside className="pf-statusbar" aria-label="Status bar">
      <div className="pf-statusbar-inner">
        <div className="pf-statusbar-left">
          <StatusDot variant="running" />
          <span className="pf-statusbar-sep" aria-hidden="true">·</span>
          <span className="pf-statusbar-mono">{profile.email}</span>
          <span className="pf-statusbar-sep pf-statusbar-hide-mobile" aria-hidden="true">
            ·
          </span>
          <span className="pf-statusbar-mono pf-statusbar-hide-mobile">
            aws:eu-west-1
          </span>
        </div>

        <div className="pf-statusbar-right">
          {socials.map((s) => {
            const Icon = SOCIAL_ICON_MAP[s.label];
            return (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                className="pf-statusbar-link"
                aria-label={s.label}
                title={s.label}
              >
                {Icon ? <Icon size={13} aria-hidden="true" /> : s.label.toLowerCase().slice(0, 2)}
              </a>
            );
          })}
          <button
            type="button"
            className="pf-statusbar-top"
            onClick={handleTop}
            aria-label="Retour en haut"
            title="Top"
          >
            <ArrowUp size={14} aria-hidden="true" />
          </button>
        </div>
      </div>
    </aside>
  );
}
