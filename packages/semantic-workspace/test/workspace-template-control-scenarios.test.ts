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
} from "./test-utils.js";

describe("workspace template control scenarios", () => {
  let harness: Awaited<ReturnType<typeof createWorkspaceHarness>>;
  let controllersUri: string;
  let controllersText: string;
  let projectionUri: string;
  let projectionText: string;
  let deepUri: string;
  let deepText: string;
  let localsUri: string;
  let localsText: string;

  beforeAll(async () => {
    harness = await createWorkspaceHarness({
      fixtureId: asFixtureId("template-control-scenarios"),
      openTemplates: "none",
    });
    controllersUri = harness.openTemplate("src/components/controllers-branches.html");
    projectionUri = harness.openTemplate("src/components/projection-demo.html");
    deepUri = harness.openTemplate("src/components/deep-nesting.html");
    localsUri = harness.openTemplate("src/components/locals-demo.html");

    const controllers = harness.readText(controllersUri);
    const projection = harness.readText(projectionUri);
    const deep = harness.readText(deepUri);
    const locals = harness.readText(localsUri);
    if (!controllers || !projection || !deep || !locals) {
      throw new Error("Expected template text for template-control-scenarios fixtures");
    }
    controllersText = controllers;
    projectionText = projection;
    deepText = deep;
    localsText = locals;
  });

  it("hovers template controllers in stacked/branch contexts", () => {
    const query = harness.workspace.query(controllersUri);
    const pos = findPosition(controllersText, "promise.bind", 1);
    const hover = query.hover(pos);
    expect(hover?.contents ?? "").toContain("(template controller)");
    expect(hover?.contents ?? "").toContain("promise");
  });

  it("resolves with.bind overlay members", () => {
    const query = harness.workspace.query(controllersUri);
    const pos = findPosition(controllersText, "${displayName}", 3);
    const defs = query.definition(pos);
    expectDefinition(harness.readText.bind(harness), defs, {
      uriEndsWith: "/src/components/controllers-branches.ts",
      textIncludes: "displayName",
    });
  });

  it("resolves promise branch alias definitions", () => {
    const query = harness.workspace.query(controllersUri);

    const dataPos = findPosition(controllersText, "${data.displayName}", 3);
    const dataDefs = query.definition(dataPos);
    const dataDecl = findOffset(controllersText, "then.from-view=\"data\"", "then.from-view=\"".length + 1);
    expectLocationAtOffset(dataDefs, controllersUri, dataDecl, "Missing definition for promise then alias");

    const errPos = findPosition(controllersText, "${err.message}", 3);
    const errDefs = query.definition(errPos);
    const errDecl = findOffset(controllersText, "catch.from-view=\"err\"", "catch.from-view=\"".length + 1);
    expectLocationAtOffset(errDefs, controllersUri, errDecl, "Missing definition for promise catch alias");
  });

  it("resolves switch case bindings to view-model definitions", () => {
    const query = harness.workspace.query(controllersUri);
    const pos = findPosition(controllersText, "modePrimary", 1);
    const defs = query.definition(pos);
    expectDefinition(harness.readText.bind(harness), defs, {
      uriEndsWith: "/src/components/controllers-branches.ts",
      textIncludes: "modePrimary",
    });
  });

  it("finds references for switch case bindings", () => {
    const query = harness.workspace.query(controllersUri);
    const pos = findPosition(controllersText, "${modePrimary}", 3);
    const refs = query.references(pos);
    const offsets = findOffsets(controllersText, /\bmodePrimary\b/);
    expectReferencesAtOffsets(refs, controllersUri, offsets);
  });

  it("emits controller tokens for promise/switch branches", () => {
    const tokens = harness.workspace.query(controllersUri).semanticTokens();
    expectToken(tokens, controllersText, { type: "aureliaController", text: "promise" });
    expectToken(tokens, controllersText, { type: "aureliaController", text: "then" });
    expectToken(tokens, controllersText, { type: "aureliaController", text: "catch" });
    expectToken(tokens, controllersText, { type: "aureliaController", text: "switch" });
    expectToken(tokens, controllersText, { type: "aureliaController", text: "case" });
  });

  it("resolves projected custom element definitions", () => {
    const query = harness.workspace.query(projectionUri);
    const pos = findPosition(projectionText, "<my-card", 1);
    const defs = query.definition(pos);
    expectDefinition(harness.readText.bind(harness), defs, {
      uriEndsWith: "/src/components/my-card.ts",
      textIncludes: "MyCard",
    });
  });

  it("resolves projection repeat locals", () => {
    const query = harness.workspace.query(projectionUri);
    const pos = findPosition(projectionText, "item.label", 1);
    const defs = query.definition(pos);
    expectDefinition(harness.readText.bind(harness), defs, {
      uriEndsWith: "/src/components/projection-demo.html",
      textIncludes: "item of items",
    });
  });

  it("emits projection tokens", () => {
    const tokens = harness.workspace.query(projectionUri).semanticTokens();
    expectToken(tokens, projectionText, { type: "aureliaElement", text: "my-card" });
    expectToken(tokens, projectionText, { type: "aureliaController", text: "repeat" });
  });

  it("resolves promise-then repeat locals", () => {
    const query = harness.workspace.query(deepUri);
    const pos = findPosition(deepText, "item.label", 1);
    const defs = query.definition(pos);
    expectDefinition(harness.readText.bind(harness), defs, {
      uriEndsWith: "/src/components/deep-nesting.html",
      textIncludes: "item of items",
    });
  });

  it("resolves nested switch bindings", () => {
    const query = harness.workspace.query(deepUri);
    const pos = findPosition(deepText, "switch.bind=\"inner\"", "switch.bind=\"".length + 1);
    const defs = query.definition(pos);
    expectDefinition(harness.readText.bind(harness), defs, {
      uriEndsWith: "/src/components/deep-nesting.ts",
      textIncludes: "inner",
    });
  });

  it("emits deep nesting controller tokens", () => {
    const tokens = harness.workspace.query(deepUri).semanticTokens();
    expectToken(tokens, deepText, { type: "aureliaController", text: "promise" });
    expectToken(tokens, deepText, { type: "aureliaController", text: "then" });
    expectToken(tokens, deepText, { type: "aureliaController", text: "repeat" });
    expectToken(tokens, deepText, { type: "aureliaController", text: "switch" });
    expectToken(tokens, deepText, { type: "aureliaController", text: "case" });
  });

  it("resolves <let> definitions", () => {
    const query = harness.workspace.query(localsUri);
    const pos = findPosition(localsText, "${total}", 3);
    const defs = query.definition(pos);
    expectDefinition(harness.readText.bind(harness), defs, {
      uriEndsWith: "/src/components/locals-demo.html",
      textIncludes: "total.bind",
    });
  });

  it("finds repeat local references", () => {
    const query = harness.workspace.query(localsUri);
    const pos = findPosition(localsText, "item.name", 1);
    const refs = query.references(pos);
    const offsets = findOffsets(localsText, /\bitem\b/);
    expectReferencesAtOffsets(refs, localsUri, offsets);
  });

  it("completes repeat local properties", () => {
    const query = harness.workspace.query(localsUri);
    const pos = findPosition(localsText, "item.name", "item.".length);
    const completions = query.completions(pos).items;
    expect(hasLabel(completions, "name")).toBe(true);
    expect(hasLabel(completions, "count")).toBe(true);
  });
});
