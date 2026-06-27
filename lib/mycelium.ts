// Mycelium visual engine — ports the proven Python PoC to a 2D canvas.
// An agent's run becomes a colony: filaments grow, dead-ends ROT, the answer BLOOMS.
import { mulberry32, rangeOf } from "./prng";
import {
  ColonySpec, RGB, LEFT_SPEC, RIGHT_SPEC, LEFT_BASE, RIGHT_BASE,
  TASK_LABEL, AgentTrace, specFromTrace,
} from "./trace";

export const LOGICAL_W = 1120;
export const LOGICAL_H = 640;

const BG: RGB = [8, 9, 14];
const ROT: RGB = [165, 100, 55];
const ROT_DARK: RGB = [60, 42, 28];
const TIP: RGB = [244, 255, 248];

type Pt = { x: number; y: number; w: number; t: number };
type Stroke = {
  pts: Pt[];
  color: RGB;
  rotAt: number | null;
  depth: number;
  label: string | null;
  end: number;        // global tf at which this colony blooms
  colonyId: string;
};
type Ambient = { x: number; y: number; r: number; ph: number };
export type Scene = {
  strokes: Stroke[];
  ambient: Ambient[];
  colonies: { id: string; title: string; end: number; bloomDur: number; tip: Pt; color: RGB; seedX: number }[];
};

function lerp(a: RGB, b: RGB, t: number): RGB {
  const c = Math.max(0, Math.min(1, t));
  return [
    Math.round(a[0] + (b[0] - a[0]) * c),
    Math.round(a[1] + (b[1] - a[1]) * c),
    Math.round(a[2] + (b[2] - a[2]) * c),
  ];
}
const css = (c: RGB) => `rgb(${c[0]},${c[1]},${c[2]})`;

function filament(
  out: Stroke[], rng: () => number,
  sx: number, sy: number, ang: number, length: number, width: number,
  t0: number, dt: number, color: RGB, depth: number,
  rotAt: number | null, curl: number, jitter: number, label: string | null,
  end: number, colonyId: string
): Pt[] {
  const pts: Pt[] = [];
  let x = sx, y = sy, a = ang;
  const n = Math.max(8, Math.floor(length / 5.5));
  for (let i = 0; i <= n; i++) {
    const f = i / n;
    pts.push({ x, y, w: width * (1 - 0.74 * f), t: t0 + dt * f });
    a += rangeOf(rng, -jitter, jitter) + curl;
    const st = length / n;
    x += Math.cos(a) * st;
    y += Math.sin(a) * st;
  }
  out.push({ pts, color, rotAt, depth, label, end, colonyId });
  return pts;
}

function hairs(out: Stroke[], rng: () => number, seeds: Stroke[], density: number, depthCap: number): Stroke[] {
  const added: Stroke[] = [];
  for (const s of seeds) {
    if (s.depth >= depthCap) continue;
    for (let i = 0; i < s.pts.length; i += 2) {
      const p = s.pts[i];
      if (p.w < 1.6 || rng() > density) continue;
      const aa = rangeOf(rng, 0, Math.PI * 2);
      const ln = rangeOf(rng, 9, 30) * (0.6 + p.w / 9);
      filament(out, rng, p.x, p.y, aa, ln, Math.max(1.1, p.w * 0.5), p.t + 0.01, 0.05,
        s.color, s.depth + 1, s.rotAt, 0.0, 0.5, null, s.end, s.colonyId);
      added.push(out[out.length - 1]);
    }
  }
  return added;
}

function buildColony(out: Stroke[], rng: () => number, spec: ColonySpec) {
  const start = out.length;
  const trunk = filament(out, rng, spec.seed[0], spec.seed[1], spec.baseAng, spec.length, spec.width,
    0.02, 0.30, spec.color, 0, null, spec.curl, 0.22, null, spec.end, spec.id);
  const n = trunk.length;
  for (const m of spec.mids) {
    const bp = trunk[Math.floor(m.frac * (n - 1))];
    filament(out, rng, bp.x, bp.y, spec.baseAng + m.aoff, spec.length * m.lsc, Math.max(2.0, spec.width * m.wsc),
      bp.t, 0.30 * m.lsc, spec.color, 1, m.rotAt, spec.curl + m.aoff * 0.03, 0.28, m.label, spec.end, spec.id);
  }
  for (const r of spec.rots) {
    const bp = trunk[Math.floor(r.frac * (n - 1))];
    filament(out, rng, bp.x, bp.y, spec.baseAng + r.aoff, spec.length * r.lsc, Math.max(2.2, spec.width * 0.62),
      bp.t, 0.30 * r.lsc, spec.color, 1, bp.t + 0.02, r.aoff * 0.05, 0.32, null, spec.end, spec.id);
  }
  const mids = out.slice(start);
  const h1 = hairs(out, rng, mids, 0.7, 4);
  hairs(out, rng, mids.concat(h1), 0.5, 4);
}

