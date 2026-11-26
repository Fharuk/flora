"use client";

import { OrbitControls } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

import { composeBouquet, vesselProfile, type BouquetConfig } from "@/lib/bouquet";
import { composeFoliage, getFoliage } from "@/lib/foliage";
import { getSpecimen } from "@/lib/hybrids";
import { palettes, type Palette } from "@/lib/specimens";

import { Effects } from "./effects";
import { buildFoliage } from "./foliage";
import { buildFlower, buildStem, speciesBloom } from "./flowers/build";
import { Ground } from "./ground";
import { StudioEnvironment } from "./studio-environment";
import { coreMaterial, flowerMaterial, foliageMaterial, setGrowth, stemMaterial, type Theme } from "./materials";
import { Vessel } from "./vessel";
import { useDocumentVisible, useReducedMotion, useWebGLSupport } from "./lib/use-capabilities";


/**
 * A photographic sweep, baked into a background texture.
 *
 * The earlier version was a plane in the scene, which produced a visible horizon line
 * where the floor ended. A texture background has no geometry, so there is no seam: the
 * fog simply dissolves the floor into the bottom-most pixel row.
 */
function useBackdropTexture(theme: Theme, palette: Palette) {
  return useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 8;
    canvas.height = 512;
    const ctx = canvas.getContext("2d")!;
    const grad = ctx.createLinearGradient(0, 0, 0, 512);
    if (theme === "dark") {
      // velvet: burgundy fading to near-black, never a neutral grey
      grad.addColorStop(0, "#241318");
      grad.addColorStop(0.42, "#1b0e12");
      grad.addColorStop(0.62, "#150b0e");
      grad.addColorStop(1, "#0c0507");
    } else {
      // Reaches the floor's fog colour *above* the horizon row, then holds it flat.
      // Anything below that row is the floor seen edge-on; if the background were still
      // mid-gradient there, the horizon would draw itself as a hard line across the frame.
      // Champagne: still bright at the top, but the sweep falls away into a deeper rose
      // at the floor. The first pass held one flat mid-tone across the bottom 70%, which
      // left the glass nothing to be bright against and the whole scene read as milk.
      grad.addColorStop(0, "#fffaf4");
      grad.addColorStop(0.14, "#fbeade");
      grad.addColorStop(0.3, "#e6c8b8");
      // The floor plane is seen edge-on and its far edge lands near this row, so the
      // backdrop must already be at the floor's fog colour by then — otherwise the edge
      // of the plane draws itself as a hard horizontal line across the frame.
      grad.addColorStop(0.44, "#b0807a");
      grad.addColorStop(1, "#b0807a");
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 8, 512);

    // a faint pool of key light behind the subject
    const light = ctx.createRadialGradient(4, 300, 0, 4, 300, 260);
    light.addColorStop(0, `${palette.light}22`);
    light.addColorStop(1, "#00000000");
    ctx.fillStyle = light;
    ctx.fillRect(0, 0, 8, 512);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    return tex;
  }, [theme, palette]);
}

function Backdrop({ theme, palette }: { theme: Theme; palette: Palette }) {
  const texture = useBackdropTexture(theme, palette);
  const { scene } = useThree();

  useEffect(() => {
    scene.background = texture;
    return () => {
      if (scene.background === texture) scene.background = null;
    };
  }, [scene, texture]);

  useEffect(() => () => texture.dispose(), [texture]);
  return null;
}

