import { describe, it } from "node:test";
import assert from "node:assert";
import * as ts from "typescript";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { extractAllFacts } from "../../out/extraction/index.js";
import { createResolverPipeline } from "../../out/inference/index.js";
import { createRegistrationAnalyzer } from "../../out/registration/index.js";
import { buildResourceGraph } from "../../out/scope/index.js";
import { materializeResourcesForScope } from "@aurelia-ls/domain";
import { DEFAULT_SEMANTICS } from "@aurelia-ls/domain";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EXPLICIT_APP = path.resolve(__dirname, "../apps/explicit-app");

/**
 * Create a TypeScript program from the explicit-app tsconfig.
 */
function createProgramFromApp(appPath) {
  const configPath = path.join(appPath, "tsconfig.json");
  const configFile = ts.readConfigFile(configPath, ts.sys.readFile);

  if (configFile.error) {
    throw new Error(`Failed to read tsconfig: ${ts.flattenDiagnosticMessageText(configFile.error.messageText, "\n")}`);
  }

  const parsed = ts.parseJsonConfigFileContent(
    configFile.config,
    ts.sys,
    appPath,
  );

  if (parsed.errors.length > 0) {
    const messages = parsed.errors.map(e => ts.flattenDiagnosticMessageText(e.messageText, "\n"));
    throw new Error(`Failed to parse tsconfig: ${messages.join("\n")}`);
  }

  return ts.createProgram(parsed.fileNames, parsed.options);
}

/**
 * Filter facts to only include files from the app (not aurelia runtime).
 */
function filterAppFacts(facts, appPath) {
  const filtered = new Map();
  for (const [filePath, fileFacts] of facts) {
    const normalized = filePath.replace(/\\/g, "/");
    if (normalized.includes("/explicit-app/src/")) {
      filtered.set(filePath, fileFacts);
    }
  }
  return filtered;
}

/**
 * Run extraction → inference → registration pipeline.
 */
function runPipeline(appPath) {
  const program = createProgramFromApp(appPath);
  const allFacts = extractAllFacts(program);
  const appFacts = filterAppFacts(allFacts, appPath);

  const pipeline = createResolverPipeline();
  const resolved = pipeline.resolve(appFacts);

  const analyzer = createRegistrationAnalyzer();
  const intents = analyzer.analyze(resolved.candidates, appFacts, program);

  return { program, appFacts, candidates: resolved.candidates, intents };
}