function topTip(strokes: Stroke[], id: string): Pt {
  let best: Pt | null = null;
  for (const s of strokes) {
    if (s.colonyId !== id || s.rotAt !== null) continue;
    for (const p of s.pts) if (!best || p.y < best.y) best = p;
  }
  return best ?? { x: LOGICAL_W / 2, y: LOGICAL_H / 2, w: 1, t: 1 };
}

export function buildScene(traces?: { left?: AgentTrace; right?: AgentTrace }): Scene {
  const leftSpec = traces?.left ? specFromTrace(traces.left, LEFT_BASE) : LEFT_SPEC;
  const rightSpec = traces?.right ? specFromTrace(traces.right, RIGHT_BASE) : RIGHT_SPEC;
  const strokes: Stroke[] = [];
  const rng = mulberry32(11);
  buildColony(strokes, rng, leftSpec);
  buildColony(strokes, rng, rightSpec);

  const amb = mulberry32(5);
  const ambient: Ambient[] = [];
  for (let i = 0; i < 60; i++)
    ambient.push({
      x: rangeOf(amb, 0, LOGICAL_W), y: rangeOf(amb, 120, LOGICAL_H - 40),
      r: rangeOf(amb, 0.6, 1.8), ph: amb(),
    });

  return {
    strokes, ambient,
    colonies: [
      { id: leftSpec.id, title: leftSpec.title, end: leftSpec.end, bloomDur: 0.18, tip: topTip(strokes, leftSpec.id), color: leftSpec.color, seedX: leftSpec.seed[0] },
      { id: rightSpec.id, title: rightSpec.title, end: rightSpec.end, bloomDur: 0.06, tip: topTip(strokes, rightSpec.id), color: rightSpec.color, seedX: rightSpec.seed[0] },
    ],
  };
}

function strokeColorAt(s: Stroke, lt: number): { col: RGB; rotted: boolean } {
  if (s.rotAt !== null && lt > s.rotAt) {
    const rp = Math.min(1, (lt - s.rotAt) / 0.16);
    let col = lerp(lerp(s.color, ROT, Math.min(1, rp * 1.4)), ROT_DARK, Math.max(0, rp - 0.35));
    col = lerp(col, BG, rp * 0.45);
    return { col, rotted: true };
  }
  return { col: s.color, rotted: false };
}

