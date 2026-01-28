/**
 * Semantic Tokens + Resolution Integration Tests
 *
 * Verifies the complete flow:
 * 1. Resolution discovers custom elements from a TypeScript program
 * 2. Elements are merged into semantics
 * 3. Template compilation recognizes custom elements (NodeSem.custom populated)
 * 4. Semantic tokens are generated for custom element tags
 */

import { describe, it, beforeAll, expect } from "vitest";
import * as ts from "typescript";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

import { discoverProjectSemantics, DiagnosticsRuntime } from "@aurelia-ls/compiler";
import {
  buildTemplateSyntaxRegistry,
  compileTemplate,
  BUILTIN_SEMANTICS,
  materializeSemanticsForScope,
  type NodeSem,
  type MaterializedSemantics,
} from "@aurelia-ls/compiler";
import { collectSemanticTokens } from "../../src/semantic-tokens.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EXPLICIT_APP = path.resolve(__dirname, "../../../compiler/test/20-link/apps/explicit-app");

function createVmReflection() {
  return {
    getRootVmTypeExpr() {
      return "TestVm";
    },
    getSyntheticPrefix() {
      return "__AU_TTC_";
    },
  };
}

const VM = createVmReflection();
const NOOP_MODULE_RESOLVER = (_specifier: string, _containingFile: string) => null;

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
  semantics: MaterializedSemantics,
  options?: { templatePath?: string },
) {
  const templatePath = options?.templatePath ?? "template.html";
  return compileTemplate({
    html: markup,
    templateFilePath: templatePath,
    isJs: false,
    vm: VM,
    semantics,
    resourceGraph: semantics.resourceGraph,
    resourceScope: semantics.defaultScope ?? null,
    moduleResolver: NOOP_MODULE_RESOLVER,
  });
}

function positionAtOffset(text: string, offset: number): { line: number; character: number } {
  const length = text.length;
  const clamped = Math.max(0, Math.min(offset, length));
  const lineStarts = computeLineStarts(text);
  let line = 0;
  while (line + 1 < lineStarts.length && (lineStarts[line + 1] ?? Number.POSITIVE_INFINITY) <= clamped) {
    line += 1;
  }
  const lineStart = lineStarts[line] ?? 0;
  return { line, character: clamped - lineStart };
}

function computeLineStarts(text: string): number[] {
  const starts = [0];
  for (let i = 0; i < text.length; i += 1) {
    const ch = text.charCodeAt(i);
    if (ch === 13 /* CR */ || ch === 10 /* LF */) {
      if (ch === 13 /* CR */ && text.charCodeAt(i + 1) === 10 /* LF */) i += 1;
      starts.push(i + 1);
    }
  }
  return starts;
}

function sliceToken(text: string, token: { span: { start: number; end: number } }): string {
  return text.slice(token.span.start, token.span.end);
}

function elementTokens(markup: string, semantics: MaterializedSemantics) {
  const compilation = compileTemplateForSemanticTokens(markup, semantics);
  const syntax = buildTemplateSyntaxRegistry(semantics);
  return collectSemanticTokens(markup, compilation, syntax)
    .filter((token) => token.type === "aureliaElement");
}

// =============================================================================
// Test Suite
// =============================================================================

