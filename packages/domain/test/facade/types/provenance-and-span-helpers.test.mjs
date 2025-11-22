import test from "node:test";
import assert from "node:assert/strict";

import {
  pickNarrowestContaining,
  provenanceSpan,
  preferOrigin,
  spanContainsOffset,
  spanLength,
} from "../../../out/index.js";

test("span helpers stay consistent when exported through the facade", () => {
  const items = [
    { name: "wide", span: { start: 0, end: 20 } },
    { name: "narrow", span: { start: 5, end: 10 } },
    { name: "edge", span: { start: 10, end: 15 } },
  ];
  assert.ok(spanContainsOffset(items[0].span, 7));
  assert.equal(spanContainsOffset(items[0].span, items[0].span.end), false, "end of span should be exclusive");
  assert.equal(spanLength(items[0].span), 20);
  const hit = pickNarrowestContaining(items, 7, (i) => i.span);
  assert.equal(hit?.name, "narrow", "narrowest span should be selected");
});

test("provenance helpers surface spans and prefer richer origins", () => {
  const spanA = { start: 1, end: 3 };
  const spanB = { start: 2, end: 4 };
  const originA = { kind: "authored", span: spanA, trace: [{ by: "a" }] };
  const originB = { kind: "synthetic", span: spanB, trace: [{ by: "b" }] };

  const chosen = preferOrigin(originA, originB);
  assert.equal(chosen, originA, "preferOrigin should keep primary when present");

  assert.deepEqual(provenanceSpan(originA), spanA, "provenanceSpan should return origin span");
  assert.deepEqual(provenanceSpan({ origin: null, fallbackSpan: spanB }), spanB, "fallbackSpan should be used when origin is null");
});
