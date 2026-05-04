"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";

const STORAGE_KEY = "cdlRoadmapItems";

type Tag = "bug" | "feature";

type RoadmapItem = {
  id: string;
  text: string;
  tag?: Tag;
  completed: boolean;
  createdAt: number;
  completedAt?: number;
};

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function localLoad(): RoadmapItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as RoadmapItem[]) : [];
  } catch {
    return [];
  }
}

function localSave(items: RoadmapItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {}
}

async function serverLoad(): Promise<RoadmapItem[]> {
  const res = await fetch("/api/roadmap", { cache: "no-store" });
  if (!res.ok) throw new Error("load failed");
  const data = await res.json();
  return data.items as RoadmapItem[];
}

async function serverSave(items: RoadmapItem[]): Promise<void> {
  const res = await fetch("/api/roadmap", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items }),
  });
  if (!res.ok) throw new Error("save failed");
}

const TAG_STYLES: Record<Tag, { bg: string; color: string; border: string; label: string }> = {
  bug: {
    bg: "rgba(255, 59, 48, 0.09)",
    color: "#c0392b",
    border: "rgba(255, 59, 48, 0.22)",
    label: "Bug",
  },
  feature: {
    bg: "rgba(0, 113, 227, 0.08)",
    color: "#0055b3",
    border: "rgba(0, 113, 227, 0.22)",
    label: "Feature",
  },
};

function TagPill({ tag }: { tag: Tag }) {
  const s = TAG_STYLES[tag];
  return (
    <span style={{
      display: "inline-flex", alignItems: "center",
      padding: "2px 8px", borderRadius: 999,
      fontSize: 10, fontWeight: 700, letterSpacing: "0.04em",
      background: s.bg, color: s.color,
      border: `1px solid ${s.border}`,
      flexShrink: 0,
    }}>
      {s.label}
    </span>
  );
}

function TagSelector({ value, onChange }: { value?: Tag; onChange: (t?: Tag) => void }) {
  return (
    <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
      {(["bug", "feature"] as Tag[]).map((t) => {
        const s = TAG_STYLES[t];
        const active = value === t;
        return (
          <button
            key={t}
            type="button"
            onClick={() => onChange(active ? undefined : t)}
            style={{
              padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700,
              cursor: "pointer", letterSpacing: "0.03em",
              background: active ? s.bg : "rgba(0,0,0,0.04)",
              color: active ? s.color : "rgba(0,0,0,0.38)",
              border: active ? `1px solid ${s.border}` : "1px solid rgba(0,0,0,0.1)",
              transition: "all 120ms ease",
            }}
          >
            {s.label}
          </button>
        );
      })}
    </div>
  );
}

type RoadmapViewProps = {
  onExit?: () => void;
};

