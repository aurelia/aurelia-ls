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

test("a measured class stays tracked after its pressure resolves, and qualified names select direct members", async t => {
  const root = fixture(t);
  const base = "packages/semantic-runtime";
  const file = base + "/src/example.ts";
  mkdirSync(path.join(root, base, "src"), { recursive: true });
  writeFileSync(path.join(root, base, "package.json"), JSON.stringify({ name: "@aurelia-ls/semantic-runtime" }));
  writeFileSync(path.join(root, base, "tsconfig.json"), JSON.stringify({ include: ["src/*.ts"] }));
  writeFileSync(path.join(root, file), `export class Outer {
    direct() { class Inner { nested() {} } return Inner; }
    ${"\n".repeat(100)}
  }`);
  execFileSync("git", ["add", file], { cwd: root });
  writeFileSync(path.join(root, shard("product")), document("records", [{
    ...decision("frontier:outer"), kind: "pressure-frontier",
    anchors: [
      { kind: "source", filePath: file, symbolName: "Outer.direct" },
      { kind: "source", filePath: file, symbolName: "Outer.nested" },
    ],
    liveChecks: [{ kind: "product-large-class", filePath: file, className: "Outer", minLineCount: 500 }],
  }]));
  const api = createInMemoryApi({ sourceProject: createSourceProject({ repoRoot: root, packages: [{
    id: "semantic-runtime", packageName: "@aurelia-ls/semantic-runtime", rootPath: base, tsconfigPath: base + "/tsconfig.json",
  }] }) });
  const answer = await api.ask({ lens: "atlas.memory", locus: { kind: "repo" }, projection: "summary" });
  assert.equal(answer.value.records[0].status, "resolved");
  assert.equal(answer.value.records[0].liveChecks[0].productClass.name, "Outer");
  assert.equal(answer.value.rollup.untrackedProductClassFrontierCount, 0);
  assert.deepEqual(answer.value.issues.map(row => row.id), ["atlas.memory:record:frontier:outer:anchor:1:missing-symbol"]);
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

test("the writer validates drafts and preserves neighboring data and creation date across a move", t => {
  const root = fixture(t);
  const neighbor = { ...decision("neighbor"), metadata: { retained: true } };
  const original = { ...decision("moving"), createdAt: "2020-01-02" };
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
  assert.equal(database.records.find(row => row.record.id === "moving").record.createdAt, original.createdAt);
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
