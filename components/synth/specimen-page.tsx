"use client";

import { Canvas } from "@react-three/fiber";
import { ArrowRight, Droplets, Flower2, Leaf, Sun } from "lucide-react";
import { useRef } from "react";

import { StudioEnvironment } from "@/components/three/studio-environment";
import { useDocumentVisible, useInView, useWebGLSupport } from "@/components/three/lib/use-capabilities";
import { RarityChip } from "@/components/synth/lab";
import { Subject } from "@/components/synth/subject";
import { palettes, SPECIES_CODE } from "@/lib/specimens";
import { useSynth } from "@/lib/store";

import type { Specimen } from "@/lib/specimens";

/**
 * The case, on its own page.
 *
 * The vitrine on /compose is an index: ten species, one canvas, and a case that
 * swaps its subject as you move down the list. That is the right thing when the
 * argument is "there are ten of these". It is the wrong thing when you have
 * followed a link to one plant and want to look at it. This is the same renderer,
 * the same light and the same framing, with nothing else in the room and no way
 * to change the subject.
 */
export function SpecimenStand({ specimen }: { specimen: Specimen }) {
  const theme = useSynth((s) => s.theme);
  const hostRef = useRef<HTMLDivElement>(null);
  const inView = useInView(hostRef, "200px");
  const hasWebGL = useWebGLSupport();
  const visible = useDocumentVisible();

  return (
    <div
      ref={hostRef}
      className="relative aspect-[4/5] w-full overflow-hidden rounded-[1.4rem] border border-[color-mix(in_oklab,var(--gold)_45%,transparent)] shadow-[0_30px_80px_-50px_rgba(74,22,28,0.6),inset_0_0_0_1px_rgba(255,255,255,0.35)] sm:aspect-[5/4]"
      style={{
        background:
          "radial-gradient(120% 90% at 50% 12%, var(--case-top) 0%, var(--case-top) 34%, var(--case-bottom) 100%)",
      }}
    >
      {hasWebGL && inView ? (
        <Canvas
          dpr={[1, 1.7]}
          camera={{ fov: 30, position: [0, 0.55, 3.9] }}
          gl={{ antialias: true, alpha: true }}
          frameloop={visible ? "always" : "demand"}
        >
          <StudioEnvironment theme={theme} palette={palettes.frost} />
          <ambientLight intensity={theme === "dark" ? 0.3 : 0.4} />
          <directionalLight position={[-3.4, 4.6, 3.2]} intensity={theme === "dark" ? 2.1 : 1.2} />
          <directionalLight position={[3.2, 0.8, -2.4]} intensity={theme === "dark" ? 0.9 : 0.55} color="#cfe6ff" />
          <Subject slug={specimen.slug} theme={theme} />
        </Canvas>
      ) : null}

      <p className="pointer-events-none absolute inset-x-0 bottom-0 p-5 font-mono text-[0.55rem] uppercase tracking-[0.2em] text-ink-soft">
        {FORM_LABEL[specimen.form] ?? specimen.form} · {specimen.finish} · {specimen.bloom}
      </p>
    </div>
  );
}

/** the form is a code in the record — "spray", "cup", "spathe" — so it gets a label */
export const FORM_LABEL: Record<string, string> = {
  spiral: "Spiral",
  cup: "Cup",
  spray: "Spray",
  spike: "Spike",
  spathe: "Spathe",
  fan: "Fan",
};

const FACTS = [
  { icon: Leaf, label: "Family" },
  { icon: Flower2, label: "Form" },
  { icon: Sun, label: "Bloom" },
  { icon: Droplets, label: "Origin" },
] as const;

export function SpecimenRecord({ specimen, rarity }: { specimen: Specimen; rarity: string }) {
  const facts = [specimen.family, FORM_LABEL[specimen.form], specimen.bloom, specimen.origin];
  return (
    <dl className="mt-7 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-line pt-5">
      {FACTS.map(({ icon: Icon, label }, i) => (
        <div key={label}>
          <dt className="flex items-center gap-2 font-mono text-[0.55rem] uppercase tracking-[0.22em] text-ink-soft">
            <Icon className="h-3 w-3 text-[var(--gold-ink)]" aria-hidden />
            {label}
          </dt>
          <dd className="mt-1.5 font-display text-[1.05rem] italic leading-tight text-ink">{facts[i]}</dd>
        </div>
      ))}
      <div className="col-span-2 flex items-center gap-3">
        <dt className="font-mono text-[0.55rem] uppercase tracking-[0.22em] text-ink-soft">Rarity</dt>
        <dd>
          <RarityChip rarity={rarity as never} />
        </dd>
      </div>
    </dl>
  );
}

/**
 * A link into the instrument with this species already in the vase.
 *
 * Not a button that mutates the store and pushes: the store is hydrated from the
 * URL on /compose, so a plain query string is the honest way to say "compose with
 * this one". It also means the link survives a hard reload, a share and a
 * bookmark, which a store mutation would not.
 */
export function ComposeWith({ slug, name }: { slug: string; name: string }) {
  const code = SPECIES_CODE[slug] ?? slug;
  const href = `/compose/?f=${code}&d=5`;

  return (
    <a href={href} className="btn btn-primary group mt-8 w-full justify-between sm:w-auto">
      <span>Compose with the {name.toLowerCase()}</span>
      <ArrowRight className="h-3.5 w-3.5 transition-transform duration-500 group-hover:translate-x-1" />
    </a>
  );
}
