import { useEffect, useRef, useState } from "react";
import { GripHorizontal, Send, Sparkles, X } from "lucide-react";

import { fetchAnswer } from "../../api";
import { deriveTitle, loadConversation, saveConversation } from "../../storage";
import type { ChatHistoryMessage } from "../../types";
import type { VectorIndex } from "../../vectorSearch";
import { ensurePortfolioIndex, retrieveContext, type IndexStatus } from "../chatIndex";
import { profile } from "../data";
import { KnowledgeTransfer } from "./KnowledgeTransfer";

const STORAGE_POS = "pf-chat-position";
const STORAGE_WIN_POS = "pf-chat-window-position";
const STORAGE_CHAT_ID = "pf-chat-floating";
const DRAG_THRESHOLD = 6;
const BUBBLE_SIZE = 56;
const EDGE_MARGIN = 12;
const SNAP_DURATION = 280;
const WIN_W = 380;
const WIN_H = 560;
const WIN_GAP = 14;

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  pending?: boolean;
  error?: boolean;
};

type Pos = { x: number; y: number };

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

function defaultBubblePosition(): Pos {
  if (typeof window === "undefined") return { x: 16, y: 16 };
  return {
    x: window.innerWidth - BUBBLE_SIZE - EDGE_MARGIN,
    y: window.innerHeight - BUBBLE_SIZE - 64,
  };
}

function snapTargetX(currentX: number): number {
  if (typeof window === "undefined") return currentX;
  const center = window.innerWidth / 2 - BUBBLE_SIZE / 2;
  return currentX < center ? EDGE_MARGIN : window.innerWidth - BUBBLE_SIZE - EDGE_MARGIN;
}

function loadJSON<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function saveJSON(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* noop */
  }
}

/**
 * Compute the chat window position relative to the bubble's snap edge.
 * - Bubble on right edge → window opens to the LEFT of the bubble
 * - Bubble on left edge → window opens to the RIGHT of the bubble
 * Vertically, the window's bottom aligns with the bubble's bottom (with a small gap above).
 */
function windowAnchorFromBubble(bubble: Pos): Pos {
  if (typeof window === "undefined") return { x: 16, y: 16 };
  const onRight = bubble.x + BUBBLE_SIZE / 2 > window.innerWidth / 2;
  const winH = Math.min(WIN_H, window.innerHeight - 80);
  const winW = Math.min(WIN_W, window.innerWidth - 24);
  const x = onRight
    ? clamp(bubble.x + BUBBLE_SIZE - winW, 12, window.innerWidth - winW - 12)
    : clamp(bubble.x, 12, window.innerWidth - winW - 12);
  const y = clamp(bubble.y - winH - WIN_GAP, 60, window.innerHeight - winH - 50);
  return { x, y };
}

const INTRO_MESSAGE: Message = {
  id: "intro",
  role: "assistant",
  content:
    "Salut 👋 C'est moi, Anjara. Tu peux me poser tes questions sur mon parcours, mes projets cloud/DevOps, mes certifs ou mes articles — en français ou en anglais.",
};

const SUGGESTIONS = [
  "Quels sont tes projets cloud ?",
  "Combien de certifications as-tu ?",
  "Sur quoi travailles-tu en ce moment ?",
];

const NEW_COUNT = 1;

