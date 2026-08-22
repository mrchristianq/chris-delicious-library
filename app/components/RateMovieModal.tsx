"use client";

import { useState } from "react";
import { createPortal } from "react-dom";

type RateMovieModalProps = {
  open: boolean;
  item: Record<string, unknown> | null;
  onClose: () => void;
  onSave: (updates: Record<string, unknown>) => Promise<void> | void;
  onShowSuccess?: () => void;
  highlightColor?: string;
};

const WATCH_STATUS_OPTIONS = ["Watched", "Watching", "Backlog", "Pending Digital Release", "Abandoned"] as const;

function formatDateForInput(dateStr: string): string {
  if (!dateStr) return "";

  // Try to extract ISO date format (YYYY-MM-DD)
  const isoMatch = dateStr.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return isoMatch[0];

  // Try to parse "Month Day, Year" format and convert to ISO
  const dateObj = new Date(dateStr);
  if (!isNaN(dateObj.getTime())) {
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, "0");
    const day = String(dateObj.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  return "";
}

export function RateMovieModal({ open, item, onClose, onSave, onShowSuccess, highlightColor = "#2f7bd7" }: RateMovieModalProps) {
  const [rating, setRating] = useState<number>(
    item ? parseFloat(String(item.myRating || "0")) : 0
  );
  const [watchStatus, setWatchStatus] = useState<string>(
    item ? String(item.watchStatus || "") : ""
  );
  const [watchDate, setWatchDate] = useState<string>(
    item ? formatDateForInput(String(item.watchDate || "")) : ""
  );
  const [tag, setTag] = useState<string>(
    item ? String(item.tag || "") : ""
  );
  const [isSaving, setIsSaving] = useState(false);

  if (!open || !item) return null;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave({
        myRating: rating.toString(),
        watchStatus: watchStatus || undefined,
        watchDate: watchDate || undefined,
        tag: tag || undefined,
      });
      onClose();
      onShowSuccess?.();
    } catch (error: any) {
      console.error("Failed to save rating:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const filledStars = Math.floor(rating);
  const partialFill = (rating % 1) * 100;

  return createPortal(
    <div className="rateMovieOverlay" onClick={onClose}>
      <div
        className="rateMovieDialog"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        style={{
          "--rateMovieHighlightColor": highlightColor,
        } as React.CSSProperties}
      >
        {/* Header */}
        <div className="rateMovieHeader">
          <h2>Rate "{String(item.title || "").substring(0, 30)}"</h2>
          <button
            type="button"
            className="rateMovieClose"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Star Rating */}
        <div className="rateMovieStarSection">
          <div className="rateMovieRatingDisplay" style={{ color: highlightColor }}>
            {rating.toFixed(1)}
          </div>
          <div className="rateMovieStars">
            {Array.from({ length: 10 }).map((_, i) => {
              const isFilled = i < filledStars;
              const isPartial = i === filledStars && partialFill > 0;
              return (
                <div
                  key={i}
                  className="rateMovieStarContainer"
                  onClick={() => setRating(i + 1)}
                >
                  <div className="rateMovieStarWrapper">
                    {/* Empty star background */}
                    <svg
                      className="rateMovieStar empty"
                      width="33.6"
                      height="33.6"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="0.5"
                      aria-hidden="true"
                    >
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                    {/* Filled star overlay */}
                    {(isFilled || isPartial) && (
                      <div
                        className="rateMovieStarFill"
                        style={{
                          width: isPartial ? `${partialFill}%` : "100%",
                        }}
                        aria-hidden="true"
                      >
                        <svg
                          className="rateMovieStar filled"
                          width="33.6"
                          height="33.6"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                        >
                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="rateMovieStarLabel">{i + 1}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Slider */}
        <div className="rateMovieSliderSection">
          <input
            type="range"
            min="0"
            max="10"
            step="0.1"
            value={rating}
            onChange={(e) => setRating(parseFloat(e.target.value))}
            className="rateMovieSlider"
          />
        </div>

        {/* Watch Status Dropdown */}
        <div className="rateMovieFormGroup">
          <label htmlFor="watchStatus" className="rateMovieLabel">
            Watch Status
          </label>
          <select
            id="watchStatus"
            value={watchStatus}
            onChange={(e) => setWatchStatus(e.target.value)}
            className="rateMovieSelect"
          >
            <option value="">Select status...</option>
            {WATCH_STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>

        {/* Watch Date Picker */}
        <div className="rateMovieFormGroup">
          <label htmlFor="watchDate" className="rateMovieLabel">
            Watch Date
          </label>
          <input
            type="date"
            id="watchDate"
            value={watchDate}
            onChange={(e) => setWatchDate(e.target.value)}
            className="rateMovieDateInput"
          />
        </div>

        {/* Tag Input */}
        <div className="rateMovieFormGroup">
          <label htmlFor="tag" className="rateMovieLabel">
            Tag
          </label>
          <input
            type="text"
            id="tag"
            value={tag}
            onChange={(e) => setTag(e.target.value)}
            placeholder="e.g. Favorite, Rewatch, etc."
            className="rateMovieTextInput"
          />
        </div>

        {/* Save Button */}
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="rateMovieSaveButton"
        >
          {isSaving ? "Saving..." : "Save"}
        </button>
      </div>

      <style jsx>{`
        .rateMovieOverlay {
          position: fixed;
          inset: 0;
          z-index: 2500;
          background: rgba(27, 31, 38, 0.32);
          backdrop-filter: blur(18px) saturate(1.12);
          -webkit-backdrop-filter: blur(18px) saturate(1.12);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 14px;
        }

        .rateMovieDialog {
          width: min(480px, 100%);
          border-radius: 18px;
          border: 1px solid rgba(255, 255, 255, 0.72);
          background: linear-gradient(
            180deg,
            rgba(249, 250, 252, 0.97),
            rgba(232, 236, 242, 0.96)
          );
          box-shadow: 0 28px 76px rgba(27, 31, 38, 0.36),
            inset 0 1px 0 rgba(255, 255, 255, 0.9);
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 20px;
          color: #242a32;
        }

        .rateMovieHeader {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          border-bottom: 1px solid rgba(160, 169, 183, 0.34);
          padding-bottom: 12px;
        }

        .rateMovieHeader h2 {
          margin: 0;
          font-size: 18px;
          font-weight: 900;
          color: #20242b;
          flex: 1;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .rateMovieClose {
          width: 28px;
          height: 28px;
          border: 1px solid rgba(110, 116, 126, 0.28);
          background: linear-gradient(
            180deg,
            rgba(255, 255, 255, 0.94),
            rgba(226, 229, 234, 0.94)
          );
          color: #555d68;
          border-radius: 50%;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.9),
            0 1px 2px rgba(23, 28, 36, 0.08);
          transition: all 120ms ease;
          flex-shrink: 0;
        }

        .rateMovieClose:hover {
          background: linear-gradient(
            180deg,
            rgba(255, 255, 255, 0.98),
            rgba(232, 236, 242, 0.96)
          );
        }

        .rateMovieStarSection {
          display: flex;
          flex-direction: column;
          gap: 12px;
          align-items: center;
        }

        .rateMovieRatingDisplay {
          font-size: 48px;
          font-weight: 900;
          color: #2f7bd7;
          line-height: 1;
        }

        .rateMovieStars {
          display: flex;
          justify-content: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .rateMovieStarContainer {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          cursor: pointer;
        }

        .rateMovieStarWrapper {
          position: relative;
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .rateMovieStar {
          position: absolute;
          width: 33.6px;
          height: 33.6px;
        }

        .rateMovieStar.empty {
          color: rgba(200, 200, 200, 0.5);
          z-index: 1;
        }

        .rateMovieStar.filled {
          color: var(--rateMovieHighlightColor, #2f7bd7);
          z-index: 2;
        }

        .rateMovieStarFill {
          position: absolute;
          left: 0;
          top: 0;
          height: 100%;
          overflow: hidden;
          z-index: 2;
          display: flex;
          align-items: center;
          justify-content: flex-start;
        }

        .rateMovieStarLabel {
          font-size: 14px;
          font-weight: 700;
          color: rgba(82, 96, 116, 0.7);
          letter-spacing: 0.02em;
        }

        .rateMovieSliderSection {
          padding: 12px 0;
        }

        .rateMovieSlider {
          width: 100%;
          height: 6px;
          border-radius: 3px;
          background: linear-gradient(
            to right,
            rgba(200, 200, 200, 0.3),
            var(--rateMovieHighlightColor, #2f7bd7)
          );
          outline: none;
          -webkit-appearance: none;
          appearance: none;
        }

        .rateMovieSlider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: linear-gradient(
            180deg,
            rgba(255, 255, 255, 0.96),
            rgba(226, 229, 234, 0.94)
          );
          border: 2px solid var(--rateMovieHighlightColor, #2f7bd7);
          cursor: pointer;
          box-shadow: 0 2px 6px rgba(23, 28, 36, 0.15);
          transition: all 120ms ease;
        }

        .rateMovieSlider::-webkit-slider-thumb:hover {
          width: 20px;
          height: 20px;
          box-shadow: 0 4px 12px rgba(47, 123, 215, 0.3);
        }

        .rateMovieSlider::-moz-range-thumb {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: linear-gradient(
            180deg,
            rgba(255, 255, 255, 0.96),
            rgba(226, 229, 234, 0.94)
          );
          border: 2px solid var(--rateMovieHighlightColor, #2f7bd7);
          cursor: pointer;
          box-shadow: 0 2px 6px rgba(23, 28, 36, 0.15);
          transition: all 120ms ease;
        }

        .rateMovieSlider::-moz-range-thumb:hover {
          width: 20px;
          height: 20px;
          box-shadow: 0 4px 12px rgba(47, 123, 215, 0.3);
        }

        .rateMovieFormGroup {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .rateMovieLabel {
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          color: rgba(82, 96, 116, 0.9);
        }

        .rateMovieSelect,
        .rateMovieDateInput,
        .rateMovieTextInput {
          padding: 9px 12px;
          border: 1px solid rgba(174, 184, 198, 0.46);
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.72);
          color: #242a32;
          font-size: 13px;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI Variable", "Segoe UI", sans-serif;
          transition: all 120ms ease;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.8);
        }

        .rateMovieSelect:hover,
        .rateMovieDateInput:hover,
        .rateMovieTextInput:hover {
          border-color: rgba(120, 166, 236, 0.5);
          background: rgba(255, 255, 255, 0.88);
        }

        .rateMovieSelect:focus,
        .rateMovieDateInput:focus,
        .rateMovieTextInput:focus {
          outline: none;
          border-color: var(--rateMovieHighlightColor, #2f7bd7);
          background: rgba(255, 255, 255, 0.95);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.9),
            0 0 0 3px var(--rateMovieHighlightColorAlpha, rgba(47, 123, 215, 0.12));
        }

        .rateMovieSelect {
          cursor: pointer;
          appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12' fill='%23555d68'%3E%3Cpath d='M1 4l5 4 5-4'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 8px center;
          padding-right: 28px;
        }

        .rateMovieSaveButton {
          padding: 11px 16px;
          border: 1px solid rgba(110, 116, 126, 0.28);
          border-radius: 8px;
          background: var(--rateMovieHighlightColor, #2f7bd7);
          color: #fff;
          font-size: 13px;
          font-weight: 800;
          letter-spacing: 0.03em;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2),
            inset 0 1px 0 rgba(255, 255, 255, 0.2);
          transition: all 120ms ease;
        }

        .rateMovieSaveButton:hover:not(:disabled) {
          opacity: 0.9;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3),
            inset 0 1px 0 rgba(255, 255, 255, 0.3);
        }

        .rateMovieSaveButton:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      `}</style>
    </div>,
    document.body
  );
}
