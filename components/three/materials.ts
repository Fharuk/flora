import * as THREE from "three";

import type { Palette, Specimen } from "@/lib/specimens";

import { noiseNormalMap, noiseRoughnessMap } from "./materials/textures";

export type Theme = "light" | "dark";

/**
 * Physical material recipes.
 *
 * Glass here is not a look — it is transmission with real thickness, dispersion and
 * attenuation. That is why the specimens read as crystal from every angle instead of as
 * a transparent PNG: the refraction is sampled from the actual scene behind each petal.
 */
export function flowerMaterial(spec: Specimen, palette: Palette, theme: Theme): THREE.MeshPhysicalMaterial {
  const tint = new THREE.Color(palette.glass);
  const isDark = theme === "dark";

  const base = {
    vertexColors: true,
    side: THREE.DoubleSide,
    envMapIntensity: isDark ? 1.5 : 1.85,
    normalMap: noiseNormalMap(),
    normalScale: new THREE.Vector2(0.1, 0.1),
    roughnessMap: noiseRoughnessMap(),
    attenuationColor: tint,
    attenuationDistance: isDark ? 4.0 : 6.5,
    sheen: 0.35,
    sheenColor: new THREE.Color(palette.light),
    sheenRoughness: 0.6,
  } as const;

  switch (spec.finish) {
    case "chrome":
      return new THREE.MeshPhysicalMaterial({
        ...base,
        color: new THREE.Color(palette.metal),
        metalness: 1,
        roughness: 0.075,
        clearcoat: 1,
        clearcoatRoughness: 0.04,
        envMapIntensity: isDark ? 2.1 : 1.5,
      });

    case "porcelain":
      return new THREE.MeshPhysicalMaterial({
        ...base,
        color: new THREE.Color("#ffffff"),
        metalness: 0,
        roughness: 0.36,
        transmission: 0.42,
        thickness: 0.9,
        ior: 1.44,
        attenuationColor: tint,
        attenuationDistance: 1.4,
        clearcoat: 1,
        clearcoatRoughness: 0.12,
        sheen: 0.7,
        sheenRoughness: 0.5,
        sheenColor: new THREE.Color(palette.light),
        specularIntensity: 0.9,
      });

    case "iridescent":
      return new THREE.MeshPhysicalMaterial({
        ...base,
        color: new THREE.Color("#ffffff"),
        metalness: 0,
        roughness: 0.05,
        transmission: 0.78,
        thickness: 0.6,
        ior: 1.58,
        attenuationColor: tint,
        attenuationDistance: 3.4,
        iridescence: 1,
        iridescenceIOR: 1.8,
        iridescenceThicknessRange: [120, 720],
        clearcoat: 1,
        clearcoatRoughness: 0.1,
        dispersion: 0.4,
        specularIntensity: 1,
      });

    case "glass":
    default:
      return new THREE.MeshPhysicalMaterial({
        ...base,
        color: new THREE.Color("#ffffff"),
        metalness: 0,
        roughness: 0.18,
        transmission: 0.66,
        thickness: 0.5,
        ior: 1.46,
        attenuationColor: tint,
        attenuationDistance: 6.5,
        clearcoat: 0.55,
        clearcoatRoughness: 0.12,
        dispersion: 0.35,
        specularIntensity: 0.9,
      });
  }
}

/** Stems: opaque, waxy, slightly translucent. */
export function stemMaterial(): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    vertexColors: true,
    color: new THREE.Color("#ffffff"),
    metalness: 0,
    roughness: 0.52,
    transmission: 0.12,
    thickness: 0.4,
    ior: 1.35,
    clearcoat: 0.5,
    clearcoatRoughness: 0.45,
    normalMap: noiseNormalMap(),
    normalScale: new THREE.Vector2(0.35, 0.35),
    sheen: 0.4,
    sheenColor: new THREE.Color("#dff0d8"),
    envMapIntensity: 0.8,
  });
}

/** Core / stamen: emissive enough to read as pollen in a dark scene. */
export function coreMaterial(palette: Palette, theme: Theme): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    vertexColors: true,
    color: new THREE.Color("#ffffff"),
    metalness: 0.15,
    roughness: 0.35,
    emissive: new THREE.Color(palette.light),
    emissiveIntensity: theme === "dark" ? 0.55 : 0.12,
    clearcoat: 0.7,
    envMapIntensity: 1.2,
  });
}

/**
 * The vessel. Thick walled, so refraction compresses the stems behind it — the single
 * biggest cue that a glass object has mass.
 */
export function vesselMaterial(palette: Palette, theme: Theme): THREE.MeshPhysicalMaterial {
  const isDark = theme === "dark";
  return new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(isDark ? "#ffffff" : "#f4fbff"),
    metalness: 0,
    roughness: 0.022,
    transmission: 1,
    thickness: 2.4,
    normalMap: noiseNormalMap(),
    normalScale: new THREE.Vector2(0.06, 0.06),
    ior: 1.5,
    attenuationColor: new THREE.Color(palette.glass),
    attenuationDistance: isDark ? 2.0 : 3.6,
    clearcoat: 1,
    clearcoatRoughness: 0.02,
    dispersion: 1.1,
    specularIntensity: 1.3,
    envMapIntensity: isDark ? 2.6 : 2.2,
    side: THREE.DoubleSide,
  });
}
