import test, { describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { fmtList } from "../../_helpers/test-utils.mjs";
import { deepMergeSemantics } from "../../_helpers/semantics-merge.mjs";

import { getExpressionParser, DEFAULT_SYNTAX } from "../../../out/index.js";
import { lowerDocument } from "../../../out/compiler/phases/10-lower/lower.js";
import { resolveHost } from "../../../out/compiler/phases/20-resolve-host/resolve.js";
import { bindScopes } from "../../../out/compiler/phases/30-bind/bind.js";
import { plan as planOverlay } from "../../../out/compiler/phases/50-plan/overlay/plan.js";
import { emitOverlay } from "../../../out/compiler/phases/60-emit/overlay/emit.js";
import { DEFAULT as SEM_DEFAULT } from "../../../out/compiler/language/registry.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const vectorFiles = fs.readdirSync(__dirname)
  .filter((f) => f.endsWith(".json") && f !== "failures.json")
  .sort();
const vectors = vectorFiles.flatMap((file) => {
  const full = path.join(__dirname, file);
  return JSON.parse(fs.readFileSync(full, "utf8")).map((v) => ({ ...v, file }));
});

describe("Emit Overlay (60)", () => {
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
      const plan = planOverlay(linked, scope, { isJs: false, vm: mockVm() });
      const emit = emitOverlay(plan, { isJs: false });

      const missing = [];
      if (v.expect?.mapping != null && emit.mapping.length !== v.expect.mapping) {
        missing.push(`mapping:${v.expect.mapping}`);
      }
      for (const snippet of v.expect?.textIncludes ?? []) {
        if (!emit.text.includes(snippet)) missing.push(`includes:${snippet}`);
      }

      assert.ok(
        missing.length === 0,
        "Overlay emit mismatch." + fmtList("missing", missing)
      );
    });
  }
});

function mockVm() {
  return {
    getRootVmTypeExpr() {
      return "RootVm";
    },
    getSyntheticPrefix() {
      return "__AU_TTC_";
    },
  };
}
