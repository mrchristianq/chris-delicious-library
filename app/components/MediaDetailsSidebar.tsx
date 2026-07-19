"use client";

import {
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  useMemo,
} from "react";
import { COVER_IMAGE_RADIUS_STYLE } from "./coverStyles";

type MediaType = "book" | "movie" | "tv" | "game";
type SaveState = "idle" | "saving" | "saved" | "error";
type DetailFact = { label: string; value: string };
type RatingGaugeValue = { label: string; value: string; scale: 5 | 100 };

type MediaDetailsSidebarProps = {
  item: any;
  mediaType: MediaType;
  coverUrl: string;
  width: number;
  isMobile: boolean;
  isDark: boolean;
  accentColor: string;
  statusOptions: string[];
  relatedItems: any[];
  saveState: SaveState;
  saveError?: string;
  getCoverUrl: (item: any) => string;
  onClose: () => void;
  onOpenFull: (item: any) => void;
  onEdit: (item: any) => void;
  onRate: (item: any) => void;
  onDelete: (item: any) => void | Promise<void>;
  onStatusChange: (item: any, status: string) => void;
  onSelectRelated: (item: any) => void;
  onResizeStart?: (event: ReactPointerEvent<HTMLButtonElement>) => void;
};

const text = (value: unknown) => (value ?? "").toString().trim();

function first(item: any, keys: string[]): string {
  for (const key of keys) {
    const value = text(item?.[key]);
    if (value) return value;
  }
  return "";
}

