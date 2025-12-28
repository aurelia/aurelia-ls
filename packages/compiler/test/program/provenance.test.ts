import { test } from "vitest";
import assert from "node:assert/strict";

import {
  InMemoryProvenanceIndex,
  projectGeneratedOffsetToDocumentSpan,
  projectGeneratedSpanToDocumentSpan,
  provenanceHitToDocumentSpan,
  projectOverlaySpanToTemplateSpan,
} from "../../out/index.js";

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
  const provenance = new InMemoryProvenanceIndex();
  provenance.addOverlayMapping(templateUri, overlayUri, mapping);

  const generatedEdges = provenance.findByGenerated(overlayUri, 22);
  assert.equal(generatedEdges.length, 3);
  assert.equal(generatedEdges[0]?.kind, "overlayMember");
  // Last one should be the overlayExpr edge
  assert.equal(generatedEdges[generatedEdges.length - 1]?.kind, "overlayExpr");

  const sourceEdges = provenance.findBySource(templateUri, 115);
  assert.equal(sourceEdges.length, 3);
  assert.equal(sourceEdges[0]?.kind, "overlayMember");

  const overlayHit = provenance.lookupGenerated(overlayUri, 22);
  assert.equal(overlayHit?.exprId, "expr1");
  // Should pick the deepest member segment (user.name)
  assert.equal(overlayHit?.memberPath, "user.name");
  assert.equal(overlayHit?.edge.kind, "overlayMember");

  const templateHit = provenance.lookupSource(templateUri, 115);
  assert.equal(templateHit?.exprId, "expr1");
  assert.equal(templateHit?.memberPath, "user.name");
  assert.equal(templateHit?.edge.kind, "overlayMember");

  assert.ok(provenance.getOverlayMapping(templateUri));
  assert.equal(provenance.getOverlayUri(templateUri), overlayUri);
});

test("overlay projection via projectGeneratedSpan/projectGeneratedOffset", () => {
  const provenance = new InMemoryProvenanceIndex();
  provenance.addOverlayMapping(templateUri, overlayUri, mapping);

  // Full slice across the entire expression range -> maps to full HTML span.
  const fullHit = provenance.projectGeneratedSpan(overlayUri, { start: 10, end: 40 });
  assert.ok(fullHit);
  assert.equal(fullHit?.exprId, "expr1");
  // For the full slice we expect the broader 'user' segment
  assert.equal(fullHit?.memberPath, "user");
  assert.equal(fullHit?.edge.to.span.start, 100);
  assert.equal(fullHit?.edge.to.span.end, 130);

  // Partial slice inside user.name segment -> proportional mapping into narrower html span.
  const partialHit = provenance.projectGeneratedSpan(overlayUri, { start: 21, end: 26 });
  assert.ok(partialHit);
  assert.equal(partialHit?.exprId, "expr1");
  assert.equal(partialHit?.memberPath, "user.name");
  // user.name: overlay [20,30] -> html [110,120]
  // slice [21,26] => html [111,116]
  assert.equal(partialHit?.edge.to.span.start, 111);
  assert.equal(partialHit?.edge.to.span.end, 116);

  // Offset projection: cursor inside user.name
  const offsetHit = provenance.projectGeneratedOffset(overlayUri, 22);
  assert.ok(offsetHit);
  assert.equal(offsetHit?.exprId, "expr1");
  assert.equal(offsetHit?.memberPath, "user.name");
  // cursor at overlay 22 (2 chars into [20,30]) => 2 chars into [110,120]
  assert.equal(offsetHit?.edge.to.span.start, 112);
  assert.equal(offsetHit?.edge.to.span.end, 112);
});

test("projectGeneratedSpanToDocumentSpan materializes mapped document spans", () => {
  const provenance = new InMemoryProvenanceIndex();
  provenance.addOverlayMapping(templateUri, overlayUri, mapping);

  const mapped = projectGeneratedSpanToDocumentSpan(provenance, overlayUri, { start: 21, end: 26 });
  assert.ok(mapped);
  assert.equal(mapped.uri, templateUri);
  assert.equal(mapped.exprId, "expr1");
  assert.equal(mapped.memberPath, "user.name");
  assert.equal(mapped.span.start, 111);
  assert.equal(mapped.span.end, 116);
});

test("projectOverlaySpanToTemplateSpan respects covering vs sliced spans", () => {
  const provenance = new InMemoryProvenanceIndex();
  provenance.addOverlayMapping(templateUri, overlayUri, mapping);

  const edges = provenance.findByGenerated(overlayUri, 22);
  const memberEdge = edges.find((e) => e.kind === "overlayMember" && e.tag === "user.name");
  assert.ok(memberEdge);

  // Cover the whole member span -> we get the full member html span.
  const coveringSlice = { start: 18, end: 32 }; // fully covers [20,30]
  const coveringResult = projectOverlaySpanToTemplateSpan(memberEdge, coveringSlice);
  assert.equal(coveringResult.start, 110);
  assert.equal(coveringResult.end, 120);

  // Proper subset of member span -> proportional slice.
  const innerSlice = { start: 22, end: 27 };
  const innerResult = projectOverlaySpanToTemplateSpan(memberEdge, innerSlice);
  // [20,30] -> [110,120], offset +2..+7 => [112,117]
  assert.equal(innerResult.start, 112);
  assert.equal(innerResult.end, 117);
});

