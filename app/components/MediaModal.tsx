import React from "react";

interface MediaModalProps {
  item: Record<string, any> | null;
  open: boolean;
  onClose: () => void;
  onReplaceCover?: (item: Record<string, any>, file: File) => Promise<void> | void;
  isReplacingCover?: boolean;
  replaceCoverError?: string | null;
}

type InfoRow = {
  label: string;
  value: React.ReactNode;
};

const DASH = "—";

function firstNonEmpty(item: Record<string, any>, keys: string[]): string {
  for (const key of keys) {
    const value = item[key];
    if (value === undefined || value === null) continue;
    const text = String(value).trim();
    if (text) return text;
  }
  return "";
}

function splitTags(value: string): string[] {
  return value
    .split(/[\/,|]/g)
    .map((part) => part.trim())
    .filter(Boolean);
}

function compactCoverRef(url: string): string {
  try {
    const parsed = new URL(url);
    const segments = parsed.pathname.split("/").filter(Boolean);
    const tail = decodeURIComponent(segments[segments.length - 1] || parsed.hostname);
    return tail || parsed.hostname;
  } catch {
    const pieces = url.split("/").filter(Boolean);
    return decodeURIComponent(pieces[pieces.length - 1] || url);
  }
}

function renderRating(value: string) {
  const n = Number.parseFloat(value);
  if (Number.isNaN(n)) return value || DASH;

  const normalized = n > 5 ? n / 2 : n;
  const stars = Math.max(0, Math.min(5, Math.round(normalized)));
  const starText = "★".repeat(stars) + "☆".repeat(5 - stars);

  return (
    <span className="ratingValue">
      <span className="stars">{starText}</span>
      <span className="score">{n.toFixed(1)}</span>
    </span>
  );
}

