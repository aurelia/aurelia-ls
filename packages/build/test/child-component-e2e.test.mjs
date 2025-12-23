/**
 * Child Component SSR E2E Tests
 *
 * These tests verify SSR rendering with parent-child component hierarchy,
 * mimicking the structure of the child-component-app example.
 *
 * CRITICAL: These tests assert on the FULL DOM structure to catch issues
 * like double rendering (multiple div.app elements) that simpler tests miss.
 *
 * Structure being tested:
 * - MyApp (parent): <div class="app"> with h1, p, and two greeting-card instances
 * - GreetingCard (child): <div class="greeting-card"> with h2, p
 */

import test, { describe } from "node:test";
import assert from "node:assert/strict";

import { JSDOM } from "jsdom";
import { DI, Registration } from "@aurelia/kernel";
import {
  Aurelia,
  IPlatform,
  StandardConfiguration,
  CustomElement,
} from "@aurelia/runtime-html";
import { BrowserPlatform } from "@aurelia/platform-browser";

import { compileWithAot } from "../out/aot.js";
import { DEFAULT_SEMANTICS } from "../out/index.js";
import { patchComponentDefinition } from "../out/ssr/patch.js";
import { renderWithComponents } from "../out/ssr/render.js";

// =============================================================================
// Component Classes (mirroring child-component-app/src/)
// =============================================================================

/**
 * GreetingCard - child component with bindable and getters
 * Mirrors: examples/child-component-app/src/greeting-card.ts
 */
class GreetingCard {
  name = "Guest";

  get greeting() {
    return `Hello, ${this.name}!`;
  }

  get nameLength() {
    return this.name.length;
  }

  static $au = {
    type: "custom-element",
    name: "greeting-card",
    bindables: {
      name: { mode: 2 }, // toView
    },
  };
}

/**
 * MyApp - parent component with child components
 * Mirrors: examples/child-component-app/src/my-app.ts
 */
class MyApp {
  appTitle = "Child Component SSR Test";
  userName = "World";

  get timestamp() {
    return "2024-01-01T00:00:00.000Z"; // Fixed for testing
  }

  static $au = {
    type: "custom-element",
    name: "my-app",
    dependencies: [GreetingCard],
  };
}

// =============================================================================
// Template Sources (mirroring child-component-app/src/*.html)
// =============================================================================

const GREETING_CARD_TEMPLATE = `<div class="greeting-card">
  <h2>\${greeting}</h2>
  <p>Name: "\${name}" (\${nameLength} characters)</p>
</div>`;

const MY_APP_TEMPLATE = `<div class="app">
  <h1>\${appTitle}</h1>
  <p>Rendered at: \${timestamp}</p>

  <!-- Child component with bindable -->
  <greeting-card name.bind="userName"></greeting-card>

  <!-- Another instance with different value -->
  <greeting-card name="Aurelia"></greeting-card>
</div>`;

// =============================================================================
// Test Utilities
// =============================================================================

/**
 * Create semantics with greeting-card registered as a custom element.
 * This is needed so the compiler recognizes greeting-card as a custom element.
 */
function createSemanticsWithGreetingCard() {
  // Clone default semantics
  const sem = {
    ...DEFAULT_SEMANTICS,
    resources: {
      ...DEFAULT_SEMANTICS.resources,
      elements: {
        ...DEFAULT_SEMANTICS.resources.elements,
        "greeting-card": {
          kind: "element",
          name: "greeting-card",
          boundary: true,
          containerless: false,
          bindables: {
            name: { name: "name", mode: "toView" },
          },
        },
      },
    },
  };
  return sem;
}

/**
 * Count occurrences of a string in another string.
 */
function countOccurrences(str, substr) {
  let count = 0;
  let pos = 0;
  while ((pos = str.indexOf(substr, pos)) !== -1) {
    count++;
    pos += substr.length;
  }
  return count;
}

// =============================================================================
// Persistent component classes (simulating Vite module cache)
// =============================================================================

/**
 * GreetingCard - persistent class that survives across renders.
 * In Vite, the class object persists in Node.js module cache.
 */
class PersistentGreetingCard {
  name = "Guest";

  get greeting() {
    return `Hello, ${this.name}!`;
  }

