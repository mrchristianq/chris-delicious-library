import { conflictDecisionKey, conflictDecisionValue } from "./tracker-conflict-decisions";
import { identityDecisionKey, identityDecisionValue } from "./tracker-identity-decisions";
import { newItemDecisionKey, newItemDecisionValue } from "./tracker-new-decisions";
import type { TrackerChange } from "./tracker-preview";

export type ReviewChoice = { changeId: string; token: string; side: "app" | "tracker" | "clear"; revision: number | null; requestId: string };
export type ReviewWrite = ReviewChoice & { key: string; value: string };

/** Resolve every choice before any preference is written. Library/Sheet writes are separate. */
export function prepareReviewChoices(libraryId: string, rows: TrackerChange[], choices: ReviewChoice[]): ReviewWrite[] {
  const byId = new Map(rows.map(row => [row.id, row]));
  const seen = new Set<string>();
  return choices.map(choice => {
    const row = byId.get(choice.changeId);
    if (seen.has(choice.changeId) || !row || row.resolutionAllowed !== true || row.decisionToken !== choice.token || row.identitySelection || row.blockedField) throw new Error("Comparison changed. Check the latest values before applying.");
    seen.add(choice.changeId);
    if (row.plannedAction === "import-record") {
      if (choice.side === "app") throw new Error("New Sheet items require an explicit import approval.");
      return { ...choice, key: newItemDecisionKey(libraryId, row), value: newItemDecisionValue(choice.token, choice.side) };
    }
    if (row.plannedAction === "add-record" || row.plannedAction === "provider-correction") {
      if (choice.side === "tracker" || row.field !== "identity") throw new Error("Confirm the app identification values for this item.");
      return { ...choice, key: identityDecisionKey(libraryId, row), value: identityDecisionValue(choice.token, choice.side) };
    }
    if (row.plannedAction || row.field === "identity" || !["import", "export", "conflict"].includes(row.direction)) throw new Error("This item needs a separate review.");
    return { ...choice, key: conflictDecisionKey(libraryId, row), value: conflictDecisionValue(choice.token, choice.side) };
  });
}

type Setting = { key: string; revision: number; value: { value?: unknown; legacy_profiles?: unknown } };
type Writer = {
  write: (command: ReviewWrite) => Promise<unknown>;
  read: () => Promise<{ owner_id: string; library_id: string; settings: Setting[] }>;
};

/** Bounded concurrent preference writes followed by one fresh, owner-scoped readback. */
export async function persistReviewChoices(writer: Writer, ownerId: string, libraryId: string, commands: ReviewWrite[]) {
  for (let offset = 0; offset < commands.length; offset += 4) {
    const outcomes = await Promise.allSettled(commands.slice(offset, offset + 4).map(async command => {
      const receipt = await writer.write(command) as { library_id?: string; key?: string; revision?: number; value?: { value?: unknown } } | null;
      if (!receipt || receipt.library_id !== libraryId || receipt.key !== command.key || receipt.revision !== (command.revision ?? 0) + 1 || receipt.value?.value !== command.value) throw new Error("Choice receipt was not confirmed.");
    }));
    if (outcomes.some(outcome => outcome.status === "rejected")) throw new Error("Choices were not fully confirmed. Retry safely; no library or Sheet values were applied.");
  }
  const fresh = await writer.read();
  if (fresh.owner_id !== ownerId || fresh.library_id !== libraryId) throw new Error("Choice readback has the wrong owner or library.");
  const saved = new Map(fresh.settings.map(setting => [setting.key, setting]));
  for (const command of commands) {
    const setting = saved.get(command.key);
    if (!setting || setting.revision !== (command.revision ?? 0) + 1 || setting.value.value !== command.value || setting.value.legacy_profiles !== undefined) throw new Error("Choice readback was not confirmed.");
  }
  return commands.map(({ changeId, token, side, revision, requestId }) => ({ changeId, token, side, revision: (revision ?? 0) + 1, requestId }));
}
