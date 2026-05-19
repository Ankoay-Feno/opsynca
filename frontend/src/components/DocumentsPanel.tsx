import { FormEvent, useState } from "react";
import { FileText, Loader2, RefreshCcw, Trash2, UploadCloud } from "lucide-react";

import { StatusLine } from "./StatusLine";
import { embedTexts, extractFile } from "../api";
import { chunkText } from "../chunking";
import {
  addChunks,
  deleteDocument,
  listChunksByDocument,
  saveDocument,
  type StoredChunk,
  type StoredDocument,
} from "../storage";
import { getVectorIndex } from "../vectorSearch";
import { errorMessage, uniqueId } from "../utils";

type Props = {
  documents: StoredDocument[];
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
    setUploadStatus("Extraction du texte...");
    try {
      const extracted = await extractFile(selectedFile);

      setUploadStatus("Decoupage en chunks...");
      const textChunks = chunkText(extracted.text);
      if (textChunks.length === 0) {
        throw new Error("Aucun contenu textuel exploitable a indexer.");
      }

      setUploadStatus(`Embedding ${textChunks.length} chunks...`);
      const vectors = await embedTexts(textChunks.map((chunk) => chunk.text));
      if (vectors.length !== textChunks.length) {
        throw new Error("Nombre d'embeddings incoherent avec les chunks.");
      }

      const documentId = uniqueId();
      const storedChunks: StoredChunk[] = textChunks.map((chunk, i) => ({
        id: uniqueId(),
        documentId,
        chunkIndex: chunk.index,
        text: chunk.text,
        vector: vectors[i],
      }));

      const document: StoredDocument = {
        documentId,
        filename: extracted.filename,
        contentType: extracted.content_type,
        extension: extracted.extension,
        chunksCount: storedChunks.length,
        createdAt: Date.now(),
      };
      await saveDocument(document);
      await addChunks(storedChunks);
      getVectorIndex().addChunks(storedChunks);

      const warnings = extracted.warnings.length
        ? ` Warnings: ${extracted.warnings.join("; ")}`
        : "";
      setUploadStatus(
        `${extracted.filename} indexe. ${storedChunks.length} chunks.${warnings}`,
      );
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
      const chunksToRemove = await listChunksByDocument(documentId);
      await deleteDocument(documentId);
      if (chunksToRemove.length) {
        getVectorIndex().removeChunks(chunksToRemove);
      }
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
  documents: StoredDocument[];
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
        <article className="document-card" key={document.documentId}>
          <FileText size={18} aria-hidden="true" />
          <div>
            <h3>{document.filename || document.documentId}</h3>
            <p>{document.chunksCount} chunks</p>
          </div>
          <button
            className="icon-button danger"
            type="button"
            title="Desindexer"
            aria-label={`Desindexer ${document.filename || document.documentId}`}
            onClick={() => onDelete(document.documentId)}
          >
            <Trash2 size={17} aria-hidden="true" />
          </button>
        </article>
      ))}
    </div>
  );
}
