"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

import { noise } from "./lib/glsl";
import type { Theme } from "./materials";
import type { Palette } from "@/lib/specimens";

/**
 * Caustics.
 *
 * Real caustics need photon mapping; this is the well-known iterative refraction
 * approximation (Dave Hoskins' "caustic" formulation), layered under the vessel and
 * masked to the pool of light the key softbox would throw. At 0.25 intensity it reads as
 * light, not as a pattern — which is the whole trick.
 */
const CAUSTIC_FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv;

uniform float uTime;
uniform float uIntensity;
uniform vec3  uColor;
uniform float uScale;

${noise}

// Two crossing wave fields, each refracted by the other. Smoother and more believable
// than the classic cell-based caustic at low sample counts, and it never tiles visibly.
float caustic(vec2 p, float time) {
  vec2 q = p;
  float w = 0.0;
  for (int i = 0; i < 5; i++) {
    float fi = float(i) + 1.0;
    q += vec2(
      sin(q.y * (1.6 + fi * 0.45) + time * (0.6 + fi * 0.12)),
      cos(q.x * (1.5 + fi * 0.4) - time * (0.5 + fi * 0.1))
    ) * 0.22;
    w += 1.0 / (0.6 + abs(length(q) - 1.1 - fi * 0.18));
  }
  w /= 5.0;
  return pow(1.0 - clamp(w * 0.34, 0.0, 1.0), 5.0);
}

void main() {
  vec2 uv = (vUv - 0.5) * 2.0;
  float d = length(uv);

  float ca = caustic(uv * uScale * 0.8, uTime * 0.45);
  ca = smoothstep(0.15, 0.95, ca);
  ca *= smoothstep(0.95, 0.15, d);
  ca += caustic(uv * uScale * 1.35 + 3.0, uTime * 0.3) * 0.35 * smoothstep(0.8, 0.05, d);

  float pool = smoothstep(1.0, 0.0, d);
  vec3 col = uColor * (ca * uIntensity * 0.5 + pow(pool, 4.0) * 0.03);

  gl_FragColor = vec4(col, 1.0);
}
`;

const CAUSTIC_VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export function Ground({ theme, palette, animated }: { theme: Theme; palette: Palette; animated: boolean }) {
  const causticMat = useRef<THREE.ShaderMaterial>(null);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uIntensity: { value: theme === "dark" ? 0.8 : 0.0 },
      uColor: { value: new THREE.Color(palette.light) },
      uScale: { value: 1.35 },
    }),
    // rebuilt when the theme/palette changes
    [theme, palette]
  );

  useFrame((state) => {
    if (!causticMat.current) return;
    causticMat.current.uniforms.uTime.value = animated ? state.clock.elapsedTime : 3.2;
  });

  const floorColour = theme === "dark" ? "#080b0e" : "#c9ced1";


  return (
    <group>
      {/* the surface the vessel sits on */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <circleGeometry args={[26, 96]} />
        <meshPhysicalMaterial
          color={new THREE.Color(floorColour)}
          roughness={theme === "dark" ? 0.46 : 0.55}
          metalness={0}
          envMapIntensity={theme === "dark" ? 0.12 : 0.28}
          clearcoat={theme === "dark" ? 0.15 : 0.1}
          clearcoatRoughness={0.36}
        />
      </mesh>

      {/* light pooled through the glass */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, 0]} visible={theme === "dark"}>
        <planeGeometry args={[7.5, 7.5]} />
        <shaderMaterial
          ref={causticMat}
          vertexShader={CAUSTIC_VERT}
          fragmentShader={CAUSTIC_FRAG}
          uniforms={uniforms}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* A soft contact shadow, drawn as a radial falloff. drei's ContactShadows
          re-renders a depth pass and bands badly at this scale; a gradient is stable,
          costs one draw call, and reads identically at this distance. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.008, 0]}>
        <planeGeometry args={[4.6, 4.6]} />
        <shaderMaterial
          transparent
          depthWrite={false}
          uniforms={{ uColor: { value: new THREE.Color(theme === "dark" ? "#000000" : "#5e676c") } }}
          vertexShader={/* glsl */ `
            varying vec2 vUv;
            void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
          `}
          fragmentShader={/* glsl */ `
            precision highp float;
            varying vec2 vUv;
            uniform vec3 uColor;
            void main() {
              vec2 p = (vUv - 0.5) * 2.0;
              // ellipse, tighter under the belly of the vessel
              float d = length(p * vec2(1.0, 1.0));
              float shadow = smoothstep(1.0, 0.15, d);
              gl_FragColor = vec4(uColor, shadow * 0.55);
            }
          `}
        />
      </mesh>
    </group>
  );
}
