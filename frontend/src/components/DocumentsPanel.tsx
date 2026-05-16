import { FormEvent, useState } from "react";
import { FileText, Loader2, RefreshCcw, Trash2, UploadCloud } from "lucide-react";

import { StatusLine } from "./StatusLine";
import { deleteDocument, uploadDocument } from "../api";
import type { IndexedDocument } from "../types";
import { errorMessage } from "../utils";

type Props = {
  documents: IndexedDocument[];
  loading: boolean;
  error: string | null;
  onRefresh: () => Promise<void> | void;
  onDocumentsChanged: () => Promise<void> | void;
  onError: (message: string | null) => void;
};

export function DocumentsPanel({
  documents,
  loading,
  error,
  onRefresh,
  onDocumentsChanged,
  onError,
}: Props) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);

  async function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    if (!selectedFile || uploading) {
      return;
    }

    setUploading(true);
    setUploadStatus("Indexation en cours...");
    try {
      const result = await uploadDocument(selectedFile);
      const warnings = result.warnings.length ? ` Warnings: ${result.warnings.join("; ")}` : "";
      setUploadStatus(`${result.filename} indexe. ${result.chunks} chunks.${warnings}`);
      setSelectedFile(null);
      form.reset();
      await onDocumentsChanged();
    } catch (caught) {
      setUploadStatus(errorMessage(caught));
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(documentId: string) {
    onError(null);
    try {
      await deleteDocument(documentId);
      await onDocumentsChanged();
    } catch (caught) {
      onError(errorMessage(caught));
    }
  }

  return (
    <div className="documents" aria-label="Documents">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Index</p>
          <h2>Documents</h2>
        </div>
        <button
          className="icon-button"
          type="button"
          title="Rafraichir"
          aria-label="Rafraichir les documents"
          onClick={() => void onRefresh()}
          disabled={loading}
        >
          <RefreshCcw size={18} aria-hidden="true" className={loading ? "spin" : undefined} />
        </button>
      </div>

      <form className="upload-panel" onSubmit={(event) => void handleUpload(event)}>
        <label className="file-picker">
          <UploadCloud size={20} aria-hidden="true" />
          <span>{selectedFile ? selectedFile.name : "Choisir un fichier"}</span>
          <input
            name="file"
            type="file"
            onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
            required
          />
        </label>
        <button className="primary-button" type="submit" disabled={!selectedFile || uploading}>
          {uploading ? (
            <Loader2 size={18} className="spin" aria-hidden="true" />
          ) : (
            <UploadCloud size={18} aria-hidden="true" />
          )}
          Indexer
        </button>
      </form>

      {uploadStatus ? <StatusLine message={uploadStatus} /> : null}
      {error ? <StatusLine message={error} tone="danger" /> : null}

      <DocumentList documents={documents} loading={loading} onDelete={handleDelete} />
    </div>
  );
}

function DocumentList({
  documents,
  loading,
  onDelete,
}: {
  documents: IndexedDocument[];
  loading: boolean;
  onDelete: (documentId: string) => void;
}) {
  if (loading) {
    return (
      <div className="empty-state">
        <Loader2 size={18} className="spin" aria-hidden="true" />
        Chargement...
      </div>
    );
  }

  if (!documents.length) {
    return <div className="empty-state">Aucun document indexe.</div>;
  }

  return (
    <div className="document-list">
      {documents.map((document) => (
        <article className="document-card" key={document.document_id}>
          <FileText size={18} aria-hidden="true" />
          <div>
            <h3>{document.filename || document.document_id}</h3>
            <p>{document.chunks} chunks</p>
          </div>
          <button
            className="icon-button danger"
            type="button"
            title="Desindexer"
            aria-label={`Desindexer ${document.filename || document.document_id}`}
            onClick={() => onDelete(document.document_id)}
          >
            <Trash2 size={17} aria-hidden="true" />
          </button>
        </article>
      ))}
    </div>
  );
}
