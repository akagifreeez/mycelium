// Capture a REAL Claude Agent SDK run as a Mycelium trace.
// Usage: node scripts/capture-trace.mjs <id> "<title>" "<task prompt>"
// Writes data/<id>.json  =  { id, title, task, events:[{kind,t,...}] }
import { query } from "@anthropic-ai/claude-agent-sdk";
import { cpSync, rmSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const [, , id, title, ...rest] = process.argv;
if (!id || !title || rest.length === 0) {
  console.error('Usage: node scripts/capture-trace.mjs <id> "<title>" "<task>"');
  process.exit(1);
}
const task = rest.join(" ");

const ROOT = process.cwd();
const WORK = join(ROOT, "scripts", "_work_" + id);
rmSync(WORK, { recursive: true, force: true });
cpSync(join(ROOT, "scripts", "sample"), WORK, { recursive: true });

const t0 = Date.now();
const events = [];
const push = (e) => events.push({ ...e, t: Date.now() - t0 });

const prompt =
  task +
  `\n\nThe files to work on are in this directory: ${WORK.replace(/\\/g, "/")} ` +
  `(counter.ts, app.ts, util.ts). Operate only there. Stop when the global is gone and imports still resolve.`;

try {
  for await (const m of query({
    prompt,
    options: {
      systemPrompt:
        "You are a refactoring agent working on a small TypeScript module. " +
        "Use the allowed tools to explore and edit. Keep going until the task is done.",
      allowedTools: ["Read", "Write", "Edit", "Glob", "Grep"],
      permissionMode: "acceptEdits",
      maxTurns: 26,
    },
  })) {
    if (m.type === "assistant") {
      for (const b of m.message?.content ?? []) {
        if (b.type === "text" && b.text?.trim()) push({ kind: "reason", text: b.text.trim().slice(0, 90) });
        else if (b.type === "tool_use") push({ kind: "tool", name: b.name });
      }
    } else if (m.type === "user") {
      const c = m.message?.content;
      if (Array.isArray(c)) for (const b of c) {
        if (b.type === "tool_result") push({ kind: "result", ok: !b.is_error });
      }
    } else if (m.type === "result") {
      push({ kind: "done" });
    }
  }
} finally {
  rmSync(WORK, { recursive: true, force: true });
}

mkdirSync(join(ROOT, "data"), { recursive: true });
const out = { id, title, task: task.slice(0, 140), events };
writeFileSync(join(ROOT, "data", id + ".json"), JSON.stringify(out, null, 2));

const tools = events.filter((e) => e.kind === "tool");
const fails = events.filter((e) => e.kind === "result" && !e.ok);
console.log(`captured ${events.length} events -> data/${id}.json`);
console.log("tools:", tools.map((e) => e.name).join(", ") || "(none)");
console.log("failures:", fails.length);
