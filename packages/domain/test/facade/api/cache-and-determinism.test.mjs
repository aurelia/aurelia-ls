import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { DEFAULT_SYNTAX, compileTemplate, getExpressionParser } from "../../../out/index.js";
import { vmStub } from "../../_helpers/facade-harness.mjs";

const defaultParsers = { attrParser: DEFAULT_SYNTAX, exprParser: getExpressionParser() };

function buildCompileOpts(html, templateFilePath, overrides = {}) {
  return {
    html,
    templateFilePath,
    isJs: false,
    vm: vmStub(),
    ...defaultParsers,
    ...overrides,
  };
}

test("stage metadata reports cache keys and flips fromCache after persistence", async () => {
  const cacheDir = await mkdtemp(path.join(os.tmpdir(), "au-facade-cache-"));
  try {
    const opts = buildCompileOpts(`<template>\${msg}</template>`, path.join(cacheDir, "cache.html"), {
      cache: { persist: true, dir: cacheDir },
    });

    const first = compileTemplate(opts);
    const stageKeys = Object.keys(first.meta);
    assert.ok(stageKeys.length > 0, "expected stage metadata to be populated");

    const cacheEntries = await readdir(cacheDir);
    assert.ok(cacheEntries.length > 0, "persisted cache should write artifacts to disk");

    for (const key of stageKeys) {
      const meta = first.meta[key];
      assert.ok(meta, `expected meta for ${key}`);
      assert.equal(meta.fromCache, false);
      assert.ok(meta.cacheKey.length > 0);
      assert.ok(meta.artifactHash.length > 0);
    }

    const second = compileTemplate(opts);
    assert.deepEqual(Object.keys(second.meta).sort(), stageKeys.sort(), "stage metadata keys should remain stable");
    for (const key of stageKeys) {
      const meta = second.meta[key];
      assert.ok(meta, `expected meta for ${key} on cache hit`);
      assert.equal(meta.fromCache, true, `${key} should come from cache on the second compile`);
      assert.equal(meta?.cacheKey, first.meta[key]?.cacheKey);
      assert.equal(meta?.artifactHash, first.meta[key]?.artifactHash);
    }
  } finally {
    await rm(cacheDir, { recursive: true, force: true });
  }
});

test("repeated compiles are deterministic and return fresh snapshots", () => {
  const html = `<template title.bind="user.name">\${user.count}</template>`;
  const templatePath = "C:/mem/facade-deterministic.html";

  const opts = buildCompileOpts(html, templatePath);

  const first = compileTemplate(opts);
  const second = compileTemplate(opts);

  assert.notStrictEqual(first.overlay, second.overlay, "overlay objects should not be reused across compiles");
  assert.notStrictEqual(first.mapping.entries, second.mapping.entries, "mapping arrays should be recreated");
  assert.notStrictEqual(first.exprSpans, second.exprSpans, "expr span maps should be recreated");
  assert.deepEqual(first.overlay.text, second.overlay.text, "overlay text should stay deterministic");
  assert.deepEqual(
    first.mapping.entries.map((entry) => ({
      exprId: entry.exprId,
      htmlSpan: entry.htmlSpan,
      overlaySpan: entry.overlaySpan,
      frameId: entry.frameId,
      segments: entry.segments,
    })),
    second.mapping.entries.map((entry) => ({
      exprId: entry.exprId,
      htmlSpan: entry.htmlSpan,
      overlaySpan: entry.overlaySpan,
      frameId: entry.frameId,
      segments: entry.segments,
    })),
    "mapping entries should stay deterministic",
  );
  assert.deepEqual(
    Array.from(first.exprSpans.entries()),
    Array.from(second.exprSpans.entries()),
    "exprSpans should stay deterministic",
  );
  assert.deepEqual(
    first.overlay.calls.map((c) => ({ exprId: c.exprId, overlayStart: c.overlayStart, overlayEnd: c.overlayEnd })),
    second.overlay.calls.map((c) => ({ exprId: c.exprId, overlayStart: c.overlayStart, overlayEnd: c.overlayEnd })),
    "overlay calls should stay deterministic",
  );
});

test.todo("persisted cache should invalidate when Semantics/VM/grammar change");