/** Slow, sparse motes catching the key light — the "studio air" detail. */
function Motes({ theme, animated, count = 150 }: { theme: Theme; animated: boolean; count?: number }) {
  const points = useRef<THREE.Points>(null);

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    const phase = new Float32Array(count);
    let seed = 20260419;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (rand() - 0.5) * 9;
      pos[i * 3 + 1] = rand() * 6.2;
      pos[i * 3 + 2] = (rand() - 0.5) * 7;
      phase[i] = rand();
    }
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("aPhase", new THREE.BufferAttribute(phase, 1));
    return geo;
  }, [count]);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
          uTime: { value: 0 },
          uColor: { value: new THREE.Color(theme === "dark" ? "#f0cdb4" : "#fff6ea") },
          uOpacity: { value: theme === "dark" ? 0.34 : 0.1 },
        },
        vertexShader: /* glsl */ `
          attribute float aPhase;
          uniform float uTime;
          varying float vAlpha;
          void main() {
            vec3 p = position;
            p.y = mod(p.y + uTime * 0.045 * (0.4 + aPhase), 6.4);
            p.x += sin(uTime * 0.18 + aPhase * 6.28) * 0.22;
            p.z += cos(uTime * 0.14 + aPhase * 4.4) * 0.22;
            vec4 mv = modelViewMatrix * vec4(p, 1.0);
            // fade out near the floor: otherwise they read as specks of dirt on the sweep
            float floorFade = smoothstep(0.35, 1.6, p.y);
            vAlpha = smoothstep(9.0, 1.5, -mv.z) * (0.35 + aPhase * 0.65) * floorFade;
            gl_PointSize = clamp((1.1 + aPhase * 2.0) * (30.0 / max(-mv.z, 1.0)), 2.0, 7.0);
            gl_Position = projectionMatrix * mv;
          }
        `,
        fragmentShader: /* glsl */ `
          precision highp float;
          varying float vAlpha;
          uniform vec3 uColor;
          uniform float uOpacity;
          void main() {
            float d = length(gl_PointCoord - 0.5);
            float core = smoothstep(0.5, 0.0, d);
            gl_FragColor = vec4(uColor, core * core * vAlpha * uOpacity);
          }
        `,
      }),
    [theme]
  );

  useFrame((state) => {
    if (!animated) return;
    material.uniforms.uTime.value = state.clock.elapsedTime;
  });

  useEffect(() => () => { geometry.dispose(); material.dispose(); }, [geometry, material]);

  return <points ref={points} geometry={geometry} material={material} frustumCulled={false} />;
}

/* ----------------------------------------------------------------- the flowers */

function StemInstance({
  stem,
  config,
  palette,
  theme,
  bloom,
  reveal,
}: {
  stem: ReturnType<typeof composeBouquet>[number];
  config: BouquetConfig;
  palette: Palette;
  theme: Theme;
  bloom: number;
  reveal: React.RefObject<number>;
}) {
  const spec = getSpecimen(stem.species);
  const group = useRef<THREE.Group>(null);

  const built = useMemo(() => {
    if (!spec) return null;
    const flower = buildFlower(spec, bloom);
    const stemPart = buildStem(stem, spec);
    return { flower, stemPart, spec };
  }, [spec, stem, bloom]);

  // Head size is decoupled from stem length: a titan arum is a huge flower on a short
  // stem, a ranunculus is a small flower on a long one.
  const headScale = useMemo(() => {
    if (!spec) return 1;
    const byWeight = 1.0 / Math.sqrt(spec.weight);
    return THREE.MathUtils.clamp(byWeight, 0.42, 0.9);
  }, [spec]);

  // starts shut; the frame loop opens it once the stem has cleared the vessel
  const headMaterial = useMemo(
    () => (spec ? flowerMaterial(spec, palette, theme, 0) : null),
    [spec, palette, theme]
  );
  const coreMat = useMemo(() => coreMaterial(palette, theme), [palette, theme]);
  const stemMat = useMemo(() => stemMaterial(), []);

  useEffect(() => {
    return () => {
      headMaterial?.dispose();
      coreMat.dispose();
      stemMat.dispose();
      built?.flower.head.dispose();
      built?.flower.core?.dispose();
      built?.flower.stem.dispose();
      built?.stemPart.geometry.dispose();
    };
  }, [headMaterial, coreMat, stemMat, built]);

  useFrame(() => {
    if (!group.current) return;
    const p = reveal.current ?? 0;
    // stems rise out of the vessel; each one starts a little later than the last
    const delay = (stem.id % 7) * 0.055;
    const local = Math.min(1, Math.max(0, (p - delay) / 0.55));
    const eased = 1 - Math.pow(1 - local, 3);
    // grow up out of the vessel from below, never above it
    group.current.position.y = -(1 - eased) * 0.9;
    group.current.scale.setScalar(0.42 + eased * 0.58);

    // petals lag the stem, so the flower arrives closed and then opens — the unfurl
    // reads as growth rather than as a scale-up
    setGrowth(headMaterial, Math.min(1, Math.max(0, (eased - 0.55) / 0.45)));
  });

  if (!built || !headMaterial) return null;
  const { flower, stemPart } = built;

  return (
    <group ref={group}>
      <mesh geometry={flower.stem} material={stemMat} />
      <mesh geometry={stemPart.geometry} material={stemMat} castShadow />
      <group position={[stemPart.tip.x, stemPart.tip.y, stemPart.tip.z]} rotation={stemPart.rotation}>
        <group scale={headScale * stem.scale}>
          <mesh geometry={flower.head} material={headMaterial} castShadow />
          {flower.core ? <mesh geometry={flower.core} material={coreMat} /> : null}
        </group>
      </group>
    </group>
  );
}

