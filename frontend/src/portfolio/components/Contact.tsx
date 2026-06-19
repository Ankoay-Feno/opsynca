import { ExternalLink, Mail, MapPin, Phone } from "lucide-react";

import { profile, socials } from "../data";
import { SectionHeader } from "./About";

const SOCIAL_ICONS: Record<string, string> = {
  LinkedIn: "in",
  GitHub: "gh",
  GitLab: "gl",
  Hashnode: "hn",
};

export function Contact() {
  return (
    <section id="contact" className="pf-section">
      <SectionHeader
        levelId="07"
        title="Contact"
        subtitle="endpoints/public"
      >
        Disponible pour discuter d'opportunités Cloud / DevOps et de
        collaboration open source.
      </SectionHeader>

      <div className="pf-contact-grid">
        <a className="pf-contact-card" href={`mailto:${profile.email}`}>
          <span className="pf-contact-icon" aria-hidden="true">
            <Mail size={18} />
          </span>
          <div>
            <span className="pf-contact-label">Email</span>
            <span className="pf-contact-value">{profile.email}</span>
          </div>
        </a>
        <a className="pf-contact-card" href={`tel:${profile.phone.replace(/\s/g, "")}`}>
          <span className="pf-contact-icon" aria-hidden="true">
            <Phone size={18} />
          </span>
          <div>
            <span className="pf-contact-label">Phone</span>
            <span className="pf-contact-value">{profile.phone}</span>
          </div>
        </a>
        <div className="pf-contact-card">
          <span className="pf-contact-icon" aria-hidden="true">
            <MapPin size={18} />
          </span>
          <div>
            <span className="pf-contact-label">Server location</span>
            <span className="pf-contact-value">{profile.location}</span>
          </div>
        </div>
      </div>

      <div className="pf-social-grid">
        {socials.map((s) => (
          <a
            key={s.label}
            href={s.href}
            target="_blank"
            rel="noopener noreferrer"
            className="pf-social-card"
          >
            <span className="pf-social-tag">{SOCIAL_ICONS[s.label] ?? "→"}</span>
            <div className="pf-social-body">
              <span className="pf-social-name">{s.label}</span>
              <span className="pf-social-handle">{s.handle}</span>
            </div>
            <ExternalLink size={14} aria-hidden="true" />
          </a>
        ))}
      </div>

    </section>
  );
}
