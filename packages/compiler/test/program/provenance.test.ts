import { test, expect } from "vitest";

import {
  collectOverlayUrisFromProvenance,
  InMemoryOverlaySpanIndex,
  projectGeneratedLocationToDocumentSpanWithOffsetFallback,
  projectGeneratedOffsetToDocumentSpan,
  projectGeneratedSpanToDocumentSpan,
  projectGeneratedSpanToDocumentSpanWithOffsetFallback,
  overlayHitToDocumentSpan,
  projectOverlaySpanToTemplateSpan,
  resolveTemplateUriForGenerated,
} from "@aurelia-ls/compiler";

const templateUri = "/app/components/example.html";
const overlayUri = "/app/components/example.__au.ttc.ts";

const mapping = {
  kind: "mapping",
  entries: [
    {
      exprId: "expr1",
      htmlSpan: { start: 100, end: 130, file: templateUri },
      overlaySpan: { start: 10, end: 40 },
      segments: [
        // Broader parent segment for `user`
        {
          kind: "member",
          path: "user",
          htmlSpan: { start: 100, end: 130, file: templateUri },
          overlaySpan: { start: 10, end: 40 },
        },
        // Narrower child segment for `user.name`
        {
          kind: "member",
          path: "user.name",
          htmlSpan: { start: 110, end: 120, file: templateUri },
          overlaySpan: { start: 20, end: 30 },
        },
      ],
    },
  ],
};

test("overlay mappings expand to provenance edges and offset-aware lookups", () => {
  const provenance = new InMemoryOverlaySpanIndex();
  provenance.addOverlayMapping(templateUri, overlayUri, mapping);

  const generatedEdges = provenance.findByGenerated(overlayUri, 22);
  expect(generatedEdges.length).toBe(3);
  expect(generatedEdges[0]?.kind).toBe("overlayMember");
  // Last one should be the overlayExpr edge
  expect(generatedEdges[generatedEdges.length - 1]?.kind).toBe("overlayExpr");

  const sourceEdges = provenance.findBySource(templateUri, 115);
  expect(sourceEdges.length).toBe(3);
  expect(sourceEdges[0]?.kind).toBe("overlayMember");

  const overlayHit = provenance.lookupGenerated(overlayUri, 22);
  expect(overlayHit?.exprId).toBe("expr1");
  // Should pick the deepest member segment (user.name)
  expect(overlayHit?.memberPath).toBe("user.name");
  expect(overlayHit?.edge.kind).toBe("overlayMember");

  const templateHit = provenance.lookupSource(templateUri, 115);
  expect(templateHit?.exprId).toBe("expr1");
  expect(templateHit?.memberPath).toBe("user.name");
  expect(templateHit?.edge.kind).toBe("overlayMember");

  expect(provenance.getOverlayMapping(templateUri)).toBeTruthy();
  expect(provenance.getOverlayUri(templateUri)).toBe(overlayUri);
});

test("overlay projection via projectGeneratedSpan/projectGeneratedOffset", () => {
  const provenance = new InMemoryOverlaySpanIndex();
  provenance.addOverlayMapping(templateUri, overlayUri, mapping);

  // Full slice across the entire expression range -> maps to full HTML span.
  const fullHit = provenance.projectGeneratedSpan(overlayUri, { start: 10, end: 40 });
  expect(fullHit).toBeTruthy();
  expect(fullHit?.exprId).toBe("expr1");
  // For the full slice we expect the broader 'user' segment
  expect(fullHit?.memberPath).toBe("user");
  expect(fullHit?.edge.to.span.start).toBe(100);
  expect(fullHit?.edge.to.span.end).toBe(130);

  // Partial slice inside user.name segment -> proportional mapping into narrower html span.
  const partialHit = provenance.projectGeneratedSpan(overlayUri, { start: 21, end: 26 });
  expect(partialHit).toBeTruthy();
  expect(partialHit?.exprId).toBe("expr1");
  expect(partialHit?.memberPath).toBe("user.name");
  // user.name: overlay [20,30] -> html [110,120]
  // slice [21,26] => html [111,116]
  expect(partialHit?.edge.to.span.start).toBe(111);
  expect(partialHit?.edge.to.span.end).toBe(116);

  // Offset projection: cursor inside user.name
  const offsetHit = provenance.projectGeneratedOffset(overlayUri, 22);
  expect(offsetHit).toBeTruthy();
  expect(offsetHit?.exprId).toBe("expr1");
  expect(offsetHit?.memberPath).toBe("user.name");
  // cursor at overlay 22 (2 chars into [20,30]) => 2 chars into [110,120]
  expect(offsetHit?.edge.to.span.start).toBe(112);
  expect(offsetHit?.edge.to.span.end).toBe(112);
});

