/**
 * DOM Meta Element Adoption Tests
 *
 * Regression tests for issue where unclosed meta elements (like <import>)
 * caused parse5 to nest subsequent content inside them, which was then
 * discarded when the meta element was skipped during DOM building.
 *
 * Parse5 behavior:
 * - `<import from="./x"><div>content</div>` → div is INSIDE import (unclosed)
 * - `<import from="./x"></import><div>content</div>` → div is SIBLING (closed)
 *
 * The fix: When skipping meta elements, adopt their children instead of discarding.
 */

import { describe, it, expect } from "vitest";
import {
  lowerDocument,
  DEFAULT_SYNTAX,
  getExpressionParser,
  DEFAULT_SEMANTICS,
  DiagnosticsRuntime,
} from "@aurelia-ls/compiler";

function lower(html: string) {
  const diagnostics = new DiagnosticsRuntime();
  return lowerDocument(html, {
    attrParser: DEFAULT_SYNTAX,
    exprParser: getExpressionParser(),
    file: "test.html",
    name: "test",
    catalog: DEFAULT_SEMANTICS.catalog,
    diagnostics: diagnostics.forSource("lower"),
  });
}

function countDomNodes(node: { children?: unknown[] }): number {
  let count = 1;
  for (const child of node.children ?? []) {
    count += countDomNodes(child as { children?: unknown[] });
  }
  return count;
}

describe("DOM Meta Element Adoption", () => {
  describe("unclosed <import> elements", () => {
    it("adopts children of unclosed import on same line", () => {
      const html = `<import from="./foo"><div>content</div>`;
      const ir = lower(html);

      // The div should be in the DOM tree, not discarded
      const root = ir.templates[0]!.dom;
      expect(root.children.length).toBeGreaterThan(0);

      // Find the div element
      const div = root.children.find(
        (c: { kind: string; tag?: string }) => c.kind === "element" && c.tag === "div"
      );
      expect(div).toBeDefined();
    });

    it("adopts children of unclosed import with newline", () => {
      const html = `<import from="./foo">
<div>content</div>`;
      const ir = lower(html);

      const root = ir.templates[0]!.dom;
      // Should have text node (whitespace) and element
      expect(root.children.length).toBeGreaterThan(0);

      const div = root.children.find(
        (c: { kind: string; tag?: string }) => c.kind === "element" && c.tag === "div"
      );
      expect(div).toBeDefined();
    });

    it("adopts deeply nested content from unclosed import", () => {
      const html = `<import from="./foo">
<div class="app">
  <h1>Title</h1>
  <p>Content</p>
</div>`;
      const ir = lower(html);

      const root = ir.templates[0]!.dom;
      const div = root.children.find(
        (c: { kind: string; tag?: string }) => c.kind === "element" && c.tag === "div"
      );
      expect(div).toBeDefined();

      // Check nested structure is preserved
      const divNode = div as { children: Array<{ kind: string; tag?: string }> };
      const h1 = divNode.children.find((c) => c.kind === "element" && c.tag === "h1");
      const p = divNode.children.find((c) => c.kind === "element" && c.tag === "p");
      expect(h1).toBeDefined();
      expect(p).toBeDefined();
    });
  });

  describe("multiple meta elements", () => {
    it("adopts children through multiple unclosed meta elements", () => {
      const html = `<import from="./a"><import from="./b"><div>content</div>`;
      const ir = lower(html);

      const root = ir.templates[0]!.dom;
      const div = root.children.find(
        (c: { kind: string; tag?: string }) => c.kind === "element" && c.tag === "div"
      );
      expect(div).toBeDefined();
    });

    it("adopts children from mixed closed and unclosed meta elements", () => {
      const html = `<import from="./a"></import><import from="./b"><div>content</div>`;
      const ir = lower(html);

      const root = ir.templates[0]!.dom;
      const div = root.children.find(
        (c: { kind: string; tag?: string }) => c.kind === "element" && c.tag === "div"
      );
      expect(div).toBeDefined();
    });
  });

  describe("other meta elements", () => {
    it("adopts children of unclosed bindable", () => {
      const html = `<bindable name="x"><div>content</div>`;
      const ir = lower(html);

      const root = ir.templates[0]!.dom;
      const div = root.children.find(
        (c: { kind: string; tag?: string }) => c.kind === "element" && c.tag === "div"
      );
      expect(div).toBeDefined();
    });

    it("adopts children of unclosed containerless", () => {
      const html = `<containerless><div>content</div>`;
      const ir = lower(html);

      const root = ir.templates[0]!.dom;
      const div = root.children.find(
        (c: { kind: string; tag?: string }) => c.kind === "element" && c.tag === "div"
      );
      expect(div).toBeDefined();
    });
  });

  describe("closed meta elements (baseline)", () => {
    it("works with properly closed import", () => {
      const html = `<import from="./foo"></import><div>content</div>`;
      const ir = lower(html);

      const root = ir.templates[0]!.dom;
      const div = root.children.find(
        (c: { kind: string; tag?: string }) => c.kind === "element" && c.tag === "div"
      );
      expect(div).toBeDefined();
    });
  });

  describe("instruction rows", () => {
    it("collects instructions from content after unclosed import", () => {
      const html = `<import from="./foo">
<div>\${message}</div>`;
      const ir = lower(html);

      // Should have at least one row with a text binding for ${message}
      const root = ir.templates[0]!;
      expect(root.rows.length).toBeGreaterThan(0);

      // Find the text binding instruction
      const textBindings = root.rows
        .flatMap((r) => r.instructions)
        .filter((i) => i.type === "textBinding");
      expect(textBindings.length).toBe(1);
    });
  });
});
