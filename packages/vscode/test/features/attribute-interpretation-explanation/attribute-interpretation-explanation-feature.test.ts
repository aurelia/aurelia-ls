import { describe, expect, test, vi } from "vitest";
import { AttributeInterpretationExplanationFeature } from "../../../out/features/attribute-interpretation-explanation/attribute-interpretation-explanation-feature.js";
import { AureliaCommand } from "../../../out/product-contract.js";
import type { VscodeApi } from "../../../out/vscode-api.js";
import { createTestServices } from "../../helpers/test-helpers.js";
import { createVscodeApi, stubExtensionContext } from "../../helpers/vscode-stub.js";

const sourceUri = "file:///repo/src/my-app.html";
const nameRange = {
  start: { line: 4, character: 10 },
  end: { line: 4, character: 27 },
};
const attributeRange = {
  start: { line: 4, character: 10 },
  end: { line: 4, character: 45 },
};
const seed = {
  uri: sourceUri,
  position: nameRange.start,
  range: nameRange,
  documentVersion: 7,
  projectKey: "shop-app",
};

function available(uri: string, range = nameRange, label = "src/my-app.html@4:10") {
  return { state: "available" as const, location: { uri, range, label } };
}

function answer(selection = "exact", coverage = "complete") {
  return {
    schemaVersion: "0.2",
    result: "answered",
    selection,
    coverage,
    summary: "current attribute interpretation explanation",
    page: null,
    analysisBasis: { authority: "semantic-runtime", fingerprint: "basis:one" },
    continuations: [],
  };
}

function explanation(
  nextSteps: readonly unknown[] = [],
  conclusionKind = "compiler-control",
) {
  return {
    subject: {
      subjectKey: "attribute:my-app:repeat.for",
      projectKey: seed.projectKey,
      definitionName: "my-app",
      compilationLane: "app-runtime",
      rawName: "repeat.for",
      source: available(sourceUri, attributeRange),
      nameSource: available(sourceUri),
      valueSource: available(sourceUri, {
        start: { line: 4, character: 29 },
        end: { line: 4, character: 44 },
      }),
      templateSource: available(sourceUri, {
        start: { line: 0, character: 0 },
        end: { line: 8, character: 0 },
      }),
    },
    conclusion: {
      kind: conclusionKind,
      title: conclusionKind === "plain-attribute"
        ? "Attribute is handled by the platform"
        : "Attribute controls template compilation",
      explanation: conclusionKind === "plain-attribute"
        ? "Aurelia leaves this attribute to the platform."
        : "Aurelia interprets repeat.for as a template-controller instruction.",
      action: "Review the authored attribute and its declaration sources.",
    },
    evidence: {
      syntax: {},
      classification: {},
      valueSites: [],
      lowerings: [],
      effects: [],
      issues: [],
      blockers: [],
    },
    uncertainty: {
      state: "open",
      reasons: ["compiler-open-seam"],
      explanation: "One compiler boundary remains open.",
    },
    currentness: {
      authority: "answer-analysis-basis",
      explanation: "This explanation reflects the current analyzed source generation.",
    },
    nextSteps,
  };
}

function explainedResponse(
  nextSteps: readonly unknown[] = [],
  overrides: Record<string, unknown> = {},
  conclusionKind = "compiler-control",
) {
  return {
    fingerprint: "semantic-runtime:one",
    documentVersion: seed.documentVersion,
    answer: answer(),
    result: {
      status: "explained",
      explanation: explanation(nextSteps, conclusionKind),
      contenders: [],
    },
    ...overrides,
  };
}

function refusedResponse(kind: string, selection = "absent") {
  return {
    fingerprint: "semantic-runtime:two",
    documentVersion: seed.documentVersion,
    answer: answer(selection),
    result: {
      status: "refused",
      refusal: { kind, reason: "the attribute subject could not be selected safely" },
      contenders: [],
    },
  };
}

function sourceStep(
  uri = "file:///repo/src/my-app.ts",
  line = 8,
  label = "Open attribute declaration",
) {
  return {
    kind: "inspect-source",
    label,
    source: available(uri, {
      start: { line, character: 0 },
      end: { line, character: 20 },
    }, "src/my-app.ts"),
    relatedQueryKind: null,
    targetQuery: null,
  };
}

