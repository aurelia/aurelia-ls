import { beforeAll, describe, expect, it } from "vitest";
import { createWorkspaceHarness } from "./harness/index.js";
import { asFixtureId } from "./fixtures/index.js";
import {
  expectDefinition,
  expectLocationAtOffset,
  expectReferencesAtOffsets,
  expectToken,
  findOffset,
  findOffsets,
  findPosition,
  hasLabel,
  positionAt,
  spanCoversOffset,
} from "./test-utils.js";

describe("workspace binding shorthand syntax", () => {
  let harness: Awaited<ReturnType<typeof createWorkspaceHarness>>;
  let appUri: string;
  let appText: string;

  beforeAll(async () => {
    harness = await createWorkspaceHarness({
      fixtureId: asFixtureId("binding-shorthand-syntax"),
      openTemplates: "none",
    });
    appUri = harness.openTemplate("src/my-app.html");
    const text = harness.readText(appUri);
    if (!text) throw new Error("Expected template text for binding-shorthand-syntax fixture");
    appText = text;
  });

  it("resolves shorthand-bound properties", () => {
    const pos = findPosition(appText, ":value=\"message\"", ":value=\"".length + 1);
    const defs = harness.workspace.query(appUri).definition(pos);
    expectDefinition(harness.readText.bind(harness), defs, {
      uriEndsWith: "/src/my-app.ts",
      textIncludes: "message",
    });
  });

  it("resolves shorthand event handlers", () => {
    const pos = findPosition(appText, "@click=\"onClick()\"", "@click=\"".length + 1);
    const defs = harness.workspace.query(appUri).definition(pos);
    expectDefinition(harness.readText.bind(harness), defs, {
      uriEndsWith: "/src/my-app.ts",
      textIncludes: "onClick",
    });
  });

  it("emits command tokens for shorthand and explicit commands", () => {
    const tokens = harness.workspace.query(appUri).semanticTokens();
    expectToken(tokens, appText, { type: "aureliaCommand", text: ":" });
    expectToken(tokens, appText, { type: "aureliaCommand", text: "@" });
    expectToken(tokens, appText, { type: "aureliaCommand", text: "trigger" });
    expectToken(tokens, appText, { type: "aureliaCommand", text: "delegate" });
  });

  it("completes view-model members in shorthand bindings", () => {
    const pos = findPosition(appText, ":class=\"state\"", ":class=\"".length);
    const completions = harness.workspace.query(appUri).completions(pos).items;
    expect(hasLabel(completions, "state")).toBe(true);
    expect(hasLabel(completions, "message")).toBe(true);
    expect(hasLabel(completions, "isActive")).toBe(true);
  });

  it("finds references for interpolated properties", () => {
    const query = harness.workspace.query(appUri);
    const pos = findPosition(appText, "${count}", 3);
    const refs = query.references(pos);

    const templateOffset = findOffset(appText, "${count}", 3);
    expectLocationAtOffset(refs, appUri, templateOffset, "Missing template reference for count");

    const vmText = harness.readText("src/my-app.ts");
    if (!vmText) throw new Error("Expected view-model text for binding-shorthand-syntax fixture");
    const vmUri = harness.toDocumentUri("src/my-app.ts");
    const vmOffset = findOffset(vmText, "count = 0", 1);
    expectLocationAtOffset(refs, vmUri, vmOffset, "Missing view-model reference for count");
  });

  it("finds references for shorthand-bound properties", () => {
    const query = harness.workspace.query(appUri);
    const pos = findPosition(appText, ":value=\"message\"", ":value=\"".length + 1);
    const refs = query.references(pos);

    const templateOffset = findOffset(appText, ":value=\"message\"", ":value=\"".length + 1);
    expectLocationAtOffset(refs, appUri, templateOffset, "Missing template reference for message");

    const vmText = harness.readText("src/my-app.ts");
    if (!vmText) throw new Error("Expected view-model text for binding-shorthand-syntax fixture");
    const vmUri = harness.toDocumentUri("src/my-app.ts");
    const vmOffset = findOffset(vmText, "message = \"Hello\"", 1);
    expectLocationAtOffset(refs, vmUri, vmOffset, "Missing view-model reference for message");
  });
});

