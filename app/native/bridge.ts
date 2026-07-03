"use client";

type Row = Record<string, string>;

export type NativeSnapshot = {
  tvRows: Row[];
  tvEpisodeRows?: Row[];
  bookRows: Row[];
  movieRows: Row[];
  gameRows: Row[];
  settingsRows: Row[];
  lastSyncAt?: number | null;
  pendingCount: number;
};

export type NativeCacheSummary = {
  cached: number;
  skipped: number;
  failed: number;
};

export type NativeCacheStatus = {
  cachedCovers: number;
  totalCovers: number;
  cachedBackdrops: number;
  totalBackdrops: number;
  cachedCastPhotos: number;
  totalCastPhotos: number;
  cachedAssets: number;
};

export type NativeIconCacheRequest = {
  iconType: "sidebar" | "status";
  iconKey: string;
  remoteUrl: string;
};

export type NativeIconCacheResult = NativeIconCacheRequest & {
  localPath?: string | null;
  url?: string;
};

export type NativeSheetWrite = {
  url: string;
  payload: Record<string, unknown>;
  fallbackMessage: string;
};

export type NativeItemWrite = {
  mediaType: "book" | "movie" | "tv" | "game";
  itemKey: string;
  row: Row;
};

export type NativeSettingWrite = {
  key: string;
  value: string;
  category?: string;
  description?: string;
};

export type NativeAssetImport = {
  sourcePath: string;
  mediaType?: "book" | "movie" | "tv" | "game";
  itemKey?: string;
  kind: "cover" | "backdrop" | "icon" | "media";
  assetKey: string;
};

export type NativeAssetBytes = {
  bytes: number[];
  filename?: string;
  contentType?: string;
  mediaType?: string;
  itemKey?: string;
  title?: string;
  objectKey?: string;
  kind: "cover" | "backdrop" | "icon" | "media";
  assetKey: string;
};

export type NativeSeedSnapshot = {
  tvRows: Row[];
  tvEpisodeRows?: Row[];
  bookRows: Row[];
  movieRows: Row[];
  gameRows: Row[];
  settingsRows: Row[];
};

type TauriCore = {
  invoke<T>(command: string, args?: Record<string, unknown>): Promise<T>;
  convertFileSrc(path: string, protocol?: string): string;
};

const nativeBuildFlag = process.env.NEXT_PUBLIC_NATIVE_APP === "true";

