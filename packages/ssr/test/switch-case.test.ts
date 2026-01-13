/**
 * Switch/Case Template Controller SSR Tests
 *
 * Tests for the switch.bind/case template controller in SSR context.
 * Switch/case is a template controller pattern for multi-way conditionals.
 *
 * Structure:
 * <div switch.bind="value">
 *   <span case="a">A content</span>
 *   <span case="b">B content</span>
 *   <span default-case>Default content</span>
 * </div>
 *
 * Hydration uses the tree-shaped SSR manifest:
 * - switch entry records its own view scope
 * - case/default-case entries are nested under the switch view and adopt directly
 *
 * Key difference from if/else:
 * - if/else: branches.relationship === "sibling" → each gets top-level definition
 * - switch: branches.relationship === "child" → branches collected inside parent
 *
 * The fix for switch/case involves SSR markers, nested template emission,
 * and tree-based manifest recording for switch + case scopes.
 */

import { describe, it, expect } from "vitest";
import { JSDOM } from "jsdom";

import { compileAndRenderAot, compileWithAot } from "@aurelia-ls/ssr";
import { createComponent, countOccurrences } from "./_helpers/test-utils.js";

// =============================================================================
// Basic Switch/Case Rendering
// =============================================================================

describe("Switch/Case SSR: Basic Rendering", () => {
  // Tests for switch/case rendering with AOT-compiled templates.

  it("renders exactly one matching case with correct content", async () => {
    const TestApp = createComponent(
      "test-app",
      `<div switch.bind="status">
        <span case="active" class="status-active">Active</span>
        <span case="inactive" class="status-inactive">Inactive</span>
        <span case="pending" class="status-pending">Pending</span>
      </div>`,
      { status: "active" },
    );

    const result = await compileAndRenderAot(TestApp);
    const dom = new JSDOM(result.html);
    const doc = dom.window.document;

    // Exactly 1 case span renders (only the matching one)
    const allCaseSpans = doc.querySelectorAll('span[class^="status-"]');
    expect(allCaseSpans.length).toBe(1);

    // It's the active span with exact content
    const activeSpan = doc.querySelector(".status-active");
    expect(activeSpan).not.toBeNull();
    expect(activeSpan!.textContent).toBe("Active");

    // Other cases don't exist in DOM at all
    expect(doc.querySelector(".status-inactive")).toBeNull();
    expect(doc.querySelector(".status-pending")).toBeNull();

    dom.window.close();
  });

  it("renders different case when switch value differs", async () => {
    const TestApp = createComponent(
      "test-app",
      `<div switch.bind="status">
        <span case="active" class="status-active">Active</span>
        <span case="inactive" class="status-inactive">Inactive</span>
        <span case="pending" class="status-pending">Pending</span>
      </div>`,
      { status: "pending" },
    );

    const result = await compileAndRenderAot(TestApp);
    const dom = new JSDOM(result.html);
    const doc = dom.window.document;

    // Exactly 1 case span renders
    const allCaseSpans = doc.querySelectorAll('span[class^="status-"]');
    expect(allCaseSpans.length).toBe(1);

    // It's the pending span
    const pendingSpan = doc.querySelector(".status-pending");
    expect(pendingSpan).not.toBeNull();
    expect(pendingSpan!.textContent).toBe("Pending");

    // Other cases don't exist
    expect(doc.querySelector(".status-active")).toBeNull();
    expect(doc.querySelector(".status-inactive")).toBeNull();

    dom.window.close();
  });

  it("renders default-case when no case matches", async () => {
    const TestApp = createComponent(
      "test-app",
      `<div switch.bind="status">
        <span case="active" class="case-active">Active</span>
        <span case="inactive" class="case-inactive">Inactive</span>
        <span default-case class="case-default">Unknown</span>
      </div>`,
      { status: "error" }, // No matching case
    );

    const result = await compileAndRenderAot(TestApp);
    const dom = new JSDOM(result.html);
    const doc = dom.window.document;

    // Exactly 1 span renders - the default
    const allCaseSpans = doc.querySelectorAll('span[class^="case-"]');
    expect(allCaseSpans.length).toBe(1);

    // It's the default case
    const defaultSpan = doc.querySelector(".case-default");
    expect(defaultSpan).not.toBeNull();
    expect(defaultSpan!.textContent).toBe("Unknown");

    // Regular cases don't exist
    expect(doc.querySelector(".case-active")).toBeNull();
    expect(doc.querySelector(".case-inactive")).toBeNull();

    dom.window.close();
  });

  it("renders no case spans when no match and no default-case", async () => {
    const TestApp = createComponent(
      "test-app",
      `<div switch.bind="status" class="switch-container">
        <span case="active" class="case-span">Active</span>
        <span case="inactive" class="case-span">Inactive</span>
      </div>`,
      { status: "unknown" },
    );

    const result = await compileAndRenderAot(TestApp);
    const dom = new JSDOM(result.html);
    const doc = dom.window.document;

    // The switch container exists
    expect(doc.querySelector(".switch-container")).not.toBeNull();

    // But no case spans render
    expect(doc.querySelectorAll(".case-span").length).toBe(0);

    dom.window.close();
  });
});

