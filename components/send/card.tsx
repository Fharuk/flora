"use client";

import { Music, Video } from "lucide-react";
import { useMemo, useState } from "react";

import { StepNav } from "@/components/send/flowers";
import { PhotoPicker, type PreparedPhoto } from "@/components/send/photos";
import { VoiceNote, type VoiceTake } from "@/components/send/voice-note";
import { EnvelopeStylePicker, LetterPaper, type EnvelopeStyle } from "@/components/synth/envelope";
import { useSend } from "@/lib/send-store";
import { registers } from "@/lib/specimens";
import { parseVideo } from "@/lib/gift";
import { cn } from "@/lib/utils";

/**
 * Step four: the card.
 *
 * The letter is the reason the gift exists; the flowers are how it arrives. So this step
 * is built around the writing — a paper-coloured page with a fixed line length, a counter
 * that counts *lines* rather than characters (a letter is read in lines), and the
 * envelope preview sitting beside it so the sender can see the thing they are filling.
 *
 * The extras — register, photographs, voice, one video — are all optional and all sit
 * below the letter, because a sender who wants to write a note and send it should never
 * have to scroll past a camera to find the send button.
 */

const MAX_LINES = 10;

export function CardStep({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const draft = useSend((s) => s.draft);
  const patch = useSend((s) => s.patch);
  const set = useSend((s) => s.set);
  const addPhoto = useSend((s) => s.addPhoto);
  const removePhoto = useSend((s) => s.removePhoto);
  const setVoice = useSend((s) => s.setVoice);

  const [videoError, setVideoError] = useState<string | null>(null);

  // a line is ~52 characters at this measure; the cap is about length, not layout
  const lines = useMemo(() => countLines(draft.message, 52), [draft.message]);
  const overLimit = lines > MAX_LINES;

  // A gift needs someone to receive it and something written to them. A bouquet with no
  // name and no letter is a link to a picture, which the garden already offers for free.
  const canSend = draft.recipient.trim().length > 0 && draft.message.trim().length > 0 && !overLimit;

  const onAddPhoto = (photo: PreparedPhoto) => {
    addPhoto({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      dataUrl: photo.preview,
      alt: photo.alt,
      ratio: photo.ratio,
    });
  };

  const onKeepVoice = async (_take: VoiceTake) => {
    // the draft holds it locally; the upload happens on the send step, once the gift has
    // a code — a path is built from the code, so it cannot exist before the gift does
    setVoice({ blob: _take.blob, duration: _take.duration, url: _take.url });
    return true;
  };

  const onVideo = (value: string) => {
    set("videoUrl", value);
    if (!value.trim()) {
      setVideoError(null);
      set("videoTitle", "");
      return;
    }
    const parsed = parseVideo({ url: value });
    setVideoError(parsed ? null : "That is not a YouTube link.");
    set("videoTitle", parsed?.title ?? "");
  };

  return (
    <>
      <div className="grid gap-8 lg:grid-cols-[1.06fr_0.94fr] lg:gap-12">
        {/* ------------------------------------------------------------- the letter */}
        <div>
          <LetterPaper style={draft.envelope}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="font-mono text-[0.55rem] uppercase tracking-[0.26em] opacity-50">To</p>
              <p className="font-mono text-[0.55rem] uppercase tracking-[0.2em] opacity-40">
                {lines}/{MAX_LINES} lines
              </p>
            </div>

            <input
              type="text"
              value={draft.recipient}
              onChange={(e) => set("recipient", e.target.value.slice(0, 48))}
              placeholder="Their name"
              aria-label="Their name"
              className="mt-1 w-full border-0 bg-transparent font-display text-[1.7rem] leading-tight outline-none placeholder:opacity-25 focus-visible:underline focus-visible:decoration-current/30 focus-visible:underline-offset-4"
            />

            <div className="my-5 h-px w-full bg-current/12" aria-hidden />

            <textarea
              value={draft.message}
              onChange={(e) => set("message", e.target.value)}
              placeholder="Write the part only they could receive."
              aria-label="Your letter"
              rows={7}
              className="w-full resize-none border-0 bg-transparent font-display text-[1.12rem] leading-[1.8] outline-none placeholder:opacity-30"
            />

            <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
              <div className="min-w-0 flex-1">
                <input
                  type="text"
                  value={draft.creator}
                  onChange={(e) => set("creator", e.target.value.slice(0, 48))}
                  placeholder="Sign it"
                  aria-label="Sign the letter"
                  className="w-full border-0 bg-transparent font-display text-[1.05rem] italic outline-none placeholder:opacity-30"
                />
              </div>
            </div>
          </LetterPaper>

          {overLimit ? (
            <p role="alert" className="mt-2 text-right text-[0.72rem] text-[var(--danger)]">
              {lines - MAX_LINES} line{lines - MAX_LINES === 1 ? "" : "s"} over. A short letter is
              harder to write and easier to keep.
            </p>
          ) : null}

          {/* ---------------------------------------------------- the envelope itself */}
          <div className="mt-8">
            <p className="font-mono text-[0.6rem] uppercase tracking-[0.24em] opacity-60">
              How it arrives
            </p>
            <p className="mt-1.5 mb-3 max-w-[30rem] text-[0.78rem] leading-snug opacity-55">
              The recipient opens this before they see the bouquet. The envelope is the first thing
              they touch.
            </p>
            <EnvelopeStylePicker
              value={draft.envelope}
              onChange={(envelope: EnvelopeStyle) => set("envelope", envelope)}
            />
          </div>
        </div>

        {/* -------------------------------------------------------------- the extras */}
        <div className="space-y-5">
          {/* register */}
          <div className="rounded-sm border border-current/12 p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-mono text-[0.6rem] uppercase tracking-[0.24em] opacity-60">
                  Music · {registers.find((r) => r.key === draft.register)?.name ?? "Glass"}
                </p>
                <p className="mt-1.5 max-w-[26rem] text-[0.78rem] leading-snug opacity-55">
                  Not a track: a way of voicing the score. The melody is drawn from this bouquet's own
                  seed, so no two gifts sound alike, and the same link always plays the same piece.
                </p>
              </div>
              <Music size={16} className="mt-1 shrink-0 opacity-30" aria-hidden />
            </div>

            <div role="radiogroup" aria-label="Music register" className="mt-3 grid grid-cols-2 gap-1.5 sm:grid-cols-3">
              {registers.map((reg) => {
                const selected = draft.register === reg.key;
                return (
                  <button
                    key={reg.key}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => {
                      set("register", reg.key);
                      // mirrored onto the config so the engine reads one source of truth
                      useSend.getState().patch({ config: { ...draft.config, register: reg.key } });
                    }}
                    className={cn(
                      "rounded-sm border px-2.5 py-2 text-left transition-colors",
                      selected ? "border-[var(--gold-ink)] bg-current/[0.05]" : "border-current/12 hover:border-current/28"
                    )}
                  >
                    <span className="block font-display text-[0.86rem] leading-tight">{reg.name}</span>
                    <span className="mt-0.5 block text-[0.6rem] leading-snug opacity-45">{reg.note}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* photographs */}
          <div className="rounded-sm border border-current/12 p-4">
            <PhotoPicker
              photos={draft.photos}
              onAdd={onAddPhoto}
              onRemove={removePhoto}
              onAlt={(id, alt) =>
                useSend.setState((s) => ({
                  draft: {
                    ...s.draft,
                    photos: s.draft.photos.map((p) => (p.id === id ? { ...p, alt: alt.slice(0, 140) } : p)),
                  },
                }))
              }
            />
          </div>

          {/* voice */}
          <VoiceNote
            value={draft.voice ? { duration: draft.voice.duration } : null}
            onChange={(take) => setVoice(take ? { blob: take.blob, duration: take.duration, url: take.url } : null)}
            onKeep={onKeepVoice}
          />

          {/* video */}
          <div className="rounded-sm border border-current/12 p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-mono text-[0.6rem] uppercase tracking-[0.24em] opacity-60">
                  One video
                </p>
                <p className="mt-1.5 max-w-[26rem] text-[0.78rem] leading-snug opacity-55">
                  An unlisted YouTube link, shown as the last page of the letter. We never host or
                  proxy the video — the link is all we store.
                </p>
              </div>
              <Video size={16} className="mt-1 shrink-0 opacity-30" aria-hidden />
            </div>

            <input
              type="url"
              value={draft.videoUrl}
              onChange={(e) => onVideo(e.target.value)}
              placeholder="https://youtu.be/…"
              aria-label="A YouTube link"
              aria-invalid={Boolean(videoError)}
              className="mt-3 w-full rounded-sm border border-current/15 bg-transparent px-3 py-2 text-[0.8rem] outline-none placeholder:opacity-35 focus:border-current/35"
            />
            {videoError ? (
              <p role="alert" className="mt-1.5 text-[0.7rem] text-[var(--danger)]">
                {videoError}
              </p>
            ) : draft.videoUrl && !videoError ? (
              <p className="mt-1.5 font-mono text-[0.55rem] uppercase tracking-[0.18em] opacity-45">
                video ready · {parseVideo({ url: draft.videoUrl })?.id}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      <StepNav
        onBack={onBack}
        onNext={onNext}
        label="Seal it"
        disabled={!canSend}
        hint={
          !draft.recipient.trim()
            ? "Add their name"
            : !draft.message.trim()
              ? "Write the letter"
              : overLimit
                ? "Shorten the letter"
                : undefined
        }
      />
    </>
  );
}

/** How many lines a message occupies at a given measure. */
export function countLines(text: string, measure: number): number {
  if (!text.trim()) return 0;
  return text
    .split("\n")
    .reduce((n, line) => n + Math.max(1, Math.ceil(line.length / measure)), 0);
}
