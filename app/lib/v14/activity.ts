export type ActivityRow = {
  EventID?: string | null;
  ActivityID?: string | null;
  ActivityRole?: string | null;
  ItemID?: string | null;
  EventKind?: string | null;
  EpisodeID?: string | null;
  Timestamp: string | null;
  Source: string | null;
  Sheet: string | null;
  Title: string | null;
  Row: string | null;
  Field: string | null;
  "Old Value": string | null;
  "New Value": string | null;
  User: string | null;
  Function: string | null;
};

type RecordValue = Record<string, unknown>;

function record(value: unknown): value is RecordValue {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function text(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value);
}

function emptyRow(): ActivityRow {
  return { Timestamp: null, Source: null, Sheet: null, Title: null, Row: null, Field: null,
    "Old Value": null, "New Value": null, User: null, Function: null };
}

function legacyRow(value: unknown): ActivityRow | null {
  if (!record(value)) return null;
  const headers = value.headers;
  const cells = value.cells;
  if (!Array.isArray(headers) || !Array.isArray(cells)) return null;
  const fields: Record<string, string> = {};
  let unnamedValue = "";
  headers.forEach((header, index) => {
    const key = text(header)?.trim() ?? "";
    const cell = text(cells[index]) ?? "";
    if (!key) {
      if (cell && !unnamedValue) unnamedValue = cell;
    } else {
      fields[key] = cell;
    }
  });
  if (!fields.Function && unnamedValue) fields.Function = unnamedValue;

  // Match app/page.tsx's legacy shifted-header handling exactly.
  const rowAsTitle = fields.Row ?? "";
  const fieldAsRow = fields.Field ?? "";
  if (rowAsTitle && /^\d+$/.test(fieldAsRow)) {
    const shiftedFunction = unnamedValue || fields[""] || "";
    Object.assign(fields, {
      Title: rowAsTitle,
      Row: fieldAsRow,
      Field: fields["Old Value"] ?? "",
      "Old Value": fields["New Value"] ?? "",
      "New Value": fields.User ?? "",
      User: fields.Function ?? "",
      Function: shiftedFunction,
    });
  }
  const row = emptyRow();
  for (const key of Object.keys(row) as (keyof ActivityRow)[]) {
    if (Object.hasOwn(fields, key)) row[key] = fields[key] || null;
  }
  return row;
}

function labelField(key: string): string {
  return ({ user_status: "Status", personal_rating: "My Rating", completed_on: "Completed Date", notes: "Notes" } as Record<string, string>)[key] ?? key;
}

function entitySheet(value: unknown): string | null {
  return ({ book: "Books", movie: "Movies", tv: "Shows", game: "Games" } as Record<string, string>)[String(value)] ?? null;
}

