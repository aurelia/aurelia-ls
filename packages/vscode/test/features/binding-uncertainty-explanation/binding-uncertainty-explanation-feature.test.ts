import { describe, expect, test, vi } from "vitest";
import { BindingUncertaintyExplanationFeature } from "../../../out/features/binding-uncertainty-explanation/binding-uncertainty-explanation-feature.js";
import { AureliaCommand } from "../../../out/product-contract.js";
import type { VscodeApi } from "../../../out/vscode-api.js";
import { createTestServices } from "../../helpers/test-helpers.js";
import { createVscodeApi, stubExtensionContext } from "../../helpers/vscode-stub.js";

const sourceUri = "file:///repo/src/my-app.html";
const sourceRange = {
  start: { line: 4, character: 2 },
  end: { line: 4, character: 42 },
};
const seed = {
  uri: sourceUri,
  position: { line: 4, character: 29 },
  range: sourceRange,
  documentVersion: 7,
  projectKey: "shop-app",
};

function available(uri: string, range = sourceRange, label = "src/my-app.html@4:2") {
  return { state: "available" as const, location: { uri, range, label } };
}

function answer(selection = "exact", coverage = "complete") {
  return {
    schemaVersion: "0.2",
    result: "answered",
    selection,
    coverage,
    summary: "current binding uncertainty explanation",
    page: null,
    analysisBasis: { authority: "semantic-runtime", fingerprint: "basis:one" },
    continuations: [],
  };
}

function explanation(nextSteps: readonly unknown[] = []) {
  return {
    subject: {
      subjectKey: "binding:my-app:value:selection",
      projectKey: seed.projectKey,
      definitionName: "my-app",
      compilationLane: "app-runtime",
      bindingKind: "property",
      source: available(sourceUri),
      expressionSource: available(sourceUri, {
        start: { line: 4, character: 24 },
        end: { line: 4, character: 40 },
      }),
      templateSource: available(sourceUri, {
        start: { line: 0, character: 0 },
        end: { line: 8, character: 0 },
      }),
      targetProperties: ["value"],
    },
    conclusion: {
      kind: "flow-partially-proved",
      title: "Binding writeback is only partially known",
      explanation: "Aurelia can prove the source read, but the runtime writeback has two possible branches.",
      action: "Review the nullable source declaration or keep the runtime branch intentional.",
    },
    evidence: {
      lanes: [],
      blockers: [],
    },
    uncertainty: {
      state: "open",
      reasons: ["target-to-source-assignability-open"],
      explanation: "The current source type permits a runtime no-op branch.",
    },
    currentness: {
      authority: "answer-analysis-basis",
      explanation: "This explanation reflects the current analyzed source generation.",
    },
    nextSteps,
  };
}

function explainedResponse(nextSteps: readonly unknown[] = [], overrides: Record<string, unknown> = {}) {
  return {
    fingerprint: "semantic-runtime:one",
    documentVersion: seed.documentVersion,
    answer: answer(),
    result: { status: "explained", explanation: explanation(nextSteps), contenders: [] },
    ...overrides,
  };
}

function refusedResponse(kind: string, selection = "absent", coverage = "complete") {
  return {
    fingerprint: "semantic-runtime:two",
    documentVersion: seed.documentVersion,
    answer: answer(selection, coverage),
    result: {
      status: "refused",
      refusal: { kind, reason: "the binding subject could not be selected safely" },
      contenders: [],
    },
  };
}

function sourceStep(uri = "file:///repo/src/my-app.ts", line = 8, label = "Open source declaration") {
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
    openDocuments: [{ uri: sourceUri, languageId: "html", text: "<select value.bind=\"selectedNullable\"></select>" }],
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
  const getBindingUncertaintyExplanation = vi.fn(async () => responses.shift() ?? null);
  const vscode = stubVscode as unknown as VscodeApi;
  const { errors, logger } = createTestServices(vscode);
  BindingUncertaintyExplanationFeature.activate({
    extension: stubExtensionContext(stubVscode),
    vscode,
    errors,
    logger,
    lsp: { getBindingUncertaintyExplanation },
  } as never, (contribution) => contribution);
  return {
    stubVscode,
    recorded,
    targetDocument,
    targetEditor,
    otherEditor,
    getBindingUncertaintyExplanation,
    modalCalls,
    informationCalls,
  };
}

async function runCommand(harness: ReturnType<typeof createHarness>, value: unknown = seed) {
  return harness.recorded.commandHandlers.get(AureliaCommand.ExplainBindingUncertainty)?.(value);
}

