import { describe, it, expect, beforeAll } from "vitest";
import { resolve } from "@aurelia-ls/resolution";
import { materializeResourcesForScope, DEFAULT_SEMANTICS } from "@aurelia-ls/compiler";
import { createProgramFromApp, getTestAppPath } from "../_helpers/index.js";

const EXPLICIT_APP = getTestAppPath("explicit-app", import.meta.url);

describe("Full Pipeline: explicit-app", () => {
  let result: ReturnType<typeof resolve>;

  beforeAll(() => {
    const program = createProgramFromApp(EXPLICIT_APP);
    result = resolve(program);
  });

  it("runs the complete resolution pipeline", () => {
    // Should have all expected artifacts
    expect(result.resourceGraph, "Should produce a ResourceGraph").toBeTruthy();
    expect(result.facts.size > 0, "Should produce facts").toBe(true);

    // Assert candidate counts by kind (includes runtime resources from Aurelia)
    // Full pipeline picks up runtime resources: template controllers (if, repeat, etc.),
    // custom elements (au-compose, au-slot), custom attributes (focus, show), and more
    expect(result.candidates.length, "Should find at least 29 candidates (app + runtime)").toBeGreaterThanOrEqual(29);
    const byKind = {
      elements: result.candidates.filter(c => c.kind === "element").length,
      attributes: result.candidates.filter(c => c.kind === "attribute").length,
      valueConverters: result.candidates.filter(c => c.kind === "valueConverter").length,
      bindingBehaviors: result.candidates.filter(c => c.kind === "bindingBehavior").length,
    };
    // App defines: 8 elements, 2 attributes, 2 value converters, 2 binding behaviors
    // Runtime provides additional resources that vary as extraction improves
    expect(byKind.elements, "Should find app elements + runtime elements (au-compose, au-slot)").toBeGreaterThanOrEqual(8);
    expect(byKind.attributes, "Should find app attributes + runtime TCs").toBeGreaterThanOrEqual(7);
    expect(byKind.valueConverters, "Should find app VCs + sanitize").toBeGreaterThanOrEqual(3);
    expect(byKind.bindingBehaviors, "Should find app BBs + runtime BBs").toBeGreaterThanOrEqual(11);

    // Assert registration site counts by scope kind
    const sitesByScope = {
      global: result.registration.sites.filter(s => s.scope.kind === "global").length,
      local: result.registration.sites.filter(s => s.scope.kind === "local").length,
    };
    expect(sitesByScope.global, "Should have global registration sites").toBeGreaterThan(0);
    expect(sitesByScope.local, "Should have local registration sites").toBe(2); // price-tag, stock-badge

    // Assert scope count
    const scopeCount = Object.keys(result.resourceGraph.scopes).length;
    expect(scopeCount, "Should have exactly 2 scopes (root + 1 local)").toBe(2);

    // Should have orphan diagnostics for unregistered resources:
    // - my-app: Root component, bootstrapped via .app() not registered
    // - product-card: Test fixture with local deps but not globally registered
    expect(result.diagnostics.length, "Should have 2 orphan diagnostics").toBe(2);

    const orphanNames = result.diagnostics
      .filter(d => d.code === "RES0001")
      .map(d => d.message.match(/element '([^']+)'/)?.[1])
      .sort();
    expect(orphanNames).toEqual(["my-app", "product-card"]);
  });

  it("produces a usable ResourceGraph for template compilation", () => {
    // Materialize resources at root scope
    const { resources } = materializeResourcesForScope(
      DEFAULT_SEMANTICS,
      result.resourceGraph,
      result.resourceGraph.root
    );

    // Should have app-specific elements
    expect(resources.elements["nav-bar"], "Should have nav-bar element").toBeTruthy();
    expect(resources.elements["data-grid"], "Should have data-grid element").toBeTruthy();

    // Should have built-in controllers from semantics
    expect(resources.controllers["if"], "Should have if controller").toBeTruthy();
    expect(resources.controllers["repeat"], "Should have repeat controller").toBeTruthy();

    // Should be able to look up bindables
    const dataGrid = resources.elements["data-grid"];
    expect(dataGrid.bindables["items"], "data-grid should have items bindable").toBeTruthy();
  });

  it("returns facts for debugging/tooling", () => {
    // Should have facts for multiple files
    expect(result.facts.size > 5, "Should have facts for multiple files").toBe(true);

    // Find main.ts facts
    const mainFacts = [...result.facts.values()].find(f => f.path.includes("main.ts"));
    expect(mainFacts, "Should have facts for main.ts").toBeTruthy();
    expect(mainFacts.registrationCalls.length > 0, "main.ts should have registration calls").toBe(true);
  });

  it("exposes candidates for tooling", () => {
    // Find specific candidates
    const navBar = result.candidates.find(c => c.name === "nav-bar");
    expect(navBar, "Should find nav-bar candidate").toBeTruthy();
    expect(navBar.kind).toBe("element");
    expect(navBar.resolver).toBe("decorator");

    const currency = result.candidates.find(c => c.name === "currency");
    expect(currency, "Should find currency candidate").toBeTruthy();
    expect(currency.kind).toBe("valueConverter");
    expect(currency.resolver).toBe("static-au");
  });

  it("exposes registration sites for tooling", () => {
    // Check global registration site evidence
    const navBarSite = result.registration.sites.find(
      s => s.resourceRef.kind === "resolved" && s.resourceRef.resource.name === "nav-bar"
    );
    expect(navBarSite, "Should have nav-bar registration site").toBeTruthy();
    expect(navBarSite!.scope.kind).toBe("global");
    expect(navBarSite!.evidence.kind).toBe("aurelia-register");

    // Check local registration site evidence
    const priceTagSite = result.registration.sites.find(
      s => s.resourceRef.kind === "resolved" && s.resourceRef.resource.name === "price-tag"
    );
    expect(priceTagSite, "Should have price-tag registration site").toBeTruthy();
    expect(priceTagSite!.scope.kind).toBe("local");
    if (priceTagSite!.scope.kind === "local") {
      expect(priceTagSite!.scope.owner.includes("product-card"), "Should be scoped to product-card").toBe(true);
    }
    expect(priceTagSite!.evidence.kind).toBe("static-dependencies");
  });

  it("discovers templates for element resources", () => {
    // Should have templates array
    expect(result.templates, "Should have templates array").toBeTruthy();
    const templateNames = result.templates.map(t => t.resourceName).sort();
    // The 5 app-defined file-based templates must be present
    // Runtime elements (au-compose, au-slot) may also appear if they have inline templates
    const appTemplates = ["data-grid", "my-app", "nav-bar", "product-card", "user-card"];
    for (const name of appTemplates) {
      expect(templateNames, `Should include app template: ${name}`).toContain(name);
    }

    // Find nav-bar template
    const navBarTemplate = result.templates.find(t => t.resourceName === "nav-bar");
    expect(navBarTemplate, "Should find nav-bar template").toBeTruthy();
    expect(navBarTemplate.templatePath.endsWith("nav-bar.html"), "Template path should end with .html").toBe(true);
    expect(navBarTemplate.componentPath.endsWith("nav-bar.ts"), "Component path should end with .ts").toBe(true);
    expect(navBarTemplate.scopeId, "nav-bar should be in root scope").toBe("root");

    // Find product-card template (local scope)
    const productCardTemplate = result.templates.find(t => t.resourceName === "product-card");
    expect(productCardTemplate, "Should find product-card template").toBeTruthy();
    expect(productCardTemplate.scopeId, "product-card is unknown/global scope").toBe("root");

    // Components with INLINE templates should NOT appear in templates array
    // (price-tag and stock-badge have template: `<template>...` in their decorators)
    const priceTagTemplate = result.templates.find(t => t.resourceName === "price-tag");
    expect(priceTagTemplate, "price-tag has inline template, should not appear in templates").toBeUndefined();

    const stockBadgeTemplate = result.templates.find(t => t.resourceName === "stock-badge");
    expect(stockBadgeTemplate, "stock-badge has inline template, should not appear in templates").toBeUndefined();

    const fancyButtonTemplate = result.templates.find(t => t.resourceName === "fancy-button");
    expect(fancyButtonTemplate, "fancy-button has inline template, should not appear in templates").toBeUndefined();
  });

  it("collects inline templates separately", () => {
    // Should have inlineTemplates array with exact count
    expect(result.inlineTemplates, "Should have inlineTemplates array").toBeTruthy();
    const inlineNames = result.inlineTemplates.map(t => t.resourceName).sort();
    expect(inlineNames, "Should discover exactly these 3 inline templates").toEqual([
      "fancy-button", "price-tag", "stock-badge"
    ]);

    // Find price-tag inline template (local scope)
    const priceTagInline = result.inlineTemplates.find(t => t.resourceName === "price-tag");
    expect(priceTagInline, "Should find price-tag inline template").toBeTruthy();
    expect(priceTagInline.content.includes("<span"), "price-tag content should be HTML").toBe(true);
    expect(priceTagInline.scopeId.includes("local:"), "price-tag should be in local scope").toBe(true);
    expect(priceTagInline.componentPath.endsWith("price-tag.ts"), "Component path should end with .ts").toBe(true);

    // Find stock-badge inline template (local scope)
    const stockBadgeInline = result.inlineTemplates.find(t => t.resourceName === "stock-badge");
    expect(stockBadgeInline, "Should find stock-badge inline template").toBeTruthy();
    expect(stockBadgeInline.content.includes("<span"), "stock-badge content should be HTML").toBe(true);

    // Find fancy-button inline template (global scope via barrel)
    const fancyButtonInline = result.inlineTemplates.find(t => t.resourceName === "fancy-button");
    expect(fancyButtonInline, "Should find fancy-button inline template").toBeTruthy();
    expect(fancyButtonInline.content.includes("<button"), "fancy-button content should be HTML").toBe(true);
    expect(fancyButtonInline.scopeId, "fancy-button should be in root scope (global)").toBe("root");
  });
});
