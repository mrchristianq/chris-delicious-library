"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";

type ColumnControl = {
  key: string;
  label: string;
  checked: boolean;
  required: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onToggle: () => void;
  onMove: (direction: -1 | 1) => void;
};

type Props = {
  isDark: boolean;
  sortField: string;
  sortOptions: ReactNode;
  sortOrder: "Asc" | "Desc";
  manualOrder: boolean;
  onSortField: (field: string) => void;
  onSortOrder: (order: "Asc" | "Desc") => void;
  listSize?: number;
  onListSize: (size: number) => void;
  columns: ColumnControl[];
  onResetColumns: () => void;
  onClose: () => void;
};

export function SortDialog({ isDark, sortField, sortOptions, sortOrder, manualOrder, onSortField, onSortOrder, listSize, onListSize, columns, onResetColumns, onClose }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflow = document.body.style.overflow;
    element?.showModal();
    document.body.style.overflow = "hidden";
    return () => { element?.close(); document.body.style.overflow = overflow; previous?.focus(); };
  }, []);
  if (typeof document === "undefined") return null;
  return createPortal(<dialog ref={dialog} className={`sortDialog ${isDark ? "dark" : ""}`} aria-labelledby="sort-dialog-title" onCancel={event => { event.preventDefault(); onClose(); }} onKeyDown={event => event.stopPropagation()} onKeyUp={event => event.stopPropagation()}>
    <header>
      <span className="heroIcon" aria-hidden="true"><svg viewBox="0 0 32 32" fill="none"><path d="M5 8h22M5 16h22M5 24h22" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" /><rect x="10" y="4" width="5" height="8" rx="2" /><rect x="20" y="12" width="5" height="8" rx="2" /><rect x="8" y="20" width="5" height="8" rx="2" /></svg></span>
      <h1 id="sort-dialog-title">Sort &amp; Display</h1>
      <button className="closeButton" type="button" aria-label="Close Sort" onClick={onClose}>×</button>
    </header>
    <section aria-label="Sorting"><div className="group">
      <label className="settingRow sortField"><span>Sort by</span><select value={sortField} onChange={event => onSortField(event.target.value)}>{sortOptions}</select><span className="chevron" aria-hidden="true">⌄</span></label>
      <div className="orderRow"><div className="segments" role="group" aria-label="Sort order"><button type="button" disabled={manualOrder} aria-pressed={!manualOrder && sortOrder === "Asc"} onClick={() => onSortOrder("Asc")}>↑ Ascending</button><button type="button" disabled={manualOrder} aria-pressed={!manualOrder && sortOrder === "Desc"} onClick={() => onSortOrder("Desc")}>↓ Descending</button></div>{manualOrder ? <small>Drag your covers to set their order.</small> : null}</div>
    </div></section>
    {listSize !== undefined ? <>
      <section aria-labelledby="list-size-title"><div className="sectionHeading"><h2 id="list-size-title">List size</h2><button className="reset" type="button" onClick={() => onListSize(100)} aria-label="Reset list size">Reset</button></div><div className="group sizeGroup"><div className="sizeHeader"><span>Text &amp; rows</span><output htmlFor="sort-list-size">{listSize}%</output></div><div className="sizeControls"><button className="step" type="button" aria-label="Decrease list size" disabled={listSize <= 70} onClick={() => onListSize(Math.max(70, listSize - 5))}>−</button><input id="sort-list-size" aria-label="List size" type="range" min="70" max="150" step="5" value={listSize} onChange={event => onListSize(Number(event.target.value))} /><button className="step" type="button" aria-label="Increase list size" disabled={listSize >= 150} onClick={() => onListSize(Math.min(150, listSize + 5))}>+</button></div></div></section>
      <section aria-label="List columns"><details className="group columnGroup"><summary><span><strong>Columns</strong><small>{columns.filter(column => column.checked).length} visible · choose and arrange</small></span><span className="disclosure" aria-hidden="true">›</span></summary><div className="columns"><div className="columnIntro"><small>Title always stays visible.</small><button className="reset" type="button" onClick={onResetColumns} aria-label="Reset columns">Reset</button></div>{columns.map(column => <div className="columnRow" key={column.key}><label><input type="checkbox" checked={column.checked} disabled={column.required} onChange={column.onToggle} /><span>{column.label}</span></label><button type="button" className="move" aria-label={`Move ${column.label} up`} disabled={!column.canMoveUp} onClick={() => column.onMove(-1)}>↑</button><button type="button" className="move" aria-label={`Move ${column.label} down`} disabled={!column.canMoveDown} onClick={() => column.onMove(1)}>↓</button></div>)}</div></details></section>
    </> : null}
    <style jsx>{`
      .sortDialog{--bg:#f1f2f4;--surface:#fff;--text:#202936;--muted:#748094;--line:rgba(40,50,70,.08);position:fixed;inset:0;margin:auto;width:min(620px,calc(100vw - 48px));max-width:none;max-height:calc(100dvh - 64px);overflow:auto;overscroll-behavior:contain;padding:24px 32px 28px;border:1px solid var(--line);border-radius:28px;background:var(--bg);color:var(--text);box-shadow:0 28px 100px #0004;box-sizing:border-box}
      .dark{--bg:#20242c;--surface:#2b303a;--text:#f4f6fa;--muted:#a4aebb;--line:rgba(255,255,255,.08)}button,select,input{font:inherit;color:inherit}button{cursor:pointer}button:disabled{opacity:.35;cursor:default}button:focus-visible,select:focus-visible,input:focus-visible,summary:focus-visible{outline:3px solid #3492ff;outline-offset:3px}.navigation{display:flex;justify-content:space-between;margin-bottom:22px}.navigation button{width:44px;height:44px;border-radius:50%;border:1px solid var(--line);background:var(--surface);font-size:28px;line-height:1}
      header{display:flex;align-items:center;gap:16px;margin-bottom:26px}.heroIcon{display:grid;place-items:center;width:64px;height:64px;background:#3492ff14;color:#3492ff;border-radius:20px;flex:none}.heroIcon svg{width:38px;height:38px}.heroIcon rect{fill:var(--surface);stroke:currentColor;stroke-width:2.3}h1{font-size:28px;line-height:1.2;letter-spacing:-.025em;font-weight:750;margin:0}p{font-size:13px;line-height:1.5;color:var(--muted);margin:8px 0 0}h2{font-size:13px;font-weight:600;color:var(--muted);margin:0 0 10px 4px}small{display:block;font-size:12px;line-height:1.4;color:var(--muted)}section+section{margin-top:22px}.group{border-radius:20px;background:var(--surface);overflow:hidden}.settingRow{position:relative;display:flex;align-items:center;justify-content:space-between;gap:18px;padding:14px 20px;min-height:64px;font-size:14px}.sortField>span:first-child{pointer-events:none;position:relative;z-index:1}.sortField select{position:absolute;inset:0;width:100%;appearance:none;-webkit-appearance:none;text-align:right;background:transparent;padding:14px 46px 14px 104px;border:0;font-weight:600;font-size:14px;color:var(--text);cursor:pointer}.sortField option{background:var(--surface);color:var(--text)}.chevron{position:absolute;right:20px;pointer-events:none;color:var(--muted)}.orderRow{border-top:1px solid var(--line);padding:16px 20px}.rowTitle{font-size:14px}.segments{display:flex;background:var(--bg);padding:4px;border-radius:12px;gap:4px;margin-top:12px}.segments button{flex:1;min-height:44px;border:0;border-radius:9px;font-size:13px;background:transparent;white-space:nowrap}.segments button[aria-pressed=true]{background:var(--surface);color:#3492ff;box-shadow:0 1px 4px #0001;font-weight:650}.orderRow small{margin-top:10px}.sectionHeading{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px}.sectionHeading h2{margin-bottom:0}.reset{min-width:54px;min-height:36px;padding:4px 8px;background:transparent;color:#3492ff;border:0;font-size:12px;font-weight:600;border-radius:8px}.sizeGroup{padding:16px 20px}.sizeHeader{display:flex;align-items:center;justify-content:space-between;font-size:14px}.sizeHeader output{color:#3492ff;font-weight:650;font-variant-numeric:tabular-nums}.sizeControls{display:flex;align-items:center;gap:14px;margin-top:10px}.step,.move{display:grid;place-items:center;width:44px;height:44px;flex:none;border:1px solid var(--line);border-radius:12px;background:var(--bg);font-size:22px}.sizeControls input{appearance:none;-webkit-appearance:none;width:100%;min-width:0;height:44px;background:transparent;cursor:pointer}.sizeControls input::-webkit-slider-runnable-track{height:6px;border-radius:8px;background:#cadbf7}.sizeControls input::-webkit-slider-thumb{appearance:none;-webkit-appearance:none;width:24px;height:24px;margin-top:-9px;border:0;border-radius:50%;background:#3492ff;box-shadow:0 2px 5px #0003}.sizeControls input::-moz-range-track{height:6px;border-radius:8px;background:#cadbf7}.sizeControls input::-moz-range-thumb{width:24px;height:24px;border:0;border-radius:50%;background:#3492ff;box-shadow:0 2px 5px #0003}.columnGroup summary{display:flex;justify-content:space-between;align-items:center;gap:12px;min-height:80px;padding:18px 20px;cursor:pointer;list-style:none}.columnGroup summary::-webkit-details-marker{display:none}.columnGroup strong{display:block;font-size:14px;font-weight:650;margin-bottom:4px}.disclosure{font-size:26px;color:var(--muted)}details[open] .disclosure{transform:rotate(90deg)}.columns{padding:0 20px 12px}.columnIntro{display:flex;justify-content:space-between;align-items:center;border-top:1px solid var(--line);padding-top:8px}.columnRow{display:flex;align-items:center;gap:8px;min-height:60px;border-top:1px solid var(--line)}.columnRow label{display:flex;align-items:center;gap:12px;flex:1;min-width:0;min-height:52px;cursor:pointer;font-size:14px}.columnRow input{width:20px;height:20px;flex:none;accent-color:#3492ff}.columnRow label>span{overflow-wrap:anywhere}.move{font-size:19px;background:transparent;width:44px;height:44px;border:0}.hint{margin:18px 4px 0;font-size:12px}
      @media(max-width:600px){.sortDialog{width:calc(100vw - 16px);max-height:calc(100dvh - 16px);padding:16px 18px calc(22px + env(safe-area-inset-bottom));border-radius:24px}h1{font-size:25px}.heroIcon{width:60px;height:60px}.settingRow{padding-left:16px;padding-right:16px}.sortField select{font-size:16px}.orderRow,.sizeGroup{padding:16px}.segments button{font-size:12px}.columns{padding-left:16px;padding-right:16px}.columnGroup summary{padding:16px}.sizeControls{gap:10px}}
      .sortDialog{inset:calc(env(safe-area-inset-top,0px) + 72px) 20px auto auto;margin:0;width:min(360px,calc(100vw - 32px));max-height:calc(100dvh - 96px);padding:16px;border-radius:22px;box-shadow:0 12px 40px #0003}
      header{gap:10px;margin-bottom:16px}.heroIcon{width:38px;height:38px;border-radius:12px}.heroIcon svg{width:26px;height:26px}h1{font-size:19px;flex:1}.closeButton{width:44px;height:44px;padding:0;flex:none;border-radius:50%;border:1px solid var(--line);background:var(--surface);font-size:25px;line-height:1}
      section+section{margin-top:14px}.group{border-radius:16px}.settingRow{min-height:56px;padding:10px 14px;font-size:13px}.sortField select{padding:10px 32px 10px 78px;font-size:13px}.chevron{right:14px}.orderRow{padding:10px}.segments{margin-top:0}.segments button{font-size:12px}.sectionHeading{margin-bottom:4px}h2{font-size:12px}.sizeGroup{padding:12px 14px}.sizeHeader{font-size:13px}.sizeControls{gap:10px;margin-top:6px}.columnGroup summary{min-height:64px;padding:12px 14px}.columnGroup strong{font-size:13px}.columnGroup small{font-size:11px}.columns{padding:0 14px 8px}.columnRow{gap:4px}.columnRow label{font-size:13px;gap:8px}
      @media(max-width:600px){.sortDialog{top:auto;right:12px;bottom:calc(env(safe-area-inset-bottom,0px) + 12px);width:min(340px,calc(100vw - 24px));max-height:65dvh;padding:14px}.sortField select{font-size:16px}h1{font-size:18px}}
    `}</style>
  </dialog>, document.body);
}
