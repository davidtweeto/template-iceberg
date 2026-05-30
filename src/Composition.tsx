import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadMontserrat } from "@remotion/google-fonts/Montserrat";
import { loadFont as loadRoboto } from "@remotion/google-fonts/Roboto";
import { z } from "zod";
import {
  LABEL_FADE,
  OUTRO_FADE,
  OUTRO_STAGGER,
  OUTRO_TITLE_DURATION,
  OUTRO_TOTAL_FRAMES,
  OUTRO_ZOOM_IN_OFFSET,
  SETTLE_FRAMES,
} from "./constants";

// Load fonts at module level so Remotion blocks rendering until they are ready.
const { fontFamily: interFamily } = loadInter("normal", {
  weights: ["700", "800"],
  subsets: ["latin"],
});
const { fontFamily: montserratFamily } = loadMontserrat("normal", {
  weights: ["700", "800"],
  subsets: ["latin"],
});
const { fontFamily: robotoFamily } = loadRoboto("normal", {
  weights: ["700"],
  subsets: ["latin"],
});

const FONT_MAP: Record<string, string> = {
  Inter: interFamily,
  Montserrat: montserratFamily,
  Roboto: robotoFamily,
};

// ── Schema ─────────────────────────────────────────────────────────────────────

export const IcebergSchema = z.object({
  /** Camera / animation timing controls. */
  camera: z.object({
    /** How far to zoom in at the start (1 = no zoom, 3 = 3× zoom). */
    zoomLevel: z.number().min(1).max(10).step(0.1),
    /** Seconds to hold the zoomed-in view before panning begins. */
    introHoldSecs: z.number().min(0.5).max(8).step(0.5),
    /** Seconds to pan across the full image. */
    panDurationSecs: z.number().min(1).max(30).step(0.5),
    /** Seconds to zoom back out to full view. */
    zoomOutDurationSecs: z.number().min(0.5).max(10).step(0.5),
    /** Seconds to hold the full view before the outro begins. */
    outroHoldSecs: z.number().min(0).max(5).step(0.5),
  }),

  /** Title displayed at the top of the frame. */
  title: z.object({
    text: z.string(),
    /** Y position in image-space pixels. */
    titleY: z.number().min(0).max(500).step(5),
    /** Font size in image-space pixels. */
    titleFontSize: z.number().min(8).max(80).step(1),
  }),

  /** The 9 text labels: one tip (above) and 8 points (below). */
  labels: z.object({
    /** Shown above the 8 points — the "visible" item. */
    tipText: z.string(),
    point1: z.string(),
    point2: z.string(),
    point3: z.string(),
    point4: z.string(),
    point5: z.string(),
    point6: z.string(),
    point7: z.string(),
    point8: z.string(),
    /** Watermark in the bottom-left corner. Leave empty to hide. */
    watermark: z.string(),
  }),

  /** Layout and timing for the label pills. */
  layout: z.object({
    /** Y position of the first point in image-space pixels. */
    pointsStartY: z.number().min(100).max(900).step(5),
    /** Vertical gap between consecutive label pills in image-space pixels. */
    pointSpacing: z.number().min(40).max(200).step(5),
    /** Font size for all label pills in image-space pixels. */
    fontSize: z.number().min(12).max(60).step(1),
    /** Absolute frame number when the first point appears. */
    firstLabelFrame: z.number().min(0).max(600).step(1),
  }),

  /** Background image filename inside the public/ folder. Leave empty for gradient fallback. */
  backgroundFile: z.string(),

  /** Font used for all text. */
  fontFamily: z.enum(["Inter", "Montserrat", "Roboto"]),
});

export type IcebergProps = z.infer<typeof IcebergSchema>;

// ── Pill label ─────────────────────────────────────────────────────────────────

const Pill: React.FC<{
  text: string;
  y: number;
  opacity: number;
  fontSize: number;
  fontFamily: string;
}> = ({ text, y, opacity, fontSize, fontFamily }) => (
  <div
    style={{
      position: "absolute",
      top: y,
      left: "50%",
      transform: "translate(-50%, -50%)",
      opacity,
      pointerEvents: "none",
      whiteSpace: "nowrap",
    }}
  >
    <div
      style={{
        background: "rgba(0, 0, 0, 0.68)",
        color: "#ffffff",
        fontSize,
        fontWeight: 700,
        fontFamily,
        lineHeight: 1.35,
        padding: "8px 22px",
        borderRadius: 10,
        boxShadow: "0 4px 20px rgba(0,0,0,0.55)",
      }}
    >
      {text}
    </div>
  </div>
);

