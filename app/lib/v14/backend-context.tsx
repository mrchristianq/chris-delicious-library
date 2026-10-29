"use client";

import { createContext, useContext } from "react";
import type { rendererSnapshot } from "./renderer-snapshot";
import type { ActivityContext } from "./activity-context";
import type { V14Item } from "./items";
import type { createRoadmapClient } from "./roadmap-client";
import type { PreferenceStorage } from "./browser-storage";

export type LibraryBackend = {
  validationReadOnly?:boolean;
  suppressAutomaticRefresh?:boolean;
  libraryId:string;
  storage:PreferenceStorage;
  storageScope:string;
  roadmap:ReturnType<typeof createRoadmapClient>;
  activity():Promise<Record<string,string>[]>;
  load(signal:AbortSignal):Promise<ReturnType<typeof rendererSnapshot>>;
  write(url:string,payload:Record<string,unknown>):Promise<string>;
  edit(item:Record<string,unknown>,values:Record<string,string>,activity?:ActivityContext):Promise<Record<string,string>>;
  create(type:V14Item["media_type"],values:Record<string,string>):Promise<Record<string,string>>;
  archive(item:Record<string,unknown>):Promise<void>;
  progress(episodes:Record<string,string>[],watched:boolean):Promise<Record<string,string>[]>;
  episodeMetadata(show:Record<string,unknown>,rows:Record<string,string>[]):Promise<Record<string,string>[]>;
  artwork(item:Record<string,unknown>,source:File|string,kind:"cover"|"backdrop",activity?:ActivityContext):Promise<Record<string,string>>;
  icon(form:FormData):Promise<Record<string,unknown>>;
};
// Null is the unchanged v13 behavior. Only an authenticated v14 entry may supply
// this context; no environment variable switches the production renderer.
export const LibraryBackendContext=createContext<LibraryBackend|null>(null);
export function useLibraryBackend() { return useContext(LibraryBackendContext); }