describe("workspace template local scopes", () => {
  let harness: Awaited<ReturnType<typeof createWorkspaceHarness>>;
  let appUri: string;
  let appText: string;

  beforeAll(async () => {
    harness = await createWorkspaceHarness({
      fixtureId: asFixtureId("template-local-scopes"),
      openTemplates: "none",
    });
    appUri = harness.openTemplate("src/my-app.html");
    const text = harness.readText(appUri);
    if (!text) throw new Error("Expected template text for template-local-scopes fixture");
    appText = text;
  });

  it("resolves <let> scope definitions", () => {
    const pos = findPosition(appText, "${total}", 3);
    const defs = harness.workspace.query(appUri).definition(pos);
    expectDefinition(harness.readText.bind(harness), defs, {
      uriEndsWith: "/src/my-app.html",
      textIncludes: "total.bind",
    });
  });

  it("resolves repeat locals and references", () => {
    const pos = findPosition(appText, "item.name", 1);
    const query = harness.workspace.query(appUri);
    const defs = query.definition(pos);
    expectDefinition(harness.readText.bind(harness), defs, {
      uriEndsWith: "/src/my-app.html",
      textIncludes: "item of items",
    });

    const labelPos = findPosition(appText, "${label}", 3);
    const refs = query.references(labelPos);
    const labelDecl = findOffset(appText, "<let label.bind=\"item.name\">", "<let ".length + 1);
    const labelUse = findOffset(appText, "${label}", 3);
    expectReferencesAtOffsets(refs, appUri, [labelDecl, labelUse]);
  });

  it("completes locals inside repeat scopes", () => {
    const pos = findPosition(appText, "item.name", "item.".length);
    const completions = harness.workspace.query(appUri).completions(pos).items;
    expect(hasLabel(completions, "name")).toBe(true);
    expect(hasLabel(completions, "active")).toBe(true);
    expect(hasLabel(completions, "details")).toBe(true);
  });
});

describe("workspace portal chain", () => {
  let harness: Awaited<ReturnType<typeof createWorkspaceHarness>>;
  let appUri: string;
  let appText: string;

  beforeAll(async () => {
    harness = await createWorkspaceHarness({
      fixtureId: asFixtureId("portal-chain"),
      openTemplates: "none",
    });
    appUri = harness.openTemplate("src/my-app.html");
    const text = harness.readText(appUri);
    if (!text) throw new Error("Expected template text for portal-chain fixture");
    appText = text;
  });

  it("resolves portal chain bindings", () => {
    const pos = findPosition(appText, "showPortal", 1);
    const defs = harness.workspace.query(appUri).definition(pos);
    expectDefinition(harness.readText.bind(harness), defs, {
      uriEndsWith: "/src/my-app.ts",
      textIncludes: "showPortal",
    });
  });

  it("emits controller tokens for stacked controllers", () => {
    const tokens = harness.workspace.query(appUri).semanticTokens();
    expectToken(tokens, appText, { type: "aureliaController", text: "if" });
    expectToken(tokens, appText, { type: "aureliaController", text: "with" });
    expectToken(tokens, appText, { type: "aureliaController", text: "portal" });
  });

  it("completes members in with-bound scopes", () => {
    const pos = findPosition(appText, "${title}", 3);
    const completions = harness.workspace.query(appUri).completions(pos).items;
    expect(hasLabel(completions, "title")).toBe(true);
    expect(hasLabel(completions, "note")).toBe(true);
  });

  it("finds references for portal chain bindings", () => {
    const query = harness.workspace.query(appUri);
    const pos = findPosition(appText, "showPortal", 1);
    const refs = query.references(pos);

    const templateOffset = findOffset(appText, "showPortal", 1);
    expectLocationAtOffset(refs, appUri, templateOffset, "Missing template reference for showPortal");

    const vmText = harness.readText("src/my-app.ts");
    if (!vmText) throw new Error("Expected view-model text for portal-chain fixture");
    const vmUri = harness.toDocumentUri("src/my-app.ts");
    const vmOffset = findOffset(vmText, "showPortal = true", 1);
    expectLocationAtOffset(refs, vmUri, vmOffset, "Missing view-model reference for showPortal");
  });
});

