/** Coalesce focus/visibility events from the same activation. No cached data or
 * timer-based freshness claim: each activation requests a new backend read. */
export function subscribeLibraryRefresh(
  windowTarget: EventTarget,
  documentTarget: EventTarget & { visibilityState: string },
  refresh: () => void,
) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const schedule = () => {
    if (documentTarget.visibilityState !== "visible" || timer !== undefined) return;
    timer = setTimeout(() => { timer = undefined; refresh(); }, 0);
  };
  windowTarget.addEventListener("focus", schedule);
  windowTarget.addEventListener("online", schedule);
  documentTarget.addEventListener("visibilitychange", schedule);
  return () => {
    windowTarget.removeEventListener("focus", schedule);
    windowTarget.removeEventListener("online", schedule);
    documentTarget.removeEventListener("visibilitychange", schedule);
    if (timer !== undefined) clearTimeout(timer);
  };
}
