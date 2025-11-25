import test, { describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { deepMergeSemantics } from "../../_helpers/semantics-merge.mjs";
import { fmtList } from "../../_helpers/test-utils.mjs";

import { getExpressionParser, DEFAULT_SYNTAX } from "../../../out/index.js";
import { lowerDocument } from "../../../out/compiler/phases/10-lower/lower.js";
import { resolveHost } from "../../../out/compiler/phases/20-resolve-host/resolve.js";
import { bindScopes } from "../../../out/compiler/phases/30-bind/bind.js";
import { planSsr } from "../../../out/compiler/phases/50-plan/ssr/plan.js";
import { emitSsr } from "../../../out/compiler/phases/60-emit/ssr/emit.js";
import { DEFAULT as SEM_DEFAULT } from "../../../out/compiler/language/registry.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const vectorFiles = fs.readdirSync(__dirname)
  .filter((f) => f.endsWith(".json") && f !== "failures.json")
  .sort();
const vectors = vectorFiles.flatMap((file) => {
  const full = path.join(__dirname, file);
  return JSON.parse(fs.readFileSync(full, "utf8")).map((v) => ({ ...v, file }));
});

describe("Emit SSR (60)", () => {
  for (const v of vectors) {
    test(`${v.name}  [${v.file}]`, () => {
      const sem = v.semOverrides ? deepMergeSemantics(SEM_DEFAULT, v.semOverrides) : SEM_DEFAULT;
      const ir = lowerDocument(v.markup, {
        attrParser: DEFAULT_SYNTAX,
        exprParser: getExpressionParser(),
        file: "mem.html",
        name: "mem",
        sem,
      });
      const linked = resolveHost(ir, sem);
      const scope = bindScopes(linked);
      const plan = planSsr(linked, scope);
      const { html, manifest } = emitSsr(plan, linked);
      const parsed = JSON.parse(manifest);

      const intent = {
        manifestVersion: parsed.version,
        templateCount: (parsed.templates ?? []).length,
      };

      const missing = [];
      if (v.expect?.manifestVersion && intent.manifestVersion !== v.expect.manifestVersion) {
        missing.push(`manifestVersion:${v.expect.manifestVersion}`);
      }
      if (v.expect?.templateCount != null && intent.templateCount !== v.expect.templateCount) {
        missing.push(`templateCount:${v.expect.templateCount}`);
      }

      assert.ok(
        missing.length === 0,
        "SSR emit mismatch." + fmtList("missing", missing)
      );
    });
  }
});
