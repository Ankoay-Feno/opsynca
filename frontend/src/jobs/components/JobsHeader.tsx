import { ThemeToggle } from "../../components/ThemeToggle";
import { StatusDot } from "../../portfolio/components/Atoms";
import { profile } from "../../portfolio/data";

export function JobsHeader() {
  return (
    <header className="jobs-topbar">
      <a className="jobs-topbar-brand" href="/" aria-label="Retour au portfolio">
        <span className="jobs-topbar-logo" aria-hidden="true">
          <img src={profile.photoPath} alt="" draggable={false} />
        </span>
        <span className="jobs-topbar-name">
          ankoay<span className="jobs-topbar-dot">.</span>dev
        </span>
      </a>
      <div className="jobs-topbar-right">
        <StatusDot variant="running" />
        <ThemeToggle />
      </div>
    </header>
  );
}