  get nameLength() {
    return this.name.length;
  }

  static $au = {
    type: "custom-element",
    name: "greeting-card",
    bindables: {
      name: { mode: 2 }, // toView
    },
  };
}

/**
 * MyApp - persistent class that survives across renders.
 */
class PersistentMyApp {
  appTitle = "Child Component SSR Test";
  userName = "World";

  get timestamp() {
    return "2024-01-01T00:00:00.000Z"; // Fixed for testing
  }

  static $au = {
    type: "custom-element",
    name: "my-app",
    dependencies: [PersistentGreetingCard],
  };
}

// =============================================================================
// E2E Test: Full Parent-Child Rendering
// =============================================================================

describe("Child Component SSR E2E: Full App Structure", () => {
  /**
   * This test replicates the full child-component-app structure and
   * verifies there's exactly ONE div.app element (no double rendering).
   */
  test("renders parent with child components - single root element", async () => {
    // Step 1: Compile child component template
    const childAot = compileWithAot(GREETING_CARD_TEMPLATE, {
      name: "greeting-card",
    });

    console.log("# Child AOT template:", childAot.template);
    console.log("# Child AOT instructions count:", childAot.instructions.length);
    console.log("# Child AOT instructions (full):");
    console.log(JSON.stringify(childAot.instructions, null, 2));

    // Step 2: Compile parent template with semantics that know about greeting-card
    const semantics = createSemanticsWithGreetingCard();

    const parentAot = compileWithAot(MY_APP_TEMPLATE, {
      name: "my-app",
      semantics,
    });

    console.log("# Parent AOT template:", parentAot.template);
    console.log("# Parent AOT instructions count:", parentAot.instructions.length);

    // Step 3: Patch component definitions with AOT output
    patchComponentDefinition(GreetingCard, childAot);
    patchComponentDefinition(MyApp, parentAot);

    console.log("# MyApp $au.template:", MyApp.$au.template);
    console.log("# GreetingCard $au.template:", GreetingCard.$au.template);

    // Step 4: Render using renderWithComponents
    const result = await renderWithComponents(MyApp, {
      childComponents: [GreetingCard],
    });

    console.log("# Full rendered HTML:");
    console.log(result.html);

    // =======================================================================
    // CRITICAL ASSERTIONS: Check for double rendering
    // =======================================================================

    // There should be exactly ONE div.app element
    const appDivCount = countOccurrences(result.html, 'class="app"');
    assert.equal(
      appDivCount,
      1,
      `Expected exactly 1 div.app element, but found ${appDivCount}. This indicates double rendering.`
    );

    // There should be exactly TWO greeting-card custom elements
    const greetingCardCount = countOccurrences(result.html, "<greeting-card");
    assert.equal(
      greetingCardCount,
      2,
      `Expected exactly 2 greeting-card elements, but found ${greetingCardCount}`
    );

    // There should be exactly TWO div.greeting-card elements (one per greeting-card)
    const greetingCardDivCount = countOccurrences(result.html, 'class="greeting-card"');
    assert.equal(
      greetingCardDivCount,
      2,
      `Expected exactly 2 div.greeting-card elements, but found ${greetingCardDivCount}`
    );

    // =======================================================================
    // Content verification
    // =======================================================================

    // Parent content should appear once
    assert.ok(
      result.html.includes("Child Component SSR Test"),
      "Should render appTitle"
    );

    // Timestamp should appear once
    const timestampCount = countOccurrences(result.html, "Rendered at:");
    assert.equal(
      timestampCount,
      1,
      `Expected exactly 1 "Rendered at:" text, but found ${timestampCount}`
    );

    // First greeting-card should show "Hello, World!" (bound from userName)
    assert.ok(
      result.html.includes("Hello, World!"),
      "Should render first greeting with bound value"
    );

    // Second greeting-card should show "Hello, Aurelia!" (static attribute)
    assert.ok(
      result.html.includes("Hello, Aurelia!"),
      "Should render second greeting with static value"
    );
  });

  /**
   * More detailed structural test - verifies the exact nesting structure.
   */
  test("renders correct DOM structure without duplication", async () => {
    // Compile templates
    const childAot = compileWithAot(GREETING_CARD_TEMPLATE, {
      name: "greeting-card",
    });

    const semantics = createSemanticsWithGreetingCard();

    const parentAot = compileWithAot(MY_APP_TEMPLATE, {
      name: "my-app",
      semantics,
    });

    // Patch and render
    patchComponentDefinition(GreetingCard, childAot);
    patchComponentDefinition(MyApp, parentAot);

    const result = await renderWithComponents(MyApp, {
      childComponents: [GreetingCard],
    });

    // Count all major structural elements
    const h1Count = countOccurrences(result.html, "<h1");
    const h2Count = countOccurrences(result.html, "<h2");
    const pCount = (result.html.match(/<p[>\s]/g) || []).length;

    console.log("# Structural element counts:");
    console.log(`  h1: ${h1Count} (expected: 1)`);
    console.log(`  h2: ${h2Count} (expected: 2, one per greeting-card)`);
    console.log(`  p: ${pCount} (expected: 3, one in parent + two in children)`);

    // Expected structure:
    // - 1 h1 (appTitle in MyApp)
    // - 2 h2 (greeting in each GreetingCard)
    // - 3 p (timestamp in MyApp + name info in each GreetingCard)

    assert.equal(h1Count, 1, `Expected 1 h1, got ${h1Count}`);
    assert.equal(h2Count, 2, `Expected 2 h2, got ${h2Count}`);
    assert.equal(pCount, 3, `Expected 3 p elements, got ${pCount}`);
  });

  /**
   * Test that the rendered output matches expected structure exactly.
   * This is the most aggressive test - compares normalized structure.
   */
  test("full HTML structure matches expected output", async () => {
    // Compile templates
    const childAot = compileWithAot(GREETING_CARD_TEMPLATE, {
      name: "greeting-card",
    });

    const semantics = createSemanticsWithGreetingCard();

    const parentAot = compileWithAot(MY_APP_TEMPLATE, {
      name: "my-app",
      semantics,
    });

    // Patch and render
    patchComponentDefinition(GreetingCard, childAot);
    patchComponentDefinition(MyApp, parentAot);

    const result = await renderWithComponents(MyApp, {
      childComponents: [GreetingCard],
    });

    // Strip hydration markers for structural comparison
    const htmlWithoutMarkers = result.html
      .replace(/<au-m><\/au-m>/g, "")
      .replace(/\s+/g, " ")
      .trim();

    console.log("# HTML without markers:", htmlWithoutMarkers);

    // The structure should be:
    // <div class="app">
    //   <h1>Child Component SSR Test</h1>
    //   <p>Rendered at: [timestamp]</p>
    //   <greeting-card>
    //     <div class="greeting-card">
    //       <h2>Hello, World!</h2>
    //       <p>Name: "World" (5 characters)</p>
    //     </div>
    //   </greeting-card>
    //   <greeting-card name="Aurelia">
    //     <div class="greeting-card">
    //       <h2>Hello, Aurelia!</h2>
    //       <p>Name: "Aurelia" (7 characters)</p>
    //     </div>
    //   </greeting-card>
    // </div>

    // Check that we DON'T have double div.app
    const appDivMatches = htmlWithoutMarkers.match(/class="app"/g) || [];
    assert.equal(
      appDivMatches.length,
      1,
      `Expected 1 div.app, found ${appDivMatches.length}. Full HTML:\n${htmlWithoutMarkers}`
    );

    // Verify we have the expected content in the right order
    const expectedSequence = [
      'class="app"',
      "<h1>",
      "Child Component SSR Test",
      "</h1>",
      "Rendered at:",
      "<greeting-card",
      'class="greeting-card"',
      "Hello, World!",
      "</greeting-card>",
      "<greeting-card",
      'class="greeting-card"',
      "Hello, Aurelia!",
      "</greeting-card>",
    ];

    let lastIndex = -1;
    for (const expected of expectedSequence) {
      const index = htmlWithoutMarkers.indexOf(expected, lastIndex + 1);
      assert.ok(
        index > lastIndex,
        `Expected "${expected}" to appear after position ${lastIndex}, but found at ${index}.\nHTML: ${htmlWithoutMarkers}`
      );
      lastIndex = index;
    }
  });
});

