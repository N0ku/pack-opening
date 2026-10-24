/** A point in an element's box, from 0 to 1 on both axes. */
export interface Point {
  x: number;
  y: number;
}

/** A point on the outline of a box, with the outward direction. */
export interface EdgePoint extends Point {
  nx: number;
  ny: number;
}

const RESOLUTION = 48;
const silhouettes = new Map<string, Point[] | null>();

/**
 * Returns a function giving random points inside the opaque part of `image` (the booster art),
 * so that particles take the shape of the pack. Falls back to the whole box when the image is not
 * loaded or cannot be read (cross-origin without CORS).
 */
export function silhouette(image: HTMLImageElement | null, minY = 0): () => Point {
  const points = (image && opaquePoints(image))?.filter((point) => point.y >= minY);
  if (points?.length) return () => jitter(points[Math.floor(Math.random() * points.length)]!);
  return () => ({ x: Math.random(), y: minY + Math.random() * (1 - minY) });
}

function opaquePoints(image: HTMLImageElement): Point[] | null {
  if (!image.complete || !image.naturalWidth) return null;
  const key = image.currentSrc || image.src;
  if (silhouettes.has(key)) return silhouettes.get(key)!;
  let points: Point[] | null = null;
  try {
    const width = RESOLUTION;
    const height = Math.max(1, Math.round((RESOLUTION * image.naturalHeight) / image.naturalWidth));
    const canvas = Object.assign(document.createElement('canvas'), { width, height });
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
    ctx.drawImage(image, 0, 0, width, height);
    const { data } = ctx.getImageData(0, 0, width, height);
    points = [];
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (data[(y * width + x) * 4 + 3]! > 128) points.push({ x: (x + 0.5) / width, y: (y + 0.5) / height });
      }
    }
  } catch {
    // A tainted canvas (cross-origin image): the box is used instead.
    points = null;
  }
  silhouettes.set(key, points);
  return points;
}

// Spreads the points of the low-resolution grid inside their cell.
const jitter = ({ x, y }: Point): Point => ({
  x: x + (Math.random() - 0.5) / RESOLUTION,
  y: y + (Math.random() - 0.5) / RESOLUTION,
});

/** A random point on the outline of a `width` × `height` box, sides weighted by their length. */
export function edgePoint(width: number, height: number): EdgePoint {
  const t = Math.random() * (width + height) * 2;
  if (t < width) return { x: t / width, y: 0, nx: 0, ny: -1 };
  if (t < width + height) return { x: 1, y: (t - width) / height, nx: 1, ny: 0 };
  if (t < width * 2 + height) return { x: 1 - (t - width - height) / width, y: 1, nx: 0, ny: 1 };
  return { x: 0, y: 1 - (t - width * 2 - height) / height, nx: -1, ny: 0 };
}
