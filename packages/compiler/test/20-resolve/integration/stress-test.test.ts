/**
 * Stress Test: AOT Compiler Kitchen Sink Verification
 *
 * Tests the AOT compiler with deeply nested, complex template combinations:
 * - 4+ level component hierarchy
 * - All template controller types (if/else, repeat, switch, promise, with, portal)
 * - Sibling patterns
 * - Containerless elements
 *
 * Test structure mirrors aot-compile.test.mjs but uses stress-test-app fixture.
 */

import { describe, it, beforeAll, expect, assert } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

import { resolve } from "@aurelia-ls/compiler";
import { createProgramFromApp, getTestAppPath } from "../_helpers/index.js";
import {
  DEFAULT_SEMANTICS,
  normalizePathForId,
  materializeSemanticsForScope,
  lowerDocument,
  resolveHost, buildSemanticsSnapshot,
  bindScopes,
  planAot,
  emitAotCode,
  DEFAULT_SYNTAX,
  getExpressionParser,
  DiagnosticsRuntime,
  INSTRUCTION_TYPE,
  BINDING_MODE,
} from "@aurelia-ls/compiler";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STRESS_APP = getTestAppPath("stress-test-app", import.meta.url);
const EXPECTED_DIR = path.resolve(__dirname, "expected/stress");

// Set to true to generate/update expected files instead of comparing
const GENERATE_MODE = process.env.GENERATE_EXPECTED === "1";

// =============================================================================
// Utilities: Expression Code Extraction
// =============================================================================

/**
 * Build a map from ExprId to authored expression text.
 */
function buildExprCodeMap(ir) {
  const map = new Map();

  function collectFromSource(from) {
    if (!from) return;
    if (from.kind === "interp") {
      for (const expr of from.exprs || []) {
        map.set(expr.id, expr.code);
      }
    } else if (from.id !== undefined) {
      map.set(from.id, from.code);
    }
  }

  function collectFromInstruction(ins) {
    switch (ins.type) {
      case "propertyBinding":
      case "attributeBinding":
      case "stylePropertyBinding":
      case "textBinding":
        collectFromSource(ins.from);
        break;
      case "listenerBinding":
      case "refBinding":
        if (ins.from) map.set(ins.from.id, ins.from.code);
        break;
      case "hydrateElement":
      case "hydrateAttribute":
        for (const prop of ins.props || []) {
          collectFromInstruction(prop);
        }
        break;
      case "hydrateTemplateController":
        for (const prop of ins.props || []) {
          collectFromInstruction(prop);
        }
        break;
      case "hydrateLetElement":
        for (const lb of ins.instructions || []) {
          collectFromSource(lb.from);
        }
        break;
      case "iteratorBinding":
        // ForOfIR has astId and code - map the expression ID to its authored text
        if (ins.forOf) map.set(ins.forOf.astId, ins.forOf.code);
        break;
    }
  }

  for (const template of ir.templates || []) {
    for (const row of template.rows || []) {
      for (const ins of row.instructions || []) {
        collectFromInstruction(ins);
      }
    }
  }

  return map;
}

// =============================================================================
// Utilities: AOT Output Reduction (Human-Readable Format)
// =============================================================================

/**
 * Reduce AOT emit result to a human-readable format.
 */
function reduceEmitResult(result, exprCodeMap) {
  const { definition, expressions } = result;

  return {
    targets: definition.targetCount,
    expressions: expressions.length,
    instructions: flattenInstructions(definition.instructions, exprCodeMap),
    templates: reduceTemplates(definition.nestedTemplates, exprCodeMap),
  };
}

/**
 * Recursively reduce nested templates to readable format.
 */
function reduceTemplates(templates, exprCodeMap) {
  return templates.map((t, i) => {
    const reduced = {
      name: t.name || `template#${i}`,
      instructions: flattenInstructions(t.instructions, exprCodeMap),
    };
    // Include nested templates if present
    if (t.nestedTemplates && t.nestedTemplates.length > 0) {
      reduced.templates = reduceTemplates(t.nestedTemplates, exprCodeMap);
    }
    return reduced;
  });
}

/**
 * Flatten 2D instruction array to readable instruction list.
 */
