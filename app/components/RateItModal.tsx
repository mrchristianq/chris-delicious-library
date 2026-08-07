"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  BOOK_STATUS_OPTIONS,
  GAME_STATUS_OPTIONS,
  MOVIE_WATCH_STATUS_OPTIONS,
  TV_WATCH_STATUS_OPTIONS,
  normalizeBookStatusForSheet,
  normalizeGameStatusForSheet,
  normalizeMovieWatchStatusForSheetValue,
  normalizeTvWatchStatusForSheetValue,
} from "../lib/mediaStatusOptions";

type RatingData = {
  myRating?: string;
  watchStatus?: string;
  watchDate?: string;
  dateCompleted?: string;
  tags?: string;
  status?: string;
  hoursPlayed?: string;
  yearPlayed?: string;
  notes?: string;
};

type RateItModalProps = {
  open: boolean;
  onClose: () => void;
  onSave: (data: RatingData) => Promise<void> | void;
  item: Record<string, unknown> | null;
  mediaType: "movie" | "tv" | "book" | "game";
  highlightColor?: string;
  coverUrl?: string;
};

type SaveState = "idle" | "saving" | "saved" | "error";

function safeStr(value: unknown): string {
  return String(value ?? "").trim();
}

function firstNonEmpty(item: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = safeStr(item[key]);
    if (value) return value;
  }
  return "";
}

function formatDateForInput(dateStr: string): string {
  if (!dateStr) return "";
  const trimmed = dateStr.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;

  const slashMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (!slashMatch) return "";
  let [, month, day, year] = slashMatch;
  if (year.length === 2) {
    const yearNumber = Number.parseInt(year, 10);
    year = `${yearNumber > 50 ? "19" : "20"}${year}`;
  }
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

function parseRating(value: unknown, maxRating: number): number {
  const parsed = Number.parseFloat(safeStr(value));
  if (!Number.isFinite(parsed) || parsed <= 0) return 0;
  if (parsed <= maxRating) return parsed;
  if (parsed <= 100) return maxRating === 5 ? parsed / 20 : parsed / 10;
  return 0;
}

let feedbackAudioContext: AudioContext | null = null;

function playFeedbackTone(kind: "press" | "success") {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const context = feedbackAudioContext || new AudioContextClass();
    feedbackAudioContext = context;
    if (context.state === "suspended") {
      void context.resume();
    }
    const startAt = context.currentTime;
    const tones = kind === "success"
      ? [
          { frequency: 659.25, offset: 0, duration: 0.09 },
          { frequency: 880, offset: 0.08, duration: 0.15 },
        ]
      : [{ frequency: 520, offset: 0, duration: 0.045 }];

    tones.forEach(({ frequency, offset, duration }) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const toneStart = startAt + offset;
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(frequency, toneStart);
      gain.gain.setValueAtTime(0.0001, toneStart);
      gain.gain.exponentialRampToValueAtTime(kind === "success" ? 0.055 : 0.025, toneStart + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, toneStart + duration);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(toneStart);
      oscillator.stop(toneStart + duration + 0.02);
    });
  } catch {
    // Sound is optional; browser or native audio policies may block it.
  }
}

function getStatusIcon(status: string): string {
  const normalized = status.toLowerCase();
  if (["watched", "completed"].includes(normalized)) return "✓";
  if (["started", "reading", "now playing"].includes(normalized)) return "▶";
  if (["backlog", "watch next", "queued", "wishlist"].includes(normalized)) return "⌑";
  if (normalized === "paused" || normalized === "pending return") return "Ⅱ";
  if (normalized === "abandoned") return "×";
  if (normalized === "pending digital release") return "◷";
  if (normalized === "collection") return "□";
  if (normalized === "replay") return "↻";
  return "•";
}

