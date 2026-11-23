"use client";

// The story, chapter by chapter. Each chapter is a tall section with a sticky
// stage; the director fades its beats in and out by scroll position
// (data-a / data-b, 0..1 through the chapter) and pins labels to the flower.

import { ArrowDown, ArrowRight } from "lucide-react";
import { STEMS } from "@/lib/stamen/catalog";
import { SPECIES } from "@/lib/stamen/flora";
import { scrollToId } from "./Stage";

/** a scroll beat: the outer box is placed by its classes, the inner one faded by the director */
export function Beat({
  a,
  b,
  stay,
  fade,
  className,
  inner,
  children,
}: {
  a: number | string;
  b: number | string;
  stay?: boolean;
  fade?: number;
  className?: string;
  inner?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <div data-beat={stay ? "stay" : ""} data-a={a} data-b={b} data-f={fade} className={inner} style={{ opacity: 0 }}>
        {children}
      </div>
    </div>
  );
}

/*
 * The copy column stops short of the bouquet, which the camera keeps right of
 * centre. It used to be 38vw — wide enough that "then past it." ran under the
 * petals at 1440.
 */
const COPY_BOX = "absolute inset-x-5 top-[13vh] md:inset-x-auto md:left-[7vw] md:top-[21vh] md:w-[33vw]";

// ------------------------------------------------------------ 01 the film
export function Bloom() {
  return (
    <section id="bloom" data-scene="bloom" className="relative h-[560vh]">
      <h1 className="sr-only">Flora-Synth. Ten specimens. Every petal drawn from numbers.</h1>
      <div className="sticky-stage">
        {/* the page opens 9% into the film (progress is read at the middle of the screen), so the intro holds past that */}
        <Beat a="-1" b="0.125" fade={0.04} className={COPY_BOX}>
          <p className="eyebrow">Flora-Synth · Cut in glass</p>
          <p className="stamen-serif mt-5 text-[17vw] md:text-[7.2vw]">
            Watch one <br />
            <em>open.</em>
          </p>
          <p className="mt-6 max-w-[34ch] text-[16px] leading-snug text-[var(--ink-soft)] md:text-[18px]">
            Three days of window light, ten specimens, every petal drawn from numbers in your browser. Scroll, and run the clock.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <button
              onClick={() => scrollToId("build")}
              className="flex items-center gap-2 rounded-full bg-[#9e2b3e] px-6 py-3.5 text-[12px] font-semibold uppercase tracking-[0.16em] text-white transition-colors hover:bg-[#7d1f2f]"
            >
              Compose one <ArrowRight size={15} />
            </button>
            <span className="stamen-mono flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-[var(--ink-soft)]">
              <ArrowDown size={14} /> Scroll to run the clock
            </span>
          </div>
        </Beat>

        <Beat a="0.23" b="0.33" className={COPY_BOX}>
          <p className="eyebrow">Day one</p>
          <p className="stamen-serif mt-4 text-[14vw] md:text-[5.6vw]">
            Dawn, <br />
            <em>still closed.</em>
          </p>
          <p className="mt-5 max-w-[34ch] text-[16px] leading-snug text-[var(--ink-soft)] md:text-[18px]">
            Every flower here begins as a tight bud. Then the petals unfold a few at a time, outer first — which is why a bouquet is never one moment, it is a sequence.
          </p>
        </Beat>

        <Beat a="0.45" b="0.56" className={COPY_BOX}>
          <p className="eyebrow">Day two</p>
          <p className="stamen-serif mt-4 text-[14vw] md:text-[5.6vw]">
            The colour <br />
            <em>breaks.</em>
          </p>
          <p className="mt-5 max-w-[34ch] text-[16px] leading-snug text-[var(--ink-soft)] md:text-[18px]">
            Green splits and garnet comes through — colour break, the florists call it. It happens in the model the same way it happens in a vase: the pigment sits in the cloth of the petal, and the light finds it.
          </p>
        </Beat>

        <Beat a="0.69" b="0.84" className={COPY_BOX}>
          <p className="eyebrow">Day three</p>
          <p className="stamen-serif mt-4 text-[14vw] md:text-[5.6vw]">
            <em>Full,</em> <br />
            then past it.
          </p>
          <p className="mt-5 max-w-[34ch] text-[16px] leading-snug text-[var(--ink-soft)] md:text-[18px]">
            Peonies the size of your hand, anemones wide open, roses quartered. Keep scrolling and the whole bouquet lets go.
          </p>
        </Beat>
      </div>
    </section>
  );
}

// ------------------------------------------------------------ 02 the petals go
export function Scatter() {
  return (
    <section id="scatter" data-scene="scatter" className="relative h-[210vh]">
      <div className="sticky-stage">
        <Beat a="0.12" b="0.4" className="absolute inset-x-5 top-[16vh] md:inset-x-auto md:left-[7vw] md:top-[28vh]">
          <p className="stamen-serif text-[19vw] md:text-[8.4vw]">
            And then, <br />
            <em>let go.</em>
          </p>
        </Beat>
        <Beat a="0.5" b="0.7" className="absolute inset-x-5 top-[30vh] flex justify-center text-center" inner="flex flex-col items-center">
          <p className="eyebrow">The scatter</p>
          <p className="stamen-serif mt-4 max-w-[13ch] text-[13vw] md:text-[5.4vw]">
            Everything good <em>finishes.</em> Watch it go.
          </p>
          <button
            onClick={() => scrollToId("build")}
            className="mt-8 flex items-center gap-2 rounded-full bg-[#fbf4ec] px-6 py-3.5 text-[12px] font-semibold uppercase tracking-[0.16em] text-[#7d1f2f]"
          >
            Compose one <ArrowRight size={15} />
          </button>
        </Beat>
      </div>
    </section>
  );
}

