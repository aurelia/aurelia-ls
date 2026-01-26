import { describe, test, expect } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { DEFAULT_SEMANTICS, buildProjectSnapshot } from "@aurelia-ls/compiler";
import {
  PipelineEngine,
  type StageDefinition,
  type StageKey,
  type StageOutputs,
} from "../../src/pipeline/engine.js";

function withTempDir<T>(fn: (dir: string) => T): T {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "aurelia-pipeline-"));
  try {
    return fn(dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function createStages(
  runs: { lower: number; resolve: number },
  capture?: { depMeta?: unknown },
  version: string = "1"
): StageDefinition<StageKey>[] {
  const lower: StageDefinition<"10-lower"> = {
    key: "10-lower",
    version,
    deps: [],
    fingerprint: (ctx) => ({ html: ctx.options.html }),
    run: (ctx) => {
      runs.lower += 1;
      return { kind: "lower", html: ctx.options.html } as unknown as StageOutputs["10-lower"];
    },
  };

  const resolve: StageDefinition<"20-resolve"> = {
    key: "20-resolve",
    version,
    deps: ["10-lower"],
    fingerprint: (ctx) => ({ lower: ctx.require("10-lower") }),
    run: (ctx) => {
      runs.resolve += 1;
      if (capture) capture.depMeta = ctx.meta("10-lower");
      return { kind: "resolve" } as unknown as StageOutputs["20-resolve"];
    },
  };

  return [lower, resolve];
}

function baseOptions(overrides: Partial<Parameters<PipelineEngine["run"]>[1]> = {}) {
  return {
    html: "<div></div>",
    templateFilePath: "/app.html",
    project: buildProjectSnapshot(DEFAULT_SEMANTICS),
    ...overrides,
  };
}

describe("pipeline engine", () => {
  test("memoizes stage outputs within a session", () => {
    const runs = { lower: 0, resolve: 0 };
    const engine = new PipelineEngine(createStages(runs));
    const session = engine.createSession(baseOptions());

    session.run("20-resolve");
    session.run("20-resolve");

    expect(runs.lower).toBe(1);
    expect(runs.resolve).toBe(1);
    expect(session.meta("20-resolve")?.source).toBe("run");
  });

  test("uses seeded artifacts and exposes dep metadata", () => {
    const runs = { lower: 0, resolve: 0 };
    const capture: { depMeta?: unknown } = {};
    const engine = new PipelineEngine(createStages(runs, capture));
    const seedOutput = { kind: "lower", html: "seed" } as unknown as StageOutputs["10-lower"];

    const session = engine.createSession(baseOptions(), { "10-lower": seedOutput });
    session.run("20-resolve");

    expect(runs.lower).toBe(0);
    expect(runs.resolve).toBe(1);
    expect(session.meta("10-lower")?.source).toBe("seed");
    expect(capture.depMeta).toBeDefined();
  });

  test("persists cache across sessions when enabled", () => {
    withTempDir((dir) => {
      const runs = { lower: 0, resolve: 0 };
      const engine = new PipelineEngine(createStages(runs));
      const options = baseOptions({ cache: { enabled: true, persist: true, dir } });

      engine.createSession(options).run("20-resolve");
      expect(runs.lower).toBe(1);
      expect(runs.resolve).toBe(1);

      engine.createSession(options).run("20-resolve");
      expect(runs.lower).toBe(1);
      expect(runs.resolve).toBe(1);
    });
  });

  test("ignores persisted cache when stage version changes", () => {
    withTempDir((dir) => {
      const runs = { lower: 0, resolve: 0 };
      const options = baseOptions({ cache: { enabled: true, persist: true, dir } });

      const engineV1 = new PipelineEngine(createStages(runs, undefined, "1"));
      engineV1.createSession(options).run("20-resolve");
      expect(runs.resolve).toBe(1);

      const engineV2 = new PipelineEngine(createStages(runs, undefined, "2"));
      const sessionV2 = engineV2.createSession(options);
      sessionV2.run("20-resolve");
      expect(runs.resolve).toBe(2);
      expect(sessionV2.meta("20-resolve")?.source).toBe("run");
    });
  });

  test("disables persistence when cache.enabled is false", () => {
    withTempDir((dir) => {
      const runs = { lower: 0, resolve: 0 };
      const engine = new PipelineEngine(createStages(runs));
      const options = baseOptions({ cache: { enabled: false, persist: true, dir } });

      engine.createSession(options).run("20-resolve");
      expect(fs.readdirSync(dir).length).toBe(0);
    });
  });

  test("cache keys change when inputs change", () => {
    const runs = { lower: 0, resolve: 0 };
    const engine = new PipelineEngine(createStages(runs));

    const sessionA = engine.createSession(baseOptions({ html: "<div>a</div>" }));
    sessionA.run("20-resolve");
    const keyA = sessionA.meta("20-resolve")?.cacheKey;

    const sessionB = engine.createSession(baseOptions({ html: "<div>b</div>" }));
    sessionB.run("20-resolve");
    const keyB = sessionB.meta("20-resolve")?.cacheKey;

    expect(keyA).toBeDefined();
    expect(keyB).toBeDefined();
    expect(keyA).not.toBe(keyB);
  });
});