function flattenInstructions(rows, exprCodeMap) {
  const result = [];
  for (let targetIdx = 0; targetIdx < rows.length; targetIdx++) {
    const row = rows[targetIdx];
    for (const inst of row) {
      result.push(reduceInstruction(inst, targetIdx, exprCodeMap));
    }
  }
  return result;
}

// Map numeric instruction type to string name for switch statements
const TYPE_NAMES = Object.fromEntries(
  Object.entries(INSTRUCTION_TYPE).map(([k, v]) => [v, k])
);
function getTypeName(type) {
  return TYPE_NAMES[type] ?? String(type);
}

// Map numeric binding mode to string name
const MODE_NAMES = Object.fromEntries(
  Object.entries(BINDING_MODE).map(([k, v]) => [v, k])
);
function getModeName(mode) {
  return MODE_NAMES[mode] ?? String(mode);
}

/**
 * Reduce an instruction to human-readable format.
 */
function reduceInstruction(inst, targetIdx, exprCodeMap) {
  const getExpr = (id) => exprCodeMap.get(id) || `<expr:${id}>`;
  const typeName = getTypeName(inst.type);

  switch (typeName) {
    case "propertyBinding":
      return {
        kind: "bind",
        target: targetIdx,
        property: inst.to,
        expr: getExpr(inst.exprId),
        mode: getModeName(inst.mode),
      };

    case "interpolation":
      return {
        kind: "interpolation",
        target: targetIdx,
        attribute: inst.to,
        text: buildInterpolationFromParts(inst.parts, inst.exprIds, exprCodeMap),
      };

    case "textBinding":
      return {
        kind: "text",
        target: targetIdx,
        text: buildInterpolationFromParts(inst.parts, inst.exprIds, exprCodeMap),
      };

    case "listenerBinding":
      return {
        kind: "event",
        target: targetIdx,
        event: inst.to,
        handler: getExpr(inst.exprId),
        capture: inst.capture,
      };

    case "refBinding":
      return {
        kind: "ref",
        target: targetIdx,
        name: inst.to,
      };

    case "setProperty":
      return {
        kind: "setProperty",
        target: targetIdx,
        property: inst.to,
        value: inst.value,
      };

    case "setAttribute":
      return {
        kind: "setAttribute",
        target: targetIdx,
        attribute: inst.to,
        value: inst.value,
      };

    case "hydrateElement":
      return {
        kind: "element",
        target: targetIdx,
        tag: inst.res,
        bindings: inst.instructions.map((i) => reduceNestedBinding(i, exprCodeMap)),
        containerless: inst.containerless || false,
      };

    case "hydrateAttribute":
      return {
        kind: "attribute",
        target: targetIdx,
        name: inst.res,
        alias: inst.alias || null,
        bindings: inst.instructions.map((i) => reduceNestedBinding(i, exprCodeMap)),
      };

    case "hydrateTemplateController":
      return {
        kind: "controller",
        target: targetIdx,
        name: inst.res,
        template: inst.templateIndex,
        bindings: inst.instructions.map((i) => reduceNestedBinding(i, exprCodeMap)),
      };

    case "hydrateLetElement":
      return {
        kind: "let",
        target: targetIdx,
        bindings: inst.instructions.map((b) => ({
          to: b.to,
          expr: getExpr(b.exprId),
        })),
        toBindingContext: inst.toBindingContext,
      };

    case "iteratorBinding":
      return {
        kind: "iterator",
        property: inst.to,
        expr: getExpr(inst.exprId),
      };

    default:
      return { kind: typeName, target: targetIdx };
  }
}

/**
 * Reduce a nested binding (inside hydrateElement/hydrateAttribute).
 */
function reduceNestedBinding(inst, exprCodeMap) {
  const getExpr = (id) => exprCodeMap.get(id) || `<expr:${id}>`;
  const typeName = getTypeName(inst.type);

  switch (typeName) {
    case "propertyBinding":
      return {
        property: inst.to,
        expr: getExpr(inst.exprId),
        mode: getModeName(inst.mode),
      };

    case "setProperty":
      return {
        property: inst.to,
        value: inst.value,
      };

    case "iteratorBinding":
      return {
        iterator: inst.to,
        expr: getExpr(inst.exprId),
      };

    default:
      return { type: typeName };
  }
}

/**
 * Reconstruct interpolation text from parts and expression IDs.
 */
