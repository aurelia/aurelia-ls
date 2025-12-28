import { describe, it, expect, beforeAll } from "vitest";
import * as ts from "typescript";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { resolve } from "@aurelia-ls/resolution";
import { materializeResourcesForScope, DEFAULT_SEMANTICS } from "@aurelia-ls/compiler";

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
    // Full pipeline picks up runtime resources like promise template controllers, binding behaviors, etc.
    expect(result.candidates.length, "Should find 29 candidates (app + runtime)").toBe(29);
    const byKind = {
      elements: result.candidates.filter(c => c.kind === "element").length,
      attributes: result.candidates.filter(c => c.kind === "attribute").length,
      valueConverters: result.candidates.filter(c => c.kind === "valueConverter").length,
      bindingBehaviors: result.candidates.filter(c => c.kind === "bindingBehavior").length,
    };
    expect(byKind, "Candidate breakdown by kind").toEqual({
      elements: 8,        // 8 app elements
      attributes: 7,      // 2 app + 5 runtime (promise, pending, fulfilled, rejected, else)
      valueConverters: 3, // 2 app + 1 runtime (sanitize)
      bindingBehaviors: 11, // 2 app + 9 runtime
    });

    // Assert intent counts by kind
    expect(result.intents.length, "Should produce 29 intents").toBe(29);
    const intentsByKind = {
      global: result.intents.filter(i => i.kind === "global").length,
      local: result.intents.filter(i => i.kind === "local").length,
      unknown: result.intents.filter(i => i.kind === "unknown").length,
    };
    expect(intentsByKind, "Intent breakdown by kind").toEqual({
      global: 10, // Resources registered via barrels
      local: 2,   // price-tag, stock-badge (via static dependencies)
      unknown: 17, // Runtime resources + app resources not in barrels
    });

    // Assert scope count
    const scopeCount = Object.keys(result.resourceGraph.scopes).length;
    expect(scopeCount, "Should have exactly 2 scopes (root + 1 local)").toBe(2);

    // Should have no diagnostics in well-formed app
    expect(result.diagnostics.length, "Should have no diagnostics").toBe(0);
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

  it("exposes intents for tooling", () => {
    // Check global intent evidence
    const navBarIntent = result.intents.find(i => i.resource.name === "nav-bar");
    expect(navBarIntent, "Should have nav-bar intent").toBeTruthy();
    expect(navBarIntent.kind).toBe("global");
    expect(navBarIntent.evidence.length > 0, "Should have evidence").toBe(true);
    expect(navBarIntent.evidence[0].kind).toBe("aurelia-register");

    // Check local intent evidence
    const priceTagIntent = result.intents.find(i => i.resource.name === "price-tag");
    expect(priceTagIntent, "Should have price-tag intent").toBeTruthy();
    expect(priceTagIntent.kind).toBe("local");
    expect(priceTagIntent.scope?.includes("product-card"), "Should be scoped to product-card").toBe(true);
    expect(priceTagIntent.evidence[0].kind).toBe("static-dependencies");
  });

  it("discovers templates for element resources", () => {
    // Should have templates array with exact count
    expect(result.templates, "Should have templates array").toBeTruthy();
    const templateNames = result.templates.map(t => t.resourceName).sort();
    expect(templateNames, "Should discover exactly these 5 file-based templates").toEqual([
      "data-grid", "my-app", "nav-bar", "product-card", "user-card"
    ]);

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
