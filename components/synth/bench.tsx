"use client";

import { Canvas } from "@react-three/fiber";
import { useMemo, useRef, useState } from "react";
import * as THREE from "three";

import { buildFlower, speciesBloom } from "@/components/three/flowers/build";
import { StudioEnvironment } from "@/components/three/studio-environment";
import { flowerMaterial } from "@/components/three/materials";
import { getSpecimen } from "@/lib/hybrids";
import { palettes, specimens, type Specimen } from "@/lib/specimens";

/**
 * The bench.
 *
 * Six numbers decide a petal ring: how many petals, how many layers, how long and
 * how wide each one is, how far it cups toward the centre, how far it curls away,
 * how much it twists, how far each layer rises, and how far the ring spreads. Until
 * now the only way to understand one of them was to change it and reload.
 *
 * Everything here is a view over one mutated copy of a real specimen, so the
 * material, the bloom curve and the framing are the collection's own: what you
 * see is what that plant would look like if its recipe said this.
 */

type Petals = Specimen["petals"];

const KNOBS: {
  key: keyof Petals;
  label: string;
  min: number;
  max: number;
  step: number;
  note: string;
}[] = [
  { key: "count", label: "petals", min: 3, max: 24, step: 1, note: "per ring" },
  { key: "layers", label: "layers", min: 1, max: 5, step: 1, note: "rings, stacked" },
  { key: "length", label: "length", min: 0.3, max: 1.6, step: 0.01, note: "tip to base" },
  { key: "width", label: "width", min: 0.1, max: 0.9, step: 0.01, note: "across the petal" },
  { key: "cup", label: "cup", min: -0.6, max: 1, step: 0.01, note: "toward the centre" },
  { key: "curl", label: "curl", min: -0.8, max: 0.8, step: 0.01, note: "away from it" },
  { key: "twist", label: "twist", min: -1, max: 1, step: 0.01, note: "about its own axis" },
  { key: "rise", label: "rise", min: -0.2, max: 0.6, step: 0.01, note: "per layer" },
  { key: "spread", label: "spread", min: 1.2, max: Math.PI * 2, step: 0.01, note: "of the ring" },
];

export function Bench() {
  const [slug, setSlug] = useState(() => {
    if (typeof window === "undefined") return specimens[0].slug;
    const want = new URLSearchParams(window.location.search).get("f");
    return want && specimens.some((s) => s.slug === want) ? want : specimens[0].slug;
  });
  const base = getSpecimen(slug) ?? specimens[0];
  const [petals, setPetals] = useState<Petals>(() => fromUrl(base));
  const [bloom, setBloom] = useState(0.9);
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  /* the geometry is rebuilt from the mutated recipe, which is the point of the page */
  const spec = useMemo<Specimen>(() => ({ ...base, petals }), [base, petals]);
  const palette = palettes.frost;

  const reset = (next = base.petals) => setPetals({ ...next });

  return (
    <div className="min-h-screen bg-[#120a0b] text-[#f4e7dd]">
      <header className="border-b border-white/10 px-6 py-5">
        <p className="font-mono text-[0.55rem] uppercase tracking-[0.26em] text-white/45">
          Flora-Synth · the bench · not for visitors
        </p>
        <h1 className="mt-2 font-display text-[1.8rem] leading-none">The six numbers behind a petal</h1>
      </header>

      <div className="grid gap-6 p-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        {/* ---------------------------------------------------------- the flower */}
        <div className="relative min-h-[60vh] overflow-hidden rounded-lg border border-white/10 bg-[#1a0f11]">
          <Canvas
            key={`${slug}-${theme}`}
            dpr={[1, 2]}
            camera={{ fov: 30, position: [0, 0.7, 4.4] }}
            gl={{ antialias: true, alpha: true }}
          >
            <StudioEnvironment theme={theme} palette={palette} />
            <ambientLight intensity={theme === "dark" ? 0.35 : 0.5} />
            <directionalLight position={[-3.4, 4.6, 3.2]} intensity={theme === "dark" ? 2.2 : 1.3} />
            <directionalLight position={[3.2, 0.8, -2.4]} intensity={0.7} color="#cfe6ff" />
            <BenchSubject spec={spec} bloom={bloom} theme={theme} />
          </Canvas>
          <p className="pointer-events-none absolute bottom-3 left-4 font-mono text-[0.55rem] uppercase tracking-[0.2em] text-white/40">
            {petals.count} × {petals.layers} petals · {petals.layers} ring{petals.layers === 1 ? "" : "s"} · bloom {bloom.toFixed(2)}
          </p>
        </div>

        {/* ------------------------------------------------------------ the knobs */}
        <div className="space-y-5">
          <label className="block">
            <span className="font-mono text-[0.55rem] uppercase tracking-[0.22em] text-white/45">Specimen</span>
            <select
              value={slug}
              onChange={(e) => {
                setSlug(e.target.value);
                const next = getSpecimen(e.target.value);
                if (next) reset(next.petals);
              }}
              className="mt-1 w-full rounded border border-white/15 bg-transparent px-2.5 py-2 text-sm"
            >
              {specimens.map((s) => (
                <option key={s.slug} value={s.slug} className="bg-[#1a0f11]">
                  {s.name}
                </option>
              ))}
            </select>
          </label>

          {KNOBS.map((k) => (
            <label key={k.key} className="block">
              <span className="flex items-baseline justify-between">
                <span className="font-mono text-[0.6rem] uppercase tracking-[0.2em] text-white/60">{k.label}</span>
                <span className="font-mono text-[0.7rem] tabular-nums text-white/85">
                  {typeof petals[k.key] === "number" ? Number(petals[k.key]).toFixed(k.step < 1 ? 2 : 0) : ""}
                </span>
              </span>
              <input
                type="range"
                min={k.min}
                max={k.max}
                step={k.step}
                value={Number(petals[k.key])}
                onChange={(e) => setPetals((p) => ({ ...p, [k.key]: Number(e.target.value) }))}
                className="mt-1 w-full accent-[#9e2b3e]"
                aria-label={`${k.label}, ${k.note}`}
              />
              <span className="font-mono text-[0.5rem] uppercase tracking-[0.18em] text-white/30">{k.note}</span>
            </label>
          ))}

          <label className="block">
            <span className="flex items-baseline justify-between">
              <span className="font-mono text-[0.6rem] uppercase tracking-[0.2em] text-white/60">open</span>
              <span className="font-mono text-[0.7rem] tabular-nums text-white/85">{bloom.toFixed(2)}</span>
            </span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={bloom}
              onChange={(e) => setBloom(Number(e.target.value))}
              className="mt-1 w-full accent-[#9e2b3e]"
              aria-label="How far the flower has opened"
            />
          </label>

          <div className="flex flex-wrap gap-2 border-t border-white/10 pt-4">
            <button
              type="button"
              onClick={() => reset()}
              className="rounded border border-white/20 px-3 py-1.5 font-mono text-[0.55rem] uppercase tracking-[0.2em]"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
              className="rounded border border-white/20 px-3 py-1.5 font-mono text-[0.55rem] uppercase tracking-[0.2em]"
            >
              {theme === "dark" ? "Dark" : "Light"}
            </button>
            <button
              type="button"
              onClick={() => navigator.clipboard?.writeText(recipeUrl(spec))}
              className="rounded border border-white/20 px-3 py-1.5 font-mono text-[0.55rem] uppercase tracking-[0.2em]"
            >
              Copy recipe
            </button>
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard?.writeText(recipeObject(spec));
              }}
              className="rounded border border-white/20 px-3 py-1.5 font-mono text-[0.55rem] uppercase tracking-[0.2em]"
            >
              Copy petals
            </button>
          </div>

          <pre className="max-h-40 overflow-auto rounded border border-white/10 bg-black/30 p-3 font-mono text-[0.62rem] leading-relaxed text-white/70">
            {recipeObject(spec)}
          </pre>
          <p className="font-mono text-[0.5rem] uppercase tracking-[0.2em] text-white/30">
            “Copy recipe” copies a link that reopens this exact flower.
          </p>
        </div>
      </div>
    </div>
  );
}

