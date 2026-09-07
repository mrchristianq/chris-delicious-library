"use client";

import { type ReactNode, useState } from "react";

/** Defer closed editors, then preserve their existing open/close lifecycle. */
export function MountOnFirstOpen({ open, children }: { open: boolean; children: ReactNode }) {
  const [hasOpened, setHasOpened] = useState(open);
  if (open && !hasOpened) setHasOpened(true);
  return open || hasOpened ? children : null;
}
