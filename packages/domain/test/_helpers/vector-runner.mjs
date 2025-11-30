/**
 * Vector Test Runner
 *
 * Shared infrastructure for vector-based tests. Reduces boilerplate across
 * stage test files by handling:
 * - Vector loading from JSON files
 * - Failure recording
 * - Test loop with diff-based assertions
 *
 * Usage:
 *   runVectorTests({
 *     dirname: import.meta.dirname,
 *     suiteName: "Lower (10)",
 *     execute: (v, ctx) => reduceIrToLowerIntent(lowerDocument(v.markup, ctx.opts)),
 *     compare: (actual, expected) => compareLowerIntent(actual, expected),
 *     categories: ["expressions", "controllers", "lets", "elements", "attributes"],
 *   });
 */

import test, { describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createFailureRecorder, fmtList } from "./test-utils.mjs";
import { deepMergeSemantics } from "./semantics-merge.mjs";

import {
  getExpressionParser,
  DEFAULT_SYNTAX,
  DEFAULT as SEM_DEFAULT,
} from "../../out/compiler/index.js";

/**
 * Load test vectors from JSON files in a directory.
 * @param {string} dirname - Directory containing JSON vector files
 * @returns {Array<{name: string, markup: string, expect: object, file: string, ...rest}>}
 */
export function loadVectors(dirname) {
  const vectorFiles = fs.readdirSync(dirname)
    .filter((f) => f.endsWith(".json") && f !== "failures.json")
    .sort();

  return vectorFiles.flatMap((file) => {
    const full = path.join(dirname, file);
    return JSON.parse(fs.readFileSync(full, "utf8")).map((v) => ({ ...v, file }));
  });
}

/**
 * Get __dirname equivalent from import.meta.url
 * @param {string} importMetaUrl - import.meta.url from calling module
 * @returns {string}
 */
export function getDirname(importMetaUrl) {
  return path.dirname(fileURLToPath(importMetaUrl));
}

/**
 * Create common compiler context (parsers, semantics).
 * @param {object} vector - Test vector with optional semOverrides
 * @returns {{sem: object, exprParser: object, attrParser: object}}
 */
export function createCompilerContext(vector) {
  const sem = vector.semOverrides
    ? deepMergeSemantics(SEM_DEFAULT, vector.semOverrides)
    : SEM_DEFAULT;

  return {
    sem,
    exprParser: getExpressionParser(),
    attrParser: DEFAULT_SYNTAX,
  };
}

/**
 * Standard options for lowerDocument.
 * @param {object} ctx - Context from createCompilerContext
 * @returns {object}
 */
export function lowerOpts(ctx) {
  return {
    attrParser: ctx.attrParser,
    exprParser: ctx.exprParser,
    file: "mem.html",
    name: "mem",
    sem: ctx.sem,
  };
}

/**
 * Run vector-based tests with configurable execution, comparison, and categories.
 *
 * @param {object} config
 * @param {string} config.dirname - Directory containing test vectors (use getDirname(import.meta.url))
 * @param {string} config.suiteName - Name for the test suite (e.g., "Lower (10)")
 * @param {Function} config.execute - (vector, ctx) => intent - Execute pipeline and return intent
 * @param {Function} config.compare - (actual, expected) => diff - Compare intents
 * @param {string[]} config.categories - Names of diff categories to assert (e.g., ["frames", "locals"])
 * @param {Function} [config.normalizeExpect] - (expect) => normalized - Optional normalizer for expected values
 * @param {Function} [config.beforeAll] - Optional setup before all tests
 */
export function runVectorTests(config) {
  const {
    dirname,
    suiteName,
    execute,
    compare,
    categories,
    normalizeExpect = (e) => e ?? {},
    beforeAll,
  } = config;

  const vectors = loadVectors(dirname);
  const { recordFailure, attachWriter } = createFailureRecorder(dirname, "failures.json");
  attachWriter();

  if (beforeAll) beforeAll();

  describe(suiteName, () => {
    for (const v of vectors) {
      const testName = v.file ? `${v.name}  [${v.file}]` : v.name;

      test(testName, () => {
        const ctx = createCompilerContext(v);

        // Execute the pipeline
        const intent = execute(v, ctx);
        const expected = normalizeExpect(v.expect);
        const diff = compare(intent, expected);

        // Check for any mismatches across all categories
        const mismatches = {};
        let anyMismatch = false;

        for (const cat of categories) {
          const missing = diff[`missing${capitalize(cat)}`] ?? diff[`missing_${cat}`] ?? [];
          const extra = diff[`extra${capitalize(cat)}`] ?? diff[`extra_${cat}`] ?? [];

          if (missing.length || extra.length) {
            anyMismatch = true;
            mismatches[cat] = { missing, extra };
          }
        }

        // Record failure if any mismatch
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

        // Assert each category
        for (const cat of categories) {
          const missing = diff[`missing${capitalize(cat)}`] ?? diff[`missing_${cat}`] ?? [];
          const extra = diff[`extra${capitalize(cat)}`] ?? diff[`extra_${cat}`] ?? [];

          assert.ok(
            !missing.length && !extra.length,
            `${suiteName.split(" ")[0]} ${cat.toUpperCase()} mismatch.` +
            fmtList(`missing_${cat}`, missing) +
            fmtList(`extra_${cat}`, extra) +
            "\nSee failures.json for full snapshot."
          );
        }
      });
    }
  });
}

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Index ExprId -> authored code by walking IR binding sources.
 * Shared utility used by bind, typecheck, and overlay-plan tests.
 *
 * @param {object} ir - Template IR module
 * @returns {Map<string, string>} ExprId -> code
 */
export function indexExprCodeFromIr(ir) {
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
            if (ins.branch?.kind === "case" && ins.branch.expr) {
              visitSource(ins.branch.expr);
            }
            break;

          case "hydrateElement":
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
