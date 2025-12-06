import { describe, it } from "node:test";
import assert from "node:assert";
import * as ts from "typescript";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { resolve } from "../../out/resolve.js";
import { materializeResourcesForScope, DEFAULT_SEMANTICS } from "@aurelia-ls/domain";

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
  it("runs the complete resolution pipeline", () => {
    const program = createProgramFromApp(EXPLICIT_APP);

    const result = resolve(program);

    // Should have all expected artifacts
    assert.ok(result.resourceGraph, "Should produce a ResourceGraph");
    assert.ok(result.candidates.length > 0, "Should find candidates");
    assert.ok(result.intents.length > 0, "Should produce intents");
    assert.ok(result.facts.size > 0, "Should produce facts");

    console.log("\n=== PIPELINE SUMMARY ===");
    console.log(`Candidates: ${result.candidates.length}`);
    console.log(`Intents: ${result.intents.length}`);
    console.log(`  - Global: ${result.intents.filter(i => i.kind === "global").length}`);
    console.log(`  - Local: ${result.intents.filter(i => i.kind === "local").length}`);
    console.log(`  - Unknown: ${result.intents.filter(i => i.kind === "unknown").length}`);
    console.log(`Scopes: ${Object.keys(result.resourceGraph.scopes).length}`);
    console.log(`Diagnostics: ${result.diagnostics.length}`);
    console.log("=== END SUMMARY ===\n");
  });

  it("produces a usable ResourceGraph for template compilation", () => {
    const program = createProgramFromApp(EXPLICIT_APP);
    const result = resolve(program);

    // Materialize resources at root scope
    const { resources } = materializeResourcesForScope(
      DEFAULT_SEMANTICS,
      result.resourceGraph,
      result.resourceGraph.root
    );

    // Should have app-specific elements
    assert.ok(resources.elements["nav-bar"], "Should have nav-bar element");
    assert.ok(resources.elements["data-grid"], "Should have data-grid element");

    // Should have built-in controllers from semantics
    assert.ok(resources.controllers["if"], "Should have if controller");
    assert.ok(resources.controllers["repeat"], "Should have repeat controller");

    // Should be able to look up bindables
    const dataGrid = resources.elements["data-grid"];
    assert.ok(dataGrid.bindables["items"], "data-grid should have items bindable");
  });

  it("returns facts for debugging/tooling", () => {
    const program = createProgramFromApp(EXPLICIT_APP);
    const result = resolve(program);

    // Should have facts for multiple files
    assert.ok(result.facts.size > 5, "Should have facts for multiple files");

    // Find main.ts facts
    const mainFacts = [...result.facts.values()].find(f => f.path.includes("main.ts"));
    assert.ok(mainFacts, "Should have facts for main.ts");
    assert.ok(mainFacts.registrationCalls.length > 0, "main.ts should have registration calls");
  });

  it("exposes candidates for tooling", () => {
    const program = createProgramFromApp(EXPLICIT_APP);
    const result = resolve(program);

    // Find specific candidates
    const navBar = result.candidates.find(c => c.name === "nav-bar");
    assert.ok(navBar, "Should find nav-bar candidate");
    assert.strictEqual(navBar.kind, "element");
    assert.strictEqual(navBar.resolver, "decorator");

    const currency = result.candidates.find(c => c.name === "currency");
    assert.ok(currency, "Should find currency candidate");
    assert.strictEqual(currency.kind, "valueConverter");
    assert.strictEqual(currency.resolver, "static-au");
  });

  it("exposes intents for tooling", () => {
    const program = createProgramFromApp(EXPLICIT_APP);
    const result = resolve(program);

    // Check global intent evidence
    const navBarIntent = result.intents.find(i => i.resource.name === "nav-bar");
    assert.ok(navBarIntent, "Should have nav-bar intent");
    assert.strictEqual(navBarIntent.kind, "global");
    assert.ok(navBarIntent.evidence.length > 0, "Should have evidence");
    assert.strictEqual(navBarIntent.evidence[0].kind, "aurelia-register");

    // Check local intent evidence
    const priceTagIntent = result.intents.find(i => i.resource.name === "price-tag");
    assert.ok(priceTagIntent, "Should have price-tag intent");
    assert.strictEqual(priceTagIntent.kind, "local");
    assert.ok(priceTagIntent.scope?.includes("product-card"), "Should be scoped to product-card");
    assert.strictEqual(priceTagIntent.evidence[0].kind, "static-dependencies");
  });

  it("discovers templates for element resources", () => {
    const program = createProgramFromApp(EXPLICIT_APP);
    const result = resolve(program);

    // Should have templates array
    assert.ok(result.templates, "Should have templates array");
    assert.ok(result.templates.length > 0, "Should discover templates");

    console.log("\n=== TEMPLATES DISCOVERED ===");
    for (const t of result.templates) {
      console.log(`${t.resourceName}: ${t.templatePath} (scope: ${t.scopeId})`);
    }
    console.log("=== END TEMPLATES ===\n");

    // Find nav-bar template
    const navBarTemplate = result.templates.find(t => t.resourceName === "nav-bar");
    assert.ok(navBarTemplate, "Should find nav-bar template");
    assert.ok(navBarTemplate.templatePath.endsWith("nav-bar.html"), "Template path should end with .html");
    assert.ok(navBarTemplate.componentPath.endsWith("nav-bar.ts"), "Component path should end with .ts");
    assert.strictEqual(navBarTemplate.scopeId, "root", "nav-bar should be in root scope");

    // Find product-card template (local scope)
    const productCardTemplate = result.templates.find(t => t.resourceName === "product-card");
    assert.ok(productCardTemplate, "Should find product-card template");
    assert.strictEqual(productCardTemplate.scopeId, "root", "product-card is unknown/global scope");

    // Components with INLINE templates should NOT appear in templates array
    // (price-tag and stock-badge have template: `<template>...` in their decorators)
    const priceTagTemplate = result.templates.find(t => t.resourceName === "price-tag");
    assert.strictEqual(priceTagTemplate, undefined, "price-tag has inline template, should not appear in templates");

    const stockBadgeTemplate = result.templates.find(t => t.resourceName === "stock-badge");
    assert.strictEqual(stockBadgeTemplate, undefined, "stock-badge has inline template, should not appear in templates");

    const fancyButtonTemplate = result.templates.find(t => t.resourceName === "fancy-button");
    assert.strictEqual(fancyButtonTemplate, undefined, "fancy-button has inline template, should not appear in templates");
  });

  it("collects inline templates separately", () => {
    const program = createProgramFromApp(EXPLICIT_APP);
    const result = resolve(program);

    // Should have inlineTemplates array
    assert.ok(result.inlineTemplates, "Should have inlineTemplates array");
    assert.ok(result.inlineTemplates.length > 0, "Should discover inline templates");

    console.log("\n=== INLINE TEMPLATES DISCOVERED ===");
    for (const t of result.inlineTemplates) {
      console.log(`${t.resourceName}: ${t.content.substring(0, 50)}... (scope: ${t.scopeId})`);
    }
    console.log("=== END INLINE TEMPLATES ===\n");

    // Find price-tag inline template (local scope)
    const priceTagInline = result.inlineTemplates.find(t => t.resourceName === "price-tag");
    assert.ok(priceTagInline, "Should find price-tag inline template");
    assert.ok(priceTagInline.content.includes("<span"), "price-tag content should be HTML");
    assert.ok(priceTagInline.scopeId.includes("local:"), "price-tag should be in local scope");
    assert.ok(priceTagInline.componentPath.endsWith("price-tag.ts"), "Component path should end with .ts");

    // Find stock-badge inline template (local scope)
    const stockBadgeInline = result.inlineTemplates.find(t => t.resourceName === "stock-badge");
    assert.ok(stockBadgeInline, "Should find stock-badge inline template");
    assert.ok(stockBadgeInline.content.includes("<span"), "stock-badge content should be HTML");

    // Find fancy-button inline template (global scope via barrel)
    const fancyButtonInline = result.inlineTemplates.find(t => t.resourceName === "fancy-button");
    assert.ok(fancyButtonInline, "Should find fancy-button inline template");
    assert.ok(fancyButtonInline.content.includes("<button"), "fancy-button content should be HTML");
    assert.strictEqual(fancyButtonInline.scopeId, "root", "fancy-button should be in root scope (global)");
  });
});
