/**
 * Resolution + AOT Compilation Integration Tests
 *
 * Tests that resolution produces correct ResourceGraph and Semantics
 * that the AOT compiler can use for AOT compilation.
 *
 * Test structure:
 * 1. Template Compilation (data-driven) - verify compiled instructions match expected
 * 2. Scope Isolation (procedural) - verify local/global scope boundaries
 * 3. Semantic Correctness (procedural) - verify resolution extracts correct metadata
 */

import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import * as ts from "typescript";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

import { resolve } from "../../out/resolve.js";
import {
  DEFAULT_SEMANTICS,
  normalizePathForId,
  materializeResourcesForScope,
  materializeSemanticsForScope,
  lowerDocument,
  resolveHost,
  bindScopes,
  planAot,
  emitAotCode,
  DEFAULT_SYNTAX,
  getExpressionParser,
  INSTRUCTION_TYPE,
  BINDING_MODE,
} from "@aurelia-ls/compiler";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EXPLICIT_APP = path.resolve(__dirname, "../apps/explicit-app");
const EXPECTED_DIR = path.resolve(__dirname, "expected");

// Set to true to generate/update expected files instead of comparing
const GENERATE_MODE = process.env.GENERATE_EXPECTED === "1";

// =============================================================================
// Utilities: Expression Code Extraction
// =============================================================================

/**
 * Build a map from ExprId to authored expression text.
 * Walks the IR to find all ExprRef instances and collect their code.
 */