describe("Scope: explicit-app", () => {
  it("builds a ResourceGraph from registration intents", () => {
    const { intents } = runPipeline(EXPLICIT_APP);
    const graph = buildResourceGraph(intents);

    // Should produce a valid graph
    assert.strictEqual(graph.version, "aurelia-resource-graph@1");
    assert.ok(graph.root, "Graph should have a root scope");
    assert.ok(graph.scopes[graph.root], "Root scope should exist");
  });

  it("places global resources in the root scope", () => {
    const { intents } = runPipeline(EXPLICIT_APP);
    const graph = buildResourceGraph(intents);

    // Materialize root scope resources
    const { resources } = materializeResourcesForScope(DEFAULT_SEMANTICS, graph, graph.root);

    // Global elements should be in root scope
    assert.ok(resources.elements["nav-bar"], "nav-bar should be in root scope");
    assert.ok(resources.elements["user-card"], "user-card should be in root scope");
    assert.ok(resources.elements["data-grid"], "data-grid should be in root scope");
    assert.ok(resources.elements["fancy-button"], "fancy-button should be in root scope");

    // Global attributes
    assert.ok(resources.attributes["tooltip"], "tooltip should be in root scope");
    assert.ok(resources.attributes["highlight"], "highlight should be in root scope");

    // Global value converters
    assert.ok(resources.valueConverters["date"], "date should be in root scope");
    assert.ok(resources.valueConverters["currency"], "currency should be in root scope");

    // Global binding behaviors
    assert.ok(resources.bindingBehaviors["debounce"], "debounce should be in root scope");
    assert.ok(resources.bindingBehaviors["throttle"], "throttle should be in root scope");

    console.log("\n=== ROOT SCOPE RESOURCES ===");
    console.log("Elements:", Object.keys(resources.elements).filter(k => !DEFAULT_SEMANTICS.resources.elements[k]));
    console.log("Attributes:", Object.keys(resources.attributes).filter(k => !DEFAULT_SEMANTICS.resources.attributes[k]));
    console.log("Value Converters:", Object.keys(resources.valueConverters).filter(k => !DEFAULT_SEMANTICS.resources.valueConverters[k]));
    console.log("Binding Behaviors:", Object.keys(resources.bindingBehaviors).filter(k => !DEFAULT_SEMANTICS.resources.bindingBehaviors[k]));
    console.log("=== END ROOT SCOPE ===\n");
  });

  it("creates local scopes for components with static dependencies", () => {
    const { intents } = runPipeline(EXPLICIT_APP);
    const graph = buildResourceGraph(intents);

    // Find the local scope for product-card
    const localScopes = Object.values(graph.scopes).filter(
      s => s.id !== graph.root && s.id.startsWith("local:")
    );

    assert.ok(localScopes.length > 0, "Should have at least one local scope");

    // Find product-card's local scope
    const productCardScope = localScopes.find(s => s.id.includes("product-card"));
    assert.ok(productCardScope, "Should have a local scope for product-card");

    console.log("\n=== LOCAL SCOPES ===");
    for (const scope of localScopes) {
      console.log(`Scope: ${scope.id}`);
      console.log(`  Label: ${scope.label}`);
      console.log(`  Parent: ${scope.parent}`);
      console.log(`  Resources:`, scope.resources);
    }
    console.log("=== END LOCAL SCOPES ===\n");
  });

  it("places local resources in component-specific scopes", () => {
    const { intents } = runPipeline(EXPLICIT_APP);
    const graph = buildResourceGraph(intents);

    // Find product-card's local scope
    const productCardScope = Object.values(graph.scopes).find(
      s => s.id.includes("product-card")
    );

    assert.ok(productCardScope, "Should find product-card scope");
    assert.ok(productCardScope.resources?.elements?.["price-tag"], "price-tag should be in product-card scope");
    assert.ok(productCardScope.resources?.elements?.["stock-badge"], "stock-badge should be in product-card scope");

    // Local resources should NOT be in root scope resources (only via overlay)
    const rootScope = graph.scopes[graph.root];
    assert.ok(!rootScope.resources?.elements?.["price-tag"], "price-tag should NOT be in root scope overlay");
    assert.ok(!rootScope.resources?.elements?.["stock-badge"], "stock-badge should NOT be in root scope overlay");
  });

  it("supports two-level scope lookup: local → global", () => {
    const { intents } = runPipeline(EXPLICIT_APP);
    const graph = buildResourceGraph(intents);

    // Find product-card's local scope ID
    const productCardScopeId = Object.keys(graph.scopes).find(
      id => id.includes("product-card")
    );
    assert.ok(productCardScopeId, "Should find product-card scope ID");

    // Materialize resources for product-card's local scope
    const { resources } = materializeResourcesForScope(
      DEFAULT_SEMANTICS,
      graph,
      productCardScopeId
    );

    // Should have local resources (from product-card scope)
    assert.ok(resources.elements["price-tag"], "price-tag should be visible in product-card context");
    assert.ok(resources.elements["stock-badge"], "stock-badge should be visible in product-card context");

    // Should also have global resources (from root scope)
    assert.ok(resources.elements["nav-bar"], "nav-bar (global) should be visible in product-card context");
    assert.ok(resources.valueConverters["date"], "date (global) should be visible in product-card context");
    assert.ok(resources.bindingBehaviors["debounce"], "debounce (global) should be visible in product-card context");

    // Should have built-in resources (from semantics)
    assert.ok(resources.controllers["if"], "if (built-in) should be visible in product-card context");
    assert.ok(resources.controllers["repeat"], "repeat (built-in) should be visible in product-card context");
  });

  it("preserves bindable information in the resource graph", () => {
    const { intents } = runPipeline(EXPLICIT_APP);
    const graph = buildResourceGraph(intents);

    const { resources } = materializeResourcesForScope(DEFAULT_SEMANTICS, graph, graph.root);

    // Check user-card bindables (has name, avatar, selected)
    const userCard = resources.elements["user-card"];
    assert.ok(userCard, "user-card should be in graph");
    assert.ok(userCard.bindables, "user-card should have bindables");
    assert.ok(userCard.bindables["name"], "user-card should have 'name' bindable");
    assert.ok(userCard.bindables["avatar"], "user-card should have 'avatar' bindable");
    assert.ok(userCard.bindables["selected"], "user-card should have 'selected' bindable");

    // Check data-grid bindables
    const dataGrid = resources.elements["data-grid"];
    assert.ok(dataGrid, "data-grid should be in graph");
    assert.ok(dataGrid.bindables, "data-grid should have bindables");
    assert.ok(dataGrid.bindables["items"], "data-grid should have 'items' bindable");
    assert.ok(dataGrid.bindables["columns"], "data-grid should have 'columns' bindable");

    console.log("\n=== ELEMENT BINDABLES ===");
    console.log("user-card:", userCard.bindables);
    console.log("data-grid:", dataGrid.bindables);
    console.log("=== END BINDABLES ===\n");
  });
});
