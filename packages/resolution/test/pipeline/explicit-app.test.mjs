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
});
