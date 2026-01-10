import { describe, test, expect } from "vitest";

import type { CompilerDiagnostic } from "@aurelia-ls/compiler";
import {
  all,
  anyStub,
  collect,
  diag,
  flatMap,
  getStubMarker,
  isStub,
  lookup,
  map,
  pure,
  require as requireValue,
  propagateStub,
  withDiags,
  withStub,
  DiagnosticAccumulator,
} from "../../src/shared/diagnosed.js";

function mkDiag(code = "E_TEST"): CompilerDiagnostic {
  return {
    code,
    message: "test",
    source: "resolve-host",
    severity: "error",
  };
}

describe("diagnosed helpers", () => {
  test("pure/diag/withDiags preserve values and diagnostics", () => {
    const a = pure(1);
    const b = diag(mkDiag("E1"), 2);
    const c = withDiags(3, [mkDiag("E2"), mkDiag("E3")]);

    expect(a).toEqual({ value: 1, diagnostics: [] });
    expect(b.diagnostics.length).toBe(1);
    expect(c.diagnostics.map((d) => d.code)).toEqual(["E2", "E3"]);
  });

  test("map/flatMap merge diagnostics", () => {
    const base = diag(mkDiag("E1"), 1);
    const mapped = map(base, (v) => v + 1);
    const chained = flatMap(mapped, (v) => diag(mkDiag("E2"), v * 2));

    expect(mapped.value).toBe(2);
    expect(mapped.diagnostics.length).toBe(1);
    expect(chained.value).toBe(4);
    expect(chained.diagnostics.map((d) => d.code)).toEqual(["E1", "E2"]);
  });

  test("all/collect aggregate values and diagnostics", () => {
    const combined = all([pure("a"), diag(mkDiag("E1"), "b")]);
    expect(combined.value).toEqual(["a", "b"]);
    expect(combined.diagnostics.map((d) => d.code)).toEqual(["E1"]);

    const collected = collect([1, 2], (v) => diag(mkDiag(`E${v}`), v * 2));
    expect(collected.value).toEqual([2, 4]);
    expect(collected.diagnostics.map((d) => d.code)).toEqual(["E1", "E2"]);
  });

  test("require/lookup attach stub markers for object fallbacks", () => {
    const fallback = { name: "fallback" };
    const req = requireValue(null, fallback, () => mkDiag("REQ"));
    expect(req.diagnostics.length).toBe(1);
    expect(isStub(req.value)).toBe(true);
    expect(getStubMarker(req.value)?.diagnostic.code).toBe("REQ");

    const mapSource = new Map<string, typeof fallback>();
    const found = lookup(mapSource, "missing", fallback, () => mkDiag("LOOK"));
    expect(isStub(found.value)).toBe(true);
    expect(getStubMarker(found.value)?.diagnostic.code).toBe("LOOK");
  });

  test("require/lookup keep primitives unbranded", () => {
    const req = requireValue(null, 123, () => mkDiag("REQ"));
    expect(req.value).toBe(123);
    expect(isStub(req.value)).toBe(false);

    const rec = lookup({ a: 1 }, "b", 42, () => mkDiag("LOOK"));
    expect(rec.value).toBe(42);
    expect(isStub(rec.value)).toBe(false);
  });

  test("propagateStub short-circuits and anyStub detects stubs", () => {
    const stubbed = withStub({ ok: false }, { diagnostic: mkDiag("STUB") });
    const propagated = propagateStub(stubbed, () => ({ ok: true }));

    expect(propagated?.value).toBeDefined();
    expect(isStub(propagated?.value)).toBe(true);
    expect(anyStub("x", stubbed, 123)).toBe(true);
  });

  test("DiagnosticAccumulator collects diagnostics imperatively", () => {
    const acc = new DiagnosticAccumulator();
    acc.push(mkDiag("E1"));
    acc.pushAll([mkDiag("E2")]);
    const merged = acc.merge(diag(mkDiag("E3"), "ok"));

    expect(merged).toBe("ok");
    expect(acc.diagnostics.map((d) => d.code)).toEqual(["E1", "E2", "E3"]);

    const wrapped = acc.wrap(10);
    expect(wrapped.value).toBe(10);
    expect(wrapped.diagnostics.length).toBe(3);
  });
});
