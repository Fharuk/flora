// The director: one renderer, one loop. It reads the scroll and runs the
// time-lapse (the clock, the window light, the bloom, the scatter) straight
// off it, blends the camera script for everything else, and writes the page's
// scroll-linked pieces (the timecode, beats, marks, pins) in the same frame.

import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { CUES, type Shot } from "./cues";
import { Bouquet } from "./bouquet";
import { FlowerSet, SPECIES, type FlowerSpec, type SpeciesId } from "./flora";
import { OUTLINES, petalSun, petalGeometry, petalMaterial, petalDepthMaterial, petalMesh } from "./petal";
import { makeRoom, makeBackdrop, daylight } from "./room";
import { paletteById, sizeById, stageOf, wrapById } from "./catalog";
import type { Pick } from "./cart";
import { live } from "./live";
import { clamp, lerp, smoother, smooth, isPhone, prefersReducedMotion, band, rng } from "./util";

function blend(a: Shot, b: Shot, t: number, out: Shot) {
  for (const k of Object.keys(a) as (keyof Shot)[]) {
    const va = a[k] as unknown;
    const vb = b[k] as unknown;
    if (typeof va === "number") (out as unknown as Record<string, number>)[k] = lerp(va, vb as number, t);
    else if (Array.isArray(va)) {
      const o = ((out as unknown as Record<string, number[]>)[k] ||= [0, 0, 0]);
      o[0] = lerp(va[0], (vb as number[])[0], t);
      o[1] = lerp(va[1], (vb as number[])[1], t);
      o[2] = lerp(va[2], (vb as number[])[2], t);
    }
  }
  return out;
}

interface SceneBox {
  id: string;
  top: number;
  height: number;
}
interface Beat {
  el: HTMLElement;
  scene: string;
  a: number;
  b: number;
  f: number;
  stay: boolean;
  last: string;
}
interface Mark {
  el: HTMLElement;
  scene: string;
  a: number;
  b: number;
  on: boolean;
}

export interface DirectorOptions {
  canvas: HTMLCanvasElement;
  lenis?: { raf: (t: number) => void; scrollTo?: (y: number, o: object) => void } | null;
}

/** the time-lapse: day one 07:24 to day three 16:42 across the first chapter */
const H0 = 7.4;
const SPAN = 57.3;

