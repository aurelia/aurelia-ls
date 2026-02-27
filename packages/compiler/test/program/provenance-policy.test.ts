import { describe, expect, test } from "vitest";
import type { SourceSpan } from "../../out/model/index.js";
import {
  DEFAULT_PROVENANCE_PROJECTION_POLICY,
  projectTemplateOffsetToOverlayWithPolicy,
  projectTemplateSpanToOverlayWithPolicy,
  resolveGeneratedReferenceLocationWithPolicy,
  resolveOverlayDiagnosticLocationWithPolicy,
  resolveRelatedDiagnosticLocationWithPolicy,
  shouldRejectOverlayEditBatch,
} from "../../out/program/overlay-span-policy.js";
import type { OverlaySpanHit } from "../../out/program/overlay-span-index.js";

function makeOverlayHit(): OverlaySpanHit {
  return {
    edge: {
      kind: "overlayExpr",
      from: { uri: "/app/demo.__au.ttc.overlay.ts", span: { start: 10, end: 18 } },
      to: { uri: "/app/demo.html", span: { start: 100, end: 108 } },
    },
  };
}

describe("provenance policy", () => {
  test("template offset projection retries after materialization by default", () => {
    let materialized = false;
    const hit = makeOverlayHit();
    const decision = projectTemplateOffsetToOverlayWithPolicy({
      provenance: {
        projectTemplateOffset() {
          return materialized ? hit : null;
        },
      },
      uri: "/app/demo.html",
      offset: 104,
      materializeOverlay() {
        materialized = true;
      },
    });
    expect(decision.hit).toBe(hit);
    expect(decision.reason).toBe("mapped");
  });

  test("template span projection reports miss-after-materialization when still unmapped", () => {
    const span: SourceSpan = { start: 100, end: 108 };
    const decision = projectTemplateSpanToOverlayWithPolicy({
      provenance: {
        projectTemplateSpan() {
          return null;
        },
      },
      uri: "/app/demo.html",
      span,
      materializeOverlay() {
        // no-op
      },
    });
    expect(decision.hit).toBeNull();
    expect(decision.reason).toBe("provenance-miss-after-materialization");
  });

  test("template projection can skip materialization when policy disables retry", () => {
    let materialized = false;
    const decision = projectTemplateOffsetToOverlayWithPolicy({
      provenance: {
        projectTemplateOffset() {
          return null;
        },
      },
      uri: "/app/demo.html",
      offset: 104,
      materializeOverlay() {
        materialized = true;
      },
      policy: {
        ...DEFAULT_PROVENANCE_PROJECTION_POLICY,
        templateToOverlay: { materializeOnMiss: false },
      },
    });
    expect(decision.hit).toBeNull();
    expect(decision.reason).toBe("provenance-miss");
    expect(materialized).toBe(false);
  });

  test("template projection reports materialization failures", () => {
    const span: SourceSpan = { start: 100, end: 108 };
    const decision = projectTemplateSpanToOverlayWithPolicy({
      provenance: {
        projectTemplateSpan() {
          return null;
        },
      },
      uri: "/app/demo.html",
      span,
      materializeOverlay() {
        throw new Error("boom");
      },
    });
    expect(decision.hit).toBeNull();
    expect(decision.reason).toBe("overlay-materialization-failed");
  });

  test("diagnostic location falls back to template URI by default when mapping misses", () => {
    const decision = resolveOverlayDiagnosticLocationWithPolicy({
      overlaySpan: { start: 0, end: 0 },
      mappedLocation: null,
      templateUri: "/app/demo.html",
    });
    expect(decision.reason).toBe("overlay-template-fallback");
    expect(decision.location?.uri).toBe("/app/demo.html");
  });

  test("diagnostic location can stay missing under strict policy", () => {
    const decision = resolveOverlayDiagnosticLocationWithPolicy({
      overlaySpan: { start: 0, end: 0 },
      mappedLocation: null,
      templateUri: "/app/demo.html",
      policy: {
        ...DEFAULT_PROVENANCE_PROJECTION_POLICY,
        diagnostics: { overlayUnmappedLocation: "missing-location" },
      },
    });
    expect(decision.reason).toBe("missing-location");
    expect(decision.location).toBeNull();
  });

  test("related overlay diagnostics use template fallback, non-overlay pass through", () => {
    const relSpan: SourceSpan = { start: 3, end: 7 };
    const overlayRelated = resolveRelatedDiagnosticLocationWithPolicy({
      relUri: "/app/demo.__au.ttc.overlay.ts",
      relSpan,
      mappedLocation: null,
      overlayUri: "/app/demo.__au.ttc.overlay.ts",
      templateUri: "/app/demo.html",
      policy: DEFAULT_PROVENANCE_PROJECTION_POLICY,
    });
    expect(overlayRelated.reason).toBe("overlay-template-fallback");
    expect(overlayRelated.location?.uri).toBe("/app/demo.html");

    const nonOverlayRelated = resolveRelatedDiagnosticLocationWithPolicy({
      relUri: "/app/demo.ts",
      relSpan,
      mappedLocation: null,
      overlayUri: "/app/demo.__au.ttc.overlay.ts",
      templateUri: "/app/demo.html",
      policy: DEFAULT_PROVENANCE_PROJECTION_POLICY,
    });
    expect(nonOverlayRelated.reason).toBe("passthrough-related-location");
    expect(nonOverlayRelated.location?.uri).toBe("/app/demo.ts");
  });

  test("related diagnostics canonicalize passthrough URIs", () => {
    const relSpan: SourceSpan = { start: 3, end: 7 };
    const decision = resolveRelatedDiagnosticLocationWithPolicy({
      relUri: "C:\\APP\\FEATURE.TS",
      relSpan,
      mappedLocation: null,
      overlayUri: "/app/demo.__au.ttc.overlay.ts",
      templateUri: "/app/demo.html",
      policy: DEFAULT_PROVENANCE_PROJECTION_POLICY,
    });
    expect(decision.reason).toBe("passthrough-related-location");
    expect(decision.location?.uri).toBe("c:/app/feature.ts");
  });

  test("related overlay diagnostics can use explicit generated->template mapping", () => {
    const relSpan: SourceSpan = { start: 10, end: 12 };
    const decision = resolveRelatedDiagnosticLocationWithPolicy({
      relUri: "/app/other.__au.ttc.overlay.ts",
      relSpan,
      mappedLocation: null,
      overlayUri: "/app/demo.__au.ttc.overlay.ts",
      templateUri: "/app/demo.html",
      relatedTemplateUri: "/app/other.html",
      policy: DEFAULT_PROVENANCE_PROJECTION_POLICY,
    });
    expect(decision.reason).toBe("overlay-template-fallback");
    expect(decision.location?.uri).toBe("/app/other.html");
  });

  test("related overlay diagnostics can remain missing under strict policy", () => {
    const relSpan: SourceSpan = { start: 10, end: 12 };
    const decision = resolveRelatedDiagnosticLocationWithPolicy({
      relUri: "/app/other.__au.ttc.overlay.ts",
      relSpan,
      mappedLocation: null,
      overlayUri: "/app/demo.__au.ttc.overlay.ts",
      templateUri: "/app/demo.html",
      relatedTemplateUri: "/app/other.html",
      policy: {
        ...DEFAULT_PROVENANCE_PROJECTION_POLICY,
        diagnostics: { overlayUnmappedLocation: "missing-location" },
      },
    });
    expect(decision.reason).toBe("missing-location");
    expect(decision.location).toBeNull();
  });

  test("overlay edit batch stays all-or-nothing by default", () => {
    const reject = shouldRejectOverlayEditBatch(
      {
        requireOverlayMapping: true,
        overlayEdits: 2,
        mappedOverlayEdits: 1,
        unmappedOverlayEdits: 1,
      },
      DEFAULT_PROVENANCE_PROJECTION_POLICY,
    );
    expect(reject).toBe(true);
  });

  test("generated references drop unmapped overlay locations by default", () => {
    const decision = resolveGeneratedReferenceLocationWithPolicy({
      generatedUri: "/app/demo.__au.ttc.overlay.ts",
      generatedSpan: { start: 5, end: 7 },
      mappedLocation: null,
      provenance: {
        getTemplateUriForGenerated: () => "/app/demo.html",
      },
    });
    expect(decision.reason).toBe("overlay-unmapped-drop");
    expect(decision.location).toBeNull();
  });

  test("generated references pass through non-overlay locations when unmapped", () => {
    const decision = resolveGeneratedReferenceLocationWithPolicy({
      generatedUri: "/app/demo.ts",
      generatedSpan: { start: 20, end: 24 },
      mappedLocation: null,
      provenance: {
        getTemplateUriForGenerated: () => null,
      },
    });
    expect(decision.reason).toBe("passthrough-generated-location");
    expect(decision.location?.uri).toBe("/app/demo.ts");
  });

  test("generated references can fallback to template URI when configured", () => {
    const decision = resolveGeneratedReferenceLocationWithPolicy({
      generatedUri: "/app/demo.__au.ttc.overlay.ts",
      generatedSpan: { start: 5, end: 7 },
      mappedLocation: null,
      provenance: {
        getTemplateUriForGenerated: () => "/app/demo.html",
      },
      policy: {
        ...DEFAULT_PROVENANCE_PROJECTION_POLICY,
        references: {
          overlayUnmappedLocation: "template-uri",
          requireExactMappedSpan: false,
        },
      },
    });
    expect(decision.reason).toBe("overlay-template-fallback");
    expect(decision.location?.uri).toBe("/app/demo.html");
  });

  test("generated reference template fallback canonicalizes mapped template identity", () => {
    const decision = resolveGeneratedReferenceLocationWithPolicy({
      generatedUri: "C:\\APP\\DEMO.__AU.TTC.OVERLAY.TS",
      generatedSpan: { start: 5, end: 7 },
      mappedLocation: null,
      provenance: {
        getTemplateUriForGenerated: () => "C:\\APP\\DEMO.HTML",
      },
      policy: {
        ...DEFAULT_PROVENANCE_PROJECTION_POLICY,
        references: {
          overlayUnmappedLocation: "template-uri",
          requireExactMappedSpan: false,
        },
      },
    });
    expect(decision.reason).toBe("overlay-template-fallback");
    expect(decision.location?.uri).toBe("c:/app/demo.html");
  });

  test("generated references can pass through generated URI when configured", () => {
    const decision = resolveGeneratedReferenceLocationWithPolicy({
      generatedUri: "/app/demo.__au.ttc.overlay.ts",
      generatedSpan: { start: 5, end: 7 },
      mappedLocation: null,
      provenance: {
        getTemplateUriForGenerated: () => "/app/demo.html",
      },
      policy: {
        ...DEFAULT_PROVENANCE_PROJECTION_POLICY,
        references: {
          overlayUnmappedLocation: "passthrough-generated",
          requireExactMappedSpan: false,
        },
      },
    });
    expect(decision.reason).toBe("passthrough-generated-location");
    expect(decision.location?.uri).toBe("/app/demo.__au.ttc.overlay.ts");
  });

  test("generated references can reject degraded mappings when exact spans are required", () => {
    const decision = resolveGeneratedReferenceLocationWithPolicy({
      generatedUri: "/app/demo.__au.ttc.overlay.ts",
      generatedSpan: { start: 5, end: 7 },
      mappedLocation: {
        uri: "/app/demo.html",
        span: { start: 100, end: 102 },
      },
      mappedEvidence: "degraded",
      provenance: {
        getTemplateUriForGenerated: () => "/app/demo.html",
      },
      policy: {
        ...DEFAULT_PROVENANCE_PROJECTION_POLICY,
        references: {
          overlayUnmappedLocation: "template-uri",
          requireExactMappedSpan: true,
        },
      },
    });
    expect(decision.reason).toBe("overlay-template-fallback");
    expect(decision.location?.uri).toBe("/app/demo.html");
  });

  test("generated references keep degraded mappings when exactness is not required", () => {
    const decision = resolveGeneratedReferenceLocationWithPolicy({
      generatedUri: "/app/demo.__au.ttc.overlay.ts",
      generatedSpan: { start: 5, end: 7 },
      mappedLocation: {
        uri: "/app/demo.html",
        span: { start: 100, end: 102 },
      },
      mappedEvidence: "degraded",
      provenance: {
        getTemplateUriForGenerated: () => "/app/demo.html",
      },
    });
    expect(decision.reason).toBe("mapped-degraded");
    expect(decision.location?.uri).toBe("/app/demo.html");
  });

  test("generated references report missing-location when no mapped or generated span exists", () => {
    const decision = resolveGeneratedReferenceLocationWithPolicy({
      generatedUri: "/app/demo.__au.ttc.overlay.ts",
      generatedSpan: null,
      mappedLocation: null,
      provenance: {
        getTemplateUriForGenerated: () => "/app/demo.html",
      },
    });
    expect(decision.reason).toBe("missing-location");
    expect(decision.location).toBeNull();
  });

  test("overlay edit batch rejection can be relaxed to require at least one mapped edit", () => {
    const reject = shouldRejectOverlayEditBatch(
      {
        requireOverlayMapping: true,
        overlayEdits: 2,
        mappedOverlayEdits: 1,
        unmappedOverlayEdits: 1,
      },
      {
        ...DEFAULT_PROVENANCE_PROJECTION_POLICY,
        edits: {
          requireFullOverlayMappingForAtomicEdit: false,
        },
      },
    );
    expect(reject).toBe(false);
  });

  test("overlay edit batch is accepted when overlay mapping is not required", () => {
    const reject = shouldRejectOverlayEditBatch(
      {
        requireOverlayMapping: false,
        overlayEdits: 1,
        mappedOverlayEdits: 0,
        unmappedOverlayEdits: 1,
      },
      DEFAULT_PROVENANCE_PROJECTION_POLICY,
    );
    expect(reject).toBe(false);
  });
});