export function RateItModal({
  open,
  onClose,
  onSave,
  item,
  mediaType,
  highlightColor = "#007AFF",
  coverUrl = "",
}: RateItModalProps) {
  const [myRating, setMyRating] = useState("");
  const [watchStatus, setWatchStatus] = useState("");
  const [watchDate, setWatchDate] = useState("");
  const [dateCompleted, setDateCompleted] = useState("");
  const [tags, setTags] = useState("");
  const [status, setStatus] = useState("");
  const [hoursPlayed, setHoursPlayed] = useState("");
  const [yearPlayed, setYearPlayed] = useState("");
  const [notes, setNotes] = useState("");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveError, setSaveError] = useState("");

  const isMovie = mediaType === "movie";
  const isTV = mediaType === "tv";
  const isBook = mediaType === "book";
  const isGame = mediaType === "game";
  const maxRating = isBook ? 5 : 10;
  const title = item ? safeStr(item.title || item.Title || item.name || "") : "";

  useEffect(() => {
    if (!open || !item) return;

    setMyRating(firstNonEmpty(item, ["myRating", "My Rating", "MyRating"]));
    const initialWatchStatus = firstNonEmpty(item, [
      "watchStatus",
      "Watch Status",
      "WatchStatus",
      "watched",
      "Watched",
    ]);
    setWatchStatus(
      mediaType === "tv"
        ? normalizeTvWatchStatusForSheetValue(initialWatchStatus)
        : normalizeMovieWatchStatusForSheetValue(initialWatchStatus)
    );
    setWatchDate(formatDateForInput(firstNonEmpty(item, ["watchDate", "WatchDate"])));
    setDateCompleted(
      formatDateForInput(
        firstNonEmpty(item, [
          "completedDate",
          "dateCompleted",
          "Date Completed",
          "DateCompleted",
          "CompletedDate",
        ])
      )
    );
    setTags(firstNonEmpty(item, ["tags", "Tags", "tag", "Tag"]));
    const initialStatus = firstNonEmpty(item, ["status", "Status", "gameStatus", "GameStatus"]);
    setStatus(
      mediaType === "book"
        ? normalizeBookStatusForSheet(initialStatus)
        : normalizeGameStatusForSheet(initialStatus)
    );
    setHoursPlayed(firstNonEmpty(item, ["hoursPlayed", "Hours Played", "HoursPlayed"]));
    setYearPlayed(firstNonEmpty(item, ["yearPlayed", "Year Played", "YearPlayed"]));
    setNotes(firstNonEmpty(item, ["notes", "Notes"]));
    setSaveState("idle");
    setSaveError("");
  }, [open, item, mediaType]);

  const userRating = useMemo(() => {
    if (!item) return 0;
    const keys = isMovie || isTV
      ? ["tmdbRating", "TMDB Rating", "TMDB_Rating", "userRating", "User Rating", "rating", "Rating"]
      : isGame
        ? ["igdbRating", "IGDB Rating", "IGDB_Rating", "userRating", "User Rating", "rating", "Rating"]
        : ["userRating", "User Rating", "rating", "Rating", "hardcoverRating", "Hardcover Rating"];
    return parseRating(firstNonEmpty(item, keys), maxRating);
  }, [isGame, isMovie, isTV, item, maxRating]);

  const currentRating = parseRating(myRating, maxRating);
  const comparison = currentRating && userRating ? currentRating - userRating : 0;
  const comparisonText = !currentRating
    ? "Move the slider to set your rating"
    : !userRating
      ? "No community average is available"
      : Math.abs(comparison) < 0.05
        ? `Matches the ${userRating.toFixed(1)} user average`
        : `${Math.abs(comparison).toFixed(1)} ${comparison > 0 ? "above" : "below"} the ${userRating.toFixed(1)} user average`;

  const histogramBars = useMemo(() => {
    const count = 20;
    const center = userRating > 0 ? (userRating / maxRating) * (count - 1) : (count - 1) * 0.62;
    return Array.from({ length: count }, (_, index) => {
      const distance = (index - center) / 3.45;
      return Math.max(14, Math.round(18 + Math.exp(-(distance * distance) / 2) * 76));
    });
  }, [maxRating, userRating]);

  const userBarIndex = userRating > 0
    ? Math.min(histogramBars.length - 1, Math.round((userRating / maxRating) * (histogramBars.length - 1)))
    : -1;
  const myBarIndex = currentRating > 0
    ? Math.min(histogramBars.length - 1, Math.round((currentRating / maxRating) * (histogramBars.length - 1)))
    : -1;

  const statusOptions = isMovie
    ? MOVIE_WATCH_STATUS_OPTIONS.filter((option) => option !== "Pending Digital Release")
    : isTV
      ? TV_WATCH_STATUS_OPTIONS
      : isBook
        ? BOOK_STATUS_OPTIONS
        : GAME_STATUS_OPTIONS;
  const statusLayoutClass = `statusGrid statusGridCount${statusOptions.length}`;
  const selectedStatus = isMovie || isTV ? watchStatus : status;
  const setSelectedStatus = isMovie || isTV ? setWatchStatus : setStatus;
  const fieldCount = isGame ? 3 : isBook ? 2 : 1;

  const year = item
    ? firstNonEmpty(item, ["year", "Year", "releaseYear", "Release Year"])
    : "";
  const genres = item
    ? firstNonEmpty(item, ["genres", "Genres", "genre", "Genre"])
    : "";
  const runtime = item
    ? firstNonEmpty(item, ["runtime", "Runtime", "duration", "Duration", "audiobookDuration", "Audiobook Duration"])
    : "";
  const subtitleBits = [
    year,
    genres.split(",").slice(0, 2).join(", "),
    runtime,
  ].filter(Boolean);

  const resolvedCoverUrl =
    coverUrl ||
    (item
      ? firstNonEmpty(item, [
          "r2CoverUrl",
          "R2CoverURL",
          "R2CoverUrl",
          "posterUrl",
          "PosterURL",
          "coverUrl",
          "CoverURL",
          "imageUrl",
          "ImageURL",
        ])
      : "");

  const handleSave = async () => {
    if (saveState === "saving") return;
    const data: RatingData = {};
    if (myRating) data.myRating = myRating;
    if (isMovie) {
      if (watchStatus) data.watchStatus = watchStatus;
      if (watchDate) data.watchDate = watchDate;
    }
    if (isTV) {
      if (watchStatus) data.watchStatus = watchStatus;
      if (dateCompleted) data.dateCompleted = dateCompleted;
    }
    if (isBook) {
      if (status) data.status = status;
      if (dateCompleted) data.dateCompleted = dateCompleted;
      if (tags) data.tags = tags;
    }
    if (isGame) {
      if (status) data.status = status;
      if (hoursPlayed) data.hoursPlayed = hoursPlayed;
      if (dateCompleted) data.dateCompleted = dateCompleted;
      if (yearPlayed) data.yearPlayed = yearPlayed;
    }
    if (notes !== firstNonEmpty(item || {}, ["notes", "Notes"])) data.notes = notes;

    setSaveState("saving");
    setSaveError("");
    playFeedbackTone("press");
    if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(12);

    try {
      await Promise.resolve(onSave(data));
      setSaveState("saved");
      playFeedbackTone("success");
      if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate([18, 35, 22]);
      window.setTimeout(onClose, 750);
    } catch (error) {
      setSaveState("error");
      setSaveError(error instanceof Error ? error.message : "Google Sheets did not confirm this update.");
    }
  };

  if (!open) return null;

  const modalStyle = {
    "--rate-accent": highlightColor,
    "--rate-accent-soft": `color-mix(in srgb, ${highlightColor} 12%, white)`,
  } as CSSProperties;

  return (
    <div
      className="rateOverlay"
      onClick={() => {
        if (saveState !== "saving") onClose();
      }}
    >
      <div className="rateCard" style={modalStyle} onClick={(event) => event.stopPropagation()}>
        <header className="rateHeader">
          {resolvedCoverUrl ? (
            <img className="rateCover" src={resolvedCoverUrl} alt="" />
          ) : (
            <div className="rateCover rateCoverPlaceholder" aria-hidden="true">★</div>
          )}
          <div className="rateHeading">
            <div className="rateEyebrow">Rate {isMovie ? "Movie" : isTV ? "TV Show" : isBook ? "Book" : "Game"}</div>
            <h2>{title}</h2>
            {subtitleBits.length ? <div className="rateMeta">{subtitleBits.join(" · ")}</div> : null}
            <div className="rateAverage">
              <span aria-hidden="true">★</span>
              <strong>{userRating ? userRating.toFixed(1) : "—"}</strong>
              <span>/ {maxRating.toFixed(0)} user average</span>
            </div>
          </div>
          <button
            type="button"
            className="rateClose"
            onClick={onClose}
            disabled={saveState === "saving"}
            aria-label="Close Rate It"
          >
            ×
          </button>
        </header>

        <section className="rateSection ratingSection">
          <div className="sectionTitleRow">
            <h3>My Rating</h3>
            <output className="ratingOutput">{currentRating ? currentRating.toFixed(1) : "—"}</output>
          </div>

          <div className="ratingStars">
            {Array.from({ length: maxRating }).map((_, index) => {
              const opacity = Math.max(0, Math.min(1, currentRating - index));
              const ratingValue = index + 1;
              const isCurrentStep = currentRating > 0 && ratingValue === Math.ceil(currentRating);
              return (
                <button
                  type="button"
                  key={index}
                  className={`ratingStar${isCurrentStep ? " ratingStarCurrent" : ""}`}
                  onClick={() => setMyRating(String(ratingValue))}
                  aria-label={`Set rating to ${ratingValue}`}
                >
                  <span className="ratingStarShape ratingStarBase" aria-hidden="true" />
                  <span
                    className="ratingStarShape ratingStarFill"
                    style={{ opacity }}
                    aria-hidden="true"
                  />
                  <small>{ratingValue}</small>
                </button>
              );
            })}
          </div>

          <div className="ratingSliderRow">
            <input
              aria-label="My rating"
              type="range"
              min={0}
              max={maxRating}
              step={0.1}
              value={myRating || "0"}
              onChange={(event) => setMyRating(event.target.value)}
              style={{ accentColor: highlightColor }}
            />
          </div>

          <div className="ratingComparison">
            <div className="comparisonCopy">
              <strong>
                {!currentRating ? "Choose a rating" : comparison > 0.05 ? "Above average" : comparison < -0.05 ? "Below average" : "Right on average"}
              </strong>
              <span>{comparisonText}</span>
            </div>
            <div className="histogram" aria-label={`User average ${userRating ? userRating.toFixed(1) : "not available"}; your rating ${currentRating ? currentRating.toFixed(1) : "not set"}`}>
              {histogramBars.map((height, index) => (
                <span
                  key={index}
                  className={[
                    "histogramBar",
                    index === userBarIndex ? "histogramAverage" : "",
                    index === myBarIndex ? "histogramMine" : "",
                  ].filter(Boolean).join(" ")}
                  style={{ height: `${height}%` }}
                />
              ))}
            </div>
            <div className="histogramLegend">
              <span><i className="legendAverage" />User average</span>
              <span><i className="legendMine" />My rating</span>
            </div>
          </div>
        </section>

        <section className="rateSection">
          <h3>{isMovie || isTV ? "Watch Status" : isBook ? "Reading Status" : "Game Status"}</h3>
          <div className={statusLayoutClass}>
            {statusOptions.map((option) => {
              const isSelected = selectedStatus === option;
              return (
                <button
                  type="button"
                  key={option}
                  className={`statusChoice${isSelected ? " statusChoiceSelected" : ""}`}
                  onClick={() => setSelectedStatus(option)}
                  aria-pressed={isSelected}
                >
                  <span className="statusChoiceIcon">{isSelected ? "✓" : getStatusIcon(option)}</span>
                  <span className="statusChoiceLabel">{option}</span>
                </button>
              );
            })}
          </div>
        </section>

        <section className={`rateFields rateFieldsCount${fieldCount}`}>
          {isMovie ? (
            <label>
              <span>Watch Date</span>
              <input type="date" value={watchDate} onChange={(event) => setWatchDate(event.target.value)} />
            </label>
          ) : null}

          {isTV || isBook || isGame ? (
            <label>
              <span>{isTV ? "Date Completed" : "Completed Date"}</span>
              <input type="date" value={dateCompleted} onChange={(event) => setDateCompleted(event.target.value)} />
            </label>
          ) : null}

          {isBook ? (
            <label>
              <span>Tags</span>
              <input type="text" value={tags} onChange={(event) => setTags(event.target.value)} placeholder="Enter tags" />
            </label>
          ) : null}

          {isGame ? (
            <>
              <label>
                <span>Hours Played</span>
                <input type="number" step="0.1" value={hoursPlayed} onChange={(event) => setHoursPlayed(event.target.value)} placeholder="0" />
              </label>
              <label>
                <span>Year Played</span>
                <input type="number" min="2000" max="2099" value={yearPlayed} onChange={(event) => setYearPlayed(event.target.value)} placeholder="2026" />
              </label>
            </>
          ) : null}
        </section>

        <section className="rateNotesSection">
          <label>
            <span>My Review / Notes</span>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Add your thoughts, review, or personal notes…"
              rows={4}
            />
          </label>
        </section>

        {saveState === "saving" ? (
          <div className="saveNotice saveNoticePending" role="status">
            <span className="saveSpinner" />
            Saving and confirming with Google Sheets…
          </div>
        ) : null}
        {saveState === "saved" ? (
          <div className="saveNotice saveNoticeSuccess" role="status">
            <span>✓</span>
            Saved to Google Sheets
          </div>
        ) : null}
        {saveState === "error" ? (
          <div className="saveNotice saveNoticeError" role="alert">
            <strong>Save not confirmed.</strong>
            <span>{saveError}</span>
          </div>
        ) : null}

        <footer className="rateActions">
          <button type="button" className="cancelButton" onClick={onClose} disabled={saveState === "saving"}>
            Cancel
          </button>
          <button
            type="button"
            className={`saveButton ${saveState === "saved" ? "saveButtonSaved" : ""}`}
            onClick={handleSave}
            disabled={saveState === "saving" || saveState === "saved"}
          >
            {saveState === "saving" ? (
              <>
                <span className="saveSpinner saveSpinnerButton" />
                Saving…
              </>
            ) : saveState === "saved" ? (
              <>✓ Saved</>
            ) : saveState === "error" ? (
              "Try Again"
            ) : (
              "Save Rating"
            )}
          </button>
        </footer>
      </div>

      <style jsx>{`
        .rateOverlay {
          position: fixed;
          inset: 0;
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          background: rgba(20, 24, 31, 0.36);
          backdrop-filter: blur(18px) saturate(115%);
        }
        .rateCard {
          width: min(720px, 94vw);
          max-height: min(92vh, 880px);
          overflow: auto;
          padding: 24px;
          border: 1px solid rgba(255, 255, 255, 0.82);
          border-radius: 28px;
          background: rgba(248, 248, 250, 0.97);
          color: #17181c;
          box-shadow: 0 28px 80px rgba(23, 29, 40, 0.28), inset 0 1px 0 #fff;
          scrollbar-width: none;
        }
        .rateCard::-webkit-scrollbar {
          display: none;
        }
        .rateHeader {
          position: relative;
          display: grid;
          grid-template-columns: 112px minmax(0, 1fr);
          gap: 20px;
          align-items: center;
          min-height: 154px;
          padding-right: 40px;
        }
        .rateCover {
          width: 112px;
          height: 154px;
          object-fit: contain;
          border-radius: 12px;
          background: transparent;
          box-shadow: 0 8px 20px rgba(28, 32, 40, 0.18);
        }
        .rateCoverPlaceholder {
          display: grid;
          place-items: center;
          background: #e7e8ec;
          color: var(--rate-accent);
          font-size: 34px;
        }
        .rateEyebrow {
          margin-bottom: 4px;
          color: #202126;
          font-size: 25px;
          font-weight: 760;
          letter-spacing: 0;
        }
        .rateHeading h2 {
          margin: 0;
          color: #6f7179;
          font-size: 20px;
          font-weight: 520;
          line-height: 1.2;
        }
        .rateMeta {
          margin-top: 10px;
          color: #777a83;
          font-size: 14px;
          line-height: 1.35;
        }
        .rateAverage {
          display: flex;
          align-items: baseline;
          gap: 7px;
          margin-top: 12px;
          color: #777a83;
          font-size: 14px;
        }
        .rateAverage > span:first-child {
          align-self: center;
          color: var(--rate-accent);
          font-size: 22px;
        }
        .rateAverage strong {
          color: #202126;
          font-size: 21px;
        }
        .rateClose {
          position: absolute;
          top: 0;
          right: 0;
          width: 34px;
          height: 34px;
          border: 0;
          border-radius: 50%;
          background: rgba(226, 227, 231, 0.88);
          color: #444750;
          font-size: 23px;
          line-height: 1;
          cursor: pointer;
        }
        .rateSection {
          margin-top: 22px;
        }
        .rateSection h3 {
          margin: 0 0 11px;
          font-size: 18px;
          font-weight: 750;
        }
        .sectionTitleRow {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .ratingOutput {
          color: var(--rate-accent);
          font-size: 28px;
          font-weight: 720;
        }
        .ratingStars {
          display: flex;
          align-items: flex-start;
          width: 100%;
          margin-top: 4px;
        }
        .ratingStar {
          position: relative;
          flex: 1 1 0;
          min-width: 0;
          display: grid;
          justify-items: center;
          padding: 0 2px;
          border: 0;
          background: transparent;
          cursor: pointer;
          line-height: 1;
        }
        .ratingStarShape {
          grid-area: 1 / 1;
          width: clamp(28px, 4.6vw, 40px);
          aspect-ratio: 1;
          clip-path: polygon(
            50% 2%,
            61.5% 35%,
            96% 35%,
            68% 55%,
            78.5% 89%,
            50% 69%,
            21.5% 89%,
            32% 55%,
            4% 35%,
            38.5% 35%
          );
        }
        .ratingStarBase {
          background: #d9dae0;
        }
        .ratingStarFill {
          grid-area: 1 / 1;
          background: var(--rate-accent);
          transition: opacity 120ms ease;
        }
        .ratingStar small {
          display: block;
          margin-top: 7px;
          color: #a2a4ab;
          font-size: 12px;
          font-weight: 500;
          transition: color 120ms ease, font-weight 120ms ease;
        }
        .ratingStarCurrent small {
          color: var(--rate-accent);
          font-weight: 750;
        }
        .ratingSliderRow {
          margin-top: 9px;
        }
        .ratingSliderRow input {
          width: 100%;
          cursor: pointer;
        }
        .ratingComparison {
          margin-top: 12px;
          padding: 14px 16px 12px;
          border: 1px solid rgba(216, 217, 222, 0.86);
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.82);
        }
        .comparisonCopy {
          display: flex;
          flex-wrap: wrap;
          gap: 4px 7px;
          align-items: baseline;
          color: #5d6068;
          font-size: 13px;
        }
        .comparisonCopy strong {
          color: #22242a;
          font-size: 15px;
        }
        .histogram {
          display: flex;
          align-items: flex-end;
          gap: 4px;
          height: 72px;
          margin-top: 10px;
        }
        .histogramBar {
          flex: 1 1 0;
          min-width: 3px;
          border-radius: 5px 5px 2px 2px;
          background: #e5e5ea;
          transition: height 140ms ease, background 140ms ease, transform 140ms ease;
        }
        .histogramAverage {
          background: color-mix(in srgb, var(--rate-accent) 42%, #d8d8de);
        }
        .histogramMine {
          background: var(--rate-accent);
          transform: scaleY(1.05);
          transform-origin: bottom;
        }
        .histogramLegend {
          display: flex;
          justify-content: flex-end;
          gap: 14px;
          margin-top: 7px;
          color: #767982;
          font-size: 10px;
        }
        .histogramLegend span {
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }
        .histogramLegend i {
          width: 7px;
          height: 7px;
          border-radius: 2px;
        }
        .legendAverage {
          background: color-mix(in srgb, var(--rate-accent) 42%, #d8d8de);
        }
        .legendMine {
          background: var(--rate-accent);
        }
        .statusGrid {
          display: grid;
          gap: 8px;
        }
        .statusGridCount4 {
          grid-template-columns: repeat(4, minmax(0, 1fr));
        }
        .statusGridCount5 {
          grid-template-columns: repeat(5, minmax(0, 1fr));
        }
        .statusGridCount6 {
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }
        .statusGridCount7 {
          grid-template-columns: repeat(8, minmax(0, 1fr));
        }
        .statusGridCount7 .statusChoice {
          grid-column: span 2;
        }
        .statusGridCount7 .statusChoice:nth-child(5) {
          grid-column: 2 / span 2;
        }
        .statusGridCount8 {
          grid-template-columns: repeat(4, minmax(0, 1fr));
        }
        .statusChoice {
          min-width: 0;
          min-height: 46px;
          display: flex;
          align-items: center;
          justify-content: flex-start;
          gap: 7px;
          padding: 8px 9px;
          border: 1px solid #d9dae0;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.72);
          color: #30323a;
          font-weight: 620;
          cursor: pointer;
          transition: border-color 140ms ease, background 140ms ease, color 140ms ease, transform 140ms ease;
        }
        .statusChoice:hover {
          transform: translateY(-1px);
          border-color: color-mix(in srgb, var(--rate-accent) 54%, #d9dae0);
        }
        .statusChoiceSelected {
          border-color: var(--rate-accent);
          background: var(--rate-accent-soft);
          color: var(--rate-accent);
          box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--rate-accent) 28%, transparent);
        }
        .statusChoiceIcon {
          width: 23px;
          height: 23px;
          flex: 0 0 23px;
          display: grid;
          place-items: center;
          border: 1px solid currentColor;
          border-radius: 50%;
          font-size: 13px;
        }
        .statusChoiceSelected .statusChoiceIcon {
          border-color: var(--rate-accent);
          background: var(--rate-accent);
          color: white;
        }
        .statusChoiceLabel {
          min-width: 0;
          font-size: clamp(10px, 1.15vw, 12px);
          line-height: 1.15;
          text-align: left;
          text-wrap: balance;
        }
        .rateFields {
          display: grid;
          gap: 12px;
          margin-top: 20px;
        }
        .rateFieldsCount1 {
          grid-template-columns: minmax(0, 1fr);
        }
        .rateFieldsCount2 {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
        .rateFieldsCount3 {
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }
        .rateFields label {
          min-width: 0;
        }
        .rateFields label > span {
          display: block;
          margin-bottom: 6px;
          color: #2d2f35;
          font-size: 12px;
          font-weight: 700;
        }
        .rateFields input {
          box-sizing: border-box;
          width: 100%;
          min-height: 44px;
          padding: 9px 11px;
          border: 1px solid #d5d6dc;
          border-radius: 11px;
          background: rgba(255, 255, 255, 0.82);
          color: #202126;
          font: inherit;
          font-size: 13px;
          outline: none;
        }
        .rateFields input:focus {
          border-color: var(--rate-accent);
          box-shadow: 0 0 0 3px color-mix(in srgb, var(--rate-accent) 17%, transparent);
        }
        .rateNotesSection {
          margin-top: 14px;
        }
        .rateNotesSection label {
          display: block;
        }
        .rateNotesSection label > span {
          display: block;
          margin-bottom: 6px;
          color: #2d2f35;
          font-size: 12px;
          font-weight: 700;
        }
        .rateNotesSection textarea {
          box-sizing: border-box;
          width: 100%;
          padding: 9px 11px;
          border: 1px solid #d5d6dc;
          border-radius: 11px;
          background: rgba(255, 255, 255, 0.82);
          color: #202126;
          font: inherit;
          font-size: 13px;
          line-height: 1.4;
          outline: none;
          resize: vertical;
        }
        .rateNotesSection textarea:focus {
          border-color: var(--rate-accent);
          box-shadow: 0 0 0 3px color-mix(in srgb, var(--rate-accent) 17%, transparent);
        }
        .saveNotice {
          display: flex;
          align-items: center;
          gap: 9px;
          margin-top: 16px;
          padding: 10px 12px;
          border-radius: 11px;
          font-size: 12px;
          font-weight: 650;
        }
        .saveNoticePending {
          background: #eef3ff;
          color: #315b9c;
        }
        .saveNoticeSuccess {
          background: #e9f7ed;
          color: #277940;
        }
        .saveNoticeError {
          align-items: flex-start;
          flex-direction: column;
          gap: 3px;
          background: #fff0f1;
          color: #9f2530;
        }
        .saveSpinner {
          width: 14px;
          height: 14px;
          flex: 0 0 14px;
          box-sizing: border-box;
          border: 2px solid currentColor;
          border-right-color: transparent;
          border-radius: 50%;
          animation: rateSpin 700ms linear infinite;
        }
        .saveSpinnerButton {
          width: 13px;
          height: 13px;
          flex-basis: 13px;
        }
        .rateActions {
          display: grid;
          grid-template-columns: minmax(120px, 0.8fr) minmax(180px, 1.2fr);
          gap: 10px;
          margin-top: 18px;
        }
        .rateActions button {
          min-height: 48px;
          border-radius: 13px;
          font-size: 14px;
          font-weight: 720;
          cursor: pointer;
        }
        .rateActions button:disabled {
          cursor: default;
        }
        .cancelButton {
          border: 1px solid #dedfe4;
          background: rgba(255, 255, 255, 0.78);
          color: #30323a;
        }
        .saveButton {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          border: 0;
          background: var(--rate-accent);
          color: white;
          box-shadow: 0 8px 18px color-mix(in srgb, var(--rate-accent) 27%, transparent);
        }
        .saveButtonSaved {
          background: #34a853;
          box-shadow: 0 8px 18px rgba(52, 168, 83, 0.24);
        }
        @keyframes rateSpin {
          to { transform: rotate(360deg); }
        }
        @media (max-width: 600px) {
          .rateOverlay {
            align-items: flex-end;
            padding: 8px;
          }
          .rateCard {
            width: 100%;
            max-height: 94vh;
            padding: 18px;
            border-radius: 24px 24px 18px 18px;
          }
          .rateHeader {
            grid-template-columns: 82px minmax(0, 1fr);
            gap: 14px;
            min-height: 112px;
            padding-right: 30px;
          }
          .rateCover {
            width: 82px;
            height: 112px;
            border-radius: 9px;
          }
          .rateEyebrow {
            font-size: 20px;
          }
          .rateHeading h2 {
            font-size: 16px;
          }
          .rateMeta,
          .rateAverage {
            margin-top: 6px;
            font-size: 11px;
          }
          .rateAverage strong {
            font-size: 17px;
          }
          .ratingStar {
            padding-inline: 1px;
          }
          .ratingStarShape {
            width: ${maxRating > 5 ? "clamp(22px, 7vw, 30px)" : "clamp(30px, 11vw, 42px)"};
          }
          .ratingStar small {
            margin-top: 5px;
            font-size: 10px;
          }
          .ratingComparison {
            padding: 12px;
          }
          .histogram {
            gap: 3px;
            height: 58px;
          }
          .statusGridCount4,
          .statusGridCount5,
          .statusGridCount6,
          .statusGridCount7,
          .statusGridCount8 {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          .statusGridCount7 .statusChoice,
          .statusGridCount7 .statusChoice:nth-child(5) {
            grid-column: auto;
          }
          .statusGridCount5 .statusChoice:last-child,
          .statusGridCount7 .statusChoice:last-child {
            grid-column: 1 / -1;
          }
          .statusChoice {
            min-height: 42px;
          }
          .rateFieldsCount1,
          .rateFieldsCount2,
          .rateFieldsCount3 {
            grid-template-columns: 1fr;
          }
          .rateActions {
            grid-template-columns: 0.8fr 1.2fr;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .histogramBar,
          .statusChoice {
            transition: none;
          }
          .saveSpinner {
            animation-duration: 1.4s;
          }
        }
      `}</style>
    </div>
  );
}