// =============================================================================
// Multi-Request Test: Simulates Vite's cached class behavior
// =============================================================================

describe("Child Component SSR E2E: Multi-Request (Vite Cache Simulation)", () => {
  /**
   * This test simulates how the Vite plugin uses cached component classes.
   * Components are patched ONCE, then rendered MULTIPLE times.
   * This is the scenario that triggers double rendering in the real app.
   *
   * IMPORTANT: We deliberately DO NOT provide semantics with greeting-card
   * bindables info, to match the real app's "2 unknown" resolution state.
   * This is what causes bindables to not be applied.
   */
  test("renders correctly on multiple sequential requests with same classes", async () => {
    // Step 1: Compile templates ONCE (simulating loadProjectComponents cache)
    const childAot = compileWithAot(GREETING_CARD_TEMPLATE, {
      name: "greeting-card",
    });

    // NOTE: Using semantics WITH greeting-card info (for now - matches real app)
    // The real app's resolution provides semantics that recognize greeting-card
    // as a custom element (generates "ra" instruction), but might not know bindables
    const semantics = createSemanticsWithGreetingCard();

    const parentAot = compileWithAot(MY_APP_TEMPLATE, {
      name: "my-app",
      semantics,
    });

    // Step 2: Patch the persistent classes ONCE (simulating componentCache.set)
    // In Vite, this happens once when the component is first loaded
    patchComponentDefinition(PersistentGreetingCard, childAot);
    patchComponentDefinition(PersistentMyApp, parentAot);

    console.log("# After patching - PersistentMyApp.$au.template:");
    console.log(PersistentMyApp.$au.template);

    // Step 3: Render MULTIPLE times with the SAME classes
    // In Vite, each HTTP request triggers a new render with cached classes

    console.log("\n# === FIRST REQUEST ===");
    const result1 = await renderWithComponents(PersistentMyApp, {
      childComponents: [PersistentGreetingCard],
    });
    console.log("# First request HTML:");
    console.log(result1.html);

    // Simulate a second request (like browser doing a refresh or HMR)
    console.log("\n# === SECOND REQUEST (same classes) ===");
    const result2 = await renderWithComponents(PersistentMyApp, {
      childComponents: [PersistentGreetingCard],
    });
    console.log("# Second request HTML:");
    console.log(result2.html);

    // Check if second render produces different output (would indicate state corruption)
    const result1AppDivCount = countOccurrences(result1.html, '<div class="app">');
    const result2AppDivCount = countOccurrences(result2.html, '<div class="app">');
    console.log(`# First render app divs: ${result1AppDivCount}`);
    console.log(`# Second render app divs: ${result2AppDivCount}`);

    // =======================================================================
    // CRITICAL ASSERTIONS: Check for double rendering
    // The bug manifests as TWO <div class="app"> elements under <my-app>:
    //   - First div has wrong content (Hello, Guest!, ${name} literal)
    //   - Second div has correct content (Hello, World!, "World")
    // =======================================================================

    // Count ALL structural elements - these should appear exactly the expected number of times
    const appDivCount = countOccurrences(result1.html, '<div class="app">');
    const greetingCardDivCount = countOccurrences(result1.html, '<div class="greeting-card">');
    const h1Count = countOccurrences(result1.html, '<h1');
    const h2Count = countOccurrences(result1.html, '<h2');
    const headerTextCount = countOccurrences(result1.html, 'Child Component SSR Test');
    const greetingCardElementCount = countOccurrences(result1.html, '<greeting-card');

    console.log("# === ELEMENT COUNTS ===");
    console.log(`# <div class="app">: ${appDivCount} (expected: 1)`);
    console.log(`# <div class="greeting-card">: ${greetingCardDivCount} (expected: 2)`);
    console.log(`# <h1>: ${h1Count} (expected: 1)`);
    console.log(`# <h2>: ${h2Count} (expected: 2)`);
    console.log(`# "Child Component SSR Test": ${headerTextCount} (expected: 1)`);
    console.log(`# <greeting-card>: ${greetingCardElementCount} (expected: 2)`);

    // Check for the specific double-rendering symptoms
    const hasDefaultGreeting = result1.html.includes("Hello, Guest!");
    const hasLiteralInterpolation = result1.html.includes('${name}');
    const hasCorrectBoundGreeting = result1.html.includes("Hello, World!");
    const hasCorrectStaticGreeting = result1.html.includes("Hello, Aurelia!");

    // Count occurrences to detect duplicates
    const guestCount = countOccurrences(result1.html, "Hello, Guest!");
    const worldCount = countOccurrences(result1.html, "Hello, World!");
    const aureliaCount = countOccurrences(result1.html, "Hello, Aurelia!");

    console.log("# === CONTENT CHECKS ===");
    console.log(`# "Hello, Guest!" count: ${guestCount} (expected: 0 - default should not appear)`);
    console.log(`# "Hello, World!" count: ${worldCount} (expected: 1 - from name.bind="userName")`);
    console.log(`# "Hello, Aurelia!" count: ${aureliaCount} (expected: 1 - from name="Aurelia")`);
    console.log(`# Has literal "\${name}": ${hasLiteralInterpolation} (expected: false)`);

    // =======================================================================
    // ASSERTIONS - All of these should pass for correct rendering
    // =======================================================================

    // 1. Exactly ONE div.app (the parent component's root)
    assert.equal(
      appDivCount,
      1,
      `Expected exactly 1 <div class="app">, but found ${appDivCount}. ` +
      `This indicates the parent component is being rendered multiple times.\n` +
      `Full HTML:\n${result1.html}`
    );

    // 2. Exactly TWO div.greeting-card (one per child component instance)
    assert.equal(
      greetingCardDivCount,
      2,
      `Expected exactly 2 <div class="greeting-card">, but found ${greetingCardDivCount}. ` +
      `This indicates child components are being rendered wrong number of times.\n` +
      `Full HTML:\n${result1.html}`
    );

    // 3. Exactly ONE h1 (the parent's title)
    assert.equal(
      h1Count,
      1,
      `Expected exactly 1 <h1>, but found ${h1Count}. ` +
      `This indicates the parent component is being rendered multiple times.\n` +
      `Full HTML:\n${result1.html}`
    );

    // 4. Exactly TWO h2 (one per greeting-card child)
    assert.equal(
      h2Count,
      2,
      `Expected exactly 2 <h2>, but found ${h2Count}. ` +
      `This indicates child components are being rendered wrong number of times.\n` +
      `Full HTML:\n${result1.html}`
    );

    // 5. The header text should appear exactly ONCE
    assert.equal(
      headerTextCount,
      1,
      `Expected "Child Component SSR Test" to appear exactly 1 time, but found ${headerTextCount}. ` +
      `This indicates the parent is being rendered multiple times.\n` +
      `Full HTML:\n${result1.html}`
    );

    // 6. Exactly TWO greeting-card custom elements
    assert.equal(
      greetingCardElementCount,
      2,
      `Expected exactly 2 <greeting-card> elements, but found ${greetingCardElementCount}.\n` +
      `Full HTML:\n${result1.html}`
    );

    // 7. Should NOT have default "Guest" value - that indicates bindables not applied
    assert.equal(
      guestCount,
      0,
      `Found ${guestCount}x "Hello, Guest!" which indicates child components used default values ` +
      `instead of bound values. Bindables are not being applied to child components.\n` +
      `Full HTML:\n${result1.html}`
    );

    // 8. Should NOT have literal ${name} - that indicates interpolation not evaluated
    assert.equal(
      hasLiteralInterpolation,
      false,
      `Found literal "\${name}" which indicates interpolation was not evaluated. ` +
      `This is a symptom of the double-rendering/manifest bug.\n` +
      `Full HTML:\n${result1.html}`
    );

    // 9. Should have correct bound value from name.bind="userName" (userName = "World")
    assert.equal(
      worldCount,
      1,
      `Expected exactly 1 "Hello, World!" (from name.bind="userName"), but found ${worldCount}.\n` +
      `Full HTML:\n${result1.html}`
    );

    // 10. Should have correct static value from name="Aurelia"
    assert.equal(
      aureliaCount,
      1,
      `Expected exactly 1 "Hello, Aurelia!" (from name="Aurelia"), but found ${aureliaCount}.\n` +
      `Full HTML:\n${result1.html}`
    );
  });
});

