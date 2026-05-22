export type LibraryRow = Record<string, string>;
export type MediaType = "book" | "movie" | "tv" | "game";

export type LibrarySnapshot = {
  tvRows: LibraryRow[];
  bookRows: LibraryRow[];
  movieRows: LibraryRow[];
  gameRows: LibraryRow[];
  settingsRows: LibraryRow[];
};

export type SheetWriteRequest = {
  url: string;
  payload: Record<string, unknown>;
  fallbackMessage: string;
};

export type UploadAssetRequest = {
  file?: File;
  sourceUrl?: string;
  mediaType: MediaType | "media";
  itemKey: string;
  title: string;
  objectKey?: string;
};

export type UploadAssetResult = {
  url: string;
  objectKey?: string;
  localPath?: string;
  pendingSync?: boolean;
};

export type SyncStatus = {
  mode: "web" | "native";
  pendingCount: number;
  lastSyncAt?: number | null;
};

export interface LibraryDataProvider {
  readSnapshot(): Promise<LibrarySnapshot>;
  seedSnapshot(snapshot: LibrarySnapshot): Promise<void>;
  writeSheet(request: SheetWriteRequest): Promise<void>;
  uploadAsset(request: UploadAssetRequest): Promise<UploadAssetResult>;
  readRoadmap(): Promise<unknown[]>;
  saveRoadmap(items: unknown[]): Promise<void>;
  syncNow(): Promise<SyncStatus>;
}

