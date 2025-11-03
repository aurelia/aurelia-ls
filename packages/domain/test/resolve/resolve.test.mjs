import test, { describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { linkMarkup } from "./_helpers/build-and-link.mjs";
import { reduceLinkedToIntent } from "./_helpers/reduce-linked-to-intent.mjs";
import { compareResolveIntent } from "./_helpers/compare-intent.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const vectorsPath = path.join(__dirname, "resolve-cases.json");
const vectors = JSON.parse(fs.readFileSync(vectorsPath, "utf8"));

describe("Resolve Host (20)", () => {
  for (const v of vectors) {
    test(v.name, async () => {
      const linked = await linkMarkup(v.markup, { semOverrides: v.semOverrides });
      const actual = reduceLinkedToIntent(linked);
      const expected = v.expect ?? { items: [], diags: [] };

      const { missingItems, extraItems, missingDiags, extraDiags } =
        compareResolveIntent(actual, expected);

      const fmt = (label, arr) => arr.length ? `\n${label}:\n - ${arr.join("\n - ")}\n` : "";

      assert.ok(
        missingItems.length === 0 && extraItems.length === 0,
        `Resolve intent mismatch for items.` +
        fmt("missingItems", missingItems) +
        fmt("extraItems", extraItems) +
        `\nActual=${JSON.stringify(actual.items, null, 2)}`
      );

      assert.ok(
        missingDiags.length === 0 && extraDiags.length === 0,
        `Resolve diagnostics mismatch.` +
        fmt("missingDiags", missingDiags) +
        fmt("extraDiags", extraDiags) +
        `\nActual=${JSON.stringify(actual.diags, null, 2)}`
      );
    });
  }
});
