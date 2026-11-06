// The report's one browser-bound step (guided DDD §13.4): a standalone
// chart SVG drawn to a canvas at twice its CSS size, on white, and
// encoded as PNG. Injected into report.ts, which stays browser-and-Node.
//
// A browser-only file (DDD §5.1).

/** How long one chart may take before the report is given up (§13.5), so a stalled decoder never leaves the download busy. */
const TIMEOUT_MS = 10_000;

/** The PNG of `svg`, a `width` × `height` CSS px chart, at twice that size; rejects after `TIMEOUT_MS`. */
export function rasterizeSvg(svg: string, width: number, height: number): Promise<Uint8Array> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error('rasterize: timed out')), TIMEOUT_MS); });
  return Promise.race([draw(svg, width, height), timeout]).finally(() => clearTimeout(timer));
}

async function draw(svg: string, width: number, height: number): Promise<Uint8Array> {
  const image = new Image();
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error('rasterize: the chart image did not load'));
    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  });
  const canvas = document.createElement('canvas');
  canvas.width = width * 2;
  canvas.height = height * 2;
  const context = canvas.getContext('2d');
  if (context === null) throw new Error('rasterize: no 2D canvas context');
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
  if (blob === null) throw new Error('rasterize: the canvas gave no PNG');
  return new Uint8Array(await blob.arrayBuffer());
}