function createHarness(options: {
  readonly responses?: readonly unknown[];
  readonly selectModalButton?: boolean;
  readonly activeEditor?: "target" | "other" | "none";
} = {}) {
  const { vscode: stubVscode, recorded } = createVscodeApi({
    openDocuments: [{ uri: sourceUri, languageId: "html", text: "<li repeat.for=\"item of items\"></li>" }],
  });
  const targetDocument = stubVscode.workspace.textDocuments[0] as unknown as {
    uri: ReturnType<typeof stubVscode.Uri.parse>;
    version: number;
    isClosed: boolean;
  };
  targetDocument.version = seed.documentVersion;
  targetDocument.isClosed = false;
  const targetEditor = {
    document: targetDocument,
    selection: { active: { line: 40, character: 0 } },
  };
  const otherEditor = {
    document: { uri: stubVscode.Uri.parse("file:///repo/notes.txt"), version: 3, isClosed: false },
    selection: { active: { line: 1, character: 1 } },
  };
  stubVscode.window.activeTextEditor = options.activeEditor === "target"
    ? targetEditor
    : options.activeEditor === "none"
      ? null
      : otherEditor;
  const modalCalls: unknown[][] = [];
  const informationCalls: unknown[][] = [];
  Object.assign(stubVscode.window, {
    showInformationMessage: vi.fn(async (...args: unknown[]) => {
      informationCalls.push(args);
      const modal = args[1] as { readonly modal?: boolean } | undefined;
      if (modal?.modal === true) {
        modalCalls.push(args);
        return options.selectModalButton === true ? args[2] : undefined;
      }
      return undefined;
    }),
  });
  const responses = [...(options.responses ?? [explainedResponse()])];
  const getAttributeInterpretationExplanation = vi.fn(async () => responses.shift() ?? null);
  const vscode = stubVscode as unknown as VscodeApi;
  const { errors, logger } = createTestServices(vscode);
  AttributeInterpretationExplanationFeature.activate({
    extension: stubExtensionContext(stubVscode),
    vscode,
    errors,
    logger,
    lsp: { getAttributeInterpretationExplanation },
  } as never, (contribution) => contribution);
  return {
    stubVscode,
    recorded,
    targetDocument,
    targetEditor,
    otherEditor,
    getAttributeInterpretationExplanation,
    modalCalls,
    informationCalls,
  };
}

async function runCommand(harness: ReturnType<typeof createHarness>, value: unknown = seed) {
  return harness.recorded.commandHandlers.get(AureliaCommand.ExplainAttributeInterpretation)?.(value);
}

