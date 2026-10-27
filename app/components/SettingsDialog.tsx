"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type PointerEventHandler,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";

export type SettingsRange = {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  update: (value: number) => void;
  unit?: string;
  image?: string;
  accent?: string;
  help?: string;
};
export type SettingsSection = {
  category: string;
  title: string;
  reset?: () => void;
  ranges?: SettingsRange[];
  choices?: {
    label: string;
    value: string;
    update: (value: string) => void;
    options: { value: string; label: string }[];
  }[];
  content?: ReactNode;
};
const categories = [
  {
    key: "covers",
    label: "Cover sizes",
    description: "Balance the covers in your collection.",
    icon: "▧",
    accent: "#3489ee",
  },
  {
    key: "spacing",
    label: "Shelf spacing",
    description: "Give your collection room to breathe.",
    icon: "☰",
    accent: "#df8a27",
  },
  {
    key: "sidebar",
    label: "Sidebar",
    description: "Arrange your library navigation.",
    icon: "▥",
    accent: "#44a269",
  },
  {
    key: "text",
    label: "Text & icons",
    description: "Fine-tune the labels and icons in your sidebar.",
    icon: "Aa",
    accent: "#9462cd",
  },
  {
    key: "advanced",
    label: "Advanced",
    description: "Status badges, accent colors and recent updates.",
    icon: "⚙",
    accent: "#77808d",
  },
];
type Props = {
  isDark: boolean;
  version: string;
  sections: SettingsSection[];
  notes: readonly { version: string; date: string; notes: readonly string[] }[];
  onClose: () => void;
  windowRef: RefObject<HTMLDivElement | null>;
  position: { x: number; y: number } | null;
  onPointerDown: PointerEventHandler<HTMLDivElement>;
  onPointerMove: PointerEventHandler<HTMLDivElement>;
  onPointerUp: PointerEventHandler<HTMLDivElement>;
};

