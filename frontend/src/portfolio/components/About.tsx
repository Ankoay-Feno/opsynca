import { GraduationCap, Languages, MapPin } from "lucide-react";

import { education, languages, profile } from "../data";
import { LevelBadge } from "./Atoms";

export function About() {
  return (
    <section id="about" className="pf-section">
      <SectionHeader
        levelId="01"
        title="Player Profile"
        subtitle="namespace/about"
        xp={{ value: 100, max: 100 }}
      >
        Apprenant continu, j'aborde l'infrastructure comme du code et la fiabilité comme un produit.
      </SectionHeader>

      <div className="pf-about-grid">
        <article className="pf-card">
          <header className="pf-card-head">
            <MapPin size={16} aria-hidden="true" />
            <h3>Spawn Point</h3>
          </header>
          <p className="pf-card-body">{profile.location}</p>
          <p className="pf-card-meta">Indian/Antananarivo · UTC+3</p>
        </article>

        <article className="pf-card">
          <header className="pf-card-head">
            <Languages size={16} aria-hidden="true" />
            <h3>Spoken Languages</h3>
          </header>
          <ul className="pf-kv-list">
            {languages.map((l) => (
              <li key={l.name}>
                <span>{l.name}</span>
                <span className="pf-kv-val">{l.level}</span>
              </li>
            ))}
          </ul>
        </article>

        <article className="pf-card pf-card-wide">
          <header className="pf-card-head">
            <GraduationCap size={16} aria-hidden="true" />
            <h3>Training Quests</h3>
          </header>
          <ul className="pf-edu-list">
            {education.map((edu) => (
              <li key={`${edu.degree}-${edu.period}`}>
                <div className="pf-edu-degree">{edu.degree}</div>
                <div className="pf-edu-school">{edu.school}</div>
                <div className="pf-edu-period">{edu.period}</div>
              </li>
            ))}
          </ul>
        </article>
      </div>
    </section>
  );
}

export function SectionHeader({
  levelId,
  title,
  subtitle,
  xp,
  children,
}: {
  levelId: string;
  title: string;
  subtitle: string;
  xp?: { value: number; max: number };
  children?: React.ReactNode;
}) {
  return (
    <header className="pf-section-head">
      <div className="pf-section-hud">
        <LevelBadge level={levelId} label={subtitle} />
        {xp && (
          <span className="pf-section-progress">
            <span className="pf-section-progress-label">PROGRESS</span>
            <span className="pf-section-progress-val">
              {Math.round((xp.value / xp.max) * 100)}%
            </span>
            <span className="pf-section-progress-track">
              <span
                className="pf-section-progress-fill"
                style={{ width: `${(xp.value / xp.max) * 100}%` }}
              />
            </span>
          </span>
        )}
      </div>
      <h2 className="pf-section-title">{title}</h2>
      {children && <p className="pf-section-lead">{children}</p>}
    </header>
  );
}
