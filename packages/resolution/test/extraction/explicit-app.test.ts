import { describe, it, expect, beforeAll } from "vitest";
import { extractAllFileFacts } from "@aurelia-ls/resolution";
import type { FileFacts, ClassValue } from "@aurelia-ls/resolution";
import type { NormalizedPath } from "@aurelia-ls/compiler";
import {
  createProgramFromApp,
  getTestAppPath,
  filterFactsByPathPattern,
} from "../_helpers/index.js";

const EXPLICIT_APP = getTestAppPath("explicit-app", import.meta.url);

/**
 * Helper to get a string property from static $au.
 */
function getStaticAuProperty(cls: ClassValue, prop: string): string | undefined {
  const auValue = cls.staticMembers.get('$au');
  if (auValue?.kind !== 'object') return undefined;
  const propValue = auValue.properties.get(prop);
  if (propValue?.kind !== 'literal' || typeof propValue.value !== 'string') return undefined;
  return propValue.value;
}

/**
 * Helper to get bindables array from static $au.
 * Handles both string form ('prop') and object form ({ name: 'prop', ... }).
 */
function getStaticAuBindables(cls: ClassValue): string[] {
  const auValue = cls.staticMembers.get('$au');
  if (auValue?.kind !== 'object') return [];
  const bindablesValue = auValue.properties.get('bindables');
  if (!bindablesValue) return [];

  // Handle array form: bindables: ['prop1', { name: 'prop2' }]
  if (bindablesValue.kind === 'array') {
    const names: string[] = [];
    for (const el of bindablesValue.elements) {
      // String form: 'propName'
      if (el.kind === 'literal' && typeof el.value === 'string') {
        names.push(el.value);
      }
      // Object form: { name: 'propName', ... }
      else if (el.kind === 'object') {
        const nameVal = el.properties.get('name');
        if (nameVal?.kind === 'literal' && typeof nameVal.value === 'string') {
          names.push(nameVal.value);
        }
      }
    }
    return names;
  }

  // Handle object form: bindables: { prop1: {}, prop2: {} }
  if (bindablesValue.kind === 'object') {
    return [...bindablesValue.properties.keys()];
  }

  return [];
}

describe("Extraction: explicit-app", () => {
  let appFacts: Map<NormalizedPath, FileFacts>;

  beforeAll(() => {
    const program = createProgramFromApp(EXPLICIT_APP);
    const allFacts = extractAllFileFacts(program);
    appFacts = filterFactsByPathPattern(allFacts, "/explicit-app/src/");
  });

  it("extracts facts from all source files", () => {
    // Count files - should have all source files from explicit-app
    expect(appFacts.size).toBeGreaterThan(10);

    // Check specific files exist
    const paths = [...appFacts.keys()].map(p => p.replace(/\\/g, "/"));
    expect(paths.some(p => p.includes("main.ts")), "Should have main.ts").toBe(true);
    expect(paths.some(p => p.includes("my-app.ts")), "Should have my-app.ts").toBe(true);
    expect(paths.some(p => p.includes("nav-bar.ts")), "Should have nav-bar.ts").toBe(true);
  });

  it("extracts decorators correctly", () => {
    // Find nav-bar.ts facts
    const navBarFacts = [...appFacts.values()].find(f =>
      f.path.replace(/\\/g, "/").includes("nav-bar.ts")
    );
    expect(navBarFacts, "Should find nav-bar.ts").toBeTruthy();

    const navBarClass = navBarFacts!.classes.find(c => c.className === "NavBar");
    expect(navBarClass, "Should find NavBar class").toBeTruthy();
    expect(navBarClass!.decorators.length).toBeGreaterThan(0);
    expect(navBarClass!.decorators.some(d => d.name === "customElement"), "Should have @customElement").toBe(true);
  });

  it("extracts static $au correctly", () => {
    // Find fancy-button.ts facts
    const fancyButtonFacts = [...appFacts.values()].find(f =>
      f.path.replace(/\\/g, "/").includes("fancy-button.ts")
    );
    expect(fancyButtonFacts, "Should find fancy-button.ts").toBeTruthy();

    const fancyButtonClass = fancyButtonFacts!.classes.find(c => c.className === "FancyButton");
    expect(fancyButtonClass, "Should find FancyButton class").toBeTruthy();

    // Check static $au
    const auValue = fancyButtonClass!.staticMembers.get('$au');
    expect(auValue, "FancyButton should have static $au").toBeTruthy();
    expect(auValue!.kind).toBe('object');

    const type = getStaticAuProperty(fancyButtonClass!, 'type');
    expect(type).toBe('custom-element');

    const name = getStaticAuProperty(fancyButtonClass!, 'name');
    expect(name).toBe('fancy-button');

    const bindables = getStaticAuBindables(fancyButtonClass!);
    expect(bindables.length).toBe(3);
  });

  it("extracts static dependencies correctly", () => {
    // Find product-card.ts facts
    const productCardFacts = [...appFacts.values()].find(f =>
      f.path.replace(/\\/g, "/").includes("product-card.ts")
    );
    expect(productCardFacts, "Should find product-card.ts").toBeTruthy();

    const productCardClass = productCardFacts!.classes.find(c => c.className === "ProductCard");
    expect(productCardClass, "Should find ProductCard class").toBeTruthy();

    // Check static dependencies
    const deps = productCardClass!.staticMembers.get('dependencies');
    expect(deps, "ProductCard should have static dependencies").toBeTruthy();
    expect(deps!.kind).toBe('array');

    if (deps!.kind === 'array') {
      expect(deps.elements.length).toBe(2);

      // Check dependency names (they're references to imported classes)
      const depNames = deps.elements
        .filter(el => el.kind === 'reference')
        .map(el => (el as { kind: 'reference'; name: string }).name)
        .sort();
      expect(depNames).toEqual(["PriceTag", "StockBadge"]);
    }
  });

  it("extracts @bindable members correctly", () => {
    // Find user-card.ts facts
    const userCardFacts = [...appFacts.values()].find(f =>
      f.path.replace(/\\/g, "/").includes("user-card.ts")
    );
    expect(userCardFacts, "Should find user-card.ts").toBeTruthy();

    const userCardClass = userCardFacts!.classes.find(c => c.className === "UserCard");
    expect(userCardClass, "Should find UserCard class").toBeTruthy();
    expect(userCardClass!.bindableMembers.length).toBeGreaterThan(0);

    const bindableNames = userCardClass!.bindableMembers.map(b => b.name).sort();
    expect(bindableNames).toEqual(["avatar", "name", "selected"]);
  });

  it("extracts registration calls correctly", () => {
    // Find main.ts facts
    const mainFacts = [...appFacts.values()].find(f =>
      f.path.replace(/\\/g, "/").includes("main.ts")
    );
    expect(mainFacts, "Should find main.ts").toBeTruthy();

    expect(mainFacts!.registrationCalls.length).toBeGreaterThan(0);

    const aureliaCall = mainFacts!.registrationCalls.find(c => c.receiver === "aurelia");
    expect(aureliaCall, "Should find Aurelia.register() call").toBeTruthy();
    expect(aureliaCall!.arguments.length).toBe(5); // 5 spread arguments
  });
});
