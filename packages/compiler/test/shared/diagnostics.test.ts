import { describe, test, expect } from "vitest";

import { buildDiagnostic, diagnosticSpan } from "../../src/shared/diagnostics.js";
import { authoredOrigin } from "../../src/model/origin.js";

describe("diagnostic utilities", () => {
  test("buildDiagnostic normalizes spans and applies defaults", () => {
    const diag = buildDiagnostic({
      code: "E_TEST",
      message: "Boom",
      source: "resolve-host",
      span: { start: 9, end: 2 },
    });

    expect(diag.severity).toBe("error");
    expect(diag.span).toEqual({ start: 2, end: 9 });
    expect(diag.origin?.kind).toBe("authored");
    expect(diag.origin?.trace?.[0]?.by).toBe("resolve-host");
    expect(diag.origin?.span).toEqual({ start: 2, end: 9 });
  });

  test("buildDiagnostic respects explicit origin when provided", () => {
    const origin = authoredOrigin({ start: 1, end: 3 }, "explicit");
    const diag = buildDiagnostic({
      code: "E_ORIGIN",
      message: "Custom",
      source: "bind",
      origin,
    });

    expect(diag.origin).toBe(origin);
    expect(diag.span).toBeNull();
  });

  test("diagnosticSpan prefers provenance but falls back to span", () => {
    const diag = {
      code: "E_PREF",
      message: "Prefers origin",
      source: "typecheck",
      severity: "warning",
      span: { start: 5, end: 6 },
      origin: { kind: "synthetic", span: { start: 1, end: 4 } },
    };
    expect(diagnosticSpan(diag)).toEqual({ start: 1, end: 4 });

    const fallback = buildDiagnostic({
      code: "E_FALL",
      message: "Fallback",
      source: "resolve-host",
      span: { start: 8, end: 3 },
      origin: { kind: "synthetic", span: null },
    });
    expect(diagnosticSpan(fallback)).toEqual({ start: 3, end: 8 });
  });
});
