"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type GameDetailsPageProps = {
  item: Record<string, unknown>;
  isMobileLayout: boolean;
  usePageBackground?: boolean;
  onBack: () => void;
  onEdit?: (item: Record<string, unknown>) => void;
  getDisplayCoverUrl: (item: Record<string, unknown>) => string;
  onPaletteChange?: (palette: { start: string; end: string } | null) => void;
};

type PaletteState = {
  start: string;
  end: string;
  text: string;
  mutedText: string;
  surface: string;
  surfaceBorder: string;
  chip: string;
};

const FALLBACK_PALETTE: PaletteState = {
  start: "#141a28",
  end: "#1e1530",
  text: "#f6f4f2",
  mutedText: "rgba(246, 244, 242, 0.70)",
  surface: "rgba(255, 255, 255, 0.09)",
  surfaceBorder: "rgba(255, 255, 255, 0.12)",
  chip: "rgba(255, 255, 255, 0.13)",
};

function clampChannel(v: number): number { return Math.max(0, Math.min(255, Math.round(v))); }
function safeStr(v: unknown): string { return String(v ?? "").trim(); }
function splitList(v: unknown): string[] { return safeStr(v).split(/[,|/]/g).map(p => p.trim()).filter(Boolean); }
function formatYear(v: unknown): string { const r = safeStr(v); const m = r.match(/\b((?:19|20)\d{2})\b/); return m ? m[1] : r; }
function formatRating(v: string): string { const n = parseFloat(v); return isFinite(n) ? n.toFixed(1) : v; }
function getStarVal(v: string): number { const n = parseFloat(v); return isFinite(n) ? Math.max(0, Math.min(5, n > 5 ? n / 2 : n)) : 0; }

function StarRating({ value, color }: { value: string; color: string }) {
  const r = getStarVal(value);
  return (
    <span style={{ display: "inline-flex", gap: 2, alignItems: "center" }}>
      {[0,1,2,3,4].map(i => {
        const fill = Math.max(0, Math.min(1, r - i));
        return (
          <span key={i} style={{ position: "relative", width: 13, height: 13, display: "inline-block" }}>
            <svg viewBox="0 0 24 24" width="13" height="13" aria-hidden style={{ display: "block", color: "rgba(255,255,255,0.2)" }}>
              <path fill="currentColor" d="M12 2.7l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.5l-5.8 3.1 1.1-6.5-4.7-4.6 6.5-.9L12 2.7z" />
            </svg>
            <span style={{ position: "absolute", inset: 0, width: `${fill*100}%`, overflow: "hidden" }}>
              <svg viewBox="0 0 24 24" width="13" height="13" aria-hidden style={{ display: "block", color }}>
                <path fill="currentColor" d="M12 2.7l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.5l-5.8 3.1 1.1-6.5-4.7-4.6 6.5-.9L12 2.7z" />
              </svg>
            </span>
          </span>
        );
      })}
    </span>
  );
}

function hexToRgb(hex: string) { const n = hex.replace("#",""); return { r: parseInt(n.slice(0,2),16), g: parseInt(n.slice(2,4),16), b: parseInt(n.slice(4,6),16) }; }
function rgba(hex: string, a: number) { const {r,g,b} = hexToRgb(hex); return `rgba(${r},${g},${b},${a})`; }
function rgbToHex(r: number, g: number, b: number) { const h=(c:number)=>clampChannel(c).toString(16).padStart(2,"0"); return `#${h(r)}${h(g)}${h(b)}`; }
function mixHex(a: string, b: string, w: number) { const ca=hexToRgb(a),cb=hexToRgb(b),t=Math.max(0,Math.min(1,w)); return rgbToHex(ca.r*(1-t)+cb.r*t, ca.g*(1-t)+cb.g*t, ca.b*(1-t)+cb.b*t); }
function getLum(hex: string) { const {r,g,b}=hexToRgb(hex); const l=(v:number)=>{const s=v/255;return s<=0.04045?s/12.92:((s+0.055)/1.055)**2.4;}; return 0.2126*l(r)+0.7152*l(g)+0.0722*l(b); }
function getTextColor(colors: string[]) { return colors.reduce((s,c)=>s+getLum(c),0)/colors.length > 0.46 ? "#18202b" : "#f6f4f2"; }