function RangeRow({
  control,
  section,
}: {
  control: SettingsRange;
  section: string;
}) {
  const id = useId();
  const change = (direction: number) =>
    control.update(
      Math.max(
        control.min,
        Math.min(control.max, control.value + direction * control.step),
      ),
    );
  return (
    <div className="settingRange">
      {control.accent ? (
        <span className="preview" aria-hidden="true">
          {control.image ? (
            <img src={control.image} alt="" loading="lazy" />
          ) : (
            <span style={{ color: control.accent }}>♫</span>
          )}
        </span>
      ) : null}
      <label htmlFor={id}>
        <span>
          {control.accent ? <i style={{ background: control.accent }} /> : null}
          {control.label}
        </span>
        {control.help ? <small>{control.help}</small> : null}
      </label>
      <div className="slider">
        <button
          type="button"
          aria-label={`Decrease ${section} ${control.label}`}
          disabled={control.value <= control.min}
          onClick={() => change(-1)}
        >
          −
        </button>
        <input
          id={id}
          aria-label={`${section} ${control.label}`}
          type="range"
          min={control.min}
          max={control.max}
          step={control.step}
          value={control.value}
          onChange={(e) => control.update(Number(e.target.value))}
        />
        <button
          type="button"
          aria-label={`Increase ${section} ${control.label}`}
          disabled={control.value >= control.max}
          onClick={() => change(1)}
        >
          +
        </button>
      </div>
      <output htmlFor={id}>
        {control.value}
        {control.unit}
      </output>
      <style jsx>{`
        .settingRange {
          display: flex;
          align-items: center;
          gap: 12px;
          min-height: 76px;
          padding: 12px 16px;
          border-bottom: 1px solid var(--settings-line);
        }
        .settingRange:last-child {
          border-bottom: 0;
        }
        .preview {
          width: 34px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex: none;
        }
        .preview img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          border-radius: 5px;
        }
        .preview > span {
          font-size: 28px;
        }
        label {
          flex: 0 0 110px;
          min-width: 0;
          font-size: 13px;
        }
        label > span {
          display: flex;
          align-items: center;
          gap: 7px;
        }
        i {
          width: 9px;
          height: 9px;
          border-radius: 50%;
          flex: none;
        }
        small {
          display: block;
          font-size: 11px;
          color: var(--settings-muted);
          line-height: 1.4;
          margin-top: 4px;
        }
        .slider {
          display: flex;
          align-items: center;
          gap: 9px;
          flex: 1;
          min-width: 0;
        }
        button {
          width: 34px;
          min-height: 34px;
          flex: none;
          border-radius: 10px;
          border: 1px solid var(--settings-line);
          background: var(--settings-soft);
          font-size: 18px;
          color: var(--settings-ink);
          cursor: pointer;
        }
        button:disabled {
          opacity: 0.35;
          cursor: default;
        }
        input {
          appearance: none;
          -webkit-appearance: none;
          min-width: 0;
          width: 100%;
          height: 40px;
          background: transparent;
          cursor: pointer;
          accent-color: #3489ee;
        }
        input::-webkit-slider-runnable-track {
          height: 6px;
          border-radius: 10px;
          background: #c9ddf8;
        }
        input::-webkit-slider-thumb {
          appearance: none;
          width: 21px;
          height: 21px;
          border-radius: 50%;
          margin-top: -7.5px;
          background: #438ff1;
          box-shadow: 0 2px 5px #0003;
          border: 0;
        }
        input::-moz-range-track {
          height: 6px;
          background: #c9ddf8;
          border-radius: 10px;
        }
        input::-moz-range-thumb {
          width: 21px;
          height: 21px;
          border: 0;
          border-radius: 50%;
          background: #438ff1;
        }
        output {
          font-size: 12px;
          font-weight: 600;
          font-variant-numeric: tabular-nums;
          min-width: 42px;
          text-align: right;
          color: var(--settings-accent);
        }
        button:focus-visible,
        input:focus-visible {
          outline: 2px solid #3489ee;
          outline-offset: 3px;
        }
        @media (max-width: 820px) {
          .settingRange {
            flex-wrap: wrap;
            gap: 6px 10px;
            padding: 12px 14px;
          }
          .preview {
            width: 28px;
            height: 38px;
          }
          label {
            flex: 1;
            font-size: 14px;
          }
          .slider {
            order: 3;
            flex-basis: 100%;
            gap: 12px;
          }
          button {
            width: 44px;
            min-height: 44px;
          }
          .slider input {
            height: 44px;
          }
          output {
            font-size: 13px;
          }
        }
      `}</style>
    </div>
  );
}