test("projectGeneratedSpanToDocumentSpan materializes mapped document spans", () => {
  const provenance = new InMemoryOverlaySpanIndex();
  provenance.addOverlayMapping(templateUri, overlayUri, mapping);

  const mapped = projectGeneratedSpanToDocumentSpan(provenance, overlayUri, { start: 21, end: 26 });
  expect(mapped).toBeTruthy();
  expect(mapped.uri).toBe(templateUri);
  expect(mapped.exprId).toBe("expr1");
  expect(mapped.memberPath).toBe("user.name");
  expect(mapped.span.start).toBe(111);
  expect(mapped.span.end).toBe(116);
});

test("projectOverlaySpanToTemplateSpan respects covering vs sliced spans", () => {
  const provenance = new InMemoryOverlaySpanIndex();
  provenance.addOverlayMapping(templateUri, overlayUri, mapping);

  const edges = provenance.findByGenerated(overlayUri, 22);
  const memberEdge = edges.find((e) => e.kind === "overlayMember" && e.tag === "user.name");
  expect(memberEdge).toBeTruthy();

  // Cover the whole member span -> we get the full member html span.
  const coveringSlice = { start: 18, end: 32 }; // fully covers [20,30]
  const coveringResult = projectOverlaySpanToTemplateSpan(memberEdge, coveringSlice);
  expect(coveringResult.start).toBe(110);
  expect(coveringResult.end).toBe(120);

  // Proper subset of member span -> proportional slice.
  const innerSlice = { start: 22, end: 27 };
  const innerResult = projectOverlaySpanToTemplateSpan(memberEdge, innerSlice);
  // [20,30] -> [110,120], offset +2..+7 => [112,117]
  expect(innerResult.start).toBe(112);
  expect(innerResult.end).toBe(117);
});

test("overlay projection scales proportionally when overlay and template spans differ", () => {
  const provenance = new InMemoryOverlaySpanIndex();
  const scaledMapping = {
    kind: "mapping",
    entries: [
      {
        exprId: "scaled",
        htmlSpan: { start: 500, end: 530, file: templateUri },
        overlaySpan: { start: 0, end: 10 },
      },
    ],
  };
  provenance.addOverlayMapping(templateUri, overlayUri, scaledMapping);

  const hit = provenance.projectGeneratedSpan(overlayUri, { start: 2, end: 4 });
  expect(hit).toBeTruthy();
  expect(hit?.exprId).toBe("scaled");
  // overlay [0,10] -> html [500,530]; slice [2,4] => ratios 0.2..0.4 => [506,512]
  expect(hit?.edge.to.span.start).toBe(506);
  expect(hit?.edge.to.span.end).toBe(512);
});