function splitList(value: string): string[] {
  return value
    .split(/\s*\|\s*|\s*,\s*/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function mediaLabel(mediaType: MediaType): string {
  if (mediaType === "tv") return "TV Show";
  return `${mediaType.slice(0, 1).toUpperCase()}${mediaType.slice(1)}`;
}

function getStatus(item: any, mediaType: MediaType): string {
  if (mediaType === "movie" || mediaType === "tv") {
    return first(item, ["watchStatus", "Watch Status", "WatchStatus", "watched", "Watched"]);
  }
  return first(item, ["status", "Status", "gameStatus", "playStatus"]);
}

function formatCurrency(value: string): string {
  const parsed = Number(value.replace(/[$,\s]/g, ""));
  if (!Number.isFinite(parsed) || parsed <= 0) return value;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(parsed);
}

function formatHours(value: string): string {
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return value;
  return `${Math.ceil(parsed)} Hours`;
}

function getDetailFacts(item: any, mediaType: MediaType): DetailFact[] {
  const entries: Array<DetailFact | null> =
    mediaType === "movie"
      ? [
          { label: "Director", value: first(item, ["director", "Director"]) },
          { label: "Release Date", value: first(item, ["releaseDate", "ReleaseDate", "Release Date"]) },
          { label: "Watched Date", value: first(item, ["watchDate", "WatchDate", "Watch Date", "Date Watched"]) },
          { label: "Runtime", value: first(item, ["runtime", "Runtime"]) },
          {
            label: "Revenue",
            value: formatCurrency(first(item, ["revenue", "Revenue"])),
          },
          { label: "Ownership", value: first(item, ["ownership", "Ownership"]) },
        ]
      : mediaType === "tv"
        ? [
            { label: "Creator", value: first(item, ["creator", "Creator", "CreatedBy"]) },
            { label: "Network", value: first(item, ["networks", "Networks"]) },
            { label: "Show Status", value: first(item, ["showStatus", "Status"]) },
            { label: "First Air Date", value: first(item, ["firstAirDate", "FirstAirDate", "First Air Date"]) },
            { label: "Last Air Date", value: first(item, ["lastAirDate", "LastAirDate", "Last Air Date"]) },
            { label: "Seasons", value: first(item, ["numberOfSeasons", "NumberOfSeasons", "Seasons"]) },
            { label: "Episodes", value: first(item, ["numberOfEpisodes", "NumberOfEpisodes", "Episodes"]) },
            { label: "Completed Date", value: first(item, ["dateCompleted", "CompletedDate", "Completed Date"]) },
          ]
        : mediaType === "game"
          ? [
              { label: "Platform", value: first(item, ["__renderPlatform", "platform", "Platform"]) },
              {
                label: "Time to Beat",
                value: formatHours(first(item, ["timeToBeat", "TimeToBeat", "Time To Beat"])),
              },
              { label: "Release Date", value: first(item, ["releaseDate", "ReleaseDate"]) },
              { label: "Completed Date", value: first(item, ["dateCompleted", "Completed Date", "Date Completed"]) },
              { label: "Developer", value: first(item, ["developer", "Developer"]) },
              { label: "Ownership", value: first(item, ["ownership", "Ownership"]) },
              { label: "Hours Played", value: first(item, ["hoursPlayed", "Hours Played"]) },
            ]
          : [
              { label: "Author", value: first(item, ["author", "Author"]) },
              { label: "Narrator", value: first(item, ["narrator", "Narrator"]) },
              { label: "Format", value: first(item, ["types", "type", "Type"]) },
              { label: "Series", value: first(item, ["series", "Series"]) },
              { label: "Release Date", value: first(item, ["releaseDate", "ReleaseDate", "Release Date"]) },
              { label: "Completed Date", value: first(item, ["completedDate", "CompletedDate", "Completed Date"]) },
              { label: "Pages", value: first(item, ["pages", "Pages"]) },
              { label: "Duration", value: first(item, ["audiobookDuration", "AudiobookDuration"]) },
              { label: "Publisher", value: first(item, ["publisher", "Publisher"]) },
            ];

  return entries.filter((entry): entry is DetailFact => Boolean(entry?.value)).slice(0, 8);
}

function getRatingGauges(item: any, mediaType: MediaType): RatingGaugeValue[] {
  const mine = first(item, ["myRating", "My Rating", "MyRating"]);
  const ratings: RatingGaugeValue[] = [];
  if (mediaType === "book") {
    const user = first(item, [
      "userRating",
      "UserRating",
      "externalAverageRating",
      "ExternalAverageRating",
    ]);
    if (user) ratings.push({ label: "User Rating", value: user, scale: 5 });
    if (mine) ratings.push({ label: "My Rating", value: mine, scale: 5 });
    return ratings;
  }
  const provider =
    mediaType === "game"
      ? first(item, ["igdbRating", "IGDB Rating", "rating", "Rating"])
      : first(item, ["tmdbRating", "TMDB_Rating", "TMDB Rating"]);
  if (provider) ratings.push({ label: mediaType === "game" ? "IGDB Rating" : "User Rating", value: provider, scale: 100 });
  if (mine) ratings.push({ label: "My Rating", value: mine, scale: 100 });
  return ratings;
}

function getFacts(item: any, mediaType: MediaType): string[] {
  if (mediaType === "book") {
    return [
      first(item, ["author", "Author"]),
      first(item, ["types", "type", "Type"]),
      first(item, ["releaseDate", "ReleaseDate"]),
    ].filter(Boolean);
  }
  if (mediaType === "game") {
    return [
      first(item, ["year", "releaseDate", "ReleaseDate"]),
      first(item, ["__renderPlatform", "platform", "Platform"]),
      first(item, ["developer", "Developer"]),
    ].filter(Boolean);
  }
  return [
    first(item, ["year", "Year", "firstAirDate", "FirstAirDate", "releaseDate", "ReleaseDate"]),
    first(item, ["runtime", "Runtime", "episodeRuntime", "averageEpisodeRuntime"]),
    first(item, ["ownership", "Ownership", "networks", "Networks"]),
  ].filter(Boolean);
}

function ratingVisuals(pct: number, isMine: boolean, isDark: boolean) {
  const strength = Math.max(0, Math.min(1, pct / 100));
  if (isMine) {
    const hue = 83 + strength * 38;
    const saturation = 54 + strength * 10;
    const lightness = 49 - strength * 8;
    return {
      color: `hsl(${hue + 10} ${saturation + 4}% ${Math.max(32, lightness - 8)}%)`,
      colorEnd: `hsl(${hue} ${Math.max(48, saturation - 7)}% ${Math.min(64, lightness + 11)}%)`,
      trackColor: isDark
        ? `hsla(${hue}, ${saturation}%, 64%, 0.2)`
        : `hsla(${hue}, ${saturation}%, 68%, 0.3)`,
      background: isDark
        ? `linear-gradient(110deg, hsla(${hue}, ${saturation}%, 48%, ${0.17 + strength * 0.08}), hsla(${hue + 18}, ${saturation}%, 42%, ${0.08 + strength * 0.05}))`
        : `linear-gradient(110deg, hsla(${hue}, ${saturation}%, 76%, ${0.32 + strength * 0.12}), hsla(${hue + 18}, ${saturation}%, 83%, ${0.16 + strength * 0.08}))`,
    };
  }

  const hue = 23 + strength * 17;
  const saturation = 78 + strength * 8;
  const lightness = 55 - strength * 7;
  return {
    color: `hsl(${hue} ${saturation}% ${Math.max(38, lightness - 8)}%)`,
    colorEnd: `hsl(${hue + 12} ${Math.max(68, saturation - 10)}% ${Math.min(66, lightness + 12)}%)`,
    trackColor: isDark
      ? `hsla(${hue + 8}, ${saturation}%, 66%, 0.2)`
      : `hsla(${hue + 8}, ${saturation}%, 72%, 0.3)`,
    background: isDark
      ? `linear-gradient(110deg, hsla(${hue}, ${saturation}%, 50%, ${0.17 + strength * 0.08}), hsla(${hue + 18}, ${saturation}%, 44%, ${0.08 + strength * 0.05}))`
      : `linear-gradient(110deg, hsla(${hue}, ${saturation}%, 78%, ${0.34 + strength * 0.12}), hsla(${hue + 18}, ${saturation}%, 85%, ${0.16 + strength * 0.08}))`,
  };
}

function RatingGauge({
  rating,
  isDark,
  mutedText,
  index,
}: {
  rating: RatingGaugeValue;
  isDark: boolean;
  mutedText: string;
  index: number;
}) {
  const parsed = Number.parseFloat(rating.value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  const normalized = rating.scale === 5
    ? Math.min(5, parsed > 5 ? parsed / 2 : parsed)
    : Math.min(100, parsed > 10 ? parsed : parsed * 10);
  const pct = rating.scale === 5 ? (normalized / 5) * 100 : normalized;
  const displayValue = rating.scale === 5 ? normalized.toFixed(1) : `${Math.round(normalized)}%`;
  const size = 46;
  const radius = 18;
  const stroke = 3.25;
  const circumference = 2 * Math.PI * radius;
  const dash = (pct / 100) * circumference;
  const isMine = rating.label === "My Rating";
  const visuals = ratingVisuals(pct, isMine, isDark);
  const gradientId = `rating-gradient-${index}-${rating.label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

  return (
    <div
      style={{
        minWidth: 0,
        minHeight: 58,
        padding: "6px 9px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        background: visuals.background,
        borderLeft: index > 0 ? `1px solid ${isDark ? "rgba(255,255,255,0.09)" : "rgba(54,65,78,0.08)"}` : "none",
      }}
    >
      <div style={{ position: "relative", width: size, height: size, flex: "0 0 auto" }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
          <defs>
            <linearGradient id={gradientId} x1="5" y1="4" x2="41" y2="42" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor={visuals.color} />
              <stop offset="1" stopColor={visuals.colorEnd} />
            </linearGradient>
          </defs>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={20.5}
            fill="none"
            stroke={isDark ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.94)"}
            strokeWidth="2.5"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill={isDark ? "rgba(0,0,0,0.42)" : "rgba(255,255,255,0.82)"}
            stroke={visuals.trackColor}
            strokeWidth={stroke}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeWidth={stroke}
            strokeDasharray={`${dash} ${circumference}`}
            strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </svg>
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "grid",
            placeItems: "center",
            fontSize: rating.scale === 5 ? 13 : 11,
            fontWeight: 750,
          }}
        >
          {displayValue}
        </div>
      </div>
      <div
        style={{
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 3,
          color: mutedText,
          whiteSpace: "nowrap",
        }}
      >
        <span
          aria-hidden
          style={{
            width: 16,
            height: 16,
            borderRadius: "50%",
            display: "grid",
            placeItems: "center",
            color: "#fff",
            background: visuals.color,
            boxShadow: isDark ? "0 1px 3px rgba(0,0,0,0.28)" : "0 1px 2px rgba(45,54,64,0.14)",
          }}
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="8" r="3.25" stroke="currentColor" strokeWidth="2" />
            <path d="M6.75 19c.45-3.2 2.22-5 5.25-5s4.8 1.8 5.25 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </span>
        <span style={{ fontSize: 9, fontWeight: 650, lineHeight: 1.1 }}>{rating.label}</span>
      </div>
    </div>
  );
}

function IconButton({
  label,
  children,
  onClick,
  showLabel = true,
}: {
  label: string;
  children: ReactNode;
  onClick: () => void;
  showLabel?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      style={{
        border: "none",
        background: "transparent",
        padding: 0,
        width: 28,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 3,
        color: "inherit",
        cursor: "pointer",
        fontSize: 7.5,
        fontWeight: 650,
        whiteSpace: "nowrap",
      }}
    >
      <span
        aria-hidden
        style={{
          width: 26,
          height: 26,
          borderRadius: 7,
          display: "grid",
          placeItems: "center",
          background: "color-mix(in srgb, currentColor 7%, transparent)",
        }}
      >
        {children}
      </span>
      {showLabel ? label : <span aria-hidden style={{ height: 10 }} />}
    </button>
  );
}

function DetailFactIcon({ label }: { label: string }) {
  const normalized = label.toLowerCase();
  const common = {
    width: 17,
    height: 17,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
  };

  if (normalized.includes("watched")) {
    return (
      <svg {...common}>
        <path d="M2.5 12s3.4-6 9.5-6 9.5 6 9.5 6-3.4 6-9.5 6-9.5-6-9.5-6Z" />
        <circle cx="12" cy="12" r="2.5" />
      </svg>
    );
  }
  if (normalized.includes("date") || normalized.includes("air")) {
    return (
      <svg {...common}>
        <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
        <path d="M8 3v4M16 3v4M3.5 9.5h17" />
      </svg>
    );
  }
  if (normalized.includes("runtime") || normalized.includes("duration") || normalized.includes("hours") || normalized.includes("time")) {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3.5 2" />
      </svg>
    );
  }
  if (normalized.includes("revenue")) {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="9" />
        <path d="M15.5 8.5c-.7-.7-1.8-1-3-1-1.7 0-3 .8-3 2s1.1 1.8 3 2.3c1.9.5 3 1 3 2.3s-1.3 2.2-3.2 2.2c-1.3 0-2.5-.4-3.3-1.2M12 5.5v13" />
      </svg>
    );
  }
  if (normalized.includes("ownership") || normalized.includes("collection") || normalized.includes("format")) {
    return (
      <svg {...common}>
        <path d="M20 13.5 13.5 20 4 10.5V4h6.5L20 13.5Z" />
        <circle cx="8" cy="8" r="1.2" />
      </svg>
    );
  }
  if (normalized.includes("platform")) {
    return (
      <svg {...common}>
        <rect x="3.5" y="5" width="17" height="13" rx="2.5" />
        <path d="M8 21h8M12 18v3" />
      </svg>
    );
  }
  if (
    normalized.includes("director") ||
    normalized.includes("creator") ||
    normalized.includes("author") ||
    normalized.includes("narrator") ||
    normalized.includes("developer")
  ) {
    return (
      <svg {...common}>
        <circle cx="12" cy="8" r="3.2" />
        <path d="M5.5 20c.5-4 2.7-6 6.5-6s6 2 6.5 6" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 10v6M12 7h.01" />
    </svg>
  );
}

export function MediaDetailsSidebar({
  item,
  mediaType,
  coverUrl,
  width,
  isMobile,
  isDark,
  accentColor,
  statusOptions,
  relatedItems,
  saveState,
  saveError,
  getCoverUrl,
  onClose,
  onOpenFull,
  onEdit,
  onRate,
  onDelete,
  onStatusChange,
  onSelectRelated,
  onResizeStart,
}: MediaDetailsSidebarProps) {
  const title = first(item, ["title", "Title"]) || "Untitled";
  const overview = first(item, ["overview", "Overview", "description", "Description"]);
  const status = getStatus(item, mediaType);
  const genres = first(item, ["genres", "Genres", "genre", "Genre", "categories"]);
  const notes = first(item, ["notes", "Notes"]);
  const facts = getFacts(item, mediaType);
  const detailFacts = getDetailFacts(item, mediaType);
  const ratingGauges = getRatingGauges(item, mediaType);
  const castNames = useMemo(
    () => splitList(first(item, ["topcast", "TopCast", "cast", "Cast"])).slice(0, 5),
    [item]
  );
  const castPhotos = useMemo(
    () => splitList(first(item, ["topcastPhotos", "TopCastPhotos", "castPhotos", "CastPhotos"])),
    [item]
  );
  const panelBackground = isDark
    ? "linear-gradient(180deg, rgba(25,31,42,0.97), rgba(18,23,32,0.98))"
    : "linear-gradient(180deg, rgba(250,251,253,0.97), rgba(242,245,249,0.98))";
  const strongText = isDark ? "#f4f7fb" : "#1c2430";
  const mutedText = isDark ? "rgba(226,232,240,0.66)" : "#657184";
  const hairline = isDark ? "rgba(255,255,255,0.11)" : "rgba(31,41,55,0.12)";
  const currentStatusOptions = status && !statusOptions.includes(status) ? [status, ...statusOptions] : statusOptions;
  const isRecommendation = Boolean(item?.__isRecommendation);

  const shellStyle: CSSProperties = isMobile
    ? {
        position: "fixed",
        left: 8,
        right: 8,
        bottom: 8,
        height: "min(82vh, 760px)",
        zIndex: 7200,
        borderRadius: "16px 16px 12px 12px",
        border: `1px solid ${hairline}`,
        boxShadow: "0 -18px 50px rgba(15,23,42,0.3)",
      }
    : {
        position: "sticky",
        top: 0,
        width,
        minWidth: width,
        height: "100vh",
        borderLeft: `1px solid ${hairline}`,
        boxShadow: "-10px 0 28px rgba(15,23,42,0.08)",
      };

  return (
    <>
      {isMobile ? (
        <button
          type="button"
          aria-label="Close details"
          onClick={onClose}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 7190,
            border: 0,
            background: "rgba(9,14,23,0.36)",
          }}
        />
      ) : null}
      <aside
        aria-label={`${title} quick details`}
        style={{
          ...shellStyle,
          boxSizing: "border-box",
          background: panelBackground,
          color: strongText,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', sans-serif",
          backdropFilter: "blur(22px) saturate(1.08)",
          WebkitBackdropFilter: "blur(22px) saturate(1.08)",
        }}
      >
        {!isMobile ? (
          <button
            type="button"
            aria-label="Resize details panel"
            onPointerDown={onResizeStart}
            style={{
              position: "absolute",
              left: -5,
              top: 0,
              bottom: 0,
              width: 10,
              zIndex: 5,
              border: 0,
              background: "transparent",
              cursor: "col-resize",
              touchAction: "none",
            }}
          />
        ) : (
          <div
            aria-hidden
            style={{
              width: 38,
              height: 5,
              borderRadius: 999,
              background: isDark ? "rgba(255,255,255,0.25)" : "rgba(50,60,75,0.22)",
              margin: "8px auto 0",
            }}
          />
        )}

        <div style={{ overflowY: "auto", scrollbarWidth: "none", padding: isMobile ? "18px 16px 22px" : "16px 16px 22px" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "122px minmax(0, 1fr)" : "136px minmax(0, 1fr)",
              gap: 15,
              alignItems: "stretch",
            }}
          >
            <div
              style={{
                width: isMobile ? 122 : 136,
                minHeight: coverUrl ? undefined : 196,
                marginTop: 52,
                alignSelf: "start",
                borderRadius: 10,
                overflow: "hidden",
                background: coverUrl
                  ? "transparent"
                  : isDark
                    ? "rgba(255,255,255,0.06)"
                    : "rgba(20,30,45,0.05)",
                boxShadow: "0 8px 18px rgba(15,23,42,0.18)",
                display: "grid",
                placeItems: "center",
              }}
            >
              {coverUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={coverUrl}
                  alt=""
                  style={{
                    width: "100%",
                    height: "auto",
                    maxHeight: 216,
                    objectFit: "contain",
                    display: "block",
                    ...COVER_IMAGE_RADIUS_STYLE,
                  }}
                />
              ) : (
                <span style={{ padding: 12, color: mutedText, fontSize: 11, fontWeight: 700, textAlign: "center" }}>
                  No artwork
                </span>
              )}
            </div>

            <div style={{ minWidth: 0, display: "flex", flexDirection: "column" }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: isRecommendation ? "repeat(2, 28px)" : "repeat(5, 28px)",
                  justifyContent: "end",
                  gap: 7,
                  alignItems: "start",
                  marginBottom: 8,
                }}
              >
                {isRecommendation ? (
                  <IconButton label="Details" onClick={() => onOpenFull(item)}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
                      <path d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5" />
                    </svg>
                  </IconButton>
                ) : (
                  <>
                    <IconButton label="Details" onClick={() => onOpenFull(item)}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
                        <path d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5" />
                      </svg>
                    </IconButton>
                    <IconButton label="Rate" onClick={() => onRate(item)}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
                        <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-2.9-5.6 2.9 1.1-6.2L3 9.6l6.2-.9L12 3Z" />
                      </svg>
                    </IconButton>
                    <IconButton label="Edit" onClick={() => onEdit(item)}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
                        <path d="M4 20h4l11-11-4-4L4 16v4Z" />
                        <path d="m13.5 6.5 4 4" />
                      </svg>
                    </IconButton>
                    <IconButton label="Delete" onClick={() => void onDelete(item)}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
                        <path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5" />
                      </svg>
                    </IconButton>
                  </>
                )}
                <IconButton label="Close" showLabel={false} onClick={onClose}>
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
                    <path d="m6 6 12 12M18 6 6 18" />
                  </svg>
                </IconButton>
              </div>

              <div style={{ fontSize: 20, lineHeight: 1.15, fontWeight: 700, letterSpacing: 0 }}>{title}</div>
              <div style={{ marginTop: 7, color: mutedText, fontSize: 12, lineHeight: 1.4 }}>
                {[mediaLabel(mediaType), ...facts].filter(Boolean).join(" • ")}
              </div>
              {genres ? (
                <div style={{ marginTop: 8, color: mutedText, fontSize: 12, lineHeight: 1.35 }}>{genres}</div>
              ) : null}

              <div style={{ marginTop: "auto", paddingTop: 13 }}>
                {isRecommendation ? (
                  <button
                    type="button"
                    onClick={() => onOpenFull(item)}
                    style={{
                      width: "100%",
                      minHeight: 36,
                      borderRadius: 9,
                      border: `1px solid color-mix(in srgb, ${accentColor} 52%, transparent)`,
                      background: `color-mix(in srgb, ${accentColor} 15%, transparent)`,
                      color: strongText,
                      fontSize: 12,
                      fontWeight: 780,
                      cursor: "pointer",
                    }}
                  >
                    View Details
                  </button>
                ) : (
                  <div style={{ position: "relative", width: "100%" }}>
                    <div
                      style={{
                        marginBottom: 6,
                        color: mutedText,
                        fontSize: 9,
                        fontWeight: 650,
                        letterSpacing: 0.3,
                        textTransform: "uppercase",
                      }}
                    >
                      {mediaType === "book"
                        ? "Reading Status"
                        : mediaType === "game"
                          ? "Game Status"
                          : "Watch Status"}
                    </div>
                    <span
                      aria-hidden
                      style={{
                        position: "absolute",
                        left: 10,
                        bottom: 10,
                        width: 15,
                        height: 15,
                        borderRadius: "50%",
                        background: "#5b55ed",
                        color: "#fff",
                        display: "grid",
                        placeItems: "center",
                        fontSize: 10,
                        fontWeight: 800,
                        lineHeight: 1,
                        pointerEvents: "none",
                      }}
                    >
                      ✓
                    </span>
                    <select
                      aria-label="Status"
                      value={status}
                      disabled={saveState === "saving"}
                      onChange={(event) => onStatusChange(item, event.target.value)}
                      style={{
                        appearance: "none",
                        WebkitAppearance: "none",
                        width: "100%",
                        height: 36,
                        borderRadius: 10,
                        border: "1px solid transparent",
                        background: isDark ? "rgba(123,104,238,0.22)" : "rgba(111,83,235,0.1)",
                        color: strongText,
                        padding: "0 30px 0 32px",
                        fontSize: 12,
                        fontWeight: 600,
                        outline: "none",
                        cursor: saveState === "saving" ? "wait" : "pointer",
                        boxShadow: isDark ? "inset 0 1px rgba(255,255,255,0.05)" : "inset 0 1px rgba(255,255,255,0.55)",
                      }}
                    >
                      <option value="">No status</option>
                      {currentStatusOptions.map((option) => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                    <svg
                      aria-hidden
                      width="11"
                      height="11"
                      viewBox="0 0 20 20"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      style={{ position: "absolute", right: 10, bottom: 12, color: mutedText, pointerEvents: "none" }}
                    >
                      <path d="m5 7.5 5 5 5-5" />
                    </svg>
                  </div>
                )}

                {saveState !== "idle" ? (
                  <div
                    role="status"
                    style={{
                      marginTop: 4,
                      minHeight: 13,
                      fontSize: 9,
                      color: saveState === "error" ? "#dc4c64" : saveState === "saved" ? "#2da866" : mutedText,
                    }}
                  >
                    {saveState === "saving"
                      ? "Saving and confirming…"
                      : saveState === "saved"
                        ? "Saved and confirmed"
                        : saveError || "Save failed"}
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          {ratingGauges.length ? (
            <section
              style={{
                marginTop: 15,
                display: "grid",
                gridTemplateColumns: `repeat(${Math.min(2, ratingGauges.length)}, minmax(0, 1fr))`,
                gap: 0,
                overflow: "hidden",
                borderRadius: 10,
                border: `1px solid ${hairline}`,
                boxShadow: isDark ? "0 4px 12px rgba(0,0,0,0.12)" : "0 3px 10px rgba(34,45,58,0.06)",
              }}
            >
              {ratingGauges.map((rating, index) => (
                <RatingGauge
                  key={rating.label}
                  rating={rating}
                  isDark={isDark}
                  mutedText={mutedText}
                  index={index}
                />
              ))}
            </section>
          ) : null}

          {overview ? (
            <section style={{ padding: "14px 0", borderBottom: `1px solid ${hairline}` }}>
              <div style={{ fontSize: 12, lineHeight: 1.5, color: strongText }}>{overview}</div>
            </section>
          ) : null}

          {detailFacts.length || notes ? (
            <section style={{ padding: "11px 0", borderBottom: `1px solid ${hairline}` }}>
              {detailFacts.length ? (
                <>
                  <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>Details</div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                      borderRadius: 9,
                      overflow: "hidden",
                      border: `1px solid ${hairline}`,
                      background: isDark ? "rgba(255,255,255,0.035)" : "rgba(255,255,255,0.54)",
                    }}
                  >
                    {detailFacts.map((fact, index) => (
                      <div
                        key={`${fact.label}-${index}`}
                        style={{
                          minWidth: 0,
                          padding: "8px 10px",
                          borderRight: index % 2 === 0 ? `1px solid ${hairline}` : "none",
                          borderBottom:
                            index < detailFacts.length - (detailFacts.length % 2 || 2)
                              ? `1px solid ${hairline}`
                              : "none",
                        }}
                      >
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "22px minmax(0, 1fr)",
                            gap: 8,
                            alignItems: "center",
                          }}
                        >
                          <div style={{ color: strongText, display: "grid", placeItems: "center" }}>
                            <DetailFactIcon label={fact.label} />
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div
                              style={{
                                color: mutedText,
                                fontSize: 8.5,
                                letterSpacing: 0.25,
                                fontWeight: 550,
                              }}
                            >
                              {fact.label}
                            </div>
                            <div
                              style={{
                                marginTop: 3,
                                fontSize: 11,
                                lineHeight: 1.32,
                                fontWeight: 600,
                                overflowWrap: "anywhere",
                              }}
                            >
                              {fact.value}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : null}
              {notes ? (
                <div style={{ marginTop: detailFacts.length ? 14 : 0 }}>
                  <div style={{ color: mutedText, fontSize: 9, textTransform: "uppercase", fontWeight: 650 }}>Notes</div>
                  <div style={{ marginTop: 5, fontSize: 11, lineHeight: 1.45, fontWeight: 450 }}>{notes}</div>
                </div>
              ) : null}
            </section>
          ) : null}

          {castNames.length ? (
            <section style={{ padding: "11px 0", borderBottom: `1px solid ${hairline}` }}>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>Cast</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: 6 }}>
                {castNames.slice(0, 5).map((name, index) => (
                  <div key={`${name}-${index}`} style={{ minWidth: 0, textAlign: "center" }}>
                    <div
                      style={{
                        width: "90%",
                        maxWidth: 56,
                        aspectRatio: "3 / 4",
                        margin: "0 auto 4px",
                        borderRadius: 7,
                        overflow: "hidden",
                        display: "grid",
                        placeItems: "center",
                        background: isDark ? "rgba(255,255,255,0.1)" : "rgba(30,41,59,0.09)",
                        color: mutedText,
                        fontSize: 13,
                        fontWeight: 700,
                        boxShadow: "0 3px 8px rgba(15,23,42,0.12)",
                      }}
                    >
                      {castPhotos[index] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={castPhotos[index]}
                          alt=""
                          style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 20%" }}
                        />
                      ) : (
                        name.slice(0, 1).toUpperCase()
                      )}
                    </div>
                    <div
                      style={{
                        color: mutedText,
                        fontSize: 9,
                        lineHeight: 1.2,
                        overflowWrap: "anywhere",
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {name}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {relatedItems.length ? (
            <section style={{ padding: "11px 0", borderBottom: `1px solid ${hairline}` }}>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>Similar</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: 7 }}>
                {relatedItems.slice(0, 5).map((related, index) => {
                  const relatedCover = getCoverUrl(related);
                  return (
                    <button
                      key={`${first(related, ["title", "Title"])}-${index}`}
                      type="button"
                      title={first(related, ["title", "Title"])}
                      onClick={() => onSelectRelated(related)}
                      style={{
                        border: 0,
                        padding: 0,
                        minWidth: 0,
                        background: "transparent",
                        cursor: "pointer",
                        color: "inherit",
                      }}
                    >
                      <div
                        style={{
                          aspectRatio: mediaType === "book" && /audio/i.test(first(related, ["types", "type", "Type"])) ? "1" : "2 / 3",
                          borderRadius: 7,
                          overflow: "hidden",
                          background: isDark ? "rgba(255,255,255,0.06)" : "rgba(20,30,45,0.05)",
                        }}
                      >
                        {relatedCover ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={relatedCover} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                        ) : null}
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          ) : null}

        </div>
      </aside>
    </>
  );
}
