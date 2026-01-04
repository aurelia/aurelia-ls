/**
 * AOT Emit Tests
 *
 * Tests the emit stage: AotPlan → SerializedDefinition
 *
 * These vectors verify that the serialized instruction output matches
 * expected structures, preparing for parity tests against Aurelia's
 * template-compiler.
 */

import { test, describe, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createFailureRecorder, fmtList, diffByKey } from "../../_helpers/test-utils.js";
import { deepMergeSemantics } from "../../_helpers/semantics-merge.js";

import {
  lowerDocument,
  resolveHost,
  bindScopes,
  planAot,
  emitAotCode,
  getExpressionParser,
  DEFAULT_SYNTAX,
  DEFAULT_SEMANTICS as SEM_DEFAULT,
  INSTRUCTION_TYPE,
  BINDING_MODE,
} from "@aurelia-ls/compiler";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// --- Types ---

interface TestVector {
  name: string;
  markup: string;
  file?: string;
  semOverrides?: Record<string, unknown>;
  expect?: {
    instructions?: InstructionIntent[];
    nested?: NestedIntent[];
    targetCount?: number;
    exprCount?: number;
  };
  orderSensitive?: boolean;
}

interface CompilerContext {
  sem: typeof SEM_DEFAULT;
  exprParser: ReturnType<typeof getExpressionParser>;
  attrParser: typeof DEFAULT_SYNTAX;
}

interface InstructionIntent {
  type: string;
  target: number;
  to?: string;
  mode?: string;
  parts?: number;
  exprs?: number;
  capture?: boolean;
  value?: unknown;
  resource?: string;
  propCount?: number;
  containerless?: boolean;
  alias?: string;
  templateIndex?: number;
  bindingCount?: number;
  toBindingContext?: boolean;
}

interface NestedIntent {
  name: string;
  instructions?: InstructionIntent[];
  nested?: NestedIntent[];
}

interface EmitIntent {
  instructions: InstructionIntent[];
  nested: NestedIntent[];
  targetCount: number;
  exprCount: number;
}

interface EmitDiff {
  missingInstructions: InstructionIntent[] | string[];
  extraInstructions: InstructionIntent[] | string[];
  orderMismatches: Array<{
    position: number;
    actual: InstructionIntent;
    expected: InstructionIntent;
  }>;
  missingNested: string[];
  extraNested: string[];
  nestedMismatches: string[];
  countMismatches: string[];
}

// Load test vectors
function loadVectors(): TestVector[] {
  const vectorFiles = fs.readdirSync(__dirname)
    .filter((f) => f.endsWith(".json") && f !== "failures.json")
    .sort();

  return vectorFiles.flatMap((file) => {
    const full = path.join(__dirname, file);
    return JSON.parse(fs.readFileSync(full, "utf8")).map((v) => ({ ...v, file }));
  });
}

// Create compiler context
function createCompilerContext(vector: TestVector): CompilerContext {
  const sem = vector.semOverrides
    ? deepMergeSemantics(SEM_DEFAULT, vector.semOverrides)
    : SEM_DEFAULT;

  return {
    sem,
    exprParser: getExpressionParser(),
    attrParser: DEFAULT_SYNTAX,
  };
}

// Run full pipeline: markup → emit
function runPipeline(markup: string, ctx: CompilerContext): unknown {
  const ir = lowerDocument(markup, {
    attrParser: ctx.attrParser,
    exprParser: ctx.exprParser,
    file: "test.html",
    name: "test",
    sem: ctx.sem,
  });
  const linked = resolveHost(ir, ctx.sem);
  const scope = bindScopes(linked);
  const plan = planAot(linked, scope, { templateFilePath: "test.html" });
  const result = emitAotCode(plan, { name: "test" });
  return result;
}

// Reduce emit result to testable intent
interface NestedTemplateResult {
  name: string;
  instructions: unknown[][];
  nestedTemplates?: NestedTemplateResult[];
}

interface EmitResult {
  definition: {
    instructions: unknown[][];
    nestedTemplates: NestedTemplateResult[];
    targetCount: number;
  };
  expressions: unknown[];
}

function reduceNestedTemplate(t: NestedTemplateResult): NestedIntent {
  const result: NestedIntent = {
    name: t.name,
  };

  // Only include instructions if there are any
  const instructions = flattenInstructions(t.instructions);
  if (instructions.length > 0) {
    result.instructions = instructions;
  }

  // Recursively process nested templates
  if (t.nestedTemplates && t.nestedTemplates.length > 0) {
    result.nested = t.nestedTemplates.map(reduceNestedTemplate);
  }

  return result;
}

function reduceEmitIntent(result: EmitResult): EmitIntent {
  const { definition, expressions } = result;

  return {
    instructions: flattenInstructions(definition.instructions),
    nested: definition.nestedTemplates.map(reduceNestedTemplate),
    targetCount: definition.targetCount,
    exprCount: expressions.length,
  };
}

// Map numeric instruction type to string name for readable fingerprints
const TYPE_NAMES = Object.fromEntries(
  Object.entries(INSTRUCTION_TYPE).map(([k, v]) => [v, k])
);

