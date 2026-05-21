import { Lock } from "lucide-react";

import { skillGroups } from "../data";
import { SectionHeader } from "./About";
import { TechBadge } from "./Atoms";

const CATEGORY_META: Record<string, { tag: string; emoji: string; lvl: number }> = {
  "Cloud AWS": { tag: "cloud/aws", emoji: "☁", lvl: 18 },
  "Cloud Azure": { tag: "cloud/azure · ce portfolio", emoji: "▲", lvl: 11 },
  "Infrastructure as Code": { tag: "iac/terraform", emoji: "🏗", lvl: 16 },
  "CI/CD": { tag: "pipelines/cicd", emoji: "⚙", lvl: 17 },
  Conteneurisation: { tag: "runtime/containers", emoji: "📦", lvl: 14 },
  Observabilité: { tag: "observability/o11y", emoji: "📊", lvl: 12 },
  "Réseaux & Sécurité": { tag: "network/security", emoji: "🔒", lvl: 13 },
  Langages: { tag: "lang/scripts", emoji: "⌨", lvl: 10 },
};

const KUBERNETES_SKILL = {
  category: "Kubernetes",
  tag: "k8s/orchestration",
  emoji: "⎈",
  lvl: 12,
  items: ["Kubernetes", "Helm Charts", "ArgoCD", "Kubectl", "Manifests YAML", ],
};

const LOCKED_SKILL = {
  category: "Interopérabilité X-Road",
  tag: "interop/x-road",
  emoji: "🔗",
  lvl: 3,
  eta: "Q3 2026",
  items: [
    "X-Road Security Server",
    "X-Road Central Server",
    "SOAP / REST adapters",
    "X-Road Catalog",
    "Certificats & PKI",
    "MISP2 / Trembita",
  ],
};

export function Stack() {
  return (
    <section id="stack" className="pf-section">
      <SectionHeader
        levelId="04"
        title="Skill Tree"
        subtitle="kubectl get nodes"
        xp={{ value: 82, max: 100 }}
      >
        Mes outils du quotidien — provisionnement, déploiement, monitoring. Chaque catégorie est un
        skill tree avec un niveau de maîtrise.
      </SectionHeader>

      <div className="pf-stack-grid">
        {skillGroups.map((group) => {
          const meta = CATEGORY_META[group.category] ?? { tag: "", emoji: "", lvl: 1 };
          const fill = Math.min(100, (meta.lvl / 20) * 100);
          return (
            <article key={group.category} className="pf-stack-card">
              <header className="pf-stack-head">
                <div className="pf-stack-head-left">
                  <span className="pf-stack-emoji" aria-hidden="true">
                    {meta.emoji}
                  </span>
                  <div>
                    <h3 className="pf-stack-title">{group.category}</h3>
                    <span className="pf-stack-tag">{meta.tag}</span>
                  </div>
                </div>
                <span className="pf-stack-count">LVL {meta.lvl}</span>
              </header>

              <div className="pf-stack-bar" aria-hidden="true">
                <span className="pf-stack-bar-fill" style={{ width: `${fill}%` }} />
              </div>

              <ul className="pf-stack-items">
                {group.items.map((item) => (
                  <li key={item}>
                    <TechBadge name={item} />
                  </li>
                ))}
              </ul>
            </article>
          );
        })}

        <article className="pf-stack-card">
          <header className="pf-stack-head">
            <div className="pf-stack-head-left">
              <span className="pf-stack-emoji" aria-hidden="true">
                {KUBERNETES_SKILL.emoji}
              </span>
              <div>
                <h3 className="pf-stack-title">{KUBERNETES_SKILL.category}</h3>
                <span className="pf-stack-tag">{KUBERNETES_SKILL.tag}</span>
              </div>
            </div>
            <span className="pf-stack-count">LVL {KUBERNETES_SKILL.lvl}</span>
          </header>

          <div className="pf-stack-bar" aria-hidden="true">
            <span
              className="pf-stack-bar-fill"
              style={{ width: `${(KUBERNETES_SKILL.lvl / 20) * 100}%` }}
            />
          </div>

          <ul className="pf-stack-items">
            {KUBERNETES_SKILL.items.map((item) => (
              <li key={item}>
                <TechBadge name={item} />
              </li>
            ))}
          </ul>
        </article>

        <article className="pf-stack-card pf-stack-locked" aria-label="Skill en cours d'acquisition">
          <header className="pf-stack-head">
            <div className="pf-stack-head-left">
              <span className="pf-stack-emoji" aria-hidden="true">
                {LOCKED_SKILL.emoji}
              </span>
              <div>
                <h3 className="pf-stack-title">{LOCKED_SKILL.category}</h3>
                <span className="pf-stack-tag">{LOCKED_SKILL.tag}</span>
              </div>
            </div>
            <span className="pf-locked-tag">
              <Lock size={10} aria-hidden="true" /> ETA {LOCKED_SKILL.eta}
            </span>
          </header>

          <div className="pf-stack-bar" aria-hidden="true">
            <span
              className="pf-stack-bar-fill pf-stack-bar-fill-locked"
              style={{ width: `${(LOCKED_SKILL.lvl / 20) * 100}%` }}
            />
          </div>

          <ul className="pf-stack-items">
            {LOCKED_SKILL.items.map((item) => (
              <li key={item}>
                <span className="pf-tech pf-tech-locked">
                  <Lock size={9} aria-hidden="true" />
                  {item}
                </span>
              </li>
            ))}
          </ul>
        </article>
      </div>
    </section>
  );
}
