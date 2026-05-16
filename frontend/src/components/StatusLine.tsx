import { AlertCircle } from "lucide-react";

export function StatusLine({
  message,
  tone = "info",
}: {
  message: string;
  tone?: "info" | "danger";
}) {
  return (
    <div className={`status-line ${tone}`}>
      <AlertCircle size={16} aria-hidden="true" />
      <span>{message}</span>
    </div>
  );
}