export function createDirector(opts: DirectorOptions) {
  const { canvas } = opts;
  const phone = isPhone();
  const reduced = prefersReducedMotion();
  const detail = phone ? 0 : 1;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: "high-performance" });
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  const dprCap = Math.min(window.devicePixelRatio || 1, phone ? 1.25 : 1.5);
  let dpr = dprCap;
  renderer.setPixelRatio(dpr);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.02, 60);
  scene.add(camera);

  let disposed = false;
  let built = false;
  const cleanup: (() => void)[] = [];

  // ------------------------------------------------------------ the script
  const resolvedDesk: Shot[] = [];
  const resolvedPhone: Shot[] = [];
  {
    let d = { ...(CUES[0].s as Shot) };
    let m = { ...(CUES[0].s as Shot), ...(CUES[0].m || {}) };
    for (const c of CUES) {
      d = { ...d, ...c.s } as Shot;
      m = { ...m, ...c.s, ...(c.m || {}) } as Shot;
      resolvedDesk.push(structuredClone(d));
      resolvedPhone.push(structuredClone(m));
    }
  }
  const cueAbs: number[] = CUES.map(() => 0);
  let scenes: SceneBox[] = [];
  let beats: Beat[] = [];
  let marks: Mark[] = [];
  let pins: { el: HTMLElement; name: string; last: string }[] = [];
  let hud: Record<string, { el: HTMLElement; last: string }[]> = {};
  const shot = structuredClone(resolvedDesk[0]) as Shot;
  let vw = 1;
  let vh = 1;

  function measure() {
    vw = window.innerWidth;
    vh = window.innerHeight;
    const y0 = window.scrollY;
    scenes = [...document.querySelectorAll<HTMLElement>("[data-scene]")].map((el) => {
      const r = el.getBoundingClientRect();
      return { id: el.dataset.scene!, top: r.top + y0, height: Math.max(1, r.height) };
    });
    CUES.forEach((c, i) => {
      const sc = scenes.find((s) => s.id === c.at[0]);
      cueAbs[i] = sc ? sc.top + c.at[1] * sc.height : Infinity;
    });
    const sceneOf = (el: HTMLElement) => (el.closest("[data-scene]") as HTMLElement | null)?.dataset.scene || "";
    beats = [...document.querySelectorAll<HTMLElement>("[data-beat]")].map((el) => ({
      el,
      scene: sceneOf(el),
      a: parseFloat(el.dataset.a || "0"),
      b: parseFloat(el.dataset.b || "1"),
      f: parseFloat(el.dataset.f || "0.06"),
      stay: el.dataset.beat === "stay",
      last: "",
    }));
    marks = [...document.querySelectorAll<HTMLElement>("[data-mark]")].map((el) => ({
      el,
      scene: el.dataset.mark || sceneOf(el),
      a: parseFloat(el.dataset.a || "0"),
      b: parseFloat(el.dataset.b || "1"),
      on: el.dataset.on === "1",
    }));
    pins = [...document.querySelectorAll<HTMLElement>("[data-pin]")].map((el) => ({ el, name: el.dataset.pin!, last: "" }));
    hud = {};
    for (const el of document.querySelectorAll<HTMLElement>("[data-hud]")) (hud[el.dataset.hud!] ||= []).push({ el, last: "" });
    resize();
  }

  function resize() {
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    if (backdrop) backdrop.uniforms.uAspect.value = camera.aspect;
  }

  function sceneProgress(id: string, playhead: number) {
    const s = scenes.find((x) => x.id === id);
    if (!s) return -1;
    return (playhead - s.top) / s.height;
  }

  // ------------------------------------------------------------ the set
  let backdrop: ReturnType<typeof makeBackdrop> | null = null;
  let room: ReturnType<typeof makeRoom> | null = null;
  let hero: Bouquet | null = null;
  let macro: FlowerSet | null = null;
  let macroStem: THREE.Mesh | null = null;
  let library: Bouquet | null = null;
  let custom: Bouquet | null = null;
  let drift: ReturnType<typeof petalMesh> | null = null;
  let pollen: THREE.Points | null = null;
  const macroSpec: FlowerSpec = { species: "anemone", head: new THREE.Matrix4(), size: 5.2, delay: 0, rate: 1, tone: 0, seed: 11 };

  // studio light, for the chapters off the wall
  const key = new THREE.DirectionalLight("#fff4ee", 0);
  key.position.set(-2.4, 3, 3.2);
  const rim = new THREE.DirectionalLight("#ffd0e4", 0);
  rim.position.set(2.6, 1.6, -2.4);
  scene.add(key, rim);

  let pick: Pick = { size: "classic", palette: "garnet", wrap: "kraft", vase: false, note: "" };
  let builtPick = "";

  function frame() {
    return new Promise<void>((r) => setTimeout(r, 0));
  }

  async function build() {
    const t0 = performance.now();
    live.set({ load: 0.05 });
    await fontsReady();
    if (disposed) return;
    live.set({ load: 0.15 });
    await frame();

    const pm = new THREE.PMREMGenerator(renderer);
    scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    pm.dispose();
    backdrop = makeBackdrop();
    scene.add(backdrop.mesh);
    room = makeRoom(detail);
    scene.add(room.group);
    live.set({ load: 0.3 });
    await frame();

    // the time-lapse bouquet: the Classic, in its vase
    hero = new Bouquet(detail);
    hero.build({ ...sizeById("classic").recipe, tone: 0.3 }, 4);
    scene.add(hero.group);
    live.set({ load: 0.5 });
    await frame();

    // the anemone for the close-up, on its own stem
    macro = new FlowerSet(phone ? 1 : 2, 1);
    macro.place([macroSpec]);
    scene.add(macro.group);
    {
      const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0.2, -0.02), new THREE.Vector3(0.02, 0.05, -0.35), new THREE.Vector3(0.06, -0.6, -0.6), new THREE.Vector3(0.1, -1.6, -0.7)]);
      macroStem = new THREE.Mesh(new THREE.TubeGeometry(curve, 40, 0.028, 10, false), new THREE.MeshStandardMaterial({ color: "#3d6a2c", roughness: 0.5 }));
      scene.add(macroStem);
    }
    // the library: one of each, side by side
    library = new Bouquet(detail, 1);
    library.build({ stems: Object.fromEntries(LIB_IDS.map((id) => [id, 1])), eucalyptus: 0, tone: 0, radius: LIB_GAP, layout: "row" }, 9);
    library.setVessel("none");
    scene.add(library.group);
    // the builder's bouquet
    custom = new Bouquet(detail);
    scene.add(custom.group);
    applyPick();
    live.set({ load: 0.75 });
    await frame();

    // loose petals, and pollen
    {
      const n = phone ? 26 : 54;
      drift = petalMesh(petalGeometry(OUTLINES.round, 6, 8), petalMaterial({ a: ["#5e1622", "#9e2b3e", "#c2606f"], b: ["#8a4451", "#c2606f", "#fbf4ec"], edge: "#ffd0e2", edgeAmt: 0.2, vein: 0.12, back: 0.5, roughness: 0.55, sheen: 0.5 }).material, petalDepthMaterial(), n);
      drift.mesh.castShadow = false;
      drift.mesh.count = n;
      scene.add(drift.mesh);
      const r = rng(21);
      driftState = Array.from({ length: n }, () => ({
        p: new THREE.Vector3((r() - 0.5) * 3.2, (r() - 0.5) * 2.2, (r() - 0.5) * 1.6),
        v: new THREE.Vector3(0.05 + r() * 0.08, -(0.04 + r() * 0.06), (r() - 0.5) * 0.04),
        spin: new THREE.Vector3(r() * 2 - 1, r() * 2 - 1, r() * 2 - 1),
        a: new THREE.Euler(r() * 6, r() * 6, r() * 6),
        s: 0.05 + r() * 0.05,
        tone: r(),
        seed: r(),
      }));
      const pc = phone ? 220 : 520;
      const pos = new Float32Array(pc * 3);
      for (let i = 0; i < pc; i++) {
        const a = r() * Math.PI * 2;
        const rr = Math.sqrt(r()) * 0.24;
        pos.set([Math.cos(a) * rr, 0.2 + Math.sin(a) * rr, 0.02 + r() * 0.16], i * 3);
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      pollen = new THREE.Points(
        g,
        new THREE.PointsMaterial({ color: "#ffd56a", size: 0.006, sizeAttenuation: true, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }),
      );
      pollen.frustumCulled = false;
      scene.add(pollen);
    }
    live.set({ load: 0.9 });
    await frame();

    // compile everything before the curtain lifts
    measure();
    update(1 / 60);
    const hidden: THREE.Object3D[] = [];
    scene.traverse((o) => {
      if (!o.visible) {
        hidden.push(o);
        o.visible = true;
      }
    });
    try {
      await renderer.compileAsync(scene, camera);
    } catch {
      /* shaders compile on first draw */
    }
    hidden.forEach((o) => (o.visible = false));
    update(1 / 60);
    if (location.search.includes("debug")) {
      console.info(`STAMEN build ${(performance.now() - t0).toFixed(0)} ms, programs ${renderer.info.programs?.length}`);
      (window as unknown as Record<string, unknown>).__stamen = {
        shot,
        camera,
        scene,
        library,
        hero,
        perf,
        renderer,
        state: () => ({ ...lapse }),
        go(id: string, p: number) {
          const s = scenes.find((x) => x.id === id);
          if (!s) return;
          const y = s.top + p * s.height - vh / 2;
          if (opts.lenis?.scrollTo) opts.lenis.scrollTo(y, { immediate: true, force: true });
          else window.scrollTo(0, y);
        },
      };
    }
    built = true;
    live.set({ load: 1, ready: true });
  }

  /** rebuild the builder's bouquet when its size or palette changes; the wrap just recolors */
  function applyPick() {
    if (!custom) return;
    const size = sizeById(pick.size);
    const pal = paletteById(pick.palette);
    const k = `${pick.size}|${pick.palette}`;
    if (k !== builtPick) {
      builtPick = k;
      custom.build({ ...size.recipe, tone: pal.tone }, 17);
      // every species the engine knows about, so a colour story covers the exotics too
      for (const id of Object.keys(SPECIES) as SpeciesId[]) {
        const look = pal.looks?.[id];
        const base = custom.flowers.materials[id];
        if (look) custom.flowers.setLook(id, look[0], look[1]);
        else {
          // back to the species' own colors
          const s = hero!.flowers.materials[id].uniforms;
          base.uniforms.uA0.value.copy(s.uA0.value);
          base.uniforms.uA1.value.copy(s.uA1.value);
          base.uniforms.uA2.value.copy(s.uA2.value);
          base.uniforms.uB0.value.copy(s.uB0.value);
          base.uniforms.uB1.value.copy(s.uB1.value);
          base.uniforms.uB2.value.copy(s.uB2.value);
        }
      }
      buildPop = performance.now();
    }
    const w = wrapById(pick.wrap);
    custom.wrap.setColors(w.paper, w.ribbon);
    custom.setVessel(pick.vase ? "vase" : "wrap");
  }

  // ------------------------------------------------------------ input
  const pointer = { x: 0, y: 0, active: false };
  const onMove = (e: PointerEvent) => {
    pointer.x = (e.clientX / vw) * 2 - 1;
    pointer.y = -(e.clientY / vh) * 2 + 1;
    pointer.active = e.pointerType === "mouse";
  };
  const onLeave = () => (pointer.active = false);
  const onResize = () => measure();
  window.addEventListener("pointermove", onMove, { passive: true });
  document.addEventListener("pointerleave", onLeave);
  window.addEventListener("resize", onResize);
  const ro = new ResizeObserver(() => measure());
  ro.observe(document.body);
  cleanup.push(() => {
    window.removeEventListener("pointermove", onMove);
    document.removeEventListener("pointerleave", onLeave);
    window.removeEventListener("resize", onResize);
    ro.disconnect();
  });

  // ------------------------------------------------------------ the loop
  let last = performance.now();
  let clock = 0;
  let raf = 0;
  let frames = 0;
  let fpsT = 0;
  let slow = 0;
  let buildPop = 0;
  const perf = { ms: 0, calls: 0, tris: 0 };
  const lapse = { hours: H0, bloom: 0, scatter: 0, frame: 0, up: 0 };
  let driftState: { p: THREE.Vector3; v: THREE.Vector3; spin: THREE.Vector3; a: THREE.Euler; s: number; tone: number; seed: number }[] = [];
  const LIB_GAP = 1.05;
  /*
   * The stem library is a row of single stems, and the camera steps along it.
   * Both the row's centre and the last stop used to be hard-coded for six
   * stems; the roster is ten now, so the count comes from the species table.
   */
  const LIB_IDS = Object.keys(SPECIES) as SpeciesId[];
  const LIB_SPAN = (LIB_IDS.length - 1) / 2;
  /** the first plate's stop, and the stride between plates — mirrored in Chapters.tsx */
  const STEMS_FIRST = 0.1;
  const STEMS_STEP = 0.09;
  const v3 = new THREE.Vector3();
  const v3b = new THREE.Vector3();
  const m4 = new THREE.Matrix4();
  const m4b = new THREE.Matrix4();
  const q4 = new THREE.Quaternion();
  const sc3 = new THREE.Vector3();
  const lookAt = new THREE.Vector3();
  const wind = new THREE.Vector3(0.9, 0.45, 0.35);
  const sunDir = new THREE.Vector3();
  const fieldMid = new THREE.Color();
  const fieldEdge = new THREE.Color();
  const fieldHi = new THREE.Color();
  /* Flora-Synth's garnet, not the kit's hot magenta: oxblood mid, near-black
     plum edge, gold-lit highlight. And ivory stock for the plates. */
  const FIELD = { mid: new THREE.Color("#7d1f2f"), edge: new THREE.Color("#2a1215"), hi: new THREE.Color("#b8434f") };
  const PAPER = { mid: new THREE.Color("#f3e6d6"), edge: new THREE.Color("#e3d0ba"), hi: new THREE.Color("#fdf8f0") };
  let tone = "";

  function tick(now: number) {
    if (disposed) return;
    raf = requestAnimationFrame(tick);
    opts.lenis?.raf(now);
    if (!built || document.hidden) {
      last = now;
      return;
    }
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const t0 = performance.now();
    update(dt);
    renderer.render(scene, camera);
    perf.ms = perf.ms * 0.94 + (performance.now() - t0) * 0.06;
    perf.calls = renderer.info.render.calls;
    perf.tris = renderer.info.render.triangles;
    adapt(dt);
  }

  function update(dt: number) {
    clock += reduced ? dt * 0.3 : dt;

    // ---- where are we
    const playhead = window.scrollY + vh * 0.5;
    const list = phone ? resolvedPhone : resolvedDesk;
    let i = 0;
    while (i < CUES.length - 1 && cueAbs[i + 1] <= playhead) i++;
    if (playhead <= cueAbs[0]) blend(list[0], list[0], 0, shot);
    else if (i >= CUES.length - 1) blend(list[CUES.length - 1], list[CUES.length - 1], 0, shot);
    else {
      const span = Math.max(1, cueAbs[i + 1] - cueAbs[i]);
      blend(list[i], list[i + 1], smoother((playhead - cueAbs[i]) / span), shot);
    }
    let current = scenes[0]?.id || "bloom";
    for (const s of scenes) if (playhead >= s.top) current = s.id;
    live.set({ scene: current });

    // ---- the time-lapse, read straight off the scroll so the clock runs evenly
    const pB = sceneProgress("bloom", playhead);
    const pS = sceneProgress("scatter", playhead);
    const pC = sceneProgress("closer", playhead);
    const run = clamp((pB - 0.1) / 0.85);
    lapse.hours = pS > 0 ? H0 + SPAN + clamp(pS) * 2.2 : H0 + run * SPAN;
    lapse.bloom = clamp((pB - 0.1) / 0.84);
    lapse.scatter = clamp((pS - 0.12) / 0.62);
    lapse.frame = Math.floor(((lapse.hours - H0) * 60) / 4);

    // ---- the room and its light
    const r = room!;
    const roomOn = shot.room > 0.003;
    // the lights never leave the scene (a light coming or going recompiles every
    // material); they dim to nothing, and the shadow map stops redrawing
    r.setOpacity(shot.room);
    const day = r.setTime(lapse.hours, roomOn ? 1 : 0);
    lapse.up = day.up;
    renderer.shadowMap.autoUpdate = roomOn && day.up > 0.01;
    scene.environmentIntensity = lerp(0.025, 0.36, smooth(day.up / 0.35)) * shot.room + (1 - shot.room) * 0.5;
    key.intensity = (1 - shot.room) * 2.4;
    rim.intensity = (1 - shot.room) * 1.6;
    // the time-lapse's exposure flicker, one value per frame of film
    const lapsing = shot.room > 0.5 && !reduced;
    const fl = lapsing ? (Math.sin(lapse.frame * 12.9898) * 43758.5453) % 1 : 0;
    renderer.toneMappingExposure = 1 + Math.abs(fl) * 0.035 - 0.0175 * (lapsing ? 1 : 0);

    // ---- the color field behind it all: magenta, or blush paper
    fieldMid.copy(FIELD.mid).lerp(PAPER.mid, shot.paper);
    fieldEdge.copy(FIELD.edge).lerp(PAPER.edge, shot.paper);
    fieldHi.copy(FIELD.hi).lerp(PAPER.hi, shot.paper);
    backdrop!.uniforms.uMid.value.copy(fieldMid);
    backdrop!.uniforms.uEdge.value.copy(fieldEdge);
    backdrop!.uniforms.uHi.value.copy(fieldHi);
    backdrop!.uniforms.uTime.value = clock;
    /*
     * The page's type: dark on a lit wall or paper, cream at night and on garnet.
     * `day.up` slides continuously through the time-lapse, so a bare threshold
     * makes the tone flap every frame as the sun crosses it — and the 0.8s colour
     * transition then restarts before it can land, leaving dark type on a dark
     * room. A band down to 0.06 means the tone only changes once the sun is
     * properly gone, and never flickers back.
     */
    const lit = day.up > 0.12 || (tone === "day" && day.up > 0.06);
    const nextTone = shot.room > 0.5 ? (lit ? "day" : "night") : shot.paper > 0.5 ? "paper" : "field";
    if (nextTone !== tone) {
      tone = nextTone;
      document.documentElement.dataset.stamenTone = tone;
    }

    // ---- the light the petals glow with
    if (roomOn) {
      sunDir.copy(r.sun.position).sub(r.sun.target.position).normalize();
      petalSun.color.value.copy(r.sun.color).multiplyScalar(r.sun.intensity * 0.42 * shot.room);
    } else {
      sunDir.copy(rim.position).normalize();
      petalSun.color.value.set("#ffc2dc").multiplyScalar(0.9);
    }
    petalSun.dir.value.copy(sunDir).transformDirection(camera.matrixWorldInverse);

    // ---- the time-lapse bouquet
    const h = hero!;
    h.group.visible = shot.bq > 0.002;
    if (h.group.visible) {
      m4.compose(v3.set(shot.bqPos[0], shot.bqPos[1], shot.bqPos[2]), q4.setFromAxisAngle(Y, shot.bqTurn), sc3.setScalar(1));
      // heads lean toward the window, in the bouquet's own frame
      v3b.copy(sunDir).applyQuaternion(q4.invert());
      v3b.y = 0;
      h.update({
        bloom: lapse.bloom,
        scatter: lapse.scatter,
        time: clock,
        world: m4,
        toward: camera.position,
        wind,
        light: v3b,
        lean: shot.lean * (0.4 + 0.6 * day.up),
        breeze: reduced ? 0.2 : 1,
      });
    }

    // ---- the close-up anemone
    const mc = macro!;
    const showMacro = shot.macro > 0.002;
    mc.group.visible = showMacro;
    macroStem!.visible = showMacro;
    if (showMacro) {
      // it faces the lens, opening as we arrive
      const tilt = new THREE.Euler(Math.PI / 2 - 0.12, 0, 0);
      q4.setFromEuler(tilt).multiply(new THREE.Quaternion().setFromAxisAngle(Y, shot.macroTurn + clock * 0.03));
      macroSpec.head.compose(v3.set(0, 0.2 - (1 - shot.macro) * 1.4, 0), q4, sc3.setScalar(1));
      m4.identity();
      mc.pose(lerp(0.5, 1, clamp(pC * 2.4)), 0, m4, camera.position, wind);
      macroStem!.position.y = -(1 - shot.macro) * 1.4;
    }

    // ---- the library
    const lb = library!;
    lb.group.visible = shot.lib > 0.002;
    if (lb.group.visible) {
      /*
       * The camera no longer slides between stems. With six plates each got 0.13
       * of the chapter and a glide between stops read as motion; with ten it is
       * 0.09, and a plate would come up while the lens was still between two
       * stems — a card about an anemone over a picture of nothing. So the rail
       * now cuts: it holds a stem, then steps to the next in the gap between two
       * cards (see the windows in Chapters.tsx).
       */
      const pSt = Math.min(1, Math.max(0, sceneProgress("stems", playhead)));
      /*
       * Every stop is a small hold band, centred on the plate's stride. A hard
       * floor() put the switch a hair before the cue, so the rail and the card
       * disagreed for a frame; the hold also means the lens rests on a stem
       * exactly while its card is up, and only moves during the gaps.
       */
      /*
       * NB: not `clamp()` — that helper's default range is 0..1, and ten slots
       * divided by a 0.09 stride run to 9, so the rail was pinned at slot 1 for
       * the rest of the chapter.
       */
      const slotF = (pSt - STEMS_FIRST) / STEMS_STEP;
      const slot = Math.min(LIB_IDS.length - 1, Math.max(0, Math.floor(slotF + 0.5)));
      const rise = (1 - smooth(shot.lib)) * -1.2;
      m4.compose(v3.set(-slot * LIB_GAP + LIB_SPAN * LIB_GAP, rise, 0), q4.identity(), sc3.setScalar(1));
      lb.update({ bloom: 1, scatter: 0, time: clock, world: m4, toward: camera.position, wind, light: v3b.set(0.3, 0, 0.5), lean: 0, breeze: reduced ? 0.2 : 0.8 });
    }

    // ---- the builder's bouquet
    const cb = custom!;
    cb.group.visible = shot.build > 0.002;
    if (cb.group.visible) {
      const pop = buildPop ? clamp((performance.now() - buildPop) / 900) : 1;
      const bloomNow = lerp(0.45, 0.88, smooth(pop));
      const turn = reduced ? 0.3 : clock * 0.18;
      m4.compose(
        v3.set(shot.buildPos[0], shot.buildPos[1] - (1 - smooth(shot.build)) * 1.4, shot.buildPos[2]),
        q4.setFromAxisAngle(Y, turn),
        sc3.setScalar(1.05),
      );
      cb.update({ bloom: bloomNow, scatter: 0, time: clock, world: m4, toward: camera.position, wind, light: v3b.set(0, 0, 1), lean: 0, breeze: reduced ? 0.2 : 0.7 });
    }

    // ---- loose petals: they drift down the wind through the frame, and part round the pointer
    const dr = drift!;
    dr.mesh.visible = shot.drift > 0.01;
    if (dr.mesh.visible) {
      camera.updateMatrixWorld();
      for (let k = 0; k < driftState.length; k++) {
        const d = driftState[k];
        d.p.addScaledVector(d.v, dt * (reduced ? 0.3 : 1));
        d.p.x += Math.sin(clock * 0.7 + d.seed * 9) * dt * 0.05;
        // wrap round a box in front of the camera
        if (d.p.x > 1.7) d.p.x -= 3.4;
        if (d.p.y < -1.2) d.p.y += 2.4;
        d.a.x += d.spin.x * dt;
        d.a.y += d.spin.y * dt;
        d.a.z += d.spin.z * dt;
        // the box sits in front of the lens, so the petals are always in shot
        v3.copy(d.p);
        v3.z -= 1.4;
        if (pointer.active) {
          v3b.set(pointer.x * 0.9 * camera.aspect, pointer.y * 0.9, -1.4);
          const dx = v3.x - v3b.x;
          const dy = v3.y - v3b.y;
          const dd = dx * dx + dy * dy;
          if (dd < 0.12) {
            const push = (0.12 - dd) * 3;
            v3.x += dx * push;
            v3.y += dy * push;
          }
        }
        v3.applyMatrix4(camera.matrixWorld);
        q4.setFromEuler(d.a);
        const s = d.s * smooth(shot.drift * 1.5 - (k / driftState.length) * 0.5);
        m4.compose(v3, q4, sc3.set(s * 0.9, s, s * 0.9));
        dr.mesh.setMatrixAt(k, m4);
        dr.shape.setXYZW(k, 1.3, 0.5, 0.01, d.seed);
        dr.tone.setXYZW(k, d.tone < 0.3 ? 1 : 0, 0.9 + d.seed * 0.2, 0, 0);
      }
      dr.mesh.instanceMatrix.needsUpdate = true;
      dr.shape.needsUpdate = true;
      dr.tone.needsUpdate = true;
    }
    const pl = pollen!;
    const pm = pl.material as THREE.PointsMaterial;
    pm.opacity = shot.pollen * 0.9;
    pl.visible = pm.opacity > 0.01;
    if (pl.visible) {
      pl.position.y = Math.sin(clock * 0.3) * 0.01;
      pl.rotation.z = clock * 0.02;
    }

    // ---- camera
    const px = pointer.active && !phone ? pointer.x : 0;
    const py = pointer.active && !phone ? pointer.y : 0;
    camera.position.set(shot.cam[0] + px * 0.05, shot.cam[1] + py * 0.03, shot.cam[2]);
    lookAt.set(shot.look[0], shot.look[1], shot.look[2]);
    camera.lookAt(lookAt);
    if (camera.fov !== shot.fov) {
      camera.fov = shot.fov;
      camera.updateProjectionMatrix();
    }
    camera.updateMatrixWorld();

    // ---- the page: the timecode, beats, marks, pins
    writeHud(current);
    for (const b of beats) {
      const p = sceneProgress(b.scene, playhead);
      const vin = band(p, b.a - b.f, b.a);
      const vout = b.stay ? 1 : 1 - band(p, b.b, b.b + b.f);
      const v = Math.min(vin, vout);
      const key = v < 0.002 ? "off" : `${v.toFixed(3)}|${((1 - vin) * 22 - (1 - vout) * 22).toFixed(1)}`;
      if (key === b.last) continue;
      b.last = key;
      if (key === "off") {
        b.el.style.opacity = "0";
        b.el.style.visibility = "hidden";
      } else {
        b.el.style.opacity = v.toFixed(3);
        b.el.style.transform = `translate3d(0, ${((1 - vin) * 22 - (1 - vout) * 22).toFixed(1)}px, 0)`;
        b.el.style.visibility = "visible";
      }
    }
    for (const m of marks) {
      const p = sceneProgress(m.scene, playhead);
      const on = p >= m.a && p < m.b;
      if (on !== m.on) {
        m.on = on;
        m.el.dataset.on = on ? "1" : "0";
      }
    }
    const partsOn = current === "closer" ? band(pC, 0.5, 0.62) * (1 - band(pC, 0.92, 0.99)) : 0;
    for (const pin of pins) {
      let on = 0;
      if (pin.name.startsWith("part-")) {
        on = partsOn;
        if (on > 0.002) partPoint(pin.name.slice(5), v3);
      } else continue;
      if (on <= 0.002) {
        if (pin.last !== "off") {
          pin.last = "off";
          pin.el.style.opacity = "0";
          pin.el.style.visibility = "hidden";
        }
        continue;
      }
      v3.project(camera);
      const x = (v3.x * 0.5 + 0.5) * vw;
      const y = (-v3.y * 0.5 + 0.5) * vh;
      const k = `${x.toFixed(1)}|${y.toFixed(1)}|${on.toFixed(3)}`;
      if (k === pin.last) continue;
      pin.last = k;
      pin.el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
      pin.el.style.opacity = on.toFixed(3);
      pin.el.style.visibility = "visible";
    }
  }

  /** a point on the close-up anemone, for its labels */
  function partPoint(name: string, out: THREE.Vector3) {
    const mc = macro!;
    switch (name) {
      case "petal":
        mc.meshes.anemone.mesh.getMatrixAt(1, m4b);
        return out.set(0, 0.78, 0).applyMatrix4(m4b);
      case "anther":
        mc.anther.getMatrixAt(5, m4b);
        return out.setFromMatrixPosition(m4b);
      case "filament":
        mc.filament.getMatrixAt(40, m4b);
        return out.set(0, 0.45, 0).applyMatrix4(m4b);
      case "pistil":
      default:
        mc.boss.getMatrixAt(0, m4b);
        return out.setFromMatrixPosition(m4b);
    }
  }

  const pad2 = (n: number) => String(n).padStart(2, "0");
  function writeHud(current: string) {
    const h = lapse.hours;
    const dayN = Math.floor(h / 24) + 1;
    const hh = Math.floor(h % 24);
    const mm = Math.floor((h % 1) * 60);
    const set = (key: string, text: string) => {
      for (const x of hud[key] || []) {
        if (x.last === text) continue;
        x.last = text;
        x.el.textContent = text;
      }
    };
    set("day", `DAY ${pad2(dayN)}`);
    set("clock", `${pad2(hh)}:${pad2(mm)}`);
    set("frame", String(lapse.frame).padStart(4, "0"));
    set("stage", current === "scatter" && lapse.scatter > 0.02 ? "Petal fall" : stageOf(lapse.bloom));
    // the sun's place on its arc, for the little dial
    const d = daylight(h);
    const sunKey = `${d.arc.toFixed(3)}|${d.up > 0 ? 1 : 0}`;
    for (const x of hud.sun || []) {
      if (x.last === sunKey) continue;
      x.last = sunKey;
      x.el.style.setProperty("--arc", d.arc.toFixed(3));
      x.el.dataset.night = d.up > 0 ? "0" : "1";
    }
  }

  // keep the frame rate: drop resolution if we're slow
  function adapt(dt: number) {
    frames++;
    fpsT += dt;
    if (fpsT > 1) {
      const fps = frames / fpsT;
      frames = 0;
      fpsT = 0;
      if (fps < 45) slow++;
      else slow = Math.max(0, slow - 1);
      if (slow >= 2 && dpr > 1) {
        dpr = Math.max(1, dpr - 0.25);
        renderer.setPixelRatio(dpr);
        resize();
        slow = 0;
      }
    }
  }

  build()
    .then(() => {
      if (!disposed) raf = requestAnimationFrame(tick);
    })
    .catch((err) => {
      console.error("STAMEN: the scene failed to build", err);
      live.set({ failed: true, ready: true, load: 1 });
    });
  {
    const pre = (t: number) => {
      if (disposed || built) return;
      opts.lenis?.raf(t);
      requestAnimationFrame(pre);
    };
    requestAnimationFrame(pre);
  }

  /**
   * One frame, borrowed, at twice the pixel ratio.
   *
   * The context is not created with `preserveDrawingBuffer` — it costs a copy of
   * the framebuffer every frame to buy something we need once in a while. So the
   * still is drawn here, synchronously, and read back before the compositor can
   * clear it, and the stage is put back exactly as it was.
   */
  function capture(): string | null {
    if (!built) return null;
    const beforeRatio = renderer.getPixelRatio();
    const beforeSize = renderer.getSize(new THREE.Vector2());
    try {
      update(0); // make sure the frame about to be drawn is the current state
      renderer.setPixelRatio(Math.min(3, beforeRatio * 2));
      renderer.setSize(beforeSize.x, beforeSize.y, false);
      renderer.render(scene, camera);
      const url = renderer.domElement.toDataURL("image/png");
      return url && url.length > 500 ? url : null;
    } catch {
      return null;
    } finally {
      renderer.setPixelRatio(beforeRatio);
      renderer.setSize(beforeSize.x, beforeSize.y, false);
    }
  }

  return {
    setPick(p: Pick) {
      pick = p;
      applyPick();
    },
    capture,
    remeasure: measure,
    dispose() {
      disposed = true;
      cancelAnimationFrame(raf);
      cleanup.forEach((f) => f());
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh) {
          m.geometry?.dispose();
          const mat = m.material as THREE.Material | THREE.Material[];
          (Array.isArray(mat) ? mat : [mat]).forEach((x) => x.dispose());
        }
      });
      renderer.dispose();
    },
  };
}

const Y = new THREE.Vector3(0, 1, 0);

/** wait for the faces the page sets, so nothing measures in a fallback */
async function fontsReady() {
  if (typeof document === "undefined" || !document.fonts) return;
  try {
    await Promise.race([
      Promise.all([document.fonts.load(`400 80px "Fraunces"`), document.fonts.load(`italic 400 80px "Fraunces"`), document.fonts.load(`500 14px "Geist Mono"`)]),
      new Promise((r) => setTimeout(r, 2500)),
    ]);
  } catch {
    /* fall back */
  }
}

export type Director = ReturnType<typeof createDirector>;
