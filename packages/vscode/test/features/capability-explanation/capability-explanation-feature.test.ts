import { describe, expect, test, vi } from "vitest";
import { CapabilityExplanationFeature } from "../../../out/features/capability-explanation/capability-explanation-feature.js";
import { AureliaCommand } from "../../../out/product-contract.js";
import type { VscodeApi } from "../../../out/vscode-api.js";
import { createTestServices } from "../../helpers/test-helpers.js";
import { createVscodeApi, stubExtensionContext } from "../../helpers/vscode-stub.js";

const sourceUri = "file:///repo/src/my-app.html";
const sourceRange = {
  start: { line: 4, character: 2 },
  end: { line: 4, character: 18 },
};
const seed = {
  uri: sourceUri,
  position: sourceRange.start,
  range: sourceRange,
  documentVersion: 7,
  projectKey: "shop-app",
  frameworkCapability: "i18n.translation-syntax",
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
    summary: "current framework capability explanation",
    page: null,
    analysisBasis: { authority: "semantic-runtime", fingerprint: "basis:one" },
    continuations: [],
  };
}

function explanation(nextSteps: readonly unknown[] = []) {
  return {
    subject: {
      projectKey: seed.projectKey,
      authoredName: "t",
      siteKind: "template-attribute",
      demandKind: "i18n-translation-syntax",
      requiredCapability: seed.frameworkCapability,
      source: available(sourceUri),
      templateSource: available(sourceUri),
    },
    conclusion: {
      kind: "not-admitted",
      title: "Translation syntax is not registered",
      explanation: "The template uses translation syntax, but the current app registration does not admit it.",
      action: "Register the i18n configuration in this app.",
    },
    evidence: {
      admission: { state: "not-admitted", requiredRegistrationKinds: ["configuration"], sources: [] },
      configuration: { state: "not-indicated", sources: [] },
      package: {
        availabilityState: "evidence-found",
        candidateModuleNames: ["@aurelia/i18n"],
        recommendedModuleName: "@aurelia/i18n",
        evidence: [],
      },
      blockers: [],
    },
    uncertainty: {
      state: "open",
      reasons: ["provider-chain-unproven"],
      explanation: "The provider chain cannot be proven from the current static evidence.",
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
  const reasons: Record<string, string> = {
    subjectAbsent: "the current source no longer contains that framework capability demand",
    subjectAmbiguous: "the current source contains multiple matching framework capability demands",
  };
  return {
    fingerprint: "semantic-runtime:two",
    documentVersion: seed.documentVersion,
    answer: answer(selection, coverage),
    result: {
      status: "refused",
      refusal: { kind, reason: reasons[kind] },
      contenders: [],
    },
  };
}

function sourceStep(uri = "file:///repo/src/main.ts", line = 8) {
  return {
    kind: "inspect-source",
    label: "Open app registration",
    source: available(uri, {
      start: { line, character: 0 },
      end: { line, character: 20 },
    }, "src/main.ts"),
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
    openDocuments: [{ uri: sourceUri, languageId: "html", text: "<template><div t></div></template>" }],
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
  const getFrameworkCapabilityExplanation = vi.fn(async () => responses.shift() ?? null);
  const vscode = stubVscode as unknown as VscodeApi;
  const { errors, logger } = createTestServices(vscode);
  CapabilityExplanationFeature.activate({
    extension: stubExtensionContext(stubVscode),
    vscode,
    errors,
    logger,
    lsp: { getFrameworkCapabilityExplanation },
  } as never, (contribution) => contribution);
  return {
    stubVscode,
    recorded,
    targetDocument,
    targetEditor,
    otherEditor,
    getFrameworkCapabilityExplanation,
    modalCalls,
    informationCalls,
  };
}

async function runCommand(harness: ReturnType<typeof createHarness>, value: unknown = seed) {
  return harness.recorded.commandHandlers.get(AureliaCommand.ExplainFrameworkCapability)?.(value);
}

describe("CapabilityExplanationFeature", () => {
  test("registers only the hidden command contribution and sends the exact diagnostic seed", async () => {
    const harness = createHarness({ activeEditor: "other" });

    await runCommand(harness);

    expect(harness.recorded.registeredCommands).toContain(AureliaCommand.ExplainFrameworkCapability);
    expect(harness.recorded.contentProviders).toEqual([]);
    expect(harness.getFrameworkCapabilityExplanation).toHaveBeenCalledExactlyOnceWith(seed);
    expect(harness.modalCalls).toHaveLength(1);
    expect(harness.stubVscode.window.activeTextEditor).toBe(harness.otherEditor);
    expect(harness.modalCalls[0]).toEqual([
      "Translation syntax is not registered",
      {
        modal: true,
        detail: [
          "The template uses translation syntax, but the current app registration does not admit it.",
          "The provider chain cannot be proven from the current static evidence.",
          "Register the i18n configuration in this app.",
        ].join("\n\n"),
      },
    ]);
  });

  test("does not retarget the diagnostic when editor focus or the live cursor changes", async () => {
    let resolveResponse!: (value: unknown) => void;
    const response = new Promise((resolve) => { resolveResponse = resolve; });
    const harness = createHarness({ responses: [] as unknown[] , activeEditor: "target" });
    harness.getFrameworkCapabilityExplanation.mockImplementationOnce(async () => response);

    const pending = runCommand(harness);
    harness.targetEditor.selection.active = { line: 99, character: 12 };
    harness.stubVscode.window.activeTextEditor = harness.otherEditor;
    resolveResponse(explainedResponse());
    await pending;

    expect(harness.getFrameworkCapabilityExplanation).toHaveBeenCalledWith(seed);
    expect(harness.modalCalls).toHaveLength(1);
    expect(harness.stubVscode.window.activeTextEditor).toBe(harness.otherEditor);
  });

  test("rejects a document-version change while the semantic answer is in flight", async () => {
    let resolveResponse!: (value: unknown) => void;
    const response = new Promise((resolve) => { resolveResponse = resolve; });
    const harness = createHarness({ responses: [] as unknown[] });
    harness.getFrameworkCapabilityExplanation.mockImplementationOnce(async () => response);

    const pending = runCommand(harness);
    harness.targetDocument.version += 1;
    resolveResponse(explainedResponse());
    await pending;

    expect(harness.modalCalls).toEqual([]);
    expect(harness.informationCalls.at(-1)?.[0]).toMatch(/diagnostic changed/u);
  });

  test.each([
    ["absent", refusedResponse("subjectAbsent")],
    ["ambiguous", refusedResponse("subjectAmbiguous", "ambiguous")],
    ["invalid", explainedResponse([], { answer: { ...answer(), result: "invalid" } })],
  ])("refuses a %s answer instead of guessing", async (_kind, response) => {
    const harness = createHarness({ responses: [response] });

    await runCommand(harness);

    expect(harness.modalCalls).toEqual([]);
    expect(harness.informationCalls).toHaveLength(1);
  });

  test.each(["open", "truncated"])(
    "presents an exact %s explanation and conserves its uncertainty",
    async (coverage) => {
      const uncertain = explanation();
      uncertain.conclusion.kind = "admission-unknown";
      uncertain.uncertainty.state = coverage;
      uncertain.uncertainty.explanation = `Static admission evidence is ${coverage}.`;
      const harness = createHarness({ responses: [explainedResponse([], {
        answer: answer("exact", coverage),
        result: { status: "explained", explanation: uncertain, contenders: [] },
      })] });

      await runCommand(harness);

      expect(harness.modalCalls).toHaveLength(1);
      expect((harness.modalCalls[0]?.[1] as { detail: string }).detail)
        .toContain(`Static admission evidence is ${coverage}.`);
    },
  );

  test("requeries a source-backed action and opens only its fresh exact location", async () => {
    const initial = explainedResponse([sourceStep("file:///repo/src/main.ts", 8)]);
    const fresh = explainedResponse([sourceStep("file:///repo/src/main.ts", 21)], {
      fingerprint: "semantic-runtime:fresh",
    });
    const harness = createHarness({ responses: [initial, fresh], selectModalButton: true });

    await runCommand(harness);

    expect(harness.getFrameworkCapabilityExplanation).toHaveBeenCalledTimes(2);
    expect(harness.modalCalls[0]?.[2]).toEqual(expect.objectContaining({ title: "Open app registration" }));
    expect(harness.recorded.shownDocuments).toHaveLength(1);
    expect(harness.recorded.shownDocuments[0]?.doc.uri.toString()).toBe("file:///repo/src/main.ts");
    expect(harness.recorded.shownDocuments[0]?.opts).toEqual(expect.objectContaining({
      selection: expect.objectContaining({ start: expect.objectContaining({ line: 21 }) }),
    }));
  });

  test("omits query-only and unmapped next steps from the native modal", async () => {
    const harness = createHarness({ responses: [explainedResponse([
      { ...sourceStep(), label: "Inspect engine query", source: { state: "absent" }, kind: "inspect-query" },
      { ...sourceStep(), label: "Unavailable source", source: { state: "unavailable", reason: "source-range-unavailable" } },
    ])] });

    await runCommand(harness);

    expect(harness.modalCalls).toHaveLength(1);
    expect(harness.modalCalls[0]).toHaveLength(2);
    expect(harness.recorded.shownDocuments).toEqual([]);
  });

  test("refuses a selected action when the fresh query proves a different subject", async () => {
    const initial = explainedResponse([sourceStep()]);
    const changed = explainedResponse([sourceStep()], {
      result: {
        status: "explained",
        explanation: {
          ...explanation([sourceStep()]),
          subject: { ...explanation().subject, authoredName: "different-demand" },
        },
        contenders: [],
      },
    });
    const harness = createHarness({ responses: [initial, changed], selectModalButton: true });

    await runCommand(harness);

    expect(harness.recorded.shownDocuments).toEqual([]);
    expect(harness.informationCalls.at(-1)?.[0]).toMatch(/diagnostic changed/u);
  });
});
