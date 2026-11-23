// The room the bouquet stands in, and the clock that lights it. A plaster
// wall and a stone ledge; the sun comes through a window out of shot, a
// spotlight carrying the window's panes, so a bright frame of light with the
// bouquet's shadow in it travels across the wall as the hours pass. At night a
// cool moon. Behind it all, the color field the page floods to when the petals
// scatter.

import * as THREE from "three";
import { clamp, lerp, smooth } from "./util";

/** the window's light: four panes and their bars, soft at the edge */
function windowGobo() {
  const s = 512;
  const c = document.createElement("canvas");
  c.width = c.height = s;
  const g = c.getContext("2d")!;
  g.fillStyle = "#000";
  g.fillRect(0, 0, s, s);
  g.filter = "blur(5px)";
  g.fillStyle = "#fff";
  const pad = s * 0.17;
  const bar = s * 0.035;
  const w = (s - pad * 2 - bar) / 2;
  const h = (s - pad * 2 - bar * 2) / 3;
  for (let i = 0; i < 2; i++) {
    for (let j = 0; j < 3; j++) g.fillRect(pad + i * (w + bar), pad + j * (h + bar), w, h);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const SKY = {
  night: new THREE.Color("#4a1c5a"),
  dawn: new THREE.Color("#f2b8a8"),
  day: new THREE.Color("#fff1ec"),
  dusk: new THREE.Color("#e98aa6"),
};
const SUN = {
  low: new THREE.Color("#ff9a6a"),
  mid: new THREE.Color("#ffd2a6"),
  high: new THREE.Color("#fff3e2"),
};

/** the light at a time of day (hours, any number of days): the sun's height, color and where it is */
export function daylight(hours: number) {
  const h = ((hours % 24) + 24) % 24;
  // sunrise 6, sunset 20: the sun's arc, 0 on the horizon, 1 at its top
  const arc = (h - 6) / 14;
  const up = arc > 0 && arc < 1 ? Math.sin(arc * Math.PI) : 0;
  const below = arc <= 0 ? clamp(1 + arc * 4) : arc >= 1 ? clamp(1 - (arc - 1) * 4) : 1;
  return { h, arc: clamp(arc), up, twilight: below * (1 - smooth(up / 0.25)) };
}

export function makeRoom(detail: number) {
  const group = new THREE.Group();
  // the wall: warm plaster with a little trowel texture
  const wallMat = new THREE.MeshStandardMaterial({ color: "#efe3dc", roughness: 0.92, transparent: true });
  wallMat.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vWallPos;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvWallPos = position;");
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
varying vec3 vWallPos;
float wh(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float wn(vec2 p) { vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(wh(i), wh(i + vec2(1, 0)), f.x), mix(wh(i + vec2(0, 1)), wh(i + vec2(1, 1)), f.x), f.y); }`,
      )
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
diffuseColor.rgb *= 0.95 + 0.05 * (wn(vWallPos.xy * 3.0) * 0.6 + wn(vWallPos.xy * 11.0) * 0.4);`,
      );
  };
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(9, 6), wallMat);
  wall.position.set(0, 0.6, -0.95);
  wall.receiveShadow = true;
  // the ledge the vase stands on
  const ledgeMat = new THREE.MeshStandardMaterial({ color: "#e4d6cd", roughness: 0.75, transparent: true });
  const ledge = new THREE.Mesh(new THREE.BoxGeometry(9, 0.08, 1.9), ledgeMat);
  ledge.position.set(0, -0.6, -0.0);
  ledge.receiveShadow = true;
  group.add(wall, ledge);

  // the sun, through the window
  const sun = new THREE.SpotLight("#fff1e0", 0, 16, 0.2, 0.12, 0);
  sun.map = windowGobo();
  sun.castShadow = true;
  sun.shadow.mapSize.set(detail > 0.5 ? 2048 : 1024, detail > 0.5 ? 2048 : 1024);
  sun.shadow.bias = -0.0006;
  sun.shadow.normalBias = 0.01;
  sun.shadow.radius = 3;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 14;
  const target = new THREE.Object3D();
  target.position.set(0, 0.2, -0.6);
  sun.target = target;
  group.add(sun, target);
  // the moon: a cool, dim wash from the other side
  const moon = new THREE.DirectionalLight("#9fb2ff", 0);
  moon.position.set(2, 3, 2);
  // the room's own light, which takes the sky's color
  const fill = new THREE.HemisphereLight("#fff1ec", "#d9b9ae", 0.6);
  group.add(moon, fill);

  const sky = new THREE.Color();
  const sunCol = new THREE.Color();
  /** set the hour: where the sun is, its color, the room's fill; returns the sky color */
  function setTime(hours: number, strength = 1) {
    const d = daylight(hours);
    // the sun crosses from the right of the window to the left over the day,
    // so its frame of light sweeps the wall from left to right
    const az = lerp(-0.95, 0.95, d.arc);
    const el = lerp(0.16, 0.75, d.up);
    const dist = 7;
    sun.position.set(Math.sin(az) * dist * 0.75 + 0.4, 0.2 + Math.sin(el) * dist * 0.6, Math.cos(az) * dist * 0.6 + 1.2);
    sunCol.copy(SUN.low).lerp(SUN.mid, smooth(d.up / 0.35)).lerp(SUN.high, smooth((d.up - 0.4) / 0.6));
    sun.color.copy(sunCol);
    sun.intensity = 3.4 * smooth(d.up / 0.12) * strength;
    moon.intensity = 0.55 * (1 - smooth(d.up / 0.1)) * (1 - d.twilight * 0.5) * strength;
    // the sky's color in the room
    if (d.up > 0) sky.copy(SKY.dawn).lerp(SKY.day, smooth(d.up / 0.45));
    else sky.copy(SKY.night);
    if (d.twilight > 0 && d.up < 0.3) sky.lerp(d.arc > 0.5 ? SKY.dusk : SKY.dawn, d.twilight * 0.9);
    if (d.arc > 0.75 && d.up > 0) sky.lerp(SKY.dusk, smooth((d.arc - 0.75) / 0.25) * 0.8);
    fill.color.copy(sky);
    fill.groundColor.copy(sky).multiplyScalar(0.55);
    fill.intensity = lerp(0.42, 0.75, smooth(d.up / 0.3) * 0.85 + d.twilight * 0.15) * strength + (1 - strength) * 0.7;
    return { sky, sun: sunCol, up: d.up, arc: d.arc };
  }

  function setOpacity(o: number) {
    wallMat.opacity = o;
    ledgeMat.opacity = o;
    wall.visible = ledge.visible = o > 0.003;
    wallMat.depthWrite = ledgeMat.depthWrite = o > 0.98;
  }

  return { group, wall, ledge, sun, moon, fill, setTime, setOpacity };
}

