/**
 * Deep Nesting SSR Tests
 *
 * Tests for deeply nested template controller patterns in SSR context.
 * These tests cover pure template controller nesting without custom element hierarchies.
 *
 * Patterns tested:
 * - 3-level if nesting
 * - if > repeat > if chains
 * - with > repeat > with chains
 * - if/else patterns
 * - repeat > repeat (nested iteration)
 * - portal with nested content
 */

import { describe, it, expect } from "vitest";
import { JSDOM } from "jsdom";

import { compileAndRenderAot, compileWithAot } from "@aurelia-ls/ssr";
import { createComponent, countOccurrences } from "./_helpers/test-utils.js";

// =============================================================================
// 3-Level If Nesting (AOT-DN-01)
// =============================================================================

describe("Deep Nesting SSR: If Chains", () => {
  it("renders 3-level if nesting with bindings at each level", async () => {
    const TestApp = createComponent(
      "test-app",
      `<div if.bind="a" class="level-1">
        <div if.bind="b" title.bind="t1" class="level-2">
          <div if.bind="c" class="level-3">\${msg}</div>
        </div>
      </div>`,
      { a: true, b: true, c: true, t1: "Level 2 Title", msg: "Deep content" },
    );

    const result = await compileAndRenderAot(TestApp);
    const dom = new JSDOM(result.html);
    const doc = dom.window.document;

    // All 3 levels render
    expect(doc.querySelector(".level-1")).not.toBeNull();
    expect(doc.querySelector(".level-2")).not.toBeNull();
    expect(doc.querySelector(".level-3")).not.toBeNull();

    // Level 2 has correct title attribute
    expect(doc.querySelector(".level-2")!.getAttribute("title")).toBe("Level 2 Title");

    // Level 3 has correct content
    expect(doc.querySelector(".level-3")!.textContent).toBe("Deep content");

    dom.window.close();
  });

  it("stops at first false condition in nested if chain", async () => {
    const TestApp = createComponent(
      "test-app",
      `<div if.bind="a" class="level-1">
        <div if.bind="b" class="level-2">
          <div if.bind="c" class="level-3">Deepest</div>
        </div>
      </div>`,
      { a: true, b: false, c: true },
    );

    const result = await compileAndRenderAot(TestApp);
    const dom = new JSDOM(result.html);
    const doc = dom.window.document;

    // Level 1 renders
    expect(doc.querySelector(".level-1")).not.toBeNull();

    // Levels 2 and 3 don't exist because b is false
    expect(doc.querySelector(".level-2")).toBeNull();
    expect(doc.querySelector(".level-3")).toBeNull();

    dom.window.close();
  });

  it("renders nothing when outer if is false", async () => {
    const TestApp = createComponent(
      "test-app",
      `<div if.bind="a" class="outer">
        <div if.bind="b" class="middle">
          <div if.bind="c" class="inner">Content</div>
        </div>
      </div>`,
      { a: false, b: true, c: true },
    );

    const result = await compileAndRenderAot(TestApp);
    const dom = new JSDOM(result.html);
    const doc = dom.window.document;

    // None of the divs render because outer if is false
    expect(doc.querySelector(".outer")).toBeNull();
    expect(doc.querySelector(".middle")).toBeNull();
    expect(doc.querySelector(".inner")).toBeNull();

    dom.window.close();
  });
});

// =============================================================================
// If > Repeat > If (AOT-DN-02)
// =============================================================================

