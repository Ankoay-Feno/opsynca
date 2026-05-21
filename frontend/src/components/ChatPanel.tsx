import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import {
  Bot,
  Database,
  ExternalLink,
  Globe,
  Loader2,
  Paperclip,
  Send,
  ShieldCheck,
  User,
  WifiOff,
} from "lucide-react";

import { embedTexts, fetchAnswer } from "../api";
import { getChunk, getDocument, type StoredChunk } from "../storage";
import type {
  ChatHistoryMessage,
  ChatMessage,
  ChatSource,
  ContextChunkInput,
  WebSource,
} from "../types";
import { clampNumber, errorMessage, uniqueId } from "../utils";
import { getVectorIndex } from "../vectorSearch";

const HISTORY_CHAR_BUDGET = 8000;

function buildHistory(messages: ChatMessage[]): ChatHistoryMessage[] {
  const eligible = messages.filter(
    (message) => message.id !== "welcome" && message.content.trim().length > 0,
  );
  const result: ChatHistoryMessage[] = [];
  let used = 0;
  for (let i = eligible.length - 1; i >= 0; i--) {
    const message = eligible[i];
    if (used + message.content.length > HISTORY_CHAR_BUDGET) break;
    result.unshift({ role: message.role, content: message.content });
    used += message.content.length;
  }
  return result;
}

async function resolveLocalContext(
  question: string,
  topK: number,
): Promise<{ chunks: StoredChunk[]; filenames: Map<string, string | null> }> {
  const index = getVectorIndex();
  if (index.size() === 0) {
    return { chunks: [], filenames: new Map() };
  }
  const [queryVector] = await embedTexts([question]);
  if (!queryVector) {
    return { chunks: [], filenames: new Map() };
  }
  const hits = index.search(queryVector, topK);
  const chunks: StoredChunk[] = [];
  for (const hit of hits) {
    const chunk = await getChunk(hit.chunkId);
    if (chunk) chunks.push(chunk);
  }
  const filenames = new Map<string, string | null>();
  for (const chunk of chunks) {
    if (filenames.has(chunk.documentId)) continue;
    const doc = await getDocument(chunk.documentId);
    filenames.set(chunk.documentId, doc?.filename ?? null);
  }
  return { chunks, filenames };
}

type Props = {
  initialMessages?: ChatMessage[];
  onMessagesChange?: (messages: ChatMessage[]) => void;
};

