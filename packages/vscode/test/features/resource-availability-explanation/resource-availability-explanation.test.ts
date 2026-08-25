import { describe, expect, test, vi } from "vitest";
import { ErrorReporter } from "../../../out/core/errors.js";
import { explainResourceAvailability } from "../../../out/features/resource-availability-explanation/resource-availability-explanation.js";
import type { ClientLogger } from "../../../out/log.js";
import type { VscodeApi } from "../../../out/vscode-api.js";
import { createVscodeApi } from "../../helpers/vscode-stub.js";

const workspaceKey = "file:///repo";
const sourceUri = "file:///repo/src/my-app.html";
const templateRange = {
  start: { line: 0, character: 0 },
  end: { line: 20, character: 0 },
};
const subject = {
  workspaceKey,
  projectKey: "shop-app",
  resourceIdentityKey: "resource:product-card",
};

function available(uri: string, range = templateRange, label = "src/my-app.html") {
  return { state: "available" as const, location: { uri, range, label } };
}

function resource() {
  const absent = { state: "absent" as const };
  return {
    identityKey: subject.resourceIdentityKey,
    projectKey: subject.projectKey,
    kind: "custom-element",
    name: "product-card",
    registrationKey: "au:resource:custom-element:product-card",
    aliases: [],
    bindables: [],
    declarationModes: ["decorator"],
    metadataState: "full-definition",
    origin: {
      kind: "project",
      projectKey: subject.projectKey,
      packageName: null,
      moduleKey: "src/product-card.ts",
      catalogGroup: null,
    },
    locality: { kind: "project", ownerIdentityKey: null, ownerName: null, ownerSource: absent },
    sources: { publicName: absent, declaration: absent, implementation: absent },
    navigation: { state: "unavailable", reason: "no-authored-source" },
  };
}

function template(scopeIdentityKey = "scope:one", definitionName = "MyApp") {
  return {
    templateIdentityKey: `template:${scopeIdentityKey}`,
    scopeIdentityKey,
    definitionName,
    compilationLane: "app-runtime",
    source: available(sourceUri),
  };
}

function answer(selection = "exact", coverage = "complete") {
  return {
    schemaVersion: "0.2",
    result: "answered",
    selection,
    coverage,
    summary: "current resource availability explanation",
    page: null,
    analysisBasis: { authority: "semantic-runtime", fingerprint: "basis:one" },
    continuations: [],
  };
}

function explanation(
  scopeIdentityKey = "scope:one",
  nextSteps: readonly unknown[] = [],
  subjectKey = `availability:${subject.resourceIdentityKey}:${scopeIdentityKey}`,
) {
  const item = resource();
  return {
    subject: {
      subjectKey,
      projectKey: subject.projectKey,
      resourceIdentityKey: subject.resourceIdentityKey,
      resourceKind: "custom-element",
      name: "product-card",
      lookupKind: "canonical",
      registrationKey: "au:resource:custom-element:product-card",
      resource: item,
      template: template(scopeIdentityKey),
    },
    conclusion: {
      kind: "available",
      title: "Product card is available",
      explanation: "The selected template scope admits product-card.",
      action: "Use product-card in this template.",
    },
    evidence: {
      effectiveResource: item,
      availabilitySource: { state: "absent" },
      exclusion: null,
      configuration: { state: "not-applicable", requiredCapability: null, sources: [] },
      blockers: [],
    },
    uncertainty: { state: "closed", reasons: [], explanation: "The static evidence is complete." },
    currentness: {
      authority: "answer-analysis-basis",
      explanation: "This explanation reflects the current analyzed source generation.",
    },
    nextSteps,
  };
}

function explainedResponse(
  scopeIdentityKey = "scope:one",
  nextSteps: readonly unknown[] = [],
  overrides: Record<string, unknown> = {},
) {
  return {
    fingerprint: "semantic-runtime:one",
    documentVersion: 7,
    answer: answer(),
    result: {
      status: "explained",
      explanation: explanation(scopeIdentityKey, nextSteps),
      contenders: [],
    },
    workspace: { key: workspaceKey, name: "repo", uri: workspaceKey },
    ...overrides,
  };
}

