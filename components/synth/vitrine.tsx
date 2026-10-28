"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { AnimatePresence, motion } from "motion/react";
import { Plus } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import * as THREE from "three";

import { buildDisplayStem, buildFlower, speciesBloom } from "@/components/three/flowers/build";
import { StudioEnvironment } from "@/components/three/studio-environment";
import { flowerMaterial } from "@/components/three/materials";
import { useDocumentVisible, useInView, useReducedMotion, useWebGLSupport } from "@/components/three/lib/use-capabilities";
import { palettes, specimens, specimenBySlug } from "@/lib/specimens";
import { useSynth } from "@/lib/store";
import { cn } from "@/lib/utils";

/**
 * Specimen vitrine: ten species, one canvas.
 *
 * Rendering ten live flowers would mean ten contexts and ten environments. Instead the
 * vitrine is a single studio render that swaps its subject — the index does the work of a
 * gallery, the canvas does the work of a museum case.
 */

function Subject({ slug, theme }: { slug: string; theme: "light" | "dark" }) {
  const spec = specimenBySlug.get(slug)!;
  // the case tints the glass with the species' own pigment — on a neutral frost tint every
  // specimen read as the same white flower once it was inside the vitrine
  const palette = useMemo(
    () => ({
      ...palettes.frost,
      glass: spec.colours.petal[0],
      metal: spec.colours.core,
      light: spec.colours.petal[1],
    }),
    [spec]
  );
  const reduced = useReducedMotion();
  const group = useRef<THREE.Group>(null);

  const bloom = speciesBloom(spec, 0.94);
  const geometry = useMemo(() => buildFlower(spec, bloom), [spec, bloom]);
  const displayStem = useMemo(() => buildDisplayStem(spec, 2.2), [spec]);
  const material = useMemo(() => flowerMaterial(spec, palette, theme), [spec, palette, theme]);

  /*
   * Frame the subject from its own bounds instead of by species weight. A ghost orchid's
   * spray is nearly four times the radius of a ranunculus at the same nominal size, so any
   * fixed scale either overflows the case or shrinks the small species to a dot.
   */
  const framing = useMemo(() => {
    geometry.head.computeBoundingSphere();
    const sphere = geometry.head.boundingSphere;
    const radius = Math.max(sphere?.radius ?? 1, 0.05);
    const scale = THREE.MathUtils.clamp(0.72 / radius, 0.4, 1.1);
    const centreY = (sphere?.center.y ?? 0) * scale;
    return { scale, y: 0.44 - centreY };
  }, [geometry]);

  useFrame((state, delta) => {
    if (!group.current) return;
    if (!reduced) group.current.rotation.y += delta * 0.24;
    group.current.position.y = Math.sin(state.clock.elapsedTime * 0.4) * 0.02;
  });

  return (
    <group scale={framing.scale} position={[0, framing.y, 0]}>
      <group ref={group}>
        <mesh geometry={geometry.head} material={material} />
        {geometry.core ? <mesh geometry={geometry.core} material={material} /> : null}
        <mesh geometry={geometry.stem} material={material} />
        <mesh geometry={displayStem} material={material} />
      </group>
    </group>
  );
}

