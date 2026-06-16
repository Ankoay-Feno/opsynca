type CvSummaryProps = {
  metier: string | null;
  motsCles: string[];
};

export function CvSummary({ metier, motsCles }: CvSummaryProps) {
  if (!metier && motsCles.length === 0) return null;

  return (
    <div className="jobs-cv-summary">
      {metier ? (
        <p className="jobs-cv-summary-metier">
          Profil détecté : <strong>{metier}</strong>
        </p>
      ) : null}
      {motsCles.length > 0 ? (
        <ul className="jobs-cv-chips">
          {motsCles.map((mot) => (
            <li key={mot} className="jobs-cv-chip">
              {mot}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