describe("Deep Nesting SSR: If-Repeat-If Chain", () => {
  it("renders if > repeat > if with iterator local access", async () => {
    const TestApp = createComponent(
      "test-app",
      `<div if.bind="show">
        <ul repeat.for="item of items" class="item-list">
          <li if.bind="item.visible" class="visible-item">\${item.name}</li>
        </ul>
      </div>`,
      {
        show: true,
        items: [
          { name: "Item 1", visible: true },
          { name: "Item 2", visible: false },
          { name: "Item 3", visible: true },
        ],
      },
    );

    const result = await compileAndRenderAot(TestApp);
    const dom = new JSDOM(result.html);
    const doc = dom.window.document;

    // Exactly 2 visible items render (Item 2 is not visible)
    const visibleItems = doc.querySelectorAll(".visible-item");
    expect(visibleItems.length).toBe(2);

    // Verify exact content of each visible item
    expect(visibleItems[0]!.textContent).toBe("Item 1");
    expect(visibleItems[1]!.textContent).toBe("Item 3");

    // Item 2 should not exist in DOM at all
    const allText = doc.body.textContent || "";
    expect(allText).not.toContain("Item 2");

    dom.window.close();
  });

  it("renders nothing when outer if is false", async () => {
    const TestApp = createComponent(
      "test-app",
      `<div if.bind="show" class="container">
        <ul repeat.for="item of items">
          <li if.bind="item.visible" class="item">\${item.name}</li>
        </ul>
      </div>`,
      {
        show: false,
        items: [
          { name: "Item 1", visible: true },
          { name: "Item 2", visible: true },
        ],
      },
    );

    const result = await compileAndRenderAot(TestApp);
    const dom = new JSDOM(result.html);
    const doc = dom.window.document;

    // Container doesn't exist because outer if is false
    expect(doc.querySelector(".container")).toBeNull();

    // No items render
    expect(doc.querySelectorAll(".item").length).toBe(0);

    // No content from items in the DOM
    const allText = doc.body.textContent || "";
    expect(allText).not.toContain("Item");

    dom.window.close();
  });

  it("renders all items when all conditions are true", async () => {
    const TestApp = createComponent(
      "test-app",
      `<div if.bind="show">
        <span repeat.for="item of items" class="item">
          <strong if.bind="item.active" class="active-text">\${item.text}</strong>
        </span>
      </div>`,
      {
        show: true,
        items: [
          { text: "A", active: true },
          { text: "B", active: true },
          { text: "C", active: true },
        ],
      },
    );

    const result = await compileAndRenderAot(TestApp);
    const dom = new JSDOM(result.html);
    const doc = dom.window.document;

    // Exactly 3 item spans render
    expect(doc.querySelectorAll(".item").length).toBe(3);

    // Exactly 3 strong elements with correct content
    const strongElements = doc.querySelectorAll("strong.active-text");
    expect(strongElements.length).toBe(3);
    expect(strongElements[0]!.textContent).toBe("A");
    expect(strongElements[1]!.textContent).toBe("B");
    expect(strongElements[2]!.textContent).toBe("C");

    dom.window.close();
  });
});

// =============================================================================
// With > Repeat > With (AOT-DN-03)
// =============================================================================

describe("Deep Nesting SSR: With-Repeat-With Chain", () => {
  it("renders with > repeat > with (value overlay chain)", async () => {
    const TestApp = createComponent(
      "test-app",
      `<section with.bind="ctx">
        <ul repeat.for="item of items" class="item-row">
          <li with.bind="item.detail" class="detail">\${name}</li>
        </ul>
      </section>`,
      {
        ctx: {
          items: [
            { detail: { name: "Detail A" } },
            { detail: { name: "Detail B" } },
            { detail: { name: "Detail C" } },
          ],
        },
      },
    );

    const result = await compileAndRenderAot(TestApp);
    const dom = new JSDOM(result.html);
    const doc = dom.window.document;

    // Exactly 3 detail list items
    const detailItems = doc.querySelectorAll(".detail");
    expect(detailItems.length).toBe(3);

    // Verify exact content in order
    expect(detailItems[0]!.textContent).toBe("Detail A");
    expect(detailItems[1]!.textContent).toBe("Detail B");
    expect(detailItems[2]!.textContent).toBe("Detail C");

    // Exactly 3 rows created
    expect(doc.querySelectorAll(".item-row").length).toBe(3);

    dom.window.close();
  });

  it("accesses nested properties through with overlays", async () => {
    const TestApp = createComponent(
      "test-app",
      `<div with.bind="user">
        <h1 class="user-name">\${name}</h1>
        <div with.bind="address" class="address">
          <span class="city">\${city}</span>
          <span class="country">\${country}</span>
        </div>
      </div>`,
      {
        user: {
          name: "Alice",
          address: {
            city: "New York",
            country: "USA",
          },
        },
      },
    );

    const result = await compileAndRenderAot(TestApp);
    const dom = new JSDOM(result.html);
    const doc = dom.window.document;

    // User name in h1
    const userName = doc.querySelector("h1.user-name");
    expect(userName).not.toBeNull();
    expect(userName!.textContent).toBe("Alice");

    // Address section exists with nested with overlay
    const address = doc.querySelector(".address");
    expect(address).not.toBeNull();

    // City and country from nested with context
    const city = doc.querySelector(".city");
    expect(city).not.toBeNull();
    expect(city!.textContent).toBe("New York");

    const country = doc.querySelector(".country");
    expect(country).not.toBeNull();
    expect(country!.textContent).toBe("USA");

    dom.window.close();
  });
});

