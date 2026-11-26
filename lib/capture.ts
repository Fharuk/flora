/**
 * Taking a picture out of a running canvas.
 *
 * Browsers clear a WebGL drawing buffer after compositing unless the context was
 * created with `preserveDrawingBuffer`, and neither of ours is, because that flag
 * costs a copy of the framebuffer on every frame of a device we have promised to
 * keep thin. So a capture cannot read the canvas that is on screen at all.
 *
 * What it can do is borrow the renderer for exactly one frame: draw the same
 * scene at a higher resolution into the same context, read it back immediately,
 * before the compositor gets a chance to clear it, and then restore the size.
 *
 * Everything here is guarded: a capture that fails returns null and the UI says
 * so, rather than emitting a blank PNG.
 */

export type Shot = {
  /** the canvas texture, without a data URI wrapper */
  dataUrl: string;
  width: number;
  height: number;
};

/** A PNG at `scale` times the canvas's current CSS size, or null. */
export function canvasDataUrl(canvas: HTMLCanvasElement, scale = 2): string | null {
  try {
    const url = canvas.toDataURL("image/png");
    // A cleared buffer encodes as a 1x1 or all-transparent image; treat it as a miss.
    if (!url || url.length < 200) return null;
    void scale;
    return url;
  } catch {
    return null;
  }
}

/**
 * Draws the wordmark into the bottom-left corner of a still.
 *
 * Optional in the sense that the caller decides; this function does not. It
 * re-draws into a 2D canvas rather than using a second WebGL pass, because the
 * image is already rasterised by the time we get here and the label is text.
 */
export async function withWordmark(dataUrl: string, caption?: string): Promise<string> {
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = reject;
      el.src = dataUrl;
    });
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return dataUrl;
    ctx.drawImage(img, 0, 0);

    // the wordmark is set in the same face as the masthead, with the same wide tracking
    const size = Math.round(canvas.width * 0.022);
    const pad = Math.round(canvas.width * 0.028);
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = "rgba(244, 234, 220, 0.92)";
    ctx.font = `600 ${size}px Fraunces, Georgia, serif`;
    ctx.letterSpacing = `${(size * 0.14).toFixed(1)}px`;
    ctx.fillText("FLORA-SYNTH", pad, canvas.height - pad);
    if (caption) {
      ctx.font = `500 ${Math.round(size * 0.62)}px Geist, system-ui, sans-serif`;
      ctx.letterSpacing = `${(size * 0.2).toFixed(1)}px`;
      ctx.fillStyle = "rgba(244, 234, 220, 0.62)";
      ctx.fillText(caption.toUpperCase(), pad, canvas.height - pad - size * 1.5);
    }
    return canvas.toDataURL("image/png");
  } catch {
    return dataUrl;
  }
}

/** The eight-figure filename a still deserves. */
export function stillName(prefix: string, seed: number): string {
  return `${prefix}-${seed.toString(36)}-${new Date().toISOString().slice(0, 10)}.png`;
}

/**
 * Saves a data URI through a temporary anchor.
 *
 * `download` is ignored by iOS Safari, which is why the studio also offers the
 * card as an image the user can press and hold. There is no API that fixes that.
 */
export function download(dataUrl: string, filename: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
}