function BenchSubject({ spec, bloom, theme }: { spec: Specimen; bloom: number; theme: "light" | "dark" }) {
  const group = useRef<THREE.Group>(null);
  const palette = palettes.frost;

  const geometry = useMemo(() => buildFlower(spec, speciesBloom(spec, bloom)), [spec, bloom]);
  const material = useMemo(() => flowerMaterial(spec, palette, theme, 1), [spec, theme, palette]);

  /* frame from the geometry's own bounds, so a 24-petal spike is not cropped */
  const framing = useMemo(() => {
    geometry.head.computeBoundingSphere();
    const r = Math.max(geometry.head.boundingSphere?.radius ?? 1, 0.05);
    return 0.95 / r;
  }, [geometry]);

  return (
    <group scale={framing}>
      <mesh geometry={geometry.head} material={material} />
      {geometry.core ? <mesh geometry={geometry.core} material={material} /> : null}
    </group>
  );
}

/**
 * The recipe as a URL.
 *
 * A bench that cannot hand its result to anyone is a toy. `?f=peony&petal=…` names
 * the specimen and the nine numbers in the order the type declares them, so a link
 * reopens the exact flower — and `fromUrl` reads it back on mount.
 */
function recipeUrl(spec: Specimen): string {
  const q = new URLSearchParams({ f: spec.slug, petal: Object.values(spec.petals).map((v) => Number(v).toFixed(2)).join(",") });
  return `${window.location.origin}/bench?${q.toString()}`;
}

const PETAL_KEYS: (keyof Specimen["petals"])[] = [
  "count",
  "layers",
  "length",
  "width",
  "cup",
  "curl",
  "twist",
  "rise",
  "spread",
];

/** the petals in the URL, or the specimen's own */
function fromUrl(base: Specimen): Specimen["petals"] {
  if (typeof window === "undefined") return base.petals;
  const raw = new URLSearchParams(window.location.search).get("petal");
  if (!raw) return base.petals;
  const v = raw.split(",").map(Number);
  if (v.length !== PETAL_KEYS.length || v.some((n) => !Number.isFinite(n))) return base.petals;
  const out = { ...base.petals };
  PETAL_KEYS.forEach((key, i) => {
    out[key] = key === "count" || key === "layers" ? Math.round(v[i]) : v[i];
  });
  return out;
}

/** the recipe as a paste-ready source block, because that is what happens next */
function recipeObject(spec: Specimen): string {
  const p = spec.petals;
  const r = (v: number) => Math.round(v * 100) / 100;
  return `slug: "${spec.slug}"
petals: {
  count: ${p.count},
  layers: ${p.layers},
  length: ${r(p.length)},
  width: ${r(p.width)},
  cup: ${r(p.cup)},
  curl: ${r(p.curl)},
  twist: ${r(p.twist)},
  rise: ${r(p.rise)},
  spread: ${r(p.spread)},
}`;
}