function buildInterpolationFromParts(parts, exprIds, exprCodeMap) {
  let result = "";
  for (let i = 0; i < parts.length; i++) {
    result += parts[i];
    if (i < exprIds.length) {
      const code = exprCodeMap.get(exprIds[i]) || `<expr:${exprIds[i]}>`;
      result += "${" + code + "}";
    }
  }
  return result;
}

/**
 * Generate a unique key for an instruction (for comparison).
 */
function instructionKey(inst) {
  switch (inst.kind) {
    case "bind":
      return `bind|${inst.target}|${inst.property}|${inst.expr}|${inst.mode}`;
    case "text":
      return `text|${inst.target}|${inst.text}`;
    case "interpolation":
      return `interp|${inst.target}|${inst.attribute}|${inst.text}`;
    case "event":
      return `event|${inst.target}|${inst.event}|${inst.handler}`;
    case "ref":
      return `ref|${inst.target}|${inst.name}`;
    case "setProperty":
      return `setProp|${inst.target}|${inst.property}|${JSON.stringify(inst.value)}`;
    case "setAttribute":
      return `setAttr|${inst.target}|${inst.attribute}|${inst.value}`;
    case "element":
      return `elem|${inst.target}|${inst.tag}|${inst.bindings.length}`;
    case "attribute":
      return `attr|${inst.target}|${inst.name}|${inst.bindings.length}`;
    case "controller":
      return `ctrl|${inst.target}|${inst.name}|tpl${inst.template}`;
    case "let":
      return `let|${inst.target}|${inst.bindings.length}`;
    case "iterator":
      return `iter|${inst.property}|${inst.expr}`;
    default:
      return `${inst.kind}|${inst.target}`;
  }
}

/**
 * Compare two reduced emit results.
 */
function compareEmitResults(actual, expected) {
  const errors = [];

  if (actual.targets !== expected.targets) {
    errors.push(`targets: expected ${expected.targets}, got ${actual.targets}`);
  }
  if (actual.expressions !== expected.expressions) {
    errors.push(`expressions: expected ${expected.expressions}, got ${actual.expressions}`);
  }

  // Compare instructions (set-based)
  const actualKeys = new Set(actual.instructions.map(instructionKey));
  const expectedKeys = new Set(expected.instructions.map(instructionKey));

  for (const key of expectedKeys) {
    if (!actualKeys.has(key)) {
      errors.push(`missing: ${key}`);
    }
  }
  for (const key of actualKeys) {
    if (!expectedKeys.has(key)) {
      errors.push(`extra: ${key}`);
    }
  }

  // Compare nested templates
  if (actual.templates.length !== expected.templates.length) {
    errors.push(`templates: expected ${expected.templates.length}, got ${actual.templates.length}`);
  }

  for (let i = 0; i < Math.min(actual.templates.length, expected.templates.length); i++) {
    const actualTpl = actual.templates[i];
    const expectedTpl = expected.templates[i];

    const actualTplKeys = new Set(actualTpl.instructions.map(instructionKey));
    const expectedTplKeys = new Set(expectedTpl.instructions.map(instructionKey));

    for (const key of expectedTplKeys) {
      if (!actualTplKeys.has(key)) {
        errors.push(`template[${i}] missing: ${key}`);
      }
    }
    for (const key of actualTplKeys) {
      if (!expectedTplKeys.has(key)) {
        errors.push(`template[${i}] extra: ${key}`);
      }
    }
  }

  return errors;
}

// =============================================================================
// Utilities: Template Compilation
// =============================================================================

function compileTemplate(markup, options = {}) {
  const templatePath = options.templatePath ?? "template.html";
  const name = options.name ?? "template";
  const semantics = options.semantics ?? DEFAULT_SEMANTICS;
  const moduleResolver = options.moduleResolver ?? ((_specifier: string, _containingFile: string) => null);

  const exprParser = getExpressionParser();
  const diagnostics = new DiagnosticsRuntime();

  const ir = lowerDocument(markup, {
    attrParser: DEFAULT_SYNTAX,
    exprParser,
    file: templatePath,
    name,
    catalog: semantics.catalog,
    diagnostics: diagnostics.forSource("lower"),
  });

  const snapshot = buildSemanticsSnapshot(semantics, {
    resourceGraph: options.resourceGraph ?? null,
    resourceScope: options.resourceScope ?? null,
  });
  const linked = resolveHost(ir, snapshot, {
    moduleResolver,
    templateFilePath: templatePath,
    diagnostics: diagnostics.forSource("resolve-host"),
  });
  const scoped = bindScopes(linked, { diagnostics: diagnostics.forSource("bind") });

  const plan = planAot(linked, scoped, {
    templateFilePath: templatePath,
  });

  const codeResult = emitAotCode(plan, { name });

  const exprCodeMap = buildExprCodeMap(ir);

  return { codeResult, ir, linked, scoped, plan, exprCodeMap };
}

