import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { createInMemoryApi } from "../dist/inquiry/runtime/api.js";
import { readAtlasMemoryStore } from "../dist/inquiry/runtime/atlas-memory-store.js";
import { createSourceProject } from "../dist/source/project.js";

const dir = "packages/atlas/memory";
const shard = name => `${dir}/records/${name}.json`;
const document = (key, entries) => JSON.stringify({ schemaVersion: "atlas-memory.v1", [key]: entries });
const decision = id => ({ id, kind: "decision", domains: ["atlas"], summary: id });
const writer = fileURLToPath(new URL("../dist/scripts/atlas-memory-write.js", import.meta.url));

function fixture(t) {
  const root = mkdtempSync(path.join(tmpdir(), "atlas-memory-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(path.join(root, dir, "records"), { recursive: true });
  writeFileSync(path.join(root, "pnpm-workspace.yaml"), "packages: []\n");
  execFileSync("git", ["init", "-q"], { cwd: root });
  writeFileSync(path.join(root, dir, "atlas-memory.json"), document("shards", [
    { path: shard("first") }, { path: shard("product") },
  ]));
  writeFileSync(path.join(root, shard("first")), document("records", []));
  writeFileSync(path.join(root, shard("product")), document("records", []));
  return root;
}

test("the memory continuation reads the selected authored JSON object", async t => {
  const root = fixture(t);
  const record = decision('decision:quoted-"id"');
  const file = path.join(root, shard("first"));
  writeFileSync(file, document("records", [
    0, { ...decision("other"), metadata: { id: record.id } }, record,
  ]));
  const project = createSourceProject({ repoRoot: root, packages: [] });
  const api = createInMemoryApi({ sourceProject: project });
  const request = {
    lens: "atlas.memory", locus: { kind: "repo" }, projection: "records", filters: { recordId: record.id },
  };
  const result = await api.ask(request);
  assert.equal(result.value.records.length, 1);
  assert.equal(result.value.issues.length, 1, "malformed sibling reported");
  const jump = result.continuations.find(row => row.id === `atlas.memory:${record.id}:storage`);
  assert.ok(jump);
  const followed = await api.follow(jump);
  assert.deepEqual(JSON.parse(followed.value.slices[0].text), record);
  const changed = { ...record, summary: "updated on disk" };
  writeFileSync(file, document("records", [changed]));
  const latest = await api.ask(request);
  const latestSource = await api.follow(latest.continuations.find(row => row.id === jump.id));
  assert.deepEqual(JSON.parse(latestSource.value.slices[0].text), changed);

  const otherFile = await api.ask({ ...request, locus: { kind: "source-file", filePath: shard("product") } });
  assert.equal(otherFile.value.records.length, 0);
  const storageFile = await api.ask({ ...request, locus: { kind: "source-file", filePath: shard("first") } });
  assert.equal(storageFile.value.records.length, 1);
});

test("an authored class check reports resolved pressure and verifies qualified member names", async t => {
  const root = fixture(t);
  const base = "packages/semantic-runtime";
  const file = base + "/src/example.ts";
  mkdirSync(path.join(root, base, "src"), { recursive: true });
  writeFileSync(path.join(root, base, "package.json"), JSON.stringify({ name: "@aurelia-ls/semantic-runtime" }));
  writeFileSync(path.join(root, base, "tsconfig.json"), JSON.stringify({ include: ["src/*.ts"] }));
  writeFileSync(path.join(root, file), `export class Outer {
    direct() { class Inner { nested() {} } return Inner; }
    ${"\n".repeat(100)}
  }
  export class Context {
    ${"\n".repeat(100)}
  }`);
  execFileSync("git", ["add", file], { cwd: root });
  writeFileSync(path.join(root, shard("product")), document("records", [{
    ...decision("frontier:outer"), kind: "pressure-frontier",
    anchors: [
      { kind: "source", filePath: file, symbolName: "Outer.direct" },
      { kind: "source", filePath: file, symbolName: "Outer.nested" },
      { kind: "source", filePath: file, symbolName: "Context", summary: "Related class outside the measured check." },
    ],
    liveChecks: [{ kind: "product-large-class", filePath: file, className: "Outer", minLineCount: 500 }],
  }]));
  const api = createInMemoryApi({ sourceProject: createSourceProject({ repoRoot: root, packages: [{
    id: "semantic-runtime", packageName: "@aurelia-ls/semantic-runtime", rootPath: base, tsconfigPath: base + "/tsconfig.json",
  }] }) });
  const answer = await api.ask({ lens: "atlas.memory", locus: { kind: "repo" }, projection: "summary" });
  assert.equal(answer.value.records[0].status, "resolved");
  assert.equal(answer.value.records[0].liveChecks[0].productClass.name, "Outer");
  assert.deepEqual(answer.value.issues.map(row => row.id), ["atlas.memory:record:frontier:outer:anchor:1:missing-symbol"]);
  const excluded = createSourceProject({ repoRoot: root, packages: [] });
  t.after(() => excluded.dispose());
  const partial = await createInMemoryApi({ sourceProject: excluded }).ask({
    lens: "atlas.memory", locus: { kind: "repo" }, projection: "summary",
  });
  assert.equal(partial.value.rollup.byStatus["out-of-scope"], 1);
  assert.deepEqual(partial.value.records.map(row => row.status), ["out-of-scope"]);
  assert.deepEqual(partial.value.issues, []);
  assert.equal(partial.basis.find(basis => basis.kind === "typescript-program").closure, "partial");
});

test("file-exists memory checks see working tree removal and newly staged paths on the same client", async t => {
  const root = fixture(t);
  const records = ["original.md", "new.md"].map(filePath => ({
    ...decision(filePath), liveChecks: [{ kind: "source-file-exists", filePath }],
  }));
  writeFileSync(path.join(root, shard("first")), document("records", records));
  writeFileSync(path.join(root, "original.md"), "original");
  execFileSync("git", ["add", "original.md"], { cwd: root });
  const api = createInMemoryApi({ sourceProject: createSourceProject({ repoRoot: root, packages: [] }) });
  async function statuses() {
    const answer = await api.ask({ lens: "atlas.memory", locus: { kind: "repo" }, projection: "records" });
    return answer.value.records.map(r => [r.id, r.liveChecks[0].status]);
  }
  assert.deepEqual(await statuses(), [["original.md", "present"], ["new.md", "stale-source"]]);
  rmSync(path.join(root, "original.md"));
  writeFileSync(path.join(root, "new.md"), "new");
  execFileSync("git", ["add", "new.md"], { cwd: root });
  assert.deepEqual(await statuses(), [["original.md", "stale-source"], ["new.md", "present"]]);
});

test("archived memory is addressable while guidance and body search use current records", async t => {
  const root = fixture(t);
  const archived = { ...decision("historical"), archived: true, guidance: ["obsolete mechanism"] };
  writeFileSync(path.join(root, shard("first")), document("records", [
    archived, { ...decision("current"), guidance: ["active mechanism"] },
  ]));
  const project = createSourceProject({ repoRoot: root, packages: [] });
  t.after(() => project.dispose());
  const api = createInMemoryApi({ sourceProject: project });
  const ask = (projection, filters) => api.ask({ lens: "atlas.memory", locus: { kind: "repo" }, projection, filters });
  const ids = async (projection, filters) => (await ask(projection, filters)).value.records.map(row => row.id);
  assert.deepEqual(await ids("records", { archived: true }), ["historical"]);
  assert.deepEqual(await ids("records", { recordId: "historical" }), ["historical"]);
  assert.deepEqual(await ids("records", { query: "historical" }), ["historical"]);
  assert.deepEqual(await ids("records", { query: "obsolete" }), []);
  assert.deepEqual(await ids("guidance", {}), ["current"]);
});

test("memory distinguishes excluded files from resolved pressure and stale anchors", async t => {
  const root = fixture(t);
  const base = "packages/atlas";
  const file = base + "/src/subject.ts";
  const other = base + "/src/other.ts";
  mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
  writeFileSync(path.join(root, other), "export {};");
  writeFileSync(path.join(root, file), "export class Subject {}");
  execFileSync("git", ["add", other, file], { cwd: root });
  const records = {
    pressure: [{ kind: "atlas-self-source-file", filePath: file, minLineCount: 1 }],
    resolved: [{ kind: "atlas-self-class", className: "Subject", filePath: file, minLineCount: 500 }],
    retired: [{ kind: "atlas-self-class", className: "Retired", filePath: file }],
    mixed: [{ kind: "source-file-exists", filePath: other },
      { kind: "source-declaration-exists", filePath: file, symbolName: "Subject" }],
    live: [{ kind: "atlas-self-source-file", filePath: other },
      { kind: "atlas-self-source-file", filePath: file }],
    missing: [{ kind: "atlas-self-source-file", filePath: base + "/src/deleted.ts" }],
  };
  writeFileSync(path.join(root, shard("first")), document("records", Object.entries(records).map(([id, liveChecks]) => ({
    ...decision(id), kind: "intentional-shape", liveChecks,
    anchors: id === "mixed" ? [{ kind: "source", filePath: file, symbolName: "Subject" }] : [],
  }))));
  const definition = { id: "atlas", packageName: "@aurelia-ls/atlas", rootPath: base, tsconfigPath: base + "/tsconfig.json" };
  for (const include of [false, true]) {
    writeFileSync(path.join(root, definition.tsconfigPath), JSON.stringify({ files: include ? ["src/other.ts", "src/subject.ts"] : ["src/other.ts"] }));
    const project = createSourceProject({ repoRoot: root, packages: [definition] });
    t.after(() => project.dispose());
    const api = createInMemoryApi({ sourceProject: project });
    const ask = (projection, filters) => api.ask({ lens: "atlas.memory", locus: { kind: "repo" }, projection, filters });
    const result = await ask("records");
    const byId = new Map(result.value.records.map(row => [row.id, row]));
    assert.equal(byId.get("pressure").status, include ? "intentional-live" : "out-of-scope");
    assert.equal(byId.get("resolved").status, include ? "resolved" : "out-of-scope");
    assert.equal(byId.get("retired").status, include ? "resolved" : "out-of-scope");
    assert.equal(byId.get("mixed").status, include ? "intentional-live" : "out-of-scope");
    assert.equal(byId.get("live").status, "intentional-live");
    assert.equal(byId.get("missing").status, "stale-source");
    assert.deepEqual(result.value.issues, []);
    assert.equal(result.openSeams.some(seam => seam.kind === "insufficient-basis" && seam.summary.includes(file)), !include);
    assert.deepEqual((await ask("records", { recordId: "pressure" })).openSeams, []);
    assert.equal((await ask("records", { status: "out-of-scope" })).value.records.length, include ? 0 : 4);
    assert.deepEqual((await ask("stale")).value.records.map(row => row.id).sort(), include ? ["missing", "resolved", "retired"] : ["missing"]);
  }
});

test("the writer validates drafts and preserves neighboring data and creation date across a move", t => {
  const root = fixture(t);
  const neighbor = { ...decision("neighbor"), metadata: { retained: true } };
  const original = { ...decision("moving"), nextActionPolicy: "hidden", createdAt: "2020-01-02" };
  const draft = path.join(root, "draft.json");
  const target = path.join(root, shard("product"));
  writeFileSync(path.join(root, shard("first")), document("records", [original, neighbor]));
  const run = () => spawnSync(process.execPath, [writer, "--record=draft.json", "--shard=product"], {
    cwd: root, encoding: "utf8",
  });
  writeFileSync(draft, JSON.stringify({ ...original, createdAt: "2030-07-09" }));
  const moved = run();
  assert.equal(moved.status, 0, moved.stderr);
  assert.deepEqual(JSON.parse(readFileSync(path.join(root, shard("first")), "utf8")).records, [neighbor]);
  const { database, issues } = readAtlasMemoryStore({ repoRoot: root });
  assert.deepEqual(issues, []);
  const movedRecord = database.records.find(row => row.record.id === "moving").record;
  assert.equal(movedRecord.createdAt, original.createdAt);
  assert.equal(movedRecord.archived, true);
  assert.equal(Object.hasOwn(JSON.parse(readFileSync(target, "utf8")).records[0], "nextActionPolicy"), false);
  const saved = readFileSync(target, "utf8");
  writeFileSync(draft, JSON.stringify({ ...original, anchors: [{ kind: "source", wrong: "value" }] }));
  const invalid = run();
  assert.notEqual(invalid.status, 0);
  assert.match(invalid.stderr, /anchors\[0\] is not valid/);
  assert.equal(readFileSync(target, "utf8"), saved);
  writeFileSync(draft, JSON.stringify({ ...original, anchors: [{
    kind: "lens", lensId: "framework.observation", projection: "flow-sites", surfaceKind: "checked-observer",
  }] }));
  const wider = run();
  assert.notEqual(wider.status, 0);
  assert.match(wider.stderr, /invalid lens selection \(surfaceKind\)/);
  assert.equal(readFileSync(target, "utf8"), saved);
});

test("memory normalizes archive visibility in v1 records and rejects invalid values", t => {
  const root = fixture(t);
  writeFileSync(path.join(root, shard("first")), document("records", [
    { ...decision("old-hidden"), nextActionPolicy: "hidden" },
    { ...decision("old-when-touched"), nextActionPolicy: "when-touched" },
    { ...decision("old-proactive"), nextActionPolicy: "proactive" },
    { ...decision("current"), archived: false },
    { ...decision("archived"), archived: true },
    { ...decision("invalid"), archived: "false" },
    { ...decision("invalid-legacy"), nextActionPolicy: "invalid" },
  ]));
  const { database, issues } = readAtlasMemoryStore({ repoRoot: root });
  assert.deepEqual(database.records.map(({ record }) => [record.id, record.archived]), [
    ["old-hidden", true], ["old-when-touched", undefined], ["old-proactive", undefined],
    ["current", false], ["archived", true],
  ]);
  assert.deepEqual(issues.map(issue => issue.summary), ["archived must be a boolean.", "Unknown nextActionPolicy."]);
});
