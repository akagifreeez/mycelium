// A "colony spec" is the growth recipe for one agent's run. The hand-authored
// specs below are fallbacks; real colonies are DERIVED from captured agent traces
// (reason / tool_call / tool_result / backtrack / done) via specFromTrace().
export type RGB = [number, number, number];

export type Mid = {
  frac: number;
  aoff: number;
  lsc: number;
  wsc: number;
  rotAt: number | null;
  label: string | null;
};

export type RotProbe = { frac: number; aoff: number; lsc: number };

export type ColonyBase = {
  id: string;
  title: string;
  seed: [number, number];
  baseAng: number;
  length: number;
  width: number;
  color: RGB;
  curl: number;
  end: number; // global tf at which this colony blooms
};

export type ColonySpec = ColonyBase & {
  mids: Mid[];
  rots: RotProbe[];
};

export const COL_LEFT: RGB = [120, 240, 175];
export const COL_RIGHT: RGB = [130, 195, 255];

export const LEFT_BASE: ColonyBase = {
  id: "left", title: "careful planner",
  seed: [235, 594], baseAng: -Math.PI / 2 - 0.12,
  length: 300, width: 9.5, color: COL_LEFT, curl: 0.01, end: 0.7,
};
export const RIGHT_BASE: ColonyBase = {
  id: "right", title: "greedy doer",
  seed: [885, 594], baseAng: -Math.PI / 2 + 0.13,
  length: 290, width: 9.0, color: COL_RIGHT, curl: -0.01, end: 0.93,
};

// Hand-authored fallback specs (used until real traces are wired).
export const LEFT_SPEC: ColonySpec = {
  ...LEFT_BASE,
  rots: [{ frac: 0.33, aoff: 0.7, lsc: 0.34 }],
  mids: [
    { frac: 0.26, aoff: -0.55, lsc: 0.62, wsc: 0.6, rotAt: null, label: "glob" },
    { frac: 0.45, aoff: 0.5, lsc: 0.55, wsc: 0.55, rotAt: null, label: "read" },
    { frac: 0.6, aoff: -0.5, lsc: 0.6, wsc: 0.55, rotAt: null, label: "edit" },
    { frac: 0.74, aoff: 0.45, lsc: 0.5, wsc: 0.5, rotAt: null, label: null },
    { frac: 0.88, aoff: -0.12, lsc: 0.5, wsc: 0.5, rotAt: null, label: "done" },
  ],
};
export const RIGHT_SPEC: ColonySpec = {
  ...RIGHT_BASE,
  rots: [{ frac: 0.2, aoff: -0.85, lsc: 0.9 }],
  mids: [
    { frac: 0.42, aoff: 0.55, lsc: 0.55, wsc: 0.55, rotAt: null, label: "read" },
    { frac: 0.55, aoff: -0.4, lsc: 0.66, wsc: 0.6, rotAt: null, label: null },
    { frac: 0.72, aoff: 0.5, lsc: 0.52, wsc: 0.5, rotAt: null, label: "edit" },
    { frac: 0.9, aoff: 0.1, lsc: 0.5, wsc: 0.5, rotAt: null, label: "done" },
  ],
};

export const TASK_LABEL = "// task: remove the global from a 3-file module";

// ---- Real agent trace ----------------------------------------------------
// One run of a Claude Agent SDK agent, captured by scripts/capture-trace.mjs.
export type TraceEvent =
  | { kind: "reason"; t: number; text?: string }
  | { kind: "tool"; t: number; name: string }
  | { kind: "result"; t: number; ok: boolean; tool?: string }
  | { kind: "backtrack"; t: number; why?: string }
  | { kind: "done"; t: number };

export type AgentTrace = {
  id: string;
  title: string;
  task?: string;
  events: TraceEvent[]; // t = raw ms epoch or 0..1; specFromTrace normalizes
};

// Convert a captured trace into a colony growth recipe. Trunk geometry comes from
// `base` (fixed per side for clean composition + the race); branches/rot/labels
// come from the REAL events: every tool call sprouts a branch, a failed/abandoned
// step makes that branch rot.
export function specFromTrace(trace: AgentTrace, base: ColonyBase): ColonySpec {
  const tools = trace.events.filter((e): e is Extract<TraceEvent, { kind: "tool" }> => e.kind === "tool");

  // mark which tool branches rot: a tool followed by a failed result or a backtrack
  const failed = new Set<number>();
  let toolIdx = -1;
  for (const e of trace.events) {
    if (e.kind === "tool") toolIdx++;
    else if ((e.kind === "result" && !e.ok) || e.kind === "backtrack") {
      if (toolIdx >= 0) failed.add(toolIdx);
    }
  }

  const N = Math.max(1, tools.length);
  const mids: Mid[] = tools.map((tEv, i) => {
    const frac = 0.2 + 0.7 * (N === 1 ? 0.5 : i / (N - 1));
    const side = i % 2 === 0 ? -1 : 1;
    const aoff = side * (0.42 + 0.12 * ((i * 7) % 3));
    return {
      frac,
      aoff,
      lsc: 0.5 + 0.05 * ((i * 5) % 3),
      wsc: 0.5 + 0.08 * (i % 2),
      rotAt: failed.has(i) ? Math.max(0.08, frac * 0.85) : null,
      label: tEv.name.toLowerCase(),
    };
  });

  const rots: RotProbe[] = [];
  const firstFail = [...failed].sort((a, b) => a - b)[0];
  if (firstFail !== undefined) {
    const frac = 0.2 + 0.7 * (N === 1 ? 0.5 : firstFail / (N - 1));
    rots.push({ frac, aoff: (firstFail % 2 ? 1 : -1) * 0.85, lsc: 0.88 });
  }

  return { ...base, id: trace.id, title: trace.title, mids, rots };
}