export function ChatPanel({ initialMessages, onMessagesChange }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>(() => initialMessages ?? []);
  const [question, setQuestion] = useState("");
  const [topK, setTopK] = useState(5);
  const [sending, setSending] = useState(false);
  const chatLogRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const onMessagesChangeRef = useRef(onMessagesChange);
  onMessagesChangeRef.current = onMessagesChange;

  function applyMessages(next: ChatMessage[]) {
    setMessages(next);
    onMessagesChangeRef.current?.(next);
  }

  useEffect(() => {
    chatLogRef.current?.scrollTo({
      top: chatLogRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
  }, [question]);

  async function submit() {
    const trimmedQuestion = question.trim();
    if (!trimmedQuestion || sending) {
      return;
    }

    const userMessage: ChatMessage = {
      id: uniqueId(),
      role: "user",
      content: trimmedQuestion,
    };
    const history = buildHistory(messages);
    const afterUser = [...messages, userMessage];
    applyMessages(afterUser);
    setQuestion("");
    setSending(true);

    const assistantId = uniqueId();
    try {
      const { chunks, filenames } = await resolveLocalContext(trimmedQuestion, topK);
      const context: ContextChunkInput[] = chunks.map((chunk) => ({
        filename: filenames.get(chunk.documentId) ?? null,
        chunk_index: chunk.chunkIndex,
        text: chunk.text,
      }));

      const result = await fetchAnswer(trimmedQuestion, context, history);
      const sources: ChatSource[] = result.used_context_indices
        .map((idx) => chunks[idx - 1])
        .filter((chunk): chunk is StoredChunk => Boolean(chunk))
        .map((chunk) => ({
          documentId: chunk.documentId,
          filename: filenames.get(chunk.documentId) ?? null,
          chunkIndex: chunk.chunkIndex,
          text: chunk.text,
        }));
      applyMessages([
        ...afterUser,
        {
          id: assistantId,
          role: "assistant",
          content: result.answer || "Aucune reponse.",
          sources,
          webSources: result.web_sources,
        },
      ]);
    } catch (caught) {
      applyMessages([
        ...afterUser,
        { id: assistantId, role: "assistant", content: errorMessage(caught) },
      ]);
    } finally {
      setSending(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submit();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void submit();
    }
  }

  return (
    <section className="chat-column" aria-label="Chat RAG">
      <div className="section-heading chat-heading">
        <div>
          <p className="eyebrow">Conversation</p>
          <h2>Chat</h2>
        </div>
        <label className="topk-control">
          <span>Top K</span>
          <input
            type="number"
            min={1}
            max={12}
            value={topK}
            onChange={(event) => setTopK(clampNumber(Number(event.target.value), 1, 12))}
          />
        </label>
      </div>

      <div className="chat-log" ref={chatLogRef}>
        {messages.length === 0 && !sending ? (
          <WelcomeScreen />
        ) : (
          messages.map((message) => <MessageBubble key={message.id} message={message} />)
        )}
        {sending ? (
          <div className="message assistant pending">
            <Bot size={18} aria-hidden="true" />
            <span>Recherche en cours...</span>
          </div>
        ) : null}
      </div>

      <form className="composer" onSubmit={handleSubmit}>
        <button
          type="button"
          className="icon-button composer-attach"
          aria-label="Joindre un document"
          title="Joindre un document depuis Knowledge Base"
          tabIndex={-1}
        >
          <Paperclip size={18} aria-hidden="true" />
        </button>
        <textarea
          ref={textareaRef}
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          placeholder="Message OPSYNCA AI (Local Context)..."
          required
        />
        <button
          className="send-button"
          type="submit"
          disabled={!question.trim() || sending}
          aria-label="Envoyer"
        >
          {sending ? (
            <Loader2 size={20} className="spin" aria-hidden="true" />
          ) : (
            <Send size={20} aria-hidden="true" />
          )}
        </button>
      </form>
    </section>
  );
}

function WelcomeScreen() {
  return (
    <div className="welcome-screen">
      <article className="welcome-hero">
        <div className="welcome-hero-icon">
          <ShieldCheck size={22} aria-hidden="true" />
        </div>
        <div>
          <h3>Privacy Confirmed</h3>
          <p>
            Tes conversations restent locales. Aucun telemetry, aucune fuite de contexte
            vers un service externe.
          </p>
        </div>
      </article>

      <div className="welcome-info">
        <article className="info-card">
          <p className="info-eyebrow">
            <Database size={12} aria-hidden="true" />
            Indexed Knowledge
          </p>
          <h4>Recherche augmentee locale</h4>
          <p>
            Chaque question est ancree dans tes documents indexes. Les sources citees
            apparaissent sous chaque reponse.
          </p>
        </article>
        <article className="info-card info-card-secondary">
          <WifiOff size={20} aria-hidden="true" />
          <h4>Air-Gapped Ready</h4>
          <p>Fonctionne sans connexion active vers un service externe.</p>
        </article>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const Icon = message.role === "user" ? User : Bot;
  return (
    <article className={`message ${message.role}`}>
      <div className="message-icon">
        <Icon size={17} aria-hidden="true" />
      </div>
      <div className="message-content">
        <p>{message.content}</p>
        {message.sources?.length ? <InlineSources sources={message.sources} /> : null}
        {message.webSources?.length ? <WebSources sources={message.webSources} /> : null}
      </div>
    </article>
  );
}

function InlineSources({ sources }: { sources: ChatSource[] }) {
  return (
    <div className="inline-sources">
      {sources.map((source, index) => (
        <SourceChip
          key={`${source.documentId}-${source.chunkIndex}-${index}`}
          source={source}
          index={index + 1}
        />
      ))}
    </div>
  );
}

function SourceChip({ source, index }: { source: ChatSource; index: number }) {
  const label = source.filename || "Document";
  const chunk = source.chunkIndex ?? "-";

  return (
    <span className="source-chip" tabIndex={0}>
      <span className="source-chip-label">
        [{index}] {label} #{chunk}
      </span>
      <span className="source-popover" role="tooltip">
        <span className="source-popover-title">
          {label} - chunk {chunk}
        </span>
        <span className="source-popover-text">{source.text}</span>
      </span>
    </span>
  );
}

function WebSources({ sources }: { sources: WebSource[] }) {
  return (
    <div className="web-sources">
      <span className="web-sources-label">
        <Globe size={13} aria-hidden="true" />
        Recherche web
      </span>
      {sources.map((source, index) => (
        <a
          key={`${source.uri}-${index}`}
          className="web-source-chip"
          href={source.uri}
          target="_blank"
          rel="noopener noreferrer"
          title={source.uri}
        >
          <span className="web-source-label">{source.title || domainOf(source.uri)}</span>
          <ExternalLink size={11} aria-hidden="true" />
        </a>
      ))}
    </div>
  );
}

function domainOf(uri: string): string {
  try {
    return new URL(uri).hostname.replace(/^www\./, "");
  } catch {
    return uri;
  }
}