/* -------------------------------------------------------------------- foliage */

/**
 * The greenery, drawn behind the blooms.
 *
 * It rises with the same reveal as the stems but arrives *first* and settles lower: the
 * leaves are the bed the flowers are laid on, so seeing them come up ahead of the petals
 * is what makes the composition read as assembled rather than switched on.
 */
function FoliageLayer({
  config,
  palette,
  theme,
  reveal,
}: {
  config: BouquetConfig;
  palette: Palette;
  theme: Theme;
  reveal: React.RefObject<number>;
}) {
  const group = useRef<THREE.Group>(null);

  const archetype = useMemo(() => getFoliage(config.foliage), [config.foliage]);

  const built = useMemo(() => {
    if (!archetype) return null;
    const sprays = composeFoliage(config);
    return buildFoliage(sprays, archetype, config.seed);
  }, [archetype, config]);

  const leafMat = useMemo(() => (archetype ? foliageMaterial(theme) : null), [archetype, theme]);
  const stalkMat = useMemo(() => (archetype ? stemMaterial() : null), [archetype]);

  useEffect(() => {
    return () => {
      built?.stems.dispose();
      built?.leaves.dispose();
      leafMat?.dispose();
      stalkMat?.dispose();
    };
  }, [built, leafMat, stalkMat]);

  useFrame(() => {
    if (!group.current) return;
    const p = reveal.current ?? 0;
    // greenery leads the flowers by a beat, and settles a fraction lower
    const eased = 1 - Math.pow(1 - Math.min(1, Math.max(0, p / 0.72)), 3);
    group.current.position.y = -(1 - eased) * 0.55;
    group.current.scale.setScalar(0.55 + eased * 0.45);
  });

  if (!built || !leafMat || !stalkMat) return null;

  return (
    <group ref={group}>
      {/* foliage stalks share the flower stems' waxy material, so the greens cohere */}
      <mesh geometry={built.stems} material={stalkMat} />
      <mesh geometry={built.leaves} material={leafMat} castShadow={false} />
    </group>
  );
}

/* -------------------------------------------------------------------- lighting */