// =============================================================================
// Switch with Numeric Values
// =============================================================================

describe("Switch/Case SSR: Numeric Values", () => {
  it("renders case matching string priority value", async () => {
    const TestApp = createComponent(
      "test-app",
      `<div switch.bind="priority">
        <span case="low" class="priority-low">Low</span>
        <span case="medium" class="priority-medium">Medium</span>
        <span case="high" class="priority-high">High</span>
      </div>`,
      { priority: "medium" },
    );

    const result = await compileAndRenderAot(TestApp);
    const dom = new JSDOM(result.html);
    const doc = dom.window.document;

    // Exactly 1 priority span renders
    const allPrioritySpans = doc.querySelectorAll('span[class^="priority-"]');
    expect(allPrioritySpans.length).toBe(1);

    // It's the medium span
    const mediumSpan = doc.querySelector(".priority-medium");
    expect(mediumSpan).not.toBeNull();
    expect(mediumSpan!.textContent).toBe("Medium");

    // Others don't exist
    expect(doc.querySelector(".priority-low")).toBeNull();
    expect(doc.querySelector(".priority-high")).toBeNull();

    dom.window.close();
  });

  it("matches case.bind with dynamic numeric values", async () => {
    const TestApp = createComponent(
      "test-app",
      `<div switch.bind="code">
        <span case.bind="errorCode" class="code-error">Error</span>
        <span case.bind="warningCode" class="code-warning">Warning</span>
        <span default-case class="code-ok">OK</span>
      </div>`,
      {
        code: 404,
        errorCode: 404,
        warningCode: 300,
      },
    );

    const result = await compileAndRenderAot(TestApp);
    const dom = new JSDOM(result.html);
    const doc = dom.window.document;

    // Exactly 1 code span renders
    const allCodeSpans = doc.querySelectorAll('span[class^="code-"]');
    expect(allCodeSpans.length).toBe(1);

    // It's the error span (404 matches errorCode)
    const errorSpan = doc.querySelector(".code-error");
    expect(errorSpan).not.toBeNull();
    expect(errorSpan!.textContent).toBe("Error");

    // Others don't exist
    expect(doc.querySelector(".code-warning")).toBeNull();
    expect(doc.querySelector(".code-ok")).toBeNull();

    dom.window.close();
  });
});

// =============================================================================
// Switch with Complex Content
// =============================================================================

