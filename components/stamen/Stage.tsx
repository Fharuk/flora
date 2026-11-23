"use client";

import { useEffect, useRef } from "react";
import Lenis from "lenis";
import { createDirector, type Director } from "@/lib/stamen/director";
import { cart } from "@/lib/stamen/cart";
import { live } from "@/lib/stamen/live";
import { prefersReducedMotion } from "@/lib/stamen/util";

let lenisRef: Lenis | null = null;

/** smooth-scroll to a section (falls back to the browser when Lenis is off) */
export function scrollToId(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  if (lenisRef) lenisRef.scrollTo(el, { offset: 0, duration: 1.8 });
  else el.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth" });
}

/** the fixed WebGL stage behind the page; owns the one animation loop */
export default function Stage() {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvas.current) return;
    const lenis = prefersReducedMotion() ? null : new Lenis({ lerp: 0.08, wheelMultiplier: 0.85, autoRaf: false });
    lenisRef = lenis;
    let director: Director | null = null;
    try {
      director = createDirector({ canvas: canvas.current, lenis });
    } catch (e) {
      console.error("STAMEN: WebGL unavailable", e);
      live.set({ failed: true, ready: true, load: 1 });
      lenis?.destroy();
      lenisRef = null;
    }
    let lastPick = cart.get().pick;
    director?.setPick(lastPick);
    const off = cart.subscribe(() => {
      const p = cart.get().pick;
      if (p !== lastPick) director?.setPick((lastPick = p));
    });
    return () => {
      off();
      director?.dispose();
      lenis?.destroy();
      lenisRef = null;
    };
  }, []);

  return <canvas ref={canvas} aria-hidden className="fixed inset-0 z-0 block h-[100lvh] w-screen" style={{ touchAction: "pan-y" }} />;
}