export function Vitrine() {
  const theme = useSynth((s) => s.theme);
  const config = useSynth((s) => s.config);
  const addSpecies = useSynth((s) => s.addSpecies);
  const setSpecies = useSynth((s) => s.setSpecies);
  const [active, setActive] = useState(specimens[0].slug);

  const hostRef = useRef<HTMLDivElement>(null);
  const inView = useInView(hostRef, "200px");
  const hasWebGL = useWebGLSupport();
  const visible = useDocumentVisible();

  const specimen = specimenBySlug.get(active) ?? specimens[0];
  const inBouquet = config.species.includes(specimen.slug);

  return (
    <section id="specimens" className="relative border-t border-line px-5 py-16 sm:px-8 sm:py-24">
      <div className="mx-auto w-full max-w-[92rem]">
        <div className="flex flex-wrap items-end justify-between gap-6 border-b border-line pb-6">
          <div>
            <p className="label mb-4">03 — Exotic specimens</p>
            <h2 className="display max-w-2xl text-[clamp(2.2rem,4.6vw,3.8rem)]">
              Ten that were never <span className="italic text-accent">meant</span> to be glass.
            </h2>
          </div>
          <p className="max-w-sm text-[0.88rem] leading-relaxed text-ink-soft">
            Selected for silhouette, rarity and how they behave under refraction. Click an entry to
            put it in the vitrine.
          </p>
        </div>

        <div className="mt-8 grid grid-cols-12 gap-6 lg:gap-10">
          {/* index */}
          <div className="col-span-12 lg:col-span-5">
            <ul className="divide-y divide-[var(--line)] border-y border-line">
              {specimens.map((s, i) => {
                const isActive = s.slug === active;
                return (
                  <li key={s.slug}>
                    <button
                      type="button"
                      onClick={() => setActive(s.slug)}
                      onPointerEnter={() => setActive(s.slug)}
                      aria-pressed={isActive}
                      className={cn(
                        "group grid w-full grid-cols-[2.2rem_1fr_auto] items-center gap-3 py-3.5 text-left transition-colors",
                        isActive ? "text-ink" : "text-ink-soft hover:text-ink"
                      )}
                    >
                      <span className="font-mono text-[0.6rem] tracking-[0.18em] text-ink-soft">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span>
                        <span className="block font-display text-[1.35rem] leading-tight">{s.name}</span>
                        <span className="block font-mono text-[0.55rem] uppercase tracking-[0.14em] text-ink-soft">
                          {s.family} · {s.origin}
                        </span>
                      </span>
                      <span
                        aria-hidden
                        className={cn(
                          "h-6 w-6 rounded-full border transition-all duration-500",
                          isActive ? "border-ink bg-ink" : "border-line group-hover:border-[var(--line-strong)]"
                        )}
                      >
                        <span
                          className={cn(
                            "m-auto block h-2 w-2 rounded-full transition-colors duration-500",
                            isActive ? "bg-paper" : "bg-transparent"
                          )}
                          style={{ marginTop: "0.44rem" }}
                        />
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* case */}
          <div className="col-span-12 lg:col-span-7">
            <div
              ref={hostRef}
              className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-line sm:aspect-[16/11]"
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

              <AnimatePresence mode="wait">
                <motion.div
                  key={specimen.slug}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.4 }}
                  className="pointer-events-none absolute inset-x-0 bottom-0 p-5"
                >
                  <p className="label mb-1">{specimen.bloom} · {specimen.finish}</p>
                  <p className="max-w-md font-display text-[1.05rem] italic leading-snug text-ink">
                    {specimen.note}
                  </p>
                </motion.div>
              </AnimatePresence>

              <div className="absolute inset-x-0 top-0 flex items-start justify-between p-4">
                <span className="label label-strong">{specimen.latin}</span>
                <button
                  type="button"
                  onClick={() => addSpecies(specimen.slug)}
                  className={cn(
                    "pointer-events-auto inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-mono text-[0.55rem] uppercase tracking-[0.16em] transition-colors",
                    inBouquet
                      ? "border-accent/60 bg-accent/15 text-ink"
                      : "border-line bg-paper/70 text-ink backdrop-blur hover:border-ink"
                  )}
                >
                  <Plus className="h-3 w-3" />
                  {inBouquet ? "In bouquet" : "Add to bouquet"}
                </button>
              </div>
            </div>

            <div className="mt-5 grid gap-5 sm:grid-cols-[1.4fr_1fr]">
              <p className="text-[0.86rem] leading-relaxed text-ink-soft">{specimen.blurb}</p>
              <dl className="space-y-2 border-t border-line pt-3 text-[0.72rem] sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0">
                <div className="flex justify-between gap-3">
                  <dt className="label">Form</dt>
                  <dd className="text-ink">{specimen.form}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="label">Finish</dt>
                  <dd className="text-ink">{specimen.finish}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="label">Weight</dt>
                  <dd className="text-ink">{specimen.weight.toFixed(1)}</dd>
                </div>
              </dl>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setSpecies([specimen.slug])}
                className="btn btn-ghost"
              >
                Compose a solitaire
              </button>
              <button
                type="button"
                onClick={() => {
                  setSpecies([specimen.slug, specimens[(specimens.indexOf(specimen) + 3) % specimens.length].slug]);
                }}
                className="btn btn-ghost"
              >
                Pair it
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
