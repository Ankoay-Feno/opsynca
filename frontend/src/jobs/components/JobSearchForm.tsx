import { Loader2, Search } from "lucide-react";
import type { FormEvent } from "react";

type JobSearchFormProps = {
  query: string;
  loading: boolean;
  disabled: boolean;
  onQueryChange: (value: string) => void;
  onSubmit: () => void;
};

export function JobSearchForm({
  query,
  loading,
  disabled,
  onQueryChange,
  onSubmit,
}: JobSearchFormProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit();
  }

  return (
    <form className="jobs-form-row" onSubmit={handleSubmit}>
      <label className="jobs-form-field">
        <span className="jobs-form-label">Mot-clé</span>
        <input
          type="search"
          className="jobs-form-input"
          placeholder="ex. développeur, communication, comptable…"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
        />
      </label>
      <button type="submit" className="jobs-form-submit" disabled={disabled}>
        {loading ? (
          <Loader2 size={16} className="jobs-spin" aria-hidden="true" />
        ) : (
          <Search size={16} aria-hidden="true" />
        )}
        Rechercher
      </button>
    </form>
  );
}
