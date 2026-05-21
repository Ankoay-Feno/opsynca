import { Briefcase, Cloud, TrendingUp } from "lucide-react";

import { experiences } from "../data";
import { SectionHeader } from "./About";
import { StatusDot, VersionBadge } from "./Atoms";

export function Experience() {
  return (
    <section id="experience" className="pf-section">
      <SectionHeader
        levelId="02"
        title="Impact en entreprise"
        subtitle="business/value-delivered"
      >
        Mon parcours d'ingénieur Cloud &amp; DevOps — concentrés sur les bénéfices apportés :
        réduction des délais, fiabilité accrue, sécurité renforcée et coûts maîtrisés.
      </SectionHeader>

      <ol className="pf-deploy-list">
        {experiences.map((exp, idx) => {
          const version = `v${experiences.length - idx}.0`;
          return (
            <li key={`${exp.company}-${exp.startDate}`} className="pf-deploy-item">
              <div className="pf-deploy-marker" aria-hidden="true">
                <Briefcase size={14} />
              </div>
              <article className="pf-deploy-card">
                <header className="pf-deploy-head">
                  <div className="pf-deploy-head-left">
                    <VersionBadge>{version}</VersionBadge>
                    <h3 className="pf-deploy-role">{exp.role}</h3>
                  </div>
                  <StatusDot variant={exp.current ? "running" : "deployed"} />
                </header>

                <div className="pf-deploy-meta">
                  <span className="pf-deploy-meta-item">
                    <Cloud size={12} aria-hidden="true" /> {exp.company}
                  </span>
                  <span className="pf-deploy-meta-item pf-deploy-meta-mono">
                    {exp.startDate} → {exp.endDate}
                  </span>
                </div>

                <ul className="pf-deploy-highlights">
                  {exp.highlights.map((h, i) => (
                    <li key={i}>
                      <span className="pf-deploy-impact" aria-hidden="true">
                        <TrendingUp size={12} />
                      </span>
                      {h}
                    </li>
                  ))}
                </ul>
              </article>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
