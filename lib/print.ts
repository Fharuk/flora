/**
 * Printable artifact.
 *
 * The bouquet is a real mesh in the browser, so it can leave the browser: this walks the
 * same geometry the renderer uses and writes a binary STL, which every slicer accepts. The
 * pose is baked — there is no growth animation in the file — so what prints is the flower
 * fully open, at the size the composition implies.
 */

import * as THREE from "three";

import { buildFlower, buildStem, speciesBloom } from "@/components/three/flowers/build";
import { composeBouquet, vesselProfile, type BouquetConfig } from "@/lib/bouquet";
import { getSpecimen } from "@/lib/hybrids";

/** Mirrors the head-scaling rule in the scene, so the model matches the picture. */
function headScaleFor(weight: number): number {
  return THREE.MathUtils.clamp(1 / Math.sqrt(weight), 0.42, 0.9);
}

function trianglesFor(config: BouquetConfig): THREE.BufferGeometry[] {
  const stems = composeBouquet(config);
  const parts: THREE.BufferGeometry[] = [];

  for (const stem of stems) {
    const spec = getSpecimen(stem.species);
    if (!spec) continue;

    const bloom = speciesBloom(spec, config.bloom);
    const flower = buildFlower(spec, bloom);
    const stemPart = buildStem(stem, spec);

    const matrix = new THREE.Matrix4()
      .compose(
        new THREE.Vector3(stemPart.tip.x, stemPart.tip.y, stemPart.tip.z),
        new THREE.Quaternion().setFromEuler(stemPart.rotation),
        new THREE.Vector3(1, 1, 1)
      )
      .multiply(
        new THREE.Matrix4().makeScale(
          headScaleFor(spec.weight) * stem.scale,
          headScaleFor(spec.weight) * stem.scale,
          headScaleFor(spec.weight) * stem.scale
        )
      );

    const head = flower.head.clone().applyMatrix4(matrix);
    const core = flower.core?.clone().applyMatrix4(matrix) ?? null;
    const collar = flower.stem.clone().applyMatrix4(matrix);

    parts.push(head);
    if (core) parts.push(core);
    parts.push(collar);
    parts.push(stemPart.geometry);

    // the originals are owned by this call, so hand them back
    flower.head.dispose();
    flower.core?.dispose();
    flower.stem.dispose();
  }

  // a closed base so the model can stand on a plate without a floating rim
  const profile = vesselProfile[config.vessel];
  const base = new THREE.CylinderGeometry(profile.belly * 0.72, profile.belly * 0.8, 0.22, 40);
  base.translate(0, 0.11, 0);
  parts.push(base);

  return parts;
}

/** Binary STL — compact, and universally readable by slicers. */
export function bouquetToSTL(config: BouquetConfig): ArrayBuffer {
  const geos = trianglesFor(config);
  const merged = new THREE.BufferGeometry();
  const positions: number[] = [];

  for (const geo of geos) {
    const flat = geo.index ? geo.toNonIndexed() : geo;
    const attr = flat.getAttribute("position");
    if (attr) {
      for (let i = 0; i < attr.count; i++) {
        positions.push(attr.getX(i), attr.getY(i), attr.getZ(i));
      }
    }
    if (flat !== geo) flat.dispose();
    geo.dispose();
  }

  merged.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  merged.computeVertexNormals();

  const pos = merged.getAttribute("position");
  merged.computeBoundingBox();
  const bb = merged.boundingBox!;
  const center = new THREE.Vector3();
  bb.getCenter(center);
  // centre on the origin and sit it on the build plate
  const lift = bb.min.y;

  const triCount = Math.floor(pos.count / 3);
  const buffer = new ArrayBuffer(84 + triCount * 50);
  const view = new DataView(buffer);
  const header = "Flora-Synth procedural bouquet";
  for (let i = 0; i < Math.min(header.length, 79); i++) view.setUint8(i, header.charCodeAt(i));
  view.setUint32(80, triCount, true);

  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const cb = new THREE.Vector3();
  const ab = new THREE.Vector3();
  const normal = new THREE.Vector3();

  let offset = 84;
  for (let i = 0; i < triCount; i++) {
    a.fromBufferAttribute(pos, i * 3).sub(new THREE.Vector3(center.x, lift, center.z));
    b.fromBufferAttribute(pos, i * 3 + 1).sub(new THREE.Vector3(center.x, lift, center.z));
    c.fromBufferAttribute(pos, i * 3 + 2).sub(new THREE.Vector3(center.x, lift, center.z));

    cb.subVectors(c, b);
    ab.subVectors(a, b);
    normal.crossVectors(cb, ab).normalize();

    view.setFloat32(offset, normal.x, true);
    view.setFloat32(offset + 4, normal.y, true);
    view.setFloat32(offset + 8, normal.z, true);
    offset += 12;

    for (const v of [a, b, c]) {
      // millimetres: a bouquet about 240 mm tall prints at a table-friendly size
      const scale = 20;
      view.setFloat32(offset, v.x * scale, true);
      view.setFloat32(offset + 4, v.y * scale, true);
      view.setFloat32(offset + 8, v.z * scale, true);
      offset += 12;
    }
    view.setUint16(offset, 0, true);
    offset += 2;
  }

  merged.dispose();
  return buffer;
}

/** the print's dimensions in millimetres, measured off the same mesh the STL is built from */
export type PrintDims = {
  width: number;
  height: number;
  depth: number;
  triangles: number;
  /** the thinnest petal wall, in millimetres — the number that decides a nozzle */
  wall: number;
  stems: number;
};

/** The STL's own scale: a bouquet about 240 mm tall prints at a table-friendly size. */
export const PRINT_SCALE = 20;

export function printDims(config: BouquetConfig): PrintDims {
  const geos = trianglesFor(config);
  const box = new THREE.Box3();
  let triangles = 0;
  for (const g of geos) {
    g.computeBoundingBox();
    if (g.boundingBox) box.union(g.boundingBox);
    triangles += (g.index ? g.index.count : g.getAttribute("position").count) / 3;
    g.dispose();
  }
  const size = new THREE.Vector3();
  box.getSize(size);

  /*
   * The wall is estimated from the specimen's weight, not measured: the petals are
   * single-surface shells with no thickness in the file, so the honest number is
   * the thinnest feature the *slicer* will produce, which depends on its own
   * settings. Quoting a thickness the geometry does not have would be worse than
   * quoting none, so the sheet says "nominal" wherever this appears.
   */
  const spec = getSpecimen(composeBouquet(config)[0]?.species ?? "") ?? null;
  const wall = spec ? Math.max(0.6, 1.1 / Math.sqrt(spec.weight)) : 0.8;

  return {
    width: Math.round(size.x * PRINT_SCALE),
    height: Math.round(size.y * PRINT_SCALE),
    depth: Math.round(size.z * PRINT_SCALE),
    triangles: Math.round(triangles),
    wall: Math.round(wall * 100) / 100,
    stems: composeBouquet(config).length,
  };
}

export function downloadSTL(config: BouquetConfig, filename = "flora-synth-bouquet.stl") {
  const buffer = bouquetToSTL(config);
  const blob = new Blob([buffer], { type: "model/stl" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
}
