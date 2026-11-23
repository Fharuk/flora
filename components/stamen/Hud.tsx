"use client";

import { useLive } from "./useLive";

/**
 * The time-lapse readout, like the back of a camera: recording, the day and
 * the hour, the frame count, the bloom stage, and the sun on its arc. The
 * director writes the numbers (data-hud) whenever they change.
 */
export default function Hud() {
  const scene = useLive("scene");
  const on = scene === "bloom" || scene === "scatter";
  return (
    <div
      className="stamen-hud pointer-events-none fixed bottom-5 left-4 right-4 z-20 flex items-end justify-between gap-2 md:bottom-7 md:left-8 md:right-8"
      style={{ opacity: on ? 1 : 0, transition: "opacity 0.6s" }}
      aria-hidden
    >
      <div className="stamen-glass flex items-center gap-3 rounded-full px-3.5 py-2.5 md:gap-5 md:px-5">
        <span className="flex items-center gap-2">
          <span className="rec" /> Rec
        </span>
        <span className="tabular-nums">
          <span data-hud="day">DAY 01</span> <span className="opacity-60">·</span> <span data-hud="clock">06:12</span>
        </span>
        <span className="hidden tabular-nums md:inline">
          FR <span data-hud="frame">0000</span>
        </span>
        <span className="hidden opacity-70 lg:inline">1 frame / 4 min</span>
      </div>
      <div className="stamen-glass flex items-center gap-3 rounded-full py-1.5 pl-3.5 pr-2 md:gap-4 md:pl-5 md:pr-2.5">
        <span data-hud="stage">Tight bud</span>
        <span className="stamen-dial" data-hud="sun">
          <i />
        </span>
      </div>
    </div>
  );
}
