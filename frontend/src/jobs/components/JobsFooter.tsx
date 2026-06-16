import { Github, Linkedin } from "lucide-react";

import { StatusDot } from "../../portfolio/components/Atoms";
import { profile, socials } from "../../portfolio/data";

const SOCIAL_ICONS: Record<string, typeof Github | undefined> = {
  GitHub: Github,
  LinkedIn: Linkedin,
};

export function JobsFooter() {
  return (
    <footer className="jobs-footer">
      <div className="jobs-footer-status">
        <StatusDot variant="running" />
        <span className="jobs-footer-sep" aria-hidden="true">·</span>
        <span className="jobs-footer-mono">{profile.email}</span>
        <span className="jobs-footer-sep" aria-hidden="true">·</span>
        <span className="jobs-footer-mono">aws:eu-west-1</span>
        <span className="jobs-footer-socials">
          {socials.map((social) => {
            const Icon = SOCIAL_ICONS[social.label];
            return (
              <a
                key={social.label}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                className="jobs-footer-social"
                aria-label={social.label}
                title={social.label}
              >
                {Icon ? <Icon size={13} aria-hidden="true" /> : social.label.toLowerCase().slice(0, 2)}
              </a>
            );
          })}
        </span>
      </div>
    </footer>
  );
}
