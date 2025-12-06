/**
 * Resolution + AOT Compilation Integration Tests
 *
 * These tests verify that the resolution pipeline produces correct ResourceGraph
 * and Semantics that the domain compiler can use for AOT compilation.
 *
 * KEY SCENARIOS:
 * 1. Child components with local scope (static dependencies)
 * 2. Global vs local scope resolution
 * 3. Unknown element diagnostics
 * 4. Semantic merge correctness (bindables, modes, aliases)
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
} from "@aurelia-ls/domain";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EXPLICIT_APP = path.resolve(__dirname, "../apps/explicit-app");

/**
 * Create a TypeScript program from the explicit-app tsconfig.
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

/*
 * NOTE: We use materializeSemanticsForScope from the domain package to create
 * scope-specific semantics. Each compilation uses the semantics for its specific
 * scope, which automatically includes the correct resources:
 *
 * - Root scope: global elements only
 * - Local scope: global + local elements
 *
 * This is the proper integration point between resolution and compilation.
 */

/**
 * Compile a template using the domain compiler AOT pipeline.
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

  return {
    plan,
    codeResult,
    ir,
    linked,
    scoped,
  };
}

// =============================================================================
// Test Suite
// =============================================================================

describe("Resolution + AOT Integration: explicit-app", () => {
  let program;
  let resolutionResult;
  let productCardLocalScopeId; // Cached for reuse

  // Helper to create semantics for a specific scope
  const getSemanticsForScope = (scopeId) =>
    materializeSemanticsForScope(DEFAULT_SEMANTICS, resolutionResult.resourceGraph, scopeId);

  // Convenience: root scope semantics
  const getRootSemantics = () => getSemanticsForScope(resolutionResult.resourceGraph.root);

  // Convenience: product-card local scope semantics
  const getProductCardSemantics = () => getSemanticsForScope(productCardLocalScopeId);

  before(() => {
    // Run resolution once for all tests
    program = createProgramFromApp(EXPLICIT_APP);
    resolutionResult = resolve(program);

    // Pre-compute product-card's local scope ID (uses componentPath format from resolution)
    const productCardTemplate = resolutionResult.templates.find(
      (t) => t.resourceName === "product-card",
    );
    if (productCardTemplate) {
      productCardLocalScopeId = `local:${productCardTemplate.componentPath}`;
    }
  });

  describe("Child Component Compilation with Local Scope", () => {
    /**
     * Helper to find expression by ID and verify its AST structure.
     */
    function getExpressionAst(codeResult, exprId) {
      const expr = codeResult.expressions.find((e) => e.id === exprId);
      return expr?.ast;
    }

    /**
     * Verify an AccessScope expression references the expected variable.
     */
    function assertAccessScope(ast, expectedName, message) {
      assert.ok(ast, `${message}: AST should exist`);
      assert.strictEqual(ast.$kind, "AccessScope", `${message}: should be AccessScope`);
      assert.strictEqual(ast.name, expectedName, `${message}: should reference '${expectedName}'`);
    }

    it("compiles product-card with exact instruction structure", () => {
      /*
       * product-card.html contains:
       *   <h3>${name}</h3>
       *   <price-tag amount.bind="price" currency="USD"></price-tag>
       *   <stock-badge in-stock.bind="inStock" count.bind="stockCount"></stock-badge>
       *   <button disabled.bind="!inStock">Add to Cart</button>
       *
       * Expected instructions:
       *   1. textBinding for ${name}
       *   2. hydrateElement for price-tag with nested bindings
       *   3. hydrateElement for stock-badge with nested bindings
       *   4. propertyBinding for disabled on button
       */
      const templatePath = path.join(EXPLICIT_APP, "src/widgets/product-card.html");
      const markup = fs.readFileSync(templatePath, "utf-8");

      const result = compileTemplate(markup, {
        templatePath: normalizePathForId(templatePath),
        name: "product-card",
        semantics: getProductCardSemantics(),
      });

      const { definition: def, expressions } = result.codeResult;

      // Verify exact instruction count (4 instruction groups)
      assert.strictEqual(def.instructions.length, 4, "Should have exactly 4 instruction groups");

      const flatInstructions = def.instructions.flat();

      // === 1. textBinding for ${name} ===
      const textBindings = flatInstructions.filter((i) => i.type === "textBinding");
      assert.strictEqual(textBindings.length, 1, "Should have exactly 1 textBinding");
      const nameTextBinding = textBindings[0];
      assert.ok(nameTextBinding.exprIds?.length >= 1, "textBinding should have exprIds");

      // Verify the expression resolves to AccessScope for "name"
      const nameExprAst = getExpressionAst(result.codeResult, nameTextBinding.exprIds[0]);
      assertAccessScope(nameExprAst, "name", "textBinding expression");

      // === 2. hydrateElement for price-tag ===
      const hydrateElements = flatInstructions.filter((i) => i.type === "hydrateElement");
      assert.strictEqual(hydrateElements.length, 2, "Should have exactly 2 hydrateElement instructions");

      const priceTagHydrate = hydrateElements.find((i) => i.resource === "price-tag");
      assert.ok(priceTagHydrate, "Should have hydrateElement for price-tag");
      assert.ok(Array.isArray(priceTagHydrate.instructions), "price-tag should have nested instructions");
      assert.strictEqual(priceTagHydrate.instructions.length, 2, "price-tag should have 2 nested instructions");

      // Verify price-tag nested instructions
      const priceTagBindings = priceTagHydrate.instructions;
      const amountBinding = priceTagBindings.find((i) => i.type === "propertyBinding" && i.to === "amount");
      assert.ok(amountBinding, "price-tag should have propertyBinding for 'amount'");
      assert.strictEqual(amountBinding.mode, "toView", "amount binding should be toView mode");
      assert.ok(amountBinding.exprId, "amount binding should have exprId");

      // Verify amount expression references "price"
      const amountExprAst = getExpressionAst(result.codeResult, amountBinding.exprId);
      assertAccessScope(amountExprAst, "price", "amount binding expression");

      const currencySetProp = priceTagBindings.find((i) => i.type === "setProperty" && i.to === "currency");
      assert.ok(currencySetProp, "price-tag should have setProperty for 'currency'");
      assert.strictEqual(currencySetProp.value, "USD", "currency should be set to 'USD'");

      // === 3. hydrateElement for stock-badge ===
      const stockBadgeHydrate = hydrateElements.find((i) => i.resource === "stock-badge");
      assert.ok(stockBadgeHydrate, "Should have hydrateElement for stock-badge");
      assert.ok(Array.isArray(stockBadgeHydrate.instructions), "stock-badge should have nested instructions");
      assert.strictEqual(stockBadgeHydrate.instructions.length, 2, "stock-badge should have 2 nested instructions");

      // Verify stock-badge nested instructions
      const stockBadgeBindings = stockBadgeHydrate.instructions;
      const inStockBinding = stockBadgeBindings.find((i) => i.type === "propertyBinding" && i.to === "inStock");
      assert.ok(inStockBinding, "stock-badge should have propertyBinding for 'inStock' (kebab-case mapped)");
      assert.strictEqual(inStockBinding.mode, "toView", "inStock binding should be toView mode");

      // Verify inStock expression references "inStock"
      const inStockExprAst = getExpressionAst(result.codeResult, inStockBinding.exprId);
      assertAccessScope(inStockExprAst, "inStock", "inStock binding expression");

      const countBinding = stockBadgeBindings.find((i) => i.type === "propertyBinding" && i.to === "count");
      assert.ok(countBinding, "stock-badge should have propertyBinding for 'count'");
      assert.strictEqual(countBinding.mode, "toView", "count binding should be toView mode");

      // Verify count expression references "stockCount"
      const countExprAst = getExpressionAst(result.codeResult, countBinding.exprId);
      assertAccessScope(countExprAst, "stockCount", "count binding expression");

      // === 4. propertyBinding for disabled on button ===
      const topLevelPropertyBindings = flatInstructions.filter(
        (i) => i.type === "propertyBinding" && i.to === "disabled",
      );
      assert.strictEqual(topLevelPropertyBindings.length, 1, "Should have exactly 1 top-level propertyBinding for disabled");

      const disabledBinding = topLevelPropertyBindings[0];
      assert.strictEqual(disabledBinding.mode, "toView", "disabled binding should be toView mode");

      // Verify disabled expression is Unary "!" with AccessScope "inStock"
      const disabledExprAst = getExpressionAst(result.codeResult, disabledBinding.exprId);
      assert.ok(disabledExprAst, "disabled expression AST should exist");
      assert.strictEqual(disabledExprAst.$kind, "Unary", "disabled expression should be Unary");
      assert.strictEqual(disabledExprAst.operation, "!", "disabled expression should be negation");
      assertAccessScope(disabledExprAst.expression, "inStock", "disabled negation operand");
    });

    it("verifies expression count matches binding count", () => {
      const templatePath = path.join(EXPLICIT_APP, "src/widgets/product-card.html");
      const markup = fs.readFileSync(templatePath, "utf-8");

      const result = compileTemplate(markup, {
        templatePath: normalizePathForId(templatePath),
        name: "product-card",
        semantics: getProductCardSemantics(),
      });

      const { expressions } = result.codeResult;

      // product-card has 5 expressions:
      // 1. ${name} - text interpolation
      // 2. amount.bind="price"
      // 3. in-stock.bind="inStock"
      // 4. count.bind="stockCount"
      // 5. disabled.bind="!inStock"
      assert.strictEqual(expressions.length, 5, "Should have exactly 5 expressions");

      // Verify all expressions have valid AST structures
      for (const expr of expressions) {
        assert.ok(expr.id, "Expression should have id");
        assert.ok(expr.ast, "Expression should have AST");
        assert.ok(expr.ast.$kind, "Expression AST should have $kind");
      }
    });

    it("verifies targetCount matches hydration targets", () => {
      const templatePath = path.join(EXPLICIT_APP, "src/widgets/product-card.html");
      const markup = fs.readFileSync(templatePath, "utf-8");

      const result = compileTemplate(markup, {
        templatePath: normalizePathForId(templatePath),
        name: "product-card",
        semantics: getProductCardSemantics(),
      });

      const { definition: def } = result.codeResult;

      // targetCount should match the number of DOM nodes that need hydration markers
      // product-card has: h3 text node, price-tag element, stock-badge element, button element
      assert.strictEqual(def.targetCount, 4, "Should have exactly 4 hydration targets");
    });
  });

  describe("Global vs Local Scope Resolution", () => {
    it("global elements are accessible from root scope", () => {
      // nav-bar is globally registered
      const rootSemantics = getRootSemantics();

      assert.ok(rootSemantics.resources.elements["nav-bar"], "nav-bar should be in root scope");
      assert.ok(rootSemantics.resources.elements["data-grid"], "data-grid should be in root scope");
      assert.ok(rootSemantics.resources.elements["user-card"], "user-card should be in root scope");
    });

    it("local elements are only accessible from their owner scope via ResourceGraph", () => {
      // The ResourceGraph controls scope isolation.
      // Use DEFAULT_SEMANTICS (no merged elements) to test pure graph scoping.

      // From local scope, should see local elements
      const { resources: localResources } = materializeResourcesForScope(
        DEFAULT_SEMANTICS, // Not mergedSemantics - test pure graph scoping
        resolutionResult.resourceGraph,
        productCardLocalScopeId,
      );

      assert.ok(localResources.elements["price-tag"], "price-tag should be in local scope");
      assert.ok(localResources.elements["stock-badge"], "stock-badge should be in local scope");

      // From root scope, should NOT see local elements
      const { resources: rootResources } = materializeResourcesForScope(
        DEFAULT_SEMANTICS, // Not mergedSemantics - test pure graph scoping
        resolutionResult.resourceGraph,
        resolutionResult.resourceGraph.root,
      );

      assert.strictEqual(
        rootResources.elements["price-tag"],
        undefined,
        "price-tag should NOT be in root scope",
      );
      assert.strictEqual(
        rootResources.elements["stock-badge"],
        undefined,
        "stock-badge should NOT be in root scope",
      );
    });

    it("local scope inherits from root scope", () => {
      const localSemantics = getProductCardSemantics();

      // Should see global elements from local scope
      assert.ok(localSemantics.resources.elements["nav-bar"], "nav-bar should be accessible from local scope");

      // Should also see local elements
      assert.ok(localSemantics.resources.elements["price-tag"], "price-tag should be accessible from local scope");

      // Should see built-in controllers
      assert.ok(localSemantics.resources.controllers["if"], "if controller should be accessible");
      assert.ok(localSemantics.resources.controllers["repeat"], "repeat controller should be accessible");
    });

    it("compiles my-app template with global elements only", () => {
      // my-app.html uses global elements, no local dependencies
      const templatePath = path.join(EXPLICIT_APP, "src/my-app.html");
      const markup = fs.readFileSync(templatePath, "utf-8");

      const result = compileTemplate(markup, {
        templatePath: normalizePathForId(templatePath),
        name: "my-app",
        semantics: getRootSemantics(),
      });

      assert.ok(result.codeResult, "Should compile my-app template");
      assert.ok(result.codeResult.definition.instructions.length > 0, "Should have instructions");

      console.log("\n=== MY-APP COMPILATION ===");
      console.log(`Targets: ${result.codeResult.definition.targetCount}`);
      console.log(`Instructions: ${result.codeResult.definition.instructions.length}`);
      console.log("=== END MY-APP ===\n");
    });
  });

  describe("Unknown Element Handling", () => {
    it("compiles template with unknown element as plain HTML", () => {
      // An element not in ResourceGraph should be treated as plain HTML
      const markup = `<div>
        <unknown-element foo.bind="bar"></unknown-element>
      </div>`;

      const result = compileTemplate(markup, {
        name: "test",
        semantics: getRootSemantics(),
      });

      // Should compile without error
      assert.ok(result.codeResult, "Should compile template with unknown element");

      // Check linked IR for diagnostics
      const flatDiags = result.linked.diags;
      console.log("\n=== DIAGNOSTICS FOR UNKNOWN ELEMENT ===");
      for (const d of flatDiags) {
        console.log(`  ${d.code}: ${d.message}`);
      }
      console.log("=== END DIAGNOSTICS ===\n");

      // Should NOT have hydrateElement for unknown-element
      const flatInstructions = result.codeResult.definition.instructions.flat();
      const hydrateElements = flatInstructions.filter((i) => i.type === "hydrateElement");
      const unknownHydrate = hydrateElements.find((i) => i.resource === "unknown-element");
      assert.strictEqual(
        unknownHydrate,
        undefined,
        "Should NOT have hydrateElement for unknown-element",
      );
    });

    it("local elements are unknown outside their scope", () => {
      // Try to use price-tag from root scope (it's only available in product-card's local scope)
      const markup = `<div>
        <price-tag amount.bind="100"></price-tag>
      </div>`;

      // Use root scope semantics - price-tag is NOT available from root
      const result = compileTemplate(markup, {
        name: "test",
        semantics: getRootSemantics(), // Only root-scope resources for recognition
      });

      // Should compile (as unknown element / plain HTML)
      assert.ok(result.codeResult, "Should compile template");

      // price-tag should NOT be recognized as a custom element from root scope
      const flatInstructions = result.codeResult.definition.instructions.flat();
      const hydrateElements = flatInstructions.filter((i) => i.type === "hydrateElement");
      const priceTagHydrate = hydrateElements.find((i) => i.resource === "price-tag");
      assert.strictEqual(
        priceTagHydrate,
        undefined,
        "price-tag should NOT be recognized from root scope",
      );
    });
  });

  describe("Semantic Merge Correctness", () => {
    it("preserves bindable modes from resolution", () => {
      // user-card has: @bindable({ mode: 'twoWay' }) selected
      const rootSem = getRootSemantics();
      const userCard = rootSem.resources.elements["user-card"];
      assert.ok(userCard, "Should have user-card in merged semantics");
      assert.ok(userCard.bindables["selected"], "Should have selected bindable");
      assert.strictEqual(
        userCard.bindables["selected"].mode,
        "twoWay",
        "selected should be twoWay mode",
      );
    });

    it("preserves element aliases from resolution", () => {
      // data-grid has: aliases: ["grid", "table-view"]
      const rootSem = getRootSemantics();
      const dataGrid = rootSem.resources.elements["data-grid"];
      assert.ok(dataGrid, "Should have data-grid in merged semantics");
      assert.ok(dataGrid.aliases.includes("grid"), "Should have 'grid' alias");
      assert.ok(dataGrid.aliases.includes("table-view"), "Should have 'table-view' alias");
    });

    it("preserves containerless flag from resolution", () => {
      // user-card and data-grid are containerless
      const rootSem = getRootSemantics();
      const userCard = rootSem.resources.elements["user-card"];
      const dataGrid = rootSem.resources.elements["data-grid"];

      assert.strictEqual(userCard.containerless, true, "user-card should be containerless");
      assert.strictEqual(dataGrid.containerless, true, "data-grid should be containerless");
    });

    it("preserves custom attribute bindables", () => {
      // highlight has: color (primary), intensity
      const rootSem = getRootSemantics();
      const highlight = rootSem.resources.attributes["highlight"];
      assert.ok(highlight, "Should have highlight in merged semantics");
      assert.ok(highlight.bindables["color"], "Should have color bindable");
      assert.ok(highlight.bindables["intensity"], "Should have intensity bindable");
    });

    it("preserves value converters and binding behaviors", () => {
      const rootSem = getRootSemantics();
      assert.ok(
        rootSem.resources.valueConverters["date"],
        "Should have date value converter",
      );
      assert.ok(
        rootSem.resources.valueConverters["currency"],
        "Should have currency value converter",
      );
      assert.ok(
        rootSem.resources.bindingBehaviors["debounce"],
        "Should have debounce binding behavior",
      );
      assert.ok(
        rootSem.resources.bindingBehaviors["throttle"],
        "Should have throttle binding behavior",
      );
    });
  });

  describe("Template Controllers in Child Templates", () => {
    /**
     * Helper to find expression by ID.
     */
    function getExpressionAst(codeResult, exprId) {
      const expr = codeResult.expressions.find((e) => e.id === exprId);
      return expr?.ast;
    }

    it("compiles template with repeat inside child component context", () => {
      /*
       * Template structure:
       *   <div repeat.for="item of items">
       *     <nav-bar></nav-bar>
       *     <span>${item}</span>
       *   </div>
       *
       * Expected:
       *   - Main template: hydrateTemplateController for repeat
       *   - Nested template: hydrateElement for nav-bar, textBinding for ${item}
       */
      const markup = `<div repeat.for="item of items">
        <nav-bar></nav-bar>
        <span>\${item}</span>
      </div>`;

      const result = compileTemplate(markup, {
        name: "test",
        semantics: getRootSemantics(),
        resourceGraph: resolutionResult.resourceGraph,
        resourceScope: resolutionResult.resourceGraph.root,
      });

      const { definition: def, expressions } = result.codeResult;

      // === Main template verification ===
      assert.strictEqual(def.instructions.length, 1, "Main template should have 1 instruction group");

      const flatInstructions = def.instructions.flat();
      const hydrateTC = flatInstructions.find((i) => i.type === "hydrateTemplateController");
      assert.ok(hydrateTC, "Should have hydrateTemplateController");
      assert.strictEqual(hydrateTC.resource, "repeat", "Should be repeat controller");
      assert.ok(typeof hydrateTC.templateIndex === "number", "Should have templateIndex reference");

      // Verify repeat has instructions (the forOf binding)
      assert.ok(Array.isArray(hydrateTC.instructions), "repeat should have instructions array");
      assert.strictEqual(hydrateTC.instructions.length, 1, "repeat should have 1 instruction (iteratorBinding)");
      const iteratorBinding = hydrateTC.instructions[0];
      assert.strictEqual(iteratorBinding.type, "iteratorBinding", "Should be iteratorBinding");
      assert.strictEqual(iteratorBinding.to, "items", "iteratorBinding should bind to 'items'");

      // Verify the iterator expression exists and is a ForOfStatement
      const iteratorExpr = getExpressionAst(result.codeResult, iteratorBinding.exprId);
      assert.ok(iteratorExpr, "Iterator expression should exist");
      assert.strictEqual(iteratorExpr.$kind, "ForOfStatement", "Iterator should be ForOfStatement");

      // === Nested template verification ===
      assert.strictEqual(def.nestedTemplates.length, 1, "Should have 1 nested template");
      const nestedTemplate = def.nestedTemplates[0];
      assert.ok(nestedTemplate.instructions, "Nested template should have instructions");

      const nestedFlat = nestedTemplate.instructions.flat();

      // Should have hydrateElement for nav-bar
      const navBarHydrate = nestedFlat.find((i) => i.type === "hydrateElement" && i.resource === "nav-bar");
      assert.ok(navBarHydrate, "Nested template should have hydrateElement for nav-bar");

      // Should have textBinding for ${item}
      const textBinding = nestedFlat.find((i) => i.type === "textBinding");
      assert.ok(textBinding, "Nested template should have textBinding for ${item}");
      assert.ok(textBinding.exprIds?.length >= 1, "textBinding should have exprIds");

      // Verify the text expression exists and is AccessScope (for loop variable)
      const itemExpr = getExpressionAst(result.codeResult, textBinding.exprIds[0]);
      assert.ok(itemExpr, "Item expression should exist");
      assert.strictEqual(itemExpr.$kind, "AccessScope", "Item should be AccessScope");
    });

    it("compiles template with if/else and child components", () => {
      /*
       * Template structure:
       *   <div if.bind="show">
       *     <user-card name.bind="userName"></user-card>
       *   </div>
       *   <div else>
       *     <span>No user</span>
       *   </div>
       *
       * Expected:
       *   - Main template: hydrateTemplateController for if, hydrateTemplateController for else
       *   - If nested template: hydrateElement for user-card with nested propertyBinding
       *   - Else nested template: no hydrateElement (just plain text)
       */
      const markup = `<div>
        <div if.bind="show">
          <user-card name.bind="userName"></user-card>
        </div>
        <div else>
          <span>No user</span>
        </div>
      </div>`;

      const result = compileTemplate(markup, {
        name: "test",
        semantics: getRootSemantics(),
        resourceGraph: resolutionResult.resourceGraph,
        resourceScope: resolutionResult.resourceGraph.root,
      });

      const { definition: def, expressions } = result.codeResult;
      const flatInstructions = def.instructions.flat();

      // === Template controller verification ===
      const hydrateTCs = flatInstructions.filter((i) => i.type === "hydrateTemplateController");
      assert.strictEqual(hydrateTCs.length, 2, "Should have 2 hydrateTemplateController instructions");

      const ifTC = hydrateTCs.find((i) => i.resource === "if");
      const elseTC = hydrateTCs.find((i) => i.resource === "else");

      assert.ok(ifTC, "Should have hydrateTemplateController for if");
      assert.ok(elseTC, "Should have hydrateTemplateController for else");

      // Verify if has instructions with the condition binding
      assert.ok(Array.isArray(ifTC.instructions), "if should have instructions array");
      assert.strictEqual(ifTC.instructions.length, 1, "if should have 1 instruction (condition binding)");
      const conditionBinding = ifTC.instructions[0];
      assert.strictEqual(conditionBinding.type, "propertyBinding", "Should be propertyBinding");
      assert.strictEqual(conditionBinding.to, "value", "if condition binds to 'value'");
      assert.strictEqual(conditionBinding.mode, "toView", "if condition should be toView mode");

      // Verify condition expression exists and is AccessScope
      const showExpr = getExpressionAst(result.codeResult, conditionBinding.exprId);
      assert.ok(showExpr, "Show expression should exist");
      assert.strictEqual(showExpr.$kind, "AccessScope", "Show should be AccessScope");

      // === Nested templates verification ===
      assert.strictEqual(def.nestedTemplates.length, 2, "Should have 2 nested templates (if and else)");

      // Find the if nested template (contains user-card)
      const ifNestedTemplate = def.nestedTemplates[ifTC.templateIndex];
      assert.ok(ifNestedTemplate, "if nested template should exist");

      const ifNestedFlat = ifNestedTemplate.instructions.flat();
      const userCardHydrate = ifNestedFlat.find((i) => i.type === "hydrateElement" && i.resource === "user-card");
      assert.ok(userCardHydrate, "if nested template should have hydrateElement for user-card");

      // Verify user-card has nested binding for name
      assert.ok(Array.isArray(userCardHydrate.instructions), "user-card should have nested instructions");
      const nameBinding = userCardHydrate.instructions.find(
        (i) => i.type === "propertyBinding" && i.to === "name",
      );
      assert.ok(nameBinding, "user-card should have propertyBinding for 'name'");
      assert.strictEqual(nameBinding.mode, "toView", "name binding should be toView mode");

      // Verify name expression exists and is AccessScope
      const userNameExpr = getExpressionAst(result.codeResult, nameBinding.exprId);
      assert.ok(userNameExpr, "userName expression should exist");
      assert.strictEqual(userNameExpr.$kind, "AccessScope", "userName should be AccessScope");

      // Find the else nested template (no custom elements)
      const elseNestedTemplate = def.nestedTemplates[elseTC.templateIndex];
      assert.ok(elseNestedTemplate, "else nested template should exist");

      const elseNestedFlat = elseNestedTemplate.instructions.flat();
      const elseHydrateElements = elseNestedFlat.filter((i) => i.type === "hydrateElement");
      assert.strictEqual(elseHydrateElements.length, 0, "else nested template should NOT have hydrateElement");
    });
  });

  describe("Cross-Target Consistency", () => {
    it("same template compiles consistently with same semantics", () => {
      const markup = `<div>
        <nav-bar></nav-bar>
        <user-card name.bind="userName" avatar.bind="avatarUrl"></user-card>
      </div>`;

      const rootSem = getRootSemantics();

      // Compile twice with same options
      const result1 = compileTemplate(markup, {
        name: "test",
        semantics: rootSem,
        resourceGraph: resolutionResult.resourceGraph,
        resourceScope: resolutionResult.resourceGraph.root,
      });

      const result2 = compileTemplate(markup, {
        name: "test",
        semantics: rootSem,
        resourceGraph: resolutionResult.resourceGraph,
        resourceScope: resolutionResult.resourceGraph.root,
      });

      // Should produce identical results
      assert.deepStrictEqual(
        result1.codeResult.definition.instructions,
        result2.codeResult.definition.instructions,
        "Instructions should be identical for same input",
      );
    });
  });
});