// =============================================================================
// If/Else Chains (AOT-DN-04)
// =============================================================================

describe("Deep Nesting SSR: If/Else Patterns", () => {
  it("renders simple if/else with bindings", async () => {
    const TestApp = createComponent(
      "test-app",
      `<div if.bind="show" class="if-branch">\${msgA}</div>
       <div else class="else-branch">\${msgB}</div>`,
      { show: true, msgA: "Shown", msgB: "Hidden" },
    );

    const result = await compileAndRenderAot(TestApp);
    const dom = new JSDOM(result.html);
    const doc = dom.window.document;

    // If branch renders with correct content
    const ifBranch = doc.querySelector(".if-branch");
    expect(ifBranch).not.toBeNull();
    expect(ifBranch!.textContent).toBe("Shown");

    // Else branch doesn't exist in DOM
    expect(doc.querySelector(".else-branch")).toBeNull();

    // "Hidden" text doesn't appear anywhere
    const allText = doc.body.textContent || "";
    expect(allText).not.toContain("Hidden");

    dom.window.close();
  });

  it("renders else branch when condition is false", async () => {
    const TestApp = createComponent(
      "test-app",
      `<div if.bind="show" class="if-branch">\${msgA}</div>
       <div else class="else-branch">\${msgB}</div>`,
      { show: false, msgA: "Shown", msgB: "Hidden" },
    );

    const result = await compileAndRenderAot(TestApp);
    const dom = new JSDOM(result.html);
    const doc = dom.window.document;

    // If branch doesn't exist in DOM
    expect(doc.querySelector(".if-branch")).toBeNull();

    // Else branch renders with correct content
    const elseBranch = doc.querySelector(".else-branch");
    expect(elseBranch).not.toBeNull();
    expect(elseBranch!.textContent).toBe("Hidden");

    // "Shown" text doesn't appear anywhere
    const allText = doc.body.textContent || "";
    expect(allText).not.toContain("Shown");

    dom.window.close();
  });

  it("renders if/else with complex content in each branch", async () => {
    const TestApp = createComponent(
      "test-app",
      `<div if.bind="isLoggedIn" class="logged-in">
        <h1 class="welcome">Welcome, \${username}!</h1>
        <ul>
          <li repeat.for="item of menuItems" class="menu-item">\${item}</li>
        </ul>
      </div>
      <div else class="login-prompt">
        <p>Please log in</p>
      </div>`,
      {
        isLoggedIn: true,
        username: "John",
        menuItems: ["Dashboard", "Profile", "Settings"],
      },
    );

    const result = await compileAndRenderAot(TestApp);
    const dom = new JSDOM(result.html);
    const doc = dom.window.document;

    // Logged in section renders
    expect(doc.querySelector(".logged-in")).not.toBeNull();

    // Welcome message with exact content
    const welcome = doc.querySelector("h1.welcome");
    expect(welcome).not.toBeNull();
    expect(welcome!.textContent).toBe("Welcome, John!");

    // Exactly 3 menu items with correct content
    const menuItems = doc.querySelectorAll(".menu-item");
    expect(menuItems.length).toBe(3);
    expect(menuItems[0]!.textContent).toBe("Dashboard");
    expect(menuItems[1]!.textContent).toBe("Profile");
    expect(menuItems[2]!.textContent).toBe("Settings");

    // Login prompt doesn't exist
    expect(doc.querySelector(".login-prompt")).toBeNull();

    dom.window.close();
  });
});

// =============================================================================
// Repeat > Repeat (Nested Iteration) (AOT-DN-05)
// =============================================================================

