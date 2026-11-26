"use client";

import { motion } from "motion/react";
import { Lock, Volume2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { AudioToggle } from "@/components/synth/audio-toggle";
import { Envelope, LetterPaper, type EnvelopeStyle } from "@/components/synth/envelope";
import { BouquetCanvas } from "@/components/three/bouquet-scene";
import { decodeBouquet } from "@/lib/bouquet";
import { FOLIAGE } from "@/lib/foliage";
import { getSpecimen } from "@/lib/hybrids";
import type { GardenEntry } from "@/lib/garden";
import type { GiftMedia, GiftVideo } from "@/lib/gift";
import { useSynth } from "@/lib/store";
import { cn } from "@/lib/utils";

/**
 * The recipient's page.
 *
 * The order of events *is* the gift, so it is worth being precise about it:
 *
 *   1. the envelope, sealed, with their name on it. Nothing else on the page.
 *   2. if there is a PIN, the seal asks for it first — the envelope does not open for a
 *      link alone, and no photograph is even referenced until the code is right.
 *   3. the flap turns, the letter rises, and the bouquet mounts *behind* it for the first
 *      time. The Living Growth animation is the reveal: the flowers open because they
 *      arrived, not on a timer.
 *   4. the letter is read, then the photographs, the voice, the video.
 *
 * Nothing is fetched before step 3 that could give away the contents: the media URLs do
 * not exist until the PIN is cleared, so they cannot be scraped from the page source.
 */

export function GiftExperience({
  entry,
  recipient,
  register,
  locked,
  envelope = "classic",
  video,
}: {
  entry: GardenEntry;
  recipient: string | null;
  register: string;
  locked: boolean;
  envelope?: EnvelopeStyle;
  video: GiftVideo | null;
}) {
  const applyConfig = useSynth((s) => s.applyConfig);
  const config = useSynth((s) => s.config);
  const theme = useSynth((s) => s.theme);

  const [opened, setOpened] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [media, setMedia] = useState<GiftMedia | null>(null);
  const [unlocking, setUnlocking] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [pin, setPin] = useState("");
  const askedRef = useRef(false);

  useEffect(() => {
    applyConfig(decodeBouquet(entry.config));
    setMounted(true);
  }, [applyConfig, entry.config]);

  // count the visit once, silently
  useEffect(() => {
    const key = `flora-gift-${entry.code}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      /* private mode: still fine to count */
    }
    void fetch(`/api/garden/${entry.code}`, { method: "POST" }).catch(() => undefined);
  }, [entry.code]);

  const species = useMemo(
    () => entry.species.map((slug) => getSpecimen(slug)).filter(Boolean),
    [entry.species]
  );

  const foliage = FOLIAGE[config.foliage as keyof typeof FOLIAGE] ?? null;

  /**
   * Open the envelope. When the gift is locked the seal becomes the PIN prompt, and the
   * envelope only turns once the code has been accepted — the animation is the reward for
   * getting it right, so it must not play on a guess.
   */
  const attemptOpen = useCallback(async () => {
    if (unlocking) return;

    /*
     * An open gift still fetches its media — the URLs have to be minted by the server,
     * and they are only minted on this gesture. Until now the page only did this for a
     * locked gift, so an open one opened to a letter with no photographs and no voice,
     * and the sender was never told. The fetch happens on the opening press either way,
     * so nothing is requested before the recipient has chosen to look.
     */
    if (!locked) {
      setOpened(true);
      void fetch(`/api/gift/${entry.code}/unlock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: "" }),
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((body: { media?: GiftMedia } | null) => {
          if (body?.media) setMedia(body.media);
        })
        .catch(() => undefined);
      return;
    }

    setUnlocking(true);
    setPinError(null);
    try {
      const res = await fetch(`/api/gift/${entry.code}/unlock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        media?: GiftMedia;
        error?: string;
        remaining?: number;
      };

      if (res.ok) {
        setMedia(body.media ?? null);
        setOpened(true);
        return;
      }

      setRemaining(typeof body.remaining === "number" ? body.remaining : null);
      setPinError(
        body.error === "locked-out"
          ? "This gift has been locked. Ask the sender for a new link."
          : body.error === "too-many"
            ? "Too many attempts. Wait a minute and try again."
            : body.error === "wrong-pin"
              ? "That is not the right number."
              : "Enter the four to six digit number you were sent."
      );
      setPin("");
    } catch {
      setPinError("The gift could not be opened. Check your connection.");
    } finally {
      setUnlocking(false);
    }
  }, [locked, unlocking, entry.code, pin]);

  // the score starts on the same gesture that opens the envelope, because a Web Audio
  // context begun any earlier is suspended by the browser
  const autoPlayAudio = useCallback(() => {
    if (askedRef.current) return;
    askedRef.current = true;
    // the toggle owns the engine; this only nudges it, so the reveal has a soundtrack
    const button = document.querySelector<HTMLButtonElement>("[data-flora-audio]");
    if (button && register !== "silence") button.click();
  }, [register]);

  const onOpen = () => {
    autoPlayAudio();
  };

  return (
    <section className="relative min-h-[100svh] bg-scene">
      {/* the bouquet mounts only once the envelope is open, so the growth is the reveal */}
      {opened && mounted ? (
        <BouquetCanvas
          key={`${theme}-${entry.code}`}
          config={config}
          theme={theme}
          className="absolute inset-0 h-full w-full"
          label={`The bouquet they sent you, ${entry.title}, drawn in 3D.`}
        />
      ) : null}

      {/* the envelope, before anything else exists */}
      {!opened ? (
        <div className="relative z-10 flex min-h-[100svh] items-center justify-center px-5 py-24">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-[36rem]"
          >
            <div className="mb-8 text-center">
              <p className="label text-[var(--gold-ink)]">Sealed correspondence · {entry.code}</p>
              <h1 className="mt-4 font-display text-[clamp(1.9rem,5vw,2.9rem)] leading-[1.02] tracking-[-0.015em] text-ink">
                {recipient ? `For ${recipient}` : entry.title}
              </h1>
              <p className="mx-auto mt-3 max-w-[24rem] font-display text-[1.02rem] italic leading-relaxed text-ink-soft">
                {entry.creator
                  ? `${entry.creator} composed this for you.`
                  : "Someone composed this for you."}{" "}
                It has been waiting here, unopened.
              </p>
            </div>

            <Envelope
              style={envelope}
              sealLetter={(recipient ?? entry.creator ?? entry.title).trim().charAt(0)}
              label={
                locked
                  ? "Enter the PIN and open the envelope"
                  : `Open the envelope from ${entry.creator ?? "the sender"}`
              }
              onOpen={onOpen}
            />

            {/* the PIN sits under the seal, not instead of it */}
            {locked ? (
              <div className="mx-auto mt-7 max-w-[22rem]">
                <label
                  htmlFor="gift-pin"
                  className="flex items-center justify-center gap-2 font-mono text-[0.55rem] uppercase tracking-[0.24em] text-ink-soft"
                >
                  <Lock size={10} aria-hidden />
                  This one is protected
                </label>
                <input
                  id="gift-pin"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void attemptOpen();
                  }}
                  aria-invalid={Boolean(pinError)}
                  aria-describedby={pinError ? "gift-pin-error" : undefined}
                  placeholder="••••"
                  className="frost mt-2 w-full rounded-sm px-4 py-3 text-center font-mono text-[1.3rem] tracking-[0.55em] outline-none focus-visible:ring-1 focus-visible:ring-[var(--gold-ink)]"
                />
                <button
                  type="button"
                  onClick={() => void attemptOpen()}
                  disabled={unlocking || pin.length < 4}
                  className="btn btn-primary mt-2 w-full disabled:opacity-40"
                >
                  {unlocking ? "Opening…" : "Open the envelope"}
                </button>
                {pinError ? (
                  <p
                    id="gift-pin-error"
                    role="alert"
                    className="mt-2 text-center text-[0.75rem] leading-snug text-[var(--danger)]"
                  >
                    {pinError}
                    {remaining !== null && remaining > 0 ? ` ${remaining} left.` : ""}
                  </p>
                ) : null}
              </div>
            ) : (
              <p className="mt-7 text-center font-mono text-[0.55rem] uppercase tracking-[0.3em] text-ink-soft">
                {entry.creator ? `From ${entry.creator}` : "No signature"}
                {entry.views > 0 ? ` · opened ${entry.views} ${entry.views === 1 ? "time" : "times"}` : ""}
              </p>
            )}
          </motion.div>
        </div>
      ) : null}

      {/* ------------------------------------------------------------- the letter */}
      {opened ? (
        <div className="relative z-10 mx-auto max-w-[46rem] px-5 pb-24 pt-24">
          <div className="mb-8 text-center">
            <p className="font-mono text-[0.55rem] uppercase tracking-[0.28em] text-ink-soft">
              {entry.creator ? `From ${entry.creator}` : "For you"}
            </p>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 26 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
          >
            <LetterPaper style={envelope}>
              {recipient ? (
                <p className="font-display text-[1.7rem] leading-tight">{recipient},</p>
              ) : null}
              <p className="mt-3 whitespace-pre-wrap font-display text-[1.12rem] leading-[1.85]">
                {entry.message ?? "This bouquet was sent without a letter. The flowers are the note."}
              </p>
              {entry.creator ? (
                <p className="mt-6 font-display text-[1.05rem] italic opacity-75">{entry.creator}</p>
              ) : null}
            </LetterPaper>
          </motion.div>

          {/* the composition, named */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 font-mono text-[0.55rem] uppercase tracking-[0.24em] text-ink-soft">
            <span>{entry.title}</span>
            <span aria-hidden>·</span>
            <span>{entry.species.length} species</span>
            {foliage ? (
              <>
                <span aria-hidden>·</span>
                <span>{foliage.name}</span>
              </>
            ) : null}
            {register !== "silence" ? (
              <>
                <span aria-hidden>·</span>
                <span>{register}</span>
              </>
            ) : null}
          </div>

          <div className="mt-3 flex items-center justify-center gap-2" aria-hidden>
            {species.map((spec, i) => (
              <span
                key={`${spec!.slug}-${i}`}
                className="h-2 w-2 rounded-full ring-1 ring-[color-mix(in_oklab,var(--gold)_50%,transparent)]"
                style={{
                  background: `linear-gradient(140deg, ${spec!.colours.petal[0]}, ${spec!.colours.petal[1]})`,
                }}
              />
            ))}
          </div>

          {media?.photos.length ? <PhotoStrip photos={media.photos} /> : null}
          {media?.voice ? <VoicePlayer voice={media.voice} /> : null}
          {video ? <VideoPage video={video} /> : null}

          <div className="mt-12 flex flex-wrap items-center justify-center gap-2">
            <AudioToggle data-flora-audio="gift" />
            <a href="/send" className="btn btn-ghost py-2">
              Send one back
            </a>
          </div>
        </div>
      ) : null}
    </section>
  );
}

/* ---------------------------------------------------------------- photographs */

/**
 * The photographs, as a swipeable strip.
 *
 * Scroll-snap rather than a carousel library: it is one CSS property, it works with a
 * trackpad and a thumb, and it needs no JavaScript. The alt text the sender wrote is the
 * caption — which is the only reason the field exists.
 */
function PhotoStrip({ photos }: { photos: GiftMedia["photos"] }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.7 }}
      className="mt-12"
    >
      <p className="mb-3 font-mono text-[0.55rem] uppercase tracking-[0.26em] text-ink-soft">
        {photos.length === 1 ? "A photograph" : `${photos.length} photographs`}
      </p>
      <ul className="hide-scrollbar -mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-2">
        {photos.map((photo, i) => (
          <li key={photo.path} className="w-[78%] shrink-0 snap-center sm:w-[46%]">
            <figure>
              <div
                className="overflow-hidden rounded-[3px] border border-current/10 bg-current/5"
                style={{ aspectRatio: String(photo.ratio || 1) }}
              >
                {/* a signed URL, minted for this visit — it cannot be rewritten or shared */}
                {/* eslint-disable-next-line @next/next/no-img-element -- a signed URL, not an optimisable asset */}
                <img
                  src={photo.url}
                  alt={photo.alt}
                  loading={i === 0 ? "eager" : "lazy"}
                  className="h-full w-full object-cover"
                />
              </div>
              <figcaption className="mt-2 text-[0.72rem] leading-snug opacity-55">{photo.alt}</figcaption>
            </figure>
          </li>
        ))}
      </ul>
    </motion.div>
  );
}

/* --------------------------------------------------------------------- voice */

/**
 * The voice note.
 *
 * Played by an explicit press, never automatically. Somebody's recorded voice arriving
 * unannounced in a room they are not alone in is a small violation, and the whole point of
 * this gift is that it is careful.
 */
function VoicePlayer({ voice }: { voice: NonNullable<GiftMedia["voice"]> }) {
  const audio = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);

  const toggle = () => {
    if (!audio.current) {
      audio.current = new Audio(voice.url);
      audio.current.onended = () => setPlaying(false);
    }
    if (playing) {
      audio.current.pause();
      setPlaying(false);
    } else {
      void audio.current.play();
      setPlaying(true);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.85 }}
      className="mt-10"
    >
      <div className="flex items-center gap-4 rounded-sm border border-[var(--gold-ink)]/30 p-4">
        <button
          type="button"
          onClick={toggle}
          aria-pressed={playing}
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[var(--gold-ink)]/50 transition-colors",
            playing && "bg-[var(--gold-ink)]/12"
          )}
        >
          <Volume2 size={16} className={cn("text-[var(--gold-ink)]", playing && "animate-pulse")} aria-hidden />
          <span className="sr-only">{playing ? "Pause the voice note" : "Play the voice note"}</span>
        </button>
        <div className="min-w-0">
          <p className="font-mono text-[0.55rem] uppercase tracking-[0.24em] text-ink-soft">
            A voice note · {Math.round(voice.duration)}s
          </p>
          <p className="mt-1 text-[0.8rem] opacity-60">
            {playing ? "Playing — recorded for you." : "Press to hear them say it."}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

/* --------------------------------------------------------------------- video */

/**
 * The video page.
 *
 * `youtube-nocookie` and a click-to-load facade: the embed is not fetched until the
 * recipient asks for it, so opening a gift does not leak a request to Google before they
 * have read a word. The poster is our own gradient, not YouTube's thumbnail, because
 * fetching the thumbnail would defeat the point.
 */
function VideoPage({ video }: { video: GiftVideo }) {
  const [live, setLive] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 1 }}
      className="mt-10"
    >
      <p className="mb-3 font-mono text-[0.55rem] uppercase tracking-[0.26em] text-ink-soft">
        One more page
      </p>
      <div className="relative overflow-hidden rounded-[3px] border border-current/10" style={{ aspectRatio: "16 / 9" }}>
        {live ? (
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${video.id}?autoplay=1&rel=0&modestbranding=1`}
            title={video.title ?? "A video for you"}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 h-full w-full"
          />
        ) : (
          <button
            type="button"
            onClick={() => setLive(true)}
            className="group absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gradient-to-b from-[var(--paper-2)] to-[var(--paper-3)]"
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-full border border-current/25 transition-colors group-hover:border-current/50">
              <span className="ml-1 block h-0 w-0 border-y-[7px] border-l-[11px] border-y-transparent border-l-current/70" aria-hidden />
            </span>
            <span className="font-display text-[1.02rem] italic">
              {video.title ?? "Press to watch"}
            </span>
            <span className="font-mono text-[0.5rem] uppercase tracking-[0.24em] opacity-40">
              plays from YouTube
            </span>
          </button>
        )}
      </div>
    </motion.div>
  );
}
