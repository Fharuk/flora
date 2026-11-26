"use client";

import { motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

/**
 * The envelope.
 *
 * A card that fades in is a webpage. An envelope that opens is a gift: the recipient does
 * something with their hands, and the letter is revealed by that action rather than
 * arriving already unfolded. It is the single cheapest emotional upgrade in the whole
 * flow, which is why it is the one thing worth animating carefully.
 *
 * The construction is four pieces of paper, not a photo of an envelope:
 *
 *   back     the inside of the envelope, behind everything
 *   letter   the card, which rises out of the envelope when the flap lifts
 *   body     the front pocket, drawn *over* the letter's lower half so it reads as
 *            being inside
 *   flap     hinged at the top edge, rotating back and away
 *
 * The z-order matters more than the easing: if the pocket is not painted after the
 * letter, the letter looks pasted on the front. Both are plain divs with clip-paths
 * rather than images, so they take the theme's paper colour and cannot 404.
 */

export type EnvelopeStyle = "classic" | "glass" | "noir";

const STYLES: Record<
  EnvelopeStyle,
  { name: string; note: string; paper: string; pocket: string; flapBack: string; seal: string; ink: string }
> = {
  classic: {
    name: "Ivory",
    note: "Laid paper, a wax seal, nothing modern.",
    paper: "#f7efe2",
    pocket: "#f0e5d4",
    flapBack: "#e6d9c5",
    seal: "#8c3d33",
    ink: "#463229",
  },
  glass: {
    name: "Vellum",
    note: "Translucent, so the flowers show through the paper.",
    paper: "#efe6f0",
    pocket: "#e6dbe9",
    flapBack: "#d9cbe0",
    seal: "#7c6a9c",
    ink: "#3d3348",
  },
  noir: {
    name: "Ink",
    note: "Black stock, gold seal. For a serious letter.",
    paper: "#241d22",
    pocket: "#1b1519",
    flapBack: "#140f13",
    seal: "#c9a227",
    ink: "#f2e8dd",
  },
};

export function EnvelopeStylePicker({
  value,
  onChange,
}: {
  value: EnvelopeStyle;
  onChange: (style: EnvelopeStyle) => void;
}) {
  return (
    <div role="radiogroup" aria-label="Envelope style" className="grid gap-2 sm:grid-cols-3">
      {(Object.keys(STYLES) as EnvelopeStyle[]).map((key) => {
        const style = STYLES[key];
        const selected = value === key;
        return (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(key)}
            className={cn(
              "group relative overflow-hidden rounded-sm border p-3 text-left transition-colors",
              selected ? "border-[var(--gold-ink)] bg-current/5" : "border-current/15 hover:border-current/30"
            )}
          >
            <span
              className="mb-2 block h-9 w-full rounded-[2px]"
              style={{
                background: `linear-gradient(160deg, ${style.paper}, ${style.pocket})`,
                borderTop: `3px solid ${style.flapBack}`,
              }}
              aria-hidden
            />
            <span className="block text-[0.82rem] font-medium">{style.name}</span>
            <span className="mt-0.5 block text-[0.68rem] leading-snug opacity-55">{style.note}</span>
          </button>
        );
      })}
    </div>
  );
}

/**
 * The seal, and what happens when it is broken.
 *
 * `onOpen` fires once. The animation is deliberately slow — 1.1 s for the flap, and the
 * letter does not start to move until the flap is more than half-way — because a fast
 * envelope reads as a page transition, and the whole point is that this is not one.
 */
