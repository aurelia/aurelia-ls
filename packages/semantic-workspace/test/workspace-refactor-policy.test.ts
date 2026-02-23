import { beforeAll, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_REFACTOR_POLICY,
  type RefactorPolicy,
} from "../src/refactor-policy.js";
import { asFixtureId } from "./fixtures/index.js";
import { createWorkspaceHarness } from "./harness/index.js";

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

function positionAt(text: string, offset: number): { line: number; character: number } {
  const clamped = Math.max(0, Math.min(offset, text.length));
  const starts = computeLineStarts(text);
  let line = 0;
  while (line + 1 < starts.length && (starts[line + 1] ?? Number.POSITIVE_INFINITY) <= clamped) {
    line += 1;
  }
  const lineStart = starts[line] ?? 0;
  return { line, character: clamped - lineStart };
}

function findPosition(text: string, needle: string, delta = 0): { line: number; character: number } {
  const index = text.indexOf(needle);
  if (index < 0) {
    throw new Error(`Marker not found: ${needle}`);
  }
  return positionAt(text, index + delta);
}

function insertBefore(text: string, marker: string, insert: string): string {
  const index = text.indexOf(marker);
  if (index < 0) {
    throw new Error(`Marker not found: ${marker}`);
  }
  return text.slice(0, index) + insert + text.slice(index);
}

describe("workspace refactor policy (rename)", () => {
  let harness: Awaited<ReturnType<typeof createWorkspaceHarness>>;
  let appUri: string;
  let appText: string;

  beforeAll(async () => {
    const policy: RefactorPolicy = {
      ...DEFAULT_REFACTOR_POLICY,
      rename: {
        ...DEFAULT_REFACTOR_POLICY.rename,
        decisionPoints: [
          ...DEFAULT_REFACTOR_POLICY.rename.decisionPoints,
          {
            id: "file-rename",
            required: true,
            description: "Require file rename decision.",
          },
        ],
      },
    };
    harness = await createWorkspaceHarness({
      fixtureId: asFixtureId("rename-cascade-basic"),
      openTemplates: "none",
      workspace: {
        refactorPolicy: policy,
      },
    });
    appUri = harness.openTemplate("src/app.html");
    const text = harness.readText(appUri);
    if (!text) {
      throw new Error("Expected template text for rename-cascade-basic app.html");
    }
    appText = text;
  });

  it("denies rename when required policy decisions are unresolved", () => {
    const position = findPosition(appText, "<my-element", 1);
    const result = harness.workspace.refactor().rename({
      uri: appUri,
      position,
      newName: "my-widget",
    });
    expect("error" in result).toBe(true);
    if ("error" in result) {
      expect(result.error.kind).toBe("refactor-decision-required");
      expect(result.error.message).toContain("required decisions are unresolved");
      expect(result.error.retryable).toBe(false);
    }
  });

  it("short-circuits conclusive denied rename before workspace refresh", () => {
    const refreshSpy = vi.spyOn(harness.workspace, "refresh");
    const position = findPosition(appText, "<my-element", 1);
    const result = harness.workspace.refactor().rename({
      uri: appUri,
      position,
      newName: "my-widget",
    });
    expect("error" in result).toBe(true);
    expect(refreshSpy).not.toHaveBeenCalled();
    refreshSpy.mockRestore();
  });
});

