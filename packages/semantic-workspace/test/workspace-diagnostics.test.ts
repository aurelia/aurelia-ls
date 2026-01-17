import { beforeAll, describe, expect, it } from "vitest";
import { createWorkspaceHarness } from "./harness/index.js";
import { asFixtureId } from "./fixtures/index.js";

function insertBefore(text: string, marker: string, insert: string): string {
  const index = text.indexOf(marker);
  if (index < 0) {
    throw new Error(`Marker not found: ${marker}`);
  }
  return text.slice(0, index) + insert + text.slice(index);
}

function findOffset(text: string, needle: string): number {
  const index = text.indexOf(needle);
  if (index < 0) {
    throw new Error(`Needle not found: ${needle}`);
  }
  return index;
}

function spanCoversOffset(span: { start: number; end: number }, offset: number): boolean {
  if (span.end <= span.start) return span.start === offset;
  return offset >= span.start && offset < span.end;
}

describe("workspace diagnostics (rename-cascade-basic)", () => {
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

  it("maps unknown bindable diagnostics", () => {
    const mutated = insertBefore(
      appText,
      "heading.bind=\"heading\"",
      "    middle-name.bind=\"middleName\"\n",
    );
    harness.updateTemplate(appUri, mutated, 2);

    const diags = harness.workspace.query(appUri).diagnostics();
    const offset = findOffset(mutated, "middle-name.bind");
    const match = diags.find((diag) =>
      diag.code === "aurelia/unknown-bindable"
      && diag.span
      && spanCoversOffset(diag.span, offset)
    );

    expect(match).toBeDefined();
    if (match?.data && typeof match.data === "object") {
      const aurCode = (match.data as { aurCode?: string }).aurCode;
      expect(aurCode).toBe("AUR0707");
    }
  });
});

describe("workspace diagnostics (workspace-contract)", () => {
  let harness: Awaited<ReturnType<typeof createWorkspaceHarness>>;
  let appUri: string;
  let appText: string;

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
  });

  it("maps unknown controller diagnostics", () => {
    const mutated = insertBefore(
      appText,
      "<template if.bind=\"activeDevice\">",
      "  <template if-not.bind=\"activeDevice\"></template>\n",
    );
    harness.updateTemplate(appUri, mutated, 2);

    const diags = harness.workspace.query(appUri).diagnostics();
    const offset = findOffset(mutated, "if-not.bind");
    const match = diags.find((diag) =>
      diag.code === "aurelia/unknown-controller"
      && diag.span
      && spanCoversOffset(diag.span, offset)
    );

    expect(match).toBeDefined();
    if (match?.data && typeof match.data === "object") {
      const aurCode = (match.data as { aurCode?: string }).aurCode;
      expect(aurCode).toBe("AUR0754");
    }
  });
});
