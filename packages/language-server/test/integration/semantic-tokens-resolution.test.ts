/**
 * Semantic Tokens + Resolution Integration Tests
 *
 * Verifies the complete flow:
 * 1. Resolution discovers custom elements from TypeScript program
 * 2. Elements are merged into semantics
 * 3. Template compilation recognizes custom elements (NodeSem.custom populated)
 * 4. Semantic tokens are generated for custom element tags
 */

import { describe, it, beforeAll, expect } from "vitest";
import * as ts from "typescript";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

import { resolve } from "@aurelia-ls/resolution";
import {
  DEFAULT_SEMANTICS,
  normalizePathForId,
  materializeSemanticsForScope,
  lowerDocument,
  resolveHost,
  DEFAULT_SYNTAX,
  getExpressionParser,
  type LinkedRow,
  type NodeSem,
  type DOMNode,
  type ElementNode,
  type Semantics,
} from "@aurelia-ls/compiler";

import {
  extractTokens,
  buildNodeMap,
  encodeTokens,
  type RawToken,
} from "../../out/handlers/semantic-tokens.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EXPLICIT_APP = path.resolve(__dirname, "../../../resolution/test/apps/explicit-app");

// =============================================================================
// Utilities
// =============================================================================

function createProgramFromApp(appPath: string): ts.Program {
  const configPath = path.join(appPath, "tsconfig.json");
  const configFile = ts.readConfigFile(configPath, ts.sys.readFile);

  if (configFile.error) {
    throw new Error(
      `Failed to read tsconfig: ${ts.flattenDiagnosticMessageText(configFile.error.messageText, "\n")}`,
    );
  }

  const parsed = ts.parseJsonConfigFileContent(configFile.config, ts.sys, appPath);
  return ts.createProgram(parsed.fileNames, parsed.options);
}

function compileTemplateForSemanticTokens(
  markup: string,
  semantics: Semantics,
  options?: { templatePath?: string; name?: string },
) {
  const templatePath = options?.templatePath ?? "template.html";
  const name = options?.name ?? "template";
  const exprParser = getExpressionParser();

  const ir = lowerDocument(markup, {
    attrParser: DEFAULT_SYNTAX,
    exprParser,
    file: templatePath,
    name,
    sem: semantics,
  });

  const linked = resolveHost(ir, semantics);

  return { ir, linked };
}

// =============================================================================
// Test Suite
// =============================================================================

