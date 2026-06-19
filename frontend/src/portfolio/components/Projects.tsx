import { Box, ExternalLink, Github, Zap } from "lucide-react";

import { projects } from "../data";
import { SectionHeader } from "./About";
import { RegionTag, StatusDot, TechBadge, VersionBadge } from "./Atoms";

const DIFFICULTY = ["★★★★", "★★★☆", "★★★★★", "★★☆☆", "★★★★", "★★★★"];
const SERVICE_META = [
  { service: "llmops", version: "v1.4.2", region: "eu-west-1" },
  { service: "ecommerce-platform", version: "v2.1.0", region: "eu-west-1" },
  { service: "serverless-stack", version: "v3.0.1", region: "us-east-1" },
  { service: "mobile-build", version: "v1.0.7", region: "github-actions" },
  { service: "portfolio-azure", version: "v1.0.0", region: "Microsoft Azure" },
  { service: "opportunity-search", version: "v1.1.0", region: "Madagascar + remote" },
];

export function Projects() {
  return (
    <section id="projects" className="pf-section">
      <SectionHeader
        levelId="03"
        title="Missions Deployed"
        subtitle="services/running"
        xp={{ value: Math.min(projects.length * 25, 100), max: 100 }}
      >
        Quelques services déployés en production — infrastructure, CI/CD et plateformes IA
        conteneurisées.
      </SectionHeader>

      <div className="pf-services-grid">
        {projects.map((project, idx) => {
          const meta = SERVICE_META[idx] ?? { service: `service-${idx + 1}`, version: "v1.0.0", region: "—" };
          const difficulty = DIFFICULTY[idx] ?? "★★★☆";
          return (
            <article key={project.title} className="pf-service-card">
              <header className="pf-service-head">
                <div className="pf-service-id">
                  <Box size={14} aria-hidden="true" />
                  <span className="pf-service-name">{meta.service}</span>
                </div>
                <StatusDot variant="running" />
              </header>

              <div className="pf-service-difficulty">
                <Zap size={12} aria-hidden="true" />
                <span>{difficulty}</span>
                <span className="pf-service-mission">MISSION #{String(idx + 1).padStart(2, "0")}</span>
              </div>

              <h3 className="pf-service-title">{project.title}</h3>
              <p className="pf-service-desc">{project.description}</p>

              <ul className="pf-service-highlights">
                {project.highlights.map((h, i) => (
                  <li key={i}>{h}</li>
                ))}
              </ul>

              <div className="pf-service-stack">
                {project.stack.map((t) => (
                  <TechBadge key={t} name={t} />
                ))}
              </div>

              <footer className="pf-service-foot">
                <div className="pf-service-foot-left">
                  <VersionBadge>{meta.version}</VersionBadge>
                  <RegionTag region={meta.region} />
                </div>
                <div className="pf-service-links">
                  {project.repo && (
                    <a
                      href={project.repo}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Code source — ${project.title}`}
                    >
                      <Github size={14} aria-hidden="true" />
                    </a>
                  )}
                  {project.demo && (
                    <a
                      href={project.demo}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Démo — ${project.title}`}
                    >
                      <ExternalLink size={14} aria-hidden="true" />
                    </a>
                  )}
                </div>
              </footer>
            </article>
          );
        })}

        <article className="pf-service-card">
          <header className="pf-service-head">
            <div className="pf-service-id">
              <Box size={14} aria-hidden="true" />
              <span className="pf-service-name">k8s-cluster</span>
            </div>
            <StatusDot variant="running" />
          </header>

          <div className="pf-service-difficulty">
            <Zap size={12} aria-hidden="true" />
            <span>★★★★★</span>
            <span className="pf-service-mission">
              MISSION #{String(projects.length + 1).padStart(2, "0")}
            </span>
          </div>

          <h3 className="pf-service-title">Cluster Kubernetes en production</h3>
          <p className="pf-service-desc">
            Orchestration de workloads conteneurisés avec Kubernetes — manifests YAML, Helm
            Charts, GitOps via ArgoCD et déploiements rolling-update zero-downtime.
          </p>

          <ul className="pf-service-highlights">
            <li>Déploiements rolling-update zero-downtime</li>
            <li>GitOps avec ArgoCD</li>
            <li>Helm Charts pour packaging applicatif</li>
          </ul>

          <div className="pf-service-stack">
            <TechBadge name="Kubernetes" />
            <TechBadge name="Docker" />
            <span className="pf-tech">
              <span className="pf-tech-dot" style={{ background: "#0F1689" }} aria-hidden="true" />
              Helm
            </span>
            <span className="pf-tech">
              <span className="pf-tech-dot" style={{ background: "#EF7B4D" }} aria-hidden="true" />
              ArgoCD
            </span>
          </div>

          <footer className="pf-service-foot">
            <div className="pf-service-foot-left">
              <VersionBadge>v1.0.0</VersionBadge>
              <RegionTag region="k8s-cluster" />
            </div>
          </footer>
        </article>
      </div>
    </section>
  );
}
