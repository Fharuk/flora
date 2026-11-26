"use client";

import { useEffect, useRef } from "react";

import { jumpTo, readFilmState, scrollTarget, startLinkWriter } from "@/lib/stamen/link";
import { useLive } from "./useLive";

/**
 * Opens the film where the link says, and keeps the link current.
 *
 * The landing has to wait for the film to build: the chapters' heights are set
 * by CSS and are there immediately, but scrolling before the loader lifts would
 * fight the scroll-restoration the browser performs on a fresh load, and the
 * director measures on its own schedule. So the jump happens once, the frame
 * after the film reports ready, and only when the link actually names a chapter
 * away from the top.
 */
export default function FilmLink() {
  const ready = useLive("ready");

  const writer = useRef<ReturnType<typeof startLinkWriter> | null>(null);

  useEffect(() => {
    /* the writer is cheap and idempotent; one per page, for the life of the page */
    writer.current = startLinkWriter();
    return () => writer.current?.stop();
  }, []);

  useEffect(() => {
    if (!ready) return;
    const state = readFilmState();
    const wanted = scrollTarget(state);
    if (wanted > 0) jumpTo(wanted);
    /*
     * Arm the writer only now, on the position the film actually landed at. An
     * unarmed writer publishing the top of the film over the chapter a link named
     * is the failure mode this ordering exists to prevent.
     */
    const t = window.setTimeout(() => writer.current?.arm(), 120);
    return () => window.clearTimeout(t);
  }, [ready]);

  return null;
}
