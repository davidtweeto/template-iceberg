// Frames to hold after the pan ends before the zoom-out begins.
// Matches LABEL_FADE so the last label finishes appearing on the exact frame zoom-out starts.
export const SETTLE_FRAMES = 12;

// ── Outro constants ────────────────────────────────────────────────────────────

/** Frames between each label fade-out (staggered bottom-to-top). */
export const OUTRO_STAGGER = 5;
/** Frames each label takes to fade out. */
export const OUTRO_FADE = 8;
/** Frames the title takes to reverse (scale back up + blur + fade). */
export const OUTRO_TITLE_DURATION = 18;
/** Silence frames after the last element disappears. */
export const OUTRO_TAIL = 12;

// 9 elements: tip + 8 labels. Last starts at 8×stagger, finishes at 8×stagger + fade.
export const OUTRO_TOTAL_FRAMES = 8 * OUTRO_STAGGER + OUTRO_FADE + OUTRO_TAIL; // 60

/** Frame offset within the outro when the reverse zoom-in begins (boomerang sync).
 *  The zoom completes on the very last frame, matching frame 0 exactly for a seamless loop. */
export const OUTRO_ZOOM_IN_OFFSET = 4 * OUTRO_STAGGER; // 20 frames in

/** Duration (frames) for each label's fade-in. */
export const LABEL_FADE = 12;