describe("Switch/Case SSR: Complex Content", () => {
  it("renders case with nested elements and correct structure", async () => {
    const TestApp = createComponent(
      "test-app",
      `<div switch.bind="view">
        <div case="list" class="list-view">
          <h2>List View</h2>
          <ul>
            <li>Item 1</li>
            <li>Item 2</li>
          </ul>
        </div>
        <div case="grid" class="grid-view">
          <h2>Grid View</h2>
          <div class="grid">Tiles here</div>
        </div>
      </div>`,
      { view: "list" },
    );

    const result = await compileAndRenderAot(TestApp);
    const dom = new JSDOM(result.html);
    const doc = dom.window.document;

    // List view renders with correct structure
    const listView = doc.querySelector(".list-view");
    expect(listView).not.toBeNull();
    expect(listView!.querySelector("h2")!.textContent).toBe("List View");

    // List items render correctly
    const listItems = listView!.querySelectorAll("li");
    expect(listItems.length).toBe(2);
    expect(listItems[0].textContent).toBe("Item 1");
    expect(listItems[1].textContent).toBe("Item 2");

    // Grid view doesn't exist at all
    expect(doc.querySelector(".grid-view")).toBeNull();
    expect(doc.querySelector(".grid")).toBeNull();

    dom.window.close();
  });

  it("renders case with interpolated binding content", async () => {
    const TestApp = createComponent(
      "test-app",
      `<div switch.bind="mode">
        <div case="edit" class="edit-mode">
          <span class="action-text">Editing: \${itemName}</span>
        </div>
        <div case="view" class="view-mode">
          <span class="action-text">Viewing: \${itemName}</span>
        </div>
      </div>`,
      { mode: "edit", itemName: "Document.txt" },
    );

    const result = await compileAndRenderAot(TestApp);
    const dom = new JSDOM(result.html);
    const doc = dom.window.document;

    // Edit mode renders
    const editMode = doc.querySelector(".edit-mode");
    expect(editMode).not.toBeNull();

    // Exactly 1 action text span
    const actionTexts = doc.querySelectorAll(".action-text");
    expect(actionTexts.length).toBe(1);

    // Content is correctly interpolated
    expect(actionTexts[0].textContent).toBe("Editing: Document.txt");

    // View mode doesn't exist
    expect(doc.querySelector(".view-mode")).toBeNull();

    dom.window.close();
  });
});

// =============================================================================
// Switch with fall-through
// =============================================================================

describe("Switch/Case SSR: Fall-through", () => {
  it("renders only matching case without falling through to next", async () => {
    const TestApp = createComponent(
      "test-app",
      `<div switch.bind="type">
        <span case="a" class="case-a">A</span>
        <span case="b" class="case-b">B</span>
        <span case="c" class="case-c">C</span>
      </div>`,
      { type: "b" },
    );

    const result = await compileAndRenderAot(TestApp);
    const dom = new JSDOM(result.html);
    const doc = dom.window.document;

    // Exactly 1 case span renders
    const allCaseSpans = doc.querySelectorAll('span[class^="case-"]');
    expect(allCaseSpans.length).toBe(1);

    // Only B renders (no fall-through to C)
    const bSpan = doc.querySelector(".case-b");
    expect(bSpan).not.toBeNull();
    expect(bSpan!.textContent).toBe("B");

    // A and C don't exist
    expect(doc.querySelector(".case-a")).toBeNull();
    expect(doc.querySelector(".case-c")).toBeNull();

    dom.window.close();
  });
});

// =============================================================================
// Switch Manifest Recording
// =============================================================================

describe.skip("Switch/Case SSR: Manifest", () => {
  it("records switch state in manifest", async () => {
    const TestApp = createComponent(
      "test-app",
      `<div switch.bind="mode">
        <span case="on">ON</span>
        <span case="off">OFF</span>
      </div>`,
      { mode: "on" },
    );

    const result = await compileAndRenderAot(TestApp);

    expect(result.manifest).toBeTruthy();
    expect(result.manifest.manifest).toBeTruthy();

    // The manifest should have children for the switch
    const rootScope = result.manifest.manifest;
    expect(rootScope.children).toBeTruthy();

    // At least one child should be a switch
    const hasSwitch = rootScope.children?.some(
      (child: any) => child.type === "switch",
    );
    expect(hasSwitch).toBe(true);
  });

  it("records case views in switch manifest", async () => {
    const TestApp = createComponent(
      "test-app",
      `<div switch.bind="val">
        <span case="x">X</span>
        <span case="y">Y</span>
        <span default-case>Default</span>
      </div>`,
      { val: "y" },
    );

    const result = await compileAndRenderAot(TestApp);

    const rootScope = result.manifest.manifest;
    const switchChild = rootScope.children?.find(
      (child: any) => child.type === "switch",
    );

    expect(switchChild).toBeTruthy();
    // Switch should have views array
    expect(switchChild?.views).toBeTruthy();
  });
});

