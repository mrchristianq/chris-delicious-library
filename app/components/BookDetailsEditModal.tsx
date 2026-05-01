"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type BookDetailsEditModalProps = {
  open: boolean;
  item: Record<string, unknown> | null;
  popupCoverMode?: "custom" | "default";
  isReplacingCover?: boolean;
  replaceCoverError?: string | null;
  onClose: () => void;
  onSave: (item: Record<string, unknown>, updates: Record<string, string>) => Promise<void> | void;
  onReplaceCover: (item: Record<string, unknown>, file: File) => Promise<void> | void;
  onCoverModeChange: (item: Record<string, unknown>, mode: "custom" | "default") => void;
};

type FieldDef = {
  key: string;
  label: string;
  multiline?: boolean;
};

const BOOK_FIELDS: FieldDef[] = [
  { key: "title", label: "Title" },
  { key: "subtitle", label: "Subtitle" },
  { key: "series", label: "Series" },
  { key: "author", label: "Author" },
  { key: "ownership", label: "Ownership" },
  { key: "type", label: "Type" },
  { key: "status", label: "Status" },
  { key: "completedDate", label: "Completed Date" },
  { key: "isbn", label: "ISBN" },
  { key: "releaseDate", label: "Release Date" },
  { key: "imageUrl", label: "Image URL" },
  { key: "customImageUrl", label: "Custom URL" },
  { key: "userRating", label: "User Rating" },
  { key: "myRating", label: "My Rating" },
  { key: "pages", label: "Pages" },
  { key: "audiobookDuration", label: "Audiobook Duration" },
  { key: "genre", label: "Genre" },
  { key: "tags", label: "Tags" },
  { key: "description", label: "Description", multiline: true },
];

function safeStr(value: unknown): string {
  return String(value ?? "").trim();
}

function firstNonEmpty(item: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = item[key as keyof typeof item];
    const text = safeStr(value);
    if (text) return text;
  }
  return "";
}

function buildBookEditValues(item: Record<string, unknown>): Record<string, string> {
  return {
    title: firstNonEmpty(item, ["title", "Title"]),
    subtitle: firstNonEmpty(item, ["subtitle", "Subtitle"]),
    series: firstNonEmpty(item, ["series", "Series"]),
    author: firstNonEmpty(item, ["author", "Author"]),
    ownership: firstNonEmpty(item, ["ownership", "Ownership"]),
    type: firstNonEmpty(item, ["types", "type", "Type"]),
    status: firstNonEmpty(item, ["status", "Status"]),
    completedDate: firstNonEmpty(item, ["completedDate", "CompletedDate", "Completed Date", "Date Completed"]),
    isbn: firstNonEmpty(item, ["isbn", "ISBN", "isbn13", "ISBN13", "isbn10", "ISBN10"]),
    releaseDate: firstNonEmpty(item, ["releaseDate", "ReleaseDate"]),
    imageUrl: firstNonEmpty(item, ["imageUrl", "ImageURL", "Image URL"]),
    customImageUrl: firstNonEmpty(item, ["customImageUrl", "CustomURL", "Custom URL", "CustomImageURL"]),
    userRating: firstNonEmpty(item, ["userRating", "UserRating", "externalAverageRating"]),
    myRating: firstNonEmpty(item, ["myRating", "My Rating", "MyRating"]),
    pages: firstNonEmpty(item, ["pages", "Pages"]),
    audiobookDuration: firstNonEmpty(item, ["audiobookDuration", "AudiobookDuration"]),
    genre: firstNonEmpty(item, ["genre", "Genre", "categories", "Categories"]),
    tags: firstNonEmpty(item, ["tags", "Tags", "tag", "Tag"]),
    openLibraryWorkKey: firstNonEmpty(item, ["openLibraryWorkKey", "OpenLibraryWorkKey"]),
    googleBooksVolumeId: firstNonEmpty(item, ["googleBooksVolumeId", "GoogleBooksVolumeId"]),
    description: firstNonEmpty(item, ["description", "Description"]),
  };
}

