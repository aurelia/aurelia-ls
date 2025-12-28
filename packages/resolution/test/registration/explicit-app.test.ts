import { describe, it } from "vitest";
import assert from "node:assert";
import * as ts from "typescript";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { extractAllFacts } from "../../out/extraction/index.js";
import { createResolverPipeline } from "../../out/inference/index.js";
import { createRegistrationAnalyzer } from "../../out/registration/index.js";

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

describe("Registration: explicit-app", () => {
  it("analyzes registration intents for all candidates", () => {
    const program = createProgramFromApp(EXPLICIT_APP);
    const allFacts = extractAllFacts(program);
    const appFacts = filterAppFacts(allFacts, EXPLICIT_APP);

    const pipeline = createResolverPipeline();
    const resolved = pipeline.resolve(appFacts);

    const analyzer = createRegistrationAnalyzer();
    const intents = analyzer.analyze(resolved.candidates, appFacts, program);

    // Log for inspection
    console.log("\n=== REGISTRATION INTENTS ===\n");
    const grouped = {
      global: intents.filter(i => i.kind === "global").map(i => ({
        name: i.resource.name,
        type: i.resource.kind,
        evidence: i.evidence[0]?.kind,
      })),
      local: intents.filter(i => i.kind === "local").map(i => ({
        name: i.resource.name,
        type: i.resource.kind,
        scope: i.scope?.split("/").pop(),
        evidence: i.evidence[0]?.kind,
      })),
      unknown: intents.filter(i => i.kind === "unknown").map(i => ({
        name: i.resource.name,
        type: i.resource.kind,
      })),
    };
    console.log(JSON.stringify(grouped, null, 2));
    console.log("\n=== END INTENTS ===\n");

    // We should have intents for all candidates
    assert.strictEqual(intents.length, resolved.candidates.length);
  });

  it("identifies globally registered resources via barrel exports", () => {
    const program = createProgramFromApp(EXPLICIT_APP);
    const allFacts = extractAllFacts(program);
    const appFacts = filterAppFacts(allFacts, EXPLICIT_APP);

    const pipeline = createResolverPipeline();
    const resolved = pipeline.resolve(appFacts);

    const analyzer = createRegistrationAnalyzer();
    const intents = analyzer.analyze(resolved.candidates, appFacts, program);

    // nav-bar should be global (registered via barrel)
    const navBar = intents.find(i => i.resource.name === "nav-bar");
    assert.ok(navBar, "Should find nav-bar intent");
    assert.strictEqual(navBar.kind, "global", "nav-bar should be global");
    assert.strictEqual(navBar.evidence[0]?.kind, "aurelia-register", "nav-bar evidence should be aurelia-register");

    // data-grid should be global
    const dataGrid = intents.find(i => i.resource.name === "data-grid");
    assert.ok(dataGrid, "Should find data-grid intent");
    assert.strictEqual(dataGrid.kind, "global", "data-grid should be global");

    // tooltip should be global
    const tooltip = intents.find(i => i.resource.name === "tooltip");
    assert.ok(tooltip, "Should find tooltip intent");
    assert.strictEqual(tooltip.kind, "global", "tooltip should be global");

    // date value converter should be global
    const date = intents.find(i => i.resource.name === "date" && i.resource.kind === "valueConverter");
    assert.ok(date, "Should find date intent");
    assert.strictEqual(date.kind, "global", "date should be global");

    // debounce binding behavior should be global
    const debounce = intents.find(i => i.resource.name === "debounce");
    assert.ok(debounce, "Should find debounce intent");
    assert.strictEqual(debounce.kind, "global", "debounce should be global");
  });

  it("identifies locally scoped resources via static dependencies", () => {
    const program = createProgramFromApp(EXPLICIT_APP);
    const allFacts = extractAllFacts(program);
    const appFacts = filterAppFacts(allFacts, EXPLICIT_APP);

    const pipeline = createResolverPipeline();
    const resolved = pipeline.resolve(appFacts);

    const analyzer = createRegistrationAnalyzer();
    const intents = analyzer.analyze(resolved.candidates, appFacts, program);

    // price-tag should be local (in ProductCard's static dependencies)
    const priceTag = intents.find(i => i.resource.name === "price-tag");
    assert.ok(priceTag, "Should find price-tag intent");
    assert.strictEqual(priceTag.kind, "local", "price-tag should be local");
    assert.ok(priceTag.scope?.includes("product-card"), "price-tag scope should be product-card");
    assert.strictEqual(priceTag.evidence[0]?.kind, "static-dependencies");

    // stock-badge should be local
    const stockBadge = intents.find(i => i.resource.name === "stock-badge");
    assert.ok(stockBadge, "Should find stock-badge intent");
    assert.strictEqual(stockBadge.kind, "local", "stock-badge should be local");
    assert.ok(stockBadge.scope?.includes("product-card"), "stock-badge scope should be product-card");
  });

  it("identifies static $au resources registered via barrel", () => {
    const program = createProgramFromApp(EXPLICIT_APP);
    const allFacts = extractAllFacts(program);
    const appFacts = filterAppFacts(allFacts, EXPLICIT_APP);

    const pipeline = createResolverPipeline();
    const resolved = pipeline.resolve(appFacts);

    const analyzer = createRegistrationAnalyzer();
    const intents = analyzer.analyze(resolved.candidates, appFacts, program);

    // fancy-button (static $au element) should be global
    const fancyButton = intents.find(i => i.resource.name === "fancy-button");
    assert.ok(fancyButton, "Should find fancy-button intent");
    assert.strictEqual(fancyButton.kind, "global", "fancy-button should be global");

    // currency (static $au value converter) should be global
    const currency = intents.find(i => i.resource.name === "currency");
    assert.ok(currency, "Should find currency intent");
    assert.strictEqual(currency.kind, "global", "currency should be global");
  });

  it("extracts import facts correctly", () => {
    const program = createProgramFromApp(EXPLICIT_APP);
    const allFacts = extractAllFacts(program);
    const appFacts = filterAppFacts(allFacts, EXPLICIT_APP);

    // Find main.ts facts
    const mainFacts = Array.from(appFacts.values()).find(f =>
      f.path.includes("main.ts")
    );
    assert.ok(mainFacts, "Should find main.ts facts");

    // Should have namespace imports
    const nsImports = mainFacts.imports.filter(i => i.kind === "namespace");
    assert.ok(nsImports.length >= 5, `Should have at least 5 namespace imports, got ${nsImports.length}`);

    // Check components import
    const componentsImport = nsImports.find(i => i.alias === "components");
    assert.ok(componentsImport, "Should have components namespace import");
    assert.ok(componentsImport.resolvedPath?.includes("components/index"), "components should resolve to index");
  });

  it("extracts export facts correctly from barrel files", () => {
    const program = createProgramFromApp(EXPLICIT_APP);
    const allFacts = extractAllFacts(program);
    const appFacts = filterAppFacts(allFacts, EXPLICIT_APP);

    // Find components/index.ts facts
    const indexFacts = Array.from(appFacts.values()).find(f =>
      f.path.includes("components/index.ts")
    );
    assert.ok(indexFacts, "Should find components/index.ts facts");

    // Should have named exports
    assert.ok(indexFacts.exports.length > 0, "Should have exports");

    // Check that exports include our components
    const exportedNames = new Set();
    for (const exp of indexFacts.exports) {
      if (exp.kind === "named") {
        for (const name of exp.names) {
          exportedNames.add(name);
        }
      } else if (exp.kind === "reexport-named") {
        for (const e of exp.names) {
          exportedNames.add(e.alias ?? e.name);
        }
      }
    }

    // The barrel re-exports NavBar, UserCard, DataGrid
    assert.ok(
      exportedNames.has("NavBar") || indexFacts.exports.some(e => e.kind === "reexport-named"),
      "Should export NavBar or have re-exports"
    );
  });
});
