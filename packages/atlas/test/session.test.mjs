import assert from "node:assert/strict";
import { access, mkdir, mkdtemp, readFile, realpath, rename, rm, stat, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { setTimeout as delay } from "node:timers/promises";
import { createApi } from "../dist/session/api.js";

async function put(root, file, contents) {
  const dest = path.join(root, file);
  await mkdir(path.dirname(dest), { recursive: true });
  await writeFile(dest, typeof contents === "string" ? contents : JSON.stringify(contents));
  return dest;
}

async function sessionFixture(t) {
  const root = await mkdtemp(path.join(tmpdir(), "atlas-session-"));
  const packageRoot = path.join(root, "packages/atlas");
  const apis = [];
  t.after(async () => {
    await Promise.allSettled(apis.map((api) => api.shutdown()));
    assert.equal(path.dirname(await realpath(root)), await realpath(tmpdir()));
    await rm(root, { recursive: true, force: true, maxRetries: 8, retryDelay: 100 });
  });
  const api = (options = {}) => {
    const handle = createApi({ packageRoot, idleTtlMs: 60_000, ...options });
    apis.push(handle);
    return handle;
  };
  const configure = (strictNullChecks) => put(root, "base.json", { compilerOptions: { strictNullChecks } });
  await configure(false);
  for (const name of ["atlas", "patterns", "mcp", "semantic-runtime"]) {
    await put(root, `packages/${name}/package.json`, { name: `@aurelia-ls/${name}`, type: "module" });
    await put(root, `packages/${name}/tsconfig.json`, { extends: "../../base.json", include: ["src"], compilerOptions: { types: [] } });
    await put(root, `packages/${name}/src/owner.ts`, "export const before = true;\n");
  }
  const daemon = new URL("../dist/session/daemon.js", import.meta.url);
  await put(root, "packages/atlas/dist/session/daemon.js", `import ${JSON.stringify(daemon.href)};\n`);
  return { root, api, configure, daemon };
}

async function waitFor(check, description) {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    if (await check()) return;
    await delay(30);
  }
  assert.fail(description);
}

test("new sessions select current source, compiler settings and module resolution while existing reads stay pinned", async (t) => {
  const { root, api, configure } = await sessionFixture(t);
  const filePath = "packages/semantic-runtime/src/owner.ts";
  const depPath = "packages/semantic-runtime/imported.ts";
  const optionalPath = "packages/semantic-runtime/optional.ts";
  await put(root, "packages/semantic-runtime/src/importer.ts", "export * from '../imported.js'; export * from '../optional.js';");
  await put(root, depPath, "export const dependency = 1;");
  const source = path.join(root, filePath);
  const fixedTime = new Date(1660000000000);
  await utimes(source, fixedTime, fixedTime);
  const slice = async (handle, file) => {
    const answer = await handle.ask({ lens: "ts.source", projection: "text", locus: { kind: "source-file", filePath: file } });
    assert.equal(answer.outcome, "hit");
    return answer.value.slices[0];
  };
  const read = async (handle) => (await slice(handle, filePath)).text;

  const old = api();
  assert.equal((await old.shutdown()).accepted, false);
  await assert.rejects(access(path.join(root, ".temp/atlas/session")), { code: "ENOENT" });
  const before = await old.status();
  assert.equal((await api().status()).pid, before.pid);
  assert.equal(await read(old), "export const before = true;\n");

  await writeFile(source, "export const edited = true;\n");
  await utimes(source, fixedTime, fixedTime);
  const changed = api();
  const after = await changed.status();
  assert.notEqual(after.buildHash, before.buildHash);
  assert.equal(await read(changed), "export const edited = true;\n");
  assert.equal(await read(old), "export const before = true;\n");

  assert.equal((await old.shutdown()).accepted, true);
  // Wait for the protocol shutdown to release the lease before exercising reconnect.
  for (let n = 0; n < 100; n++) {
    try {
      process.kill(before.pid, 0);
    } catch (error) {
      if (error.code === "ESRCH") break;
      throw error;
    }
    await delay(30);
  }
  await assert.rejects(old.status(), /pinned Atlas session ended/);

  await configure(true);
  const configured = api();
  const configStatus = await configured.status();
  assert.notEqual(configStatus.buildHash, after.buildHash);

  assert.equal((await slice(configured, depPath)).programBacked, true);
  await put(root, depPath, "export const dependency = 2;");
  const updated = api();
  const updatedStatus = await updated.status();
  assert.notEqual(updatedStatus.pid, configStatus.pid);
  assert.equal((await slice(updated, depPath)).text, "export const dependency = 2;");
  await assert.rejects(configured.status(), /pinned Atlas session ended/);
  assert.equal((await configured.shutdown()).accepted, false);

  // A previously failed TypeScript module lookup reverses while the tsconfig root set stays fixed.
  await put(root, optionalPath, "export const available = true;");
  const resolved = api();
  assert.notEqual((await resolved.status()).pid, updatedStatus.pid);
  assert.equal((await slice(resolved, optionalPath)).programBacked, true);
  await put(root, "unrelated.txt", "no change to Program inputs");
  assert.equal((await api().status()).pid, (await resolved.status()).pid);
});

