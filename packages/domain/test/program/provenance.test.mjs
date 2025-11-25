import test from "node:test";
import assert from "node:assert/strict";

import { idFromKey } from "../../out/compiler/model/identity.js";
import {
  InMemoryProvenanceIndex,
  projectOverlaySpanToTemplateSpan,
} from "../../out/program/provenance.js";

const templateUri = "/app/components/example.html";
const overlayUri = "/app/components/example.__au.ttc.ts";
const ssrHtmlUri = "/app/components/example.__au.ssr.html";
const ssrManifestUri = "/app/components/example.__au.ssr.json";

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

const ssrMapping = {
  kind: "ssr-mapping",
  entries: [
    {
      nodeId: idFromKey("node1"),
      hid: 1,
      templateSpan: { start: 200, end: 240, file: templateUri },
      htmlSpan: { start: 0, end: 20 },
      manifestSpan: { start: 40, end: 80 },
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

test("ssr mappings expand to provenance edges and project back to template", () => {
  const provenance = new InMemoryProvenanceIndex();
  provenance.addSsrMapping(templateUri, ssrHtmlUri, ssrManifestUri, ssrMapping);

  const htmlEdges = provenance.findByGenerated(ssrHtmlUri, 5);
  assert.equal(htmlEdges.length, 1);
  assert.equal(htmlEdges[0]?.kind, "ssrNode");
  assert.equal(String(htmlEdges[0]?.to.nodeId), "node1");

  const manifestEdges = provenance.findByGenerated(ssrManifestUri, 60);
  assert.equal(manifestEdges.length, 1);
  assert.equal(manifestEdges[0]?.kind, "ssrNode");

  const templateHit = provenance.lookupSource(templateUri, 210);
  assert.equal(templateHit?.nodeId, "node1");
  assert.equal(templateHit?.edge.kind, "ssrNode");

  // projectGeneratedSpan/projectGeneratedOffset use the same projection helper
  const htmlSliceHit = provenance.projectGeneratedSpan(ssrHtmlUri, { start: 5, end: 15 });
  assert.ok(htmlSliceHit);
  assert.equal(htmlSliceHit?.edge.kind, "ssrNode");
  assert.equal(htmlSliceHit?.nodeId, "node1");
  // SSR edges do not slice; we always map back to the full template span.
  assert.equal(htmlSliceHit?.edge.to.span.start, 200);
  assert.equal(htmlSliceHit?.edge.to.span.end, 240);

  const manifestOffsetHit = provenance.projectGeneratedOffset(ssrManifestUri, 60);
  assert.ok(manifestOffsetHit);
  assert.equal(manifestOffsetHit?.edge.kind, "ssrNode");
  assert.equal(manifestOffsetHit?.nodeId, "node1");
  // Offset projection also returns the full template span for SSR nodes.
  assert.equal(manifestOffsetHit?.edge.to.span.start, 200);
  assert.equal(manifestOffsetHit?.edge.to.span.end, 240);

  assert.ok(provenance.getSsrMapping(templateUri));
  const ssrUris = provenance.getSsrUris(templateUri);
  assert.equal(ssrUris?.html, ssrHtmlUri);
  assert.equal(ssrUris?.manifest, ssrManifestUri);
});

test("provenance stats and templateStats aggregate edges by kind and document", () => {
  const provenance = new InMemoryProvenanceIndex();
  provenance.addOverlayMapping(templateUri, overlayUri, mapping);
  provenance.addSsrMapping(templateUri, ssrHtmlUri, ssrManifestUri, ssrMapping);

  const stats = provenance.stats();
  // overlay: 1 overlayExpr + 2 overlayMember; ssr: 2 ssrNode
  assert.equal(stats.totalEdges, 5);
  assert.equal(stats.byKind.overlayExpr, 1);
  assert.equal(stats.byKind.overlayMember, 2);
  assert.equal(stats.byKind.ssrNode, 2);
  assert.equal(stats.byKind.custom, 0);

  const byDoc = new Map(stats.documents.map((d) => [d.uri, d]));

  const overlayDoc = byDoc.get(overlayUri);
  assert.ok(overlayDoc);
  assert.equal(overlayDoc.edges, 3);
  assert.equal(overlayDoc.byKind.overlayExpr, 1);
  assert.equal(overlayDoc.byKind.overlayMember, 2);

  const templateDoc = byDoc.get(templateUri);
  assert.ok(templateDoc);
  assert.equal(templateDoc.edges, 5);
  assert.equal(templateDoc.byKind.overlayExpr, 1);
  assert.equal(templateDoc.byKind.overlayMember, 2);
  assert.equal(templateDoc.byKind.ssrNode, 2);

  const htmlDoc = byDoc.get(ssrHtmlUri);
  assert.ok(htmlDoc);
  assert.equal(htmlDoc.edges, 1);
  assert.equal(htmlDoc.byKind.ssrNode, 1);

  const manifestDoc = byDoc.get(ssrManifestUri);
  assert.ok(manifestDoc);
  assert.equal(manifestDoc.edges, 1);
  assert.equal(manifestDoc.byKind.ssrNode, 1);

  const templateStats = provenance.templateStats(templateUri);
  assert.equal(templateStats.templateUri, templateUri);
  assert.equal(templateStats.overlayUri, overlayUri);
  assert.deepEqual(templateStats.ssrUris, { html: ssrHtmlUri, manifest: ssrManifestUri });
  assert.equal(templateStats.totalEdges, 5);
  assert.equal(templateStats.overlayEdges, 3);
  assert.equal(templateStats.ssrEdges, 2);
});

test("provenance pruning drops edges and overlay/ssr cache entries", () => {
  const provenance = new InMemoryProvenanceIndex();
  provenance.addOverlayMapping(templateUri, overlayUri, mapping);
  provenance.addSsrMapping(templateUri, ssrHtmlUri, ssrManifestUri, ssrMapping);

  assert.ok(provenance.findByGenerated(overlayUri, 22).length > 0);
  assert.ok(provenance.findByGenerated(ssrHtmlUri, 5).length > 0);
  provenance.removeDocument(templateUri);

  assert.equal(provenance.findByGenerated(overlayUri, 22).length, 0);
  assert.equal(provenance.getOverlayMapping(templateUri), null);
  assert.equal(provenance.getOverlayUri(templateUri), null);
  assert.equal(provenance.findByGenerated(ssrHtmlUri, 5).length, 0);
  assert.equal(provenance.getSsrMapping(templateUri), null);
  assert.equal(provenance.getSsrUris(templateUri), null);

  provenance.addOverlayMapping(templateUri, overlayUri, mapping);
  provenance.addSsrMapping(templateUri, ssrHtmlUri, ssrManifestUri, ssrMapping);
  provenance.removeDocument(overlayUri);
  assert.equal(provenance.findBySource(templateUri, 115).length, 0);
  assert.equal(provenance.findBySource(templateUri, 210).length, 0);
});