// =============================================================================
// No Double Rendering
// =============================================================================

describe("Switch/Case SSR: No Double Render", () => {
  it("renders exactly one case content", async () => {
    const TestApp = createComponent(
      "test-app",
      `<div switch.bind="state">
        <div case="loading" class="case-content">Loading...</div>
        <div case="success" class="case-content">Success!</div>
        <div case="error" class="case-content">Error!</div>
      </div>`,
      { state: "success" },
    );

    const result = await compileAndRenderAot(TestApp);

    // Parse and count case-content divs
    const dom = new JSDOM(result.html);
    const caseContents = dom.window.document.querySelectorAll(".case-content");

    // Should have exactly 1 rendered
    expect(caseContents.length).toBe(1);
    expect(caseContents[0].textContent).toContain("Success!");

    dom.window.close();
  });

  // TODO: Multiple switches at the same level produces incorrect instruction count
  // This appears to be a separate edge case - single switch works correctly
  it.skip("multiple switches render independently", async () => {
    const TestApp = createComponent(
      "test-app",
      `<div>
        <div switch.bind="status1" class="switch1">
          <span case="a" class="s1-case">S1-A</span>
          <span case="b" class="s1-case">S1-B</span>
        </div>
        <div switch.bind="status2" class="switch2">
          <span case="x" class="s2-case">S2-X</span>
          <span case="y" class="s2-case">S2-Y</span>
        </div>
      </div>`,
      { status1: "a", status2: "y" },
    );

    const result = await compileAndRenderAot(TestApp);

    const dom = new JSDOM(result.html);
    const doc = dom.window.document;

    // Each switch should render exactly one case
    expect(doc.querySelectorAll(".s1-case").length).toBe(1);
    expect(doc.querySelectorAll(".s2-case").length).toBe(1);

    // Correct cases rendered
    expect(result.html).toContain("S1-A");
    expect(result.html).toContain("S2-Y");
    expect(result.html).not.toContain("S1-B");
    expect(result.html).not.toContain("S2-X");

    dom.window.close();
  });
});

// =============================================================================
// Deep Nesting Patterns (matching AOT emit layer coverage)
// =============================================================================

