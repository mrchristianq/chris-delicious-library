// Pure, non-writing three-way comparison. Identity must be resolved before entry.
export type TrackerValue = string | number | boolean | null;
export type TrackerField = { key: string; label: string };
export type TrackerRecord = { id: string; title: string; media: string; fields: Record<string, TrackerValue> };
export type TrackerChange = {
  id: string; itemId: string; title: string; media: string; field: string; label: string;
  app: TrackerValue; tracker: TrackerValue; baseline?: TrackerValue;
  direction: "export" | "import" | "conflict" | "review";
  reason?: string;
  resolutionAllowed?:boolean;
  decisionToken?:string;
  decisionRevision?:number|null;
  savedChoice?:"app"|"tracker";
  plannedAction?:"provider-correction"|"duplicate-cleanup"|"add-record"|"import-record";
  proposedFields?:Record<string,TrackerValue>;
  displayRecord?:{coverUrl:string;app:Record<string,TrackerValue>;tracker:Record<string,TrackerValue>;candidate?:boolean};
  identitySelection?:{token:string;revision:number|null;fields:string[];ready?:boolean;reason?:string;choice?:{mode:"same"|"separate";fields:Record<string,"app"|"tracker">}};
  blockedField?:boolean;
  repairApproved?:boolean;
  planApproved?:boolean;
  identityReview?: {
    kind:"new-tracker-record"|"duplicate-tracker-record"|"possible-existing-record"|"missing-tracker-record"|"missing-app-record";
    tab:string;
    rows:number[];
    identity:Record<string,string>;
    candidates:Array<{title:string;provider:string;edition:string}>;
    guidance:string;
  };
};
const forbidden = /notes|episode|watched_at|progress/i;
const validValue = (value: unknown): value is TrackerValue => value === null ||
  typeof value === "string" || typeof value === "boolean" ||
  (typeof value === "number" && Number.isFinite(value));
export function compareTracker(
  app: TrackerRecord[], tracker: TrackerRecord[], fields: TrackerField[],
  baselines: Record<string, Record<string, TrackerValue>>,
): TrackerChange[] {
  if (!fields.length || fields.some(f => !f.key.trim() || f.key !== f.key.trim() ||
    (forbidden.test(f.key) && !/^NumberOfEpisodes$/i.test(f.key))) || new Set(fields.map(f => f.key)).size !== fields.length) {
    throw new Error("Tracker mapping must contain unique approved fields; notes and episode progress are excluded.");
  }
  const index = (rows: TrackerRecord[]) => {
    const map = new Map<string, TrackerRecord>();
    for (const row of rows) {
      if (!row.id || map.has(row.id)) throw new Error("Unresolved or duplicate tracker identity.");
      map.set(row.id, row);
    }
    return map;
  };
  const a = index(app), b = index(tracker), result: TrackerChange[] = [];
  for (const id of new Set([...a.keys(), ...b.keys()])) {
    const left = a.get(id), right = b.get(id), row = left ?? right!;
    for (const field of fields) {
      const hasApp = !!left && Object.hasOwn(left.fields, field.key);
      const hasTracker = !!right && Object.hasOwn(right.fields, field.key);
      // Missing rows/columns are review conditions, never inferred deletions or clears.
      if (!hasApp || !hasTracker) {
        result.push({id: JSON.stringify([id,field.key]), itemId:id, title:row.title, media:row.media,
          field:field.key,label:field.label,app:hasApp?left!.fields[field.key]:null,
          tracker:hasTracker?right!.fields[field.key]:null,direction:"review",reason:"Missing row or mapped field. Review identity/columns before syncing."});
        continue;
      }
      const av = left!.fields[field.key], bv = right!.fields[field.key];
      if (!validValue(av) || !validValue(bv)) throw new Error("Invalid tracker comparison value.");
      if (Object.is(av, bv)) continue;
      const base = Object.hasOwn(baselines,id) ? baselines[id] : undefined;
      const known = !!base && Object.hasOwn(base,field.key);
      const baseline = known ? base![field.key] : undefined;
      if (known && !validValue(baseline)) throw new Error("Invalid confirmed baseline value.");
      const direction = !known ? "review" : Object.is(av,baseline) ? "import" : Object.is(bv,baseline) ? "export" : "conflict";
      result.push({id:JSON.stringify([id,field.key]),itemId:id,title:row.title,media:row.media,field:field.key,label:field.label,
        app:av,tracker:bv,...(known?{baseline}:{}),direction,
        ...(!known?{reason:"No confirmed baseline. Choose explicitly during initial reconciliation."}:{})});
    }
  }
  return result;
}

export type TrackerPreview = {
  syncedRecords?:number;
  activeRun?:string|null;
  comparisonMode?:"three-way";
  status:"connection-required" | "mapping-required" | "initial-review" | "ready";
  message:string;
  changes:TrackerChange[];
  observedAt:string;
  lastConfirmedSync:string|null;
  canSaveDecisions?:boolean;
  matchedRecords?:number;
  identityIssues?:number;
  dataIssues?:number;
  reviewToken?:string;
  reviewBatchRevision?:number|null;
  reviewComplete?:boolean;
  trackerAppliedAt?:string;
};
