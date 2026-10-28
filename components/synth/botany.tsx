"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

import { buildDisplayStem, buildFlower, speciesBloom } from "@/components/three/flowers/build";
import { StudioEnvironment } from "@/components/three/studio-environment";
import { flowerMaterial } from "@/components/three/materials";
import { useDocumentVisible, useInView, useReducedMotion, useWebGLSupport } from "@/components/three/lib/use-capabilities";
import { palettes, specimenBySlug } from "@/lib/specimens";
import { useSynth } from "@/lib/store";
import { cn } from "@/lib/utils";

/**
 * Algorithmic Botany — the same geometry, twice.
 *
 * A single canvas holds two copies of the flower. Local clipping planes cut one copy to
 * the left half and the other to the right, so the wireframe and the physical render are
 * literally the same vertices. Dragging the divider moves the clip planes in world space.
 */

function SplitFlower({ slug, split, theme }: { slug: string; split: number; theme: "light" | "dark" }) {
  const spec = specimenBySlug.get(slug)!;
  const palette = palettes.frost;
  const reduced = useReducedMotion();
  const group = useRef<THREE.Group>(null);

  const bloom = speciesBloom(spec, 0.95);
  const geometry = useMemo(() => buildFlower(spec, bloom), [spec, bloom]);
  const displayStem = useMemo(() => buildDisplayStem(spec, 2.4), [spec]);

  const solid = useMemo(() => flowerMaterial(spec, palette, theme), [spec, palette, theme]);
  const wire = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(theme === "dark" ? "#e8f0ea" : "#2a2a26"),
        wireframe: true,
        transparent: true,
        opacity: 0.42,
        depthWrite: false,
      }),
    [theme]
  );

  // world-space split: x < split shows wireframe, x > split shows the render
  const planeA = useMemo(() => new THREE.Plane(new THREE.Vector3(1, 0, 0), 0), []);
  const planeB = useMemo(() => new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0), []);

  useMemo(() => {
    planeA.constant = -split;
    planeB.constant = split;
  }, [split, planeA, planeB]);

  // Plane(n, c) keeps points where n·p + c > 0.
  // wireframe  → keep x > split   (the left half, since +x is left of the divider)
  // solid      → keep x < split
  const solidClipped = useMemo(() => {
    const m = solid.clone();
    m.clippingPlanes = [planeA];
    m.clipShadows = true;
    return m;
  }, [solid, planeA]);

  const wireClipped = useMemo(() => {
    const m = wire.clone();
    m.clippingPlanes = [planeB];
    return m;
  }, [wire, planeB]);

  useEffect(() => {
    if (group.current) group.current.rotation.y = 0.5;
  }, []);

  useFrame((state, delta) => {
    if (!group.current || reduced) return;
    group.current.rotation.y += delta * 0.12;
    group.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.3) * 0.03;
  });

  return (
    <group ref={group} position={[0, -0.35, 0]} scale={0.92}>
      <mesh geometry={geometry.head} material={solidClipped} />
      <mesh geometry={geometry.head} material={wireClipped} />
      {geometry.core ? <mesh geometry={geometry.core} material={solidClipped} /> : null}
      <mesh geometry={geometry.stem} material={solidClipped} />
      <mesh geometry={displayStem} material={solidClipped} />
    </group>
  );
}

export function Botany() {
  const config = useSynth((s) => s.config);
  const theme = useSynth((s) => s.theme);
  const [split, setSplit] = useState(0);
  const hostRef = useRef<HTMLDivElement>(null);
  const inView = useInView(hostRef, "300px");
  const hasWebGL = useWebGLSupport();
  const visible = useDocumentVisible();
  const dragging = useRef(false);

  const specimen = specimenBySlug.get(config.species[0]) ?? specimenBySlug.get("ghost-orchid")!;

  const onPointer = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const rel = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    setSplit(Math.max(-1.35, Math.min(1.35, rel * 1.55)));
  };

  return (
    <section id="botany" className="relative border-t border-line px-5 py-16 sm:px-8 sm:py-24">
      <div className="mx-auto w-full max-w-[92rem]">
        <div className="flex flex-wrap items-end justify-between gap-6 border-b border-line pb-6">
          <div>
            <p className="label mb-4">02 — Algorithmic botany</p>
            <h2 className="display max-w-2xl text-[clamp(2.2rem,4.6vw,3.8rem)]">
              One geometry. Two <span className="italic text-accent">truths.</span>
            </h2>
          </div>
          <p className="max-w-sm text-[0.88rem] leading-relaxed text-ink-soft">
            Left: the mesh as the engine writes it. Right: the same vertices through glass,
            dispersion and image-based light. Drag the divider.
          </p>
        </div>

        <div
          ref={hostRef}
          onPointerDown={(e) => {
            dragging.current = true;
            e.currentTarget.setPointerCapture(e.pointerId);
            onPointer(e);
          }}
          onPointerMove={onPointer}
          onPointerUp={(e) => {
            dragging.current = false;
            e.currentTarget.releasePointerCapture(e.pointerId);
          }}
          onPointerCancel={() => (dragging.current = false)}
          className="relative mt-8 aspect-[16/10] w-full cursor-ew-resize touch-none select-none overflow-hidden rounded-2xl border border-line bg-[var(--scene-bg)] sm:aspect-[21/9]"
        >
          {hasWebGL && inView ? (
            <Canvas
              dpr={[1, 1.6]}
              camera={{ fov: 30, position: [0, 0.5, 3.6] }}
              gl={{ antialias: true, localClippingEnabled: true, alpha: true }}
              frameloop={visible ? "always" : "demand"}
            >
              <StudioEnvironment theme={theme} palette={palettes.frost} />
              <ambientLight intensity={theme === "dark" ? 0.4 : 1.1} />
              <directionalLight position={[-3, 4, 3]} intensity={theme === "dark" ? 2.6 : 2.2} />
              <directionalLight position={[3, 1, -2]} intensity={1.2} color="#cfe6ff" />
              <SplitFlower slug={specimen.slug} split={split} theme={theme} />
            </Canvas>
          ) : null}

          {/* divider handle */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 w-px bg-ink/40"
            style={{ left: `${((-split + 1.55) / 3.1) * 100}%` }}
          >
            <span className="absolute left-1/2 top-1/2 grid h-9 w-9 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-line bg-paper/90 backdrop-blur">
              <span className="flex gap-1">
                <span className="h-3 w-px bg-ink/50" />
                <span className="h-3 w-px bg-ink/50" />
              </span>
            </span>
          </div>

          <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between px-4 py-3">
            <span className="label label-strong">Wireframe · {specimen.name}</span>
            <span className="label">Final render</span>
          </div>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between px-4 py-3">
            <span className="label">{specimen.form} · procedural</span>
            <span className="label">snoise · petal u/v 9×6</span>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap justify-between gap-2">
          <p className="label">
            {specimen.latin} — {specimen.family}
          </p>
          <p className="label">
            drag to compare · {specimen.origin}
          </p>
        </div>
      </div>
    </section>
  );
}