export function BookDetailsEditModal({
  open,
  item,
  popupCoverMode,
  isReplacingCover = false,
  replaceCoverError,
  onClose,
  onSave,
  onReplaceCover,
  onCoverModeChange,
}: BookDetailsEditModalProps) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [selectedMode, setSelectedMode] = useState<"custom" | "default">("default");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open || !item) return;
    setValues(buildBookEditValues(item));
    setSaveError(null);
    setSaveSuccess(null);
  }, [open, item]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isSaving) onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isSaving, onClose, open]);

  const coverCandidates = useMemo(() => {
    if (!item || !Array.isArray(item.coverCandidates)) return [] as Array<{ label?: string; url?: string }>;
    return item.coverCandidates
      .map((candidate) => {
        if (!candidate || typeof candidate !== "object") return null;
        const c = candidate as { label?: unknown; url?: unknown };
        const url = safeStr(c.url);
        if (!url) return null;
        return { label: safeStr(c.label), url };
      })
      .filter(Boolean) as Array<{ label?: string; url?: string }>;
  }, [item]);
  const customCoverCandidate = useMemo(
    () => coverCandidates.find((candidate) => {
        const label = safeStr(candidate.label).toLowerCase();
        return label.includes("override") || label.includes("custom");
      }),
    [coverCandidates]
  );
  const customUrl = safeStr(customCoverCandidate?.url);
  const defaultUrl = safeStr(item?.imageUrl || item?.ImageURL || item?.["Image URL"] || item?.Image);
  const customSourceUrl = safeStr(item?.customImageUrl || item?.CustomURL || item?.CustomImageURL);
  const backupUrl = safeStr(item?.coverOverrideUrl || customUrl);
  const activeMode = selectedMode;
  const previewUrl = activeMode === "custom" ? customSourceUrl || defaultUrl || backupUrl : defaultUrl || customSourceUrl || backupUrl;
  const hasCustomCover = Boolean(customSourceUrl);

  useEffect(() => {
    if (!open) return;
    const nextMode = popupCoverMode || (customSourceUrl ? "custom" : "default");
    setSelectedMode(nextMode);
  }, [customSourceUrl, open, popupCoverMode]);

  if (!open || !item) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 9000,
        background: "rgba(7, 10, 16, 0.42)",
        backdropFilter: "blur(14px) saturate(1.08)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 10,
        }}
      onClick={() => {
        if (!isSaving) onClose();
      }}
    >
      <div
        style={{
          width: "min(1300px, 100%)",
          maxHeight: "calc(100vh - 20px)",
          overflow: "auto",
          borderRadius: 18,
          border: "1px solid rgba(255,255,255,0.55)",
          background: "linear-gradient(180deg, rgba(251,252,254,0.96) 0%, rgba(241,244,249,0.98) 100%)",
          boxShadow: "0 24px 48px rgba(15,23,40,0.26), inset 0 1px 0 rgba(255,255,255,0.86)",
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", borderBottom: "1px solid rgba(167,177,191,0.42)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#ff5f57" }} />
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#febc2e" }} />
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#28c840" }} />
            <div style={{ marginLeft: 8, fontSize: 13, fontWeight: 650, color: "#1d2735" }}>Edit Book</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            style={{ border: "1px solid rgba(149,161,178,0.5)", borderRadius: 8, padding: "6px 10px", background: "rgba(255,255,255,0.86)", color: "#243244", cursor: "pointer", fontSize: 12, fontWeight: 650 }}
          >
            Close
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "minmax(184px, 220px) minmax(0,1fr)", gap: 12, padding: 12 }}>
          <div style={{ border: "1px solid rgba(167,177,191,0.42)", borderRadius: 12, background: "rgba(255,255,255,0.78)", padding: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 0.3, color: "#516279" }}>COVER</div>
            <div style={{ marginTop: 8 }}>
              {previewUrl ? (
                <img src={previewUrl} alt={safeStr(item.title) || "Book cover"} style={{ width: "100%", borderRadius: 8, display: "block", objectFit: activeMode === "custom" ? "contain" : "cover", maxHeight: 250 }} />
              ) : (
                <div style={{ height: 180, borderRadius: 8, border: "1px dashed rgba(149,161,178,0.58)", display: "flex", alignItems: "center", justifyContent: "center", color: "#5f6e82", fontSize: 11 }}>
                  No cover
                </div>
              )}
            </div>
            <div style={{ marginTop: 8, display: "inline-flex", border: "1px solid rgba(149,161,178,0.5)", borderRadius: 999, overflow: "hidden" }}>
              <button
                type="button"
                onClick={() => setSelectedMode("default")}
                style={{ border: "none", padding: "6px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer", background: activeMode === "default" ? "rgba(32,94,252,0.14)" : "transparent", color: activeMode === "default" ? "#1a4dd7" : "#394b62" }}
              >
                Default
              </button>
              <button
                type="button"
                onClick={() => setSelectedMode("custom")}
                style={{ border: "none", borderLeft: "1px solid rgba(149,161,178,0.5)", padding: "6px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer", background: activeMode === "custom" ? "rgba(32,94,252,0.14)" : "transparent", color: activeMode === "custom" ? "#1a4dd7" : "#394b62" }}
              >
                Custom
              </button>
            </div>
            <div style={{ marginTop: 8, fontSize: 10.5, color: "#5f6e82" }}>
              {activeMode === "default"
                ? "Using spreadsheet cover."
                : hasCustomCover
                  ? "Using custom uploaded cover."
                  : "No custom cover yet. Upload one below."}
            </div>
            <div style={{ marginTop: 8, display: "grid", gap: 5 }}>
              <div style={{ fontSize: 10, color: "#3f4d61", wordBreak: "break-all" }}>
                <strong>ImageURL:</strong> {defaultUrl || "—"}
              </div>
              <div style={{ fontSize: 10, color: "#3f4d61", wordBreak: "break-all" }}>
                <strong>CustomURL:</strong> {customSourceUrl || "—"}
              </div>
              <div style={{ fontSize: 10, color: "#3f4d61", wordBreak: "break-all" }}>
                <strong>R2 Backup:</strong> {backupUrl || "—"}
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={async (event) => {
                const file = event.target.files?.[0];
                event.currentTarget.value = "";
                if (!file) return;
                await Promise.resolve(onReplaceCover(item, file));
              }}
            />
            <button
              type="button"
              disabled={isReplacingCover}
              onClick={() => fileInputRef.current?.click()}
              style={{ marginTop: 8, width: "100%", border: "1px solid rgba(149,161,178,0.5)", borderRadius: 9, padding: "8px 9px", background: "rgba(255,255,255,0.9)", color: "#243244", fontSize: 11, fontWeight: 700, cursor: "pointer" }}
            >
              {isReplacingCover ? "Uploading..." : "Upload Custom Cover"}
            </button>
            {replaceCoverError ? <div style={{ marginTop: 6, color: "#b4232f", fontSize: 11 }}>{replaceCoverError}</div> : null}
          </div>

          <div style={{ border: "1px solid rgba(167,177,191,0.42)", borderRadius: 12, background: "rgba(255,255,255,0.78)", padding: 10 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 8 }}>
              {BOOK_FIELDS.map((field) => (
                <label key={field.key} style={{ display: "flex", flexDirection: "column", gap: 6, gridColumn: field.multiline ? "1 / -1" : undefined }}>
                  <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: 0.25, color: "#516279" }}>{field.label}</span>
                  {field.multiline ? (
                    <textarea
                      value={values[field.key] || ""}
                      onChange={(event) => setValues((prev) => ({ ...prev, [field.key]: event.target.value }))}
                      rows={5}
                      style={{ border: "1px solid rgba(149,161,178,0.52)", borderRadius: 9, padding: "8px 9px", background: "rgba(255,255,255,0.94)", fontSize: 12, color: "#1c2738", resize: "vertical" }}
                    />
                  ) : (
                    <input
                      value={values[field.key] || ""}
                      onChange={(event) => setValues((prev) => ({ ...prev, [field.key]: event.target.value }))}
                      style={{ border: "1px solid rgba(149,161,178,0.52)", borderRadius: 9, padding: "8px 9px", background: "rgba(255,255,255,0.94)", fontSize: 12, color: "#1c2738" }}
                    />
                  )}
                </label>
              ))}
            </div>
            <div style={{ marginTop: 10, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <div style={{ fontSize: 11, color: saveError ? "#b4232f" : "#335480" }}>{saveError || saveSuccess || " "}</div>
              <button
                type="button"
                disabled={isSaving}
                onClick={async () => {
                  setIsSaving(true);
                  setSaveError(null);
                  setSaveSuccess(null);
                  try {
                    const nextValues = { ...values };
                    if (activeMode === "default") {
                      nextValues.customImageUrl = "";
                    } else if (!safeStr(nextValues.customImageUrl)) {
                      throw new Error("Custom mode requires a Custom URL (or upload a custom cover first).");
                    }
                    await Promise.resolve(onSave(item, nextValues));
                    onCoverModeChange(
                      {
                        ...item,
                        imageUrl: nextValues.imageUrl,
                        customImageUrl: nextValues.customImageUrl,
                        ImageURL: nextValues.imageUrl,
                        CustomURL: nextValues.customImageUrl,
                        CustomImageURL: nextValues.customImageUrl,
                      },
                      activeMode
                    );
                    setSaveSuccess("Saved to Google Sheet.");
                  } catch (error: unknown) {
                    const message = error instanceof Error ? error.message : "Failed to save book changes";
                    setSaveError(message);
                  } finally {
                    setIsSaving(false);
                  }
                }}
                style={{ border: "1px solid rgba(27,83,217,0.5)", borderRadius: 9, padding: "8px 12px", background: "linear-gradient(180deg, rgba(86,150,255,0.95) 0%, rgba(45,109,237,0.98) 100%)", color: "#f6f9ff", fontSize: 12, fontWeight: 750, cursor: "pointer" }}
              >
                {isSaving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
