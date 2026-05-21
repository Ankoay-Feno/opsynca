import type { ReactNode } from "react";

type StatusVariant = "running" | "deployed" | "active" | "archived";

const STATUS_LABELS: Record<StatusVariant, string> = {
  running: "Running",
  deployed: "Deployed",
  active: "Active",
  archived: "Archived",
};

export function StatusDot({ variant = "running" }: { variant?: StatusVariant }) {
  return (
    <span className={`pf-status pf-status-${variant}`}>
      <span className="pf-status-dot" aria-hidden="true" />
      <span className="pf-status-label">{STATUS_LABELS[variant]}</span>
    </span>
  );
}

export function VersionBadge({ children }: { children: ReactNode }) {
  return <span className="pf-version">{children}</span>;
}

export function RegionTag({ region }: { region: string }) {
  return (
    <span className="pf-region">
      <svg
        width="10"
        height="10"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden="true"
      >
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
        <circle cx="12" cy="10" r="3" />
      </svg>
      {region}
    </span>
  );
}

export function LevelBadge({ level, label }: { level: number | string; label?: string }) {
  return (
    <span className="pf-level">
      <span className="pf-level-glyph" aria-hidden="true">
        ⬢
      </span>
      <span className="pf-level-text">
        LVL {String(level).padStart(2, "0")}
        {label && <span className="pf-level-label"> · {label}</span>}
      </span>
    </span>
  );
}

export function XPBar({
  value,
  max = 100,
  label,
}: {
  value: number;
  max?: number;
  label?: string;
}) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className="pf-xp" aria-label={label ?? "XP"}>
      <div className="pf-xp-track">
        <div className="pf-xp-fill" style={{ width: `${pct}%` }}>
          <span className="pf-xp-shine" aria-hidden="true" />
        </div>
      </div>
      <span className="pf-xp-val">
        {value}/{max} XP
      </span>
    </div>
  );
}

export function AchievementChip({ label, color }: { label: string; color?: string }) {
  return (
    <span className="pf-achievement" style={color ? { borderColor: color, color } : undefined}>
      <span className="pf-achievement-icon" aria-hidden="true">
        ★
      </span>
      {label}
    </span>
  );
}

const TECH_COLORS: Record<string, string> = {
  AWS: "#FF9900",
  "AWS Lambda": "#FF9900",
  "AWS ECS": "#FF9900",
  S3: "#FF9900",
  EC2: "#FF9900",
  VPC: "#FF9900",
  RDS: "#3B48CC",
  DynamoDB: "#3B48CC",
  SQS: "#CC2264",
  CloudFront: "#8C4FFF",
  CloudWatch: "#CC2264",
  Amplify: "#FF9900",
  "API Gateway": "#CC2264",
  "IAM & Custom Policies": "#CC2264",
  Terraform: "#7B42BC",
  Ansible: "#EE0000",
  Docker: "#2496ED",
  "Docker Compose": "#2496ED",
  Kubernetes: "#326CE5",
  "Kubernetes (notions)": "#326CE5",
  "GitHub Actions": "#2088FF",
  "GitLab CI": "#FC6D26",
  "Expo Prebuild": "#000020",
  "Android Gradle": "#02303A",
  "GitHub Releases": "#181717",
  "React Native": "#61DAFB",
  Grafana: "#F46800",
  Prometheus: "#E6522C",
  Loki: "#F9A03F",
  Traefik: "#24A1C1",
  NGINX: "#009639",
  "Security Groups": "#FF6B6B",
  "Load Balancers": "#FF6B6B",
  VPN: "#0078D4",
  iptables: "#262577",
  FastAPI: "#009688",
  Qdrant: "#DC382D",
  LiteLLM: "#7B42BC",
  Git: "#F05032",
  "Shell script": "#4EAA25",
  "Python ": "#3776AB",
  // Azure
  "Container Apps": "#0078D4",
  "Static Web Apps": "#0078D4",
  "Container Registry": "#0078D4",
  "Key Vault": "#FFB900",
  "Azure CLI": "#0078D4",
  "OIDC Federation": "#5C2D91",
  "Resource Manager": "#0078D4",
  Azure: "#0078D4",
};

export function TechBadge({ name, withDot = true }: { name: string; withDot?: boolean }) {
  const color = TECH_COLORS[name];
  return (
    <span className="pf-tech">
      {withDot && (
        <span
          className="pf-tech-dot"
          style={{ background: color ?? "var(--pf-text-soft)" }}
          aria-hidden="true"
        />
      )}
      {name}
    </span>
  );
}

export function getTechColor(name: string): string | undefined {
  return TECH_COLORS[name];
}

export function K8sWheel({ size = 200, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="k8sGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#326CE5" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#326CE5" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="100" cy="100" r="95" fill="url(#k8sGlow)" />
      <g stroke="#326CE5" strokeWidth="2.5" fill="none" strokeLinejoin="round" strokeLinecap="round">
        <polygon points="100,18 170,55 170,145 100,182 30,145 30,55" />
        <polygon points="100,55 142,77 142,123 100,145 58,123 58,77" />
        <line x1="100" y1="18" x2="100" y2="55" />
        <line x1="170" y1="55" x2="142" y2="77" />
        <line x1="170" y1="145" x2="142" y2="123" />
        <line x1="100" y1="182" x2="100" y2="145" />
        <line x1="30" y1="145" x2="58" y2="123" />
        <line x1="30" y1="55" x2="58" y2="77" />
      </g>
      <g fill="#326CE5">
        <circle cx="100" cy="55" r="4" />
        <circle cx="142" cy="77" r="4" />
        <circle cx="142" cy="123" r="4" />
        <circle cx="100" cy="145" r="4" />
        <circle cx="58" cy="123" r="4" />
        <circle cx="58" cy="77" r="4" />
        <circle cx="100" cy="100" r="6" />
      </g>
    </svg>
  );
}

export function FloatingCube({ size = 60, color = "#326CE5", className }: { size?: number; color?: string; className?: string }) {
  const half = size / 2;
  return (
    <svg
      width={size}
      height={size}
      viewBox="-50 -50 100 100"
      className={className}
      aria-hidden="true"
    >
      <g stroke={color} strokeWidth="1.5" fill="none" strokeLinejoin="round">
        <polygon points={`-40,-${half / 2} 0,-40 40,-${half / 2} 0,-${half / 4 - 16}`} fill={color} fillOpacity="0.25" />
        <polygon points={`-40,-${half / 2} -40,${half / 2} 0,40 0,-${half / 4 - 16}`} fill={color} fillOpacity="0.15" />
        <polygon points={`40,-${half / 2} 40,${half / 2} 0,40 0,-${half / 4 - 16}`} fill={color} fillOpacity="0.2" />
      </g>
    </svg>
  );
}
