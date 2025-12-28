import { describe, it } from "vitest";
import assert from "node:assert";
import * as ts from "typescript";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { extractAllFacts } from "../../out/extraction/index.js";
import { createResolverPipeline } from "../../out/inference/index.js";

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
    // Only include files under the app's src directory
    if (filePath.includes(appPath.replace(/\\/g, "/")) || filePath.includes("src/")) {
      const normalized = filePath.replace(/\\/g, "/");
      if (normalized.includes("/explicit-app/src/")) {
        filtered.set(filePath, fileFacts);
      }
    }
  }
  return filtered;
}

describe("Inference: explicit-app", () => {
  it("resolves all resource candidates from explicit-app", () => {
    const program = createProgramFromApp(EXPLICIT_APP);
    const allFacts = extractAllFacts(program);

    // Filter to just app files
    const appFacts = filterAppFacts(allFacts, EXPLICIT_APP);

    const pipeline = createResolverPipeline();
    const result = pipeline.resolve(appFacts);

    // Log for inspection
    console.log("\n=== RESOLVED CANDIDATES ===\n");
    const grouped = {
      elements: result.candidates.filter(c => c.kind === "element"),
      attributes: result.candidates.filter(c => c.kind === "attribute"),
      valueConverters: result.candidates.filter(c => c.kind === "valueConverter"),
      bindingBehaviors: result.candidates.filter(c => c.kind === "bindingBehavior"),
    };
    console.log(JSON.stringify(grouped, null, 2));
    console.log("\n=== END CANDIDATES ===\n");

    // Should find all our expected resources
    const elements = result.candidates.filter(c => c.kind === "element");
    const attributes = result.candidates.filter(c => c.kind === "attribute");
    const valueConverters = result.candidates.filter(c => c.kind === "valueConverter");
    const bindingBehaviors = result.candidates.filter(c => c.kind === "bindingBehavior");

    // Elements: my-app, nav-bar, user-card, data-grid, product-card, price-tag, stock-badge, fancy-button
    assert.ok(elements.length >= 8, `Expected at least 8 elements, got ${elements.length}`);

    // Attributes: tooltip, highlight
    assert.ok(attributes.length >= 2, `Expected at least 2 attributes, got ${attributes.length}`);

    // Value converters: date, currency
    assert.ok(valueConverters.length >= 2, `Expected at least 2 value converters, got ${valueConverters.length}`);

    // Binding behaviors: debounce, throttle
    assert.ok(bindingBehaviors.length >= 2, `Expected at least 2 binding behaviors, got ${bindingBehaviors.length}`);
  });

  it("correctly resolves decorator-based elements", () => {
    const program = createProgramFromApp(EXPLICIT_APP);
    const allFacts = extractAllFacts(program);
    const appFacts = filterAppFacts(allFacts, EXPLICIT_APP);

    const pipeline = createResolverPipeline();
    const result = pipeline.resolve(appFacts);

    // Find nav-bar (simple decorator)
    const navBar = result.candidates.find(c => c.name === "nav-bar" && c.kind === "element");
    assert.ok(navBar, "Should find nav-bar element");
    assert.strictEqual(navBar.className, "NavBar");
    assert.strictEqual(navBar.resolver, "decorator");
    assert.strictEqual(navBar.confidence, "explicit");

    // Find data-grid (full config decorator)
    const dataGrid = result.candidates.find(c => c.name === "data-grid" && c.kind === "element");
    assert.ok(dataGrid, "Should find data-grid element");
    assert.ok(dataGrid.aliases.includes("grid"), "data-grid should have 'grid' alias");
    assert.ok(dataGrid.aliases.includes("table-view"), "data-grid should have 'table-view' alias");
    assert.strictEqual(dataGrid.containerless, true, "data-grid should be containerless");

    // Find user-card (separate decorators)
    const userCard = result.candidates.find(c => c.name === "user-card" && c.kind === "element");
    assert.ok(userCard, "Should find user-card element");
    assert.strictEqual(userCard.containerless, true, "user-card should be containerless");

    // Check bindables
    const nameBindable = userCard.bindables.find(b => b.name === "name");
    assert.ok(nameBindable, "user-card should have 'name' bindable");
  });

  it("correctly resolves static $au resources", () => {
    const program = createProgramFromApp(EXPLICIT_APP);
    const allFacts = extractAllFacts(program);
    const appFacts = filterAppFacts(allFacts, EXPLICIT_APP);

    const pipeline = createResolverPipeline();
    const result = pipeline.resolve(appFacts);

    // Find fancy-button (static $au element)
    const fancyButton = result.candidates.find(c => c.name === "fancy-button" && c.kind === "element");
    assert.ok(fancyButton, "Should find fancy-button element");
    assert.strictEqual(fancyButton.className, "FancyButton");
    assert.strictEqual(fancyButton.resolver, "static-au");
    assert.ok(fancyButton.aliases.includes("btn"), "fancy-button should have 'btn' alias");

    // Find currency (static $au value converter)
    const currency = result.candidates.find(c => c.name === "currency" && c.kind === "valueConverter");
    assert.ok(currency, "Should find currency value converter");
    assert.strictEqual(currency.className, "CurrencyValueConverter");
    assert.strictEqual(currency.resolver, "static-au");
  });

  it("correctly resolves attributes with primary bindables", () => {
    const program = createProgramFromApp(EXPLICIT_APP);
    const allFacts = extractAllFacts(program);
    const appFacts = filterAppFacts(allFacts, EXPLICIT_APP);

    const pipeline = createResolverPipeline();
    const result = pipeline.resolve(appFacts);

    // Find highlight (attribute with primary bindable)
    const highlight = result.candidates.find(c => c.name === "highlight" && c.kind === "attribute");
    assert.ok(highlight, "Should find highlight attribute");
    assert.strictEqual(highlight.primary, "color", "highlight primary should be 'color'");

    // Find tooltip (simple attribute)
    const tooltip = result.candidates.find(c => c.name === "tooltip" && c.kind === "attribute");
    assert.ok(tooltip, "Should find tooltip attribute");
  });

  it("correctly resolves value converters and binding behaviors", () => {
    const program = createProgramFromApp(EXPLICIT_APP);
    const allFacts = extractAllFacts(program);
    const appFacts = filterAppFacts(allFacts, EXPLICIT_APP);

    const pipeline = createResolverPipeline();
    const result = pipeline.resolve(appFacts);

    // Find date value converter
    const date = result.candidates.find(c => c.name === "date" && c.kind === "valueConverter");
    assert.ok(date, "Should find date value converter");
    assert.strictEqual(date.resolver, "decorator");

    // Find debounce binding behavior
    const debounce = result.candidates.find(c => c.name === "debounce" && c.kind === "bindingBehavior");
    assert.ok(debounce, "Should find debounce binding behavior");
    assert.strictEqual(debounce.resolver, "decorator");

    // Find throttle binding behavior
    const throttle = result.candidates.find(c => c.name === "throttle" && c.kind === "bindingBehavior");
    assert.ok(throttle, "Should find throttle binding behavior");
  });

  it("correctly resolves bindable attribute mappings", () => {
    const program = createProgramFromApp(EXPLICIT_APP);
    const allFacts = extractAllFacts(program);
    const appFacts = filterAppFacts(allFacts, EXPLICIT_APP);

    const pipeline = createResolverPipeline();
    const result = pipeline.resolve(appFacts);

    // Find stock-badge with attribute mapping
    const stockBadge = result.candidates.find(c => c.name === "stock-badge" && c.kind === "element");
    assert.ok(stockBadge, "Should find stock-badge element");

    const inStockBindable = stockBadge.bindables.find(b => b.name === "inStock");
    assert.ok(inStockBindable, "stock-badge should have 'inStock' bindable");
    assert.strictEqual(inStockBindable.attribute, "in-stock", "inStock should map to 'in-stock' attribute");
  });
});