function getTypeName(type: unknown): string {
  return TYPE_NAMES[type as number] ?? String(type);
}

// Map numeric binding mode to string name for readable fingerprints
const MODE_NAMES: Record<number, string> = Object.fromEntries(
  Object.entries(BINDING_MODE).map(([k, v]) => [v, k])
);

function getModeName(mode: unknown): string {
  return MODE_NAMES[mode as number] ?? String(mode);
}

// Flatten 2D instruction array to array of instruction summaries
function flattenInstructions(rows: unknown[][]): InstructionIntent[] {
  const result = [];
  for (let targetIdx = 0; targetIdx < rows.length; targetIdx++) {
    const row = rows[targetIdx];
    for (const inst of row) {
      result.push(reduceInstruction(inst, targetIdx));
    }
  }
  return result;
}

// Reduce instruction to testable summary
// Uses string type names for fingerprinting (readable in failures.json)
function reduceInstruction(inst, targetIdx) {
  const typeName = getTypeName(inst.type);
  const base = { type: typeName, target: targetIdx };

  switch (typeName) {
    case "propertyBinding":
      return { ...base, to: inst.to, mode: getModeName(inst.mode) };

    case "interpolation":
      return { ...base, to: inst.to, parts: inst.parts.length, exprs: inst.exprIds.length };

    case "textBinding":
      return { ...base, parts: inst.parts.length, exprs: inst.exprIds.length };

    case "listenerBinding":
      return { ...base, to: inst.to, capture: inst.capture };

    case "refBinding":
      return { ...base, to: inst.to };

    case "setProperty":
      return { ...base, to: inst.to, value: inst.value };

    case "hydrateElement":
      return {
        ...base,
        resource: inst.res,
        propCount: inst.instructions.length,
        containerless: inst.containerless ?? false,
      };

    case "hydrateAttribute":
      return {
        ...base,
        resource: inst.res,
        alias: inst.alias,
        propCount: inst.instructions.length,
      };

    case "hydrateTemplateController":
      return {
        ...base,
        resource: inst.res,
        templateIndex: inst.templateIndex,
        propCount: inst.instructions.length,
      };

    case "hydrateLetElement":
      return {
        ...base,
        bindingCount: inst.bindings.length,
        toBindingContext: inst.toBindingContext,
      };

    default:
      return base;
  }
}

// Compare nested templates recursively
function compareNestedTemplates(
  actual: NestedIntent[],
  expected: NestedIntent[],
  path: string = ""
): { mismatches: string[] } {
  const mismatches: string[] = [];

  // Build maps for efficient lookup
  const actualMap = new Map(actual.map((n) => [n.name, n]));
  const expectedMap = new Map(expected.map((n) => [n.name, n]));

  // Check for missing/extra templates at this level
  for (const exp of expected) {
    const act = actualMap.get(exp.name);
    const nestedPath = path ? `${path} > ${exp.name}` : exp.name;

    if (!act) {
      mismatches.push(`missing nested template: ${nestedPath}`);
      continue;
    }

    // Compare instructions if expected specifies them
    if (exp.instructions && exp.instructions.length > 0) {
      const actInsts = act.instructions ?? [];
      const { missing, extra } = diffByKey(actInsts, exp.instructions, instructionKey);

      for (const m of missing) {
        mismatches.push(`${nestedPath}: missing instruction ${instructionKey(m)}`);
      }
      for (const e of extra) {
        mismatches.push(`${nestedPath}: extra instruction ${instructionKey(e)}`);
      }
    }

    // Recursively compare nested templates
    if (exp.nested && exp.nested.length > 0) {
      const actNested = act.nested ?? [];
      const nestedResult = compareNestedTemplates(actNested, exp.nested, nestedPath);
      mismatches.push(...nestedResult.mismatches);
    }
  }

  // Check for extra templates not in expected
  for (const act of actual) {
    if (!expectedMap.has(act.name)) {
      const nestedPath = path ? `${path} > ${act.name}` : act.name;
      mismatches.push(`extra nested template: ${nestedPath}`);
    }
  }

  return { mismatches };
}

// Compare emit intents
function compareEmitIntent(actual, expected, orderSensitive = false) {
  let missingInstructions = [];
  let extraInstructions = [];
  const orderMismatches = [];

  if (orderSensitive) {
    // Positional comparison for order-sensitive tests
    const actualInsts = actual.instructions ?? [];
    const expectedInsts = expected.instructions ?? [];

    const maxLen = Math.max(actualInsts.length, expectedInsts.length);
    for (let i = 0; i < maxLen; i++) {
      const actualInst = actualInsts[i];
      const expectedInst = expectedInsts[i];

      if (!actualInst) {
        missingInstructions.push(expectedInst);
      } else if (!expectedInst) {
        extraInstructions.push(actualInst);
      } else if (instructionKey(actualInst) !== instructionKey(expectedInst)) {
        orderMismatches.push({
          position: i,
          actual: actualInst,
          expected: expectedInst,
        });
      }
    }
  } else {
    // Set-based comparison for regular tests
    const result = diffByKey(actual.instructions ?? [], expected.instructions ?? [], instructionKey);
    missingInstructions = result.missing;
    extraInstructions = result.extra;
  }

  // Compare nested templates (names only for backward compatibility)
  const { missing: missingNested, extra: extraNested } =
    diffByKey(actual.nested ?? [], expected.nested ?? [], (n) => n.name);

  // Deep comparison of nested template structure
  const nestedComparison = compareNestedTemplates(actual.nested ?? [], expected.nested ?? []);

  // Compare counts
  const countMismatches = [];
  if (actual.targetCount !== expected.targetCount) {
    countMismatches.push(`targetCount: actual=${actual.targetCount}, expected=${expected.targetCount}`);
  }
  if (expected.exprCount !== undefined && actual.exprCount !== expected.exprCount) {
    countMismatches.push(`exprCount: actual=${actual.exprCount}, expected=${expected.exprCount}`);
  }

  return {
    missingInstructions,
    extraInstructions,
    orderMismatches,
    missingNested,
    extraNested,
    nestedMismatches: nestedComparison.mismatches,
    countMismatches,
  };
}