test("a deferred heartbeat preserves the lease, recovers, and respects ownership transfer", async (t) => {
  const { root, api, daemon } = await sessionFixture(t);
  const manifestPath = path.join(root, "active.json");
  const hold = path.join(root, "hold-rename");
  const attempts = await put(root, "blocked-attempts", "");
  // Inject the Windows sharing violation in the daemon only, at the actual atomic replacement.
  await put(root, "packages/atlas/dist/session/daemon.js", `
    import fs from "node:fs";
    import { syncBuiltinESMExports } from "node:module";
    const rename = fs.renameSync;
    fs.renameSync = (source, target) => {
      if (target === ${JSON.stringify(manifestPath)} && fs.existsSync(${JSON.stringify(hold)})) {
        fs.appendFileSync(${JSON.stringify(attempts)}, "x");
        throw Object.assign(new Error("fixture denied manifest replacement"), { code: "EPERM" });
      }
      return rename(source, target);
    };
    syncBuiltinESMExports();
    await import(${JSON.stringify(daemon.href)});
  `);
  const options = { manifestPath, heartbeatIntervalMs: 60 };
  const live = api(options);
  const { pid } = await live.status();
  const lease = async () => JSON.parse(await readFile(manifestPath, "utf8"));
  const log = () => readFile(`${manifestPath}.stderr.log`, "utf8");
  await writeFile(hold, "");
  await waitFor(async () => (await stat(attempts)).size >= 2, "daemon should retry a blocked heartbeat");
  const retained = await lease();
  assert.equal(retained.pid, pid);
  assert.equal((await live.status()).pid, pid);
  assert.equal((await api(options).status()).pid, pid);
  assert.deepEqual(await lease(), retained);
  assert.match(await log(), /deferred.*heartbeat.*EPERM/);

  await rm(hold);
  await waitFor(async () => (await lease()).heartbeatAt !== retained.heartbeatAt, "heartbeat should resume");
  assert.equal((await lease()).startedAt, retained.startedAt);
  await waitFor(async () => (await log()).includes("published its heartbeat after"), "daemon should report recovery");

  await writeFile(hold, "");
  const priorAttempts = (await stat(attempts)).size;
  await waitFor(async () => (await stat(attempts)).size > priorAttempts, "second interrupted heartbeat");
  const replacement = { ...retained, pid: process.pid, startedAt: new Date().toISOString() };
  await writeFile(`${manifestPath}.next`, JSON.stringify(replacement));
  await rename(`${manifestPath}.next`, manifestPath);
  await waitFor(async () => (await log()).includes("session manifest lease transferred"), "old daemon should relinquish the lease");
  await rm(hold);
  assert.deepEqual(await lease(), replacement);
  assert.equal((await live.shutdown()).accepted, false);
});