function equalJson(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function diffRows(event: RecordValue): ActivityRow[] {
  const kind = text(event.entity_kind);
  const changes = record(event.changes) ? event.changes : {};
  const before = changes.before;
  const after = changes.after;
  const base = emptyRow();
  base.Timestamp = text(event.created_at);
  base.Source = "v14";
  base.EventKind = String(kind);
  if (typeof changes.activity_id === "string" && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(changes.activity_id) && ["user","metadata","artwork"].includes(String(changes.activity_role))) {
    base.ActivityID=changes.activity_id; base.ActivityRole=String(changes.activity_role);
  }
  if (typeof event.id === "string") base.EventID = event.id;
  if (typeof event.entity_id === "string" && kind !== "episode_progress") base.ItemID = event.entity_id;
  base.Row = text(event.source_row);

  if (["item", "full_edit", "create", "archive"].includes(String(kind))) {
    const beforeRow = record(before) ? before : {};
    const afterRow = record(after) ? after : {};
    base.Sheet = entitySheet(afterRow.media_type ?? beforeRow.media_type);
    base.Title = text(afterRow.title ?? beforeRow.title);
    const output: ActivityRow[] = [];
    const keys = ["title", "user_status", "personal_rating", "completed_on", "notes"];
    for (const key of keys) {
      if (!Object.hasOwn(beforeRow, key) && !Object.hasOwn(afterRow, key)) continue;
      if (equalJson(beforeRow[key], afterRow[key])) continue;
      const row = { ...base, Field: labelField(key) };
      row["Old Value"] = Object.hasOwn(beforeRow, key) ? text(beforeRow[key]) : null;
      row["New Value"] = Object.hasOwn(afterRow, key) ? text(afterRow[key]) : null;
      output.push(row);
    }
    const oldFields = record(beforeRow.user_fields) ? beforeRow.user_fields : {};
    const newFields = record(afterRow.user_fields) ? afterRow.user_fields : {};
    for (const key of new Set([...Object.keys(oldFields), ...Object.keys(newFields)])) {
      if (equalJson(oldFields[key], newFields[key])) continue;
      const providerScore = base.Sheet === "Games" && ["Rating","IGDB Rating"].includes(key);
      const row = { ...base, Field: providerScore ? "IGDB Rating" : key === "TMDB_Rating" ? "TMDB Rating" : ["MyRating","My Rating"].includes(key) ? "My Rating" : key };
      row["Old Value"] = Object.hasOwn(oldFields, key) ? text(oldFields[key]) : null;
      row["New Value"] = Object.hasOwn(newFields, key) ? text(newFields[key]) : null;
      if(providerScore) {
        const format=(value:string|null)=>{if(!value?.trim())return value;const n=Number(value);return Number.isFinite(n)&&n>=0&&n<=100?`${(n>10?n/10:n).toFixed(1)}/10`:value;};
        row["Old Value"]=format(row["Old Value"]);row["New Value"]=format(row["New Value"]);
      }
      output.push(row);
    }
    if (kind === "archive" && typeof changes.archived === "boolean") {
      const oldArchived = Object.hasOwn(beforeRow, "deleted_at") ? beforeRow.deleted_at !== null : null;
      output.push({ ...base, Field: "Archived", "Old Value": oldArchived === null ? null : String(oldArchived), "New Value": String(changes.archived) });
    }
    return output;
  }

  if (kind === "setting") {
    const input = record(changes.input) ? changes.input : {};
    const oldStoredValue = record(before) && Object.hasOwn(before, "value") ? before.value : undefined;
    const newStoredValue = record(after) && Object.hasOwn(after, "value") ? after.value : undefined;
    const oldValue = record(oldStoredValue) && Object.hasOwn(oldStoredValue, "value") ? oldStoredValue.value : oldStoredValue;
    const newValue = record(newStoredValue) && Object.hasOwn(newStoredValue, "value") ? newStoredValue.value : newStoredValue;
    base.Sheet = "Settings";
    base.Field = text(input.key);
    base["Old Value"] = oldValue === undefined ? null : text(oldValue);
    base["New Value"] = newValue === undefined ? null : text(newValue);
    return [base];
  }

  if (kind === "episode_progress") {
    base.Sheet = "TV Episodes";
    const oldRows = Array.isArray(before) ? before : [];
    const newRows = Array.isArray(after) ? after : [];
    const output: ActivityRow[] = [];
    for (let index = 0; index < newRows.length; index++) {
      const current = record(newRows[index]) ? newRows[index] : {};
      const previous = oldRows.find((entry) => record(entry) && entry.episode_id === current.episode_id);
      for (const key of ["watched", "watched_at"]) {
        if (!Object.hasOwn(current, key)) continue;
        const oldEntry = record(previous) ? previous : {};
        if (Object.hasOwn(oldEntry, key) && equalJson(oldEntry[key], current[key])) continue;
        const row = { ...base, EpisodeID: text(current.episode_id) || "", Field: key === "watched" ? "Watched" : "Watched At" };
        row["Old Value"] = Object.hasOwn(oldEntry, key) ? text(oldEntry[key]) : null;
        row["New Value"] = text(current[key]);
        output.push(row);
      }
    }
    return output;
  }

  if (kind === "episode_metadata") {
    base.Sheet = "TV Episodes";
    const inputs = Array.isArray(changes.input) ? changes.input : [];
    const oldRows = Array.isArray(before) ? before : [];
    const output: ActivityRow[] = [];
    for (let index = 0; index < inputs.length; index++) {
      const input = record(inputs[index]) ? inputs[index] : {};
      const oldRow = record(oldRows[index]) ? oldRows[index] : {};
      const oldMetadata = record(oldRow.metadata) ? oldRow.metadata : {};
      const newMetadata = record(input.metadata) ? input.metadata : {};
      for (const [key, newValue] of Object.entries(newMetadata)) {
        if (Object.hasOwn(oldMetadata, key) && equalJson(oldMetadata[key], newValue)) continue;
        const row = { ...base, Field: key };
        row["Old Value"] = Object.hasOwn(oldMetadata, key) ? text(oldMetadata[key]) : null;
        row["New Value"] = text(newValue);
        output.push(row);
      }
    }
    return output;
  }
  return [];
}

export function projectActivity(payload: unknown): ActivityRow[] {
  if (!record(payload) || Object.keys(payload).some((key) => key !== "changelog" && key !== "events") ||
      !Object.hasOwn(payload, "changelog") || !Object.hasOwn(payload, "events") ||
      !Array.isArray(payload.changelog) || !Array.isArray(payload.events)) {
    throw new Error("Invalid activity response");
  }
  const imported: ActivityRow[] = [];
  for (const entry of payload.changelog) {
    const row = legacyRow(entry);
    if (!row || !record(entry) || !Number.isSafeInteger(entry.source_row) || Number(entry.source_row) < 1) {
      throw new Error("Invalid activity response");
    }
    imported.push(row);
  }
  const events: ActivityRow[] = [];
  for (const event of payload.events) {
    if (!record(event) || typeof event.entity_kind !== "string" || typeof event.created_at !== "string" || !record(event.changes) ||
        (event.source_row !== null && event.source_row !== undefined && (!Number.isSafeInteger(event.source_row) || Number(event.source_row) < 1))) {
      throw new Error("Invalid activity response");
    }
    // Unknown kinds can be skipped after validating the event envelope.
    events.push(...diffRows(event));
  }
  return [...imported, ...events]
    .sort((a, b) => (b.Timestamp ?? "").localeCompare(a.Timestamp ?? ""))
    .slice(0, 400);
}
