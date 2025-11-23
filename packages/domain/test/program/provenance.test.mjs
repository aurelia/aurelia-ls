import test from "node:test";
import assert from "node:assert/strict";

import { InMemoryProvenanceIndex } from "../../out/program/provenance.js";

const templateUri = "/app/components/example.html";
const overlayUri = "/app/components/example.__au.ttc.ts";

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
