import { describe, test, expect } from "vitest";

import {
  authoredOrigin,
  syntheticOrigin,
  inferredOrigin,
  provenanceSpan,
  authoredProvenance,
  syntheticProvenance,
  inferredProvenance,
  preferOrigin,
  appendTrace,
  originFromSpan,
  provenanceFromSpan,
} from "../../src/model/origin.js";

describe("origin helpers", () => {
  test("origin builders attach kind, span, and description", () => {
    const span = { start: 1, end: 4 };
    const authored = authoredOrigin(span, "authored");
    const synthetic = syntheticOrigin("synthetic", span, authored);
    const inferred = inferredOrigin("inferred", null, synthetic);

    expect(authored).toEqual({ kind: "authored", span, description: "authored" });
    expect(synthetic.kind).toBe("synthetic");
    expect(synthetic.derivedFrom).toBe(authored);
    expect(inferred.kind).toBe("inferred");
    expect(inferred.span).toBeNull();
  });

  test("provenanceSpan prefers origin span, then fallback span", () => {
    const origin = authoredOrigin({ start: 2, end: 5 });
    const fallback = { start: 10, end: 12 };

    expect(provenanceSpan(origin)).toEqual({ start: 2, end: 5 });
    expect(provenanceSpan({ origin, fallbackSpan: fallback })).toEqual({ start: 2, end: 5 });
    expect(provenanceSpan({ origin: null, fallbackSpan: fallback })).toEqual(fallback);
    expect(provenanceSpan(null)).toBeNull();
  });

  test("provenance builders wrap origin + fallback span", () => {
    const span = { start: 3, end: 7 };
    const authored = authoredProvenance(span, "auth");
    const synthetic = syntheticProvenance("syn", span);
    const inferred = inferredProvenance("inf", null);

    expect(authored.origin?.kind).toBe("authored");
    expect(authored.fallbackSpan).toEqual(span);
    expect(synthetic.origin?.kind).toBe("synthetic");
    expect(inferred.origin?.kind).toBe("inferred");
    expect(inferred.fallbackSpan).toBeNull();
  });

  test("preferOrigin, appendTrace, and originFromSpan", () => {
    const span = { start: 1, end: 2 };
    const base = authoredOrigin(span);
    const next = syntheticOrigin("next");

    expect(preferOrigin(null, next)).toBe(next);
    expect(preferOrigin(base, next)).toBe(base);

    const traced = appendTrace(base, { by: "stage-1", span });
    expect(traced.trace?.length).toBe(1);

    const withTrace = originFromSpan("stage-2", span, "desc");
    expect(withTrace.trace?.[0]?.by).toBe("stage-2");
    expect(withTrace.description).toBe("desc");
  });

  test("provenanceFromSpan attaches origin trace and fallback", () => {
    const span = { start: 4, end: 9 };
    const prov = provenanceFromSpan("stage-3", span);
    expect(prov.fallbackSpan).toEqual(span);
    expect(prov.origin?.trace?.[0]?.by).toBe("stage-3");
  });
});
