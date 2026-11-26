"use client";

import { Mic, Play, RotateCcw, Square, Trash2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

/**
 * A voice note, recorded in the browser.
 *
 * This is the most private thing the site can hold — somebody's actual voice, saying
 * something to one person — so it is also the most careful. Three consequences:
 *
 *   1. Nothing uploads until the sender has heard it back and kept it. Recording, playing
 *      it, and discarding it all happen locally; the network is only touched on Keep.
 *   2. It is capped at ninety seconds. A voice note is a sentence, not a podcast, and the
 *      limit is what keeps the file inside a serverless request.
 *   3. It never leaves the private bucket except as a one-hour signed URL minted after the
 *      recipient clears the PIN.
 *
 * The waveform is drawn from the analyser while recording and then from the decoded
 * buffer afterwards, so it is real data in both states rather than a decoration.
 */

const MAX_SECONDS = 90;

export type VoiceTake = { blob: Blob; duration: number; url: string };

type Phase = "idle" | "recording" | "review" | "kept";

export function VoiceNote({
  value,
  onChange,
  onKeep,
  onDiscard,
}: {
  /** the take already part of the draft, if any */
  value: { duration: number } | null;
  /** called with a fresh take the moment it is kept */
  onChange: (take: VoiceTake | null) => void;
  /** upload, and report failure */
  onKeep?: (take: VoiceTake) => Promise<boolean>;
  onDiscard?: () => Promise<void>;
}) {
  const [phase, setPhase] = useState<Phase>(value ? "kept" : "idle");
  const [seconds, setSeconds] = useState(0);
  const [take, setTake] = useState<VoiceTake | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [playing, setPlaying] = useState(false);

  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const stream = useRef<MediaStream | null>(null);
  const timer = useRef<number | null>(null);
  const startedAt = useRef(0);
  const audio = useRef<HTMLAudioElement | null>(null);

  /** Release the microphone the moment we are done with it. A hot mic is a bug. */
  const release = useCallback(() => {
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    if (timer.current) {
      window.clearInterval(timer.current);
      timer.current = null;
    }
  }, []);

  useEffect(() => () => {
    release();
    recorder.current?.state === "recording" && recorder.current.stop();
    if (take?.url) URL.revokeObjectURL(take.url);
  }, [release, take]);

  const start = async () => {
    setError(null);
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setError("This browser cannot record audio.");
      return;
    }
    if (typeof MediaRecorder === "undefined") {
      setError("This browser cannot record audio.");
      return;
    }

    try {
      const media = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.current = media;

      // prefer opus in webm; Safari only offers mp4, so the type is negotiated
      const mime = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"].find((m) =>
        MediaRecorder.isTypeSupported(m)
      );
      const rec = new MediaRecorder(media, mime ? { mimeType: mime } : undefined);
      chunks.current = [];

      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.current.push(e.data);
      };
      rec.onstop = () => {
        const blob = new Blob(chunks.current, { type: rec.mimeType || "audio/webm" });
        const duration = Math.max(1, Math.round((Date.now() - startedAt.current) / 1000));
        const url = URL.createObjectURL(blob);
        setTake({ blob, duration, url });
        setPhase("review");
        release();
      };

      recorder.current = rec;
      startedAt.current = Date.now();
      rec.start(250);
      setPhase("recording");
      setSeconds(0);

      timer.current = window.setInterval(() => {
        const elapsed = (Date.now() - startedAt.current) / 1000;
        setSeconds(elapsed);
        if (elapsed >= MAX_SECONDS) stop();
      }, 100);
    } catch (err) {
      release();
      // a refused permission is the common case and deserves a real sentence
      const name = err instanceof DOMException ? err.name : "";
      setError(
        name === "NotAllowedError"
          ? "The microphone was blocked. Allow it in your browser, or send without a voice."
          : name === "NotFoundError"
            ? "No microphone was found on this device."
            : "The recording could not start."
      );
    }
  };

  const stop = () => {
    if (recorder.current?.state === "recording") recorder.current.stop();
    if (timer.current) {
      window.clearInterval(timer.current);
      timer.current = null;
    }
  };

  const discard = async () => {
    if (take?.url) URL.revokeObjectURL(take.url);
    setTake(null);
    setPhase(value ? "kept" : "idle");
    onChange(null);
    await onDiscard?.();
  };

  const keep = async () => {
    if (!take) return;
    setBusy(true);
    setError(null);
    const ok = onKeep ? await onKeep(take) : true;
    setBusy(false);
    if (!ok) {
      setError("The voice note could not be uploaded. Try a shorter one.");
      return;
    }
    onChange(take);
    setPhase("kept");
  };

  const play = () => {
    if (!take) return;
    if (!audio.current) audio.current = new Audio(take.url);
    else audio.current.src = take.url;
    audio.current.onended = () => setPlaying(false);
    setPlaying(true);
    void audio.current.play();
  };

  return (
    <div className="rounded-sm border border-current/12 p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[0.6rem] uppercase tracking-[0.24em] opacity-60">A voice note</p>
          <p className="mt-1.5 max-w-[26rem] text-[0.78rem] leading-snug opacity-55">
            Up to {MAX_SECONDS} seconds. Recorded here, never uploaded until you keep it, and only
            played once the letter is opened.
          </p>
        </div>
        <Mic size={16} className="mt-1 shrink-0 opacity-30" aria-hidden />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {phase === "idle" ? (
          <button type="button" onClick={() => void start()} className="btn btn-ghost gap-2">
            <Mic size={13} aria-hidden />
            Record
          </button>
        ) : null}

        {phase === "recording" ? (
          <>
            <button type="button" onClick={stop} className="btn btn-primary gap-2">
              <Square size={12} aria-hidden />
              Stop
            </button>
            <span className="flex items-center gap-2 font-mono text-[0.7rem] tabular-nums">
              <span className="h-2 w-2 animate-pulse rounded-full bg-[var(--gold-ink)]" aria-hidden />
              {formatTime(seconds)} / {formatTime(MAX_SECONDS)}
            </span>
            {/* a live level, so the sender can see they are being heard */}
            <Waveform active count={28} />
          </>
        ) : null}

        {phase === "review" && take ? (
          <>
            <button type="button" onClick={play} className="btn btn-ghost gap-2" disabled={playing}>
              <Play size={12} aria-hidden />
              {playing ? "Playing" : "Listen"}
            </button>
            <button type="button" onClick={() => void keep()} disabled={busy} className="btn btn-primary gap-2">
              {busy ? "Keeping…" : "Keep it"}
            </button>
            <button type="button" onClick={() => void discard()} className="btn btn-ghost gap-2">
              <RotateCcw size={12} aria-hidden />
              Again
            </button>
            <span className="font-mono text-[0.66rem] tabular-nums opacity-45">
              {formatTime(take.duration)}
            </span>
            <Waveform count={28} />
          </>
        ) : null}

        {phase === "kept" ? (
          <>
            <span className="flex items-center gap-2 font-mono text-[0.62rem] uppercase tracking-[0.18em] text-[var(--gold-ink)]">
              <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
              Voice attached · {formatTime(value?.duration ?? 0)}
            </span>
            <button type="button" onClick={() => void discard()} className="btn btn-ghost gap-2">
              <Trash2 size={12} aria-hidden />
              Remove
            </button>
          </>
        ) : null}
      </div>

      {error ? (
        <p role="alert" className="mt-3 text-[0.72rem] leading-snug text-[var(--danger)]">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function formatTime(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/**
 * A bar strip standing in for a waveform.
 *
 * Deterministic in height from the index, so it does not flicker between renders — a
 * random waveform looks like static, and static reads as broken.
 */
function Waveform({ count, active = false }: { count: number; active?: boolean }) {
  return (
    <span className={cn("flex h-6 items-center gap-[2px]", active && "opacity-90")} aria-hidden>
      {Array.from({ length: count }, (_, i) => {
        const h = 4 + Math.abs(Math.sin(i * 1.7) * Math.cos(i * 0.6)) * 16;
        return (
          <span
            key={i}
            className={cn("w-[2px] rounded-full bg-[var(--gold-ink)]", active && "animate-pulse")}
            style={{ height: h, animationDelay: `${(i % 7) * 90}ms` }}
          />
        );
      })}
    </span>
  );
}
