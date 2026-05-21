import { Award, Lock } from "lucide-react";

import { certifications } from "../data";
import { SectionHeader } from "./About";

const UPCOMING = [
  { name: "AWS Certified Cloud Practitioner", issuer: "AWS", eta: "Q3 2026" },
  { name: "HashiCorp Certified : Terraform Associate", issuer: "HashiCorp", eta: "Q4 2026" },
  { name: "Certified Kubernetes Administrator (CKA)", issuer: "CNCF", eta: "Q1 2027" },
];

export function Certifications() {
  return (
    <section id="certifications" className="pf-section">
      <SectionHeader
        levelId="05"
        title="Certifications"
        subtitle="badges/verified"
      >
        Formations validées dans l'écosystème cloud, DevOps, sécurité et networking —{" "}
        <span className="pf-text-accent">{certifications.length} certifications obtenues</span>,{" "}
        {UPCOMING.length} en cours.
      </SectionHeader>

      <ul className="pf-cert-grid">
        {certifications.map((cert) => {
          const inner = (
            <>
              <span className="pf-cert-icon" aria-hidden="true">
                <Award size={18} />
              </span>
              <div className="pf-cert-body">
                <span className="pf-cert-name">{cert.name}</span>
                <span className="pf-cert-meta">
                  <span className="pf-cert-issuer">{cert.issuer}</span>
                  {cert.date && (
                    <>
                      <span className="pf-cert-sep" aria-hidden="true">
                        ·
                      </span>
                      <span className="pf-cert-date">{cert.date}</span>
                    </>
                  )}
                </span>
              </div>
              <span className="pf-cert-unlock" aria-hidden="true">
                ✓
              </span>
            </>
          );
          return (
            <li key={cert.name} className="pf-cert-item pf-cert-unlocked">
              {cert.url ? (
                <a href={cert.url} target="_blank" rel="noopener noreferrer">
                  {inner}
                </a>
              ) : (
                <span>{inner}</span>
              )}
            </li>
          );
        })}

        {UPCOMING.map((up) => (
          <li key={up.name} className="pf-cert-item pf-cert-locked">
            <span>
              <span className="pf-cert-icon" aria-hidden="true">
                <Lock size={16} />
              </span>
              <div className="pf-cert-body">
                <span className="pf-cert-name">{up.name}</span>
                <span className="pf-cert-meta">
                  <span className="pf-cert-issuer">{up.issuer}</span>
                  <span className="pf-cert-sep" aria-hidden="true">·</span>
                  <span className="pf-cert-eta">ETA {up.eta}</span>
                </span>
              </div>
              <span className="pf-cert-locked-tag" aria-hidden="true">IN&nbsp;PROGRESS</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