/**
 * The color field: a soft radial field drawn first, straight to clip space,
 * so whatever the room doesn't cover is the page's color.
 */
export function makeBackdrop() {
  const uniforms = {
    uMid: { value: new THREE.Color("#b0125f") },
    uEdge: { value: new THREE.Color("#5a0731") },
    uHi: { value: new THREE.Color("#ff4f9a") },
    uAspect: { value: 1 },
    uTime: { value: 0 },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms,
    depthWrite: false,
    depthTest: false,
    toneMapped: false,
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = vec4(position.xy, 0.9999, 1.0); }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uMid; uniform vec3 uEdge; uniform vec3 uHi; uniform float uAspect; uniform float uTime;
      varying vec2 vUv;
      float h(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
      void main() {
        vec2 p = (vUv - 0.5) * vec2(uAspect, 1.0);
        float r = length(p - vec2(0.0, 0.05));
        vec3 col = mix(uHi, uMid, smoothstep(0.0, 0.55, r));
        col = mix(col, uEdge, smoothstep(0.45, 1.2, r));
        // a slow bloom of light, and grain so the gradient never bands
        col += uHi * 0.06 * sin(uTime * 0.3 + p.x * 2.0) * (1.0 - r);
        col += (h(vUv * 800.0 + uTime) - 0.5) * 0.018;
        gl_FragColor = vec4(col, 1.0);
        #include <colorspace_fragment>
      }
    `,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
  mesh.frustumCulled = false;
  mesh.renderOrder = -1000;
  return { mesh, uniforms };
}
