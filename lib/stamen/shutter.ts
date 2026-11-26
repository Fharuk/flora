/**
 * The film's camera shutter.
 *
 * Stage owns the director and the canvas; Hud and the shutter control are
 * elsewhere in the tree. Rather than threading props through every chapter, the
 * two meet here — the same pattern `live` and `cart` already use on this page.
 *
 * If WebGL failed there is no capture function, and the button says so instead
 * of saving a black rectangle.
 */

type Capture = () => string | null;

let fn: Capture | null = null;
let canvas: HTMLCanvasElement | null = null;

export const shutter = {
  set(next: Capture | null) {
    fn = next;
  },
  setCanvas(el: HTMLCanvasElement | null) {
    canvas = el;
  },
  take(): string | null {
    return fn ? fn() : null;
  },
  /** the stage canvas, for recording a clip — null if the director never came up */
  element(): HTMLCanvasElement | null {
    return canvas;
  },
};
