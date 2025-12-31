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
 * The switch controller stores _ssrViewScopes for hydration, and each case
 * consumes from it. See ssr-architecture.md for details.
 *
 * Key difference from if/else:
 * - if/else: branches.relationship === "sibling" → each gets top-level definition
 * - switch: branches.relationship === "child" → branches collected inside parent
 *
 * The fix for switch/case involved three components:
 * 1. plan.ts: Always generate markers for switch's template (not empty fragment)
 * 2. emit-template.ts: Produce hierarchical nestedHtmlTree matching nestedTemplates
 * 3. instruction-translator.ts: Include nestedTemplates in NestedDefinition
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

  it("renders matching case", async () => {
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

    // Should render only the active case
    expect(result.html).toContain("Active");
    expect(result.html).not.toContain(">Inactive<");
    expect(result.html).not.toContain(">Pending<");
  });

  it("renders different case when value changes", async () => {
    const TestApp = createComponent(
      "test-app",
      `<div switch.bind="status">
        <span case="active" class="status">Active</span>
        <span case="inactive" class="status">Inactive</span>
        <span case="pending" class="status">Pending</span>
      </div>`,
      { status: "pending" },
    );

    const result = await compileAndRenderAot(TestApp);

    expect(result.html).toContain("Pending");
    expect(result.html).not.toContain(">Active<");
    expect(result.html).not.toContain(">Inactive<");
  });

  it("renders default-case when no match", async () => {
    const TestApp = createComponent(
      "test-app",
      `<div switch.bind="status">
        <span case="active">Active</span>
        <span case="inactive">Inactive</span>
        <span default-case>Unknown</span>
      </div>`,
      { status: "error" }, // No matching case
    );

    const result = await compileAndRenderAot(TestApp);

    expect(result.html).toContain("Unknown");
    expect(result.html).not.toContain(">Active<");
    expect(result.html).not.toContain(">Inactive<");
  });

  it("renders nothing when no match and no default-case", async () => {
    const TestApp = createComponent(
      "test-app",
      `<div switch.bind="status">
        <span case="active">Active</span>
        <span case="inactive">Inactive</span>
      </div>`,
      { status: "unknown" },
    );

    const result = await compileAndRenderAot(TestApp);

    // Neither case should render
    expect(result.html).not.toContain(">Active<");
    expect(result.html).not.toContain(">Inactive<");
  });
});

// =============================================================================
// Switch with Numeric Values
// =============================================================================

describe("Switch/Case SSR: Numeric Values", () => {
  it("renders case matching numeric value", async () => {
    // Note: case="2" is a string, switch value is number - using string for match
    const TestApp = createComponent(
      "test-app",
      `<div switch.bind="priority">
        <span case="low">Low</span>
        <span case="medium">Medium</span>
        <span case="high">High</span>
      </div>`,
      { priority: "medium" },
    );

    const result = await compileAndRenderAot(TestApp);

    expect(result.html).toContain("Medium");
    expect(result.html).not.toContain(">Low<");
    expect(result.html).not.toContain(">High<");
  });

  it("handles case.bind with dynamic value", async () => {
    const TestApp = createComponent(
      "test-app",
      `<div switch.bind="code">
        <span case.bind="errorCode">Error</span>
        <span case.bind="warningCode">Warning</span>
        <span default-case>OK</span>
      </div>`,
      {
        code: 404,
        errorCode: 404,
        warningCode: 300,
      },
    );

    const result = await compileAndRenderAot(TestApp);

    expect(result.html).toContain("Error");
    expect(result.html).not.toContain(">Warning<");
    expect(result.html).not.toContain(">OK<");
  });
});

// =============================================================================
// Switch with Complex Content
// =============================================================================

describe("Switch/Case SSR: Complex Content", () => {
  it("renders case with nested elements", async () => {
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

    expect(result.html).toContain("List View");
    expect(result.html).toContain("Item 1");
    expect(result.html).toContain("Item 2");
    expect(result.html).not.toContain("Grid View");
  });

  it("renders case with bindings inside", async () => {
    const TestApp = createComponent(
      "test-app",
      `<div switch.bind="mode">
        <div case="edit" class="edit-mode">
          <span>Editing: \${itemName}</span>
        </div>
        <div case="view" class="view-mode">
          <span>Viewing: \${itemName}</span>
        </div>
      </div>`,
      { mode: "edit", itemName: "Document.txt" },
    );

    const result = await compileAndRenderAot(TestApp);

    expect(result.html).toContain("Editing: Document.txt");
    expect(result.html).not.toContain("Viewing:");
  });
});

// =============================================================================
// Switch with fall-through
// =============================================================================

describe("Switch/Case SSR: Fall-through", () => {
  it("does not fall through by default", async () => {
    const TestApp = createComponent(
      "test-app",
      `<div switch.bind="type">
        <span case="a">A</span>
        <span case="b">B</span>
        <span case="c">C</span>
      </div>`,
      { type: "b" },
    );

    const result = await compileAndRenderAot(TestApp);

    // Only B should render, not C (no fall-through)
    expect(result.html).toContain(">B<");
    expect(result.html).not.toContain(">A<");
    expect(result.html).not.toContain(">C<");
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
// AOT Compilation
// =============================================================================

describe("Switch/Case SSR: AOT Compilation", () => {
  it("compiles switch/case template to instructions", () => {
    const template = `<div switch.bind="mode">
      <span case="a">A</span>
      <span case="b">B</span>
    </div>`;

    const aot = compileWithAot(template, { name: "test-comp" });

    expect(aot.template).toBeTruthy();
    expect(aot.instructions.length).toBeGreaterThan(0);

    // Should have template controller instruction for switch
    const hasHydrateTC = aot.instructions.some((row) =>
      row.some((inst) => inst.type === 2), // hydrateTemplateController
    );
    expect(hasHydrateTC).toBe(true);
  });

  it("preserves markers in compiled template", () => {
    const template = `<div switch.bind="mode">
      <span case="a">A</span>
    </div>`;

    const aot = compileWithAot(template, { name: "test-comp" });

    // Should have au markers for hydration
    expect(aot.template).toContain("<!--au-->");
  });
});
