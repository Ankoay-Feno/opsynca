import { FileText, Loader2, Upload } from "lucide-react";
import type { ChangeEvent, FormEvent } from "react";

type CvUploadProps = {
  file: File | null;
  loading: boolean;
  disabled: boolean;
  onFileChange: (file: File | null) => void;
  onSubmit: () => void;
};

// Formats que le backend sait extraire (PDF, Word, OpenDocument, texte).
const ACCEPTED = ".pdf,.doc,.docx,.odt,.rtf,.txt";

export function CvUpload({ file, loading, disabled, onFileChange, onSubmit }: CvUploadProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit();
  }

  function handleSelect(event: ChangeEvent<HTMLInputElement>) {
    onFileChange(event.target.files?.[0] ?? null);
  }

  return (
    <form className="jobs-cv" onSubmit={handleSubmit}>
      <label className="jobs-cv-drop">
        <input
          type="file"
          className="jobs-cv-input"
          accept={ACCEPTED}
          onChange={handleSelect}
        />
        {file ? (
          <span className="jobs-cv-file">
            <FileText size={16} aria-hidden="true" />
            {file.name}
          </span>
        ) : (
          <span className="jobs-cv-hint">
            <Upload size={16} aria-hidden="true" />
            Choisis ton CV (PDF, Word, texte…)
          </span>
        )}
      </label>
      <button type="submit" className="jobs-form-submit" disabled={disabled}>
        {loading ? (
          <Loader2 size={16} className="jobs-spin" aria-hidden="true" />
        ) : (
          <Upload size={16} aria-hidden="true" />
        )}
        Analyser mon CV
      </button>
    </form>
  );
}
