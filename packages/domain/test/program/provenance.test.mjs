import test from "node:test";
import assert from "node:assert/strict";

import { idFromKey } from "../../out/compiler/model/identity.js";
import { InMemoryProvenanceIndex } from "../../out/program/provenance.js";

const templateUri = "/app/components/example.html";
const overlayUri = "/app/components/example.__au.ttc.ts";
const ssrHtmlUri = "/app/components/example.__au.ssr.html";
const ssrManifestUri = "/app/components/example.__au.ssr.json";

const mapping = {
  kind: "mapping",
  entries: [
    {
      exprId: "expr1",
      htmlSpan: { start: 100, end: 130, file: "/app/components/example.html" },
      overlaySpan: { start: 10, end: 40 },
      segments: [
        {
          kind: "member",
          path: "user.name",
          htmlSpan: { start: 110, end: 120, file: "/app/components/example.html" },
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
  assert.equal(generatedEdges.length, 2);
  assert.equal(generatedEdges[0]?.kind, "overlayMember");
  assert.equal(generatedEdges[1]?.kind, "overlayExpr");

  const sourceEdges = provenance.findBySource(templateUri, 115);
  assert.equal(sourceEdges.length, 2);
  assert.equal(sourceEdges[0]?.kind, "overlayMember");

  const overlayHit = provenance.lookupGenerated(overlayUri, 22);
  assert.equal(overlayHit?.exprId, "expr1");
  assert.equal(overlayHit?.memberPath, "user.name");
  assert.equal(overlayHit?.edge.kind, "overlayMember");

  const templateHit = provenance.lookupSource(templateUri, 115);
  assert.equal(templateHit?.exprId, "expr1");
  assert.equal(templateHit?.memberPath, "user.name");
  assert.equal(templateHit?.edge.kind, "overlayMember");

  assert.ok(provenance.getOverlayMapping(templateUri));
  assert.equal(provenance.getOverlayUri(templateUri), overlayUri);
});

test("ssr mappings expand to provenance edges", () => {
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

  assert.ok(provenance.getSsrMapping(templateUri));
  const ssrUris = provenance.getSsrUris(templateUri);
  assert.equal(ssrUris?.html, ssrHtmlUri);
  assert.equal(ssrUris?.manifest, ssrManifestUri);
});

test("provenance pruning drops edges and overlay cache entries", () => {
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