describe("Deep Nesting SSR: Nested Repeats", () => {
  it("renders repeat > repeat (nested iteration)", async () => {
    const TestApp = createComponent(
      "test-app",
      `<ul repeat.for="row of rows" class="row">
        <li repeat.for="cell of row.cells" class="cell">\${cell}</li>
      </ul>`,
      {
        rows: [
          { cells: ["A1", "A2", "A3"] },
          { cells: ["B1", "B2"] },
          { cells: ["C1", "C2", "C3", "C4"] },
        ],
      },
    );

    const result = await compileAndRenderAot(TestApp);
    const dom = new JSDOM(result.html);
    const doc = dom.window.document;

    // Exactly 3 rows
    const rows = doc.querySelectorAll(".row");
    expect(rows.length).toBe(3);

    // Exactly 9 cells total (3 + 2 + 4)
    const cells = doc.querySelectorAll(".cell");
    expect(cells.length).toBe(9);

    // Verify cell content in order
    const expectedCells = ["A1", "A2", "A3", "B1", "B2", "C1", "C2", "C3", "C4"];
    cells.forEach((cell, i) => {
      expect(cell.textContent).toBe(expectedCells[i]);
    });

    dom.window.close();
  });

  it("handles empty inner arrays", async () => {
    const TestApp = createComponent(
      "test-app",
      `<div repeat.for="group of groups" class="group">
        <span repeat.for="item of group.items" class="item">\${item}</span>
      </div>`,
      {
        groups: [
          { items: ["X", "Y"] },
          { items: [] },
          { items: ["Z"] },
        ],
      },
    );

    const result = await compileAndRenderAot(TestApp);
    const dom = new JSDOM(result.html);
    const doc = dom.window.document;

    // All 3 groups render (even empty one creates container)
    const groups = doc.querySelectorAll(".group");
    expect(groups.length).toBe(3);

    // Only 3 items (X, Y, Z) - empty group has no items
    const items = doc.querySelectorAll(".item");
    expect(items.length).toBe(3);
    expect(items[0]!.textContent).toBe("X");
    expect(items[1]!.textContent).toBe("Y");
    expect(items[2]!.textContent).toBe("Z");

    // Second group has no children items
    const secondGroupItems = groups[1]!.querySelectorAll(".item");
    expect(secondGroupItems.length).toBe(0);

    dom.window.close();
  });

  it("accesses parent iterator context in nested repeat", async () => {
    const TestApp = createComponent(
      "test-app",
      `<table>
        <tr repeat.for="row of matrix" class="matrix-row">
          <td repeat.for="col of row" class="matrix-cell">\${col}</td>
        </tr>
      </table>`,
      {
        matrix: [
          [1, 2, 3],
          [4, 5, 6],
        ],
      },
    );

    const result = await compileAndRenderAot(TestApp);
    const dom = new JSDOM(result.html);
    const doc = dom.window.document;

    // Exactly 2 rows
    const rows = doc.querySelectorAll(".matrix-row");
    expect(rows.length).toBe(2);

    // Exactly 6 cells
    const cells = doc.querySelectorAll(".matrix-cell");
    expect(cells.length).toBe(6);

    // Verify each cell has correct value 1-6
    for (let i = 0; i < 6; i++) {
      expect(cells[i]!.textContent).toBe(String(i + 1));
    }

    // First row has cells 1, 2, 3
    const firstRowCells = rows[0]!.querySelectorAll(".matrix-cell");
    expect(firstRowCells.length).toBe(3);
    expect(firstRowCells[0]!.textContent).toBe("1");
    expect(firstRowCells[1]!.textContent).toBe("2");
    expect(firstRowCells[2]!.textContent).toBe("3");

    // Second row has cells 4, 5, 6
    const secondRowCells = rows[1]!.querySelectorAll(".matrix-cell");
    expect(secondRowCells.length).toBe(3);
    expect(secondRowCells[0]!.textContent).toBe("4");
    expect(secondRowCells[1]!.textContent).toBe("5");
    expect(secondRowCells[2]!.textContent).toBe("6");

    dom.window.close();
  });
});

// =============================================================================
// Portal with Nested Content (AOT-DN-06)
// =============================================================================

