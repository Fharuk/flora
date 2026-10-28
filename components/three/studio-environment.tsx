"use client";

import { useThree } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import * as THREE from "three";

import type { Palette } from "@/lib/specimens";

import type { Theme } from "./materials";

/**
 * A procedural photo studio, baked into an environment map at runtime.
 *
 * Rather than shipping an HDRI (megabytes, and a network request), the rig is built as a
 * tiny scene of emissive panels and captured with PMREMGenerator. That gives real
 * image-based reflections on chrome and crystal — the vertical softbox streaks that make
 * glass look expensive — with zero assets.
 */
export function StudioEnvironment({ theme, palette }: { theme: Theme; palette: Palette }) {
  const { gl, scene } = useThree();

  const texture = useMemo(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    pmrem.compileEquirectangularShader();

    const rig = new THREE.Scene();
    const isDark = theme === "dark";

    // --- surrounding shell: a vertical gradient from floor to zenith ---------
    const shell = new THREE.Mesh(
      new THREE.SphereGeometry(12, 32, 24),
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        uniforms: {
          // a bright ceiling fading into a genuinely dark floor is what gives glass
          // its dark refracted rim; a uniformly white room makes glass disappear
          uTop: { value: new THREE.Color(isDark ? "#2a3339" : "#ffffff") },
          uBottom: { value: new THREE.Color(isDark ? "#010203" : "#1b2124") },
          uHorizon: { value: new THREE.Color(isDark ? "#0c1114" : "#8e9aa1") },
        },
        vertexShader: /* glsl */ `
          varying vec3 vPos;
          void main() {
            vPos = position;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: /* glsl */ `
          varying vec3 vPos;
          uniform vec3 uTop;
          uniform vec3 uBottom;
          uniform vec3 uHorizon;
          void main() {
            float h = normalize(vPos).y * 0.5 + 0.5;
            vec3 col = mix(uBottom, uHorizon, smoothstep(0.0, 0.52, h));
            col = mix(col, uTop, smoothstep(0.46, 1.0, h));
            gl_FragColor = vec4(col, 1.0);
          }
        `,
      })
    );
    rig.add(shell);

    // --- softboxes ----------------------------------------------------------
    const panel = (w: number, h: number, colour: string, intensity: number, pos: [number, number, number], look: [number, number, number] = [0, 0, 0]) => {
      const mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(w, h),
        new THREE.MeshBasicMaterial({ color: new THREE.Color(colour).multiplyScalar(intensity), side: THREE.DoubleSide })
      );
      mesh.position.set(...pos);
      mesh.lookAt(new THREE.Vector3(...look));
      rig.add(mesh);
      return mesh;
    };

    // key softbox, high and to the left
    panel(4.2, 7.5, palette.light, isDark ? 7.0 : 4.4, [-5.5, 2.4, 3.4]);
    // fill, lower and opposite
    panel(3.2, 5.5, "#ffffff", isDark ? 4.6 : 2.8, [5.4, 1.0, 1.4]);
    // rim from behind: separates petals from the backdrop
    panel(2.8, 5.4, palette.light, isDark ? 5.0 : 3.2, [0.4, 3.0, -5.6]);
    // thin strips — these are the vertical highlights that read as "expensive glass"
    panel(0.45, 9.0, "#ffffff", isDark ? 6.0 : 4.2, [-1.9, 0.6, 5.4]);
    panel(0.3, 7.4, "#ffffff", isDark ? 4.2 : 3.0, [2.7, 0.2, 4.6]);
    panel(0.22, 6.0, "#ffffff", isDark ? 3.0 : 2.2, [4.6, 0.4, 2.2]);
    // dark card: reflects as a hard black line through the glass, defining its edge
    panel(5.0, 6.0, "#000000", 1.0, [-3.0, -0.6, -3.2]);
    // faint warm bounce from the floor so undersides don't die
    panel(7.0, 2.0, isDark ? "#1b252b" : "#c8cfd3", 1.0, [0, -3.4, 2.0]);

    const target = pmrem.fromScene(rig, 0.0, 0.1, 40);
    pmrem.dispose();
    rig.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.geometry) m.geometry.dispose();
      if (m.material) (m.material as THREE.Material).dispose();
    });
    return target.texture;
  }, [gl, theme, palette]);

  useEffect(() => {
    scene.environment = texture;
    return () => {
      if (scene.environment === texture) scene.environment = null;
    };
  }, [scene, texture]);

  useEffect(() => () => texture.dispose(), [texture]);

  return null;
}