function Lights({ theme, palette }: { theme: Theme; palette: Palette }) {
  const isDark = theme === "dark";
  const key = useRef<THREE.SpotLight>(null);

  useFrame((state) => {
    if (!key.current) return;
    // the key light breathes very slightly, so highlights never look frozen
    key.current.intensity = (isDark ? 52 : 42) * (1 + Math.sin(state.clock.elapsedTime * 0.35) * 0.05);
  });

  return (
    <>
      <ambientLight intensity={isDark ? 0.22 : 0.75} />
      <spotLight
        ref={key}
        position={[-4.6, 7.2, 4.4]}
        angle={0.62}
        penumbra={1}
        intensity={isDark ? 52 : 42}
        color={palette.light}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.00012}
        shadow-normalBias={0.045}
      />
      <directionalLight position={[5, 3.4, 2.2]} intensity={isDark ? 1.5 : 2.1} color={isDark ? "#ffd9c4" : "#fff4e6"} />
      <pointLight position={[0, 2.6, -3.6]} intensity={isDark ? 12 : 5} color={palette.light} distance={12} />
      {/* Fill, lifted off the floor. At 0.4 it sat close enough to the ground to scorch a
          bright wedge into it — invisible under the hero card, glaring on the studio page. */}
      <pointLight position={[0, 1.5, 2.6]} intensity={isDark ? 3 : 5} color={isDark ? "#ffe3cd" : "#fff8ee"} distance={8} />
      {/* a cold rim from behind: the contrast between warm key and cool rim is what
          makes glass look expensive instead of milky */}
      <pointLight position={[-3.4, 2.2, -4.2]} intensity={isDark ? 7 : 4} color="#bcd3e8" distance={14} />
    </>
  );
}

/* ------------------------------------------------------------------- the scene */

function Scene({
  config,
  theme,
  quality,
  animated,
  reveal,
  compact,
}: {
  config: BouquetConfig;
  theme: Theme;
  quality: "high" | "low";
  animated: boolean;
  reveal: React.RefObject<number>;
  compact: boolean;
}) {
  const palette = palettes[config.palette];
  const stems = useMemo(() => composeBouquet(config), [config]);

  return (
    <>
      <StudioEnvironment theme={theme} palette={palette} />
      <Lights theme={theme} palette={palette} />
      <Ground theme={theme} palette={palette} animated={animated} />
      {theme === "dark" ? <Motes theme={theme} animated={animated} /> : null}

      <group scale={1} position={[0, 0, 0]}>
        {/* greenery first: it is behind the blooms, and sorts under them */}
        <FoliageLayer config={config} palette={palette} theme={theme} reveal={reveal} />
        <Vessel vessel={config.vessel} palette={palette} theme={theme} />
        {stems.map((stem) => {
          const spec = getSpecimen(stem.species);
          const bloom = spec ? speciesBloom(spec, config.bloom) : config.bloom;
          return (
            <StemInstance
              key={`${stem.id}-${stem.species}-${config.seed}`}
              stem={stem}
              config={config}
              palette={palette}
              theme={theme}
              bloom={bloom}
              reveal={reveal}
            />
          );
        })}
      </group>

      <OrbitControls
        makeDefault
        enablePan={false}
        enableZoom
        minDistance={6.5}
        maxDistance={16}
        minPolarAngle={0.6}
        maxPolarAngle={1.46}
        enableRotate
        target={compact ? [0, 1.62, 0] : [0, 2.35, 0]}
        enableDamping
        dampingFactor={0.055}
        autoRotate={animated}
        autoRotateSpeed={0.32}
      />
      <Effects theme={theme} quality={quality} focusDistance={0.024} />
      <Backdrop theme={theme} palette={palette} />
      <fog attach="fog" args={[theme === "dark" ? "#0c0507" : "#b0807a", theme === "dark" ? 7 : 12, theme === "dark" ? 19 : 26]} />
    </>
  );
}

/* ------------------------------------------------------------------- the canvas */

/**
 * Renders one frame at `scale` times the current pixel ratio and returns it as a
 * data URI, or null if the context refused. Lives inside the Canvas because it
 * needs the renderer, the camera and the scene; the component outside only holds
 * the function it registers.
 */