describe("workspace refactor policy (rename preflight)", () => {
  let harness: Awaited<ReturnType<typeof createWorkspaceHarness>>;
  let appUri: string;
  let appText: string;

  beforeAll(async () => {
    harness = await createWorkspaceHarness({
      fixtureId: asFixtureId("rename-cascade-basic"),
      openTemplates: "none",
    });
    appUri = harness.openTemplate("src/app.html");
    const text = harness.readText(appUri);
    if (!text) {
      throw new Error("Expected template text for rename-cascade-basic app.html");
    }
    appText = text;
  });

  it("denies provenance-required rename without forcing refresh", () => {
    const refreshSpy = vi.spyOn(harness.workspace, "refresh");
    const result = harness.workspace.refactor().rename({
      uri: appUri,
      position: positionAt(appText, appText.length),
      newName: "renamed",
    });
    expect("error" in result).toBe(true);
    if ("error" in result) {
      expect(result.error.kind).toBe("refactor-policy-denied");
      expect(result.error.message).toContain("provenance-required");
      expect(result.error.retryable).toBe(false);
    }
    expect(refreshSpy).not.toHaveBeenCalled();
    refreshSpy.mockRestore();
  });
});

describe("workspace refactor policy (code actions)", () => {
  let baselineHarness: Awaited<ReturnType<typeof createWorkspaceHarness>>;
  let gatedHarness: Awaited<ReturnType<typeof createWorkspaceHarness>>;
  let baselineUri: string;
  let gatedUri: string;
  let baselineMutated: string;
  let gatedMutated: string;

  beforeAll(async () => {
    baselineHarness = await createWorkspaceHarness({
      fixtureId: asFixtureId("rename-cascade-basic"),
      openTemplates: "none",
    });
    const gatedPolicy: RefactorPolicy = {
      ...DEFAULT_REFACTOR_POLICY,
      codeActions: {
        ...DEFAULT_REFACTOR_POLICY.codeActions,
        decisionPoints: [
          ...DEFAULT_REFACTOR_POLICY.codeActions.decisionPoints,
          {
            id: "import-style",
            required: true,
            description: "Require explicit import-style decision.",
          },
        ],
      },
    };
    gatedHarness = await createWorkspaceHarness({
      fixtureId: asFixtureId("rename-cascade-basic"),
      openTemplates: "none",
      workspace: {
        refactorPolicy: gatedPolicy,
      },
    });

    baselineUri = baselineHarness.openTemplate("src/app.html");
    gatedUri = gatedHarness.openTemplate("src/app.html");
    const baselineText = baselineHarness.readText(baselineUri);
    const gatedText = gatedHarness.readText(gatedUri);
    if (!baselineText || !gatedText) {
      throw new Error("Expected template text for rename-cascade-basic app.html");
    }

    baselineMutated = insertBefore(
      baselineText,
      "heading.bind=\"heading\"",
      "    middle-name.bind=\"middleName\"\n",
    );
    gatedMutated = insertBefore(
      gatedText,
      "heading.bind=\"heading\"",
      "    middle-name.bind=\"middleName\"\n",
    );
    baselineHarness.updateTemplate(baselineUri, baselineMutated, 2);
    gatedHarness.updateTemplate(gatedUri, gatedMutated, 2);
  });

  it("keeps non-import code actions available when only import-style is unresolved", () => {
    const baselinePosition = findPosition(baselineMutated, "middle-name.bind", 1);
    const baselineActions = baselineHarness.workspace.refactor().codeActions({
      uri: baselineUri,
      position: baselinePosition,
    });
    const baselineBindable = baselineActions.find((entry) => entry.id.startsWith("aurelia/add-bindable:"));
    expect(baselineBindable).toBeDefined();

    const gatedPosition = findPosition(gatedMutated, "middle-name.bind", 1);
    const gatedActions = gatedHarness.workspace.refactor().codeActions({
      uri: gatedUri,
      position: gatedPosition,
    });
    const gatedBindable = gatedActions.find((entry) => entry.id.startsWith("aurelia/add-bindable:"));
    expect(gatedBindable).toBeDefined();
  });
});

