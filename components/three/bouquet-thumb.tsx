"use client";

import { Canvas, useThree } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";

import { composeBouquet, type BouquetConfig } from "@/lib/bouquet";
import { getSpecimen } from "@/lib/hybrids";
import { palettes } from "@/lib/specimens";

import { buildFlower, buildStem, speciesBloom } from "./flowers/build";
import { StudioEnvironment } from "./studio-environment";
import { coreMaterial, flowerMaterial, stemMaterial, type Theme } from "./materials";
import { useDocumentVisible, useInView, useReducedMotion, useWebGLSupport } from "./lib/use-capabilities";
import { Vessel } from "./vessel";

/**
 * A composition, small enough to sit in a card.
 *
 * The garden used to represent a saved bouquet as a row of colour dots. That is a
 * swatch, not a composition, and it made the argument the whole project rests on
 * — that the thing is built from numbers and can be rebuilt exactly — invisible.
 *
 * This renders the real thing at card size. It is a second WebGL context, so it is
 * only mounted when the card is on screen and the tab is visible, and the geometry
 * is the same `buildFlower`/`buildStem` the instrument uses: the picture in the
 * garden is not an illustration of the saved bouquet, it is the saved bouquet.
 */
export function BouquetThumb({
  config,
  theme,
  className,
}: {
  config: BouquetConfig;
  theme: Theme;
  className?: string;
}) {
  const host = useRef<HTMLDivElement>(null);
  const inView = useInView(host, "220px");
  const hasWebGL = useWebGLSupport();
  const visible = useDocumentVisible();

  return (
    <div ref={host} className={className}>
      {hasWebGL && inView ? (
        <Canvas
          /*
           * The card already names the composition and its recipe, so the
           * drawing is the illustration of text that is right there — hidden
           * from assistive tech rather than read out twice.
           */
          aria-hidden
          dpr={[1, 1.5]}
          camera={{ fov: 32, position: [1.4, 2.1, 7.4], near: 0.1, far: 40 }}
          gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
          frameloop={visible ? "always" : "demand"}
          style={{ pointerEvents: "none" }}
        >
          <StudioEnvironment theme={theme} palette={palettes[config.palette]} />
          <ambientLight intensity={theme === "dark" ? 0.5 : 0.8} />
          <directionalLight position={[-3, 5, 4]} intensity={theme === "dark" ? 2.2 : 1.5} />
          <directionalLight position={[3, 1, -3]} intensity={0.7} color="#cfe6ff" />
          <ThumbScene config={config} theme={theme} />
          <FrameBouquet watch={config} />
        </Canvas>
      ) : null}
    </div>
  );
}

/**
 * Point the camera at the bouquet, whatever size it is.
 *
 * The card is 19rem square and holds a solitaire or thirty stems, so any fixed
 * camera either clips a tall arrangement at the top or leaves a small one lost in
 * the middle. This measures the assembled group's bounds once the geometry is in
 * the scene and frames them, keeping a margin for the head's silhouette. It runs
 * on layout, before the first frame, so the card never shows the wrong shot.
 */
function FrameBouquet({ watch }: { watch: BouquetConfig }) {
  const { camera, scene } = useThree();
  useLayoutEffect(() => {
    const rig = scene.getObjectByName("thumb-rig");
    if (!rig) return;
    const box = new THREE.Box3().setFromObject(rig);
    if (box.isEmpty()) return;
    const size = box.getSize(new THREE.Vector3());
    const centre = box.getCenter(new THREE.Vector3());

    const persp = camera as THREE.PerspectiveCamera;
    const vFov = (persp.fov * Math.PI) / 180;
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * persp.aspect);
    /* the tighter of the two axes decides the distance, plus a margin for the
       widest head turning end-on at the sides */
    const margin = 1.06;
    const distV = size.y / 2 / Math.tan(vFov / 2);
    const distH = size.x / 2 / Math.tan(hFov / 2);
    /* the camera looks at the box's centre, so depth needs no extra term — only
       the tighter axis and a small margin for the widest head turning end-on */
    const distance = Math.max(distV, distH) * margin;

    /* look at the middle of the bouquet from its own front-right, keeping the
       elevation the fixed shot had so the vessel still reads */
    const dir = new THREE.Vector3(0.19, 0.28, 1).normalize();
    persp.position.copy(centre).addScaledVector(dir, distance);
    persp.lookAt(centre);
    persp.near = Math.max(0.1, distance / 100);
    persp.far = distance * 10;
    persp.updateProjectionMatrix();
  }, [camera, scene, watch]);
  return null;
}

function ThumbScene({ config, theme }: { config: BouquetConfig; theme: Theme }) {
  const palette = palettes[config.palette];
  const reduced = useReducedMotion();
  const rig = useRef<THREE.Group>(null);
  const stems = useMemo(() => composeBouquet(config), [config]);

  const parts = useMemo(
    () =>
      stems
        .map((stem) => {
          const spec = getSpecimen(stem.species);
          if (!spec) return null;
          const bloom = speciesBloom(spec, config.bloom);
          const flower = buildFlower(spec, bloom);
          const stemPart = buildStem(stem, spec);
          const headScale = THREE.MathUtils.clamp(1.0 / Math.sqrt(spec.weight), 0.42, 0.9);
          return { stem, spec, flower, stemPart, headScale };
        })
        .filter(Boolean),
    [stems, config.bloom]
  );

  const materials = useMemo(
    () => ({
      stem: stemMaterial(),
      core: coreMaterial(palette, theme),
      /*
       * One head material per species, not per stem: a bouquet of the same
       * ranunculus nine times was compiling nine identical shaders for a
       * thumbnail nobody looks at for more than a second.
       */
      heads: new Map<string, ReturnType<typeof flowerMaterial>>(),
    }),
    [palette, theme]
  );

  const headFor = (spec: (typeof parts)[number]) => {
    if (!spec) return null;
    let mat = materials.heads.get(spec.spec.slug);
    if (!mat) {
      mat = flowerMaterial(spec.spec, palette, theme, 1);
      materials.heads.set(spec.spec.slug, mat);
    }
    return mat;
  };

  /*
   * A garden holds up to twelve of these; a thumbnail that never disposes its
   * geometry leaks a bouquet's worth of buffers per card. Unmounted is unmounted.
   */
  useEffect(() => {
    return () => {
      materials.stem.dispose();
      materials.core.dispose();
      materials.heads.forEach((m) => m.dispose());
    };
  }, [materials]);

  return (
    <group name="thumb-rig" ref={rig} rotation={[0, reduced ? 0.35 : -0.42, 0]} scale={1.08}>
      <Vessel vessel={config.vessel} palette={palette} theme={theme} />
      {parts.map((part) => {
        if (!part) return null;
        const headMaterial = headFor(part);
        if (!headMaterial) return null;
        return (
          <group key={`${part.stem.id}-${part.spec.slug}`}>
            <mesh geometry={part.flower.stem} material={materials.stem} />
            <mesh geometry={part.stemPart.geometry} material={materials.stem} />
            <group
              position={[part.stemPart.tip.x, part.stemPart.tip.y, part.stemPart.tip.z]}
              rotation={part.stemPart.rotation}
            >
              <group scale={part.headScale * part.stem.scale}>
                <mesh geometry={part.flower.head} material={headMaterial} />
                {part.flower.core ? <mesh geometry={part.flower.core} material={materials.core} /> : null}
              </group>
            </group>
          </group>
        );
      })}
    </group>
  );
}
