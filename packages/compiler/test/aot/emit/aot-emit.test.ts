/**
 * AOT Emit Tests
 *
 * Tests the emit stage: AotPlan → SerializedDefinition
 *
 * These vectors verify that the serialized instruction output matches
 * expected structures, preparing for parity tests against Aurelia's
 * template-compiler.
 */

import { test, describe } from "vitest";
import assert from "node:assert/strict";
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
  DEFAULT as SEM_DEFAULT,
  INSTRUCTION_TYPE,
  BINDING_MODE,
} from "../../../out/compiler/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load test vectors
function loadVectors() {
  const vectorFiles = fs.readdirSync(__dirname)
    .filter((f) => f.endsWith(".json") && f !== "failures.json")
    .sort();

  return vectorFiles.flatMap((file) => {
    const full = path.join(__dirname, file);
    return JSON.parse(fs.readFileSync(full, "utf8")).map((v) => ({ ...v, file }));
  });
}

// Create compiler context
function createCompilerContext(vector) {
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
function runPipeline(markup, ctx) {
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
function reduceEmitIntent(result) {
  const { definition, expressions } = result;

  return {
    instructions: flattenInstructions(definition.instructions),
    nested: definition.nestedTemplates.map((t) => ({
      name: t.name,
      instructions: flattenInstructions(t.instructions),
    })),
    targetCount: definition.targetCount,
    exprCount: expressions.length,
  };
}

// Map numeric instruction type to string name for readable fingerprints
const TYPE_NAMES = Object.fromEntries(
  Object.entries(INSTRUCTION_TYPE).map(([k, v]) => [v, k])
);

function getTypeName(type) {
  return TYPE_NAMES[type] ?? String(type);
}

// Map numeric binding mode to string name for readable fingerprints
const MODE_NAMES = Object.fromEntries(
  Object.entries(BINDING_MODE).map(([k, v]) => [v, k])
);

function getModeName(mode) {
  return MODE_NAMES[mode] ?? String(mode);
}

// Flatten 2D instruction array to array of instruction summaries
function flattenInstructions(rows) {
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
        resource: inst.resource,
        propCount: inst.instructions.length,
        containerless: inst.containerless ?? false,
      };

    case "hydrateAttribute":
      return {
        ...base,
        resource: inst.resource,
        alias: inst.alias,
        propCount: inst.instructions.length,
      };

    case "hydrateTemplateController":
      return {
        ...base,
        resource: inst.resource,
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

  const { missing: missingNested, extra: extraNested } =
    diffByKey(actual.nested ?? [], expected.nested ?? [], (n) => n.name);

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
      assert.ok(
        diff.missingInstructions.length === 0 && diff.extraInstructions.length === 0,
        `Instruction mismatch.` +
        fmtList("missing", diff.missingInstructions) +
        fmtList("extra", diff.extraInstructions) +
        "\nSee failures.json for details."
      );

      // Order mismatch assertion (for order-sensitive tests)
      if (orderSensitive && diff.orderMismatches?.length > 0) {
        const orderMsg = diff.orderMismatches.map((m) =>
          `[${m.position}] expected ${instructionKey(m.expected)}, got ${instructionKey(m.actual)}`
        ).join("\n  ");
        assert.fail(`Instruction order mismatch:\n  ${orderMsg}`);
      }

      assert.ok(
        diff.missingNested.length === 0 && diff.extraNested.length === 0,
        `Nested template mismatch.` +
        fmtList("missing", diff.missingNested) +
        fmtList("extra", diff.extraNested)
      );

      assert.ok(
        diff.countMismatches.length === 0,
        `Count mismatch: ${diff.countMismatches.join(", ")}`
      );
    });
  }
});