function buildInfoRows(item: Record<string, any>, itemType: "game" | "book" | "tv" | "movie"): InfoRow[] {
  if (itemType === "game") {
    return [
      { label: "Release Date", value: firstNonEmpty(item, ["releaseDate", "Release Date"]) || DASH },
      { label: "Year Played", value: firstNonEmpty(item, ["yearPlayed", "Year Played"]) || DASH },
      {
        label: "IGDB Rating",
        value: renderRating(firstNonEmpty(item, ["igdbRating", "externalRating", "rating", "Rating"]) || ""),
      },
      {
        label: "My Rating",
        value: renderRating(firstNonEmpty(item, ["myRating", "userRating", "personalRating"]) || ""),
      },
      { label: "Hours Played", value: firstNonEmpty(item, ["hoursPlayed", "playtime"]) || DASH },
      { label: "Developer", value: firstNonEmpty(item, ["developer", "studio"]) || DASH },
      { label: "Date Added", value: firstNonEmpty(item, ["dateAdded", "addedDate"]) || DASH },
      { label: "Date Completed", value: firstNonEmpty(item, ["dateCompleted", "completedDate"]) || DASH },
    ];
  }

  if (itemType === "book") {
    return [
      { label: "Subtitle", value: firstNonEmpty(item, ["subtitle", "Subtitle"]) || DASH },
      { label: "Series", value: firstNonEmpty(item, ["series"]) || DASH },
      { label: "Author", value: firstNonEmpty(item, ["author", "Author"]) || DASH },
      { label: "Ownership", value: firstNonEmpty(item, ["ownership"]) || DASH },
      { label: "Type", value: firstNonEmpty(item, ["types", "type"]) || DASH },
      { label: "Status", value: firstNonEmpty(item, ["status"]) || DASH },
      { label: "Completed Date", value: firstNonEmpty(item, ["completedDate"]) || DASH },
      { label: "Release Date", value: firstNonEmpty(item, ["releaseDate"]) || DASH },
      { label: "ISBN", value: firstNonEmpty(item, ["isbn"]) || DASH },
      { label: "ISBN-10", value: firstNonEmpty(item, ["isbn10", "ISBN10"]) || DASH },
      { label: "ISBN-13", value: firstNonEmpty(item, ["isbn13", "ISBN13"]) || DASH },
      {
        label: "External Avg Rating",
        value: renderRating(firstNonEmpty(item, ["externalAverageRating", "ExternalAverageRating"]) || ""),
      },
      { label: "User Rating", value: renderRating(firstNonEmpty(item, ["userRating", "UserRating"]) || "") },
      { label: "My Rating", value: renderRating(firstNonEmpty(item, ["myRating", "My Rating", "MyRating"]) || "") },
      { label: "Pages", value: firstNonEmpty(item, ["pages", "Pages"]) || DASH },
      {
        label: "Audiobook Duration",
        value: firstNonEmpty(item, ["audiobookDuration", "AudiobookDuration"]) || DASH,
      },
      { label: "Cover", value: firstNonEmpty(item, ["cover", "Cover"]) || firstNonEmpty(item, ["posterUrl"]) || DASH },
      { label: "Image URL", value: firstNonEmpty(item, ["imageUrl", "ImageURL", "Image URL"]) || DASH },
      {
        label: "Custom Image URL",
        value: firstNonEmpty(item, ["customImageUrl", "CustomImageURL", "Custom Image URL"]) || DASH,
      },
      { label: "GitHub Cover URL", value: firstNonEmpty(item, ["githubCoverUrl", "GitHubCoverURL"]) || DASH },
      { label: "Cover Sync Status", value: firstNonEmpty(item, ["coverSyncStatus", "CoverSyncStatus"]) || DASH },
      { label: "Tags", value: firstNonEmpty(item, ["tags", "tag", "Tags", "Tag"]) || DASH },
    ];
  }

  if (itemType === "tv") {
    return [
      { label: "First Air Date", value: firstNonEmpty(item, ["firstAirDate"]) || DASH },
      { label: "Last Air Date", value: firstNonEmpty(item, ["lastAirDate"]) || DASH },
      { label: "Watch Status", value: firstNonEmpty(item, ["watchStatus"]) || DASH },
      { label: "Show Status", value: firstNonEmpty(item, ["showStatus"]) || DASH },
      { label: "Genres", value: firstNonEmpty(item, ["genres"]) || DASH },
      { label: "Tag", value: firstNonEmpty(item, ["tag"]) || DASH },
    ];
  }

  return [
    { label: "Release Date", value: firstNonEmpty(item, ["releaseDate"]) || DASH },
    { label: "Watch Status", value: firstNonEmpty(item, ["watchStatus"]) || DASH },
    { label: "Movie Status", value: firstNonEmpty(item, ["movieStatus"]) || DASH },
    { label: "Genres", value: firstNonEmpty(item, ["genres"]) || DASH },
    { label: "TMDB ID", value: firstNonEmpty(item, ["tmdbId"]) || DASH },
    { label: "Tag", value: firstNonEmpty(item, ["tag"]) || DASH },
  ];
}