// ------------------------------------------------------------ 03 up close
const PARTS: { id: string; side: "l" | "r"; name: string; note: string }[] = [
  { id: "petal", side: "r", name: "Tepal", note: "What you'd call a petal" },
  { id: "anther", side: "l", name: "Anther", note: "Where the pollen is made" },
  { id: "filament", side: "r", name: "Filament", note: "The stalk that holds it up" },
  { id: "pistil", side: "l", name: "Pistil", note: "The part that receives it" },
];

export function Closer() {
  return (
    <section id="closer" data-scene="closer" className="relative h-[320vh]">
      <div className="sticky-stage">
        <Beat a="0.06" b="0.4" className="absolute inset-x-5 bottom-[9vh] md:bottom-auto md:left-[7vw] md:right-auto md:top-[24vh] md:w-[34vw]">
          <p className="eyebrow">Fig. 01 · Anemone coronaria</p>
          <p className="stamen-serif mt-4 text-[12vw] md:text-[4.4vw]">
            Named for the part that makes <em>the next one.</em>
          </p>
          <p className="mt-5 max-w-[36ch] text-[15.5px] leading-snug text-[var(--ink-soft)] md:text-[17px]">
            A stamen is a filament and an anther: a stalk, and the pollen it holds up. It's the part the bees come for, and the reason there's a next spring.
          </p>
        </Beat>

        {PARTS.map((p) => (
          <div key={p.id} data-pin={`part-${p.id}`} className="pointer-events-none absolute left-0 top-0" style={{ opacity: 0, visibility: "hidden" }}>
            <div className={`stamen-tag ${p.side === "l" ? "is-left" : ""}`}>
              <span className="dot" />
              <span className="line" />
              <span className="label">
                <span className="stamen-serif block text-[22px] md:text-[26px]">{p.name}</span>
                <span className="stamen-mono hidden text-[10.5px] uppercase tracking-[0.16em] opacity-75 md:block">{p.note}</span>
              </span>
            </div>
          </div>
        ))}

        <Beat a="0.56" b="0.8" className="absolute bottom-[6vh] left-5 right-5 flex justify-center md:justify-end" inner="text-center md:text-right">
          <p className="stamen-mono text-[11px] uppercase tracking-[0.24em] text-[var(--ink-soft)]">Stamen = filament + anther</p>
        </Beat>
      </div>
    </section>
  );
}

// ------------------------------------------------------------ 04 the stems
export function Stems() {
  // the rail in director.ts steps on the same rhythm (STEMS_FIRST / STEMS_STEP)
  const at = (i: number) => 0.1 + i * 0.09;
  return (
    <section id="stems" data-scene="stems" className="relative h-[360vh]">
      <h2 className="sr-only">The stems we build with</h2>
      <div className="sticky-stage">
        <Beat a="0.02" b="0.82" fade={0.04} className="absolute inset-x-5 top-[11vh] flex justify-center md:top-[13vh]" inner="flex w-full max-w-[420px] flex-col items-center">
          <p className="eyebrow">The stems we build with</p>
          <ol className="mt-3 flex w-full items-center gap-1.5">
            {STEMS.map((s, i) => (
              <li key={s.id} data-mark="" data-a={at(i) - 0.04} data-b={at(i) + 0.04} className="stamen-tick">
                <span className="sr-only">{SPECIES[s.id].name}</span>
              </li>
            ))}
          </ol>
        </Beat>
        {STEMS.map((s, i) => (
          <Beat
            key={s.id}
            /*
             * Ten plates inside the same chapter means each card gets 0.09 of
             * the scroll. The card's own fade runs *outside* its window, so the
             * window has to end before the next one begins or two plates show
             * at once — which is exactly what a 0.05 tail and a 0.03 fade did.
             */
            /* the card covers the stop and the half-gap either side of it */
            a={at(i) - 0.038}
            b={at(i) + 0.038}
            fade={0.011}
            className="absolute inset-x-5 bottom-[5vh] md:inset-x-auto md:bottom-auto md:left-[6vw] md:top-[30vh] md:w-[27vw]"
          >
            <p className="stamen-mono text-[11px] uppercase tracking-[0.22em] text-[var(--ink-soft)]">Pl. {String(i + 1).padStart(2, "0")}</p>
            <p className="stamen-serif mt-2 text-[15vw] md:text-[4.6vw]">{SPECIES[s.id].name}</p>
            <p className="stamen-serif stamen-italic text-[18px] text-[var(--ink-soft)] md:text-[22px]">{SPECIES[s.id].latin}</p>
            <dl className="mt-5 grid grid-cols-3 gap-3 border-y border-[var(--line)] py-3 text-[12.5px] md:mt-6">
              <div>
                <dt className="stamen-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-soft)]">Season</dt>
                <dd className="mt-1">{s.season}</dd>
              </div>
              <div>
                <dt className="stamen-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-soft)]">Cut, it holds</dt>
                <dd className="mt-1">{s.hold}</dd>
              </div>
              <div>
                <dt className="stamen-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-soft)]">In the film</dt>
                <dd className="mt-1">{s.stage}</dd>
              </div>
            </dl>
            <p className="mt-4 hidden max-w-[36ch] text-[15px] leading-snug text-[var(--ink-soft)] md:block">{s.note}</p>
          </Beat>
        ))}
      </div>
    </section>
  );
}
