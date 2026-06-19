import { Github, Linkedin, Mail } from "lucide-react";

import { profile, socials, stats } from "../data";
import { K8sWheel, LevelBadge, StatusDot, XPBar } from "./Atoms";

export function Hero() {
  const linkedin = socials.find((s) => s.label === "LinkedIn");
  const github = socials.find((s) => s.label === "GitHub");

  return (
    <section id="hero" className="pf-section pf-hero">
      <div className="pf-hero-grid">
        <div className="pf-hero-content">
          <div className="pf-hero-hud">
            <LevelBadge level={42} label="Cloud Engineer" />
            <StatusDot variant="running" />
          </div>

          <p className="pf-hero-eyebrow">// player_profile</p>
          <h1 className="pf-hero-title">
            <span className="pf-hero-name">{profile.shortName}</span>
          </h1>
          <p className="pf-hero-tagline">{profile.title} · {profile.tagline}</p>
          <p className="pf-hero-bio">{profile.bio}</p>

          <div className="pf-hero-xp">
            <div className="pf-hero-xp-row">
              <span className="pf-hero-xp-label">Cloud XP</span>
              <XPBar value={86} max={100} label="Cloud XP" />
            </div>
            <div className="pf-hero-xp-row">
              <span className="pf-hero-xp-label">DevOps XP</span>
              <XPBar value={90} max={100} label="DevOps XP" />
            </div>
            <div className="pf-hero-xp-row">
              <span className="pf-hero-xp-label">Dev XP</span>
              <XPBar value={55} max={100} label="Dev XP" />
            </div>
            <div className="pf-hero-xp-row">
              <span className="pf-hero-xp-label">Dev IA XP</span>
              <XPBar value={30} max={100} label="Dev IA XP" />
            </div>
          </div>

          <div className="pf-hero-actions">
            <a className="pf-btn pf-btn-ghost" href={`mailto:${profile.email}`}>
              <Mail size={16} aria-hidden="true" />
              Me contacter
            </a>
            {linkedin && (
              <a
                className="pf-btn pf-btn-icon"
                href={linkedin.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="LinkedIn"
              >
                <Linkedin size={18} aria-hidden="true" />
              </a>
            )}
            {github && (
              <a
                className="pf-btn pf-btn-icon"
                href={github.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="GitHub"
              >
                <Github size={18} aria-hidden="true" />
              </a>
            )}
          </div>

          <dl className="pf-hero-stats">
            {stats.map((stat) => (
              <div key={stat.label} className="pf-stat">
                <dt className="pf-stat-value">{stat.value}</dt>
                <dd className="pf-stat-label">{stat.label}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="pf-hero-visual">
          <div className="pf-orbit">
            <div className="pf-orbit-ring pf-orbit-ring-1">
              <span className="pf-orbit-pod pf-orbit-pod-aws" aria-hidden="true">aws</span>
            </div>
            <div className="pf-orbit-ring pf-orbit-ring-2">
              <span className="pf-orbit-pod pf-orbit-pod-tf" aria-hidden="true">tf</span>
              <span className="pf-orbit-pod pf-orbit-pod-docker" aria-hidden="true">⬢</span>
            </div>
            <div className="pf-orbit-ring pf-orbit-ring-3">
              <span className="pf-orbit-pod pf-orbit-pod-grafana" aria-hidden="true">📊</span>
              <span className="pf-orbit-pod pf-orbit-pod-gh" aria-hidden="true">CI</span>
              <span className="pf-orbit-pod pf-orbit-pod-ansible" aria-hidden="true">A</span>
            </div>
            <div className="pf-orbit-center">
              <K8sWheel size={120} className="pf-orbit-wheel" />
            </div>
          </div>

          <HeroPortrait />
        </div>
      </div>
    </section>
  );
}

function HeroPortrait() {
  return (
    <div className="pf-portrait-card">
      <div className="pf-portrait-header">
        <span className="pf-portrait-id">player_card.yaml</span>
        <StatusDot variant="running" />
      </div>
      <div className="pf-portrait-frame">
        <img
          src={profile.photoPath}
          alt={`Photo de ${profile.shortName}`}
          loading="eager"
          width={480}
          height={480}
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
        />
        <div className="pf-portrait-fallback" aria-hidden="true">
          {profile.shortName
            .split(" ")
            .map((p) => p[0])
            .join("")}
        </div>
      </div>
      <div className="pf-portrait-footer">
        <div className="pf-portrait-row">
          <span className="pf-portrait-key">class</span>
          <span className="pf-portrait-val">cloud-engineer</span>
        </div>
        <div className="pf-portrait-row">
          <span className="pf-portrait-key">region</span>
          <span className="pf-portrait-val">{profile.location.split(",")[0]}</span>
        </div>
        <div className="pf-portrait-row">
        </div>
      </div>
    </div>
  );
}
