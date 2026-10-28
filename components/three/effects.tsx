"use client";

import {
  Bloom,
  ChromaticAberration,
  DepthOfField,
  EffectComposer,
  Noise,
  ToneMapping,
  Vignette,
} from "@react-three/postprocessing";
import { BlendFunction, ToneMappingMode } from "postprocessing";
import { useMemo } from "react";
import * as THREE from "three";

import type { Theme } from "./materials";

/**
 * Post stack.
 *
 * Order matters: tone map first (so bloom sees display values), then bloom, then the
 * lens artefacts (chromatic aberration, vignette, grain). DOF is desktop-only because it
 * costs a full depth prepass.
 */
export function Effects({
  theme,
  quality,
  focusDistance = 0.02,
  bloomIntensity,
}: {
  theme: Theme;
  quality: "high" | "low";
  focusDistance?: number;
  bloomIntensity?: number;
}) {
  const aberration = useMemo(() => new THREE.Vector2(0.00042, 0.00034), []);
  const isDark = theme === "dark";

  return (
    <EffectComposer multisampling={quality === "high" ? 4 : 0} enableNormalPass={false}>
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      <Bloom
        intensity={bloomIntensity ?? (isDark ? 0.62 : 0.22)}
        luminanceThreshold={isDark ? 0.62 : 0.94}
        luminanceSmoothing={0.28}
        mipmapBlur
        radius={0.72}
      />
      {quality === "high" ? (
        <DepthOfField focusDistance={focusDistance} focalLength={0.045} bokehScale={2.4} height={480} />
      ) : (
        <></>
      )}
      <ChromaticAberration offset={aberration} radialModulation modulationOffset={0.35} />
      <Vignette offset={isDark ? 0.28 : 0.18} darkness={isDark ? 0.62 : 0.32} eskil={false} />
      <Noise premultiply blendFunction={BlendFunction.OVERLAY} opacity={isDark ? 0.28 : 0.16} />
    </EffectComposer>
  );
}