export function isNativeRuntime(): boolean {
  return (
    nativeBuildFlag &&
    typeof window !== "undefined" &&
    Boolean((window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__)
  );
}

async function getTauriCore(): Promise<TauriCore> {
  return await import("@tauri-apps/api/core");
}

async function filePathToAssetUrl(path: string): Promise<string> {
  const { convertFileSrc } = await getTauriCore();
  return convertFileSrc(path);
}

async function hydrateNativeAssetUrls(rows: Row[]): Promise<Row[]> {
  const { convertFileSrc } = await getTauriCore();
  return rows.map((row) => {
    const next = { ...row };
    const coverPath = String(next.NativeCoverPath || "").trim();
    const backdropPath = String(next.NativeBackdropPath || "").trim();
    const castPaths = String(next.NativeTopcastPhotoPaths || "").trim();

    if (coverPath) {
      const url = convertFileSrc(coverPath);
      next.nativeCoverUrl = url;
      next.NativeCoverUrl = url;
    }
    if (backdropPath) {
      const url = convertFileSrc(backdropPath);
      next.nativeBackdropUrl = url;
      next.NativeBackdropUrl = url;
    }
    if (castPaths) {
      const urls = castPaths
        .split(",")
        .map((path) => path.trim())
        .filter(Boolean)
        .map((path) => convertFileSrc(path))
        .join(",");
      next.nativeTopcastPhotos = urls;
      next.NativeTopcastPhotos = urls;
    }
    return next;
  });
}

export async function nativeReadSnapshot(): Promise<NativeSnapshot> {
  const { invoke } = await getTauriCore();
  const snapshot = await invoke<NativeSnapshot>("read_snapshot");
  return {
    ...snapshot,
    tvRows: await hydrateNativeAssetUrls(snapshot.tvRows),
    tvEpisodeRows: snapshot.tvEpisodeRows || [],
    bookRows: await hydrateNativeAssetUrls(snapshot.bookRows),
    movieRows: await hydrateNativeAssetUrls(snapshot.movieRows),
    gameRows: await hydrateNativeAssetUrls(snapshot.gameRows),
  };
}

export async function nativeSeedSnapshot(snapshot: NativeSeedSnapshot): Promise<void> {
  const { invoke } = await getTauriCore();
  await invoke("seed_snapshot", { snapshot });
}

export async function nativeQueueSheetWrite(write: NativeSheetWrite): Promise<number> {
  const { invoke } = await getTauriCore();
  return await invoke("queue_sheet_write", { write });
}

export async function nativeSaveItem(write: NativeItemWrite): Promise<void> {
  const { invoke } = await getTauriCore();
  await invoke("save_item", { write });
}

export async function nativeDeleteItem(mediaType: NativeItemWrite["mediaType"], itemKey: string): Promise<void> {
  const { invoke } = await getTauriCore();
  await invoke("delete_item", { mediaType, itemKey });
}

export async function nativeSaveSetting(write: NativeSettingWrite): Promise<void> {
  const { invoke } = await getTauriCore();
  await invoke("save_setting", { write });
}

export async function nativeImportAsset(asset: NativeAssetImport): Promise<{ assetKey: string; localPath: string; sha256: string; pendingSync: boolean }> {
  const { invoke } = await getTauriCore();
  return await invoke("import_asset", { asset });
}

export async function nativeSaveAssetBytes(asset: NativeAssetBytes): Promise<{ assetKey: string; localPath: string; url: string; remoteUrl?: string; remoteObjectKey?: string; sha256: string; pendingSync: boolean }> {
  const { invoke } = await getTauriCore();
  const result = await invoke<{ assetKey: string; localPath: string; remoteUrl?: string; remoteObjectKey?: string; sha256: string; pendingSync: boolean }>("save_asset_bytes", { asset });
  return {
    ...result,
    url: await filePathToAssetUrl(result.localPath),
  };
}

export async function nativeSyncNow(targetId?: number): Promise<{ pushed: number; pulled: number; skipped: number; failed?: number; pending: number; syncedIds?: number[] }> {
  const { invoke } = await getTauriCore();
  return await invoke("sync_now", targetId ? { targetId } : {});
}

export async function nativeCacheRemoteMedia(limit = 300): Promise<NativeCacheSummary> {
  const { invoke } = await getTauriCore();
  return await invoke("cache_remote_media", { limit });
}

export async function nativeCacheIcons(icons: NativeIconCacheRequest[]): Promise<NativeIconCacheResult[]> {
  const { invoke, convertFileSrc } = await getTauriCore();
  const results = await invoke<NativeIconCacheResult[]>("cache_icons", { icons });
  return results.map((result) => ({
    ...result,
    url: result.localPath ? convertFileSrc(result.localPath) : undefined,
  }));
}

export async function nativeReadCacheStatus(): Promise<NativeCacheStatus> {
  const { invoke } = await getTauriCore();
  return await invoke("cache_status");
}

export async function nativeReadRoadmap(): Promise<unknown[]> {
  const { invoke } = await getTauriCore();
  return await invoke("read_roadmap");
}

export async function nativeSaveRoadmap(items: unknown[]): Promise<void> {
  const { invoke } = await getTauriCore();
  await invoke("save_roadmap", { items });
}

export async function nativeOpenExternalUrl(url: string): Promise<void> {
  const { invoke } = await getTauriCore();
  await invoke("open_external_url", { url });
}

export async function nativeResolveIgdbUrl(query: string, year?: string): Promise<string> {
  const { invoke } = await getTauriCore();
  return await invoke("resolve_igdb_url", { query, year: year || null });
}

export async function nativeLoadTvEpisodes(tmdbId: string, title?: string): Promise<Row[]> {
  const { invoke } = await getTauriCore();
  return await invoke<Row[]>("load_tv_episodes", { tmdbId, title: title || "" });
}

export async function nativeDiscoverIgdbGames(genreIds: number[] = []): Promise<Record<string, unknown>[]> {
  const { invoke } = await getTauriCore();
  return await invoke("discover_igdb_games", { genreIds });
}