describe("AttributeInterpretationExplanationFeature", () => {
  test("registers only the hidden command and presents the exact saved attribute-name locus", async () => {
    const harness = createHarness({ activeEditor: "other" });

    await runCommand(harness);

    expect(harness.recorded.registeredCommands).toContain(AureliaCommand.ExplainAttributeInterpretation);
    expect(harness.recorded.contentProviders).toEqual([]);
    expect(harness.getAttributeInterpretationExplanation).toHaveBeenCalledExactlyOnceWith(seed);
    expect(harness.modalCalls).toEqual([[
      "Attribute controls template compilation",
      {
        modal: true,
        detail: [
          "Aurelia interprets repeat.for as a template-controller instruction.",
          "One compiler boundary remains open.",
          "Review the authored attribute and its declaration sources.",
        ].join("\n\n"),
      },
    ]]);
    expect(harness.stubVscode.window.activeTextEditor).toBe(harness.otherEditor);
  });

  test("rejects malformed seeds unless the frozen cursor is exactly the name-range start", async () => {
    const harness = createHarness();

    await runCommand(harness, { ...seed, position: { line: 4, character: 11 } });

    expect(harness.getAttributeInterpretationExplanation).not.toHaveBeenCalled();
    expect(harness.modalCalls).toEqual([]);
    expect(harness.informationCalls.at(-1)?.[0]).toMatch(/no longer valid/u);
  });

  test("does not retarget to a changed active editor or live cursor", async () => {
    let resolveResponse!: (value: unknown) => void;
    const response = new Promise((resolve) => { resolveResponse = resolve; });
    const harness = createHarness({ responses: [], activeEditor: "target" });
    harness.getAttributeInterpretationExplanation.mockImplementationOnce(async () => response);

    const pending = runCommand(harness);
    harness.targetEditor.selection.active = { line: 99, character: 12 };
    harness.stubVscode.window.activeTextEditor = harness.otherEditor;
    resolveResponse(explainedResponse());
    await pending;

    expect(harness.getAttributeInterpretationExplanation).toHaveBeenCalledWith(seed);
    expect(harness.modalCalls).toHaveLength(1);
    expect(harness.stubVscode.window.activeTextEditor).toBe(harness.otherEditor);
  });

  test("rejects a document-version change while the answer is in flight", async () => {
    let resolveResponse!: (value: unknown) => void;
    const response = new Promise((resolve) => { resolveResponse = resolve; });
    const harness = createHarness({ responses: [] });
    harness.getAttributeInterpretationExplanation.mockImplementationOnce(async () => response);
    const pending = runCommand(harness);
    harness.targetDocument.version += 1;
    resolveResponse(explainedResponse());
    await pending;
    expect(harness.modalCalls).toEqual([]);
  });

  test.each([
    ["project", { subject: { ...explanation().subject, projectKey: "other-app" } }],
    ["URI", { subject: { ...explanation().subject, nameSource: available("file:///repo/src/other.html") } }],
    ["range", { subject: { ...explanation().subject, nameSource: available(sourceUri, {
      start: nameRange.start,
      end: { line: 4, character: 26 },
    }) } }],
    ["subject key", { subject: { ...explanation().subject, subjectKey: "" } }],
  ])("refuses a mismatched exact %s", async (_kind, override) => {
    const changed = { ...explanation(), ...override };
    const harness = createHarness({ responses: [explainedResponse([], {
      result: { status: "explained", explanation: changed, contenders: [] },
    })] });
    await runCommand(harness);
    expect(harness.modalCalls).toEqual([]);
    expect(harness.recorded.shownDocuments).toEqual([]);
  });

  test.each(["closed", "open", "truncated"])(
    "presents exact %s truth and only material uncertainty text",
    async (state) => {
      const current = explanation();
      current.uncertainty.state = state;
      current.uncertainty.explanation = `Attribute evidence is ${state}.`;
      const harness = createHarness({ responses: [explainedResponse([], {
        answer: answer("exact", state === "closed" ? "complete" : state),
        result: { status: "explained", explanation: current, contenders: [] },
      })] });
      await runCommand(harness);
      const detail = (harness.modalCalls[0]?.[1] as { detail: string }).detail;
      if (state === "closed") expect(detail).not.toContain("Attribute evidence is closed.");
      else expect(detail).toContain(`Attribute evidence is ${state}.`);
    },
  );

  test("presents an exact plain-attribute answer when an already-seeded command is invoked", async () => {
    const harness = createHarness({ responses: [explainedResponse([], {}, "plain-attribute")] });
    await runCommand(harness);
    expect(harness.modalCalls[0]?.[0]).toBe("Attribute is handled by the platform");
  });

  test.each([
    ["absent", refusedResponse("subjectAbsent")],
    ["ambiguous", refusedResponse("subjectAmbiguous", "ambiguous")],
    ["unanswered", explainedResponse([], { answer: { ...answer(), result: "invalid" } })],
  ])("refuses an %s subject instead of guessing", async (_kind, response) => {
    const harness = createHarness({ responses: [response] });
    await runCommand(harness);
    expect(harness.modalCalls).toEqual([]);
    expect(harness.informationCalls).toHaveLength(1);
  });

  test("requeries and re-proves a source action, accepting fresh plain-attribute truth", async () => {
    const initial = explainedResponse([sourceStep("file:///repo/src/my-app.ts", 8)]);
    const fresh = explainedResponse([sourceStep("file:///repo/src/my-app.ts", 21)], {
      fingerprint: "semantic-runtime:fresh",
    }, "plain-attribute");
    const harness = createHarness({ responses: [initial, fresh], selectModalButton: true });
    await runCommand(harness);
    expect(harness.getAttributeInterpretationExplanation).toHaveBeenCalledTimes(2);
    expect(harness.recorded.shownDocuments[0]?.doc.uri.toString()).toBe("file:///repo/src/my-app.ts");
    expect(harness.recorded.shownDocuments[0]?.opts).toEqual(expect.objectContaining({
      selection: expect.objectContaining({ start: expect.objectContaining({ line: 21 }) }),
    }));
  });

  test("refuses navigation when the fresh subject changes", async () => {
    const initial = explainedResponse([sourceStep()]);
    const changed = explanation([sourceStep()]);
    changed.subject.subjectKey = "attribute:replacement";
    const harness = createHarness({ responses: [initial, explainedResponse([], {
      result: { status: "explained", explanation: changed, contenders: [] },
    })], selectModalButton: true });
    await runCommand(harness);
    expect(harness.recorded.shownDocuments).toEqual([]);
    expect(harness.informationCalls.at(-1)?.[0]).toMatch(/attribute changed/u);
  });

  test("refuses navigation when the selected step is not uniquely re-proved", async () => {
    const initial = explainedResponse([sourceStep()]);
    const freshStep = sourceStep("file:///repo/src/my-app.ts", 8, "Open a different declaration");
    const harness = createHarness({
      responses: [initial, explainedResponse([freshStep])],
      selectModalButton: true,
    });
    await runCommand(harness);
    expect(harness.recorded.shownDocuments).toEqual([]);
    expect(harness.informationCalls.at(-1)?.[0]).toMatch(/attribute changed/u);
  });

  test("bounds source actions and omits duplicate, query-only, and unavailable steps", async () => {
    const steps = [
      sourceStep("file:///repo/src/a.ts", 1, "Open A"),
      sourceStep("file:///repo/src/b.ts", 2, "Open B"),
      sourceStep("file:///repo/src/c.ts", 3, "Open C"),
      sourceStep("file:///repo/src/d.ts", 4, "Open D"),
      sourceStep("file:///repo/src/a-copy.ts", 5, "Open A"),
      { ...sourceStep(), label: "Inspect query", source: { state: "absent" }, kind: "inspect-query" },
      { ...sourceStep(), label: "Unavailable", source: { state: "unavailable", reason: "source-range-unavailable" } },
    ];
    const harness = createHarness({ responses: [explainedResponse(steps)] });
    await runCommand(harness);
    expect(harness.modalCalls[0]?.slice(2)).toEqual([
      expect.objectContaining({ title: "Open B" }),
      expect.objectContaining({ title: "Open C" }),
      expect.objectContaining({ title: "Open D" }),
    ]);
  });
});
