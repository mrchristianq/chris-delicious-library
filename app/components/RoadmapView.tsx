"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";

const STORAGE_KEY = "cdlRoadmapItems";

type RoadmapItem = {
  id: string;
  text: string;
  completed: boolean;
  createdAt: number;
  completedAt?: number;
};

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function loadItems(): RoadmapItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as RoadmapItem[];
  } catch {
    return [];
  }
}

function saveItems(items: RoadmapItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // storage unavailable
  }
}

type RoadmapViewProps = {
  onExit?: () => void;
};

export function RoadmapView({ onExit }: RoadmapViewProps) {
  const [items, setItems] = useState<RoadmapItem[]>([]);
  const [inputText, setInputText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setItems(loadItems());
  }, []);

  function persist(next: RoadmapItem[]): void {
    setItems(next);
    saveItems(next);
  }

  function addItem(): void {
    const text = inputText.trim();
    if (!text) return;
    const next: RoadmapItem = {
      id: generateId(),
      text,
      completed: false,
      createdAt: Date.now(),
    };
    persist([next, ...items]);
    setInputText("");
    inputRef.current?.focus();
  }

  function handleInputKeyDown(e: KeyboardEvent<HTMLInputElement>): void {
    if (e.key === "Enter") addItem();
  }

  function toggleComplete(id: string): void {
    persist(
      items.map((item) =>
        item.id === id
          ? { ...item, completed: !item.completed, completedAt: !item.completed ? Date.now() : undefined }
          : item
      )
    );
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
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    const reordered = [...openItems];
    [reordered[idx], reordered[swapIdx]] = [reordered[swapIdx], reordered[idx]];
    persist([...reordered, ...items.filter((i) => i.completed)]);
  }

  const openItems = items.filter((i) => !i.completed);
  const completedItems = items.filter((i) => i.completed).sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0));

  return (
    <section className="roadmapRoot">
      <div className="roadmapBgGlow" aria-hidden />

      <header className="roadmapHeader">
        <div className="roadmapHeaderIntro">
          {onExit ? (
            <button type="button" className="roadmapExitButton" onClick={onExit}>
              Back to Library
            </button>
          ) : null}
          <h1 className="roadmapTitle">Roadmap</h1>
          <p className="roadmapSubtitle">Track features and changes you want to add to the app.</p>
        </div>
      </header>

      {/* Add new item */}
      <div className="roadmapAddRow">
        <input
          ref={inputRef}
          className="roadmapInput"
          type="text"
          placeholder="Describe a new feature or change…"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleInputKeyDown}
          autoFocus
        />
        <button
          type="button"
          className="roadmapAddButton"
          onClick={addItem}
          disabled={!inputText.trim()}
        >
          Add
        </button>
      </div>

      {/* Open items */}
      {openItems.length > 0 ? (
        <div className="roadmapSection">
          <div className="roadmapSectionLabel">Open · {openItems.length}</div>
          <ul className="roadmapList">
            {openItems.map((item, idx) => (
              <li key={item.id} className="roadmapItem">
                <button
                  type="button"
                  className="roadmapCheckbox"
                  onClick={() => toggleComplete(item.id)}
                  aria-label="Mark complete"
                  title="Mark complete"
                >
                  <span className="roadmapCheckboxInner" />
                </button>
                <span className="roadmapItemText">{item.text}</span>
                <div className="roadmapItemActions">
                  <button
                    type="button"
                    className="roadmapMoveButton"
                    onClick={() => moveItem(item.id, "up")}
                    disabled={idx === 0}
                    aria-label="Move up"
                    title="Move up"
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    className="roadmapMoveButton"
                    onClick={() => moveItem(item.id, "down")}
                    disabled={idx === openItems.length - 1}
                    aria-label="Move down"
                    title="Move down"
                  >
                    ▼
                  </button>
                  <button
                    type="button"
                    className="roadmapDeleteButton"
                    onClick={() => deleteItem(item.id)}
                    aria-label="Delete"
                    title="Delete"
                  >
                    ✕
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="roadmapEmpty">No open items. Add something above to get started.</div>
      )}

      {/* Completed items */}
      {completedItems.length > 0 ? (
        <div className="roadmapSection roadmapCompletedSection">
          <div className="roadmapSectionLabel roadmapSectionLabelCompleted">Completed · {completedItems.length}</div>
          <ul className="roadmapList">
            {completedItems.map((item) => (
              <li key={item.id} className="roadmapItem roadmapItemDone">
                <button
                  type="button"
                  className="roadmapCheckbox roadmapCheckboxDone"
                  onClick={() => toggleComplete(item.id)}
                  aria-label="Mark incomplete"
                  title="Mark incomplete"
                >
                  <span className="roadmapCheckboxInner">✓</span>
                </button>
                <span className="roadmapItemText roadmapItemTextDone">{item.text}</span>
                <div className="roadmapItemActions">
                  <button
                    type="button"
                    className="roadmapDeleteButton"
                    onClick={() => deleteItem(item.id)}
                    aria-label="Delete"
                    title="Delete"
                  >
                    ✕
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <style jsx>{`
        .roadmapRoot {
          --rm-bg: rgba(8, 20, 44, 0.86);
          --rm-card: linear-gradient(156deg, rgba(30, 59, 106, 0.82), rgba(16, 34, 70, 0.9));
          --rm-border: rgba(125, 171, 242, 0.3);
          --rm-text: rgba(233, 243, 255, 0.96);
          --rm-muted: rgba(191, 211, 240, 0.65);
          --rm-accent: #5ee0ff;
          --rm-green: #62f39b;
          position: relative;
          min-height: calc(100vh - 12px);
          margin: 8px 10px 0 10px;
          border-radius: 20px;
          padding: clamp(14px, 2vw, 28px);
          overflow: hidden;
          color: var(--rm-text);
          background:
            radial-gradient(circle at 10% -10%, rgba(78, 144, 250, 0.22), transparent 42%),
            radial-gradient(circle at 95% 14%, rgba(43, 218, 170, 0.16), transparent 36%),
            var(--rm-bg);
          border: 1px solid rgba(117, 160, 228, 0.36);
          box-shadow:
            inset 0 1px 0 rgba(214, 234, 255, 0.22),
            0 26px 70px rgba(4, 12, 29, 0.54),
            0 6px 18px rgba(0, 0, 0, 0.35);
          animation: roadmapFadeRise 480ms cubic-bezier(0.22, 1, 0.36, 1);
        }

        @keyframes roadmapFadeRise {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .roadmapBgGlow {
          position: absolute;
          width: 460px;
          height: 460px;
          right: -130px;
          bottom: -210px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(98, 243, 155, 0.18), rgba(98, 243, 155, 0));
          pointer-events: none;
        }

        .roadmapHeader {
          position: relative;
          margin-bottom: 22px;
        }

        .roadmapHeaderIntro {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .roadmapExitButton {
          display: inline-flex;
          align-items: center;
          align-self: flex-start;
          border: 1px solid rgba(154, 198, 255, 0.64);
          background: linear-gradient(165deg, rgba(39, 78, 140, 0.82), rgba(21, 48, 94, 0.88));
          color: #e7f2ff;
          border-radius: 999px;
          padding: 6px 12px;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.03em;
          cursor: pointer;
          box-shadow: 0 8px 16px rgba(7, 20, 44, 0.4), inset 0 1px 0 rgba(220, 241, 255, 0.3);
          transition: transform 120ms ease, border-color 120ms ease, background 120ms ease;
        }

        .roadmapExitButton:hover {
          transform: translateY(-1px);
          border-color: rgba(194, 226, 255, 0.82);
          background: linear-gradient(165deg, rgba(48, 92, 162, 0.9), rgba(28, 62, 119, 0.92));
        }

        .roadmapTitle {
          margin: 0;
          font-size: clamp(24px, 4vw, 34px);
          line-height: 1;
          letter-spacing: 0.02em;
          font-weight: 900;
          color: #f4f8ff;
          text-shadow: 0 4px 24px rgba(53, 116, 244, 0.4);
        }

        .roadmapSubtitle {
          margin: 0;
          font-size: 12px;
          color: var(--rm-muted);
          letter-spacing: 0.01em;
        }

        .roadmapAddRow {
          display: flex;
          gap: 8px;
          margin-bottom: 28px;
        }

        .roadmapInput {
          flex: 1;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(125, 171, 242, 0.3);
          border-radius: 10px;
          padding: 10px 14px;
          color: var(--rm-text);
          font-size: 13px;
          font-weight: 500;
          outline: none;
          transition: border-color 140ms ease, background 140ms ease;
        }

        .roadmapInput::placeholder {
          color: var(--rm-muted);
        }

        .roadmapInput:focus {
          border-color: rgba(94, 224, 255, 0.6);
          background: rgba(255, 255, 255, 0.09);
        }

        .roadmapAddButton {
          background: linear-gradient(145deg, rgba(62, 140, 230, 0.85), rgba(32, 88, 175, 0.9));
          border: 1px solid rgba(130, 190, 255, 0.5);
          border-radius: 10px;
          color: #e8f4ff;
          font-size: 13px;
          font-weight: 700;
          padding: 10px 20px;
          cursor: pointer;
          transition: transform 120ms ease, background 120ms ease;
          white-space: nowrap;
        }

        .roadmapAddButton:hover:not(:disabled) {
          transform: translateY(-1px);
          background: linear-gradient(145deg, rgba(74, 154, 244, 0.9), rgba(44, 102, 196, 0.95));
        }

        .roadmapAddButton:disabled {
          opacity: 0.35;
          cursor: default;
        }

        .roadmapSection {
          margin-bottom: 28px;
        }

        .roadmapCompletedSection {
          opacity: 0.8;
        }

        .roadmapSectionLabel {
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--rm-accent);
          margin-bottom: 10px;
        }

        .roadmapSectionLabelCompleted {
          color: var(--rm-green);
        }

        .roadmapList {
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .roadmapItem {
          display: flex;
          align-items: center;
          gap: 10px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(125, 171, 242, 0.18);
          border-radius: 10px;
          padding: 10px 12px;
          transition: background 120ms ease;
        }

        .roadmapItem:hover {
          background: rgba(255, 255, 255, 0.08);
        }

        .roadmapItemDone {
          background: rgba(98, 243, 155, 0.04);
          border-color: rgba(98, 243, 155, 0.15);
        }

        .roadmapCheckbox {
          flex: 0 0 auto;
          width: 20px;
          height: 20px;
          border-radius: 6px;
          border: 1.5px solid rgba(125, 171, 242, 0.5);
          background: transparent;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: border-color 120ms ease, background 120ms ease;
          padding: 0;
        }

        .roadmapCheckbox:hover {
          border-color: rgba(94, 224, 255, 0.8);
          background: rgba(94, 224, 255, 0.1);
        }

        .roadmapCheckboxDone {
          border-color: rgba(98, 243, 155, 0.7);
          background: rgba(98, 243, 155, 0.15);
        }

        .roadmapCheckboxDone:hover {
          border-color: rgba(98, 243, 155, 0.9);
          background: rgba(98, 243, 155, 0.22);
        }

        .roadmapCheckboxInner {
          font-size: 11px;
          font-weight: 900;
          color: var(--rm-green);
          line-height: 1;
          user-select: none;
        }

        .roadmapItemText {
          flex: 1;
          font-size: 13px;
          font-weight: 500;
          color: var(--rm-text);
          line-height: 1.4;
        }

        .roadmapItemTextDone {
          text-decoration: line-through;
          color: var(--rm-muted);
        }

        .roadmapItemActions {
          display: flex;
          align-items: center;
          gap: 2px;
          flex: 0 0 auto;
          opacity: 0;
          transition: opacity 120ms ease;
        }

        .roadmapItem:hover .roadmapItemActions {
          opacity: 1;
        }

        .roadmapMoveButton,
        .roadmapDeleteButton {
          width: 24px;
          height: 24px;
          border-radius: 6px;
          border: none;
          background: transparent;
          color: var(--rm-muted);
          font-size: 9px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 100ms ease, color 100ms ease;
          padding: 0;
        }

        .roadmapMoveButton:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.1);
          color: var(--rm-text);
        }

        .roadmapMoveButton:disabled {
          opacity: 0.2;
          cursor: default;
        }

        .roadmapDeleteButton {
          font-size: 10px;
          color: rgba(255, 130, 130, 0.5);
        }

        .roadmapDeleteButton:hover {
          background: rgba(255, 80, 80, 0.12);
          color: rgba(255, 140, 140, 0.9);
        }

        .roadmapEmpty {
          font-size: 13px;
          color: var(--rm-muted);
          text-align: center;
          padding: 32px 0;
          font-style: italic;
        }
      `}</style>
    </section>
  );
}
