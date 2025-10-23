import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { getAureliaParsers } from "./_helpers/parsers.mjs";
import { reduceIrToLowerIntent, compareIntent } from "./_helpers/reduce-ir-to-intent.mjs";

const lowerUrl = new URL("../../out/compiler/phases/10-lower/lower.js", import.meta.url);
const { lowerDocument } = await import(lowerUrl.href);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const vectorsPath = path.join(__dirname, "lower-cases.json");
const vectors = JSON.parse(fs.readFileSync(vectorsPath, "utf8"));

const { attrParser, exprParser } = getAureliaParsers();

for (const v of vectors) {
  test(v.name, () => {
    const ir = lowerDocument(v.markup, {
      attrParser,
      exprParser,
      file: "mem.html",
      name: "mem"
    });

    const intent = reduceIrToLowerIntent(ir);

    const { missing, extra } = compareIntent(intent, v.expect ?? {});
    const msg = (label, arr) => arr.length ? `\n${label}:\n - ${arr.join("\n - ")}\n` : "";

    assert.ok(
      missing.expressions.length === 0 &&
      missing.controllers.length === 0 &&
      missing.lets.length === 0,
      `Lower intent is missing expected items.${msg("missing.expressions", missing.expressions)}${msg("missing.controllers", missing.controllers)}${msg("missing.lets", missing.lets)}\nActual=${JSON.stringify(intent, null, 2)}`
    );

    assert.ok(
      extra.expressions.length === 0 &&
      extra.controllers.length === 0 &&
      extra.lets.length === 0,
      `Lower intent has unexpected extras.${msg("extra.expressions", extra.expressions)}${msg("extra.controllers", extra.controllers)}${msg("extra.lets", extra.lets)}`
    );
  });
}