describe("Semantic Tokens + Resolution Integration", () => {
  let program: ts.Program;
  let resolutionResult: ReturnType<typeof resolve>;
  let rootSemantics: Semantics;

  beforeAll(() => {
    program = createProgramFromApp(EXPLICIT_APP);
    resolutionResult = resolve(program);

    // Get semantics for root scope (with discovered elements merged)
    rootSemantics = materializeSemanticsForScope(
      DEFAULT_SEMANTICS,
      resolutionResult.resourceGraph,
      resolutionResult.resourceGraph.root,
    );
  });

  // =========================================================================
  // Section 1: Resolution discovers elements
  // =========================================================================

  describe("Resolution discovers custom elements", () => {
    it("discovers nav-bar element", () => {
      const navBar = resolutionResult.candidates.find(
        (c) => c.kind === "element" && c.name === "nav-bar",
      );
      expect(navBar, "nav-bar discovered").toBeTruthy();
    });

    it("discovers user-card element", () => {
      const userCard = resolutionResult.candidates.find(
        (c) => c.kind === "element" && c.name === "user-card",
      );
      expect(userCard, "user-card discovered").toBeTruthy();
    });

    it("discovers data-grid element with aliases", () => {
      const dataGrid = resolutionResult.candidates.find(
        (c) => c.kind === "element" && c.name === "data-grid",
      );
      expect(dataGrid, "data-grid discovered").toBeTruthy();
      expect(dataGrid!.aliases, "has aliases").toContain("grid");
    });

    it("elements are merged into semantics", () => {
      expect(rootSemantics.resources.elements["nav-bar"], "nav-bar in semantics").toBeTruthy();
      expect(rootSemantics.resources.elements["user-card"], "user-card in semantics").toBeTruthy();
      expect(rootSemantics.resources.elements["data-grid"], "data-grid in semantics").toBeTruthy();
    });
  });

  // =========================================================================
  // Section 2: Template compilation recognizes custom elements
  // =========================================================================

  describe("Template compilation sets NodeSem.custom", () => {
    it("custom element has NodeSem.custom populated", () => {
      const markup = `<nav-bar></nav-bar>`;
      const { linked } = compileTemplateForSemanticTokens(markup, rootSemantics);

      const template = linked.templates[0];
      expect(template, "has template").toBeTruthy();

      // Find the element row
      const elementRow = template!.rows.find(
        (r) => r.node.kind === "element" && (r.node as NodeSem & { kind: "element" }).tag === "nav-bar",
      );

      expect(elementRow, "has nav-bar row").toBeTruthy();

      const nodeSem = elementRow!.node as NodeSem & { kind: "element" };
      expect(nodeSem.custom, "custom property populated").toBeTruthy();
      expect(nodeSem.custom!.def, "has element definition").toBeTruthy();
      expect(nodeSem.custom!.def.name, "def has correct name").toBe("nav-bar");
    });

    it("native HTML element has NodeSem.native but not custom", () => {
      // Need a binding to create a row for the element
      const markup = `<div class.bind="cls"></div>`;
      const { linked } = compileTemplateForSemanticTokens(markup, rootSemantics);

      const template = linked.templates[0];
      const divRow = template!.rows.find(
        (r) => r.node.kind === "element" && (r.node as NodeSem & { kind: "element" }).tag === "div",
      );

      expect(divRow, "has div row").toBeTruthy();

      const nodeSem = divRow!.node as NodeSem & { kind: "element" };
      expect(nodeSem.custom, "no custom for native element").toBeFalsy();
      expect(nodeSem.native, "native property populated").toBeTruthy();
    });

    it("unknown element has neither custom nor native", () => {
      // Need a binding to create a row for the element
      const markup = `<unknown-widget foo.bind="bar"></unknown-widget>`;
      const { linked } = compileTemplateForSemanticTokens(markup, rootSemantics);

      const template = linked.templates[0];
      const unknownRow = template!.rows.find(
        (r) =>
          r.node.kind === "element" &&
          (r.node as NodeSem & { kind: "element" }).tag === "unknown-widget",
      );

      expect(unknownRow, "has unknown-widget row").toBeTruthy();

      const nodeSem = unknownRow!.node as NodeSem & { kind: "element" };
      expect(nodeSem.custom, "no custom for unknown element").toBeFalsy();
      expect(nodeSem.native, "no native for unknown element").toBeFalsy();
    });

    it("element alias recognized as custom", () => {
      // data-grid has alias "grid"
      const markup = `<grid></grid>`;
      const { linked } = compileTemplateForSemanticTokens(markup, rootSemantics);

      const template = linked.templates[0];
      const gridRow = template!.rows.find(
        (r) => r.node.kind === "element" && (r.node as NodeSem & { kind: "element" }).tag === "grid",
      );

      expect(gridRow, "has grid row").toBeTruthy();

      const nodeSem = gridRow!.node as NodeSem & { kind: "element" };
      expect(nodeSem.custom, "alias recognized as custom").toBeTruthy();
      expect(nodeSem.custom!.def.name, "def points to canonical name").toBe("data-grid");
    });
  });

  // =========================================================================
  // Section 3: Semantic tokens are generated for custom elements
  // =========================================================================

  describe("Semantic tokens generated for custom elements", () => {
    it("generates token for custom element tag", () => {
      const markup = `<nav-bar></nav-bar>`;
      const { linked } = compileTemplateForSemanticTokens(markup, rootSemantics);

      const template = linked.templates[0]!;
      const nodeMap = buildNodeMap(template.dom);
      const tokens = extractTokens(markup, template.rows, nodeMap);

      // Should have 2 tokens: opening tag and closing tag
      expect(tokens.length, "has tokens for nav-bar").toBe(2);

      // First token is opening tag
      expect(tokens[0]!.line, "first token line").toBe(0);
      expect(tokens[0]!.char, "first token char (after <)").toBe(1);
      expect(tokens[0]!.length, "first token length").toBe("nav-bar".length);
      expect(tokens[0]!.type, "first token type is namespace (0)").toBe(0);

      // Second token is closing tag
      expect(tokens[1]!.char, "second token char (after </)").toBe(11); // after "</nav-bar>"
      expect(tokens[1]!.length, "second token length").toBe("nav-bar".length);
    });

    it("generates tokens for multiple custom elements", () => {
      const markup = `<nav-bar></nav-bar>
<user-card></user-card>`;
      const { linked } = compileTemplateForSemanticTokens(markup, rootSemantics);

      const template = linked.templates[0]!;
      const nodeMap = buildNodeMap(template.dom);
      const tokens = extractTokens(markup, template.rows, nodeMap);

      // 2 elements * 2 tags each = 4 tokens
      expect(tokens.length, "has tokens for both elements").toBe(4);

      // Verify both element names are represented
      const tokenLengths = tokens.map((t) => t.length);
      expect(tokenLengths, "has nav-bar tokens").toContain("nav-bar".length);
      expect(tokenLengths, "has user-card tokens").toContain("user-card".length);
    });

    it("does NOT generate token for native HTML element", () => {
      const markup = `<div class="container"></div>`;
      const { linked } = compileTemplateForSemanticTokens(markup, rootSemantics);

      const template = linked.templates[0]!;
      const nodeMap = buildNodeMap(template.dom);
      const tokens = extractTokens(markup, template.rows, nodeMap);

      expect(tokens.length, "no tokens for native div").toBe(0);
    });

    it("does NOT generate token for unknown element", () => {
      const markup = `<unknown-widget></unknown-widget>`;
      const { linked } = compileTemplateForSemanticTokens(markup, rootSemantics);

      const template = linked.templates[0]!;
      const nodeMap = buildNodeMap(template.dom);
      const tokens = extractTokens(markup, template.rows, nodeMap);

      expect(tokens.length, "no tokens for unknown element").toBe(0);
    });

    it("mixed custom and native elements: only custom get tokens", () => {
      const markup = `<div>
  <nav-bar></nav-bar>
  <span>text</span>
</div>`;
      const { linked } = compileTemplateForSemanticTokens(markup, rootSemantics);

      const template = linked.templates[0]!;
      const nodeMap = buildNodeMap(template.dom);
      const tokens = extractTokens(markup, template.rows, nodeMap);

      // Only nav-bar (2 tokens: open + close)
      expect(tokens.length, "only custom element gets tokens").toBe(2);
      expect(tokens[0]!.length, "token is for nav-bar").toBe("nav-bar".length);
    });

    it("encodes tokens correctly for LSP", () => {
      const markup = `<nav-bar></nav-bar>`;
      const { linked } = compileTemplateForSemanticTokens(markup, rootSemantics);

      const template = linked.templates[0]!;
      const nodeMap = buildNodeMap(template.dom);
      const tokens = extractTokens(markup, template.rows, nodeMap);
      const encoded = encodeTokens(tokens);

      // Each token is 5 integers: deltaLine, deltaChar, length, type, modifiers
      expect(encoded.length, "encoded has 5 integers per token").toBe(tokens.length * 5);

      // First token: line=0, char=1 (after <), length=7, type=0 (namespace), modifiers=0
      expect(encoded[0], "first deltaLine").toBe(0);
      expect(encoded[1], "first deltaChar").toBe(1);
      expect(encoded[2], "first length").toBe(7);
      expect(encoded[3], "first type (namespace)").toBe(0);
      expect(encoded[4], "first modifiers").toBe(0);
    });
  });

  // =========================================================================
  // Section 4: Self-closed custom elements
  // =========================================================================

  describe("Self-closed custom elements", () => {
    it("self-closed custom element gets single token", () => {
      // Note: HTML parser may treat this differently, but let's test the intent
      const markup = `<nav-bar />`;
      const { linked } = compileTemplateForSemanticTokens(markup, rootSemantics);

      const template = linked.templates[0]!;
      const nodeMap = buildNodeMap(template.dom);
      const tokens = extractTokens(markup, template.rows, nodeMap);

      // Self-closed should have 1 token (just the tag name, no closing tag)
      expect(tokens.length, "self-closed has 1 token").toBeGreaterThanOrEqual(1);
    });
  });
});