function buildPalette(start: string, end: string): PaletteState {
  const text = getTextColor([start, end]);
  const light = text === "#f6f4f2";
  return {
    start, end, text,
    mutedText: light ? "rgba(246,244,242,0.70)" : "rgba(24,32,43,0.70)",
    surface: light ? "rgba(255,255,255,0.09)" : "rgba(255,255,255,0.24)",
    surfaceBorder: light ? "rgba(255,255,255,0.12)" : "rgba(24,32,43,0.08)",
    chip: light ? "rgba(255,255,255,0.13)" : "rgba(255,255,255,0.32)",
  };
}

function isLocalUrl(url: string) {
  if (!url) return false;
  if (url.startsWith("/") || url.startsWith("./") || url.startsWith("data:") || url.startsWith("blob:")) return true;
  try { return new URL(url, window.location.href).origin === window.location.origin; } catch { return false; }
}

function proxied(url: string) { const n = safeStr(url); if (!n) return ""; return isLocalUrl(n) ? n : `/api/cover-proxy?src=${encodeURIComponent(n)}`; }

function tryExtract(url: string): Promise<PaletteState | null> {
  return new Promise(resolve => {
    if (!url || typeof window === "undefined") { resolve(null); return; }
    const img = new Image();
    img.crossOrigin = "anonymous"; img.decoding = "async";
    img.onload = () => {
      try {
        const c = document.createElement("canvas"); c.width = 64; c.height = 36;
        const ctx = c.getContext("2d", { willReadFrequently: true });
        if (!ctx) { resolve(null); return; }
        ctx.drawImage(img, 0, 0, 64, 36);
        const px = ctx.getImageData(0, 0, 64, 36).data;
        const buckets = new Map<string, {count:number;r:number;g:number;b:number;sat:number}>();
        for (let i = 0; i < px.length; i+=4) {
          if (px[i+3] < 200) continue;
          const r=px[i],g=px[i+1],b=px[i+2];
          const max=Math.max(r,g,b),min=Math.min(r,g,b),br=(r+g+b)/3,sat=max===0?0:(max-min)/max;
          if (br<10||br>250) continue;
          const key=`${Math.round(r/22)}-${Math.round(g/22)}-${Math.round(b/22)}`;
          const w=1+sat*4.5+(br>40&&br<220?0.6:0);
          const bk=buckets.get(key)??{count:0,r:0,g:0,b:0,sat:0};
          bk.count+=w;bk.r+=r*w;bk.g+=g*w;bk.b+=b*w;bk.sat+=sat*w;
          buckets.set(key,bk);
        }
        const cols = Array.from(buckets.values()).map(bk=>{const c=Math.max(bk.count,1);return {color:rgbToHex(bk.r/c,bk.g/c,bk.b/c),score:bk.count*(1+bk.sat/c)};}).sort((a,b)=>b.score-a.score);
        const first = cols[0]?.color ?? FALLBACK_PALETTE.start;
        const fr = hexToRgb(first);
        const second = cols.find(({color})=>{const c=hexToRgb(color);return Math.abs(c.r-fr.r)+Math.abs(c.g-fr.g)+Math.abs(c.b-fr.b)>70;})?.color ?? mixHex(first, getLum(first)>0.45?"#1a2840":"#8fa8c8", 0.26);
        const start = getLum(first)>0.58 ? mixHex(first,"#18273a",0.24) : mixHex(first,"#ffffff",0.02);
        const end = getLum(second)>0.58 ? mixHex(second,"#1e2e44",0.22) : mixHex(second,"#ffffff",0.02);
        resolve(buildPalette(start, end));
      } catch { resolve(null); }
    };
    img.onerror = () => resolve(null);
    img.src = proxied(url);
  });
}

async function extractPalette(backdropUrl: string, fallback: string): Promise<PaletteState> {
  if (backdropUrl) { const p = await tryExtract(backdropUrl); if (p) return p; }
  if (fallback) { const p = await tryExtract(fallback); if (p) return p; }
  return FALLBACK_PALETTE;
}

