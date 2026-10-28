"use client";

import { useEffect, useState } from "react";

/** Feature-detects a usable WebGL context once per page load. */
let cached: boolean | null = null;

export function detectWebGL(): boolean {
  if (cached !== null) return cached;
  if (typeof window === "undefined") return (cached = false);
  try {
    const canvas = document.createElement("canvas");
    const gl =
      canvas.getContext("webgl2", { failIfMajorPerformanceCaveat: false }) ||
      canvas.getContext("webgl");
    cached = Boolean(gl);
    if (gl && "getExtension" in gl) {
      // release the probe context promptly
      (gl as WebGLRenderingContext).getExtension("WEBGL_lose_context")?.loseContext();
    }
  } catch {
    cached = false;
  }
  return cached;
}

/**
 * Returns false during SSR and the first paint so the static fallback renders first,
 * then flips to true only if WebGL is available. Keeps hydration deterministic.
 */
export function useWebGLSupport() {
  const [supported, setSupported] = useState(false);
  useEffect(() => setSupported(detectWebGL()), []);
  return supported;
}

/** Tracks the user's reduced-motion preference, reacting to live changes. */
export function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

/** True once the element has entered the viewport; used to mount heavy canvases lazily. */
export function useInView<T extends Element>(ref: React.RefObject<T | null>, rootMargin = "240px") {
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { rootMargin }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref, rootMargin]);
  return inView;
}

/** True while the document is hidden — lets canvases stop their render loop. */
export function useDocumentVisible() {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const onChange = () => setVisible(!document.hidden);
    document.addEventListener("visibilitychange", onChange);
    return () => document.removeEventListener("visibilitychange", onChange);
  }, []);
  return visible;
}