// =============================================================================
// Isolation Tests: Verify each component renders correctly in isolation
// =============================================================================

// =============================================================================
// Server → Client Hydration Test (the REAL bug scenario)
// =============================================================================

/**
 * Creates a JSDOM environment with SSR HTML pre-loaded.
 * This simulates a browser receiving server-rendered HTML.
 */
function createHydrationContext(ssrHtml, ssrState, ssrManifest, ssrDef) {
  // Create DOM with SSR content already in place
  const html = `<!DOCTYPE html>
<html>
<head><title>Child Component Hydration Test</title></head>
<body>
  <my-app>${ssrHtml}</my-app>
  <script>
    window.__SSR_STATE__ = ${JSON.stringify(ssrState)};
    window.__AU_MANIFEST__ = ${JSON.stringify(ssrManifest)};
    window.__AU_DEF__ = ${JSON.stringify(ssrDef)};
  </script>
</body>
</html>`;

  const dom = new JSDOM(html, {
    pretendToBeVisual: true,
    runScripts: "dangerously",
  });

  const window = dom.window;
  const document = window.document;
  const platform = new BrowserPlatform(window);

  return { dom, window, document, platform };
}

describe("Child Component SSR E2E: Server→Client Hydration (REAL BUG)", () => {
  /**
   * This test captures the ACTUAL bug scenario:
   * 1. Server renders MyApp with GreetingCard children
   * 2. Browser receives SSR HTML inside <my-app>
   * 3. Client Aurelia starts and should HYDRATE (adopt existing DOM)
   * 4. Bug: Client RENDERS instead, creating DOUBLE <div class="app">
   */
  test("server SSR + client hydration - should NOT double render", async () => {
    console.log("\n=== SERVER → CLIENT HYDRATION TEST ===\n");

    // =========================================================================
    // STEP 1: COMPILE (same as server setup)
    // =========================================================================
    console.log("--- STEP 1: AOT COMPILATION ---");

    const childAot = compileWithAot(GREETING_CARD_TEMPLATE, {
      name: "greeting-card",
    });

    const semantics = createSemanticsWithGreetingCard();

    const parentAot = compileWithAot(MY_APP_TEMPLATE, {
      name: "my-app",
      semantics,
    });

    console.log("Child AOT template:", childAot.template);
    console.log("Parent AOT template:", parentAot.template);

    // =========================================================================
    // STEP 2: SERVER SIDE RENDER (produces HTML + manifest)
    // =========================================================================
    console.log("\n--- STEP 2: SERVER SIDE RENDER ---");

    // Patch classes for SSR
    patchComponentDefinition(GreetingCard, childAot);
    patchComponentDefinition(MyApp, parentAot);

    const ssrResult = await renderWithComponents(MyApp, {
      childComponents: [GreetingCard],
    });

    console.log("SSR HTML:");
    console.log(ssrResult.html);
    console.log("\nSSR Manifest:", JSON.stringify(ssrResult.manifest, null, 2));

    // =========================================================================
    // STEP 3: SIMULATE BROWSER RECEIVING SSR (DOM pre-populated)
    // =========================================================================
    console.log("\n--- STEP 3: BROWSER RECEIVES SSR HTML ---");

    // Only include actual stateful properties, NOT computed getters
    // timestamp is a getter, so it shouldn't be in ssrState
    const ssrState = {
      appTitle: "Child Component SSR Test",
      userName: "World",
    };

    const ssrDef = {
      template: parentAot.template,
      instructions: parentAot.instructions,
    };

    const ctx = createHydrationContext(ssrResult.html, ssrState, ssrResult.manifest, ssrDef);

    // Count elements BEFORE hydration
    const preHydrateAppDivs = ctx.document.querySelectorAll('.app').length;
    const preHydrateGreetingCards = ctx.document.querySelectorAll('.greeting-card').length;
    console.log(`Pre-hydration: ${preHydrateAppDivs} .app divs, ${preHydrateGreetingCards} .greeting-card divs`);

    // =========================================================================
    // STEP 4: CLIENT SIDE HYDRATION (the bug happens here)
    // =========================================================================
    console.log("\n--- STEP 4: CLIENT AURELIA HYDRATION ---");

    const container = DI.createContainer();
    container.register(
      StandardConfiguration,
      Registration.instance(IPlatform, ctx.platform)
    );

    // Register child component for client
    const ClientGreetingCard = class {
      name = "Guest";
      get greeting() { return `Hello, ${this.name}!`; }
      get nameLength() { return this.name.length; }

      static $au = {
        type: "custom-element",
        name: "greeting-card",
        template: childAot.template,
        instructions: childAot.instructions,
        needsCompile: false,
        bindables: { name: { mode: 2 } },
      };
    };
    container.register(ClientGreetingCard);

    // Create client component class
    const ClientMyApp = class {
      appTitle = "Child Component SSR Test";
      userName = "World";
      get timestamp() { return "2024-01-01T00:00:00.000Z"; }

      static $au = {
        type: "custom-element",
        name: "my-app",
        template: parentAot.template,
        instructions: parentAot.instructions,
        needsCompile: false,
        dependencies: [ClientGreetingCard],
      };
    };

    const host = ctx.document.querySelector("my-app");
    console.log("Host element:", host.tagName);
    console.log("Host innerHTML before hydration:", host.innerHTML.substring(0, 200) + "...");

    const au = new Aurelia(container);

    // Try to hydrate (this is what the real app does)
    let appRoot;
    try {
      appRoot = await au.hydrate({
        host,
        component: ClientMyApp,
        ssrScope: ssrResult.manifest.manifest,
      });
      console.log("Hydration completed successfully");
    } catch (err) {
      console.log("Hydration error:", err.message);
      // Fall back to regular start (this is what causes double render)
      console.log("Falling back to au.app() + au.start()...");
      au.app({ host, component: ClientMyApp });
      await au.start();
      console.log("Started with regular au.start()");
    }

    // =========================================================================
    // STEP 5: CHECK FOR DOUBLE RENDERING
    // =========================================================================
    console.log("\n--- STEP 5: POST-HYDRATION CHECK ---");
    console.log("Host innerHTML after hydration:");
    console.log(host.innerHTML);

    const postHydrateAppDivs = ctx.document.querySelectorAll('.app').length;
    const postHydrateGreetingCards = ctx.document.querySelectorAll('.greeting-card').length;
    const postHydrateH1s = ctx.document.querySelectorAll('h1').length;
    const postHydrateH2s = ctx.document.querySelectorAll('h2').length;

    console.log("\n=== ELEMENT COUNTS ===");
    console.log(`<div class="app">: ${postHydrateAppDivs} (expected: 1)`);
    console.log(`<div class="greeting-card">: ${postHydrateGreetingCards} (expected: 2)`);
    console.log(`<h1>: ${postHydrateH1s} (expected: 1)`);
    console.log(`<h2>: ${postHydrateH2s} (expected: 2)`);

    // Check for "Hello, Guest!" which indicates default values used
    const guestCount = countOccurrences(host.innerHTML, "Hello, Guest!");
    const worldCount = countOccurrences(host.innerHTML, "Hello, World!");
    const aureliaCount = countOccurrences(host.innerHTML, "Hello, Aurelia!");
    const literalNameCount = countOccurrences(host.innerHTML, '${name}');

    console.log("\n=== CONTENT CHECKS ===");
    console.log(`"Hello, Guest!" count: ${guestCount} (expected: 0)`);
    console.log(`"Hello, World!" count: ${worldCount} (expected: 1)`);
    console.log(`"Hello, Aurelia!" count: ${aureliaCount} (expected: 1)`);
    console.log(`Literal "\${name}": ${literalNameCount > 0} (expected: false)`);

    // =========================================================================
    // ASSERTIONS - The bug manifests as any of these failing
    // =========================================================================

    // CRITICAL: Should be exactly 1 <div class="app"> - double render = 2
    assert.equal(
      postHydrateAppDivs,
      1,
      `DOUBLE RENDER BUG: Expected 1 <div class="app">, got ${postHydrateAppDivs}. ` +
      `The client rendered a NEW app instead of hydrating the SSR content.`
    );

    // Should be exactly 2 greeting-cards - double render = 4
    assert.equal(
      postHydrateGreetingCards,
      2,
      `DOUBLE RENDER BUG: Expected 2 <div class="greeting-card">, got ${postHydrateGreetingCards}.`
    );

    // Should be exactly 1 h1 - double render = 2
    assert.equal(
      postHydrateH1s,
      1,
      `DOUBLE RENDER BUG: Expected 1 <h1>, got ${postHydrateH1s}.`
    );

    // Should be exactly 2 h2 - double render = 4
    assert.equal(
      postHydrateH2s,
      2,
      `DOUBLE RENDER BUG: Expected 2 <h2>, got ${postHydrateH2s}.`
    );

    // Default values should NOT appear (indicates bindings not applied)
    assert.equal(
      guestCount,
      0,
      `BINDABLE BUG: "Hello, Guest!" appeared ${guestCount} times. Bindables not applied.`
    );

    // Correct bound values should appear
    assert.equal(
      worldCount,
      1,
      `BINDING BUG: "Hello, World!" should appear once (from name.bind="userName").`
    );

    assert.equal(
      aureliaCount,
      1,
      `BINDING BUG: "Hello, Aurelia!" should appear once (from name="Aurelia").`
    );

    // Literal ${name} should NOT appear
    assert.equal(
      literalNameCount,
      0,
      `INTERPOLATION BUG: Literal "\${name}" found. Expression not evaluated.`
    );

    // Cleanup
    if (appRoot) {
      await appRoot.deactivate();
    } else {
      await au.stop(true);
    }
    ctx.dom.window.close();

    console.log("\n=== TEST PASSED ===");
  });
});