function contender(scopeIdentityKey: string, definitionName: string) {
  return {
    conclusionKind: "available",
    subject: {
      ...explanation(scopeIdentityKey).subject,
      template: template(scopeIdentityKey, definitionName),
    },
  };
}

function ambiguousResponse() {
  const contenders = [contender("scope:one", "MyApp"), contender("scope:two", "MyApp")];
  return {
    fingerprint: "semantic-runtime:one",
    documentVersion: 7,
    answer: answer("ambiguous"),
    result: {
      status: "refused",
      refusal: {
        kind: "subjectAmbiguous",
        reason: "the current template belongs to more than one resource scope",
      },
      contenders,
    },
    workspace: { key: workspaceKey, name: "repo", uri: workspaceKey },
  };
}

function sourceStep(line = 5) {
  return {
    kind: "inspect-source",
    label: "Open registration",
    source: available("file:///repo/src/main.ts", {
      start: { line, character: 0 },
      end: { line, character: 18 },
    }, "src/main.ts"),
    relatedQueryKind: null,
    targetQuery: null,
  };
}

function createHarness(options: {
  readonly responses?: readonly unknown[];
  readonly selectScope?: number;
  readonly selectModalButton?: boolean;
  readonly target?: unknown;
  readonly editorWorkspaceKey?: string;
} = {}) {
  const { vscode: stubVscode, recorded } = createVscodeApi({
    openDocuments: [{ uri: sourceUri, languageId: "html", text: "<template><product-card></product-card></template>" }],
  });
  const document = stubVscode.workspace.textDocuments[0] as unknown as {
    uri: ReturnType<typeof stubVscode.Uri.parse>;
    languageId: string;
    version: number;
    isClosed: boolean;
  };
  document.version = 7;
  document.isClosed = false;
  const editor = {
    document,
    selection: { active: { line: 4, character: 3 } },
  };
  stubVscode.window.activeTextEditor = editor;
  const modalCalls: unknown[][] = [];
  const informationCalls: unknown[][] = [];
  const showQuickPick = vi.fn(async (items: readonly unknown[]) =>
    options.selectScope == null ? undefined : items[options.selectScope]
  );
  Object.assign(stubVscode.window, {
    showQuickPick,
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
  const getResourceAvailabilityExplanation = vi.fn(async () => responses.shift() ?? null);
  const logger = { error: vi.fn(), show: vi.fn() } as unknown as ClientLogger;
  const vscode = stubVscode as unknown as VscodeApi;
  const ctx = {
    vscode,
    logger,
    errors: new ErrorReporter(logger, vscode),
    languageClient: {
      sessionForUri: vi.fn(() => ({
        workspace: { key: options.editorWorkspaceKey ?? workspaceKey, name: "repo", uri: workspaceKey },
      })),
    },
    lsp: { getResourceAvailabilityExplanation },
  } as never;
  const liveTarget = options.target ?? { id: "live-row" };
  const provider = {
    availabilityExplanationFor: vi.fn((value: unknown) => value === liveTarget ? subject : null),
  };
  return {
    ctx,
    document,
    editor,
    getResourceAvailabilityExplanation,
    informationCalls,
    liveTarget,
    modalCalls,
    provider,
    recorded,
    showQuickPick,
    stubVscode,
  };
}

describe("resource availability explanation", () => {
  test("freezes the active template and presents complete, open, and truncated engine answers", async () => {
    for (const coverage of ["complete", "open", "truncated"]) {
      const response = explainedResponse("scope:one", [], {
        answer: answer("exact", coverage),
        result: {
          status: "explained",
          explanation: {
            ...explanation(),
            uncertainty: {
              state: coverage === "complete" ? "closed" : coverage,
              reasons: coverage === "complete" ? [] : ["open-registration"],
              explanation: `Static admission evidence is ${coverage}.`,
            },
          },
          contenders: [],
        },
      });
      const harness = createHarness({ responses: [response] });
      await explainResourceAvailability(harness.ctx, harness.provider, harness.liveTarget);

      expect(harness.getResourceAvailabilityExplanation).toHaveBeenCalledWith(workspaceKey, {
        uri: sourceUri,
        position: { line: 4, character: 3 },
        documentVersion: 7,
        projectKey: subject.projectKey,
        resourceIdentityKey: subject.resourceIdentityKey,
      });
      expect(harness.modalCalls).toHaveLength(1);
      if (coverage !== "complete") {
        expect((harness.modalCalls[0]?.[1] as { detail: string }).detail).toContain(coverage);
      }
    }
  });

  test("presents the engine's exact shadowing winner without reconstructing exclusion evidence", async () => {
    const exactWinner = "alias-before-primary";
    const shadowed = {
      ...explanation(),
      conclusion: {
        kind: "shadowed",
        title: "Product card is shadowed",
        explanation: `The canonical lookup is owned by ${exactWinner} in this template scope.`,
        action: "Inspect the winning registration before changing registration order.",
      },
    };
    const harness = createHarness({ responses: [explainedResponse("scope:one", [], {
      result: { status: "explained", explanation: shadowed, contenders: [] },
    })] });

    await explainResourceAvailability(harness.ctx, harness.provider, harness.liveTarget);

    expect(harness.modalCalls).toHaveLength(1);
    expect(harness.modalCalls[0]?.[0]).toBe("Product card is shadowed");
    expect((harness.modalCalls[0]?.[1] as { readonly detail: string }).detail).toContain(exactWinner);
  });

  test("uses engine contenders for one native scope choice and resubmits the exact scope identity", async () => {
    const harness = createHarness({
      responses: [ambiguousResponse(), explainedResponse("scope:two")],
      selectScope: 1,
    });

    await explainResourceAvailability(harness.ctx, harness.provider, harness.liveTarget);

    expect(harness.showQuickPick).toHaveBeenCalledWith(
      [
        expect.objectContaining({ label: "MyApp", scopeIdentityKey: "scope:one" }),
        expect.objectContaining({ label: "MyApp", scopeIdentityKey: "scope:two" }),
      ],
      expect.objectContaining({ title: "Choose the Active Aurelia Template Scope" }),
    );
    const pickerRows = harness.showQuickPick.mock.calls[0]?.[0] as readonly {
      readonly description: string;
      readonly detail: string;
    }[];
    expect(new Set(pickerRows.map((row) => row.description)).size).toBe(2);
    expect(pickerRows.map((row) => row.description)).toEqual([
      expect.stringContaining("entry 1 of 2"),
      expect.stringContaining("entry 2 of 2"),
    ]);
    expect(pickerRows.every((row) => row.detail.includes("shop-app"))).toBe(true);
    const visibleCopy = pickerRows.map((row) => [row.description, row.detail]);
    expect(JSON.stringify(visibleCopy)).not.toContain("scope:one");
    expect(JSON.stringify(visibleCopy)).not.toContain("scope:two");
    expect(harness.getResourceAvailabilityExplanation).toHaveBeenNthCalledWith(2, workspaceKey, {
      uri: sourceUri,
      position: { line: 4, character: 3 },
      documentVersion: 7,
      projectKey: subject.projectKey,
      resourceIdentityKey: subject.resourceIdentityKey,
      templateResourceScopeIdentityKey: "scope:two",
    });
    expect(harness.modalCalls).toHaveLength(1);
  });

  test("does not retarget when the live cursor or editor focus moves after invocation", async () => {
    let resolveResponse!: (value: unknown) => void;
    const response = new Promise((resolve) => { resolveResponse = resolve; });
    const harness = createHarness({ responses: [] });
    harness.getResourceAvailabilityExplanation.mockImplementationOnce(async () => response);

    const pending = explainResourceAvailability(harness.ctx, harness.provider, harness.liveTarget);
    harness.editor.selection.active = { line: 18, character: 12 };
    harness.stubVscode.window.activeTextEditor = {
      document: { uri: harness.stubVscode.Uri.parse("file:///repo/notes.txt"), version: 1 },
      selection: { active: { line: 0, character: 0 } },
    };
    resolveResponse(explainedResponse());
    await expect(pending).resolves.toBe(true);

    expect(harness.getResourceAvailabilityExplanation).toHaveBeenCalledWith(
      workspaceKey,
      expect.objectContaining({ position: { line: 4, character: 3 }, documentVersion: 7 }),
    );
    expect(harness.modalCalls).toHaveLength(1);
  });

  test("refuses forged rows, cross-workspace templates, changed documents, and mismatched subjects", async () => {
    const forged = createHarness();
    await expect(explainResourceAvailability(forged.ctx, forged.provider, { id: "forged" })).resolves.toBe(false);
    expect(forged.getResourceAvailabilityExplanation).not.toHaveBeenCalled();

    const crossWorkspace = createHarness({ editorWorkspaceKey: "file:///other" });
    await expect(explainResourceAvailability(
      crossWorkspace.ctx,
      crossWorkspace.provider,
      crossWorkspace.liveTarget,
    )).resolves.toBe(false);
    expect(crossWorkspace.getResourceAvailabilityExplanation).not.toHaveBeenCalled();

    let resolveResponse!: (value: unknown) => void;
    const pendingResponse = new Promise((resolve) => { resolveResponse = resolve; });
    const changed = createHarness({ responses: [] });
    changed.getResourceAvailabilityExplanation.mockImplementationOnce(async () => pendingResponse);
    const pending = explainResourceAvailability(changed.ctx, changed.provider, changed.liveTarget);
    changed.editor.selection.active = { line: 19, character: 9 };
    changed.document.version += 1;
    resolveResponse(explainedResponse());
    await expect(pending).resolves.toBe(false);
    expect(changed.modalCalls).toEqual([]);
    expect(changed.getResourceAvailabilityExplanation).toHaveBeenCalledWith(
      workspaceKey,
      expect.objectContaining({ position: { line: 4, character: 3 }, documentVersion: 7 }),
    );

    const mismatched = createHarness({ responses: [explainedResponse("scope:one", [], {
      result: {
        status: "explained",
        explanation: {
          ...explanation(),
          subject: { ...explanation().subject, resourceIdentityKey: "resource:other" },
        },
        contenders: [],
      },
    })] });
    await expect(explainResourceAvailability(
      mismatched.ctx,
      mismatched.provider,
      mismatched.liveTarget,
    )).resolves.toBe(false);
    expect(mismatched.modalCalls).toEqual([]);
  });

  test("requeries a source action and requires the same subject plus one unique fresh step", async () => {
    const initial = explainedResponse("scope:one", [sourceStep(5)]);
    const fresh = explainedResponse("scope:one", [sourceStep(12)]);
    const harness = createHarness({ responses: [initial, fresh], selectModalButton: true });

    await expect(explainResourceAvailability(
      harness.ctx,
      harness.provider,
      harness.liveTarget,
    )).resolves.toBe(true);

    expect(harness.getResourceAvailabilityExplanation).toHaveBeenCalledTimes(2);
    expect(harness.recorded.shownDocuments[0]?.doc.uri.toString()).toBe("file:///repo/src/main.ts");
    expect(harness.recorded.shownDocuments[0]?.opts).toEqual(expect.objectContaining({
      selection: expect.objectContaining({ start: expect.objectContaining({ line: 12 }) }),
    }));

    const changedSubject = createHarness({
      responses: [initial, explainedResponse("scope:one", [sourceStep(12)], {
        result: {
          status: "explained",
          explanation: explanation("scope:one", [sourceStep(12)], "availability:different"),
          contenders: [],
        },
      })],
      selectModalButton: true,
    });
    await expect(explainResourceAvailability(
      changedSubject.ctx,
      changedSubject.provider,
      changedSubject.liveTarget,
    )).resolves.toBe(false);
    expect(changedSubject.recorded.shownDocuments).toEqual([]);

    const duplicateStep = createHarness({
      responses: [initial, explainedResponse("scope:one", [sourceStep(12), sourceStep(15)])],
      selectModalButton: true,
    });
    await expect(explainResourceAvailability(
      duplicateStep.ctx,
      duplicateStep.provider,
      duplicateStep.liveTarget,
    )).resolves.toBe(false);
    expect(duplicateStep.recorded.shownDocuments).toEqual([]);
  });
});