export const MediaModal: React.FC<MediaModalProps> = ({
  item,
  open,
  onClose,
  onReplaceCover,
  isReplacingCover = false,
  replaceCoverError,
}) => {
  const [posterIndex, setPosterIndex] = React.useState(0);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);

    return () => {
      window.removeEventListener("keydown", handleKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  const sourceItem = item ?? {};
  const itemType: "game" | "book" | "tv" | "movie" =
    sourceItem.__type === "game" || sourceItem.platform || sourceItem.yearPlayed || sourceItem.gameStatus
      ? "game"
      : sourceItem.__type === "book" || sourceItem.isbn || sourceItem.series
        ? "book"
        : sourceItem.__type === "tv" || sourceItem.firstAirDate || sourceItem.lastAirDate || sourceItem.showStatus
          ? "tv"
          : "movie";

  const title = firstNonEmpty(sourceItem, ["title"]) || "Untitled";
  const posterUrl = firstNonEmpty(sourceItem, ["posterUrl", "coverUrl"]);
  const coverSource = firstNonEmpty(sourceItem, ["coverSource"]) || "Unknown";
  const coverCandidates = Array.isArray(sourceItem.coverCandidates)
    ? sourceItem.coverCandidates.filter((c: any) => c && typeof c.url === "string" && c.url.trim())
    : [];
  const candidateUrls = coverCandidates.map((c: any) => String(c.url).trim()).filter(Boolean);
  const heroUrl = firstNonEmpty(sourceItem, ["backgroundUrl", "backdropUrl", "screenshotUrl", "bannerUrl", "heroUrl"]);
  const description = firstNonEmpty(sourceItem, ["description", "overview", "summary", "plot"]);

  React.useEffect(() => {
    if (!open || !item) return;
    const preferredIdx = candidateUrls.findIndex((url) => url === posterUrl);
    setPosterIndex(preferredIdx >= 0 ? preferredIdx : 0);
  }, [open, item, posterUrl, candidateUrls.join("|")]);

  const resolvedPosterUrl = candidateUrls[posterIndex] || posterUrl;
  const resolvedCoverSource = coverCandidates.find((c: any) => c.url === resolvedPosterUrl)?.label || coverSource;

  if (!open || !item) return null;

  const chips = [
    ...splitTags(firstNonEmpty(sourceItem, ["platform"])),
    ...splitTags(firstNonEmpty(sourceItem, ["genres"])),
    ...splitTags(firstNonEmpty(sourceItem, ["categories"])),
    ...splitTags(firstNonEmpty(sourceItem, ["tags", "tag"])),
    firstNonEmpty(sourceItem, ["gameStatus", "movieStatus", "showStatus", "status"]),
    firstNonEmpty(sourceItem, ["watchStatus", "playStatus"]),
  ].filter(Boolean);

  const uniqueChips = Array.from(new Set(chips));
  const infoRows = buildInfoRows(sourceItem, itemType);

  return (
    <div className="mediaModalOverlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="mediaModalCard">
        <button type="button" className="closeButton" aria-label="Close details" onClick={onClose}>
          ×
        </button>

        <div className="contentLayout">
          <aside className="leftPane">
            {posterUrl ? (
              <div className="posterWrap">
                <img
                  src={resolvedPosterUrl}
                  alt={title}
                  className="poster"
                  onError={() => {
                    setPosterIndex((idx) => (idx < candidateUrls.length - 1 ? idx + 1 : idx));
                  }}
                />
                {onReplaceCover ? (
                  <>
                    <button
                      type="button"
                      className="replaceCoverButton"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isReplacingCover}
                    >
                      {isReplacingCover ? "Uploading..." : "Replace Cover"}
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      style={{ display: "none" }}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file && item) {
                          onReplaceCover(item, file);
                        }
                        e.currentTarget.value = "";
                      }}
                    />
                  </>
                ) : null}
              </div>
            ) : (
              <div className="posterFallback">No Cover</div>
            )}
            {replaceCoverError ? <div className="replaceCoverError">{replaceCoverError}</div> : null}
            <h2 className="title">{title}</h2>
            <div className="coverSourcePanel">
              <div className="coverSourceHeading">Active Cover</div>
              <div className="activeSource">{resolvedCoverSource}</div>
              {coverCandidates.length > 0 ? (
                <div className="coverSourcesList">
                  {coverCandidates.map((candidate: any, idx: number) => {
                    const isActive = candidate.url === resolvedPosterUrl;
                    return (
                      <div key={`${candidate.url}-${idx}`} className={`sourceItem ${isActive ? "active" : ""}`}>
                        <div className="sourceName">{candidate.label}</div>
                        <div className="sourceUrl" title={candidate.url}>
                          {compactCoverRef(candidate.url)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </div>
            {uniqueChips.length > 0 ? (
              <div className="chipWrap">
                {uniqueChips.map((chip) => (
                  <span key={chip} className="chip">
                    {chip}
                  </span>
                ))}
              </div>
            ) : null}
          </aside>

          <section className="rightPane">
            {itemType !== "book" ? (
              heroUrl ? (
                <img src={heroUrl} alt={`${title} screenshot`} className="heroImage" />
              ) : (
                <div className="heroFallback" />
              )
            ) : null}

            <div className="infoGrid">
              {infoRows.map((row) => (
                <div key={row.label} className="infoCard">
                  <div className="label">{row.label}</div>
                  <div className="value">{row.value || DASH}</div>
                </div>
              ))}
            </div>

            {description ? (
              <div className="descriptionCard">
                <div className="label">Description</div>
                <div className="description">{description}</div>
              </div>
            ) : null}
          </section>
        </div>
      </div>

      <style jsx>{`
        .mediaModalOverlay {
          position: fixed;
          inset: 0;
          z-index: 10000;
          display: grid;
          place-items: center;
          padding: 22px;
          background: rgba(6, 11, 22, 0.72);
          backdrop-filter: blur(5px);
        }

        .mediaModalCard {
          position: relative;
          width: min(1320px, 96vw);
          max-height: min(92vh, 1100px);
          overflow: auto;
          padding: 14px 16px 16px;
          border-radius: 22px;
          border: 1px solid rgba(70, 98, 152, 0.35);
          background: linear-gradient(180deg, rgba(7, 14, 32, 0.97) 0%, rgba(8, 12, 25, 0.97) 100%);
          box-shadow: 0 28px 80px rgba(0, 0, 0, 0.52);
        }

        .closeButton {
          position: absolute;
          top: 10px;
          right: 10px;
          width: 44px;
          height: 44px;
          border: 1px solid rgba(86, 110, 160, 0.5);
          border-radius: 12px;
          background: rgba(10, 22, 49, 0.9);
          color: #d6deef;
          font-size: 30px;
          line-height: 1;
          cursor: pointer;
          z-index: 2;
        }

        .contentLayout {
          display: grid;
          grid-template-columns: 300px minmax(0, 1fr);
          gap: 18px;
          align-items: start;
        }

        .leftPane {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          min-width: 0;
        }

        .poster,
        .posterFallback {
          width: 100%;
          aspect-ratio: 2 / 3;
          border-radius: 16px;
          border: 1px solid rgba(80, 108, 164, 0.35);
        }

        .poster {
          display: block;
          object-fit: cover;
          box-shadow: 0 18px 40px rgba(0, 0, 0, 0.4);
        }

        .posterWrap {
          position: relative;
          width: 100%;
        }

        .replaceCoverButton {
          position: absolute;
          right: 10px;
          bottom: 10px;
          border: 1px solid rgba(95, 122, 177, 0.6);
          border-radius: 10px;
          background: rgba(9, 19, 40, 0.92);
          color: #d6e2ff;
          padding: 7px 10px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
        }

        .replaceCoverButton:disabled {
          opacity: 0.7;
          cursor: default;
        }

        .replaceCoverError {
          color: #ffb6b6;
          font-size: 12px;
          margin-top: 8px;
          line-height: 1.35;
        }

        .posterFallback {
          display: grid;
          place-items: center;
          color: #dce4f7;
          background: rgba(18, 30, 56, 0.7);
          font-weight: 700;
        }

        .title {
          margin: 14px 0 10px;
          color: #f4f7ff;
          font-size: 36px;
          line-height: 1.05;
          letter-spacing: 0.01em;
          font-weight: 800;
        }

        .chipWrap {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 10px;
        }

        .chip {
          border-radius: 999px;
          border: 1px solid rgba(90, 116, 170, 0.45);
          background: rgba(28, 42, 70, 0.65);
          color: #d6deef;
          font-size: 15px;
          font-weight: 700;
          line-height: 1;
          padding: 10px 16px;
        }

        .coverSourcePanel {
          width: 100%;
          margin: 2px 0 2px;
          border: 1px solid rgba(73, 102, 154, 0.35);
          border-radius: 14px;
          background: rgba(15, 24, 44, 0.62);
          padding: 10px;
        }

        .coverSourceHeading {
          color: rgba(178, 193, 224, 0.9);
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          margin-bottom: 2px;
        }

        .activeSource {
          color: #f0f4ff;
          font-size: 14px;
          font-weight: 700;
          margin-bottom: 8px;
        }

        .coverSourcesList {
          display: flex;
          flex-direction: column;
          gap: 8px;
          max-height: 160px;
          overflow: auto;
          padding-right: 2px;
        }

        .sourceItem {
          border-radius: 10px;
          border: 1px solid rgba(73, 102, 154, 0.28);
          background: rgba(11, 20, 38, 0.8);
          padding: 8px;
        }

        .sourceItem.active {
          border-color: rgba(57, 194, 179, 0.85);
          background: rgba(19, 52, 60, 0.52);
          box-shadow: inset 0 0 0 1px rgba(57, 194, 179, 0.24);
        }

        .sourceName {
          color: #dbe5fb;
          font-size: 12px;
          font-weight: 700;
          margin-bottom: 3px;
        }

        .sourceUrl {
          color: #9fb0d7;
          font-size: 11px;
          line-height: 1.35;
          word-break: break-all;
        }

        .rightPane {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .heroImage,
        .heroFallback {
          width: 100%;
          min-height: 280px;
          max-height: 420px;
          border-radius: 24px;
          border: 1px solid rgba(83, 111, 167, 0.32);
        }

        .heroImage {
          object-fit: cover;
          display: block;
        }

        .heroFallback {
          background:
            radial-gradient(circle at 70% 18%, rgba(59, 82, 128, 0.42), transparent 52%),
            linear-gradient(160deg, rgba(16, 30, 58, 0.85) 0%, rgba(9, 17, 35, 0.95) 100%);
        }

        .infoGrid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
        }

        .infoCard,
        .descriptionCard {
          border-radius: 20px;
          border: 1px solid rgba(73, 102, 154, 0.35);
          background: rgba(15, 24, 44, 0.72);
          padding: 14px 16px;
        }

        .label {
          color: rgba(178, 193, 224, 0.9);
          font-size: 15px;
          font-weight: 700;
          letter-spacing: 0.04em;
          margin-bottom: 6px;
        }

        .value {
          color: #f0f4ff;
          font-size: 20px;
          line-height: 1.25;
          font-weight: 700;
          min-height: 26px;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        :global(.ratingValue) {
          display: inline-flex;
          align-items: center;
          gap: 10px;
        }

        :global(.stars) {
          color: #2ab5ba;
          letter-spacing: 0.08em;
        }

        :global(.score) {
          color: #edf4ff;
          font-size: 20px;
          font-weight: 800;
        }

        .description {
          color: #e2e9fb;
          font-size: 16px;
          line-height: 1.4;
          white-space: pre-wrap;
        }

        @media (max-width: 1024px) {
          .contentLayout {
            grid-template-columns: minmax(0, 1fr);
          }

          .leftPane {
            max-width: 320px;
          }
        }

        @media (max-width: 680px) {
          .mediaModalOverlay {
            padding: 10px;
          }

          .mediaModalCard {
            width: 100%;
            padding: 10px 10px 12px;
            border-radius: 14px;
          }

          .closeButton {
            top: 8px;
            right: 8px;
            width: 38px;
            height: 38px;
            font-size: 25px;
          }

          .title {
            font-size: 26px;
          }

          .chip {
            font-size: 14px;
            padding: 8px 12px;
          }

          .coverSourcePanel {
            padding: 8px;
          }

          .coverSourcesList {
            max-height: 140px;
          }

          .heroImage,
          .heroFallback {
            min-height: 180px;
            border-radius: 14px;
          }

          .infoGrid {
            grid-template-columns: 1fr;
          }

          .infoCard,
          .descriptionCard {
            border-radius: 14px;
            padding: 12px;
          }

          .value {
            font-size: 16px;
          }

          :global(.score) {
            font-size: 18px;
          }

          .description {
            font-size: 15px;
          }
        }
      `}</style>
    </div>
  );
};
