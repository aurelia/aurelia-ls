import { spawnSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, symlink, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, test } from "vitest";
import {
  LaneDetectionError,
  discoverLaneDetectionPlan,
  executeLaneDetectionPlan,
  laneDetectionChildArguments,
  laneDetectionConcurrency,
  laneDetectionFailureOutputLimit,
  laneDetectionPlanReceipt,
  parseLaneDetectionArguments,
} from "../scripts/detect-lanes.mjs";

const temporaryRoots: string[] = [];
const spawnedProcessRoots: number[] = [];

afterEach(async () => {
  for (const pid of spawnedProcessRoots.splice(0)) terminateTestProcessTree(pid);
  await Promise.all(temporaryRoots.splice(0).map(async (root) => {
    await rm(root, { recursive: true, force: true });
  }));
});

describe("aggregate lane detection", () => {
  test("discovers one exact deterministic pair for every declared lane and snapshot", async () => {
    const fixture = await createFixture({
      alpha: {
        hover: [probe("hover-one"), probe("hover-two")],
        rename: [probe("rename-one")],
      },
      beta: {
        diagnostics: [probe("diagnostics-one")],
      },
    });

    const plan = await discoverLaneDetectionPlan(fixture);
    expect(plan).toMatchObject({
      concurrency: 2,
      probeFiles: 2,
      probes: 4,
      probeSourceFiles: 2,
      snapshots: 3,
      lanes: { diagnostics: 1, hover: 1, rename: 1 },
    });
    expect(plan.runs.map((run: { pairKey: string }) => run.pairKey)).toEqual([
      "alpha/hover",
      "alpha/rename",
      "beta/diagnostics",
    ]);
    expect(laneDetectionPlanReceipt(plan)).toMatchObject({
      pairs: 3,
      probes: 4,
      probeSourceFiles: 2,
      runs: [
        { fixture: "alpha", lane: "hover", probes: 2 },
        { fixture: "alpha", lane: "rename", probes: 1 },
        { fixture: "beta", lane: "diagnostics", probes: 1 },
      ],
    });
    expect(laneDetectionChildArguments(plan, plan.runs[0])).toEqual([
      fixture.runnerPath,
      "--fixture",
      join(fixture.probeRoot, "alpha.probes.json"),
      "--lane",
      "hover",
    ]);
  });

  test("keeps the aggregate detector filesystem-read-only and the child argv exact", async () => {
    const source = await readFile(new URL("../scripts/detect-lanes.mjs", import.meta.url), "utf8");
    expect(source).toContain('import { lstat, readFile, readdir, realpath } from "node:fs/promises";');
    expect(source).not.toMatch(/\b(?:appendFile|cp|mkdir|rename|rm|unlink|writeFile)(?:Sync)?\b/u);

    const plan = executionPlan(1, {
      runnerPath: "C:/repo/packages/lane-harness/scripts/run-lane.mjs",
      probeFile: "C:/repo/packages/lane-harness/probes/fixture-0.probes.json",
    });
    expect(laneDetectionChildArguments(plan, plan.runs[0])).toEqual([
      "C:/repo/packages/lane-harness/scripts/run-lane.mjs",
      "--fixture",
      "C:/repo/packages/lane-harness/probes/fixture-0.probes.json",
      "--lane",
      "hover",
    ]);
  });

  test("authenticates every unique probe file across lexical, file-kind, and realpath boundaries", async (context) => {
    const escaped = await createFixture({
      alpha: { hover: [{ ...probe("escape"), file: "../outside.html" }] },
    });
    await expect(discoverLaneDetectionPlan(escaped)).rejects.toThrow(/escapes its fixture lexically/u);

    const directory = await createFixture({
      alpha: { hover: [{ ...probe("directory"), file: "src" }] },
    });
    await expect(discoverLaneDetectionPlan(directory)).rejects.toThrow(/probe file .* must be a regular file/su);

    const linked = await createFixture({
      alpha: { hover: [{ ...probe("linked"), file: "src/linked/app.html" }] },
    });
    const fixtureRoot = join(linked.repoRoot, "fixtures", "alpha");
    const realDirectory = join(fixtureRoot, "src", "real");
    const linkedDirectory = join(fixtureRoot, "src", "linked");
    await mkdir(realDirectory, { recursive: true });
    await writeFile(join(realDirectory, "app.html"), "<template>${linked}</template>\n");
    try {
      await symlink(
        realDirectory,
        linkedDirectory,
        process.platform === "win32" ? "junction" : "dir",
      );
    } catch (error) {
      if (errorCode(error) === "EPERM" || errorCode(error) === "EACCES") {
        context.skip();
        return;
      }
      throw error;
    }
    await expect(discoverLaneDetectionPlan(linked)).rejects.toThrow(/must not traverse a symbolic link/u);
  });

  test("fails integrity on missing, orphaned, unsupported, and unreviewed probe evidence", async () => {
    const missing = await createFixture({ alpha: { hover: [probe("one")] } });
    await unlink(join(missing.snapshotRoot, "alpha", "hover.snap.md"));
    await expect(discoverLaneDetectionPlan(missing)).rejects.toThrow(/Missing snapshot.*alpha\/hover\.snap\.md/su);

    const orphaned = await createFixture({ alpha: { hover: [probe("one")] } });
    await mkdir(join(orphaned.snapshotRoot, "orphan"), { recursive: true });
    await writeFile(join(orphaned.snapshotRoot, "orphan", "hover.snap.md"), "orphan\n");
    await expect(discoverLaneDetectionPlan(orphaned)).rejects.toThrow(/Orphan snapshot.*orphan\/hover\.snap\.md/su);

    const unsupported = await createFixture({ alpha: { typoLane: [probe("one")] } });
    await expect(discoverLaneDetectionPlan(unsupported)).rejects.toThrow(/unsupported lane "typoLane"/u);

    const missingVerdict = await createFixture({
      alpha: { hover: [{ id: "one", file: "src/app.html", anchor: "title" }] },
    });
    await expect(discoverLaneDetectionPlan(missingVerdict)).rejects.toThrow(
      /verdict must be exactly "correct".*received undefined/su,
    );

    const wrongVerdict = await createFixture({
      alpha: { hover: [{ ...probe("one"), verdict: "wrong" }] },
    });
    await expect(discoverLaneDetectionPlan(wrongVerdict)).rejects.toThrow(
      /verdict must be exactly "correct".*received "wrong"/su,
    );

    const duplicate = await createFixture({ alpha: { hover: [probe("same"), probe("same")] } });
    await expect(discoverLaneDetectionPlan(duplicate)).rejects.toThrow(/repeats probe id "same"/u);
  });

  test("rejects two independently named sidecars that own the same fixture and lane", async () => {
    const fixture = await createFixture({ alpha: { hover: [probe("first")] } });
    await writeFile(join(fixture.probeRoot, "z-alpha-alias.probes.json"), JSON.stringify({
      fixture: "fixtures/alpha",
      lanes: { hover: [probe("second")] },
    }));

    await expect(discoverLaneDetectionPlan(fixture)).rejects.toThrow(
      /alpha\/hover is owned by both alpha\.probes\.json and z-alpha-alias\.probes\.json/u,
    );
  });

  test("accepts only plan/help arguments and rejects every update path", () => {
    expect(parseLaneDetectionArguments(["--plan"])).toEqual({ planOnly: true, help: false });
    expect(parseLaneDetectionArguments(["--help"])).toEqual({ planOnly: false, help: true });
    for (const argument of ["--update", "-u", "--probe=one", "--fixture=alpha"]) {
      expect(() => parseLaneDetectionArguments([argument])).toThrow(/never accepts update or probe-selection/u);
    }
  });

  test("runs at concurrency two and stops scheduling after bounded failure output", async () => {
    let active = 0;
    let maximumActive = 0;
    const successfulPlan = executionPlan(6);
    const summary = await executeLaneDetectionPlan(successfulPlan, {
      logger: quietLogger,
      executePair: async () => {
        active += 1;
        maximumActive = Math.max(maximumActive, active);
        await new Promise((resolve) => setTimeout(resolve, 5));
        active -= 1;
        return { exitCode: 0, output: "matched" };
      },
    });
    expect(summary).toEqual({ passed: 6, pairs: 6, probes: 6 });
    expect(maximumActive).toBe(laneDetectionConcurrency);

    const started: string[] = [];
    const failingPlan = executionPlan(5);
    let failure: unknown;
    try {
      await executeLaneDetectionPlan(failingPlan, {
        logger: quietLogger,
        executePair: async (run: { pairKey: string }) => {
          started.push(run.pairKey);
          if (run.pairKey === "fixture-0/hover") {
            return { exitCode: 9, output: "x".repeat(laneDetectionFailureOutputLimit * 3) };
          }
          await new Promise((resolve) => setTimeout(resolve, 10));
          return { exitCode: 0, output: "matched" };
        },
      });
    } catch (error) {
      failure = error;
    }
    expect(failure).toBeInstanceOf(LaneDetectionError);
    expect(String(failure)).toContain("earlier character(s) omitted");
    expect(String(failure).length).toBeLessThan(laneDetectionFailureOutputLimit + 1000);
    expect(started).toEqual(["fixture-0/hover", "fixture-1/hover"]);
  });

  test("bounds a never-settling pair with the fixed watchdog", async () => {
    const started = performance.now();
    let failure: unknown;
    try {
      await executeLaneDetectionPlan(executionPlan(1), {
        logger: quietLogger,
        pairTimeoutMs: 25,
        cleanupWaitMs: 25,
        executePair: async () => await new Promise(() => {}),
      });
    } catch (error) {
      failure = error;
    }
    expect(failure).toBeInstanceOf(LaneDetectionError);
    expect(String(failure)).toMatch(/timed out after 25ms.*cleanup did not settle within 25ms/su);
    expect(performance.now() - started).toBeLessThan(500);
  });

  test("terminates a timed-out real runner process tree before returning", async () => {
    const root = await mkdtemp(join(tmpdir(), "aurelia-lane-watchdog-"));
    temporaryRoots.push(root);
    const runnerPath = join(root, "runner.mjs");
    await writeFile(runnerPath, [
      'import { spawn } from "node:child_process";',
      'const child = spawn(process.execPath, ["-e", "process.on(\\"SIGTERM\\", () => {}); setInterval(() => {}, 1000)"], { stdio: "ignore" });',
      'process.on("SIGTERM", () => {});',
      'console.log(`runner-pid=${process.pid} child-pid=${child.pid}`);',
      'setInterval(() => {}, 1000);',
    ].join("\n"));
    const plan = executionPlan(1, { runnerPath, repoRoot: root });
    let failure: LaneDetectionError | null = null;
    try {
      await executeLaneDetectionPlan(plan, {
        logger: quietLogger,
        pairTimeoutMs: 1_000,
        cleanupWaitMs: 2_000,
        terminationGraceMs: 100,
        forceKillWaitMs: 500,
      });
    } catch (error) {
      failure = error as LaneDetectionError;
    }
    expect(failure).toBeInstanceOf(LaneDetectionError);
    const output = failure?.failures?.[0]?.output ?? "";
    const pidMatch = /runner-pid=(\d+) child-pid=(\d+)/u.exec(output);
    expect(pidMatch).not.toBeNull();
    const runnerPid = Number(pidMatch?.[1]);
    const childPid = Number(pidMatch?.[2]);
    spawnedProcessRoots.push(runnerPid, childPid);
    expect(await waitUntilProcessDead(runnerPid)).toBe(true);
    expect(await waitUntilProcessDead(childPid)).toBe(true);
  });

  test("does not force-kill a real runner that exits during graceful cleanup", async () => {
    const root = await mkdtemp(join(tmpdir(), "aurelia-lane-graceful-"));
    temporaryRoots.push(root);
    const runnerPath = join(root, "runner.mjs");
    await writeFile(runnerPath, [
      'console.log(`runner-pid=${process.pid}`);',
      'setInterval(() => {}, 1000);',
    ].join("\n"));
    const requests: boolean[] = [];
    let failure: LaneDetectionError | null = null;
    try {
      await executeLaneDetectionPlan(executionPlan(1, { runnerPath, repoRoot: root }), {
        logger: quietLogger,
        pairTimeoutMs: 1_000,
        cleanupWaitMs: 2_000,
        terminationGraceMs: 500,
        forceKillWaitMs: 500,
        requestProcessTreeTermination: async (pid: number, force: boolean) => {
          requests.push(force);
          process.kill(process.platform === "win32" ? pid : -pid, force ? "SIGKILL" : "SIGTERM");
        },
      });
    } catch (error) {
      failure = error as LaneDetectionError;
    }
    expect(failure).toBeInstanceOf(LaneDetectionError);
    expect(requests).toEqual([false]);
    const output = failure?.failures?.[0]?.output ?? "";
    const pid = Number(/runner-pid=(\d+)/u.exec(output)?.[1]);
    spawnedProcessRoots.push(pid);
    expect(await waitUntilProcessDead(pid)).toBe(true);
  });
});

