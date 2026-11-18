import * as THREE from "three";

import type { Palette, Specimen } from "@/lib/specimens";

import { noiseNormalMap, noiseRoughnessMap } from "./materials/textures";

export type Theme = "light" | "dark";

/**
 * The unfurling.
 *
 * Each petal carries a pivot, a hinge axis, a total opening angle and a delay. At growth 0
 * every petal is folded shut around its pivot; at growth 1 the rotation is zero and the
 * flower sits in the pose the geometry was authored in. Because this is a rigid rotation of
 * the petal about its own base, the same matrix can rotate the normal — so the lighting
 * stays correct as the flower opens instead of flattening the way a uniform scale would.
 */
const GROWTH_PARS = /* glsl */ `
  attribute vec3 aGrowPivot;
  attribute vec3 aGrowAxis;
  attribute float aGrowAngle;
  attribute float aGrowDelay;
  uniform float uGrowth;
  uniform float uGrowthScale;

  mat3 growRotation(float ang, vec3 axis) {
    vec3 ax = normalize(axis);
    float c = cos(ang), s = sin(ang), t = 1.0 - c;
    return mat3(
      c + ax.x * ax.x * t,        ax.y * ax.x * t + ax.z * s,  ax.z * ax.x * t - ax.y * s,
      ax.x * ax.y * t - ax.z * s, c + ax.y * ax.y * t,         ax.z * ax.y * t + ax.x * s,
      ax.x * ax.z * t + ax.y * s, ax.y * ax.z * t - ax.x * s,  c + ax.z * ax.z * t
    );
  }
`;

const GROWTH_PROGRESS = /* glsl */ `
  float growProgress() {
    float window = 1.0 - aGrowDelay * 0.55;
    float local = clamp((uGrowth - aGrowDelay * 0.55) / max(window, 0.001), 0.0, 1.0);
    return local * local * (3.0 - 2.0 * local);
  }
`;

/**
 * Injects the growth shader into a stock physical material. `#include` hooks are stable
 * across three releases, unlike rewriting the whole shader, so the transmission, iridescence
 * and sheen paths keep working untouched.
 */
function attachGrowth(material: THREE.MeshPhysicalMaterial, initial = 1) {
  const state = { value: initial };
  material.userData.growth = state;
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uGrowth = state;
    shader.uniforms.uGrowthScale = { value: 1 };
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", `#include <common>\n${GROWTH_PARS}\n${GROWTH_PROGRESS}`)
      .replace(
        "#include <beginnormal_vertex>",
        `#include <beginnormal_vertex>
         float growE = growProgress();
         mat3 growM = growRotation(-aGrowAngle * (1.0 - growE), aGrowAxis);
         objectNormal = growM * objectNormal;`
      )
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
         float growS = mix(uGrowthScale, 1.0, growE);
         transformed = aGrowPivot + growM * ((transformed - aGrowPivot) * growS);`
      );
  };
  // a different shader program per material, but the same cache key for all of them
  material.customProgramCacheKey = () => "flora-growth-v1";
  return material;
}

/** Drive one material's unfurl. Called from the frame loop, never per stem per frame. */
export function setGrowth(material: THREE.Material | null | undefined, value: number) {
  const state = material?.userData?.growth as { value: number } | undefined;
  if (state) state.value = value;
}

/**
 * Physical material recipes.
 *
 * Glass here is not a look — it is transmission with real thickness, dispersion and
 * attenuation. That is why the specimens read as crystal from every angle instead of as
 * a transparent PNG: the refraction is sampled from the actual scene behind each petal.
 */
export function flowerMaterial(
  spec: Specimen,
  palette: Palette,
  theme: Theme,
  growth = 1
): THREE.MeshPhysicalMaterial {
  return attachGrowth(buildFlowerMaterial(spec, palette, theme), growth);
}

function buildFlowerMaterial(spec: Specimen, palette: Palette, theme: Theme): THREE.MeshPhysicalMaterial {
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
    sheenColor: new THREE.Color("#efe4c9"),
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
    // cool white on a warm scene is what made this read as ceramic rather than glass
    color: new THREE.Color(isDark ? "#ffffff" : "#fff8f0"),
    metalness: 0,
    roughness: 0.022,
    transmission: 1,
    thickness: 1.9,
    normalMap: noiseNormalMap(),
    normalScale: new THREE.Vector2(0.05, 0.05),
    ior: 1.5,
    attenuationColor: new THREE.Color(palette.glass),
    // a shorter absorption distance tints the glass so heavily it stops transmitting
    attenuationDistance: isDark ? 3.2 : 6.4,
    clearcoat: 1,
    clearcoatRoughness: 0.02,
    dispersion: 1.1,
    specularIntensity: 1.3,
    envMapIntensity: isDark ? 2.6 : 2.2,
    side: THREE.DoubleSide,
  });
}