test("projectGeneratedSpan breaks ties on member depth after overlap and span length", () => {
  const provenance = new InMemoryOverlaySpanIndex();
  const tieMapping = {
    kind: "mapping",
    entries: [
      {
        exprId: "shallow",
        htmlSpan: { start: 100, end: 120, file: templateUri },
        overlaySpan: { start: 0, end: 20 },
        segments: [
          {
            kind: "member",
            path: "user",
            htmlSpan: { start: 100, end: 110, file: templateUri },
            overlaySpan: { start: 0, end: 10 },
          },
        ],
      },
      {
        exprId: "deep",
        htmlSpan: { start: 200, end: 220, file: templateUri },
        overlaySpan: { start: 0, end: 20 },
        segments: [
          {
            kind: "member",
            path: "user.name",
            htmlSpan: { start: 200, end: 210, file: templateUri },
            overlaySpan: { start: 0, end: 10 },
          },
        ],
      },
    ],
  };
  provenance.addOverlayMapping(templateUri, overlayUri, tieMapping);

  const hit = provenance.projectGeneratedSpan(overlayUri, { start: 5, end: 8 });
  expect(hit).toBeTruthy();
  expect(hit?.memberPath).toBe("user.name");
  expect(hit?.exprId).toBe("deep");
  // overlay [0,10] -> html [200,210]; slice [5,8] => [205,208]
  expect(hit?.edge.to.span.start).toBe(205);
  expect(hit?.edge.to.span.end).toBe(208);
});

test("member selection prefers narrower spans before deeper paths", () => {
  const provenance = new InMemoryOverlaySpanIndex();
  const narrowVsDeep = {
    kind: "mapping",
    entries: [
      {
        exprId: "expr",
        htmlSpan: { start: 400, end: 430, file: templateUri },
        overlaySpan: { start: 0, end: 20 },
        segments: [
          {
            kind: "member",
            path: "user",
            htmlSpan: { start: 405, end: 415, file: templateUri },
            overlaySpan: { start: 0, end: 10 },
          },
          {
            kind: "member",
            path: "user.details.name",
            htmlSpan: { start: 420, end: 445, file: templateUri },
            overlaySpan: { start: 0, end: 25 },
          },
        ],
      },
    ],
  };

  provenance.addOverlayMapping(templateUri, overlayUri, narrowVsDeep);

  const hit = provenance.lookupGenerated(overlayUri, 5);
  expect(hit).toBeTruthy();
  expect(hit?.edge.kind).toBe("overlayMember");
  // Even though the deeper path exists, the narrower span wins first.
  expect(hit?.memberPath).toBe("user");
});

test("member depth ranking uses structural path depth instead of raw string length", () => {
  const provenance = new InMemoryOverlaySpanIndex();
  const depthMapping = {
    kind: "mapping",
    entries: [
      {
        exprId: "long-shallow",
        htmlSpan: { start: 100, end: 120, file: templateUri },
        overlaySpan: { start: 0, end: 20 },
        segments: [
          {
            kind: "member",
            path: "abcdefghijkl.mnop",
            htmlSpan: { start: 100, end: 110, file: templateUri },
            overlaySpan: { start: 0, end: 10 },
          },
        ],
      },
      {
        exprId: "short-deep",
        htmlSpan: { start: 200, end: 220, file: templateUri },
        overlaySpan: { start: 0, end: 20 },
        segments: [
          {
            kind: "member",
            path: "a.b.c",
            htmlSpan: { start: 200, end: 210, file: templateUri },
            overlaySpan: { start: 0, end: 10 },
          },
        ],
      },
    ],
  };
  provenance.addOverlayMapping(templateUri, overlayUri, depthMapping);

  const hit = provenance.projectGeneratedSpan(overlayUri, { start: 2, end: 6 });
  expect(hit).toBeTruthy();
  expect(hit?.memberPath).toBe("a.b.c");
  expect(hit?.exprId).toBe("short-deep");
});

test("member specificity prefers deeper member segments when multiple match", () => {
  const provenance = new InMemoryOverlaySpanIndex();
  provenance.addOverlayMapping(templateUri, overlayUri, mapping);

  const offset = 22; // inside both 'user' and 'user.name'
  const overlayHit = provenance.lookupGenerated(overlayUri, offset);
  expect(overlayHit).toBeTruthy();
  expect(overlayHit?.memberPath).toBe("user.name");
  expect(overlayHit?.edge.kind).toBe("overlayMember");

  const templateHit = provenance.lookupSource(templateUri, 115);
  expect(templateHit).toBeTruthy();
  expect(templateHit?.memberPath).toBe("user.name");
  expect(templateHit?.edge.kind).toBe("overlayMember");
});

