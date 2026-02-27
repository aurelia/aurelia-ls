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
import { DiagnosticsRuntime } from "@aurelia-ls/compiler/diagnostics/runtime.js";
import { DEFAULT_SYNTAX } from "@aurelia-ls/compiler/parsing/attribute-parser.js";
import { getExpressionParser } from "@aurelia-ls/compiler/parsing/expression-parser.js";
import { BUILTIN_SEMANTICS, prepareProjectSemantics } from "@aurelia-ls/compiler/schema/registry.js";
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
  diagnostics: DiagnosticsRuntime;
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
  diffChannels?: Record<string, { missingKey: string; extraKey: string }>;
  requiredVectorKeys?: readonly string[];
  allowedVectorKeys?: readonly string[];
  requiredExpectKeys?: readonly string[];
  allowedExpectKeys?: readonly string[];
  normalizeExpect?: (expect: TExpect | undefined) => TExpect;
  beforeAll?: () => void;
}

interface VectorValidationOptions {
  suiteName?: string;
  categories?: readonly string[];
  requiredVectorKeys?: readonly string[];
  allowedVectorKeys?: readonly string[];
  requiredExpectKeys?: readonly string[];
  allowedExpectKeys?: readonly string[];
}

const DEFAULT_REQUIRED_VECTOR_KEYS = ["name", "markup"] as const;
const DEFAULT_ALLOWED_VECTOR_KEYS = [
  "name",
  "markup",
  "expect",
  "semOverrides",
  "rootVmType",
  "syntheticPrefix",
  "comment",
  "_comment",
  "spec",
] as const;

/**
 * Load test vectors from JSON files in a directory.
 */