describe("Deep Nesting SSR: Portal", () => {
  it("renders portal with nested if content", async () => {
    const TestApp = createComponent(
      "test-app",
      `<template portal="#target">
        <div if.bind="show" class="portal-content">\${content}</div>
      </template>
      <div id="target"></div>`,
      { show: true, content: "Portaled content" },
    );

    const result = await compileAndRenderAot(TestApp);

    // Portal content is teleported - in SSR the portal marker appears but content
    // is rendered at target location. The target div should be present.
    expect(result.html).toBe(
      `<!--au--><!--au-start--><!--au-end-->\n      <div id="target"></div>`,
    );
  });

  it("compiles portal with nested template controller", () => {
    const template = `<template portal="#target">
      <div if.bind="show">\${content}</div>
    </template>`;

    const aot = compileWithAot(template, { name: "test-comp" });

    // Exact template structure with hydration markers
    expect(aot.template).toBe("<!--au--><!--au-start--><!--au-end-->");

    // Exactly 1 instruction row with 1 hydrateTemplateController
    expect(aot.instructions.length).toBe(1);
    expect(aot.instructions[0].length).toBe(1);
    expect(aot.instructions[0][0].type).toBe(2); // hydrateTemplateController
    expect(aot.instructions[0][0].res).toBe("portal");

    // Exactly 1 nested definition for the portal
    expect(aot.nestedDefs.length).toBe(1);
    expect(aot.nestedDefs[0].name).toBe("portal_0");
  });
});

// =============================================================================
// Complex Multi-Level Combinations
// =============================================================================

describe("Deep Nesting SSR: Complex Combinations", () => {
  it("renders if > repeat > switch > case chain", async () => {
    const TestApp = createComponent(
      "test-app",
      `<div if.bind="showList">
        <div repeat.for="item of items" class="item">
          <template switch.bind="item.type">
            <span case="a" class="type-a">\${item.name} is A</span>
            <span case="b" class="type-b">\${item.name} is B</span>
            <span default-case class="type-default">\${item.name} is other</span>
          </template>
        </div>
      </div>`,
      {
        showList: true,
        items: [
          { name: "First", type: "a" },
          { name: "Second", type: "b" },
          { name: "Third", type: "c" },
        ],
      },
    );

    const result = await compileAndRenderAot(TestApp);
    const dom = new JSDOM(result.html);
    const doc = dom.window.document;

    // Exactly 3 item containers
    const items = doc.querySelectorAll(".item");
    expect(items.length).toBe(3);

    // First item matches case "a"
    const typeA = doc.querySelector(".type-a");
    expect(typeA).not.toBeNull();
    expect(typeA!.textContent).toBe("First is A");

    // Second item matches case "b"
    const typeB = doc.querySelector(".type-b");
    expect(typeB).not.toBeNull();
    expect(typeB!.textContent).toBe("Second is B");

    // Third item doesn't match any case, falls to default
    const typeDefault = doc.querySelector(".type-default");
    expect(typeDefault).not.toBeNull();
    expect(typeDefault!.textContent).toBe("Third is other");

    // Exactly one of each type
    expect(doc.querySelectorAll(".type-a").length).toBe(1);
    expect(doc.querySelectorAll(".type-b").length).toBe(1);
    expect(doc.querySelectorAll(".type-default").length).toBe(1);

    dom.window.close();
  });

  it("renders with > if > repeat chain", async () => {
    const TestApp = createComponent(
      "test-app",
      `<div with.bind="data">
        <div if.bind="hasItems" class="items-container">
          <span repeat.for="item of items" class="item">\${item}</span>
        </div>
      </div>`,
      {
        data: {
          hasItems: true,
          items: ["Apple", "Banana", "Cherry"],
        },
      },
    );

    const result = await compileAndRenderAot(TestApp);
    const dom = new JSDOM(result.html);
    const doc = dom.window.document;

    // Items container renders (hasItems is true)
    expect(doc.querySelector(".items-container")).not.toBeNull();

    // Exactly 3 items with correct content
    const items = doc.querySelectorAll(".item");
    expect(items.length).toBe(3);
    expect(items[0]!.textContent).toBe("Apple");
    expect(items[1]!.textContent).toBe("Banana");
    expect(items[2]!.textContent).toBe("Cherry");

    dom.window.close();
  });

  it("renders repeat > if/else > repeat (3 levels with branching)", async () => {
    const TestApp = createComponent(
      "test-app",
      `<div repeat.for="section of sections" class="section">
        <div if.bind="section.expanded" class="expanded">
          <span repeat.for="item of section.items" class="section-item">\${item}</span>
        </div>
        <div else class="collapsed">
          <span class="summary">\${section.items.length} items</span>
        </div>
      </div>`,
      {
        sections: [
          { expanded: true, items: ["X", "Y", "Z"] },
          { expanded: false, items: ["A", "B"] },
          { expanded: true, items: ["M", "N"] },
        ],
      },
    );

    const result = await compileAndRenderAot(TestApp);
    const dom = new JSDOM(result.html);
    const doc = dom.window.document;

    // Exactly 3 sections
    const sections = doc.querySelectorAll(".section");
    expect(sections.length).toBe(3);

    // 2 expanded sections, 1 collapsed
    expect(doc.querySelectorAll(".expanded").length).toBe(2);
    expect(doc.querySelectorAll(".collapsed").length).toBe(1);

    // Exactly 5 section items (X, Y, Z from section 1 + M, N from section 3)
    const sectionItems = doc.querySelectorAll(".section-item");
    expect(sectionItems.length).toBe(5);
    expect(sectionItems[0]!.textContent).toBe("X");
    expect(sectionItems[1]!.textContent).toBe("Y");
    expect(sectionItems[2]!.textContent).toBe("Z");
    expect(sectionItems[3]!.textContent).toBe("M");
    expect(sectionItems[4]!.textContent).toBe("N");

    // Collapsed section shows "2 items" summary
    const summary = doc.querySelector(".collapsed .summary");
    expect(summary).not.toBeNull();
    expect(summary!.textContent).toBe("2 items");

    // Items from collapsed section don't appear
    const allText = doc.body.textContent || "";
    expect(allText).not.toContain(">A<");
    expect(allText).not.toContain(">B<");

    dom.window.close();
  });
});

