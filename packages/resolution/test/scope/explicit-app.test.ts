import { describe, it, expect, beforeAll } from "vitest";
import { extractAllFacts, resolveImports, buildExportBindingMap } from "@aurelia-ls/resolution";
import { createResolverPipeline } from "@aurelia-ls/resolution";
import { createRegistrationAnalyzer } from "@aurelia-ls/resolution";
import { buildResourceGraph } from "@aurelia-ls/resolution";
import { materializeResourcesForScope } from "@aurelia-ls/compiler";
import { DEFAULT_SEMANTICS } from "@aurelia-ls/compiler";
import {
  createProgramFromApp,
  getTestAppPath,
  filterFactsByPathPattern,
} from "../_helpers/index.js";

const EXPLICIT_APP = getTestAppPath("explicit-app", import.meta.url);

describe("Scope: explicit-app", () => {
  let graph: ReturnType<typeof buildResourceGraph>;

  beforeAll(() => {
    const program = createProgramFromApp(EXPLICIT_APP);
    const allFacts = extractAllFacts(program);
    const appFacts = filterFactsByPathPattern(allFacts, "/explicit-app/src/");

    // Import resolution phase
    const resolvedFacts = resolveImports(appFacts);

    // Export binding resolution phase
    const exportBindings = buildExportBindingMap(resolvedFacts);

    const pipeline = createResolverPipeline();
    const resolved = pipeline.resolve(resolvedFacts);

    const analyzer = createRegistrationAnalyzer();
    const registration = analyzer.analyze(resolved.candidates, resolvedFacts, exportBindings);

    graph = buildResourceGraph(registration);
  });

  it("builds a ResourceGraph from registration analysis", () => {
    // Should produce a valid graph
    expect(graph.version).toBe("aurelia-resource-graph@1");
    expect(graph.root, "Graph should have a root scope").toBeTruthy();
    expect(graph.scopes[graph.root], "Root scope should exist").toBeTruthy();
  });

  it("places global resources in the root scope", () => {
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
    // Note: includes both globally registered and orphan resources
    expect(appElements, "Root scope should have exactly these 6 elements").toEqual([
      "data-grid", "fancy-button", "my-app", "nav-bar", "product-card", "user-card"
    ]);

    expect(appAttributes, "Root scope should have exactly these 2 attributes").toEqual(["highlight", "tooltip"]);

    expect(appValueConverters, "Root scope should have exactly these 2 value converters").toEqual(["currency", "date"]);

    // Binding behaviors are not currently placed in the ResourceGraph scope overlay
    expect(appBindingBehaviors, "Binding behaviors are registered but not in scope overlay").toEqual([]);
  });

  it("creates local scopes for components with static dependencies", () => {
    // Find the local scope for product-card
    const localScopes = Object.values(graph.scopes).filter(
      s => s.id !== graph.root && s.id.startsWith("local:")
    );

    // Should have exactly 1 local scope (product-card)
    expect(localScopes.length, "Should have exactly 1 local scope").toBe(1);

    // Verify product-card's local scope structure
    const productCardScope = localScopes[0];
    expect(productCardScope!.id.includes("product-card"), "Local scope should be for product-card").toBe(true);
    expect(productCardScope!.label?.includes("ProductCard"), "Scope label should include class name").toBe(true);
    expect(productCardScope!.parent, "Local scope parent should be root").toBe(graph.root);

    // Verify local resources in scope
    const localElementNames = Object.keys(productCardScope!.resources?.elements ?? {}).sort();
    expect(localElementNames, "product-card scope should have exactly these 2 local elements").toEqual(["price-tag", "stock-badge"]);
  });

  it("places local resources in component-specific scopes", () => {
    // Find product-card's local scope
    const productCardScope = Object.values(graph.scopes).find(
      s => s.id.includes("product-card")
    );

    expect(productCardScope, "Should find product-card scope").toBeTruthy();
    expect(productCardScope!.resources?.elements?.["price-tag"], "price-tag should be in product-card scope").toBeTruthy();
    expect(productCardScope!.resources?.elements?.["stock-badge"], "stock-badge should be in product-card scope").toBeTruthy();

    // Local resources should NOT be in root scope resources (only via overlay)
    const rootScope = graph.scopes[graph.root];
    expect(!rootScope.resources?.elements?.["price-tag"], "price-tag should NOT be in root scope overlay").toBe(true);
    expect(!rootScope.resources?.elements?.["stock-badge"], "stock-badge should NOT be in root scope overlay").toBe(true);
  });

  it("supports two-level scope lookup: local → global", () => {
    // Find product-card's local scope ID
    const productCardScopeId = Object.keys(graph.scopes).find(
      id => id.includes("product-card")
    );
    expect(productCardScopeId, "Should find product-card scope ID").toBeTruthy();

    // Materialize resources for product-card's local scope
    const { resources } = materializeResourcesForScope(
      DEFAULT_SEMANTICS,
      graph,
      productCardScopeId!
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
