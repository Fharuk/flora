import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Tailwind-aware class merge. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Clamp a value between a min and max. */
export const clamp = (v: number, min = 0, max = 1) => Math.min(max, Math.max(min, v));

/** Linear interpolation. */
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Map a value from one range to another, clamped. */
export const mapRange = (v: number, inMin: number, inMax: number, outMin: number, outMax: number) =>
  lerp(outMin, outMax, clamp((v - inMin) / (inMax - inMin)));

/** Frame-rate independent damping factor. */
export const damp = (lambda: number, dt: number) => 1 - Math.exp(-lambda * dt);
