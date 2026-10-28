"use client";

import { useMemo } from "react";
import * as THREE from "three";

import { vesselProfile, type Vessel } from "@/lib/bouquet";

import { vesselMaterial, type Theme } from "./materials";
import type { Palette } from "@/lib/specimens";

/**
 * The vessel, lathed from a hand-tuned profile.
 *
 * A lathe profile is what makes this look blown rather than modelled: the wall accelerates
 * into the mouth exactly the way molten glass does. `thickness` on the material then
 * refracts the stems behind it a second time.
 */
const profiles: Record<Vessel, [number, number][]> = {
  // [radius, height] from base to lip
  bulb: [
    [0.0, 0.0], [0.34, 0.0], [0.44, 0.02], [0.55, 0.1], [0.66, 0.26],
    [0.72, 0.5], [0.71, 0.78], [0.62, 1.02], [0.5, 1.2], [0.42, 1.32],
    [0.4, 1.42], [0.41, 1.45], [0.39, 1.46],
  ],
  flute: [
    [0.0, 0.0], [0.26, 0.0], [0.34, 0.02], [0.42, 0.1], [0.48, 0.28],
    [0.5, 0.55], [0.46, 0.86], [0.36, 1.16], [0.28, 1.48], [0.24, 1.82],
    [0.26, 2.06], [0.3, 2.14], [0.28, 2.15],
  ],
  tide: [
    [0.0, 0.0], [0.36, 0.0], [0.46, 0.03], [0.6, 0.1], [0.72, 0.24],
    [0.78, 0.42], [0.78, 0.6], [0.72, 0.74], [0.66, 0.82], [0.64, 0.85],
    [0.65, 0.87], [0.63, 0.88],
  ],
};

function useVesselGeometry(vessel: Vessel) {
  return useMemo(() => {
    const points = profiles[vessel].map(([r, y]) => new THREE.Vector2(r, y));
    // Catmull-Rom through the profile keeps the shoulder smooth without a huge segment count
    const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(p.x, p.y, 0)), false, "catmullrom", 0.5);
    const sampled: THREE.Vector2[] = [];
    const steps = 64;
    for (let i = 0; i <= steps; i++) {
      const p = curve.getPoint(i / steps);
      sampled.push(new THREE.Vector2(Math.max(0.0001, p.x), p.y));
    }
    const geo = new THREE.LatheGeometry(sampled, 96);
    geo.computeVertexNormals();
    return geo;
  }, [vessel]);
}

export function Vessel({
  vessel,
  palette,
  theme,
  waterLevel,
}: {
  vessel: Vessel;
  palette: Palette;
  theme: Theme;
  waterLevel?: number;
}) {
  const geometry = useVesselGeometry(vessel);
  const material = useMemo(() => vesselMaterial(palette, theme), [palette, theme]);
  const profile = vesselProfile[vessel];

  const water = useMemo(() => {
    const level = waterLevel ?? profile.height * 0.62;
    const radius = (profile.belly ?? 0.6) * (1 - Math.min(0.4, (level / profile.height) * 0.3));
    const geo = new THREE.CircleGeometry(radius, 64);
    const mat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(palette.glass),
      roughness: 0.08,
      metalness: 0,
      transmission: 0.85,
      thickness: 0.3,
      ior: 1.33,
      transparent: true,
      opacity: 0.9,
      envMapIntensity: 1.4,
      side: THREE.DoubleSide,
    });
    return { geo, mat, y: level };
  }, [profile, palette, waterLevel]);

  return (
    <group>
      <mesh geometry={geometry} material={material} castShadow receiveShadow />
      {/* the water line, visible through the glass above the stems */}
      <mesh geometry={water.geo} material={water.mat} rotation={[-Math.PI / 2, 0, 0]} position={[0, water.y, 0]} />
    </group>
  );
}