test("lookupGenerated falls back to overlayExpr when no member segment covers offset", () => {
  const provenance = new InMemoryOverlaySpanIndex();
  const localMapping = {
    kind: "mapping",
    entries: [
      {
        exprId: "expr2",
        htmlSpan: { start: 300, end: 330, file: templateUri },
        overlaySpan: { start: 50, end: 80 },
        segments: [
          {
            kind: "member",
            path: "thing",
            htmlSpan: { start: 305, end: 310, file: templateUri },
            overlaySpan: { start: 55, end: 60 },
          },
        ],
      },
    ],
  };

  provenance.addOverlayMapping(templateUri, overlayUri, localMapping);

  // Inside the member segment -> we get the member edge.
  const insideSegment = provenance.lookupGenerated(overlayUri, 57);
  expect(insideSegment).toBeTruthy();
  expect(insideSegment?.exprId).toBe("expr2");
  expect(insideSegment?.memberPath).toBe("thing");
  expect(insideSegment?.edge.kind).toBe("overlayMember");

  // Inside the expression, but outside any member segment -> fallback to overlayExpr.
  const outsideSegment = provenance.lookupGenerated(overlayUri, 70);
  expect(outsideSegment).toBeTruthy();
  expect(outsideSegment?.exprId).toBe("expr2");
  expect(outsideSegment?.memberPath).toBeUndefined();
  expect(outsideSegment?.edge.kind).toBe("overlayExpr");
});

test("provenance stats aggregate edges by kind and document", () => {
  const provenance = new InMemoryOverlaySpanIndex();
  provenance.addOverlayMapping(templateUri, overlayUri, mapping);

  const stats = provenance.stats();
  // overlay: 1 overlayExpr + 2 overlayMember
  expect(stats.totalEdges).toBe(3);
  expect(stats.byKind.overlayExpr).toBe(1);
  expect(stats.byKind.overlayMember).toBe(2);
  expect(stats.byKind.custom).toBe(0);

  const byDoc = new Map(stats.documents.map((d) => [d.uri, d]));

  const overlayDoc = byDoc.get(overlayUri);
  expect(overlayDoc).toBeTruthy();
  expect(overlayDoc.edges).toBe(3);
  expect(overlayDoc.byKind.overlayExpr).toBe(1);
  expect(overlayDoc.byKind.overlayMember).toBe(2);

  const templateDoc = byDoc.get(templateUri);
  expect(templateDoc).toBeTruthy();
  expect(templateDoc.edges).toBe(3);
  expect(templateDoc.byKind.overlayExpr).toBe(1);
  expect(templateDoc.byKind.overlayMember).toBe(2);

  const templateStats = provenance.templateStats(templateUri);
  expect(templateStats.templateUri).toBe(templateUri);
  expect(templateStats.overlayUri).toBe(overlayUri);
  expect(templateStats.totalEdges).toBe(3);
  expect(templateStats.overlayEdges).toBe(3);
  expect(templateStats.runtimeUri).toBeNull();
  expect(templateStats.runtimeStatus).toBe("unsupported");
  expect(templateStats.runtimeReason).toBe("runtime-synthesis-not-implemented");
});

test("runtime provenance stats report tracked runtime uri when runtime edges are present", () => {
  const provenance = new InMemoryOverlaySpanIndex();
  provenance.addOverlayMapping(templateUri, overlayUri, mapping);
  provenance.addEdges([
    {
      kind: "runtimeExpr",
      from: { uri: "/app/runtime/template.runtime.js", span: { start: 0, end: 20 }, exprId: "expr1" },
      to: { uri: templateUri, span: { start: 100, end: 130, file: templateUri }, exprId: "expr1" },
    },
  ]);

  const stats = provenance.templateStats(templateUri);
  expect(stats.runtimeUri).toBe("/app/runtime/template.runtime.js");
  expect(stats.runtimeStatus).toBe("tracked");
  expect(stats.runtimeReason).toBe("runtime-uri-tracked");
  expect(stats.runtimeEdges).toBe(1);
});