function probe(id: string): Record<string, string> {
  return { id, file: "src/app.html", anchor: "title", verdict: "correct" };
}

async function createFixture(
  fixtures: Readonly<Record<string, Readonly<Record<string, readonly Record<string, string>[]>>>>,
) {
  const repoRoot = await mkdtemp(join(tmpdir(), "aurelia-lane-detect-"));
  temporaryRoots.push(repoRoot);
  const packageRoot = join(repoRoot, "packages", "lane-harness");
  const probeRoot = join(packageRoot, "probes");
  const snapshotRoot = join(packageRoot, "snapshots");
  const runnerPath = join(packageRoot, "scripts", "run-lane.mjs");
  await mkdir(join(packageRoot, "scripts"), { recursive: true });
  await mkdir(probeRoot, { recursive: true });
  await mkdir(snapshotRoot, { recursive: true });
  await writeFile(runnerPath, "// synthetic lane runner\n");

  for (const [fixtureName, lanes] of Object.entries(fixtures)) {
    const fixtureRoot = join(repoRoot, "fixtures", fixtureName);
    await mkdir(join(fixtureRoot, "src"), { recursive: true });
    await writeFile(join(fixtureRoot, "src", "app.html"), "<template>${title}</template>\n");
    await writeFile(join(probeRoot, `${fixtureName}.probes.json`), JSON.stringify({
      fixture: `fixtures/${fixtureName}`,
      lanes,
    }));
    for (const lane of Object.keys(lanes)) {
      const snapshotDirectory = join(snapshotRoot, fixtureName);
      await mkdir(snapshotDirectory, { recursive: true });
      await writeFile(join(snapshotDirectory, `${lane}.snap.md`), `${fixtureName}/${lane}\n`);
    }
  }
  return { repoRoot, packageRoot, probeRoot, snapshotRoot, runnerPath };
}