// =============================================================================
// Test Vectors
// =============================================================================

/**
 * Component template vectors (from src/).
 */
const COMPONENT_VECTORS = [
  {
    name: "stress-app",
    template: "stress-app.html",
    scope: "root",
    description: "Root component with outer repeat and footer sibling",
  },
  {
    name: "section-panel",
    template: "components/section-panel.html",
    scope: "root",
    description: "Level 2: section with nested repeat + containerless sibling",
  },
  {
    name: "item-card",
    template: "components/item-card.html",
    scope: "root",
    description: "Level 3: item with if/else branches containing child CE",
  },
  {
    name: "status-badge",
    template: "components/status-badge.html",
    scope: "root",
    description: "Level 4: leaf component with dynamic class",
  },
  {
    name: "info-tag",
    template: "components/info-tag.html",
    scope: "root",
    description: "Containerless component",
  },
  {
    name: "footer-widget",
    template: "components/footer-widget.html",
    scope: "root",
    description: "Simple sibling component",
  },
];

/**
 * Isolated template controller vectors (from templates/).
 */
const TC_VECTORS = [
  {
    name: "tc-if-else",
    template: "templates/tc-if-else.html",
    scope: "root",
    description: "if/else combinations: simple, nested, sequential",
  },
  {
    name: "tc-repeat-nested",
    template: "templates/tc-repeat-nested.html",
    scope: "root",
    description: "repeat patterns: simple, nested, with if, triple nested",
  },
  {
    name: "tc-switch-cases",
    template: "templates/tc-switch-cases.html",
    scope: "root",
    description: "switch/case/default patterns",
  },
  {
    name: "tc-promise-branches",
    template: "templates/tc-promise-branches.html",
    scope: "root",
    description: "promise with pending/then/catch branches",
  },
  {
    name: "tc-with-scope",
    template: "templates/tc-with-scope.html",
    scope: "root",
    description: "with controller scope patterns",
  },
  {
    name: "tc-portal",
    template: "templates/tc-portal.html",
    scope: "root",
    description: "portal controller patterns",
  },
];

/**
 * Mixed complexity vectors (from templates/).
 */
const MIXED_VECTORS = [
  {
    name: "mixed-depth-4",
    template: "templates/mixed-depth-4.html",
    scope: "root",
    description: "4+ level nesting: repeat > repeat > repeat > if",
  },
  {
    name: "mixed-siblings",
    template: "templates/mixed-siblings.html",
    scope: "root",
    description: "Multiple TCs at same level, static elements between",
  },
  {
    name: "mixed-all",
    template: "templates/mixed-all.html",
    scope: "root",
    description: "Kitchen sink: switch > repeat > if, promise, portal, with",
  },
  {
    name: "tc-ce-deep",
    template: "templates/tc-ce-deep.html",
    scope: "root",
    description: "Deep TC > CE > TC nesting: if > CE, repeat > CE, else > CE with internal TCs",
  },
];

const ALL_VECTORS = [...COMPONENT_VECTORS, ...TC_VECTORS, ...MIXED_VECTORS];

// =============================================================================
// Test Suite
// =============================================================================