// Generate unique key for an instruction
// Handles both numeric types (from actual output) and string types (from JSON expected)
function instructionKey(inst) {
  const typeName = getTypeName(inst.type);
  const parts = [typeName, `t${inst.target}`];

  // Use typeName for switch since JSON expected data has string types
  switch (typeName) {
    case "propertyBinding":
      parts.push(inst.to, getModeName(inst.mode));
      break;
    case "interpolation":
      parts.push(inst.to, `${inst.parts}p${inst.exprs}e`);
      break;
    case "textBinding":
      parts.push(`${inst.parts}p${inst.exprs}e`);
      break;
    case "listenerBinding":
      parts.push(inst.to, inst.capture ? "capture" : "bubble");
      break;
    case "refBinding":
      parts.push(inst.to);
      break;
    case "setProperty":
      parts.push(inst.to, String(inst.value));
      break;
    case "hydrateElement":
      parts.push(inst.resource, `${inst.propCount}props`);
      break;
    case "hydrateAttribute":
      parts.push(inst.resource, inst.alias ?? "", `${inst.propCount}props`);
      break;
    case "hydrateTemplateController":
      parts.push(inst.resource, `tpl${inst.templateIndex}`, `${inst.propCount}props`);
      break;
  }

  return parts.join("|");
}

// Main test suite
const vectors = loadVectors();
const { recordFailure, attachWriter } = createFailureRecorder(__dirname, "failures.json");
attachWriter();

describe("AOT Emit (aot:emit)", () => {
  for (const v of vectors) {
    const testName = v.file ? `${v.name}  [${v.file}]` : v.name;

    test(testName, () => {
      const ctx = createCompilerContext(v);
      const result = runPipeline(v.markup, ctx);
      const actual = reduceEmitIntent(result);

      const expected = {
        instructions: v.expect?.instructions ?? [],
        nested: v.expect?.nested ?? [],
        targetCount: v.expect?.targetCount ?? 0,
        exprCount: v.expect?.exprCount,
      };

      // Use order-sensitive comparison for tests that set the flag
      const orderSensitive = v.orderSensitive === true;
      const diff = compareEmitIntent(actual, expected, orderSensitive);

      // Check for any mismatches
      const anyMismatch =
        diff.missingInstructions.length > 0 ||
        diff.extraInstructions.length > 0 ||
        (diff.orderMismatches?.length ?? 0) > 0 ||
        diff.missingNested.length > 0 ||
        diff.extraNested.length > 0 ||
        diff.nestedMismatches.length > 0 ||
        diff.countMismatches.length > 0;

      if (anyMismatch) {
        recordFailure({
          file: v.file,
          name: v.name,
          markup: v.markup,
          expected,
          actual,
          diff,
        });
      }

      // Assertions
      expect(
        diff.missingInstructions.length === 0 && diff.extraInstructions.length === 0,
        `Instruction mismatch.` +
        fmtList("missing", diff.missingInstructions) +
        fmtList("extra", diff.extraInstructions) +
        "\nSee failures.json for details."
      ).toBeTruthy();

      // Order mismatch assertion (for order-sensitive tests)
      if (orderSensitive && diff.orderMismatches?.length > 0) {
        const orderMsg = diff.orderMismatches.map((m) =>
          `[${m.position}] expected ${instructionKey(m.expected)}, got ${instructionKey(m.actual)}`
        ).join("\n  ");
        expect.fail(`Instruction order mismatch:\n  ${orderMsg}`);
      }

      expect(
        diff.missingNested.length === 0 && diff.extraNested.length === 0,
        `Nested template mismatch.` +
        fmtList("missing", diff.missingNested) +
        fmtList("extra", diff.extraNested)
      ).toBeTruthy();

      // Deep nested template structure verification
      expect(
        diff.nestedMismatches.length === 0,
        `Nested structure mismatch:\n  ${diff.nestedMismatches.join("\n  ")}`
      ).toBeTruthy();

      expect(
        diff.countMismatches.length === 0,
        `Count mismatch: ${diff.countMismatches.join(", ")}`
      ).toBeTruthy();
    });
  }
});
