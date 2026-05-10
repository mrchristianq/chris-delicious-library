// Shared cover-image styling.
//
// App-wide rule: every visible cover image gets 6px rounded corners on the
// actual <img> element (not just on its wrapper). The clipPath belt-and-
// suspenders is needed because some browsers fail to round the rendered
// image pixels with border-radius alone when objectFit is set.
//
// Usage:
//   <img
//     src={url}
//     alt={title}
//     style={{ ...otherInlineStyles, ...COVER_IMAGE_RADIUS_STYLE }}
//   />
//
// Or, for an inline radius override on a CSS class:
//   <img className="poster" style={COVER_IMAGE_RADIUS_STYLE} />

import type { CSSProperties } from "react";

export const COVER_IMAGE_RADIUS_PX = 6;

export const COVER_IMAGE_RADIUS_STYLE: CSSProperties = {
  borderRadius: COVER_IMAGE_RADIUS_PX,
  clipPath: `inset(0 round ${COVER_IMAGE_RADIUS_PX}px)`,
  WebkitClipPath: `inset(0 round ${COVER_IMAGE_RADIUS_PX}px)`,
  overflow: "hidden",
  display: "block",
};
