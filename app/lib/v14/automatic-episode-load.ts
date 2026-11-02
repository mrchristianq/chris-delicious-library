/** Per mounted details screen, including failed/empty attempts. Manual refresh
 * bypasses this gate. Dependency changes must not create network retries. */
export function createAutomaticEpisodeLoader<T>() {
  const attempts = new Map<string, Promise<T>>();
  return (showKey: string, load: () => Promise<T>): Promise<T> => {
    let attempt = attempts.get(showKey);
    if (!attempt) {
      attempt = Promise.resolve().then(load);
      attempts.set(showKey, attempt);
    }
    return attempt;
  };
}