describe("Child Component SSR E2E: Component Isolation", () => {
  test("GreetingCard renders correctly in isolation", async () => {
    const childAot = compileWithAot(GREETING_CARD_TEMPLATE, {
      name: "greeting-card",
    });

    // Create a fresh class for isolation test
    class IsolatedGreetingCard {
      name = "TestUser";

      get greeting() {
        return `Hello, ${this.name}!`;
      }

      get nameLength() {
        return this.name.length;
      }

      static $au = {
        type: "custom-element",
        name: "greeting-card",
        bindables: { name: { mode: 2 } },
      };
    }

    patchComponentDefinition(IsolatedGreetingCard, childAot);

    const result = await renderWithComponents(IsolatedGreetingCard, {
      childComponents: [],
    });

    console.log("# Isolated GreetingCard HTML:", result.html);

    // Should have exactly ONE greeting-card div
    const divCount = countOccurrences(result.html, 'class="greeting-card"');
    assert.equal(divCount, 1, `Expected 1 greeting-card div, got ${divCount}`);

    // Should have the content
    assert.ok(result.html.includes("Hello, TestUser!"), "Should render greeting");
    assert.ok(result.html.includes("8 characters"), "Should render name length");
  });

  test("MyApp renders correctly without children (placeholder)", async () => {
    // Test parent without child component registration to see structure
    const parentAot = compileWithAot(MY_APP_TEMPLATE, {
      name: "my-app",
      // No semantics - children will be unknown elements
    });

    class IsolatedMyApp {
      appTitle = "Isolated Test";
      userName = "Nobody";

      get timestamp() {
        return "test-timestamp";
      }

      static $au = {
        type: "custom-element",
        name: "my-app",
      };
    }

    patchComponentDefinition(IsolatedMyApp, parentAot);

    const result = await renderWithComponents(IsolatedMyApp, {
      childComponents: [],
    });

    console.log("# Isolated MyApp HTML (no children):", result.html);

    // Should have exactly ONE app div
    const appDivCount = countOccurrences(result.html, 'class="app"');
    assert.equal(appDivCount, 1, `Expected 1 app div, got ${appDivCount}`);

    // Should have parent content
    assert.ok(result.html.includes("Isolated Test"), "Should render appTitle");
    assert.ok(result.html.includes("test-timestamp"), "Should render timestamp");

    // Should have greeting-card elements as unprocessed custom elements
    assert.ok(result.html.includes("<greeting-card"), "Should have greeting-card element");
  });
});