test("runtime provenance stats report missing runtime uri when runtime edges never leave template/overlay", () => {
  const provenance = new InMemoryOverlaySpanIndex();
  provenance.addOverlayMapping(templateUri, overlayUri, mapping);
  provenance.addEdges([
    {
      kind: "runtimeExpr",
      from: { uri: overlayUri, span: { start: 0, end: 20 }, exprId: "expr1" },
      to: { uri: templateUri, span: { start: 100, end: 130, file: templateUri }, exprId: "expr1" },
    },
  ]);

  const stats = provenance.templateStats(templateUri);
  expect(stats.runtimeUri).toBeNull();
  expect(stats.runtimeStatus).toBe("unsupported");
  expect(stats.runtimeReason).toBe("runtime-edges-without-uri");
  expect(stats.runtimeEdges).toBe(1);
});

test("runtime provenance stats report ambiguous runtime uri when multiple candidates exist", () => {
  const provenance = new InMemoryOverlaySpanIndex();
  provenance.addOverlayMapping(templateUri, overlayUri, mapping);
  provenance.addEdges([
    {
      kind: "runtimeExpr",
      from: { uri: "/app/runtime-a.js", span: { start: 0, end: 20 }, exprId: "expr1" },
      to: { uri: templateUri, span: { start: 100, end: 130, file: templateUri }, exprId: "expr1" },
    },
    {
      kind: "runtimeMember",
      from: { uri: "/app/runtime-b.js", span: { start: 0, end: 10 }, exprId: "expr1" },
      to: { uri: templateUri, span: { start: 110, end: 120, file: templateUri }, exprId: "expr1" },
      tag: "user.name",
    },
  ]);

  const stats = provenance.templateStats(templateUri);
  expect(stats.runtimeUri).toBeNull();
  expect(stats.runtimeStatus).toBe("unsupported");
  expect(stats.runtimeReason).toBe("runtime-edges-ambiguous-uri");
  expect(stats.runtimeEdges).toBe(2);
});

test("degraded member evidence is preserved on provenance edges", () => {
  const provenance = new InMemoryOverlaySpanIndex();
  const degradedMapping = {
    kind: "mapping",
    entries: [
      {
        exprId: "expr-degraded",
        htmlSpan: { start: 300, end: 330, file: templateUri },
        overlaySpan: { start: 50, end: 80 },
        segments: [
          {
            kind: "member",
            path: "item.value",
            htmlSpan: { start: 305, end: 320, file: templateUri },
            overlaySpan: { start: 55, end: 70 },
            degradation: {
              reason: "missing-html-member-span" as const,
              projection: "proportional" as const,
            },
          },
        ],
      },
    ],
  };
  provenance.addOverlayMapping(templateUri, overlayUri, degradedMapping);

  const hit = provenance.projectGeneratedSpan(overlayUri, { start: 56, end: 60 });
  expect(hit?.edge.kind).toBe("overlayMember");
  expect(hit?.edge.evidence?.level).toBe("degraded");
  expect(hit?.edge.evidence?.reason).toBe("missing-html-member-span");
});

test("provenance pruning drops edges and overlay cache entries", () => {
  const provenance = new InMemoryOverlaySpanIndex();
  provenance.addOverlayMapping(templateUri, overlayUri, mapping);

  expect(provenance.findByGenerated(overlayUri, 22).length > 0).toBeTruthy();
  provenance.removeDocument(templateUri);

  expect(provenance.findByGenerated(overlayUri, 22).length).toBe(0);
  expect(provenance.getOverlayMapping(templateUri)).toBeNull();
  expect(provenance.getOverlayUri(templateUri)).toBeNull();

  provenance.addOverlayMapping(templateUri, overlayUri, mapping);
  provenance.removeDocument(overlayUri);
  expect(provenance.findBySource(templateUri, 115).length).toBe(0);
});

