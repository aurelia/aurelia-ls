import test, { describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { bindMarkup } from "./_helpers/build-link-bind.mjs";
import { reduceScopeToBindIntent } from "./_helpers/reduce-scope-to-intent.mjs";
import { compareBindIntent } from "./_helpers/compare-bind-intent.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const vectorFiles = fs.readdirSync(__dirname)
  .filter(f => f.endsWith(".json"))
  .sort();

describe("Bind (30)", () => {
  for (const file of vectorFiles) {
    const vectors = JSON.parse(fs.readFileSync(path.join(__dirname, file), "utf8"));

    for (const v of vectors) {
      test(`${v.name}  [${file}]`, async () => {
        const { ir, linked, scope } = await bindMarkup(v.markup, { semOverrides: v.semOverrides });

        const actual = reduceScopeToBindIntent({ ir, linked, scope });
        const expected = v.expect ?? { frames: [], locals: [], exprs: [], diags: [] };

        const { missingFrames, extraFrames, missingLocals, extraLocals, missingExprs, extraExprs, missingDiags, extraDiags } =
          compareBindIntent(actual, expected);

        const fmt = (label, arr) => arr.length ? `\n${label}:\n - ${arr.join("\n - ")}\n` : "";

        assert.ok(
          missingFrames.length === 0 && extraFrames.length === 0,
          `Bind FRAMES mismatch.` +
          fmt("missingFrames", missingFrames) +
          fmt("extraFrames",   extraFrames) +
          `\nActual.frames=${JSON.stringify(actual.frames, null, 2)}`
        );

        assert.ok(
          missingLocals.length === 0 && extraLocals.length === 0,
          `Bind LOCALS mismatch.` +
          fmt("missingLocals", missingLocals) +
          fmt("extraLocals",   extraLocals) +
          `\nActual.locals=${JSON.stringify(actual.locals, null, 2)}`
        );

        assert.ok(
          missingExprs.length === 0 && extraExprs.length === 0,
          `Bind EXPRS mismatch.` +
          fmt("missingExprs", missingExprs) +
          fmt("extraExprs",   extraExprs) +
          `\nActual.exprs=${JSON.stringify(actual.exprs, null, 2)}`
        );

        assert.ok(
          missingDiags.length === 0 && extraDiags.length === 0,
          `Bind DIAGS mismatch.` +
          fmt("missingDiags", missingDiags) +
          fmt("extraDiags",   extraDiags) +
          `\nActual.diags=${JSON.stringify(actual.diags, null, 2)}`
        );
      });
    }
  }
});