export function loadVectors<TExpect = unknown>(
  dirname: string,
  options: VectorValidationOptions = {}
): TestVector<TExpect>[] {
  const vectorFiles = fs
    .readdirSync(dirname)
    .filter((f) => f.endsWith(".json") && f !== "failures.json")
    .sort();

  return vectorFiles.flatMap((file) => {
    const full = path.join(dirname, file);
    const payload = JSON.parse(fs.readFileSync(full, "utf8")) as unknown;
    const vectors = validateVectorsInFile(payload, file, options) as TestVector<TExpect>[];
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
  const baseSem = vector.semOverrides
    ? deepMergeSemantics(SEM_DEFAULT, vector.semOverrides)
    : SEM_DEFAULT;
  const sem = prepareProjectSemantics(baseSem);

  return {
    sem,
    exprParser: getExpressionParser(),
    attrParser: DEFAULT_SYNTAX,
    diagnostics: new DiagnosticsRuntime(),
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
    catalog: ctx.sem.catalog,
    diagnostics: ctx.diagnostics.forSource("lower"),
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
    diffChannels,
    requiredVectorKeys,
    allowedVectorKeys,
    requiredExpectKeys,
    allowedExpectKeys,
    normalizeExpect = (e) => e as TExpect,
    beforeAll: beforeAllFn,
  } = config;

  const vectors = loadVectors<TExpect>(dirname, {
    suiteName,
    categories,
    requiredVectorKeys,
    allowedVectorKeys,
    requiredExpectKeys,
    allowedExpectKeys,
  });
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
        const channelSpecs = createDiffChannelSpecs(categories, diffChannels);
        for (const cat of categories) {
          const missing = readDiffChannel(
            diffRecord,
            channelSpecs[cat]!.missingKey,
            suiteName,
            v.name,
            cat
          );
          const extra = readDiffChannel(
            diffRecord,
            channelSpecs[cat]!.extraKey,
            suiteName,
            v.name,
            cat
          );

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
          const missing = readDiffChannel(
            diffRecord,
            channelSpecs[cat]!.missingKey,
            suiteName,
            v.name,
            cat
          );
          const extra = readDiffChannel(
            diffRecord,
            channelSpecs[cat]!.extraKey,
            suiteName,
            v.name,
            cat
          );

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

export function createDiffChannelSpecs(
  categories: readonly string[],
  overrides: Record<string, { missingKey: string; extraKey: string }> | undefined
): Record<string, { missingKey: string; extraKey: string }> {
  const specs: Record<string, { missingKey: string; extraKey: string }> = {};
  for (const category of categories) {
    specs[category] = overrides?.[category] ?? {
      missingKey: `missing${capitalize(category)}`,
      extraKey: `extra${capitalize(category)}`,
    };
  }
  return specs;
}

export function validateVectorsInFile(
  payload: unknown,
  fileName: string,
  options: VectorValidationOptions = {}
): TestVector[] {
  if (!Array.isArray(payload)) {
    throw new Error(`${formatVectorErrorPrefix(options.suiteName, fileName)} vector file must be a JSON array.`);
  }

  const requiredVectorKeys = new Set(options.requiredVectorKeys ?? DEFAULT_REQUIRED_VECTOR_KEYS);
  const allowedVectorKeys = new Set(options.allowedVectorKeys ?? DEFAULT_ALLOWED_VECTOR_KEYS);
  const requiredExpectKeys = new Set(options.requiredExpectKeys ?? []);
  const allowedExpectKeys = new Set(options.allowedExpectKeys ?? options.categories ?? []);
  const enforceExpectKeys = allowedExpectKeys.size > 0 || requiredExpectKeys.size > 0;

  const vectors: TestVector[] = [];
  payload.forEach((entry, index) => {
    if (!isPlainObject(entry)) {
      throw new Error(
        `${formatVectorErrorPrefix(options.suiteName, fileName)} vector #${index + 1} must be an object.`
      );
    }
    const vector = entry as TestVector;

    for (const key of requiredVectorKeys) {
      if (!(key in vector)) {
        throw new Error(
          `${formatVectorErrorPrefix(options.suiteName, fileName)} vector "${vector.name ?? `#${index + 1}`}" is missing required key "${key}".`
        );
      }
    }

    if (typeof vector.name !== "string" || vector.name.trim().length === 0) {
      throw new Error(
        `${formatVectorErrorPrefix(options.suiteName, fileName)} vector #${index + 1} must provide non-empty string "name".`
      );
    }
    if (typeof vector.markup !== "string") {
      throw new Error(
        `${formatVectorErrorPrefix(options.suiteName, fileName)} vector "${vector.name}" must provide string "markup".`
      );
    }

    for (const key of Object.keys(vector)) {
      if (!allowedVectorKeys.has(key)) {
        throw new Error(
          `${formatVectorErrorPrefix(options.suiteName, fileName)} vector "${vector.name}" has unknown top-level key "${key}".`
        );
      }
    }

    if (vector.expect !== undefined) {
      if (!isPlainObject(vector.expect)) {
        throw new Error(
          `${formatVectorErrorPrefix(options.suiteName, fileName)} vector "${vector.name}" must provide object "expect" when present.`
        );
      }
      const expectRecord = vector.expect as Record<string, unknown>;
      if (enforceExpectKeys) {
        for (const key of requiredExpectKeys) {
          if (!(key in expectRecord)) {
            throw new Error(
              `${formatVectorErrorPrefix(options.suiteName, fileName)} vector "${vector.name}" expect is missing required key "${key}".`
            );
          }
        }
        for (const key of Object.keys(expectRecord)) {
          if (!allowedExpectKeys.has(key)) {
            throw new Error(
              `${formatVectorErrorPrefix(options.suiteName, fileName)} vector "${vector.name}" expect has unknown key "${key}".`
            );
          }
        }
      }
    }

    vectors.push(vector);
  });

  return vectors;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object") return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function formatVectorErrorPrefix(suiteName: string | undefined, fileName: string): string {
  return suiteName ? `${suiteName}: ${fileName}` : fileName;
}

export function readDiffChannel(
  diff: Record<string, unknown>,
  key: string,
  suiteName: string,
  vectorName: string,
  category: string
): string[] {
  if (!(key in diff)) {
    throw new Error(
      `${suiteName}: compare() must provide diff channel "${key}" for category "${category}" (vector "${vectorName}").`
    );
  }

  const value = diff[key];
  if (!Array.isArray(value)) {
    throw new Error(
      `${suiteName}: diff channel "${key}" must be an array for category "${category}" (vector "${vectorName}").`
    );
  }

  if (!value.every((entry) => typeof entry === "string")) {
    throw new Error(
      `${suiteName}: diff channel "${key}" must contain strings for category "${category}" (vector "${vectorName}").`
    );
  }

  return value;
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