describe("workspace refactor policy (code actions import gating)", () => {
  let baselineHarness: Awaited<ReturnType<typeof createWorkspaceHarness>>;
  let gatedHarness: Awaited<ReturnType<typeof createWorkspaceHarness>>;
  let inferredHarness: Awaited<ReturnType<typeof createWorkspaceHarness>>;
  let baselineUri: string;
  let gatedUri: string;
  let inferredUri: string;
  let baselineMutated: string;
  let gatedMutated: string;
  let inferredMutated: string;

  beforeAll(async () => {
    baselineHarness = await createWorkspaceHarness({
      fixtureId: asFixtureId("workspace-contract"),
      openTemplates: "none",
    });
    const gatedPolicy: RefactorPolicy = {
      ...DEFAULT_REFACTOR_POLICY,
      codeActions: {
        ...DEFAULT_REFACTOR_POLICY.codeActions,
        decisionPoints: [
          ...DEFAULT_REFACTOR_POLICY.codeActions.decisionPoints,
          {
            id: "import-style",
            required: true,
            description: "Require explicit import-style decision.",
          },
        ],
      },
    };
    gatedHarness = await createWorkspaceHarness({
      fixtureId: asFixtureId("workspace-contract"),
      openTemplates: "none",
      workspace: {
        refactorPolicy: gatedPolicy,
      },
    });
    inferredHarness = await createWorkspaceHarness({
      fixtureId: asFixtureId("workspace-contract"),
      openTemplates: "none",
      workspace: {
        refactorPolicy: gatedPolicy,
        styleProfile: {
          imports: {
            organize: "sort",
          },
        },
      },
    });

    baselineUri = baselineHarness.openTemplate("src/my-app.html");
    gatedUri = gatedHarness.openTemplate("src/my-app.html");
    inferredUri = inferredHarness.openTemplate("src/my-app.html");
    const baselineText = baselineHarness.readText(baselineUri);
    const gatedText = gatedHarness.readText(gatedUri);
    const inferredText = inferredHarness.readText(inferredUri);
    if (!baselineText || !gatedText || !inferredText) {
      throw new Error("Expected template text for workspace-contract my-app.html");
    }

    baselineMutated = insertBefore(
      baselineText,
      "<template if.bind=\"activeDevice\">",
      "  <template if-not.bind=\"activeDevice\"></template>\n",
    );
    gatedMutated = insertBefore(
      gatedText,
      "<template if.bind=\"activeDevice\">",
      "  <template if-not.bind=\"activeDevice\"></template>\n",
    );
    inferredMutated = insertBefore(
      inferredText,
      "<template if.bind=\"activeDevice\">",
      "  <template if-not.bind=\"activeDevice\"></template>\n",
    );
    baselineHarness.updateTemplate(baselineUri, baselineMutated, 2);
    gatedHarness.updateTemplate(gatedUri, gatedMutated, 2);
    inferredHarness.updateTemplate(inferredUri, inferredMutated, 2);
  });

  it("suppresses import code actions when import-style decision is unresolved", () => {
    const baselinePosition = findPosition(baselineMutated, "if-not.bind", 1);
    const baselineActions = baselineHarness.workspace.refactor().codeActions({
      uri: baselineUri,
      position: baselinePosition,
    });
    const baselineImport = baselineActions.find((entry) => entry.id === "aurelia/add-import:template-controller:if-not");
    expect(baselineImport).toBeDefined();

    const gatedPosition = findPosition(gatedMutated, "if-not.bind", 1);
    const gatedActions = gatedHarness.workspace.refactor().codeActions({
      uri: gatedUri,
      position: gatedPosition,
    });
    const gatedImport = gatedActions.find((entry) => entry.id === "aurelia/add-import:template-controller:if-not");
    expect(gatedImport).toBeUndefined();
  });

  it("allows import code actions when required import-style is inferred from style profile", () => {
    const inferredPosition = findPosition(inferredMutated, "if-not.bind", 1);
    const inferredActions = inferredHarness.workspace.refactor().codeActions({
      uri: inferredUri,
      position: inferredPosition,
    });
    const inferredImport = inferredActions.find((entry) => entry.id === "aurelia/add-import:template-controller:if-not");
    expect(inferredImport).toBeDefined();
  });
});