export function GameDetailsPage({ item, isMobileLayout, usePageBackground = false, onBack, onEdit, getDisplayCoverUrl, onPaletteChange }: GameDetailsPageProps) {
  const coverUrl = getDisplayCoverUrl(item);
  const backdropUrl = safeStr(item.backdropUrl);

  const cacheKey = useMemo(() => [safeStr(item.title), backdropUrl, coverUrl].join("|"), [item, backdropUrl, coverUrl]);
  const [ready, setReady] = useState(false);
  const [entry, setEntry] = useState<{key:string;palette:PaletteState}|null>(null);
  const palette = entry?.key === cacheKey ? entry.palette : FALLBACK_PALETTE;

  useEffect(() => {
    let cancelled = false;
    setReady(false);
    extractPalette(backdropUrl, coverUrl).then(p => {
      if (!cancelled) { setEntry({ key: cacheKey, palette: p }); setReady(true); }
    });
    return () => { cancelled = true; setReady(false); onPaletteChange?.(null); };
  }, [backdropUrl, coverUrl, cacheKey, onPaletteChange]);

  useEffect(() => {
    if (!ready) return;
    onPaletteChange?.({ start: palette.start, end: palette.end });
  }, [ready, palette.start, palette.end, onPaletteChange]);

  const title = safeStr(item.title || item.name) || "Untitled";
  const year = formatYear(item.releaseDate || item.releaseDateAlt);
  const platform = safeStr(item.platform);
  const platforms = safeStr(item.platforms);
  const platformDisplay = platform || platforms;
  const developer = safeStr(item.developer);
  const genres = splitList(item.genres || item.genre).slice(0, 3);
  const description = safeStr(item.description || item.overview);
  const myRating = safeStr(item.myRating || item.rating);
  const igdbRating = safeStr(item.igdbRating);
  const playStatus = safeStr(item.playStatus || item.gameStatus || item.status);
  const dateCompleted = safeStr(item.dateCompleted);
  const yearPlayed = safeStr(item.yearPlayed);
  const hoursPlayed = safeStr(item.hoursPlayed);
  const ownership = safeStr(item.ownership);
  const tags = splitList(item.tag || item.tags);

  const metaParts = [year, platformDisplay, developer, ...genres].filter(Boolean);
  const titleFontSize = isMobileLayout ? 26 : title.length > 44 ? 32 : title.length > 28 ? 38 : 44;

  const descriptionText = description || "No description available.";
  const descFontSize = isMobileLayout ? 13 : descriptionText.length > 900 ? 12 : descriptionText.length > 650 ? 13 : 14;

  const descViewport = useRef<HTMLDivElement>(null);
  const descContent = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const vp = descViewport.current, ct = descContent.current;
    if (!vp || !ct || typeof window === "undefined") return;
    let af=0, rt=0, lastT=0, offset=0, pause=Date.now()+1200;
    const speed = 0.018;
    const setOff = (o: number) => { offset=o; ct.style.transform=`translate3d(0,-${o}px,0)`; };
    const getMax = () => Math.max(0, ct.scrollHeight - vp.clientHeight);
    const step = (t: number) => {
      const max = getMax();
      if (max<=2) { setOff(0); lastT=0; af=requestAnimationFrame(step); return; }
      if (Date.now()>=pause) {
        if (!lastT) lastT=t;
        const next = offset+(t-lastT)*speed; lastT=t;
        if (next>=max) { setOff(max); pause=Date.now()+1600; lastT=0; clearTimeout(rt); rt=window.setTimeout(()=>{setOff(0);pause=Date.now()+900;},1600); }
        else setOff(next);
      }
      af=requestAnimationFrame(step);
    };
    setOff(0); af=requestAnimationFrame(step);
    return () => { cancelAnimationFrame(af); clearTimeout(rt); ct.style.transform=""; };
  }, [descriptionText, descFontSize]);

  const statusColor = (() => {
    const s = playStatus.toLowerCase();
    if (s==="completed"||s==="finished")
      return { background:"rgba(220,252,231,0.92)", border:"1px solid rgba(134,239,172,0.5)", color:"#166534" };
    if (s==="playing"||s==="started"||s==="in progress"||s==="currently playing")
      return { background:"rgba(254,249,195,0.92)", border:"1px solid rgba(253,224,71,0.5)", color:"#854d0e" };
    if (s==="abandoned"||s==="dropped")
      return { background:"rgba(255,237,213,0.92)", border:"1px solid rgba(255,186,116,0.5)", color:"#9a3412" };
    return { background:"rgba(255,255,255,0.88)", border:"1px solid rgba(255,255,255,0.4)", color:"#111" };
  })();

  const completedLabel = dateCompleted || yearPlayed;

  const detailFacts = [
    myRating ? { label: "MY RATING", value: formatRating(myRating), isStar: true } : null,
    igdbRating ? { label: "IGDB RATING", value: formatRating(igdbRating), isStar: true } : null,
    completedLabel ? { label: "DATE COMPLETED", value: completedLabel } : null,
    hoursPlayed ? { label: "HOURS PLAYED", value: hoursPlayed } : null,
    platformDisplay ? { label: "PLATFORM", value: platformDisplay } : null,
    developer ? { label: "DEVELOPER", value: developer } : null,
    year ? { label: "RELEASED", value: year } : null,
    ownership ? { label: "OWNERSHIP", value: ownership } : null,
    ...tags.map(t => ({ label: "TAG", value: t, isStar: false })),
  ].filter(Boolean) as { label: string; value: string; isStar?: boolean }[];

  const backdropH = isMobileLayout ? "48vw" : "52vh";

  return (
    <div
      style={{
        opacity: ready ? 1 : 0,
        transition: "opacity 260ms ease",
        minHeight: "100vh",
        background: usePageBackground ? "transparent" : `linear-gradient(160deg, ${mixHex(palette.start,"#06080f",0.08)} 0%, ${palette.start} 30%, ${mixHex(palette.end,palette.start,0.18)} 58%, ${palette.end} 100%)`,
        color: palette.text,
        position: "relative",
        overflow: "hidden auto",
      }}
    >
      {backdropUrl ? (
        <div aria-hidden style={{
          position: "fixed", inset: 0,
          backgroundImage: `url("${backdropUrl}")`,
          backgroundSize: "cover", backgroundPosition: "center top",
          opacity: 0.12, filter: "blur(52px) saturate(1.5) brightness(0.65)",
          transform: "scale(1.12)", zIndex: 0, pointerEvents: "none",
        }} />
      ) : null}

      <div style={{ position: "relative", zIndex: 1, maxWidth: 1600, margin: "0 auto" }}>

        {/* ── BACKDROP HERO ── */}
        <div style={{ position: "relative", width: "100%", height: backdropH, minHeight: isMobileLayout ? 160 : 280, maxHeight: isMobileLayout ? 320 : 520, overflow: "hidden" }}>
          {backdropUrl ? (
            <img
              src={backdropUrl}
              alt=""
              aria-hidden
              style={{ display: "block", width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 18%" }}
            />
          ) : (
            <div style={{ width: "100%", height: "100%", background: `linear-gradient(180deg, ${rgba(palette.start,0.6)} 0%, ${palette.start} 100%)` }} />
          )}

          <div aria-hidden style={{
            position: "absolute", inset: 0,
            background: `linear-gradient(to bottom,
              rgba(0,0,0,0) 0%,
              rgba(0,0,0,0) 50%,
              ${rgba(palette.start, 0.45)} 70%,
              ${rgba(palette.start, 0.88)} 85%,
              ${rgba(palette.start, 1.0)} 100%)`,
          }} />
          <div aria-hidden style={{
            position: "absolute", bottom: 0, left: 0, right: 0, height: "32%",
            backdropFilter: "blur(14px)",
            WebkitBackdropFilter: "blur(14px)",
            maskImage: "linear-gradient(to bottom, transparent 0%, black 60%)",
            WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, black 60%)",
          }} />

          {/* Back button */}
          <button
            type="button"
            onClick={onBack}
            style={{
              position: "absolute", top: 14, left: 16,
              width: 38, height: 38, borderRadius: "50%",
              border: "1px solid rgba(255,255,255,0.3)", background: "rgba(0,0,0,0.45)",
              color: "#fff", cursor: "pointer",
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              backdropFilter: "blur(8px)", zIndex: 3,
            }}
            aria-label="Back"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>

          {/* Edit + status chips */}
          <div style={{ position: "absolute", top: 14, right: 16, display: "flex", gap: 8, zIndex: 3 }}>
            {onEdit ? (
              <button
                type="button"
                onClick={() => onEdit(item)}
                style={{
                  borderRadius: 999, padding: "9px 14px", fontSize: 14, lineHeight: 1, fontWeight: 750,
                  border: "1px solid rgba(255,255,255,0.4)",
                  background: "rgba(255,255,255,0.88)",
                  color: "#111", cursor: "pointer", whiteSpace: "nowrap",
                  backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
                }}
              >Edit</button>
            ) : null}
            {playStatus ? (
              <span style={{
                borderRadius: 999, padding: "9px 13px", fontSize: 14, lineHeight: 1, fontWeight: 850,
                ...statusColor,
              }}>
                {playStatus.charAt(0).toUpperCase() + playStatus.slice(1)}
              </span>
            ) : null}
          </div>

          {/* Poster + title + meta */}
          <div style={{
            position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 2,
            padding: isMobileLayout ? "0 16px 18px" : "0 24px 22px",
            display: "flex", alignItems: "flex-end", gap: isMobileLayout ? 14 : 20,
          }}>
            {coverUrl ? (
              <img
                src={coverUrl}
                alt={title}
                style={{
                  display: "block",
                  width: isMobileLayout ? 144 : 200,
                  flexShrink: 0,
                  borderRadius: 8,
                  border: "2px solid rgba(255,255,255,0.18)",
                  filter: "drop-shadow(0 6px 18px rgba(0,0,0,0.6))",
                  marginBottom: isMobileLayout ? 0 : 4,
                }}
              />
            ) : null}
            <div style={{ minWidth: 0 }}>
              <h1 style={{
                margin: 0, fontSize: titleFontSize, lineHeight: 1.06, fontWeight: 860,
                letterSpacing: "-0.01em", color: "#fff",
                textShadow: "0 2px 12px rgba(0,0,0,0.5)",
              }}>
                {title}
              </h1>
              {metaParts.length > 0 ? (
                <div style={{
                  marginTop: 8, fontSize: isMobileLayout ? 13 : 15, fontWeight: 700,
                  color: "rgba(255,255,255,0.82)", letterSpacing: "0.01em",
                  textShadow: "0 1px 6px rgba(0,0,0,0.45)",
                }}>
                  {metaParts.join("  ·  ")}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {/* ── BODY ── */}
        <div style={{
          display: "grid",
          gridTemplateColumns: isMobileLayout ? "1fr" : "minmax(0,1fr) 220px",
          gap: 12,
          padding: isMobileLayout ? "12px 12px 24px" : "14px 16px 24px",
          alignItems: "stretch",
        }}>
          <div style={{
            overflow: "hidden",
            borderRadius: 18,
            padding: isMobileLayout ? "16px" : "18px 20px",
            background: `linear-gradient(180deg, ${palette.surface} 0%, ${rgba("#ffffff",0.03)} 100%)`,
            border: `1px solid ${palette.surfaceBorder}`,
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.07)",
            display: "flex",
            flexDirection: "column",
          }}>
            <div style={{ fontSize: 11, fontWeight: 860, letterSpacing: "0.08em", color: palette.mutedText, marginBottom: 10 }}>OVERVIEW</div>
            <div ref={descViewport} style={{ flex: "1 1 auto", minHeight: 0, overflow: "hidden" }}>
              <div ref={descContent} style={{ fontSize: descFontSize, lineHeight: 1.6, color: palette.text, willChange: "transform" }}>
                {descriptionText}
              </div>
            </div>
          </div>

          <div style={{
            overflow: "hidden",
            borderRadius: 18,
            padding: isMobileLayout ? "16px" : "18px 20px",
            background: `linear-gradient(180deg, ${palette.surface} 0%, ${rgba("#ffffff",0.03)} 100%)`,
            border: `1px solid ${palette.surfaceBorder}`,
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.07)",
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}>
            <div style={{ fontSize: 11, fontWeight: 860, letterSpacing: "0.08em", color: palette.mutedText }}>DETAILS</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
              {detailFacts.map((f, i) => (
                <div key={`${f.label}-${i}`} style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: palette.mutedText, letterSpacing: "0.05em" }}>{f.label}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: f.isStar ? 18 : 14, fontWeight: 860, color: palette.text, lineHeight: 1.2 }}>
                    <span>{f.value}</span>
                    {f.isStar ? <StarRating value={f.value} color={palette.text} /> : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
