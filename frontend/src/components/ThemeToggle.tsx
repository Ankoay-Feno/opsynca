import { Monitor, Moon, Sun, type LucideIcon } from "lucide-react";

import { useTheme, type ThemePreference } from "../useTheme";

type Option = { value: ThemePreference; label: string; Icon: LucideIcon };

const OPTIONS: Option[] = [
  { value: "system", label: "Systeme", Icon: Monitor },
  { value: "light", label: "Clair", Icon: Sun },
  { value: "dark", label: "Sombre", Icon: Moon },
];

export function ThemeToggle() {
  const { preference, setPreference } = useTheme();
  const current = OPTIONS.find((o) => o.value === preference) ?? OPTIONS[0];
  const CurrentIcon = current.Icon;

  return (
    <div className="theme-toggle-wrap">
      <button
        type="button"
        className="icon-button theme-toggle"
        aria-haspopup="menu"
        aria-label={`Theme : ${current.label.toLowerCase()}`}
      >
        <CurrentIcon size={16} aria-hidden="true" />
      </button>
      <div className="theme-menu" role="menu" aria-label="Choix du theme">
        {OPTIONS.map(({ value, label, Icon }) => {
          const active = preference === value;
          return (
            <button
              key={value}
              type="button"
              role="menuitemradio"
              aria-checked={active}
              className={`theme-option${active ? " active" : ""}`}
              onClick={() => setPreference(value)}
            >
              <Icon size={14} aria-hidden="true" />
              <span>{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