describe("workspace portal deep nesting", () => {
  let harness: Awaited<ReturnType<typeof createWorkspaceHarness>>;
  let appUri: string;
  let appText: string;

  beforeAll(async () => {
    harness = await createWorkspaceHarness({
      fixtureId: asFixtureId("portal-deep-nesting"),
      openTemplates: "none",
    });
    appUri = harness.openTemplate("src/my-app.html");
    const text = harness.readText(appUri);
    if (!text) throw new Error("Expected template text for portal-deep-nesting fixture");
    appText = text;
  });

  it("resolves promise branch locals", () => {
    const pos = findPosition(appText, "result.show", 1);
    const defs = harness.workspace.query(appUri).definition(pos);
    const declOffset = findOffset(appText, "then.bind=\"result\"", "then.bind=\"".length + 1);
    expectLocationAtOffset(defs, appUri, declOffset, "Missing definition for promise local");
  });

  it("resolves repeat locals inside portal branches", () => {
    const pos = findPosition(appText, "item.label", 1);
    const defs = harness.workspace.query(appUri).definition(pos);
    const declOffset = findOffset(appText, "repeat.for=\"item of result.items\"", "repeat.for=\"".length + 1);
    expectLocationAtOffset(defs, appUri, declOffset, "Missing definition for repeat local");
  });

  it("emits controller tokens for deep nesting", () => {
    const tokens = harness.workspace.query(appUri).semanticTokens();
    expectToken(tokens, appText, { type: "aureliaController", text: "promise" });
    expectToken(tokens, appText, { type: "aureliaController", text: "then" });
    expectToken(tokens, appText, { type: "aureliaController", text: "catch" });
    expectToken(tokens, appText, { type: "aureliaController", text: "if" });
    expectToken(tokens, appText, { type: "aureliaController", text: "portal" });
    expectToken(tokens, appText, { type: "aureliaController", text: "repeat" });
  });

  it("resolves catch branch locals", () => {
    const pos = findPosition(appText, "err.message", 1);
    const defs = harness.workspace.query(appUri).definition(pos);
    const declOffset = findOffset(appText, "catch.bind=\"err\"", "catch.bind=\"".length + 1);
    expectLocationAtOffset(defs, appUri, declOffset, "Missing definition for catch alias");
  });

  it("completes promise branch members", () => {
    const pos = findPosition(appText, "result.show", "result.".length);
    const completions = harness.workspace.query(appUri).completions(pos).items;
    expect(hasLabel(completions, "show")).toBe(true);
    expect(hasLabel(completions, "items")).toBe(true);
  });

  it("finds references for promise branch locals", () => {
    const query = harness.workspace.query(appUri);
    const pos = findPosition(appText, "result.show", 1);
    const refs = query.references(pos);
    const showOffset = findOffset(appText, "result.show", 1);
    const itemsOffset = findOffset(appText, "result.items", 1);
    expectReferencesAtOffsets(refs, appUri, [showOffset, itemsOffset]);
  });
});

describe("workspace let edge cases", () => {
  let harness: Awaited<ReturnType<typeof createWorkspaceHarness>>;
  let appUri: string;
  let appText: string;

  beforeAll(async () => {
    harness = await createWorkspaceHarness({
      fixtureId: asFixtureId("let-edge-cases"),
      openTemplates: "none",
    });
    appUri = harness.openTemplate("src/my-app.html");
    const text = harness.readText(appUri);
    if (!text) throw new Error("Expected template text for let-edge-cases fixture");
    appText = text;
  });

  it("resolves outer let definitions", () => {
    const outerUse = findPosition(appText, "${total}", 3);
    const defs = harness.workspace.query(appUri).definition(outerUse);
    const outerDecl = findOffset(appText, "<let total.bind=\"baseTotal\">", "<let ".length + 1);
    expectLocationAtOffset(defs, appUri, outerDecl, "Missing outer let definition");
  });

  it("resolves inner let shadowing and references", () => {
    const innerUseStart = appText.indexOf("${total}", appText.indexOf("repeat.for"));
    if (innerUseStart < 0) throw new Error("Missing inner ${total} usage");
    const innerUse = positionAt(appText, innerUseStart + 3);
    const query = harness.workspace.query(appUri);
    const defs = query.definition(innerUse);
    const innerDecl = findOffset(appText, "<let total.bind=\"entry.total\">", "<let ".length + 1);
    expectLocationAtOffset(defs, appUri, innerDecl, "Missing inner let definition");

    const refs = query.references(innerUse);
    const innerUseOffset = innerUseStart + 3;
    expectReferencesAtOffsets(refs, appUri, [innerDecl, innerUseOffset]);

    const outerDecl = findOffset(appText, "<let total.bind=\"baseTotal\">", "<let ".length + 1);
    const hasOuter = refs.some((loc) => String(loc.uri) === String(appUri) && spanCoversOffset(loc.span, outerDecl));
    expect(hasOuter).toBe(false);
  });

  it("completes repeat locals in shadowed scopes", () => {
    const pos = findPosition(appText, "entry.name", "entry.".length);
    const completions = harness.workspace.query(appUri).completions(pos).items;
    expect(hasLabel(completions, "name")).toBe(true);
    expect(hasLabel(completions, "total")).toBe(true);
  });
});
