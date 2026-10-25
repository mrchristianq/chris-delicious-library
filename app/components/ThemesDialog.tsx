"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

type Theme = "light" | "dark" | "classic" | "wood";
type GalleryTheme = "match" | "light" | "dark";
type Props = {
  theme: Theme;
  galleryTheme: GalleryTheme;
  showTitles: boolean;
  isMobileLayout: boolean;
  iconSrc: string;
  woodImage: string;
  covers: { title: string; url: string }[];
  onTheme: (theme: Theme) => void;
  onGalleryTheme: (theme: GalleryTheme) => void;
  onShowTitles: (visible: boolean) => void;
  onClose: () => void;
};

const choices: { key: Theme; label: string; description: string; background: string }[] = [
  { key: "light", label: "Light", description: "Bright and clean", background: "linear-gradient(#f6f5f3,#e9e8e4)" },
  { key: "dark", label: "Dark", description: "Deep slate shelves", background: "linear-gradient(#252b34,#14181d)" },
  { key: "classic", label: "Classic", description: "Warm, familiar tones", background: "linear-gradient(#8b6a44,#614528)" },
  { key: "wood", label: "Wood Shelf", description: "Natural honey-oak shelves", background: "#a47c46" },
];

export function ThemesDialog({ theme, galleryTheme, showTitles, isMobileLayout, iconSrc, woodImage, covers, onTheme, onGalleryTheme, onShowTitles, onClose }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflow = document.body.style.overflow;
    element?.showModal();
    document.body.style.overflow = "hidden";
    return () => { element?.close(); document.body.style.overflow = overflow; previous?.focus(); };
  }, []);
  const selected = choices.find(choice => choice.key === theme)!;
  const background = theme === "wood" ? `url("${woodImage}") center / cover` : selected.background;
  if (typeof document === "undefined") return null;
  return createPortal(<dialog ref={dialog} className={`themesDialog ${theme === "dark" ? "dark" : ""}`} aria-labelledby="themes-title" onCancel={event => { event.preventDefault(); onClose(); }} onKeyDown={event => event.stopPropagation()} onKeyUp={event => event.stopPropagation()}>
    <div className="navigation"><button type="button" aria-label="Back to library" onClick={onClose}>‹</button><button type="button" aria-label="Close Themes" onClick={onClose}>×</button></div>
    <header><img className="heroIcon" src={iconSrc} alt="" /><div><h1 id="themes-title">Themes</h1><p>Make your library feel like yours.</p></div></header>

    <section aria-labelledby="shelf-theme-label">
      <h2 id="shelf-theme-label">Library appearance</h2>
      <div className="themeOptions" role="group" aria-label="Shelf theme">
        {choices.filter(choice => !isMobileLayout || choice.key !== "wood" || theme === "wood").map(choice => <button type="button" key={choice.key} className={`themeChoice ${choice.key === theme ? "selected" : ""}`} aria-pressed={choice.key === theme} onClick={() => onTheme(choice.key)}>
          <span className="swatch" style={{ background: choice.key === "wood" ? `url("${woodImage}") center / cover` : choice.background }} aria-hidden="true"><span /><span /><span /></span>
          <span className="choiceLabel">{choice.label}<span className="check" aria-hidden="true">{choice.key === theme ? "✓" : ""}</span></span>
          <small>{choice.description}</small>
        </button>)}
      </div>
      <div className={`preview ${theme}`} style={{ background }} aria-label={`${selected.label} library preview`}>
        <span className="previewLabel">YOUR LIBRARY · {selected.label.toUpperCase()}</span>
        <div className="covers">{covers.length ? covers.slice(0, 4).map((cover, i) => <div className="sample" key={`${cover.title}-${i}`}><img src={cover.url} alt={cover.title} />{showTitles ? <span>{cover.title}</span> : null}</div>) : <p>Add a few items to see your covers here.</p>}</div>
      </div>
    </section>

    <section aria-labelledby="cover-labels-title"><h2 id="cover-labels-title">Cover labels</h2><div className="group"><button className="settingRow" type="button" role="switch" aria-checked={showTitles} onClick={() => onShowTitles(!showTitles)}><span className="settingIcon green" aria-hidden="true">Aa</span><span className="rowCopy"><strong>Show titles</strong><small>Display names underneath your covers.</small></span><span className={`toggle ${showTitles ? "on" : ""}`} aria-hidden="true"><span /></span></button></div></section>

    <section aria-labelledby="gallery-theme-title"><h2 id="gallery-theme-title">Completed Gallery</h2><div className="group"><div className="settingRow"><span className="settingIcon blue" aria-hidden="true">◐</span><span className="rowCopy"><strong>Gallery appearance</strong><small>Choose its own spotlight background.</small></span></div><div className="segments" role="group" aria-label="Completed Gallery theme">{([{ key: "match", label: "Match Library" }, { key: "light", label: "Light" }, { key: "dark", label: "Dark" }] as const).map(choice => <button type="button" key={choice.key} aria-pressed={galleryTheme === choice.key} onClick={() => onGalleryTheme(choice.key)}>{choice.label}</button>)}</div></div><p className="hint">Your Gallery can stay dark even with a light library.</p></section>
    <style jsx>{`
      .themesDialog{--bg:#f1f2f4;--surface:#fff;--text:#202936;--muted:#748094;--line:rgba(40,50,70,.08);position:fixed;inset:0;margin:auto;width:min(780px,calc(100vw - 48px));max-width:none;max-height:calc(100dvh - 64px);overflow:auto;overscroll-behavior:contain;padding:24px 32px 32px;border:1px solid var(--line);border-radius:28px;background:var(--bg);color:var(--text);box-shadow:0 28px 100px #0004;box-sizing:border-box}
      .dark{--bg:#20242c;--surface:#2b303a;--text:#f4f6fa;--muted:#a4aebb;--line:rgba(255,255,255,.08)}
      button{font:inherit;color:inherit;cursor:pointer}button:focus-visible{outline:3px solid #3492ff;outline-offset:3px}.navigation{display:flex;justify-content:space-between;margin-bottom:22px}.navigation button{width:44px;height:44px;border-radius:50%;border:1px solid var(--line);background:var(--surface);font-size:28px;line-height:1}
      header{display:flex;align-items:center;gap:14px;margin-bottom:26px}.heroIcon{width:72px;height:72px;object-fit:contain;flex:none}h1{font-size:28px;line-height:1.2;letter-spacing:-.025em;font-weight:750;margin:0}p{font-size:13px;line-height:1.5;color:var(--muted);margin:8px 0 0}section+section{margin-top:24px}h2{font-size:13px;font-weight:600;color:var(--muted);margin:0 0 10px 4px}small{display:block;font-size:12px;line-height:1.4;color:var(--muted)}
      .themeOptions{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}.themeChoice{min-width:0;padding:10px;border:2px solid transparent;border-radius:17px;background:var(--surface);text-align:left}.themeChoice.selected{border-color:#3492ff}.swatch{height:62px;display:flex;align-items:flex-end;justify-content:center;gap:5px;border-radius:10px;padding:10px;box-shadow:inset 0 0 0 1px #0001}.swatch>span{display:block;width:18px;height:33px;border-radius:2px;background:#b2c5da;box-shadow:2px 3px 4px #0004}.swatch>span:nth-child(2){height:40px;background:#d8a974}.swatch>span:nth-child(3){background:#889779}.choiceLabel{display:flex;justify-content:space-between;align-items:center;font-size:13px;font-weight:650;margin:9px 0 3px}.check{color:#3492ff}.themeChoice small{font-size:10px}
      .preview{border-radius:18px;padding:14px 18px 18px;margin-top:14px;overflow:hidden}.previewLabel{display:block;font-size:10px;font-weight:650;letter-spacing:.08em;opacity:.65;color:#243044;margin-bottom:14px}.preview.dark .previewLabel,.preview.classic .previewLabel,.preview.wood .previewLabel{color:#fff}.covers{display:flex;justify-content:center;align-items:flex-start;gap:22px;min-height:120px}.sample{min-width:0;flex:0 1 100px;text-align:center}.sample img{height:112px;max-width:100%;width:auto;object-fit:contain;border-radius:4px;display:block;margin:auto;box-shadow:3px 5px 9px #0004}.sample>span{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;font-size:10px;line-height:1.3;margin-top:8px;color:#243044}.preview.dark .sample>span,.preview.classic .sample>span,.preview.wood .sample>span{color:#fff}
      .group{border-radius:20px;background:var(--surface);overflow:hidden}.settingRow{display:flex;align-items:center;gap:14px;padding:18px 20px;width:100%;border:0;background:transparent;text-align:left;min-height:80px}.settingIcon{display:grid;place-items:center;flex:none;width:42px;height:42px;border-radius:12px;font-size:22px}.green{color:#52a26b;background:#52a26b12}.blue{color:#3492ff;background:#3492ff12}.rowCopy{flex:1;min-width:0}.rowCopy strong{display:block;font-size:14px;font-weight:650;margin-bottom:4px}.toggle{width:46px;height:28px;border-radius:20px;background:#a2a8b2;display:flex;align-items:center;padding:3px;flex:none}.toggle>span{width:22px;height:22px;border-radius:50%;background:#fff;box-shadow:0 1px 3px #0003}.toggle.on{background:#41b65c}.toggle.on>span{margin-left:auto}.segments{display:flex;background:var(--bg);border-radius:12px;padding:4px;margin:0 20px 18px;gap:4px}.segments button{flex:1;min-height:40px;border:0;border-radius:9px;font-size:12px;background:transparent}.segments button[aria-pressed=true]{background:var(--surface);color:#3492ff;box-shadow:0 1px 4px #0001;font-weight:650}.hint{font-size:12px;margin-left:4px}
      @media(max-width:600px){.themesDialog{width:calc(100vw - 16px);max-height:calc(100dvh - 16px);padding:16px 18px calc(22px + env(safe-area-inset-bottom));border-radius:24px}.heroIcon{width:64px;height:64px}h1{font-size:25px}.themeOptions{grid-template-columns:repeat(2,minmax(0,1fr))}.themeChoice small{font-size:11px}.covers{gap:12px}.sample img{height:90px}.sample{flex-basis:70px}.settingRow{padding:16px;gap:10px}.segments{margin:0 16px 16px}.preview{padding:14px}.rowCopy strong{font-size:13px}.rowCopy small{font-size:11px}}
    `}</style>
  </dialog>, document.body);
}
