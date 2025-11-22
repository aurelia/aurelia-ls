import test, { describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createFailureRecorder, fmtList } from "../../_helpers/test-utils.mjs";
import { deepMergeSemantics } from "../../_helpers/semantics-merge.mjs";

import { getExpressionParser, DEFAULT_SYNTAX } from "../../../out/index.js";
import { lowerDocument } from "../../../out/compiler/phases/10-lower/lower.js";
import { resolveHost } from "../../../out/compiler/phases/20-resolve-host/resolve.js";
import { bindScopes } from "../../../out/compiler/phases/30-bind/bind.js";
import { planSsr } from "../../../out/compiler/phases/50-plan/ssr/plan.js";
import { DEFAULT as SEM_DEFAULT } from "../../../out/compiler/language/registry.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const vectorFiles = fs.readdirSync(__dirname)
  .filter((f) => f.endsWith(".json") && f !== "failures.json")
  .sort();
const vectors = vectorFiles.flatMap((file) => {
  const full = path.join(__dirname, file);
  return JSON.parse(fs.readFileSync(full, "utf8")).map((v) => ({ ...v, file }));
});

const { recordFailure, attachWriter } = createFailureRecorder(__dirname, "failures.json");
attachWriter();

describe("Plan SSR (50)", () => {
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

      const intent = reduceSsrPlanIntent(plan);
      const expected = normalizeSsrPlanExpect(v.expect);
      const diff = compareSsrIntent(intent, expected);
      const { missing, extra } = diff;

      if (missing.length || extra.length) {
        recordFailure({
          file: v.file,
          name: v.name,
          markup: v.markup,
          expected,
          actual: intent,
          diff,
        });
      }

      assert.ok(
        !missing.length && !extra.length,
        "SSR plan intent mismatch." +
        fmtList("missing", missing) +
        fmtList("extra", extra) +
        "\nSee failures.json for full snapshot."
      );
    });
  }
});

function normalizeSsrPlanExpect(expect) {
  return expect ?? {};
}

function reduceSsrPlanIntent(plan) {
  const tpl = plan.templates?.[0];
  if (!tpl) return { hids: 0, textBindings: 0, bindingKinds: [], controllers: [] };

  const bindingKinds = [];
  for (const list of Object.values(tpl.bindingsByHid ?? {})) {
    for (const b of list ?? []) bindingKinds.push(b.kind);
  }
  const controllers = [];
  for (const list of Object.values(tpl.controllersByHid ?? {})) {
    for (const c of list ?? []) controllers.push(c.res);
  }

  return {
    hids: Object.keys(tpl.hidByNode ?? {}).length,
    textBindings: tpl.textBindings?.length ?? 0,
    bindingKinds,
    controllers,
  };
}

function compareSsrIntent(actual, expected) {
  const missing = [];
  const extra = [];

  const check = (label, actualVal, expectedVal) => {
    if (expectedVal === undefined) return;
    if (Array.isArray(expectedVal)) {
      const aSet = new Set((actualVal ?? []).map(String));
      const eSet = new Set(expectedVal.map(String));
      for (const e of eSet) if (!aSet.has(e)) missing.push(`${label}:${e}`);
      for (const a of aSet) if (!eSet.has(a)) extra.push(`${label}:${a}`);
    } else {
      if (actualVal !== expectedVal) {
        missing.push(`${label}:${expectedVal}`);
        extra.push(`${label}:${actualVal}`);
      }
    }
  };

  check("hids", actual.hids, expected.hids);
  check("textBindings", actual.textBindings, expected.textBindings);
  check("bindingKinds", actual.bindingKinds, expected.bindingKinds);
  check("controllers", actual.controllers, expected.controllers);

  return { missing, extra };
}
