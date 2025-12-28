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

import { test, describe, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createFailureRecorder, fmtList } from "./test-utils.js";
import { deepMergeSemantics } from "./semantics-merge.js";

import {
  getExpressionParser,
  DEFAULT_SYNTAX,
  DEFAULT_SEMANTICS as SEM_DEFAULT,
} from "@aurelia-ls/compiler";

/**
 * Base test vector structure. TExpect allows stage-specific typing of the expect field.
 */
export interface TestVector<TExpect = unknown> {
  name: string;
  markup: string;
  expect?: TExpect;
  file?: string;
  semOverrides?: Record<string, unknown>;
  /** Additional stage-specific properties */
  rootVmType?: string;
  syntheticPrefix?: string;
  [key: string]: unknown;
}

export interface CompilerContext {
  sem: typeof SEM_DEFAULT;
  exprParser: ReturnType<typeof getExpressionParser>;
  attrParser: typeof DEFAULT_SYNTAX;
}

/**
 * Configuration for vector-based tests.
 * - TExpect: shape of the "expect" field in vectors (e.g., { expressions: [...] })
 * - TIntent: shape of the computed result from execute()
 * - TDiff: shape of the diff result from compare()
 */
export interface VectorTestConfig<TExpect, TIntent, TDiff> {
  dirname: string;
  suiteName: string;
  execute: (vector: TestVector<TExpect>, ctx: CompilerContext) => TIntent;
  compare: (actual: TIntent, expected: TExpect) => TDiff;
  categories: string[];
  normalizeExpect?: (expect: TExpect | undefined) => TExpect;
  beforeAll?: () => void;
}

/**
 * Load test vectors from JSON files in a directory.
 */
export function loadVectors<TExpect = unknown>(dirname: string): TestVector<TExpect>[] {
  const vectorFiles = fs
    .readdirSync(dirname)
    .filter((f) => f.endsWith(".json") && f !== "failures.json")
    .sort();

  return vectorFiles.flatMap((file) => {
    const full = path.join(dirname, file);
    const vectors = JSON.parse(fs.readFileSync(full, "utf8")) as TestVector<TExpect>[];
    return vectors.map((v) => ({ ...v, file }));
  });
}

/**
 * Get __dirname equivalent from import.meta.url
 */
export function getDirname(importMetaUrl: string): string {
  return path.dirname(fileURLToPath(importMetaUrl));
}

/**
 * Create common compiler context (parsers, semantics).
 */
export function createCompilerContext(vector: TestVector): CompilerContext {
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
 */
export function lowerOpts(ctx: CompilerContext) {
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
 */
export function runVectorTests<TExpect, TIntent, TDiff>(
  config: VectorTestConfig<TExpect, TIntent, TDiff>
): void {
  const {
    dirname,
    suiteName,
    execute,
    compare,
    categories,
    normalizeExpect = (e) => e as TExpect,
    beforeAll: beforeAllFn,
  } = config;

  const vectors = loadVectors<TExpect>(dirname);
  const { recordFailure, attachWriter } = createFailureRecorder(
    dirname,
    "failures.json"
  );
  attachWriter();

  if (beforeAllFn) beforeAllFn();

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
        const mismatches: Record<
          string,
          { missing: string[]; extra: string[] }
        > = {};
        let anyMismatch = false;

        const diffRecord = diff as Record<string, unknown>;
        for (const cat of categories) {
          const missing =
            (diffRecord[`missing${capitalize(cat)}`] as string[] | undefined) ??
            (diffRecord[`missing_${cat}`] as string[] | undefined) ??
            [];
          const extra =
            (diffRecord[`extra${capitalize(cat)}`] as string[] | undefined) ??
            (diffRecord[`extra_${cat}`] as string[] | undefined) ??
            [];

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
          const missing =
            (diffRecord[`missing${capitalize(cat)}`] as string[] | undefined) ??
            (diffRecord[`missing_${cat}`] as string[] | undefined) ??
            [];
          const extra =
            (diffRecord[`extra${capitalize(cat)}`] as string[] | undefined) ??
            (diffRecord[`extra_${cat}`] as string[] | undefined) ??
            [];

          expect(
            !missing.length && !extra.length,
            `${suiteName.split(" ")[0]} ${cat.toUpperCase()} mismatch.` +
              fmtList(`missing_${cat}`, missing) +
              fmtList(`extra_${cat}`, extra) +
              "\nSee failures.json for full snapshot."
          ).toBe(true);
        }
      });
    }
  });
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Index ExprId -> authored code by walking IR binding sources.
 * Shared utility used by bind, typecheck, and overlay-plan tests.
 */
export function indexExprCodeFromIr(
  ir: {
    templates?: Array<{
      rows?: Array<{
        instructions?: Array<{
          type: string;
          from?: { kind?: string; id?: string; code?: string; exprs?: Array<{ id: string; code: string }> };
          props?: Array<{ type: string; from?: { id?: string; code?: string } }>;
          branch?: { kind?: string; expr?: { id: string; code: string } };
          instructions?: Array<{ from?: { id?: string; code?: string } }>;
        }>;
      }>;
    }>;
  }
): Map<string, string> {
  const map = new Map<string, string>();

  const visitSource = (src: { kind?: string; id?: string; code?: string; exprs?: Array<{ id: string; code: string }> } | undefined) => {
    if (!src) return;
    if (src.kind === "interp") {
      for (const r of src.exprs ?? []) map.set(r.id, r.code);
    } else if (src.id && src.code) {
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
              if (p.type === "propertyBinding") visitSource(p.from as typeof ins.from);
            }
            if (ins.branch?.kind === "case" && ins.branch.expr) {
              visitSource(ins.branch.expr as typeof ins.from);
            }
            break;

          case "hydrateElement":
          case "hydrateAttribute":
            for (const p of ins.props ?? []) {
              if (p.type === "propertyBinding" || p.type === "attributeBinding") {
                visitSource(p.from as typeof ins.from);
              }
            }
            break;

          case "hydrateLetElement":
            for (const lb of ins.instructions ?? []) visitSource(lb.from as typeof ins.from);
            break;

          default:
            break;
        }
      }
    }
  }

  return map;
}