test("overlay projection scales proportionally when overlay and template spans differ", () => {
  const provenance = new InMemoryProvenanceIndex();
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
  assert.ok(hit);
  assert.equal(hit?.exprId, "scaled");
  // overlay [0,10] -> html [500,530]; slice [2,4] => ratios 0.2..0.4 => [506,512]
  assert.equal(hit?.edge.to.span.start, 506);
  assert.equal(hit?.edge.to.span.end, 512);
});

test("projectGeneratedSpan breaks ties on member depth after overlap and span length", () => {
  const provenance = new InMemoryProvenanceIndex();
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
  assert.ok(hit);
  assert.equal(hit?.memberPath, "user.name");
  assert.equal(hit?.exprId, "deep");
  // overlay [0,10] -> html [200,210]; slice [5,8] => [205,208]
  assert.equal(hit?.edge.to.span.start, 205);
  assert.equal(hit?.edge.to.span.end, 208);
});

test("member selection prefers narrower spans before deeper paths", () => {
  const provenance = new InMemoryProvenanceIndex();
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
  assert.ok(hit);
  assert.equal(hit?.edge.kind, "overlayMember");
  // Even though the deeper path exists, the narrower span wins first.
  assert.equal(hit?.memberPath, "user");
});

test("member specificity prefers deeper member segments when multiple match", () => {
  const provenance = new InMemoryProvenanceIndex();
  provenance.addOverlayMapping(templateUri, overlayUri, mapping);

  const offset = 22; // inside both 'user' and 'user.name'
  const overlayHit = provenance.lookupGenerated(overlayUri, offset);
  assert.ok(overlayHit);
  assert.equal(overlayHit?.memberPath, "user.name");
  assert.equal(overlayHit?.edge.kind, "overlayMember");

  const templateHit = provenance.lookupSource(templateUri, 115);
  assert.ok(templateHit);
  assert.equal(templateHit?.memberPath, "user.name");
  assert.equal(templateHit?.edge.kind, "overlayMember");
});

test("lookupGenerated falls back to overlayExpr when no member segment covers offset", () => {
  const provenance = new InMemoryProvenanceIndex();
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
  assert.ok(insideSegment);
  assert.equal(insideSegment?.exprId, "expr2");
  assert.equal(insideSegment?.memberPath, "thing");
  assert.equal(insideSegment?.edge.kind, "overlayMember");

  // Inside the expression, but outside any member segment -> fallback to overlayExpr.
  const outsideSegment = provenance.lookupGenerated(overlayUri, 70);
  assert.ok(outsideSegment);
  assert.equal(outsideSegment?.exprId, "expr2");
  assert.equal(outsideSegment?.memberPath, undefined);
  assert.equal(outsideSegment?.edge.kind, "overlayExpr");
});

test("provenance stats aggregate edges by kind and document", () => {
  const provenance = new InMemoryProvenanceIndex();
  provenance.addOverlayMapping(templateUri, overlayUri, mapping);

  const stats = provenance.stats();
  // overlay: 1 overlayExpr + 2 overlayMember
  assert.equal(stats.totalEdges, 3);
  assert.equal(stats.byKind.overlayExpr, 1);
  assert.equal(stats.byKind.overlayMember, 2);
  assert.equal(stats.byKind.custom, 0);

  const byDoc = new Map(stats.documents.map((d) => [d.uri, d]));

  const overlayDoc = byDoc.get(overlayUri);
  assert.ok(overlayDoc);
  assert.equal(overlayDoc.edges, 3);
  assert.equal(overlayDoc.byKind.overlayExpr, 1);
  assert.equal(overlayDoc.byKind.overlayMember, 2);

  const templateDoc = byDoc.get(templateUri);
  assert.ok(templateDoc);
  assert.equal(templateDoc.edges, 3);
  assert.equal(templateDoc.byKind.overlayExpr, 1);
  assert.equal(templateDoc.byKind.overlayMember, 2);

  const templateStats = provenance.templateStats(templateUri);
  assert.equal(templateStats.templateUri, templateUri);
  assert.equal(templateStats.overlayUri, overlayUri);
  assert.equal(templateStats.totalEdges, 3);
  assert.equal(templateStats.overlayEdges, 3);
});

test("provenance pruning drops edges and overlay cache entries", () => {
  const provenance = new InMemoryProvenanceIndex();
  provenance.addOverlayMapping(templateUri, overlayUri, mapping);

  assert.ok(provenance.findByGenerated(overlayUri, 22).length > 0);
  provenance.removeDocument(templateUri);

  assert.equal(provenance.findByGenerated(overlayUri, 22).length, 0);
  assert.equal(provenance.getOverlayMapping(templateUri), null);
  assert.equal(provenance.getOverlayUri(templateUri), null);

  provenance.addOverlayMapping(templateUri, overlayUri, mapping);
  provenance.removeDocument(overlayUri);
  assert.equal(provenance.findBySource(templateUri, 115).length, 0);
});