function buildExprCodeMap(ir) {
  const map = new Map();

  function collectFromSource(from) {
    if (!from) return;
    if (from.kind === "interp") {
      // Interpolation - collect from each expression and build full text
      for (const expr of from.exprs || []) {
        map.set(expr.id, expr.code);
      }
      // Also store the reconstructed interpolation text
      const fullText = buildInterpolationText(from);
      if (from.exprs?.[0]) {
        map.set(`interp:${from.exprs[0].id}`, fullText);
      }
    } else if (from.id !== undefined) {
      // Single ExprRef
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

/**
 * Reconstruct interpolation text from parts and expressions.
 */
function buildInterpolationText(interp) {
  const parts = interp.parts || [];
  const exprs = interp.exprs || [];
  let result = "";
  for (let i = 0; i < parts.length; i++) {
    result += parts[i];
    if (i < exprs.length) {
      result += "${" + exprs[i].code + "}";
    }
  }
  return result;
}

// =============================================================================
// Utilities: AOT Output Reduction (Human-Readable Format)
// =============================================================================

/**
 * Reduce AOT emit result to a human-readable format.
 * Includes expression text and clear property names.
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
        tag: inst.resource,
        bindings: inst.instructions.map((i) => reduceNestedBinding(i, exprCodeMap)),
        containerless: inst.containerless || false,
      };

    case "hydrateAttribute":
      return {
        kind: "attribute",
        target: targetIdx,
        name: inst.resource,
        alias: inst.alias || null,
        bindings: inst.instructions.map((i) => reduceNestedBinding(i, exprCodeMap)),
      };

    case "hydrateTemplateController":
      return {
        kind: "controller",
        target: targetIdx,
        name: inst.resource,
        template: inst.templateIndex,
        bindings: inst.instructions.map((i) => reduceNestedBinding(i, exprCodeMap)),
      };

    case "hydrateLetElement":
      return {
        kind: "let",
        target: targetIdx,
        bindings: inst.bindings.map((b) => ({
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

  // Compare counts
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
// Utilities: TypeScript Program & Compilation
// =============================================================================

/**
 * Create a TypeScript program from an app's tsconfig.
 */
function createProgramFromApp(appPath) {
  const configPath = path.join(appPath, "tsconfig.json");
  const configFile = ts.readConfigFile(configPath, ts.sys.readFile);

  if (configFile.error) {
    throw new Error(
      `Failed to read tsconfig: ${ts.flattenDiagnosticMessageText(configFile.error.messageText, "\n")}`,
    );
  }

  const parsed = ts.parseJsonConfigFileContent(configFile.config, ts.sys, appPath);

  if (parsed.errors.length > 0) {
    const messages = parsed.errors.map((e) =>
      ts.flattenDiagnosticMessageText(e.messageText, "\n"),
    );
    throw new Error(`Failed to parse tsconfig: ${messages.join("\n")}`);
  }

  return ts.createProgram(parsed.fileNames, parsed.options);
}

/**
 * Compile a template using the AOT compiler AOT pipeline.
 */
function compileTemplate(markup, options = {}) {
  const templatePath = options.templatePath ?? "template.html";
  const name = options.name ?? "template";
  const semantics = options.semantics ?? DEFAULT_SEMANTICS;

  const exprParser = getExpressionParser();

  const ir = lowerDocument(markup, {
    attrParser: DEFAULT_SYNTAX,
    exprParser,
    file: templatePath,
    name,
    sem: semantics,
  });

  const resolveOpts = options.resourceGraph
    ? { graph: options.resourceGraph, scope: options.resourceScope ?? null }
    : undefined;

  const linked = resolveHost(ir, semantics, resolveOpts);
  const scoped = bindScopes(linked);

  const plan = planAot(linked, scoped, {
    templateFilePath: templatePath,
  });

  const codeResult = emitAotCode(plan, { name });

  // Build expression code map from IR
  const exprCodeMap = buildExprCodeMap(ir);

  return { codeResult, ir, linked, scoped, plan, exprCodeMap };
}

// =============================================================================
// Test Vectors: Templates to Compile
// =============================================================================

/**
 * Template compilation test vectors.
 */
const TEMPLATE_VECTORS = [
  {
    name: "product-card",
    template: "widgets/product-card.html",
    scope: "local",
    description: "Child component with local dependencies (price-tag, stock-badge)",
  },
  {
    name: "my-app",
    template: "my-app.html",
    scope: "root",
    description: "Root app component with global elements",
  },
  {
    name: "repeat-with-child",
    markup: `<div repeat.for="item of items">
      <nav-bar></nav-bar>
      <span>\${item}</span>
    </div>`,
    scope: "root",
    description: "Template controller (repeat) with child component inside",
  },
  {
    name: "if-else-with-child",
    markup: `<div>
      <div if.bind="show">
        <user-card name.bind="userName"></user-card>
      </div>
      <div else>
        <span>No user</span>
      </div>
    </div>`,
    scope: "root",
    description: "If/else controllers with child component in if branch",
  },
  {
    name: "multiple-elements",
    markup: `<div>
      <nav-bar></nav-bar>
      <user-card name.bind="userName" avatar.bind="avatarUrl"></user-card>
    </div>`,
    scope: "root",
    description: "Multiple global custom elements with bindings",
  },
];

// =============================================================================
// Test Suite
// =============================================================================

describe("Resolution + AOT Integration: explicit-app", () => {
  let program;
  let resolutionResult;
  let productCardLocalScopeId;

  // Scope helpers
  const getSemanticsForScope = (scopeId) =>
    materializeSemanticsForScope(DEFAULT_SEMANTICS, resolutionResult.resourceGraph, scopeId);

  const getRootSemantics = () => getSemanticsForScope(resolutionResult.resourceGraph.root);

  const getProductCardSemantics = () => getSemanticsForScope(productCardLocalScopeId);

  before(() => {
    program = createProgramFromApp(EXPLICIT_APP);
    resolutionResult = resolve(program);

    // Find product-card's local scope ID
    const productCardTemplate = resolutionResult.templates.find(
      (t) => t.resourceName === "product-card",
    );
    if (productCardTemplate) {
      productCardLocalScopeId = `local:${productCardTemplate.componentPath}`;
    }

    // Ensure expected directory exists
    if (!fs.existsSync(EXPECTED_DIR)) {
      fs.mkdirSync(EXPECTED_DIR, { recursive: true });
    }
  });

  // =========================================================================
  // Section 1: Template Compilation (data-driven)
  // =========================================================================

  describe("Template Compilation", () => {
    for (const vector of TEMPLATE_VECTORS) {
      it(`compiles ${vector.name}: ${vector.description}`, () => {
        // Determine markup source
        let markup;
        let templatePath;
        if (vector.template) {
          templatePath = path.join(EXPLICIT_APP, "src", vector.template);
          markup = fs.readFileSync(templatePath, "utf-8");
        } else {
          markup = vector.markup;
          templatePath = `${vector.name}.html`;
        }

        // Determine scope
        let scopeId;
        if (vector.scope === "root") {
          scopeId = resolutionResult.resourceGraph.root;
        } else if (vector.scope === "local") {
          scopeId = productCardLocalScopeId;
        } else if (typeof vector.scope === "function") {
          scopeId = vector.scope(resolutionResult);
        } else {
          scopeId = vector.scope;
        }

        const semantics = getSemanticsForScope(scopeId);

        // Compile
        const result = compileTemplate(markup, {
          templatePath: vector.template
            ? normalizePathForId(templatePath)
            : templatePath,
          name: vector.name,
          semantics,
          resourceGraph: resolutionResult.resourceGraph,
          resourceScope: scopeId,
        });

        const actual = reduceEmitResult(result.codeResult, result.exprCodeMap);

        // Expected file path
        const expectedPath = path.join(EXPECTED_DIR, `${vector.name}.json`);

        if (GENERATE_MODE) {
          // Generate mode: write actual as expected
          fs.writeFileSync(expectedPath, JSON.stringify(actual, null, 2) + "\n");
          console.log(`  Generated: ${expectedPath}`);
          return;
        }

        // Compare mode: load expected and compare
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
  // Section 2: Scope Isolation (procedural)
  // =========================================================================

  describe("Scope Isolation", () => {
    it("global elements accessible from root scope", () => {
      const rootSem = getRootSemantics();

      assert.ok(rootSem.resources.elements["nav-bar"], "nav-bar in root");
      assert.ok(rootSem.resources.elements["data-grid"], "data-grid in root");
      assert.ok(rootSem.resources.elements["user-card"], "user-card in root");
    });

    it("local elements only in owner scope", () => {
      // From local scope - should see local elements
      const { resources: local } = materializeResourcesForScope(
        DEFAULT_SEMANTICS,
        resolutionResult.resourceGraph,
        productCardLocalScopeId,
      );

      assert.ok(local.elements["price-tag"], "price-tag in local scope");
      assert.ok(local.elements["stock-badge"], "stock-badge in local scope");

      // From root scope - should NOT see local elements
      const { resources: root } = materializeResourcesForScope(
        DEFAULT_SEMANTICS,
        resolutionResult.resourceGraph,
        resolutionResult.resourceGraph.root,
      );

      assert.strictEqual(root.elements["price-tag"], undefined, "price-tag NOT in root");
      assert.strictEqual(root.elements["stock-badge"], undefined, "stock-badge NOT in root");
    });

    it("local scope inherits global elements", () => {
      const localSem = getProductCardSemantics();

      // Global elements accessible from local scope
      assert.ok(localSem.resources.elements["nav-bar"], "nav-bar accessible from local");

      // Local elements also accessible
      assert.ok(localSem.resources.elements["price-tag"], "price-tag accessible from local");

      // Built-in controllers accessible
      assert.ok(localSem.resources.controllers["if"], "if controller accessible");
      assert.ok(localSem.resources.controllers["repeat"], "repeat controller accessible");
    });

    it("local element not recognized from root scope compilation", () => {
      // Try using price-tag from root scope
      const markup = `<price-tag amount.bind="100"></price-tag>`;

      const result = compileTemplate(markup, {
        name: "test",
        semantics: getRootSemantics(),
      });

      // Should NOT have hydrateElement for price-tag
      const flat = result.codeResult.definition.instructions.flat();
      const priceTagHydrate = flat.find(
        (i) => i.type === "hydrateElement" && i.resource === "price-tag"
      );

      assert.strictEqual(priceTagHydrate, undefined, "price-tag not recognized from root");
    });

    it("unknown element compiles as plain HTML", () => {
      const markup = `<unknown-element foo.bind="bar"></unknown-element>`;

      const result = compileTemplate(markup, {
        name: "test",
        semantics: getRootSemantics(),
      });

      // Should compile without hydrateElement
      const flat = result.codeResult.definition.instructions.flat();
      const unknownHydrate = flat.find(
        (i) => i.type === "hydrateElement" && i.resource === "unknown-element"
      );

      assert.strictEqual(unknownHydrate, undefined, "unknown-element not hydrated");
      assert.ok(result.codeResult, "template compiled");
    });
  });

  // =========================================================================
  // Section 3: Semantic Correctness (procedural)
  // =========================================================================

  describe("Semantic Correctness", () => {
    it("preserves bindable modes from resolution", () => {
      const rootSem = getRootSemantics();
      const userCard = rootSem.resources.elements["user-card"];

      assert.ok(userCard, "user-card exists");
      assert.ok(userCard.bindables["selected"], "selected bindable exists");
      assert.strictEqual(userCard.bindables["selected"].mode, "twoWay", "selected is twoWay");
    });

    it("preserves element aliases from resolution", () => {
      const rootSem = getRootSemantics();
      const dataGrid = rootSem.resources.elements["data-grid"];

      assert.ok(dataGrid, "data-grid exists");
      assert.ok(dataGrid.aliases.includes("grid"), "has grid alias");
      assert.ok(dataGrid.aliases.includes("table-view"), "has table-view alias");
    });

    it("preserves containerless flag from resolution", () => {
      const rootSem = getRootSemantics();

      assert.strictEqual(
        rootSem.resources.elements["user-card"].containerless,
        true,
        "user-card containerless"
      );
      assert.strictEqual(
        rootSem.resources.elements["data-grid"].containerless,
        true,
        "data-grid containerless"
      );
    });

    it("preserves custom attribute bindables", () => {
      const rootSem = getRootSemantics();
      const highlight = rootSem.resources.attributes["highlight"];

      assert.ok(highlight, "highlight exists");
      assert.ok(highlight.bindables["color"], "has color bindable");
      assert.ok(highlight.bindables["intensity"], "has intensity bindable");
    });

    it("preserves value converters and binding behaviors", () => {
      const rootSem = getRootSemantics();

      assert.ok(rootSem.resources.valueConverters["date"], "date VC exists");
      assert.ok(rootSem.resources.valueConverters["currency"], "currency VC exists");
      assert.ok(rootSem.resources.bindingBehaviors["debounce"], "debounce BB exists");
      assert.ok(rootSem.resources.bindingBehaviors["throttle"], "throttle BB exists");
    });
  });

  // =========================================================================
  // Section 4: Compilation Consistency
  // =========================================================================

  describe("Compilation Consistency", () => {
    it("same input produces identical output", () => {
      const markup = `<div>
        <nav-bar></nav-bar>
        <user-card name.bind="userName"></user-card>
      </div>`;

      const semantics = getRootSemantics();

      const result1 = compileTemplate(markup, { name: "test", semantics });
      const result2 = compileTemplate(markup, { name: "test", semantics });

      const reduced1 = reduceEmitResult(result1.codeResult, result1.exprCodeMap);
      const reduced2 = reduceEmitResult(result2.codeResult, result2.exprCodeMap);

      assert.deepStrictEqual(reduced1, reduced2, "outputs identical");
    });
  });
});