describe("Stress Test: AOT Compiler Kitchen Sink", () => {
  let program;
  let resolutionResult;

  const getSemanticsForScope = (scopeId) =>
    materializeSemanticsForScope(DEFAULT_SEMANTICS, resolutionResult.resourceGraph, scopeId);

  beforeAll(() => {
    program = createProgramFromApp(STRESS_APP);
    const diagnostics = new DiagnosticsRuntime();
    resolutionResult = resolve(program, { diagnostics: diagnostics.forSource("resolution") });

    // Ensure expected directory exists
    if (!fs.existsSync(EXPECTED_DIR)) {
      fs.mkdirSync(EXPECTED_DIR, { recursive: true });
    }
  });

  // =========================================================================
  // Section 1: Component Templates
  // =========================================================================

  describe("Component Templates (4-level hierarchy)", () => {
    for (const vector of COMPONENT_VECTORS) {
      it(`compiles ${vector.name}: ${vector.description}`, () => {
        const templatePath = path.join(STRESS_APP, "src", vector.template);
        const markup = fs.readFileSync(templatePath, "utf-8");

        const scopeId = resolutionResult.resourceGraph.root;
        const semantics = getSemanticsForScope(scopeId);

        const result = compileTemplate(markup, {
          templatePath: normalizePathForId(templatePath),
          name: vector.name,
          semantics,
          resourceGraph: resolutionResult.resourceGraph,
          resourceScope: scopeId,
        });

        const actual = reduceEmitResult(result.codeResult, result.exprCodeMap);
        const expectedPath = path.join(EXPECTED_DIR, `${vector.name}.json`);

        if (GENERATE_MODE) {
          fs.writeFileSync(expectedPath, JSON.stringify(actual, null, 2) + "\n");
          console.log(`  Generated: ${expectedPath}`);
          return;
        }

        if (!fs.existsSync(expectedPath)) {
          assert.fail(
            `Expected file not found: ${expectedPath}\n` +
            `Run with GENERATE_EXPECTED=1 to generate it.\n` +
            `Actual output:\n${JSON.stringify(actual, null, 2)}`
          );
        }

        const expected = JSON.parse(fs.readFileSync(expectedPath, "utf-8"));
        const errors = compareEmitResults(actual, expected);

        if (errors.length > 0) {
          assert.fail(
            `Instruction mismatch for ${vector.name}:\n` +
            errors.map((e) => `  - ${e}`).join("\n") +
            `\n\nActual:\n${JSON.stringify(actual, null, 2)}` +
            `\n\nExpected:\n${JSON.stringify(expected, null, 2)}`
          );
        }
      });
    }
  });

  // =========================================================================
  // Section 2: Template Controller Isolation
  // =========================================================================

  describe("Template Controller Isolation", () => {
    for (const vector of TC_VECTORS) {
      it(`compiles ${vector.name}: ${vector.description}`, () => {
        const templatePath = path.join(STRESS_APP, "src", vector.template);
        const markup = fs.readFileSync(templatePath, "utf-8");

        const scopeId = resolutionResult.resourceGraph.root;
        const semantics = getSemanticsForScope(scopeId);

        const result = compileTemplate(markup, {
          templatePath: normalizePathForId(templatePath),
          name: vector.name,
          semantics,
          resourceGraph: resolutionResult.resourceGraph,
          resourceScope: scopeId,
        });

        const actual = reduceEmitResult(result.codeResult, result.exprCodeMap);
        const expectedPath = path.join(EXPECTED_DIR, `${vector.name}.json`);

        if (GENERATE_MODE) {
          fs.writeFileSync(expectedPath, JSON.stringify(actual, null, 2) + "\n");
          console.log(`  Generated: ${expectedPath}`);
          return;
        }

        if (!fs.existsSync(expectedPath)) {
          assert.fail(
            `Expected file not found: ${expectedPath}\n` +
            `Run with GENERATE_EXPECTED=1 to generate it.\n` +
            `Actual output:\n${JSON.stringify(actual, null, 2)}`
          );
        }

        const expected = JSON.parse(fs.readFileSync(expectedPath, "utf-8"));
        const errors = compareEmitResults(actual, expected);

        if (errors.length > 0) {
          assert.fail(
            `Instruction mismatch for ${vector.name}:\n` +
            errors.map((e) => `  - ${e}`).join("\n") +
            `\n\nActual:\n${JSON.stringify(actual, null, 2)}` +
            `\n\nExpected:\n${JSON.stringify(expected, null, 2)}`
          );
        }
      });
    }
  });

  // =========================================================================
  // Section 3: Mixed Complexity
  // =========================================================================

  describe("Mixed Complexity (Kitchen Sink)", () => {
    for (const vector of MIXED_VECTORS) {
      it(`compiles ${vector.name}: ${vector.description}`, () => {
        const templatePath = path.join(STRESS_APP, "src", vector.template);
        const markup = fs.readFileSync(templatePath, "utf-8");

        const scopeId = resolutionResult.resourceGraph.root;
        const semantics = getSemanticsForScope(scopeId);

        const result = compileTemplate(markup, {
          templatePath: normalizePathForId(templatePath),
          name: vector.name,
          semantics,
          resourceGraph: resolutionResult.resourceGraph,
          resourceScope: scopeId,
        });

        const actual = reduceEmitResult(result.codeResult, result.exprCodeMap);
        const expectedPath = path.join(EXPECTED_DIR, `${vector.name}.json`);

        if (GENERATE_MODE) {
          fs.writeFileSync(expectedPath, JSON.stringify(actual, null, 2) + "\n");
          console.log(`  Generated: ${expectedPath}`);
          return;
        }

        if (!fs.existsSync(expectedPath)) {
          assert.fail(
            `Expected file not found: ${expectedPath}\n` +
            `Run with GENERATE_EXPECTED=1 to generate it.\n` +
            `Actual output:\n${JSON.stringify(actual, null, 2)}`
          );
        }

        const expected = JSON.parse(fs.readFileSync(expectedPath, "utf-8"));
        const errors = compareEmitResults(actual, expected);

        if (errors.length > 0) {
          assert.fail(
            `Instruction mismatch for ${vector.name}:\n` +
            errors.map((e) => `  - ${e}`).join("\n") +
            `\n\nActual:\n${JSON.stringify(actual, null, 2)}` +
            `\n\nExpected:\n${JSON.stringify(expected, null, 2)}`
          );
        }
      });
    }
  });

  // =========================================================================
  // Section 4: Compilation Consistency
  // =========================================================================

  describe("Compilation Consistency", () => {
    it("same input produces identical output across runs", () => {
      const templatePath = path.join(STRESS_APP, "src", "stress-app.html");
      const markup = fs.readFileSync(templatePath, "utf-8");

      const scopeId = resolutionResult.resourceGraph.root;
      const semantics = getSemanticsForScope(scopeId);

      const result1 = compileTemplate(markup, { name: "test", semantics });
      const result2 = compileTemplate(markup, { name: "test", semantics });

      const reduced1 = reduceEmitResult(result1.codeResult, result1.exprCodeMap);
      const reduced2 = reduceEmitResult(result2.codeResult, result2.exprCodeMap);

      expect(reduced1, "outputs should be identical").toEqual(reduced2);
    });
  });

  // =========================================================================
  // Section 5: Instruction Count Sanity Checks
  // =========================================================================

  describe("Instruction Count Sanity", () => {
    it("stress-app has expected instruction types", () => {
      const templatePath = path.join(STRESS_APP, "src", "stress-app.html");
      const markup = fs.readFileSync(templatePath, "utf-8");

      const scopeId = resolutionResult.resourceGraph.root;
      const semantics = getSemanticsForScope(scopeId);

      const result = compileTemplate(markup, { name: "stress-app", semantics });
      const reduced = reduceEmitResult(result.codeResult, result.exprCodeMap);

      // Should have: text interpolation, repeat controller, element hydration
      const kinds = new Set(reduced.instructions.map(i => i.kind));
      expect(kinds.has("text"), "should have text binding").toBe(true);
      expect(kinds.has("controller"), "should have template controller").toBe(true);
      expect(kinds.has("element"), "should have element hydration").toBe(true);

      // Should have at least one nested template (for repeat)
      expect(reduced.templates.length >= 1, "should have nested templates").toBe(true);
    });

    it("item-card has if/else controllers", () => {
      const templatePath = path.join(STRESS_APP, "src", "components/item-card.html");
      const markup = fs.readFileSync(templatePath, "utf-8");

      const scopeId = resolutionResult.resourceGraph.root;
      const semantics = getSemanticsForScope(scopeId);

      const result = compileTemplate(markup, { name: "item-card", semantics });
      const reduced = reduceEmitResult(result.codeResult, result.exprCodeMap);

      // Count controllers
      const controllers = reduced.instructions.filter(i => i.kind === "controller");
      const ifControllers = controllers.filter(c => c.name === "if");
      const elseControllers = controllers.filter(c => c.name === "else");

      expect(ifControllers.length >= 1, "should have if controller").toBe(true);
      expect(elseControllers.length >= 1, "should have else controller").toBe(true);
    });
  });
});