describe("BindingUncertaintyExplanationFeature", () => {
  test("registers only the hidden command and presents the exact saved binding locus", async () => {
    const harness = createHarness({ activeEditor: "other" });

    await runCommand(harness);

    expect(harness.recorded.registeredCommands).toContain(AureliaCommand.ExplainBindingUncertainty);
    expect(harness.recorded.contentProviders).toEqual([]);
    expect(harness.getBindingUncertaintyExplanation).toHaveBeenCalledExactlyOnceWith(seed);
    expect(harness.modalCalls).toEqual([[
      "Binding writeback is only partially known",
      {
        modal: true,
        detail: [
          "Aurelia can prove the source read, but the runtime writeback has two possible branches.",
          "The current source type permits a runtime no-op branch.",
          "Review the nullable source declaration or keep the runtime branch intentional.",
        ].join("\n\n"),
      },
    ]]);
    expect(harness.stubVscode.window.activeTextEditor).toBe(harness.otherEditor);
  });

  test("rejects malformed seeds and cursor positions outside the frozen carrier range", async () => {
    const harness = createHarness();

    await runCommand(harness, { ...seed, position: { line: 5, character: 0 } });

    expect(harness.getBindingUncertaintyExplanation).not.toHaveBeenCalled();
    expect(harness.modalCalls).toEqual([]);
    expect(harness.informationCalls.at(-1)?.[0]).toMatch(/no longer valid/u);
  });

  test("does not retarget to a changed active editor or live cursor", async () => {
    let resolveResponse!: (value: unknown) => void;
    const response = new Promise((resolve) => { resolveResponse = resolve; });
    const harness = createHarness({ responses: [], activeEditor: "target" });
    harness.getBindingUncertaintyExplanation.mockImplementationOnce(async () => response);

    const pending = runCommand(harness);
    harness.targetEditor.selection.active = { line: 99, character: 12 };
    harness.stubVscode.window.activeTextEditor = harness.otherEditor;
    resolveResponse(explainedResponse());
    await pending;

    expect(harness.getBindingUncertaintyExplanation).toHaveBeenCalledWith(seed);
    expect(harness.modalCalls).toHaveLength(1);
    expect(harness.stubVscode.window.activeTextEditor).toBe(harness.otherEditor);
  });

  test("rejects a document-version change while the current answer is in flight", async () => {
    let resolveResponse!: (value: unknown) => void;
    const response = new Promise((resolve) => { resolveResponse = resolve; });
    const harness = createHarness({ responses: [] });
    harness.getBindingUncertaintyExplanation.mockImplementationOnce(async () => response);

    const pending = runCommand(harness);
    harness.targetDocument.version += 1;
    resolveResponse(explainedResponse());
    await pending;

    expect(harness.modalCalls).toEqual([]);
    expect(harness.informationCalls.at(-1)?.[0]).toMatch(/binding changed/u);
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

  test.each(["closed", "open", "truncated"])(
    "accepts an exact %s explanation and shows only material uncertainty text",
    async (state) => {
      const current = explanation();
      current.uncertainty.state = state;
      current.uncertainty.explanation = `Binding evidence is ${state}.`;
      if (state === "closed") current.conclusion.kind = "flow-proved";
      const harness = createHarness({ responses: [explainedResponse([], {
        answer: answer("exact", state === "closed" ? "complete" : state),
        result: { status: "explained", explanation: current, contenders: [] },
      })] });

      await runCommand(harness);

      expect(harness.modalCalls).toHaveLength(1);
      const detail = (harness.modalCalls[0]?.[1] as { detail: string }).detail;
      if (state === "closed") {
        expect(detail).not.toContain("Binding evidence is closed.");
      } else {
        expect(detail).toContain(`Binding evidence is ${state}.`);
      }
    },
  );

  test.each([
    ["project", { subject: { ...explanation().subject, projectKey: "other-app" } }],
    ["URI", { subject: { ...explanation().subject, source: available("file:///repo/src/other.html") } }],
    ["range", { subject: { ...explanation().subject, source: available(sourceUri, { start: sourceRange.start, end: { line: 4, character: 41 } }) } }],
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

  test("requeries a selected source action and opens only its fresh exact location", async () => {
    const initial = explainedResponse([sourceStep("file:///repo/src/my-app.ts", 8)]);
    const fresh = explainedResponse([sourceStep("file:///repo/src/my-app.ts", 21)], {
      fingerprint: "semantic-runtime:fresh",
    });
    const harness = createHarness({ responses: [initial, fresh], selectModalButton: true });

    await runCommand(harness);

    expect(harness.getBindingUncertaintyExplanation).toHaveBeenCalledTimes(2);
    expect(harness.recorded.shownDocuments).toHaveLength(1);
    expect(harness.recorded.shownDocuments[0]?.doc.uri.toString()).toBe("file:///repo/src/my-app.ts");
    expect(harness.recorded.shownDocuments[0]?.opts).toEqual(expect.objectContaining({
      selection: expect.objectContaining({ start: expect.objectContaining({ line: 21 }) }),
    }));
  });

  test("refuses source navigation when the fresh subject key changes", async () => {
    const initial = explainedResponse([sourceStep()]);
    const changed = explainedResponse([sourceStep()], {
      result: {
        status: "explained",
        explanation: {
          ...explanation([sourceStep()]),
          subject: { ...explanation().subject, subjectKey: "binding:replacement" },
        },
        contenders: [],
      },
    });
    const harness = createHarness({ responses: [initial, changed], selectModalButton: true });

    await runCommand(harness);

    expect(harness.recorded.shownDocuments).toEqual([]);
    expect(harness.informationCalls.at(-1)?.[0]).toMatch(/binding changed/u);
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

    expect(harness.modalCalls).toHaveLength(1);
    expect(harness.modalCalls[0]?.slice(2)).toEqual([
      expect.objectContaining({ title: "Open B" }),
      expect.objectContaining({ title: "Open C" }),
      expect.objectContaining({ title: "Open D" }),
    ]);
  });
});
