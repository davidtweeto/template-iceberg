# template-iceberg

A Remotion template for iceberg-style reveal videos: the camera starts zoomed in at the top of a background image, pans downward while label pills appear one by one, then zooms back out to show the full picture. The outro reverses the sequence in a seamless boomerang loop.

## Quick start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to preview in Remotion Studio.

## Adding a background image

A default `iceberg.jpg` is included in `public/`. To use your own image, drop it into `public/` and update `backgroundFile` in `src/Root.tsx`:

```ts
backgroundFile: "my-photo.jpg",
```

If `backgroundFile` is empty, a dark blue gradient is used as fallback.

## Customizing content

All composition props are editable live in Remotion Studio via the Props panel. The schema is defined in `src/Composition.tsx` using Zod:

| Prop group | What it controls |
|---|---|
| `camera` | Zoom level, intro hold, pan duration, zoom-out duration, outro hold |
| `title` | Title text, Y position, font size |
| `labels` | Tip text, 8 point labels, watermark |
| `layout` | Start Y of points, spacing, font size, first label frame |
| `backgroundFile` | Filename inside `public/` (or empty for gradient) |
| `fontFamily` | `Inter`, `Montserrat`, or `Roboto` |

## Rendering

```bash
# Render the full video
npm run render

# Render a single frame at 1 second (for layout checks)
npx remotion still Iceberg --frame=30 --scale=0.5
```

Output lands in `out/`.

## Adapting the layout

- **More or fewer points**: The schema supports exactly 9 labels (1 tip + 8 points). To change the count, edit the `labels` schema and the `points` array in `IcebergComposition`.
- **Horizontal pan**: Swap `translateY` / `maxPan` for `translateX` and use `width` instead of `height`.
- **Different aspect ratio**: Change `width`/`height` in `src/Root.tsx`. `1920×1080` for landscape, `1080×1920` for portrait.

## Structure

```
src/
  index.ts          — Remotion entry point
  Root.tsx          — Composition registration & default props
  Composition.tsx   — Main animation component + Zod schema (IcebergComposition)
  constants.ts      — Shared animation timing constants
public/
  iceberg.jpg       — Default background image
```
