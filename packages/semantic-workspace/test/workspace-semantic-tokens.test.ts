import { beforeAll, describe, expect, it } from "vitest";
import { createWorkspaceHarness } from "./harness/index.js";
import { asFixtureId } from "./fixtures/index.js";

type TokenLike = {
  type: string;
  modifiers?: string[];
  span: { start: number; end: number };
};

function sliceToken(text: string, token: TokenLike): string {
  return text.slice(token.span.start, token.span.end);
}

function modifiersMatch(actual: string[] | undefined, expected: readonly string[] | undefined): boolean {
  if (!expected || expected.length === 0) return true;
  if (!actual) return false;
  return expected.every((mod) => actual.includes(mod));
}

function findToken(
  tokens: readonly TokenLike[],
  text: string,
  opts: { type: string; text: string; modifiers?: readonly string[] },
): TokenLike | undefined {
  return tokens.find((token) => {
    if (token.type !== opts.type) return false;
    if (sliceToken(text, token) !== opts.text) return false;
    return modifiersMatch(token.modifiers, opts.modifiers);
  });
}

function expectToken(
  tokens: readonly TokenLike[],
  text: string,
  opts: { type: string; text: string; modifiers?: readonly string[] },
): TokenLike {
  const hit = findToken(tokens, text, opts);
  expect(hit, `Expected ${opts.type} token for "${opts.text}"`).toBeDefined();
  return hit!;
}

function expectOrderedTokens(tokens: readonly TokenLike[]): void {
  for (let i = 1; i < tokens.length; i += 1) {
    const prev = tokens[i - 1];
    const next = tokens[i];
    const startDelta = prev.span.start - next.span.start;
    if (startDelta < 0) continue;
    if (startDelta > 0) {
      throw new Error(`Token order violated: ${prev.type} starts after ${next.type}`);
    }
    const prevLen = prev.span.end - prev.span.start;
    const nextLen = next.span.end - next.span.start;
    if (prevLen > nextLen) {
      throw new Error(`Token order violated: ${prev.type} length > ${next.type} length at same start`);
    }
  }
}

function expectUniqueTokens(tokens: readonly TokenLike[]): void {
  const seen = new Set<string>();
  for (const token of tokens) {
    const key = `${token.type}:${token.span.start}:${token.span.end}`;
    if (seen.has(key)) {
      throw new Error(`Duplicate token entry: ${key}`);
    }
    seen.add(key);
  }
}

describe("workspace semantic tokens (workspace-contract)", () => {
  let harness: Awaited<ReturnType<typeof createWorkspaceHarness>>;
  let appUri: string;
  let appText: string;
  let tokens: readonly TokenLike[];

  beforeAll(async () => {
    harness = await createWorkspaceHarness({
      fixtureId: asFixtureId("workspace-contract"),
      openTemplates: "none",
    });
    appUri = harness.openTemplate("src/my-app.html");
    const text = harness.readText(appUri);
    if (!text) {
      throw new Error("Expected template text for workspace-contract my-app.html");
    }
    appText = text;
    tokens = harness.workspace.query(appUri).semanticTokens();
  });

  it("emits element/bindable/attribute tokens", () => {
    expectToken(tokens, appText, { type: "aureliaElement", text: "summary-panel" });
    expectToken(tokens, appText, { type: "aureliaBindable", text: "stats" });
    expectToken(tokens, appText, { type: "aureliaAttribute", text: "copy-to-clipboard" });
  });

  it("orders tokens by span start then length", () => {
    expectOrderedTokens(tokens);
  });

  it("dedupes tokens by span and type", () => {
    expectUniqueTokens(tokens);
  });

  it("emits command/controller tokens", () => {
    expectToken(tokens, appText, { type: "aureliaCommand", text: "trigger" });
    expectToken(tokens, appText, { type: "aureliaController", text: "if" });
  });

  it("emits converter/behavior tokens", () => {
    expectToken(tokens, appText, { type: "aureliaConverter", text: "titlecase" });
    expectToken(tokens, appText, { type: "aureliaBehavior", text: "debounce" });
  });

  it("emits meta element/attribute tokens", () => {
    expectToken(tokens, appText, { type: "aureliaMetaElement", text: "import" });
    expectToken(tokens, appText, { type: "aureliaMetaElement", text: "let" });
    expectToken(tokens, appText, { type: "aureliaMetaAttribute", text: "from" });
  });

  it("emits let declaration tokens", () => {
    expectToken(tokens, appText, { type: "variable", text: "total", modifiers: ["declaration"] });
  });
});

describe("workspace semantic tokens (meta elements)", () => {
  let harness: Awaited<ReturnType<typeof createWorkspaceHarness>>;
  let templateUri: string;
  let templateText: string;
  let tokens: readonly TokenLike[];

  beforeAll(async () => {
    harness = await createWorkspaceHarness({
      fixtureId: asFixtureId("rename-cascade-basic"),
      openTemplates: "none",
    });
    templateUri = harness.openTemplate("src/my-element.html");
    const text = harness.readText(templateUri);
    if (!text) {
      throw new Error("Expected template text for rename-cascade-basic my-element.html");
    }
    templateText = text;
    tokens = harness.workspace.query(templateUri).semanticTokens();
  });

  it("emits <bindable> meta element tokens", () => {
    expectToken(tokens, templateText, { type: "aureliaMetaElement", text: "bindable" });
    expectToken(tokens, templateText, { type: "aureliaMetaAttribute", text: "name" });
    expectToken(tokens, templateText, { type: "aureliaBindable", text: "extra", modifiers: ["declaration"] });
  });
});