describe("Semantic Tokens + Resolution Integration", () => {
  let program: ts.Program;
  let resolutionResult: ReturnType<typeof discoverProjectSemantics>;
  let rootSemantics: MaterializedSemantics;

  beforeAll(() => {
    program = createProgramFromApp(EXPLICIT_APP);
    const diagnostics = new DiagnosticsRuntime();
    resolutionResult = discoverProjectSemantics(program, { diagnostics: diagnostics.forSource("project") });

    // Get semantics for root scope (with discovered elements merged)
    rootSemantics = materializeSemanticsForScope(
      BUILTIN_SEMANTICS,
      resolutionResult.resourceGraph,
      resolutionResult.resourceGraph.root,
    );
  });

  // =========================================================================
  // Section 1: Resolution discovers elements
  // =========================================================================

  describe("Resolution discovers custom elements", () => {
    it("discovers nav-bar element", () => {
      const navBar = resolutionResult.resources.find(
        (c) => c.kind === "custom-element" && c.name.value === "nav-bar",
      );
      expect(navBar, "nav-bar discovered").toBeTruthy();
    });

    it("discovers user-card element", () => {
      const userCard = resolutionResult.resources.find(
        (c) => c.kind === "custom-element" && c.name.value === "user-card",
      );
      expect(userCard, "user-card discovered").toBeTruthy();
    });

    it("discovers data-grid element with aliases", () => {
      const dataGrid = resolutionResult.resources.find(
        (c) => c.kind === "custom-element" && c.name.value === "data-grid",
      );
      expect(dataGrid, "data-grid discovered").toBeTruthy();
      const aliases = dataGrid!.aliases
        .map((alias) => alias.value)
        .filter((alias): alias is string => !!alias);
      expect(aliases, "has aliases").toContain("grid");
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
      const tokens = elementTokens(markup, rootSemantics);

      expect(tokens.length, "has tokens for nav-bar").toBe(2);

      const first = tokens[0]!;
      const firstPos = positionAtOffset(markup, first.span.start);
      expect(firstPos.line, "first token line").toBe(0);
      expect(firstPos.character, "first token char (after <)").toBe(1);
      expect(first.span.end - first.span.start, "first token length").toBe("nav-bar".length);
      expect(sliceToken(markup, first), "token text").toBe("nav-bar");

      const second = tokens[1]!;
      const secondPos = positionAtOffset(markup, second.span.start);
      expect(secondPos.character, "second token char (after </)").toBe(11);
      expect(second.span.end - second.span.start, "second token length").toBe("nav-bar".length);
      expect(sliceToken(markup, second), "token text").toBe("nav-bar");
    });

    it("generates tokens for multiple custom elements", () => {
      const markup = `<nav-bar></nav-bar>\n<user-card></user-card>`;
      const tokens = elementTokens(markup, rootSemantics);

      expect(tokens.length, "has tokens for both elements").toBe(4);

      const tokenLengths = tokens.map((t) => t.span.end - t.span.start);
      expect(tokenLengths, "has nav-bar tokens").toContain("nav-bar".length);
      expect(tokenLengths, "has user-card tokens").toContain("user-card".length);
    });

    it("does NOT generate token for native HTML element", () => {
      const markup = `<div class="container"></div>`;
      const tokens = elementTokens(markup, rootSemantics);
      expect(tokens.length, "no tokens for native div").toBe(0);
    });

    it("does NOT generate token for unknown element", () => {
      const markup = `<unknown-widget></unknown-widget>`;
      const tokens = elementTokens(markup, rootSemantics);
      expect(tokens.length, "no tokens for unknown element").toBe(0);
    });

    it("mixed custom and native elements: only custom get tokens", () => {
      const markup = `<div>\n  <nav-bar></nav-bar>\n  <span>text</span>\n</div>`;
      const tokens = elementTokens(markup, rootSemantics);

      expect(tokens.length, "only custom element gets tokens").toBe(2);
      expect(sliceToken(markup, tokens[0]!), "token text").toBe("nav-bar");
    });
  });

  // =========================================================================
  // Section 4: Custom elements inside template controllers
  // =========================================================================

  describe("Custom elements inside template controllers", () => {
    it("generates token for custom element inside if.bind", () => {
      const markup = `<div if.bind="show"><nav-bar></nav-bar></div>`;
      const tokens = elementTokens(markup, rootSemantics);

      const navBarTokens = tokens.filter((t) => sliceToken(markup, t) === "nav-bar");
      expect(navBarTokens.length, "has tokens for nav-bar inside if").toBe(2);
    });

    it("generates token for custom element inside repeat.for", () => {
      const markup = `<div repeat.for="item of items"><user-card></user-card></div>`;
      const tokens = elementTokens(markup, rootSemantics);

      const userCardTokens = tokens.filter((t) => sliceToken(markup, t) === "user-card");
      expect(userCardTokens.length, "has tokens for user-card inside repeat").toBe(2);
    });

    it("generates tokens for deeply nested custom element", () => {
      const markup = `<div if.bind="a"><div if.bind="b"><nav-bar></nav-bar></div></div>`;
      const tokens = elementTokens(markup, rootSemantics);

      const navBarTokens = tokens.filter((t) => sliceToken(markup, t) === "nav-bar");
      expect(navBarTokens.length, "has tokens for deeply nested nav-bar").toBe(2);
    });
  });

  // =========================================================================
  // Section 5: Self-closed custom elements
  // =========================================================================

  describe("Self-closed custom elements", () => {
    it("self-closed custom element gets single token", () => {
      const markup = `<nav-bar />`;
      const tokens = elementTokens(markup, rootSemantics);

      expect(tokens.length, "self-closed has 1 token").toBe(1);
    });
  });
});