export function Envelope({
  style = "classic",
  sealLetter,
  label,
  onOpen,
  children,
  className,
}: {
  style?: EnvelopeStyle;
  /** the letter drawn inside the seal */
  sealLetter?: string;
  /** what is being opened, for a screen reader */
  label: string;
  onOpen?: () => void;
  /** the letter itself — only rendered once open */
  children?: React.ReactNode;
  className?: string;
}) {
  const palette = STYLES[style] ?? STYLES.classic;
  const reduced = useReducedMotion();
  const [opened, setOpened] = useState(false);
  const fired = useRef(false);

  const open = () => {
    if (opened) return;
    setOpened(true);
    if (!fired.current) {
      fired.current = true;
      onOpen?.();
    }
  };

  // the flap rotates on the Y axis about its top edge; at 180° it is behind the envelope
  const flapDuration = reduced ? 0 : 1.1;
  const letterDelay = reduced ? 0 : 0.62;

  return (
    <div className={cn("relative", className)}>
      {/* ---------------------------------------------------------- the envelope */}
      <motion.div
        className="relative mx-auto w-full max-w-[34rem]"
        style={{ perspective: 1400 }}
        initial={false}
        animate={opened ? { y: -6 } : { y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="relative" style={{ aspectRatio: "1.5 / 1" }}>
          {/* back of the envelope */}
          <div
            className="absolute inset-0 rounded-[3px] shadow-[0_30px_80px_-40px_rgba(40,20,16,0.55)]"
            style={{ background: palette.flapBack }}
            aria-hidden
          />

          <div className="absolute inset-0 overflow-hidden rounded-[3px]" aria-hidden>
            {/* the note inside, waiting */}
            <div
              className="absolute inset-x-[7%] top-[10%] h-[62%] rounded-[2px]"
              style={{ background: palette.paper, opacity: 0.9 }}
            />
            {/* the pocket, painted over the note's lower half so it sits *inside* */}
            <div
              className="absolute inset-0"
              style={{
                background: palette.pocket,
                clipPath: "polygon(0 0, 50% 46%, 100% 0, 100% 100%, 0 100%)",
              }}
            />
            {/* the two creases that tell the eye this is a folded object */}
            <div
              className="absolute inset-0 opacity-40"
              style={{
                background: `linear-gradient(to bottom right, transparent 49.6%, ${palette.flapBack} 50%, transparent 50.4%)`,
              }}
            />
            <div
              className="absolute inset-0 opacity-40"
              style={{
                background: `linear-gradient(to bottom left, transparent 49.6%, ${palette.flapBack} 50%, transparent 50.4%)`,
              }}
            />
          </div>

          {/* the flap — an actual triangle hinged at the top edge */}
          <motion.div
            className="absolute inset-x-0 top-0 origin-top"
            style={{ height: "62%", transformStyle: "preserve-3d" }}
            initial={false}
            animate={{ rotateX: opened ? -172 : 0 }}
            transition={{ duration: flapDuration, ease: [0.32, 0.06, 0.28, 1] }}
            aria-hidden
          >
            <div
              className="h-full w-full"
              style={{
                background: palette.flapBack,
                clipPath: "polygon(0 0, 100% 0, 50% 100%)",
                backfaceVisibility: "hidden",
              }}
            />
            <div
              className="absolute inset-0 h-full w-full"
              style={{
                background: palette.pocket,
                clipPath: "polygon(0 0, 100% 0, 50% 100%)",
                transform: "rotateY(180deg)",
                backfaceVisibility: "hidden",
              }}
            />
          </motion.div>

          {/* the seal: the only clickable thing, until it is broken */}
          {!opened ? (
            <div className="absolute inset-x-0 top-[46%] flex justify-center">
              <motion.button
                type="button"
                onClick={open}
                aria-label={label}
                className="seal candle relative h-16 w-16 md:h-20 md:w-20"
                style={{ background: undefined }}
                whileHover={{ scale: 1.06 }}
                whileTap={{ scale: 0.94 }}
              >
                <span
                  className="absolute inset-0 rounded-full"
                  style={{ background: palette.seal, opacity: 0.92 }}
                  aria-hidden
                />
                <span
                  className="relative font-display text-xl italic leading-none md:text-2xl"
                  style={{ color: style === "noir" ? "#241d22" : "#fdf6ec" }}
                >
                  {(sealLetter ?? "✦").toUpperCase()}
                </span>
              </motion.button>
            </div>
          ) : null}
        </div>

        {/* the instructions, so the seal is not a mystery */}
        {!opened ? (
          <p className="mt-5 text-center font-sans text-[0.55rem] uppercase tracking-[0.3em] opacity-45">
            Press the seal to open
          </p>
        ) : null}
      </motion.div>

      {/* ------------------------------------------------------------- the letter */}
      {opened ? (
        <motion.div
          initial={reduced ? false : { opacity: 0, y: 34, scale: 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.9, delay: letterDelay, ease: [0.16, 1, 0.3, 1] }}
          className="relative mt-6"
        >
          {children}
        </motion.div>
      ) : null}
    </div>
  );
}

/**
 * The letter paper the card sits on.
 *
 * A ruled sheet, drawn rather than downloaded: the lines are one repeating gradient, and
 * they follow the theme, which a PNG of paper cannot. The deckle edge is a small
 * irregular clip-path so the sheet does not look die-cut.
 */
export function LetterPaper({
  style = "classic",
  className,
  children,
}: {
  style?: EnvelopeStyle;
  className?: string;
  children: React.ReactNode;
}) {
  const palette = STYLES[style] ?? STYLES.classic;
  return (
    <div
      className={cn("relative overflow-hidden rounded-[2px] px-6 py-8 md:px-10 md:py-11", className)}
      style={{
        background: palette.paper,
        color: palette.ink,
        boxShadow: "0 26px 60px -44px rgba(40,20,16,0.7)",
      }}
    >
      {/* the ruled lines: a repeating gradient, not an image */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.16]"
        aria-hidden
        style={{
          backgroundImage: `repeating-linear-gradient(to bottom, transparent 0, transparent 31px, ${palette.ink} 31px, ${palette.ink} 32px)`,
          backgroundPosition: "0 44px",
        }}
      />
      <div className="relative">{children}</div>
    </div>
  );
}

/** A wax-seal style button, shared by the envelope and the share step. */
export function SealButton({
  onClick,
  disabled,
  children,
  className,
}: {
  onClick?: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn("btn btn-primary group w-full disabled:opacity-50", className)}
    >
      {children}
    </button>
  );
}

/**
 * Auto-open: used on the recipient page when the gift has no PIN and the sender asked
 * for it to open on arrival. Kept as a hook so the envelope stays a pure component.
 */
export function useAutoOpen(enabled: boolean, delay = 900) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!enabled) return;
    const t = window.setTimeout(() => setArmed(true), delay);
    return () => window.clearTimeout(t);
  }, [enabled, delay]);
  return armed;
}
