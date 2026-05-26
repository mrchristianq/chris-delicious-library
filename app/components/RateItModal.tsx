"use client";

import { useState, useEffect } from "react";

type RateItModalProps = {
  open: boolean;
  onClose: () => void;
  onSave: (data: RatingData) => Promise<void> | void;
  item: Record<string, unknown> | null;
  mediaType: "movie" | "tv" | "book" | "game";
  highlightColor?: string;
};

type RatingData = {
  myRating?: string;
  watchStatus?: string;
  watchDate?: string;
  dateCompleted?: string;
  tags?: string;
  status?: string;
  hoursPlayed?: string;
  yearPlayed?: string;
  backlog?: string;
  completed?: string;
};

function safeStr(v: unknown): string {
  return String(v ?? "").trim();
}

function firstNonEmpty(item: Record<string, unknown>, keys: string[]): string {
  for (const k of keys) {
    const s = safeStr(item[k]);
    if (s) return s;
  }
  return "";
}

function formatDateForInput(dateStr: string): string {
  if (!dateStr) return "";

  // Try to parse various date formats and convert to YYYY-MM-DD
  // Handle formats like: 4/25/26, 04/25/2026, 4/25/2026, 2026-04-25, etc.
  const trimmed = dateStr.trim();

  // Already in YYYY-MM-DD format
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  // Try M/DD/YY or MM/DD/YY or M/D/YY format
  const slashMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (slashMatch) {
    let [, month, day, year] = slashMatch;
    // Convert 2-digit year to 4-digit
    if (year.length === 2) {
      const yNum = parseInt(year, 10);
      year = (yNum > 50 ? "19" : "20") + year;
    }
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  return "";
}

const WATCH_STATUS_OPTIONS = ["Watched", "Started", "Backlog", "Pending Digital Release", "Abandoned"] as const;
const GAME_STATUS_OPTIONS = ["Backlog", "Playing", "Completed", "On Hold"] as const;

export function RateItModal({ open, onClose, onSave, item, mediaType, highlightColor = "#007AFF" }: RateItModalProps) {
  const [myRating, setMyRating] = useState("");
  const [watchStatus, setWatchStatus] = useState("");
  const [watchDate, setWatchDate] = useState("");
  const [dateCompleted, setDateCompleted] = useState("");
  const [tags, setTags] = useState("");
  const [status, setStatus] = useState("");
  const [hoursPlayed, setHoursPlayed] = useState("");
  const [yearPlayed, setYearPlayed] = useState("");
  const [backlog, setBacklog] = useState(false);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    if (!open || !item) return;

    setMyRating(firstNonEmpty(item, ["myRating", "My Rating", "MyRating"]));
    setWatchStatus(firstNonEmpty(item, ["watchStatus", "Watch Status", "WatchStatus", "watched", "Watched"]));
    setWatchDate(formatDateForInput(firstNonEmpty(item, ["watchDate", "WatchDate"])));
    setDateCompleted(formatDateForInput(firstNonEmpty(item, ["completedDate", "dateCompleted", "Date Completed", "DateCompleted", "CompletedDate"])));
    setTags(firstNonEmpty(item, ["tags", "Tags", "tag", "Tag"]));
    setStatus(firstNonEmpty(item, ["status", "Status", "gameStatus", "GameStatus"]));
    setHoursPlayed(firstNonEmpty(item, ["hoursPlayed", "Hours Played", "HoursPlayed"]));
    setYearPlayed(firstNonEmpty(item, ["yearPlayed", "Year Played", "YearPlayed"]));
    setBacklog(firstNonEmpty(item, ["backlog", "Backlog"]).toLowerCase() === "yes");
    setCompleted(firstNonEmpty(item, ["completed", "Completed"]).toLowerCase() === "yes");
  }, [open, item]);

  const handleSave = async () => {
    const data: RatingData = {};

    if (myRating) data.myRating = myRating;
    if (mediaType === "movie") {
      if (watchStatus) data.watchStatus = watchStatus;
      if (watchDate) data.watchDate = watchDate;
    }
    if (mediaType === "tv") {
      if (watchStatus) data.watchStatus = watchStatus;
      if (dateCompleted) data.dateCompleted = dateCompleted;
    }
    if (mediaType === "book") {
      if (dateCompleted) data.dateCompleted = dateCompleted;
      if (tags) data.tags = tags;
    }
    if (mediaType === "game") {
      if (status) data.status = status;
      if (hoursPlayed) data.hoursPlayed = hoursPlayed;
      if (dateCompleted) data.dateCompleted = dateCompleted;
      if (yearPlayed) data.yearPlayed = yearPlayed;
      data.backlog = backlog ? "Yes" : "";
      data.completed = completed ? "Yes" : "";
    }

    try {
      await Promise.resolve(onSave(data));
      onClose();
    } catch {
      // parent handler already surfaces user-facing error
    }
  };

  if (!open) return null;

  const isMovie = mediaType === "movie";
  const isTV = mediaType === "tv";
  const isBook = mediaType === "book";
  const isGame = mediaType === "game";
  const maxRating = isBook ? 5 : 10;
  const step = 0.1;
  const title = item ? safeStr(item.title || item.Title || "") : "";

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.4)",
        backdropFilter: "blur(12px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: "#f5f5f7",
          borderRadius: 16,
          padding: "24px",
          maxWidth: 440,
          width: "90%",
          maxHeight: "90vh",
          overflow: "auto",
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
        }}
      >
        <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4, color: "#000" }}>
          Rate {isMovie ? "Movie" : isTV ? "Show" : isBook ? "Book" : "Game"}
        </div>
        <div style={{ fontSize: 13, color: "rgba(0,0,0,0.6)", marginBottom: 20 }}>
          {title}
        </div>

        {/* My Rating */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 12, color: "#000" }}>
            My Rating
          </label>

          {/* Star Display */}
          <div style={{ display: "flex", gap: 2, marginBottom: 4, width: "100%" }}>
            {Array.from({ length: maxRating }).map((_, i) => {
              const ratingNum = myRating ? parseFloat(myRating) : 0;
              const isFull = ratingNum > i + 0.5;
              const isPartial = ratingNum > i && ratingNum <= i + 1;
              const fillAmount = isPartial ? (ratingNum - i) * 100 : isFull ? 100 : 0;

              return (
                <div
                  key={i}
                  style={{
                    flex: "1 1 0",
                    minWidth: 0,
                    display: "flex",
                    justifyContent: "center",
                  }}
                  onClick={() => setMyRating(String(i + 1))}
                >
                  <div
                    style={{
                      position: "relative",
                      fontSize: maxRating > 5 ? "clamp(16px, 6vw, 32px)" : "clamp(22px, 9vw, 36px)",
                      lineHeight: 1,
                      color: "#ddd",
                      cursor: "pointer",
                    }}
                  >
                    ★
                    <div
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        overflow: "hidden",
                        width: `${fillAmount}%`,
                        color: highlightColor,
                        transition: "width 100ms ease",
                      }}
                    >
                      ★
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Star Numbers */}
          <div style={{ display: "flex", gap: 2, marginBottom: 12, width: "100%" }}>
            {Array.from({ length: maxRating }).map((_, i) => (
              <div
                key={`num-${i}`}
                style={{
                  flex: "1 1 0",
                  minWidth: 0,
                  fontSize: 11,
                  color: "rgba(0,0,0,0.5)",
                  textAlign: "center",
                  lineHeight: 1,
                }}
              >
                {i + 1}
              </div>
            ))}
          </div>

          {/* Slider */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <input
              type="range"
              min="0"
              max={maxRating}
              step={step}
              value={myRating || "0"}
              onChange={(e) => setMyRating(e.target.value)}
              style={{ flex: 1, height: 6, cursor: "pointer" }}
            />
            <div style={{ fontSize: 14, fontWeight: 700, color: highlightColor, minWidth: 40 }}>
              {myRating ? parseFloat(myRating).toFixed(1) : "—"}
            </div>
          </div>
        </div>

        {/* Movie: Watch Status & Watch Date */}
        {isMovie ? (
          <>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 8, color: "#000" }}>
                Watch Status
              </label>
              <select
                value={watchStatus}
                onChange={(e) => setWatchStatus(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  borderRadius: 6,
                  border: `1px solid rgba(0,0,0,0.1)`,
                  fontSize: 13,
                  backgroundColor: "#fff",
                  cursor: "pointer",
                }}
              >
                <option value="">Select status...</option>
                {WATCH_STATUS_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 8, color: "#000" }}>
                Watch Date
              </label>
              <input
                type="date"
                value={watchDate}
                onChange={(e) => setWatchDate(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  borderRadius: 6,
                  border: `1px solid rgba(0,0,0,0.1)`,
                  fontSize: 13,
                }}
              />
            </div>
          </>
        ) : null}

        {/* TV: Watch Status & Date Completed */}
        {isTV ? (
          <>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 8, color: "#000" }}>
                Watch Status
              </label>
              <select
                value={watchStatus}
                onChange={(e) => setWatchStatus(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  borderRadius: 6,
                  border: `1px solid rgba(0,0,0,0.1)`,
                  fontSize: 13,
                  backgroundColor: "#fff",
                  cursor: "pointer",
                }}
              >
                <option value="">Select status...</option>
                {WATCH_STATUS_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 8, color: "#000" }}>
                Date Completed
              </label>
              <input
                type="date"
                value={dateCompleted}
                onChange={(e) => setDateCompleted(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  borderRadius: 6,
                  border: `1px solid rgba(0,0,0,0.1)`,
                  fontSize: 13,
                }}
              />
            </div>
          </>
        ) : null}

        {/* Book: Completed Date & Tags */}
        {isBook ? (
          <>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 8, color: "#000" }}>
                Completed Date
              </label>
              <input
                type="date"
                value={dateCompleted}
                onChange={(e) => setDateCompleted(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  borderRadius: 6,
                  border: `1px solid rgba(0,0,0,0.1)`,
                  fontSize: 13,
                }}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 8, color: "#000" }}>
                Tags
              </label>
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="Enter tags..."
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  borderRadius: 6,
                  border: `1px solid rgba(0,0,0,0.1)`,
                  fontSize: 13,
                }}
              />
            </div>
          </>
        ) : null}

        {/* Game: Status, Hours Played, Dates, Checkboxes */}
        {isGame ? (
          <>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 8, color: "#000" }}>
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  borderRadius: 6,
                  border: `1px solid rgba(0,0,0,0.1)`,
                  fontSize: 13,
                  backgroundColor: "#fff",
                  cursor: "pointer",
                }}
              >
                <option value="">Select status...</option>
                {GAME_STATUS_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 8, color: "#000" }}>
                Hours Played
              </label>
              <input
                type="number"
                step="0.1"
                value={hoursPlayed}
                onChange={(e) => setHoursPlayed(e.target.value)}
                placeholder="0"
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  borderRadius: 6,
                  border: `1px solid rgba(0,0,0,0.1)`,
                  fontSize: 13,
                }}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 8, color: "#000" }}>
                Completed Date
              </label>
              <input
                type="date"
                value={dateCompleted}
                onChange={(e) => setDateCompleted(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  borderRadius: 6,
                  border: `1px solid rgba(0,0,0,0.1)`,
                  fontSize: 13,
                }}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 8, color: "#000" }}>
                Year Played
              </label>
              <input
                type="number"
                min="2000"
                max="2099"
                value={yearPlayed}
                onChange={(e) => setYearPlayed(e.target.value)}
                placeholder="2026"
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  borderRadius: 6,
                  border: `1px solid rgba(0,0,0,0.1)`,
                  fontSize: 13,
                }}
              />
            </div>

            <div style={{ display: "flex", gap: 16, marginBottom: 20 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, fontWeight: 700, color: "#000" }}>
                <input
                  type="checkbox"
                  checked={backlog}
                  onChange={(e) => setBacklog(e.target.checked)}
                  style={{ cursor: "pointer" }}
                />
                Backlog
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, fontWeight: 700, color: "#000" }}>
                <input
                  type="checkbox"
                  checked={completed}
                  onChange={(e) => setCompleted(e.target.checked)}
                  style={{ cursor: "pointer" }}
                />
                Completed
              </label>
            </div>
          </>
        ) : null}

        {/* Buttons */}
        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
          <button
            onClick={onClose}
            style={{
              padding: "8px 16px",
              borderRadius: 6,
              border: "1px solid rgba(0,0,0,0.1)",
              backgroundColor: "#fff",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              color: "#000",
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            style={{
              padding: "8px 16px",
              borderRadius: 6,
              border: "none",
              backgroundColor: highlightColor,
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              color: "#fff",
            }}
          >
            {isBook ? "Mark As Completed" : "Save Rating"}
          </button>
        </div>
      </div>
    </div>
  );
}