function executionPlan(
  count: number,
  options: {
    readonly runnerPath?: string;
    readonly probeFile?: string;
    readonly repoRoot?: string;
  } = {},
) {
  return {
    concurrency: laneDetectionConcurrency,
    probes: count,
    repoRoot: options.repoRoot ?? "C:/synthetic-repo",
    runnerPath: options.runnerPath ?? "synthetic-runner.mjs",
    runs: Array.from({ length: count }, (_, index) => ({
      pairKey: `fixture-${index}/hover`,
      fixtureName: `fixture-${index}`,
      lane: "hover",
      probeCount: 1,
      probeFile: options.probeFile ?? `fixture-${index}.probes.json`,
    })),
  };
}

const quietLogger = {
  log() {},
  error() {},
};

function errorCode(error: unknown): string | null {
  return error != null && typeof error === "object" && "code" in error
    ? String((error as { readonly code?: unknown }).code ?? "")
    : null;
}

async function waitUntilProcessDead(pid: number): Promise<boolean> {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    if (!processIsAlive(pid)) return true;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  return !processIsAlive(pid);
}

function processIsAlive(pid: number): boolean {
  if (!Number.isSafeInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return errorCode(error) === "EPERM";
  }
}

function terminateTestProcessTree(pid: number): void {
  if (!processIsAlive(pid)) return;
  if (process.platform === "win32") {
    spawnSync("taskkill.exe", ["/PID", String(pid), "/T", "/F"], {
      stdio: "ignore",
      windowsHide: true,
    });
    return;
  }
  try {
    process.kill(-pid, "SIGKILL");
  } catch {
    try {
      process.kill(pid, "SIGKILL");
    } catch {
      // The test-owned process already exited.
    }
  }
}