// ── Composition ────────────────────────────────────────────────────────────────

// Title animation timings (fixed, prop-independent)
const T_FALL_START = 2;
const T_FALL_END = 20;
const TIP_IN_START = T_FALL_END + 30;
const TIP_IN_END = TIP_IN_START + 12;

export const IcebergComposition: React.FC<IcebergProps> = ({
  camera: { zoomLevel, introHoldSecs, panDurationSecs, zoomOutDurationSecs, outroHoldSecs },
  title: { text: titleText, titleY, titleFontSize },
  labels: { tipText, point1, point2, point3, point4, point5, point6, point7, point8, watermark },
  layout: { pointsStartY, pointSpacing, fontSize, firstLabelFrame },
  backgroundFile,
  fontFamily,
}) => {
  const resolvedFont = FONT_MAP[fontFamily];
  const points = [point1, point2, point3, point4, point5, point6, point7, point8];
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();

  // ── Frame boundaries ──────────────────────────────────────────────────────────

  const holdEnd = Math.round(introHoldSecs * fps);
  const panEnd = holdEnd + Math.round(panDurationSecs * fps);
  const settleEnd = panEnd + SETTLE_FRAMES;
  const zoomOutEnd = settleEnd + Math.round(zoomOutDurationSecs * fps);
  const outroStart = zoomOutEnd + Math.round(outroHoldSecs * fps);
  const outroZoomInStart = outroStart + OUTRO_ZOOM_IN_OFFSET;
  const outroZoomInEnd = outroStart + OUTRO_TOTAL_FRAMES;

  // ── Camera: scale ─────────────────────────────────────────────────────────────

  const scale =
    frame <= settleEnd
      ? zoomLevel
      : frame <= zoomOutEnd
        ? interpolate(frame, [settleEnd, zoomOutEnd], [zoomLevel, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.out(Easing.exp),
          })
        : frame < outroZoomInStart
          ? 1
          : interpolate(frame, [outroZoomInStart, outroZoomInEnd], [1, zoomLevel], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.in(Easing.cubic),
            });

  // ── Camera: pan (vertical) ────────────────────────────────────────────────────

  const maxPan = height * (zoomLevel - 1);

  const translateY =
    frame <= holdEnd
      ? 0
      : frame <= panEnd
        ? interpolate(frame, [holdEnd, panEnd], [0, -maxPan], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.in(Easing.quad),
          })
        : frame <= settleEnd
          ? -maxPan
          : frame < outroZoomInStart
            ? height * (1 - scale) // bottom-pinned during zoom-out
            : 0; // top-anchored during reverse zoom-in

  // ── Title animation ───────────────────────────────────────────────────────────

  const titleFallScale = (() => {
    if (frame <= T_FALL_END) {
      return interpolate(frame, [T_FALL_START, T_FALL_END], [2.5, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing: Easing.out(Easing.cubic),
      });
    }
    if (frame >= outroStart) {
      return interpolate(frame, [outroStart, outroStart + OUTRO_TITLE_DURATION], [1, 2.5], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing: Easing.in(Easing.cubic),
      });
    }
    return 1;
  })();

  const titleBlur = (() => {
    if (frame <= T_FALL_END) {
      return interpolate(frame, [T_FALL_START, T_FALL_END], [6, 0], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing: Easing.out(Easing.cubic),
      });
    }
    if (frame >= outroStart) {
      return interpolate(frame, [outroStart, outroStart + OUTRO_TITLE_DURATION], [0, 6], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing: Easing.in(Easing.cubic),
      });
    }
    return 0;
  })();

  const titleOpacity = interpolate(
    frame,
    [T_FALL_START, T_FALL_START + 5, outroStart, outroStart + OUTRO_TITLE_DURATION],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  // ── Label opacities ───────────────────────────────────────────────────────────

  // ease-out fade-in: snaps into existence; ease-in fade-out: lingers then vanishes
  const easedOpacity = (
    fadeInStart: number,
    fadeInEnd: number,
    fadeOutStart: number,
    fadeOutEnd: number,
  ) => {
    const fadeIn = interpolate(frame, [fadeInStart, fadeInEnd], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.cubic),
    });
    const fadeOut = interpolate(frame, [fadeOutStart, fadeOutEnd], [1, 0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.in(Easing.cubic),
    });
    return Math.min(fadeIn, fadeOut);
  };

  const labelInterval = (panEnd - firstLabelFrame) / 7;

  // Points fade out bottom-to-top in the outro (point7 first, point0 last)
  const pointOpacities = points.map((_, i) => {
    const fadeInStart = Math.round(firstLabelFrame + i * labelInterval);
    const fadeOutStart = outroStart + (7 - i) * OUTRO_STAGGER;
    return easedOpacity(fadeInStart, fadeInStart + LABEL_FADE, fadeOutStart, fadeOutStart + OUTRO_FADE);
  });

  // Tip fades in after title, fades out last in the outro
  const tipOpacity = easedOpacity(
    TIP_IN_START,
    TIP_IN_END,
    outroStart + 8 * OUTRO_STAGGER,
    outroStart + 8 * OUTRO_STAGGER + OUTRO_FADE,
  );

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <AbsoluteFill style={{ background: "#000", overflow: "hidden" }}>
      {/* Camera layer: pan + scale */}
      <div
        style={{
          position: "absolute",
          width,
          height,
          transformOrigin: "top center",
          transform: `translateY(${translateY}px) scale(${scale})`,
        }}
      >
        {/* Background: image or gradient fallback */}
        {backgroundFile ? (
          <Img
            src={staticFile(backgroundFile)}
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(to bottom, #1a2744 0%, #0a3d62 40%, #0c2461 100%)",
            }}
          />
        )}

        {/* Title: falls in, stays pinned, reverses out */}
        <div
          style={{
            position: "absolute",
            top: titleY,
            left: "50%",
            transform: "translateX(-50%)",
            opacity: titleOpacity,
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              transform: `scale(${titleFallScale})`,
              transformOrigin: "top center",
              filter: titleBlur > 0.1 ? `blur(${titleBlur}px)` : undefined,
              maxWidth: 320,
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontSize: titleFontSize,
                fontWeight: 800,
                fontFamily: resolvedFont,
                lineHeight: 1.2,
                letterSpacing: "-0.01em",
                color: "#000000",
                textShadow: [
                  "2px 0 10px rgba(255,255,255,0.15)",
                  "-2px 0 10px rgba(255,255,255,0.15)",
                  "0 2px 10px rgba(255,255,255,0.15)",
                  "0 -2px 10px rgba(255,255,255,0.15)",
                  "2px 2px 10px rgba(255,255,255,0.15)",
                  "-2px -2px 10px rgba(255,255,255,0.15)",
                  "2px -2px 10px rgba(255,255,255,0.15)",
                  "-2px 2px 10px rgba(255,255,255,0.15)",
                  "0 6px 30px rgba(255,255,255,0.12)",
                ].join(", "),
              }}
            >
              {titleText}
            </div>
          </div>
        </div>

        {/* Tip label (above the points) */}
        <Pill
          text={tipText}
          y={pointsStartY - pointSpacing}
          opacity={tipOpacity}
          fontSize={fontSize}
          fontFamily={resolvedFont}
        />

        {/* Point labels */}
        {points.map((text, i) => (
          <Pill
            key={i}
            text={text}
            y={pointsStartY + i * pointSpacing}
            opacity={pointOpacities[i]}
            fontSize={fontSize}
            fontFamily={resolvedFont}
          />
        ))}
      </div>

      {/* Watermark: screen space, unaffected by camera. Hidden when empty. */}
      {watermark ? (
        <div
          style={{
            position: "absolute",
            bottom: 3,
            left: 14,
            color: "#ffffff",
            opacity: 0.25,
            fontSize: 28,
            fontWeight: 600,
            fontFamily: resolvedFont,
            letterSpacing: "0.05em",
            pointerEvents: "none",
          }}
        >
          {watermark}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