export function FloatingChat() {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<Pos>(
    () => loadJSON<Pos>(STORAGE_POS) ?? defaultBubblePosition(),
  );
  const [winPos, setWinPos] = useState<Pos | null>(() => loadJSON<Pos>(STORAGE_WIN_POS));
  const [snapping, setSnapping] = useState(false);
  const [winSnapping, setWinSnapping] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [messages, setMessages] = useState<Message[]>([INTRO_MESSAGE]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  // Session-only state — badge re-appears on every page reload to entice each visitor
  const [notifSeen, setNotifSeen] = useState<boolean>(false);
  const [wiggle, setWiggle] = useState(false);

  // RAG indexing state
  const [indexStatus, setIndexStatus] = useState<IndexStatus>({ kind: "idle" });
  const indexRef = useRef<VectorIndex | null>(null);

  const dragState = useRef({
    active: false,
    moved: false,
    startX: 0,
    startY: 0,
    posX: 0,
    posY: 0,
  });

  const winDragState = useRef({
    active: false,
    startX: 0,
    startY: 0,
    posX: 0,
    posY: 0,
  });

  const abortRef = useRef<AbortController | null>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const conversationCreatedAtRef = useRef<number | null>(null);
  const conversationLoadedRef = useRef(false);

  // Load persisted conversation on mount
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const stored = await loadConversation(STORAGE_CHAT_ID);
        if (cancelled) return;
        if (stored && stored.messages.length > 0) {
          conversationCreatedAtRef.current = stored.createdAt;
          setMessages([
            INTRO_MESSAGE,
            ...stored.messages.map((m) => ({
              id: m.id,
              role: m.role,
              content: m.content,
            })),
          ]);
        }
      } catch {
        // IDB unavailable → chat stays ephemeral, no surface error
      } finally {
        conversationLoadedRef.current = true;
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Persist conversation whenever messages change (after initial load)
  useEffect(() => {
    if (!conversationLoadedRef.current) return;
    const persistable = messages
      .filter((m) => m.id !== "intro" && !m.pending && !m.error)
      .map(({ id, role, content }) => ({ id, role, content }));
    if (persistable.length === 0) return;
    const now = Date.now();
    if (conversationCreatedAtRef.current === null) {
      conversationCreatedAtRef.current = now;
    }
    void saveConversation({
      id: STORAGE_CHAT_ID,
      title: deriveTitle(persistable),
      createdAt: conversationCreatedAtRef.current,
      updatedAt: now,
      messages: persistable,
    });
  }, [messages]);

  const triggerIndex = async () => {
    setIndexStatus({ kind: "indexing", progress: 0, total: 0, phase: "Initialisation" });
    try {
      const { index, total } = await ensurePortfolioIndex((s) => setIndexStatus(s));
      indexRef.current = index;
      setIndexStatus({ kind: "ready", index, total });
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Impossible de charger la base de connaissance.";
      setIndexStatus({ kind: "error", message });
    }
  };
  const bubbleOnRight =
    typeof window !== "undefined" &&
    position.x + BUBBLE_SIZE / 2 > window.innerWidth / 2;

  useEffect(() => {
    const onResize = () => {
      setPosition((p) => ({
        x: snapTargetX(p.x),
        y: clamp(p.y, 70, window.innerHeight - BUBBLE_SIZE - 50),
      }));
      setWinPos((prev) =>
        prev
          ? {
              x: clamp(prev.x, 12, window.innerWidth - Math.min(WIN_W, window.innerWidth - 24) - 12),
              y: clamp(prev.y, 60, window.innerHeight - Math.min(WIN_H, window.innerHeight - 80) - 50),
            }
          : prev,
      );
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (open && bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [messages, open]);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  // Auto-show preview tooltip after a short delay on first load
  useEffect(() => {
    if (notifSeen || open) return;
    const t = window.setTimeout(() => setPreviewVisible(true), 1400);
    return () => window.clearTimeout(t);
  }, [notifSeen, open]);

  // Periodic wiggle to attract attention while badge is visible
  useEffect(() => {
    if (notifSeen || open) return;
    const tick = () => {
      setWiggle(true);
      window.setTimeout(() => setWiggle(false), 900);
    };
    const start = window.setTimeout(tick, 3000);
    const interval = window.setInterval(tick, 7000);
    return () => {
      window.clearTimeout(start);
      window.clearInterval(interval);
    };
  }, [notifSeen, open]);

  const onPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragState.current = {
      active: true,
      moved: false,
      startX: e.clientX,
      startY: e.clientY,
      posX: position.x,
      posY: position.y,
    };
  };

  const onPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!dragState.current.active) return;
    const dx = e.clientX - dragState.current.startX;
    const dy = e.clientY - dragState.current.startY;
    if (!dragState.current.moved && Math.hypot(dx, dy) > DRAG_THRESHOLD) {
      dragState.current.moved = true;
      setPreviewVisible(false);
    }
    if (dragState.current.moved) {
      setPosition({
        x: clamp(dragState.current.posX + dx, 8, window.innerWidth - BUBBLE_SIZE - 8),
        y: clamp(dragState.current.posY + dy, 60, window.innerHeight - BUBBLE_SIZE - 8),
      });
    }
  };

  const onPointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    if (!dragState.current.moved) {
      openChat();
    } else {
      const targetX = snapTargetX(position.x);
      const snapped: Pos = {
        x: targetX,
        y: clamp(position.y, 70, window.innerHeight - BUBBLE_SIZE - 50),
      };
      setSnapping(true);
      setPosition(snapped);
      saveJSON(STORAGE_POS, snapped);
      // Reset window pos so it re-anchors to the new bubble side on next open
      setWinPos(null);
      try {
        localStorage.removeItem(STORAGE_WIN_POS);
      } catch {
        /* noop */
      }
      window.setTimeout(() => setSnapping(false), SNAP_DURATION + 20);
    }
    dragState.current.active = false;
    dragState.current.moved = false;
  };

  // --- Window drag (via header) ---
  const onWinPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Ignore drag if interacting with the close button
    if ((e.target as HTMLElement).closest("button")) return;
    const currentWin = winPos ?? windowAnchorFromBubble(position);
    e.currentTarget.setPointerCapture(e.pointerId);
    winDragState.current = {
      active: true,
      startX: e.clientX,
      startY: e.clientY,
      posX: currentWin.x,
      posY: currentWin.y,
    };
    if (!winPos) setWinPos(currentWin);
  };

  const onWinPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!winDragState.current.active) return;
    const dx = e.clientX - winDragState.current.startX;
    const dy = e.clientY - winDragState.current.startY;
    const winW = Math.min(WIN_W, window.innerWidth - 24);
    const winH = Math.min(WIN_H, window.innerHeight - 80);
    setWinPos({
      x: clamp(winDragState.current.posX + dx, 8, window.innerWidth - winW - 8),
      y: clamp(winDragState.current.posY + dy, 60, window.innerHeight - winH - 50),
    });
  };

  const onWinPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    if (winDragState.current.active && winPos) {
      // Snap window horizontally to nearest edge (left/right), keep Y where dropped
      const winW = Math.min(WIN_W, window.innerWidth - 24);
      const winH = Math.min(WIN_H, window.innerHeight - 80);
      const center = window.innerWidth / 2 - winW / 2;
      const targetX = winPos.x < center ? EDGE_MARGIN : window.innerWidth - winW - EDGE_MARGIN;
      const snapped: Pos = {
        x: targetX,
        y: clamp(winPos.y, 60, window.innerHeight - winH - 50),
      };
      setWinSnapping(true);
      setWinPos(snapped);
      saveJSON(STORAGE_WIN_POS, snapped);
      window.setTimeout(() => setWinSnapping(false), SNAP_DURATION + 20);
    }
    winDragState.current.active = false;
  };

  const openChat = () => {
    setOpen(true);
    setPreviewVisible(false);
    if (!notifSeen) {
      setNotifSeen(true);
    }
    // Trigger indexing on first open (or re-index if previously failed)
    if (indexStatus.kind === "idle" || indexStatus.kind === "error") {
      void triggerIndex();
    }
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const closeChat = () => setOpen(false);

  const sendQuestion = async (question: string) => {
    const trimmed = question.trim();
    if (!trimmed || loading) return;

    const userMsg: Message = { id: `u-${Date.now()}`, role: "user", content: trimmed };
    const pendingMsg: Message = {
      id: `a-${Date.now()}`,
      role: "assistant",
      content: "",
      pending: true,
    };

    setMessages((prev) => [...prev, userMsg, pendingMsg]);
    setInput("");
    setLoading(true);

    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    const history: ChatHistoryMessage[] = messages
      .filter((m) => !m.pending && !m.error && m.id !== "intro")
      .map((m) => ({ role: m.role, content: m.content }));

    try {
      // 1. Ensure index is ready (defensive — should already be ready when chat is open)
      let index = indexRef.current;
      if (!index) {
        const { index: built } = await ensurePortfolioIndex((s) => setIndexStatus(s));
        indexRef.current = built;
        index = built;
      }

      // 2. RAG retrieval — only send top-k relevant chunks + persona
      const ragChunks = await retrieveContext(trimmed, index, 5);
      const res = await fetchAnswer(trimmed, ragChunks, history, ac.signal);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === pendingMsg.id ? { ...m, content: res.answer, pending: false } : m,
        ),
      );
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") {
        setMessages((prev) => prev.filter((m) => m.id !== pendingMsg.id));
        return;
      }
      const msg =
        err instanceof Error
          ? err.message
          : "Désolé, je n'arrive pas à répondre pour le moment.";
      setMessages((prev) =>
        prev.map((m) =>
          m.id === pendingMsg.id ? { ...m, content: msg, pending: false, error: true } : m,
        ),
      );
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendQuestion(input);
  };

  const isDesktop = typeof window !== "undefined" && window.innerWidth >= 600;
  const winStyleObj: { left?: number; top?: number } = isDesktop
    ? (() => {
        const p = winPos ?? windowAnchorFromBubble(position);
        return { left: p.x, top: p.y };
      })()
    : {};

  return (
    <>
      <button
        type="button"
        className={`pf-chat-bubble ${open ? "pf-chat-bubble-hidden" : ""} ${
          snapping ? "pf-chat-bubble-snapping" : ""
        } ${wiggle && !notifSeen ? "pf-chat-bubble-wiggle" : ""}`}
        style={{ left: position.x, top: position.y }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        aria-label={`Discuter avec ${profile.chatName}`}
      >
        <span className="pf-chat-bubble-avatar">
          {!imgFailed && (
            <img
              src={profile.photoPath}
              alt={profile.shortName}
              draggable={false}
              onError={() => setImgFailed(true)}
            />
          )}
          <span className="pf-chat-bubble-initials" aria-hidden="true">
            {profile.shortName
              .split(" ")
              .map((p) => p[0])
              .join("")
              .toUpperCase()}
          </span>
        </span>
        <span className="pf-chat-bubble-ring" aria-hidden="true" />
        {!notifSeen && (
          <span className="pf-chat-bubble-badge" aria-label={`${NEW_COUNT} nouveau message`}>
            {NEW_COUNT}
          </span>
        )}
      </button>

      {!open && previewVisible && !notifSeen && (
        <div
          className={`pf-chat-preview ${
            bubbleOnRight ? "pf-chat-preview-left" : "pf-chat-preview-right"
          }`}
          style={{
            left: bubbleOnRight ? undefined : position.x + BUBBLE_SIZE + 10,
            right: bubbleOnRight ? window.innerWidth - position.x + 10 : undefined,
            top: position.y + BUBBLE_SIZE / 2 - 24,
          }}
          role="status"
        >
          <span className="pf-chat-preview-arrow" aria-hidden="true" />
          <button
            type="button"
            className="pf-chat-preview-close"
            onClick={(e) => {
              e.stopPropagation();
              setPreviewVisible(false);
            }}
            aria-label="Fermer la notification"
          >
            <X size={12} aria-hidden="true" />
          </button>
          <button
            type="button"
            className="pf-chat-preview-body"
            onClick={openChat}
          >
            <span className="pf-chat-preview-emoji" aria-hidden="true">👋</span>
            <span className="pf-chat-preview-text">
              <strong>Salut, c'est moi !</strong>
              <span>Pose-moi tes questions 💬</span>
            </span>
          </button>
        </div>
      )}

      {open && (
        <div
          className={`pf-chat-window ${winSnapping ? "pf-chat-window-snapping" : ""}`}
          role="dialog"
          aria-label={`Chat IA — ${profile.chatName}`}
          style={winStyleObj}
        >
          <header
            className="pf-chat-header"
            onPointerDown={onWinPointerDown}
            onPointerMove={onWinPointerMove}
            onPointerUp={onWinPointerUp}
          >
            <div className="pf-chat-header-id">
              <div className="pf-chat-avatar" aria-hidden="true">
                {!imgFailed ? (
                  <img
                    src={profile.photoPath}
                    alt={profile.shortName}
                    onError={() => setImgFailed(true)}
                  />
                ) : (
                  <span className="pf-chat-avatar-initials">
                    {profile.shortName
                      .split(" ")
                      .map((p) => p[0])
                      .join("")
                      .toUpperCase()}
                  </span>
                )}
              </div>
              <div className="pf-chat-header-text">
                <div className="pf-chat-header-name">
                  {profile.chatName}
                  <span className="pf-chat-header-tag" aria-label="version IA">
                    AI
                  </span>
                </div>
                <div className="pf-chat-header-status">
                  <span className="pf-chat-dot" aria-hidden="true" /> En ligne · FR / EN
                </div>
              </div>
            </div>
            <span className="pf-chat-drag-handle" aria-hidden="true" title="Glisser pour déplacer">
              <GripHorizontal size={14} />
            </span>
            <button
              type="button"
              className="pf-chat-close"
              onClick={closeChat}
              aria-label="Fermer le chat"
            >
              <X size={18} aria-hidden="true" />
            </button>
          </header>

          <div className="pf-chat-body" ref={bodyRef}>
            {(indexStatus.kind === "indexing" || indexStatus.kind === "error") && (
              <KnowledgeTransfer
                status={indexStatus}
                onRetry={indexStatus.kind === "error" ? triggerIndex : undefined}
              />
            )}

            {indexStatus.kind === "ready" || indexStatus.kind === "idle" ? (
              <>
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={`pf-chat-msg pf-chat-msg-${m.role} ${
                      m.error ? "pf-chat-msg-error" : ""
                    }`}
                  >
                    {m.pending ? (
                      <span className="pf-chat-typing" aria-label="L'assistant écrit">
                        <span /> <span /> <span />
                      </span>
                    ) : (
                      m.content
                    )}
                  </div>
                ))}

                {messages.length === 1 && !loading && indexStatus.kind === "ready" && (
                  <div className="pf-chat-suggestions">
                    <span className="pf-chat-suggestions-label">
                      <Sparkles size={11} aria-hidden="true" /> Suggestions
                    </span>
                    {SUGGESTIONS.map((s) => (
                      <button
                        key={s}
                        type="button"
                        className="pf-chat-suggestion"
                        onClick={() => sendQuestion(s)}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : null}
          </div>

          <form className="pf-chat-input-row" onSubmit={onSubmit}>
            <input
              ref={inputRef}
              type="text"
              className="pf-chat-input"
              placeholder={
                indexStatus.kind === "indexing"
                  ? "Indexation en cours…"
                  : indexStatus.kind === "error"
                  ? "Indexation échouée"
                  : "Pose ta question…"
              }
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading || indexStatus.kind === "indexing" || indexStatus.kind === "error"}
              aria-label="Votre question"
              autoComplete="off"
              spellCheck={false}
            />
            <button
              type="submit"
              className="pf-chat-send"
              disabled={
                loading ||
                !input.trim() ||
                indexStatus.kind === "indexing" ||
                indexStatus.kind === "error"
              }
              aria-label="Envoyer"
            >
              <Send size={16} aria-hidden="true" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