function drawStrokes(ctx: CanvasRenderingContext2D, scene: Scene, tf: number, glow: boolean) {
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const s of scene.strokes) {
    const lt = tf / s.end;
    const { col, rotted } = strokeColorAt(s, lt);
    ctx.strokeStyle = css(col);
    let prev: Pt | null = null;
    for (const p of s.pts) {
      if (p.t > lt) break;
      if (prev) {
        ctx.lineWidth = glow ? Math.max(1, p.w) + 3 : Math.max(1, p.w);
        ctx.beginPath();
        ctx.moveTo(prev.x, prev.y);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
      }
      prev = p;
    }
    // bright growing tip
    if (prev && (s.rotAt === null || lt <= s.rotAt + 0.02) && lt < 1 && !rotted) {
      const r = Math.max(2, prev.w);
      ctx.fillStyle = css(TIP);
      ctx.beginPath();
      ctx.arc(prev.x, prev.y, glow ? r * 2.2 : r * 0.7, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawBlooms(ctx: CanvasRenderingContext2D, scene: Scene, tf: number, glow: boolean) {
  for (const c of scene.colonies) {
    if (tf <= c.end) continue;
    const prog = Math.min(1, (tf - c.end) / c.bloomDur);
    const { x, y } = c.tip;
    const R = 8 + prog * 52;
    if (glow) {
      for (const rr of [R, R * 0.62, R * 0.32]) {
        ctx.fillStyle = css([c.color[0] * 0.95, c.color[1] * 0.95, c.color[2] * 0.95].map(Math.round) as RGB);
        ctx.beginPath(); ctx.arc(x, y, rr, 0, Math.PI * 2); ctx.fill();
      }
      ctx.strokeStyle = css([c.color[0] * 0.5, c.color[1] * 0.5, c.color[2] * 0.5].map(Math.round) as RGB);
      ctx.lineWidth = 2;
      for (let k = 0; k < 10; k++) {
        const aa = (k / 10) * Math.PI * 2 + tf * 0.6;
        const rl = R * 1.5 * prog;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(aa) * rl, y + Math.sin(aa) * rl); ctx.stroke();
      }
      const sp = mulberry32(c.id === "left" ? 7 : 99);
      ctx.fillStyle = css(c.color);
      for (let i = 0; i < Math.floor(prog * 34); i++) {
        const aa = rangeOf(sp, 0, Math.PI * 2);
        const dd = rangeOf(sp, R * 0.3, R * 1.9) * (0.5 + prog);
        ctx.beginPath(); ctx.arc(x + Math.cos(aa) * dd, y + Math.sin(aa) * dd, 2, 0, Math.PI * 2); ctx.fill();
      }
    } else {
      ctx.fillStyle = css(TIP);
      ctx.beginPath(); ctx.arc(x, y, R * 0.16, 0, Math.PI * 2); ctx.fill();
    }
  }
}

function drawText(ctx: CanvasRenderingContext2D, scene: Scene, tf: number) {
  ctx.textBaseline = "alphabetic";
  ctx.font = "12px Consolas, monospace";
  for (const s of scene.strokes) {
    if (!s.label) continue;
    const lt = tf / s.end;
    let last: Pt | null = null;
    for (const p of s.pts) if (p.t <= lt) last = p;
    if (last && lt > 0.18) {
      const dim = s.rotAt === null || lt <= s.rotAt ? "rgb(170,180,190)" : "rgb(150,110,80)";
      ctx.fillStyle = dim;
      ctx.fillText(s.label, last.x + 7, last.y - 6);
    }
  }
  ctx.fillStyle = "rgb(150,238,188)";
  ctx.font = "23px 'MS Gothic', monospace";
  ctx.fillText("Mycelium", 26, 40);
  ctx.fillStyle = "rgb(150,160,175)";
  ctx.font = "15px 'MS Gothic', monospace";
  ctx.fillText("AIの思考を育つ菌糸として観る — 間違いは腐って枯れる", 28, 64);
  ctx.fillStyle = "rgb(95,105,120)";
  ctx.font = "12px Consolas, monospace";
  ctx.fillText(TASK_LABEL, LOGICAL_W / 2 - 180, 98);
  for (const c of scene.colonies) {
    ctx.fillStyle = c.id === "left" ? "rgb(110,185,145)" : "rgb(110,150,210)";
    ctx.fillText(c.title, c.seedX - 70, LOGICAL_H - 26);
  }
}

export function drawFrame(
  main: CanvasRenderingContext2D, glowCanvas: HTMLCanvasElement,
  scene: Scene, tf: number
) {
  const W = LOGICAL_W, H = LOGICAL_H;
  const glow = glowCanvas.getContext("2d");
  if (!glow) return;

  glow.clearRect(0, 0, W, H);
  main.fillStyle = css(BG);
  main.fillRect(0, 0, W, H);

  // ambient spores (on glow only)
  for (const a of scene.ambient) {
    const tw = 0.5 + 0.5 * Math.sin(tf * 6 + a.ph * 6.28);
    glow.fillStyle = `rgb(${Math.round(40 * tw)},${Math.round(60 * tw)},${Math.round(70 * tw)})`;
    glow.beginPath(); glow.arc(a.x, a.y, a.r * 2, 0, Math.PI * 2); glow.fill();
  }
  drawStrokes(glow, scene, tf, true);
  drawBlooms(glow, scene, tf, true);

  // composite blurred glow behind the crisp layer
  main.save();
  main.filter = "blur(8px)";
  main.globalCompositeOperation = "lighter";
  main.drawImage(glowCanvas, 0, 0, W, H);
  main.restore();

  drawStrokes(main, scene, tf, false);
  drawBlooms(main, scene, tf, false);
  drawText(main, scene, tf);
}