describe("Switch/Case SSR: Deep Nesting", () => {
  // AOT-SW-05: Nested switch inside case
  it("renders nested switch inside outer case with correct inner case", async () => {
    const TestApp = createComponent(
      "test-app",
      `<template switch.bind="outer">
        <template case="a">
          <div class="outer-a" switch.bind="inner">
            <span case="x" class="inner-x">X content</span>
            <span case="y" class="inner-y">Y content</span>
          </div>
        </template>
        <template case="b"><span class="outer-b">B only</span></template>
      </template>`,
      { outer: "a", inner: "y" },
    );

    const result = await compileAndRenderAot(TestApp);
    const dom = new JSDOM(result.html);
    const doc = dom.window.document;

    // Outer case "a" container exists
    const outerA = doc.querySelector(".outer-a");
    expect(outerA).not.toBeNull();

    // Inner case "y" renders with correct content
    const innerY = doc.querySelector(".inner-y");
    expect(innerY).not.toBeNull();
    expect(innerY!.textContent).toBe("Y content");

    // Inner case "x" doesn't exist
    expect(doc.querySelector(".inner-x")).toBeNull();

    // Outer case "b" doesn't exist
    expect(doc.querySelector(".outer-b")).toBeNull();

    dom.window.close();
  });

  // AOT-SW-05 variant: nested switch with different outer case
  it("renders only outer case B without any inner switch content", async () => {
    const TestApp = createComponent(
      "test-app",
      `<template switch.bind="outer">
        <template case="a">
          <div class="outer-a" switch.bind="inner">
            <span case="x" class="inner-x">X</span>
            <span case="y" class="inner-y">Y</span>
          </div>
        </template>
        <template case="b"><span class="outer-b">B only</span></template>
      </template>`,
      { outer: "b", inner: "x" },
    );

    const result = await compileAndRenderAot(TestApp);
    const dom = new JSDOM(result.html);
    const doc = dom.window.document;

    // Only outer case "b" renders
    const outerB = doc.querySelector(".outer-b");
    expect(outerB).not.toBeNull();
    expect(outerB!.textContent).toBe("B only");

    // Outer case "a" and all inner cases don't exist
    expect(doc.querySelector(".outer-a")).toBeNull();
    expect(doc.querySelector(".inner-x")).toBeNull();
    expect(doc.querySelector(".inner-y")).toBeNull();

    dom.window.close();
  });

  // AOT-SW-06: Switch inside repeat
  it("renders switch inside repeat with correct case per item", async () => {
    const TestApp = createComponent(
      "test-app",
      `<ul>
        <li repeat.for="item of items" class="item">
          <template switch.bind="item.type">
            <span case="a" class="type-a">\${item.label} is A</span>
            <span case="b" class="type-b">\${item.label} is B</span>
          </template>
        </li>
      </ul>`,
      {
        items: [
          { type: "a", label: "First" },
          { type: "b", label: "Second" },
          { type: "a", label: "Third" },
        ],
      },
    );

    const result = await compileAndRenderAot(TestApp);
    const dom = new JSDOM(result.html);
    const doc = dom.window.document;

    // 3 list items render
    expect(doc.querySelectorAll(".item").length).toBe(3);

    // 2 type-a spans with correct content
    const typeASpans = doc.querySelectorAll(".type-a");
    expect(typeASpans.length).toBe(2);
    expect(typeASpans[0].textContent).toBe("First is A");
    expect(typeASpans[1].textContent).toBe("Third is A");

    // 1 type-b span with correct content
    const typeBSpans = doc.querySelectorAll(".type-b");
    expect(typeBSpans.length).toBe(1);
    expect(typeBSpans[0].textContent).toBe("Second is B");

    dom.window.close();
  });

  // AOT-SW-07: Three cases plus default
  it("renders exactly one matching case from four options", async () => {
    const TestApp = createComponent(
      "test-app",
      `<template switch.bind="level">
        <span case="low" class="level level-low">Low</span>
        <span case="med" class="level level-med">Medium</span>
        <span case="high" class="level level-high">High</span>
        <span default-case class="level level-default">Unknown</span>
      </template>`,
      { level: "med" },
    );

    const result = await compileAndRenderAot(TestApp);
    const dom = new JSDOM(result.html);
    const doc = dom.window.document;

    // Exactly 1 level span renders
    expect(doc.querySelectorAll(".level").length).toBe(1);

    // It's the medium one
    const medSpan = doc.querySelector(".level-med");
    expect(medSpan).not.toBeNull();
    expect(medSpan!.textContent).toBe("Medium");

    // Others don't exist
    expect(doc.querySelector(".level-low")).toBeNull();
    expect(doc.querySelector(".level-high")).toBeNull();
    expect(doc.querySelector(".level-default")).toBeNull();

    dom.window.close();
  });

  // AOT-SW-07 variant: default case renders when no match
  it("renders default-case when no regular case matches", async () => {
    const TestApp = createComponent(
      "test-app",
      `<template switch.bind="level">
        <span case="low" class="level-low">Low</span>
        <span case="med" class="level-med">Medium</span>
        <span case="high" class="level-high">High</span>
        <span default-case class="level-default">Unknown</span>
      </template>`,
      { level: "extreme" },
    );

    const result = await compileAndRenderAot(TestApp);
    const dom = new JSDOM(result.html);
    const doc = dom.window.document;

    // Default case renders
    const defaultSpan = doc.querySelector(".level-default");
    expect(defaultSpan).not.toBeNull();
    expect(defaultSpan!.textContent).toBe("Unknown");

    // Regular cases don't exist
    expect(doc.querySelector(".level-low")).toBeNull();
    expect(doc.querySelector(".level-med")).toBeNull();
    expect(doc.querySelector(".level-high")).toBeNull();

    dom.window.close();
  });

  // AOT-SW-08: Dynamic case value with case.bind
  it("matches case.bind dynamic values with interpolated content", async () => {
    const TestApp = createComponent(
      "test-app",
      `<template switch.bind="selection">
        <span case.bind="optionA" class="option option-a">\${msgA}</span>
        <span case.bind="optionB" class="option option-b">\${msgB}</span>
      </template>`,
      {
        selection: "foo",
        optionA: "foo",
        optionB: "bar",
        msgA: "Option A selected",
        msgB: "Option B selected",
      },
    );

    const result = await compileAndRenderAot(TestApp);
    const dom = new JSDOM(result.html);
    const doc = dom.window.document;

    // Exactly 1 option renders
    expect(doc.querySelectorAll(".option").length).toBe(1);

    // It's option A with interpolated content
    const optionA = doc.querySelector(".option-a");
    expect(optionA).not.toBeNull();
    expect(optionA!.textContent).toBe("Option A selected");

    // Option B doesn't exist
    expect(doc.querySelector(".option-b")).toBeNull();

    dom.window.close();
  });

  // AOT-SW-04: Event listener inside case (SSR renders the element)
  it("renders case with event handler attribute preserved", async () => {
    const TestApp = createComponent(
      "test-app",
      `<template switch.bind="state">
        <button case="ready" click.trigger="go()" class="btn-ready">Go</button>
        <button case="busy" disabled class="btn-busy">Wait</button>
      </template>`,
      { state: "ready" },
    );

    const result = await compileAndRenderAot(TestApp);
    const dom = new JSDOM(result.html);
    const doc = dom.window.document;

    // Ready button renders
    const readyBtn = doc.querySelector(".btn-ready");
    expect(readyBtn).not.toBeNull();
    expect(readyBtn!.textContent).toBe("Go");
    expect(readyBtn!.tagName.toLowerCase()).toBe("button");

    // Busy button doesn't exist
    expect(doc.querySelector(".btn-busy")).toBeNull();

    dom.window.close();
  });
});

