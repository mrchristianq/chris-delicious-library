"use client";

import { useState } from "react";
import Page from "../page";
import { LibraryBackendContext } from "../lib/v14/backend-context";
import { createRendererBackend, type InitialLibraryRead } from "../lib/v14/renderer-backend";

// The server keys this boundary by verified account/library identity so no
// previous account's editor, queue, or browser preference scope is reused.
export function Renderer({ ownerId, libraryId, validationReadOnly, suppressAutomaticRefresh, initialRead }: { ownerId: string; libraryId: string; validationReadOnly: boolean; suppressAutomaticRefresh: boolean; initialRead: Promise<InitialLibraryRead> }) {
  const [backend] = useState(() => ({ ...createRendererBackend(libraryId, ownerId, fetch, initialRead), validationReadOnly, suppressAutomaticRefresh }));
  return <LibraryBackendContext.Provider value={backend}><Page /></LibraryBackendContext.Provider>;
}
