import { describe, it, expect } from "vitest";
import * as ts from "typescript";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { extractAllFacts } from "../../out/extraction/index.js";
import { createResolverPipeline } from "../../out/inference/index.js";
import { createRegistrationAnalyzer } from "../../out/registration/index.js";
import { buildResourceGraph } from "../../out/scope/index.js";
import { materializeResourcesForScope } from "@aurelia-ls/compiler";
import { DEFAULT_SEMANTICS } from "@aurelia-ls/compiler";

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
    expect(graph.version).toBe("aurelia-resource-graph@1");
    expect(graph.root, "Graph should have a root scope").toBeTruthy();
    expect(graph.scopes[graph.root], "Root scope should exist").toBeTruthy();
  });

  it("places global resources in the root scope", () => {
    const { intents } = runPipeline(EXPLICIT_APP);
    const graph = buildResourceGraph(intents);

    // Materialize root scope resources
    const { resources } = materializeResourcesForScope(DEFAULT_SEMANTICS, graph, graph.root);

    // Filter out built-in resources from semantics to get just app resources
    const appElements = Object.keys(resources.elements)
      .filter(k => !DEFAULT_SEMANTICS.resources.elements[k]).sort();
    const appAttributes = Object.keys(resources.attributes)
      .filter(k => !DEFAULT_SEMANTICS.resources.attributes[k]).sort();
    const appValueConverters = Object.keys(resources.valueConverters)
      .filter(k => !DEFAULT_SEMANTICS.resources.valueConverters[k]).sort();
    const appBindingBehaviors = Object.keys(resources.bindingBehaviors)
      .filter(k => !DEFAULT_SEMANTICS.resources.bindingBehaviors[k]).sort();

    // Assert exact app resources in root scope
    // Note: includes both globally registered and unknown-scope resources
    expect(appElements, "Root scope should have exactly these 6 elements").toEqual([
      "data-grid", "fancy-button", "my-app", "nav-bar", "product-card", "user-card"
    ]);

    expect(appAttributes, "Root scope should have exactly these 2 attributes").toEqual(["highlight", "tooltip"]);

    expect(appValueConverters, "Root scope should have exactly these 2 value converters").toEqual(["currency", "date"]);

    // Binding behaviors are not currently placed in the ResourceGraph scope overlay
    expect(appBindingBehaviors, "Binding behaviors are registered but not in scope overlay").toEqual([]);
  });

  it("creates local scopes for components with static dependencies", () => {
    const { intents } = runPipeline(EXPLICIT_APP);
    const graph = buildResourceGraph(intents);

    // Find the local scope for product-card
    const localScopes = Object.values(graph.scopes).filter(
      s => s.id !== graph.root && s.id.startsWith("local:")
    );

    // Should have exactly 1 local scope (product-card)
    expect(localScopes.length, "Should have exactly 1 local scope").toBe(1);

    // Verify product-card's local scope structure
    const productCardScope = localScopes[0];
    expect(productCardScope.id.includes("product-card"), "Local scope should be for product-card").toBe(true);
    expect(productCardScope.label?.includes("ProductCard"), "Scope label should include class name").toBe(true);
    expect(productCardScope.parent, "Local scope parent should be root").toBe(graph.root);

    // Verify local resources in scope
    const localElementNames = Object.keys(productCardScope.resources?.elements ?? {}).sort();
    expect(localElementNames, "product-card scope should have exactly these 2 local elements").toEqual(["price-tag", "stock-badge"]);
  });

  it("places local resources in component-specific scopes", () => {
    const { intents } = runPipeline(EXPLICIT_APP);
    const graph = buildResourceGraph(intents);

    // Find product-card's local scope
    const productCardScope = Object.values(graph.scopes).find(
      s => s.id.includes("product-card")
    );

    expect(productCardScope, "Should find product-card scope").toBeTruthy();
    expect(productCardScope.resources?.elements?.["price-tag"], "price-tag should be in product-card scope").toBeTruthy();
    expect(productCardScope.resources?.elements?.["stock-badge"], "stock-badge should be in product-card scope").toBeTruthy();

    // Local resources should NOT be in root scope resources (only via overlay)
    const rootScope = graph.scopes[graph.root];
    expect(!rootScope.resources?.elements?.["price-tag"], "price-tag should NOT be in root scope overlay").toBe(true);
    expect(!rootScope.resources?.elements?.["stock-badge"], "stock-badge should NOT be in root scope overlay").toBe(true);
  });

  it("supports two-level scope lookup: local → global", () => {
    const { intents } = runPipeline(EXPLICIT_APP);
    const graph = buildResourceGraph(intents);

    // Find product-card's local scope ID
    const productCardScopeId = Object.keys(graph.scopes).find(
      id => id.includes("product-card")
    );
    expect(productCardScopeId, "Should find product-card scope ID").toBeTruthy();

    // Materialize resources for product-card's local scope
    const { resources } = materializeResourcesForScope(
      DEFAULT_SEMANTICS,
      graph,
      productCardScopeId
    );

    // Should have local resources (from product-card scope)
    expect(resources.elements["price-tag"], "price-tag should be visible in product-card context").toBeTruthy();
    expect(resources.elements["stock-badge"], "stock-badge should be visible in product-card context").toBeTruthy();

    // Should also have global resources (from root scope)
    expect(resources.elements["nav-bar"], "nav-bar (global) should be visible in product-card context").toBeTruthy();
    expect(resources.valueConverters["date"], "date (global) should be visible in product-card context").toBeTruthy();
    expect(resources.bindingBehaviors["debounce"], "debounce (global) should be visible in product-card context").toBeTruthy();

    // Should have built-in resources (from semantics)
    expect(resources.controllers["if"], "if (built-in) should be visible in product-card context").toBeTruthy();
    expect(resources.controllers["repeat"], "repeat (built-in) should be visible in product-card context").toBeTruthy();
  });

  it("preserves bindable information in the resource graph", () => {
    const { intents } = runPipeline(EXPLICIT_APP);
    const graph = buildResourceGraph(intents);

    const { resources } = materializeResourcesForScope(DEFAULT_SEMANTICS, graph, graph.root);

    // Check user-card bindables (has name, avatar, selected)
    const userCard = resources.elements["user-card"];
    expect(userCard, "user-card should be in graph").toBeTruthy();
    const userCardBindables = Object.keys(userCard.bindables ?? {}).sort();
    expect(userCardBindables, "user-card should have exactly these bindables").toEqual(["avatar", "name", "selected"]);

    // Check data-grid bindables
    const dataGrid = resources.elements["data-grid"];
    expect(dataGrid, "data-grid should be in graph").toBeTruthy();
    const dataGridBindables = Object.keys(dataGrid.bindables ?? {}).sort();
    expect(dataGridBindables, "data-grid should have exactly these bindables").toEqual(["columns", "items", "pageSize"]);
  });
});