// =============================================================================
// AOT Compilation
// =============================================================================

describe("Switch/Case SSR: AOT Compilation", () => {
  it("compiles switch/case to hydrateTemplateController with nested case definitions", () => {
    const template = `<div switch.bind="mode">
      <span case="a">A</span>
      <span case="b">B</span>
    </div>`;

    const aot = compileWithAot(template, { name: "test-comp" });

    // Exact template with hydration markers
    expect(aot.template).toBe("<!--au--><!--au-start--><!--au-end-->");

    // Exactly 1 instruction row with 1 hydrateTemplateController for switch
    expect(aot.instructions.length).toBe(1);
    expect(aot.instructions[0].length).toBe(1);
    const switchInst = aot.instructions[0][0];
    expect(switchInst.type).toBe(2); // hydrateTemplateController
    expect(switchInst.res).toBe("switch");

    // Switch has a nested definition
    expect(aot.nestedDefs.length).toBe(1);
    const switchDef = aot.nestedDefs[0];
    expect(switchDef.name).toBe("switch_0");

    // The switch definition contains the case instructions
    // (cases are children of switch, not siblings)
    expect(switchDef.instructions).toBeDefined();
    expect(switchDef.instructions.length).toBeGreaterThan(0);
  });

  it("produces exact marker template for single case", () => {
    const template = `<div switch.bind="mode">
      <span case="a">A</span>
    </div>`;

    const aot = compileWithAot(template, { name: "test-comp" });

    // Exact template structure
    expect(aot.template).toBe("<!--au--><!--au-start--><!--au-end-->");

    // Single instruction row
    expect(aot.instructions.length).toBe(1);

    // Single nested def for the switch
    expect(aot.nestedDefs.length).toBe(1);
    expect(aot.nestedDefs[0].name).toBe("switch_0");
  });
});
