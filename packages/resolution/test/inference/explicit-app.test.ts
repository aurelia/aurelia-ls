import { describe, it, expect, beforeAll } from "vitest";
import { extractAllFacts } from "@aurelia-ls/resolution";
import { createResolverPipeline } from "@aurelia-ls/resolution";
import {
  createProgramFromApp,
  getTestAppPath,
  filterFactsByPathPattern,
} from "../_helpers/index.js";

const EXPLICIT_APP = getTestAppPath("explicit-app", import.meta.url);

describe("Inference: explicit-app", () => {
  let result: ReturnType<ReturnType<typeof createResolverPipeline>["resolve"]>;

  beforeAll(() => {
    const program = createProgramFromApp(EXPLICIT_APP);
    const allFacts = extractAllFacts(program);
    const appFacts = filterFactsByPathPattern(allFacts, "/explicit-app/src/");
    const pipeline = createResolverPipeline();
    result = pipeline.resolve(appFacts);
  });

  it("resolves all resource candidates from explicit-app", () => {
    // Group candidates by kind for structured assertions
    const elements = result.candidates.filter(c => c.kind === "element");
    const attributes = result.candidates.filter(c => c.kind === "attribute");
    const valueConverters = result.candidates.filter(c => c.kind === "valueConverter");
    const bindingBehaviors = result.candidates.filter(c => c.kind === "bindingBehavior");

    // Assert exact element names found
    const elementNames = elements.map(e => e.name).sort();
    expect(elementNames, "Should find exactly these 8 elements").toEqual([
      "data-grid", "fancy-button", "my-app", "nav-bar",
      "price-tag", "product-card", "stock-badge", "user-card"
    ]);

    // Assert exact attribute names found
    const attributeNames = attributes.map(a => a.name).sort();
    expect(attributeNames, "Should find exactly these 2 attributes").toEqual(["highlight", "tooltip"]);

    // Assert exact value converter names found
    const vcNames = valueConverters.map(v => v.name).sort();
    expect(vcNames, "Should find exactly these 2 value converters").toEqual(["currency", "date"]);

    // Assert exact binding behavior names found
    const bbNames = bindingBehaviors.map(b => b.name).sort();
    expect(bbNames, "Should find exactly these 2 binding behaviors").toEqual(["debounce", "throttle"]);
  });

  it("correctly resolves decorator-based elements", () => {
    // Find nav-bar (simple decorator)
    const navBar = result.candidates.find(c => c.name === "nav-bar" && c.kind === "element");
    expect(navBar, "Should find nav-bar element").toBeTruthy();
    expect(navBar!.className).toBe("NavBar");
    expect(navBar!.resolver).toBe("decorator");
    expect(navBar!.confidence).toBe("explicit");

    // Find data-grid (full config decorator)
    const dataGrid = result.candidates.find(c => c.name === "data-grid" && c.kind === "element");
    expect(dataGrid, "Should find data-grid element").toBeTruthy();
    expect(dataGrid!.aliases.includes("grid"), "data-grid should have 'grid' alias").toBe(true);
    expect(dataGrid!.aliases.includes("table-view"), "data-grid should have 'table-view' alias").toBe(true);
    expect(dataGrid!.containerless, "data-grid should be containerless").toBe(true);

    // Find user-card (separate decorators)
    const userCard = result.candidates.find(c => c.name === "user-card" && c.kind === "element");
    expect(userCard, "Should find user-card element").toBeTruthy();
    expect(userCard!.containerless, "user-card should be containerless").toBe(true);

    // Check bindables
    const nameBindable = userCard!.bindables.find(b => b.name === "name");
    expect(nameBindable, "user-card should have 'name' bindable").toBeTruthy();
  });

  it("correctly resolves static $au resources", () => {
    // Find fancy-button (static $au element)
    const fancyButton = result.candidates.find(c => c.name === "fancy-button" && c.kind === "element");
    expect(fancyButton, "Should find fancy-button element").toBeTruthy();
    expect(fancyButton!.className).toBe("FancyButton");
    expect(fancyButton!.resolver).toBe("static-au");
    expect(fancyButton!.aliases.includes("btn"), "fancy-button should have 'btn' alias").toBe(true);

    // Find currency (static $au value converter)
    const currency = result.candidates.find(c => c.name === "currency" && c.kind === "valueConverter");
    expect(currency, "Should find currency value converter").toBeTruthy();
    expect(currency!.className).toBe("CurrencyValueConverter");
    expect(currency!.resolver).toBe("static-au");
  });

  it("correctly resolves attributes with primary bindables", () => {
    // Find highlight (attribute with primary bindable)
    const highlight = result.candidates.find(c => c.name === "highlight" && c.kind === "attribute");
    expect(highlight, "Should find highlight attribute").toBeTruthy();
    expect(highlight!.primary, "highlight primary should be 'color'").toBe("color");

    // Find tooltip (simple attribute)
    const tooltip = result.candidates.find(c => c.name === "tooltip" && c.kind === "attribute");
    expect(tooltip, "Should find tooltip attribute").toBeTruthy();
  });

  it("correctly resolves value converters and binding behaviors", () => {
    // Find date value converter
    const date = result.candidates.find(c => c.name === "date" && c.kind === "valueConverter");
    expect(date, "Should find date value converter").toBeTruthy();
    expect(date!.resolver).toBe("decorator");

    // Find debounce binding behavior
    const debounce = result.candidates.find(c => c.name === "debounce" && c.kind === "bindingBehavior");
    expect(debounce, "Should find debounce binding behavior").toBeTruthy();
    expect(debounce!.resolver).toBe("decorator");

    // Find throttle binding behavior
    const throttle = result.candidates.find(c => c.name === "throttle" && c.kind === "bindingBehavior");
    expect(throttle, "Should find throttle binding behavior").toBeTruthy();
  });

  it("correctly resolves bindable attribute mappings", () => {
    // Find stock-badge with attribute mapping
    const stockBadge = result.candidates.find(c => c.name === "stock-badge" && c.kind === "element");
    expect(stockBadge, "Should find stock-badge element").toBeTruthy();

    const inStockBindable = stockBadge!.bindables.find(b => b.name === "inStock");
    expect(inStockBindable, "stock-badge should have 'inStock' bindable").toBeTruthy();
    expect(inStockBindable!.attribute, "inStock should map to 'in-stock' attribute").toBe("in-stock");
  });
});