export function RoadmapView({ onExit }: RoadmapViewProps) {
  const [items, setItems] = useState<RoadmapItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saveError, setSaveError] = useState(false);
  const [inputText, setInputText] = useState("");
  const [inputTag, setInputTag] = useState<Tag | undefined>(undefined);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [editTag, setEditTag] = useState<Tag | undefined>(undefined);
  const inputRef = useRef<HTMLInputElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const cached = localLoad();
    if (cached.length > 0) setItems(cached);
    serverLoad()
      .then((serverItems) => { setItems(serverItems); localSave(serverItems); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (editingId && editInputRef.current) editInputRef.current.focus();
  }, [editingId]);

  function persist(next: RoadmapItem[]): void {
    setItems(next);
    localSave(next);
    setSaveError(false);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      serverSave(next).catch(() => setSaveError(true));
    }, 400);
  }

  function addItem(): void {
    const text = inputText.trim();
    if (!text) return;
    persist([{ id: generateId(), text, tag: inputTag, completed: false, createdAt: Date.now() }, ...items]);
    setInputText("");
    setInputTag(undefined);
    inputRef.current?.focus();
  }

  function handleInputKeyDown(e: KeyboardEvent<HTMLInputElement>): void {
    if (e.key === "Enter") addItem();
    if (e.key === "Escape") { setInputText(""); setInputTag(undefined); }
  }

  function startEdit(item: RoadmapItem): void {
    setEditingId(item.id);
    setEditText(item.text);
    setEditTag(item.tag);
  }

  function commitEdit(id: string): void {
    const text = editText.trim();
    if (!text) { setEditingId(null); return; }
    persist(items.map((item) => item.id === id ? { ...item, text, tag: editTag } : item));
    setEditingId(null);
  }

  function handleEditKeyDown(e: KeyboardEvent<HTMLInputElement>, id: string): void {
    if (e.key === "Enter") commitEdit(id);
    if (e.key === "Escape") setEditingId(null);
  }

  function toggleComplete(id: string): void {
    persist(items.map((item) =>
      item.id === id
        ? { ...item, completed: !item.completed, completedAt: !item.completed ? Date.now() : undefined }
        : item
    ));
  }

  function deleteItem(id: string): void {
    persist(items.filter((item) => item.id !== id));
  }

  function moveItem(id: string, direction: "up" | "down"): void {
    const openItems = items.filter((i) => !i.completed);
    const idx = openItems.findIndex((i) => i.id === id);
    if (idx === -1) return;
    if (direction === "up" && idx === 0) return;
    if (direction === "down" && idx === openItems.length - 1) return;
    const reordered = [...openItems];
    [reordered[idx], reordered[direction === "up" ? idx - 1 : idx + 1]] = [reordered[direction === "up" ? idx - 1 : idx + 1], reordered[idx]];
    persist([...reordered, ...items.filter((i) => i.completed)]);
  }

  const openItems = items.filter((i) => !i.completed);
  const completedItems = items.filter((i) => i.completed).sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0));

  return (
    <div style={{
      minHeight: "calc(100vh - 12px)",
      margin: "8px 10px 0 10px",
      borderRadius: 16,
      background: "rgba(255, 255, 255, 0.62)",
      backdropFilter: "blur(20px) saturate(1.2)",
      WebkitBackdropFilter: "blur(20px) saturate(1.2)",
      border: "1px solid rgba(0, 0, 0, 0.08)",
      boxShadow: "0 2px 16px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)",
      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", sans-serif',
      color: "#1d1d1f",
      overflow: "hidden",
      animation: "roadmapFadeRise 320ms cubic-bezier(0.22, 1, 0.36, 1)",
    }}>
      <style>{`
        @keyframes roadmapFadeRise {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Header */}
      <div style={{
        padding: "20px 24px 16px",
        borderBottom: "1px solid rgba(0,0,0,0.07)",
        display: "flex", flexDirection: "column", gap: 6,
      }}>
        {onExit ? (
          <button
            type="button"
            onClick={onExit}
            style={{
              alignSelf: "flex-start",
              display: "inline-flex", alignItems: "center", gap: 5,
              padding: "5px 12px", borderRadius: 999,
              border: "1px solid rgba(0,0,0,0.14)",
              background: "rgba(255,255,255,0.7)",
              color: "rgba(0,0,0,0.6)",
              fontSize: 12, fontWeight: 600, cursor: "pointer",
              transition: "background 120ms, border-color 120ms",
            }}
          >
            ← Back to Library
          </button>
        ) : null}
        <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, letterSpacing: "-0.02em", color: "#1d1d1f" }}>
            Roadmap
          </h1>
          {loading ? (
            <span style={{ fontSize: 12, color: "rgba(0,0,0,0.35)", fontWeight: 500 }}>Syncing…</span>
          ) : saveError ? (
            <span style={{ fontSize: 12, color: "#c0392b", fontWeight: 500 }}>⚠ Couldn't save</span>
          ) : null}
        </div>
        <p style={{ margin: 0, fontSize: 13, color: "rgba(0,0,0,0.45)", fontWeight: 400 }}>
          Track features and fixes you want to add to the app.
        </p>
      </div>

      <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 24 }}>

        {/* Add new item */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              ref={inputRef}
              type="text"
              placeholder="Describe a new feature or bug…"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleInputKeyDown}
              autoFocus
              style={{
                flex: 1, padding: "9px 13px",
                borderRadius: 10,
                border: "1px solid rgba(0,0,0,0.14)",
                background: "rgba(255,255,255,0.9)",
                fontSize: 13, fontWeight: 450, color: "#1d1d1f",
                outline: "none",
                fontFamily: "inherit",
                boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                transition: "border-color 140ms, box-shadow 140ms",
              }}
            />
            <button
              type="button"
              onClick={addItem}
              disabled={!inputText.trim()}
              style={{
                padding: "9px 18px", borderRadius: 10,
                border: "none",
                background: inputText.trim() ? "#0071e3" : "rgba(0,0,0,0.08)",
                color: inputText.trim() ? "#fff" : "rgba(0,0,0,0.28)",
                fontSize: 13, fontWeight: 600, cursor: inputText.trim() ? "pointer" : "default",
                whiteSpace: "nowrap", fontFamily: "inherit",
                transition: "background 140ms, color 140ms",
              }}
            >
              Add
            </button>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 11, color: "rgba(0,0,0,0.38)", fontWeight: 500 }}>Tag:</span>
            <TagSelector value={inputTag} onChange={setInputTag} />
          </div>
        </div>

        {/* Open items */}
        {openItems.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.07em", color: "rgba(0,0,0,0.38)", textTransform: "uppercase" }}>
              Open · {openItems.length}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {openItems.map((item, idx) => (
                <div key={item.id} style={{
                  background: "rgba(255,255,255,0.82)",
                  border: "1px solid rgba(0,0,0,0.08)",
                  borderRadius: 11,
                  boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                  overflow: "hidden",
                }}>
                  {editingId === item.id ? (
                    /* Edit mode */
                    <div style={{ padding: "10px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
                      <input
                        ref={editInputRef}
                        type="text"
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        onKeyDown={(e) => handleEditKeyDown(e, item.id)}
                        style={{
                          width: "100%", padding: "7px 11px", borderRadius: 8,
                          border: "1px solid rgba(0,113,227,0.4)",
                          background: "rgba(255,255,255,0.95)",
                          fontSize: 13, fontWeight: 450, color: "#1d1d1f",
                          outline: "none", fontFamily: "inherit",
                          boxSizing: "border-box",
                        }}
                      />
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 11, color: "rgba(0,0,0,0.38)", fontWeight: 500 }}>Tag:</span>
                          <TagSelector value={editTag} onChange={setEditTag} />
                        </div>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button type="button" onClick={() => setEditingId(null)}
                            style={{ padding: "5px 12px", borderRadius: 7, border: "1px solid rgba(0,0,0,0.14)", background: "transparent", fontSize: 12, fontWeight: 600, color: "rgba(0,0,0,0.5)", cursor: "pointer", fontFamily: "inherit" }}>
                            Cancel
                          </button>
                          <button type="button" onClick={() => commitEdit(item.id)}
                            style={{ padding: "5px 12px", borderRadius: 7, border: "none", background: "#0071e3", fontSize: 12, fontWeight: 600, color: "#fff", cursor: "pointer", fontFamily: "inherit" }}>
                            Save
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* View mode */
                    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px" }}
                      className="rm-item">
                      <button
                        type="button"
                        onClick={() => toggleComplete(item.id)}
                        aria-label="Mark complete"
                        style={{
                          flexShrink: 0, width: 18, height: 18, borderRadius: 5,
                          border: "1.5px solid rgba(0,0,0,0.22)",
                          background: "transparent", cursor: "pointer",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          padding: 0, transition: "border-color 120ms, background 120ms",
                        }}
                      />
                      <span style={{ flex: 1, fontSize: 13, fontWeight: 450, color: "#1d1d1f", lineHeight: 1.45 }}>
                        {item.text}
                      </span>
                      {item.tag ? <TagPill tag={item.tag} /> : null}
                      <div className="rm-actions" style={{ display: "flex", alignItems: "center", gap: 2, opacity: 0, transition: "opacity 120ms", flexShrink: 0 }}>
                        <button type="button" onClick={() => moveItem(item.id, "up")} disabled={idx === 0} aria-label="Move up"
                          style={{ width: 24, height: 24, border: "none", background: "transparent", color: "rgba(0,0,0,0.3)", fontSize: 10, cursor: idx === 0 ? "default" : "pointer", opacity: idx === 0 ? 0.3 : 1, borderRadius: 5, display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}>▲</button>
                        <button type="button" onClick={() => moveItem(item.id, "down")} disabled={idx === openItems.length - 1} aria-label="Move down"
                          style={{ width: 24, height: 24, border: "none", background: "transparent", color: "rgba(0,0,0,0.3)", fontSize: 10, cursor: idx === openItems.length - 1 ? "default" : "pointer", opacity: idx === openItems.length - 1 ? 0.3 : 1, borderRadius: 5, display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}>▼</button>
                        <button type="button" onClick={() => startEdit(item)} aria-label="Edit"
                          style={{ width: 28, height: 24, border: "none", background: "transparent", color: "rgba(0,0,0,0.35)", fontSize: 12, cursor: "pointer", borderRadius: 5, display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                          </svg>
                        </button>
                        <button type="button" onClick={() => deleteItem(item.id)} aria-label="Delete"
                          style={{ width: 24, height: 24, border: "none", background: "transparent", color: "rgba(200,50,50,0.5)", fontSize: 13, cursor: "pointer", borderRadius: 5, display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}>✕</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: "32px 0", fontSize: 13, color: "rgba(0,0,0,0.32)", fontStyle: "italic" }}>
            No open items — add something above to get started.
          </div>
        )}

        {/* Completed items */}
        {completedItems.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.07em", color: "rgba(52,199,89,0.8)", textTransform: "uppercase" }}>
              Completed · {completedItems.length}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {completedItems.map((item) => (
                <div key={item.id} style={{
                  background: "rgba(52,199,89,0.05)",
                  border: "1px solid rgba(52,199,89,0.14)",
                  borderRadius: 11,
                  overflow: "hidden",
                }}>
                  {editingId === item.id ? (
                    <div style={{ padding: "10px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
                      <input
                        ref={editInputRef}
                        type="text"
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        onKeyDown={(e) => handleEditKeyDown(e, item.id)}
                        style={{
                          width: "100%", padding: "7px 11px", borderRadius: 8,
                          border: "1px solid rgba(0,113,227,0.4)",
                          background: "rgba(255,255,255,0.95)",
                          fontSize: 13, fontWeight: 450, color: "#1d1d1f",
                          outline: "none", fontFamily: "inherit",
                          boxSizing: "border-box",
                        }}
                      />
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 11, color: "rgba(0,0,0,0.38)", fontWeight: 500 }}>Tag:</span>
                          <TagSelector value={editTag} onChange={setEditTag} />
                        </div>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button type="button" onClick={() => setEditingId(null)}
                            style={{ padding: "5px 12px", borderRadius: 7, border: "1px solid rgba(0,0,0,0.14)", background: "transparent", fontSize: 12, fontWeight: 600, color: "rgba(0,0,0,0.5)", cursor: "pointer", fontFamily: "inherit" }}>
                            Cancel
                          </button>
                          <button type="button" onClick={() => commitEdit(item.id)}
                            style={{ padding: "5px 12px", borderRadius: 7, border: "none", background: "#0071e3", fontSize: 12, fontWeight: 600, color: "#fff", cursor: "pointer", fontFamily: "inherit" }}>
                            Save
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px" }} className="rm-item">
                      <button
                        type="button"
                        onClick={() => toggleComplete(item.id)}
                        aria-label="Mark incomplete"
                        style={{
                          flexShrink: 0, width: 18, height: 18, borderRadius: 5,
                          border: "1.5px solid rgba(52,199,89,0.6)",
                          background: "rgba(52,199,89,0.18)", cursor: "pointer",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          padding: 0, color: "#34c759", fontSize: 10, fontWeight: 900,
                        }}
                      >✓</button>
                      <span style={{ flex: 1, fontSize: 13, fontWeight: 400, color: "rgba(0,0,0,0.38)", lineHeight: 1.45, textDecoration: "line-through" }}>
                        {item.text}
                      </span>
                      {item.tag ? <TagPill tag={item.tag} /> : null}
                      <div className="rm-actions" style={{ display: "flex", alignItems: "center", gap: 2, opacity: 0, transition: "opacity 120ms", flexShrink: 0 }}>
                        <button type="button" onClick={() => startEdit(item)} aria-label="Edit"
                          style={{ width: 28, height: 24, border: "none", background: "transparent", color: "rgba(0,0,0,0.3)", fontSize: 12, cursor: "pointer", borderRadius: 5, display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                          </svg>
                        </button>
                        <button type="button" onClick={() => deleteItem(item.id)} aria-label="Delete"
                          style={{ width: 24, height: 24, border: "none", background: "transparent", color: "rgba(200,50,50,0.45)", fontSize: 13, cursor: "pointer", borderRadius: 5, display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}>✕</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <style>{`
        .rm-item:hover .rm-actions { opacity: 1 !important; }
      `}</style>
    </div>
  );
}