test("provenance exposes generated->template lookup and overlay uri inventory", () => {
  const provenance = new InMemoryOverlaySpanIndex();
  provenance.addOverlayMapping(templateUri, overlayUri, mapping);

  expect(resolveTemplateUriForGenerated(provenance, overlayUri)).toBe(templateUri);
  const overlays = collectOverlayUrisFromProvenance(provenance);
  expect(overlays.has(overlayUri)).toBe(true);
});

test("generated location projection maps range-based locations through provenance", () => {
  const provenance = new InMemoryOverlaySpanIndex();
  provenance.addOverlayMapping(templateUri, overlayUri, mapping);

  const generatedText = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const mapped = projectGeneratedLocationToDocumentSpanWithOffsetFallback(provenance, {
    generatedUri: overlayUri,
    generatedText,
    range: {
      start: { line: 0, character: 20 },
      end: { line: 0, character: 30 },
    },
  });

  expect(mapped).toBeTruthy();
  expect(mapped?.uri).toBe(templateUri);
  expect(mapped?.memberPath).toBe("user.name");
  expect(mapped?.span.start).toBe(110);
  expect(mapped?.span.end).toBe(120);
});

test("generated->template lookup canonicalizes the mapped template URI", () => {
  const provenance = {
    getTemplateUriForGenerated() {
      return "C:\\APP\\COMPONENT.HTML";
    },
  };

  expect(resolveTemplateUriForGenerated(provenance, overlayUri)).toBe("c:/app/component.html");
});

test("offset fallback projects generated spans when direct span projection misses", () => {
  const provenance = {
    projectGeneratedSpan() {
      return null;
    },
    projectGeneratedOffset(_uri: string, offset: number) {
      if (offset === 10) {
        return {
          edge: {
            kind: "overlayExpr" as const,
            from: { uri: overlayUri, span: { start: 10, end: 20 } },
            to: { uri: templateUri, span: { start: 100, end: 110, file: templateUri } },
          },
        };
      }
      if (offset === 19) {
        return {
          edge: {
            kind: "overlayExpr" as const,
            from: { uri: overlayUri, span: { start: 10, end: 20 } },
            to: { uri: templateUri, span: { start: 109, end: 120, file: templateUri } },
          },
        };
      }
      return null;
    },
  };

  const mapped = projectGeneratedSpanToDocumentSpanWithOffsetFallback(provenance, overlayUri, {
    start: 10,
    end: 20,
  });
  expect(mapped).toBeTruthy();
  expect(mapped?.uri).toBe(templateUri);
  expect(mapped?.span.start).toBe(100);
  expect(mapped?.span.end).toBe(120);
});

test("offset fallback returns the start projection when endpoints map to different template documents", () => {
  const provenance = {
    projectGeneratedSpan() {
      return null;
    },
    projectGeneratedOffset(_uri: string, offset: number) {
      if (offset === 10) {
        return {
          edge: {
            kind: "overlayExpr" as const,
            from: { uri: overlayUri, span: { start: 10, end: 20 } },
            to: { uri: "/app/a.html", span: { start: 100, end: 110, file: "/app/a.html" } },
          },
          exprId: "expr-a",
        };
      }
      if (offset === 19) {
        return {
          edge: {
            kind: "overlayExpr" as const,
            from: { uri: overlayUri, span: { start: 10, end: 20 } },
            to: { uri: "/app/b.html", span: { start: 200, end: 210, file: "/app/b.html" } },
          },
          exprId: "expr-b",
        };
      }
      return null;
    },
  };

  const mapped = projectGeneratedSpanToDocumentSpanWithOffsetFallback(provenance, overlayUri, {
    start: 10,
    end: 20,
  });
  expect(mapped).toBeTruthy();
  expect(mapped?.uri).toBe("/app/a.html");
  expect(mapped?.span.start).toBe(100);
  expect(mapped?.span.end).toBe(110);
  expect(mapped?.exprId).toBe("expr-a");
});