function Shutter({
  register,
}: {
  register?: (fn: (() => Promise<string | null>) | null) => void;
}) {
  const { gl, scene, camera, size } = useThree();
  const busy = useRef(false);

  useEffect(() => {
    if (!register) return;
    register(async () => {
      if (busy.current) return null;
      busy.current = true;
      const before = gl.getPixelRatio();
      const beforeSize = { w: size.width, h: size.height };
      try {
        // draw at the capture resolution, read immediately, then put the stage back
        gl.setPixelRatio(Math.min(3, (window.devicePixelRatio || 1) * 2));
        gl.setSize(beforeSize.w, beforeSize.h, false);
        gl.render(scene, camera);
        const url = gl.domElement.toDataURL("image/png");
        return url && url.length > 500 ? url : null;
      } catch {
        return null;
      } finally {
        gl.setPixelRatio(before);
        gl.setSize(beforeSize.w, beforeSize.h, false);
        gl.render(scene, camera);
        busy.current = false;
      }
    });
    return () => register(null);
  }, [gl, scene, camera, size.width, size.height, register]);

  return null;
}

export function BouquetCanvas({
  config,
  theme,
  className,
  onReady,
  onCapture,
  compact = false,
  label,
}: {
  config: BouquetConfig;
  theme: Theme;
  className?: string;
  onReady?: () => void;
  /** hands the parent a function that renders one frame at capture resolution */
  onCapture?: (fn: (() => Promise<string | null>) | null) => void;
  /** narrow viewport: pull the camera back and lift the bouquet above the hero card */
  compact?: boolean;
  /** what this drawing is, for anyone who cannot see it */
  label: string;
}) {
  const hasWebGL = useWebGLSupport();
  const reduced = useReducedMotion();
  const visible = useDocumentVisible();
  const reveal = useRef(0);

  const [quality] = useState<"high" | "low">(() => {
    if (typeof window === "undefined") return "high";
    return window.innerWidth < 820 || (navigator.hardwareConcurrency ?? 4) <= 4 ? "low" : "high";
  });

  // animate the bouquet assembling itself once, on first mount
  useEffect(() => {
    if (reduced) {
      reveal.current = 1;
      onReady?.();
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / 2600);
      reveal.current = t;
      if (t < 1) raf = requestAnimationFrame(tick);
      else onReady?.();
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reduced, onReady, config.seed]);

  if (!hasWebGL) {
    return <div className={className} data-fallback="webgl-unavailable" />;
  }

  return (
    <div className={className}>
      {/*
        * A WebGL canvas is a picture. Without a role and a name it reaches a
        * screen reader as an anonymous graphic — present, unmentionable, and
        * indistinguishable from the page furniture. The label is passed in by
        * whoever knows what is being drawn, because only the caller does.
      */}
      <Canvas
        role="img"
        aria-label={label}
        shadows={quality === "high" ? { type: THREE.PCFShadowMap } : false}
        dpr={[1, quality === "high" ? 1.9 : 1.4]}
        camera={{
          fov: compact ? 34 : 30,
          near: 0.1,
          far: 80,
          position: compact ? [0.95, 2.3, 11.2] : [1.9, 2.75, 9.8],
        }}
        gl={{
          antialias: false,
          alpha: false,
          powerPreference: "high-performance",
          // tone mapping happens once, in the post stack — doing it here as well
          // flattens every highlight and greys the whole image
          toneMapping: THREE.NoToneMapping,
        }}
        frameloop={visible ? "always" : "demand"}
        onCreated={({ gl }) => {
          gl.setClearColor(new THREE.Color(theme === "dark" ? "#120a0b" : "#b0807a"));
        }}
      >
        <Scene
          config={config}
          theme={theme}
          quality={quality}
          animated={!reduced && visible}
          reveal={reveal}
          compact={compact}
        />
        <Shutter register={onCapture} />
      </Canvas>
    </div>
  );
}
