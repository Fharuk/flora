"use client";

import { useCallback, useRef, useState } from "react";
import { Camera, Check, Film, Link2, Loader2 } from "lucide-react";

import { download, stillName, withWordmark } from "@/lib/capture";
import { shutter } from "@/lib/stamen/shutter";

/**
 * The shutter, on the film.
 *
 * Two things a viewer might want out of a film they are watching: the frame
 * they are looking at, and four seconds of it moving. The still is one borrowed
 * frame at twice the resolution; the clip is a `MediaRecorder` pointed at the
 * stage canvas, which costs nothing extra because the canvas is already drawing.
 *
 * Both are offered only while the film is live. A shutter over a scene that has
 * failed to build would just produce a black rectangle.
 */
export default function Shutter() {
  const [still, setStill] = useState<"idle" | "working" | "done" | "failed">("idle");
  const [clip, setClip] = useState<"idle" | "recording" | "failed">("idle");
  const clipTimer = useRef<number | null>(null);
  const [link, setLink] = useState<"idle" | "copied" | "failed">("idle");

  const saveStill = useCallback(async () => {
    setStill("working");
    const raw = shutter.take();
    if (!raw) {
      setStill("failed");
      window.setTimeout(() => setStill("idle"), 2400);
      return;
    }
    const marked = await withWordmark(raw, "a still from the film");
    download(marked, stillName("flora-synth-film", 0));
    setStill("done");
    window.setTimeout(() => setStill("idle"), 2400);
  }, []);

  /*
   * Four seconds, then stop on our own.
   *
   * The webm a MediaRecorder emits has no duration in its header — a known
   * quirk — so some players show it as a zero-length file. Four seconds of a
   * bloom is short enough that the viewer's player is the only destination, and
   * every one of them plays it through regardless.
   */
  const recordClip = useCallback(() => {
    const canvas = shutter.element();
    if (!canvas || typeof MediaRecorder === "undefined") {
      setClip("failed");
      window.setTimeout(() => setClip("idle"), 2600);
      return;
    }

    let recorder: MediaRecorder;
    try {
      const stream = canvas.captureStream(30);
      const type = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"].find((t) =>
        MediaRecorder.isTypeSupported(t),
      );
      recorder = new MediaRecorder(
        stream,
        type ? { mimeType: type, videoBitsPerSecond: 6_000_000 } : { videoBitsPerSecond: 6_000_000 },
      );
    } catch {
      setClip("failed");
      window.setTimeout(() => setClip("idle"), 2600);
      return;
    }

    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size) chunks.push(e.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: recorder.mimeType || "video/webm" });
      const url = URL.createObjectURL(blob);
      download(url, stillName("flora-synth-clip", 0).replace(".png", ".webm"));
      // give the anchor a tick to start the download before the URL goes
      window.setTimeout(() => URL.revokeObjectURL(url), 4000);
      setClip("idle");
    };

    recorder.start();
    setClip("recording");
    clipTimer.current = window.setTimeout(() => recorder.stop(), 4000);
  }, []);

  /*
   * Copy the link to this moment rather than the homepage.
   *
   * The writer keeps `chapter` current in the URL as the viewer scrolls, so by the
   * time they press this the address bar already points at the right place — all
   * this has to do is report what happened. On a phone the native sheet would be
   * nicer, but the film is a full-screen canvas and a sheet over it is a jarring
   * interruption; a quiet "copied" is the right weight here.
   */
  const share = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setLink("copied");
    } catch {
      setLink("failed");
    }
    window.setTimeout(() => setLink("idle"), 2200);
  }, []);

  const busy = still === "working" || clip === "recording";

  return (
    <div className="pointer-events-auto flex items-center gap-1">
      <button
        type="button"
        onClick={() => void saveStill()}
        disabled={busy}
        aria-label={still === "done" ? "Still saved" : "Save a still"}
        title="Save a still"
        className="stamen-glass flex h-8 w-8 items-center justify-center rounded-full"
      >
        {still === "working" ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : still === "done" ? (
          <Check className="h-3.5 w-3.5" />
        ) : (
          <Camera className="h-3.5 w-3.5" />
        )}
      </button>
      <button
        type="button"
        onClick={() => void share()}
        aria-label={link === "copied" ? "Link copied" : "Copy a link to this moment"}
        title={link === "copied" ? "Copied" : "Link to this moment"}
        className="stamen-glass flex h-8 w-8 items-center justify-center rounded-full"
      >
        {link === "copied" ? <Check className="h-3.5 w-3.5" /> : <Link2 className="h-3.5 w-3.5" />}
      </button>
      <button
        type="button"
        onClick={recordClip}
        disabled={busy}
        aria-label={clip === "recording" ? "Recording a clip" : "Record a four second clip"}
        title="Record a clip"
        className="stamen-glass flex h-8 w-8 items-center justify-center rounded-full"
      >
        {clip === "recording" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Film className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
}