// =============================================================================
// AOT Compilation Verification
// =============================================================================

describe("Deep Nesting SSR: AOT Compilation", () => {
  it("compiles 3-level if nesting", () => {
    const template = `<div if.bind="a"><div if.bind="b"><div if.bind="c">\${msg}</div></div></div>`;
    const aot = compileWithAot(template, { name: "test" });

    // Exact template with hydration markers
    expect(aot.template).toBe("<!--au--><!--au-start--><!--au-end-->");

    // Exactly 1 instruction row with hydrateTemplateController for outermost if
    expect(aot.instructions.length).toBe(1);
    expect(aot.instructions[0][0].type).toBe(2); // hydrateTemplateController
    expect(aot.instructions[0][0].res).toBe("if");

    // Exactly 1 top-level nested def (if_0), which contains if_1, which contains if_2
    expect(aot.nestedDefs.length).toBe(1);
    expect(aot.nestedDefs[0].name).toBe("if_0");
  });

  it("compiles nested repeat", () => {
    const template = `<ul repeat.for="row of rows"><li repeat.for="cell of row">\${cell}</li></ul>`;
    const aot = compileWithAot(template, { name: "test" });

    // Exact template with hydration markers
    expect(aot.template).toBe("<!--au--><!--au-start--><!--au-end-->");

    // Exactly 1 instruction row with hydrateTemplateController for outer repeat
    expect(aot.instructions.length).toBe(1);
    expect(aot.instructions[0][0].type).toBe(2); // hydrateTemplateController
    expect(aot.instructions[0][0].res).toBe("repeat");

    // Exactly 1 top-level nested def (repeat_0), which contains repeat_1
    expect(aot.nestedDefs.length).toBe(1);
    expect(aot.nestedDefs[0].name).toBe("repeat_0");
  });

  it("compiles if > repeat > if chain", () => {
    const template = `<div if.bind="show"><ul repeat.for="item of items"><li if.bind="item.visible">\${item.name}</li></ul></div>`;
    const aot = compileWithAot(template, { name: "test" });

    // Exact template with hydration markers
    expect(aot.template).toBe("<!--au--><!--au-start--><!--au-end-->");

    // Exactly 1 instruction row with hydrateTemplateController for outer if
    expect(aot.instructions.length).toBe(1);
    expect(aot.instructions[0][0].type).toBe(2); // hydrateTemplateController
    expect(aot.instructions[0][0].res).toBe("if");

    // Exactly 1 top-level nested def (if_0), which contains repeat_1 > if_2
    expect(aot.nestedDefs.length).toBe(1);
    expect(aot.nestedDefs[0].name).toBe("if_0");
  });
});