export function SettingsDialog({
  isDark,
  version,
  sections,
  notes,
  onClose,
  windowRef,
  position,
  onPointerDown,
  onPointerMove,
  onPointerUp,
}: Props) {
  const dialog = useRef<HTMLDialogElement>(null),
    scroll = useRef<HTMLDivElement>(null);
  const [category, setCategory] = useState("covers");
  const [versionExpanded, setVersionExpanded] = useState(false);
  useEffect(() => {
    const element = dialog.current,
      previous =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null,
      overflow = document.body.style.overflow;
    element?.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      element?.close();
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, []);
  const active = categories.find((c) => c.key === category)!;
  const selected = sections.filter((s) => s.category === category);
  function choose(key: string) {
    setCategory(key);
    scroll.current?.scrollTo({ top: 0 });
  }
  function renderSection(section: SettingsSection) {
    return (
      <>
        {section.ranges?.map((control) => (
          <RangeRow
            key={control.label}
            section={section.title}
            control={control}
          />
        ))}
        {section.choices?.map((choice) => (
          <label className="choice" key={choice.label}>
            <span>{choice.label}</span>
            <select
              aria-label={`${section.title} ${choice.label}`}
              value={choice.value}
              onChange={(e) => choice.update(e.target.value)}
            >
              {choice.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        ))}
        {section.content}
      </>
    );
  }
  if (typeof document === "undefined") return null;
  return createPortal(
    <dialog
      ref={dialog}
      className={`settingsDialog ${isDark ? "dark" : ""}`}
      aria-labelledby="preferences-title"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onKeyDown={(e) => e.stopPropagation()}
      onKeyUp={(e) => e.stopPropagation()}
    >
      <div
        className="settingsWindow"
        ref={windowRef}
        style={{
          top: position?.y ?? 16,
          left:
            position?.x ??
            "max(16px, calc((100vw - min(840px, calc(100vw - 32px))) / 2))",
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <header data-settings-window-drag-handle="true">
          <img src="/icon-settings.png" alt="" />
          <div className="heading">
            <h1 id="preferences-title">Settings</h1>
            <p>Fine-tune your library.</p>
          </div>
          <button
            className="version"
            type="button"
            aria-label="Show recent version notes"
            onClick={() => {
              choose("advanced");
              setVersionExpanded(true);
            }}
          >
            v{version}
          </button>
          <button
            className="close"
            type="button"
            aria-label="Close Settings"
            onClick={onClose}
          >
            ×
          </button>
        </header>
        <div className="layout">
          <nav aria-label="Settings categories">
            {categories.map((c) => (
              <button
                type="button"
                key={c.key}
                aria-pressed={c.key === category}
                onClick={() => choose(c.key)}
              >
                <span
                  className="categoryIcon"
                  style={{ color: c.accent }}
                  aria-hidden="true"
                >
                  {c.icon}
                </span>
                <span>{c.label}</span>
              </button>
            ))}
          </nav>
          <div className="content" ref={scroll}>
            <div className="contentHeading">
              <div>
                <h2>{active.label}</h2>
                <p>{active.description}</p>
              </div>
              {selected.length === 1 && selected[0].reset ? (
                <button
                  className="reset"
                  type="button"
                  onClick={selected[0].reset}
                  aria-label={`Reset ${active.label}`}
                >
                  Reset
                </button>
              ) : null}
            </div>
            {selected.map((section) =>
              category === "advanced" ? (
                <details key={section.title} className="advancedSection">
                  <summary>
                    {section.title}
                    <span aria-hidden="true">›</span>
                  </summary>
                  <div className="sectionHeading">
                    {section.reset ? (
                      <button
                        type="button"
                        className="reset"
                        onClick={section.reset}
                        aria-label={`Reset ${section.title}`}
                      >
                        Reset
                      </button>
                    ) : null}
                  </div>
                  <div className="group">{renderSection(section)}</div>
                </details>
              ) : (
                <section key={section.title}>
                  {selected.length > 1 ? (
                    <div className="sectionHeading">
                      <h3>{section.title}</h3>
                      {section.reset ? (
                        <button
                          type="button"
                          className="reset"
                          onClick={section.reset}
                          aria-label={`Reset ${section.title}`}
                        >
                          Reset
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                  <div className="group">{renderSection(section)}</div>
                </section>
              ),
            )}
            {category === "advanced" ? (
              <details
                className="advancedSection"
                open={versionExpanded || undefined}
              >
                <summary>
                  Recent updates<span aria-hidden="true">›</span>
                </summary>
                <div className="updates">
                  {notes.map((n) => (
                    <section key={n.version}>
                      <h3>
                        v{n.version} <small>{n.date}</small>
                      </h3>
                      <ul>
                        {n.notes.map((note) => (
                          <li key={note}>{note}</li>
                        ))}
                      </ul>
                    </section>
                  ))}
                </div>
              </details>
            ) : null}
          </div>
        </div>
        <footer>
          <span>Changes appear immediately in your library.</span>
          <button className="done" type="button" onClick={onClose}>
            Done
          </button>
        </footer>
      </div>
      <style jsx>{`
        .settingsDialog {
          --settings-ink: #202c3c;
          --settings-muted: #768394;
          --settings-line: rgba(64, 82, 108, 0.1);
          --settings-card: rgba(255, 255, 255, 0.95);
          --settings-soft: rgba(237, 241, 247, 0.65);
          --settings-accent: #2e79cf;
          position: fixed;
          inset: 0;
          margin: 0;
          width: 100vw;
          height: 100dvh;
          max-width: none;
          max-height: none;
          overflow: visible;
          border: 0;
          padding: 0;
          background: transparent;
          color: var(--settings-ink);
          font-family: inherit;
          pointer-events: none;
        }
        .dark {
          --settings-ink: #eff4fb;
          --settings-muted: #a7b3c4;
          --settings-line: rgba(255, 255, 255, 0.1);
          --settings-card: rgba(41, 48, 59, 0.88);
          --settings-soft: rgba(255, 255, 255, 0.06);
          --settings-accent: #8baff4;
        }
        .settingsWindow {
          position: fixed;
          display: flex;
          flex-direction: column;
          width: min(840px, calc(100vw - 32px));
          height: min(680px, calc(100dvh - 32px));
          border: 1px solid rgba(255, 255, 255, 0.5);
          border-radius: 28px;
          background: rgba(241, 243, 246, 0.94);
          box-shadow: 0 20px 65px #0003;
          overflow: hidden;
          pointer-events: auto;
          box-sizing: border-box;
        }
        .dark .settingsWindow {
          background: rgba(29, 34, 43, 0.9);
          border-color: var(--settings-line);
        }
        header {
          display: flex;
          align-items: center;
          gap: 17px;
          flex-shrink: 0;
          padding: 22px 24px 20px;
          cursor: grab;
          user-select: none;
          touch-action: none;
        }
        header > img {
          width: 60px;
          height: 60px;
          transform: scale(1.5);
          object-fit: contain;
          flex: none;
        }
        .heading {
          flex: 1;
          min-width: 0;
        }
        h1 {
          font-size: 29px;
          letter-spacing: -0.6px;
          line-height: 1.15;
          margin: 0 0 6px;
          font-weight: 700;
        }
        p {
          margin: 0;
          color: var(--settings-muted);
          font-size: 13px;
          line-height: 1.5;
        }
        button,
        select {
          font: inherit;
        }
        button {
          cursor: pointer;
          color: inherit;
        }
        .version {
          font-size: 11px;
          font-weight: 600;
          color: var(--settings-accent);
          background: rgba(139, 175, 244, 0.1);
          border: 1px solid rgba(139, 175, 244, 0.25);
          padding: 6px 11px;
          border-radius: 20px;
          min-height: 34px;
        }
        .close {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          border: 1px solid var(--settings-line);
          background: var(--settings-soft);
          font-size: 27px;
          line-height: 1;
          flex: none;
        }
        .layout {
          display: grid;
          grid-template-columns: 210px minmax(0, 1fr);
          gap: 0;
          flex: 1;
          min-height: 0;
          margin: 0 12px;
        }
        nav {
          padding: 14px 10px;
          background: rgba(238, 242, 248, 0.36);
          border: 1px solid var(--settings-line);
          border-radius: 21px;
          overflow: auto;
        }
        nav button {
          display: flex;
          align-items: center;
          gap: 12px;
          min-height: 54px;
          width: 100%;
          padding: 12px;
          border-radius: 14px;
          text-align: left;
          border: 0;
          background: transparent;
          font-size: 14px;
        }
        nav button:last-child {
          border-top: 1px solid var(--settings-line);
          border-radius: 0 0 14px 14px;
          margin-top: 12px;
          padding-top: 18px;
        }
        nav button[aria-pressed="true"] {
          background: rgba(139, 175, 244, 0.2);
          color: var(--settings-accent);
          font-weight: 600;
        }
        .categoryIcon {
          font-size: 24px;
          width: 28px;
          text-align: center;
          flex: none;
        }
        .content {
          min-width: 0;
          min-height: 0;
          overflow: auto;
          padding: 17px 16px 20px;
          overscroll-behavior: contain;
          scrollbar-width: thin;
        }
        .contentHeading {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          margin: 0 2px 18px;
        }
        h2 {
          font-size: 22px;
          letter-spacing: -0.3px;
          margin: 0 0 4px;
          font-weight: 650;
        }
        .reset {
          font-size: 12px;
          border: 1px solid rgba(139, 175, 244, 0.3);
          border-radius: 20px;
          background: rgba(139, 175, 244, 0.1);
          padding: 7px 13px;
          color: var(--settings-accent);
          min-height: 34px;
        }
        .group {
          background: var(--settings-card);
          border: 1px solid var(--settings-line);
          border-radius: 18px;
          overflow: hidden;
        }
        section + section {
          margin-top: 20px;
        }
        .sectionHeading {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
          margin: 12px 3px 8px;
        }
        .sectionHeading:empty {
          display: none;
        }
        .sectionHeading > .reset:first-child {
          margin-left: auto;
        }
        h3 {
          font-size: 13px;
          font-weight: 600;
          margin: 0;
        }
        .choice {
          display: flex;
          align-items: center;
          gap: 12px;
          justify-content: space-between;
          font-size: 13px;
          min-height: 64px;
          padding: 10px 16px;
          border-top: 1px solid var(--settings-line);
        }
        select {
          max-width: 65%;
          min-height: 42px;
          background: var(--settings-soft);
          border: 1px solid var(--settings-line);
          border-radius: 10px;
          padding: 7px 10px;
          color: var(--settings-ink);
        }
        option {
          background: var(--settings-card);
          color: var(--settings-ink);
        }
        .advancedSection {
          border: 1px solid var(--settings-line);
          border-radius: 16px;
          background: var(--settings-card);
          padding: 0 12px;
          margin-top: 12px;
        }
        .advancedSection:first-of-type {
          margin-top: 0;
        }
        .advancedSection summary {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
          cursor: pointer;
          list-style: none;
          min-height: 54px;
          font-size: 14px;
          font-weight: 600;
        }
        .advancedSection summary::-webkit-details-marker {
          display: none;
        }
        .advancedSection summary > span {
          font-size: 24px;
          color: var(--settings-muted);
        }
        .advancedSection[open] summary > span {
          transform: rotate(90deg);
        }
        .advancedSection > .group {
          margin-bottom: 12px;
          background: transparent;
          border: 0;
        }
        .updates {
          font-size: 12px;
          line-height: 1.6;
          padding-bottom: 14px;
        }
        .updates section {
          margin: 12px 0;
        }
        .updates small {
          font-size: 11px;
          color: var(--settings-muted);
          font-weight: 400;
        }
        .updates ul {
          padding-left: 18px;
        }
        footer {
          padding: 16px 24px 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          font-size: 12px;
          color: var(--settings-muted);
          flex: none;
        }
        .done {
          padding: 9px 21px;
          border-radius: 17px;
          min-height: 38px;
          background: #438ff1;
          color: #fff;
          border: 1px solid #3489ee;
          font-weight: 600;
          font-size: 13px;
        }
        button:focus-visible,
        select:focus-visible,
        summary:focus-visible {
          outline: 2px solid #3489ee;
          outline-offset: 3px;
        }
        @media (max-width: 820px) {
          .settingsWindow {
            width: calc(100vw - 32px);
            height: calc(100dvh - 32px);
            border-radius: 24px;
          }
          header {
            padding: 16px;
            gap: 10px;
          }
          header > img {
            width: 44px;
            height: 44px;
          }
          h1 {
            font-size: 24px;
          }
          header p {
            font-size: 12px;
          }
          .version {
            font-size: 10px;
            padding: 5px 7px;
          }
          .layout {
            display: flex;
            flex-direction: column;
            margin: 0 8px;
            gap: 0;
          }
          nav {
            display: flex;
            gap: 3px;
            overflow: auto;
            flex: none;
            padding: 6px;
            border-radius: 14px;
          }
          nav button {
            width: auto;
            min-height: 44px;
            padding: 8px 10px;
            font-size: 12px;
            gap: 7px;
            flex: none;
          }
          nav button:last-child {
            margin: 0;
            padding-top: 8px;
            border-top: 0;
            border-left: 1px solid var(--settings-line);
            border-radius: 12px;
          }
          .categoryIcon {
            font-size: 18px;
            width: 20px;
          }
          .content {
            padding: 18px 8px;
            flex: 1;
          }
          .contentHeading {
            margin-bottom: 14px;
          }
          h2 {
            font-size: 20px;
          }
          .reset {
            min-height: 44px;
          }
          footer {
            padding: 12px 16px;
            font-size: 11px;
          }
          .done {
            min-height: 44px;
          }
          .choice {
            font-size: 14px;
            flex-wrap: wrap;
          }
          select {
            font-size: 16px;
            max-width: 100%;
            min-width: 150px;
          }
        }
      `}</style>
    </dialog>,
    document.body,
  );
}
