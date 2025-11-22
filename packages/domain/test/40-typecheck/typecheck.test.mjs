import test, { describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createFailureRecorder, diffByKey, fmtList } from "../_helpers/test-utils.mjs";
import { deepMergeSemantics } from "../_helpers/semantics-merge.mjs";

import { getExpressionParser, DEFAULT_SYNTAX } from "../../out/index.js";
import { lowerDocument } from "../../out/compiler/phases/10-lower/lower.js";
import { resolveHost } from "../../out/compiler/phases/20-resolve-host/resolve.js";
import { bindScopes } from "../../out/compiler/phases/30-bind/bind.js";
import { typecheck } from "../../out/compiler/phases/40-typecheck/typecheck.js";
import { DEFAULT as SEM_DEFAULT } from "../../out/compiler/language/registry.js";

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

describe("Typecheck (40)", () => {
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
      const tc = typecheck({
        linked,
        scope,
        ir,
        rootVmType: v.rootVmType ?? "RootVm",
      });

      const intent = reduceTypecheckIntent({ ir, tc });
      const expected = normalizeTypecheckExpect(v.expect);
      const diff = compareTypecheckIntent(intent, expected);
      const { missingExpected, extraExpected, missingInferred, extraInferred, missingDiags, extraDiags } = diff;

      const anyMismatch =
        missingExpected.length || extraExpected.length ||
        missingInferred.length || extraInferred.length ||
        missingDiags.length || extraDiags.length;

      if (anyMismatch) {
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
        !missingExpected.length && !extraExpected.length,
        "Typecheck EXPECTED mismatch." +
        fmtList("missingExpected", missingExpected) +
        fmtList("extraExpected", extraExpected) +
        "\nSee failures.json for full snapshot."
      );

      assert.ok(
        !missingInferred.length && !extraInferred.length,
        "Typecheck INFERRED mismatch." +
        fmtList("missingInferred", missingInferred) +
        fmtList("extraInferred", extraInferred) +
        "\nSee failures.json for full snapshot."
      );

      assert.ok(
        !missingDiags.length && !extraDiags.length,
        "Typecheck DIAGS mismatch." +
        fmtList("missingDiags", missingDiags) +
        fmtList("extraDiags", extraDiags) +
        "\nSee failures.json for full snapshot."
      );
    });
  }
});

function normalizeTypecheckExpect(expect) {
  return {
    expected: expect?.expected ?? [],
    inferred: expect?.inferred ?? [],
    diags: (expect?.diags ?? []).map((d) => ({
      code: typeof d === "string" ? d : d.code,
      expr: typeof d === "string" ? undefined : d.expr,
      expected: typeof d === "string" ? undefined : d.expected,
      actual: typeof d === "string" ? undefined : d.actual,
    })),
  };
}

function reduceTypecheckIntent({ ir, tc }) {
  const codeIndex = indexExprCodeFromIr(ir);
  const expected = mapEntries(tc.expectedByExpr, codeIndex);
  const inferred = mapEntries(tc.inferredByExpr, codeIndex);
  const diags = (tc.diags ?? []).map((d) => ({
    code: d.code,
    expr: d.exprId ? (codeIndex.get(d.exprId) ?? `(expr:${d.exprId})`) : undefined,
    expected: d.expected,
    actual: d.actual,
  }));
  return { expected, inferred, diags };
}

function mapEntries(mapLike, codeIndex) {
  const out = [];
  if (!mapLike || typeof mapLike.entries !== "function") return out;
  for (const [id, type] of mapLike.entries()) {
    out.push({ code: codeIndex.get(id) ?? `(expr:${id})`, type });
  }
  return out;
}

function compareTypecheckIntent(actual, expected) {
  const { missing: missingExpected, extra: extraExpected } =
    diffByKey(actual.expected, expected.expected, (e) => `${e.code ?? ""}|${e.type ?? ""}`);
  const { missing: missingInferred, extra: extraInferred } =
    diffByKey(actual.inferred, expected.inferred, (e) => `${e.code ?? ""}|${e.type ?? ""}`);
  const { missing: missingDiags, extra: extraDiags } =
    diffByKey(actual.diags, expected.diags, (d) => `${d.code ?? ""}|${d.expr ?? ""}|${d.expected ?? ""}|${d.actual ?? ""}`);

  return { missingExpected, extraExpected, missingInferred, extraInferred, missingDiags, extraDiags };
}

/**
 * Index ExprId -> authored code by walking IR binding sources.
 * Falls back to `(expr:<id>)` labels when the authored code isn't recorded.
 */
function indexExprCodeFromIr(ir) {
  const map = new Map();
  const visitSource = (src) => {
    if (!src) return;
    if (src.kind === "interp") {
      for (const r of src.exprs ?? []) map.set(r.id, r.code);
    } else {
      map.set(src.id, src.code);
    }
  };

  for (const t of ir.templates ?? []) {
    for (const row of t.rows ?? []) {
      for (const ins of row.instructions ?? []) {
        switch (ins.type) {
          case "propertyBinding":
          case "attributeBinding":
          case "stylePropertyBinding":
          case "textBinding":
            visitSource(ins.from);
            break;
          case "listenerBinding":
          case "refBinding":
            visitSource(ins.from);
            break;
          case "hydrateTemplateController":
            for (const p of ins.props ?? []) {
              if (p.type === "propertyBinding") visitSource(p.from);
            }
            if (ins.branch?.kind === "case" && ins.branch.expr) visitSource(ins.branch.expr);
            break;
          case "hydrateElement":
            for (const p of ins.props ?? []) {
              if (p.type === "propertyBinding" || p.type === "attributeBinding") {
                visitSource(p.from);
              }
            }
            break;
          case "hydrateAttribute":
            for (const p of ins.props ?? []) {
              if (p.type === "propertyBinding" || p.type === "attributeBinding") {
                visitSource(p.from);
              }
            }
            break;
          case "hydrateLetElement":
            for (const lb of ins.instructions ?? []) visitSource(lb.from);
            break;
          default:
            break;
        }
      }
    }
  }
  return map;
}
