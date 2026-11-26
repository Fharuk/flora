"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

import { buildDisplayStem, buildFlower, speciesBloom } from "@/components/three/flowers/build";
import { flowerMaterial } from "@/components/three/materials";
import { useReducedMotion } from "@/components/three/lib/use-capabilities";
import { getSpecimen } from "@/lib/hybrids";
import { palettes } from "@/lib/specimens";

/**
 * One specimen, in the case.
 *
 * Lifted out of the vitrine so the specimen pages can exhibit the same plant in
 * exactly the same light and at the same framing: the page is meant to be the
 * vitrine's case with nothing else in the room.
 */

/** `theme` is the instrument's light or dark studio, not the browser's. */
export function Subject({ slug, theme }: { slug: string; theme: "light" | "dark" }) {
  const spec = getSpecimen(slug)!;
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
    const scale = THREE.MathUtils.clamp(0.88 / radius, 0.42, 1.15);
    const centreY = (sphere?.center.y ?? 0) * scale;
    return { scale, y: 0.3 - centreY };
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

