import path from "node:path";
import { describe, expect, test, vi } from "vitest";
import { TextDocument } from "vscode-languageserver-textdocument";
import { handleBindingUncertaintyExplanation } from "../../src/handlers/custom.js";
import { mapBindingUncertaintyExplanationSourceTarget } from "../../src/mapping/binding-uncertainty-explanation.js";
import type { BindingUncertaintyExplanationParams } from "../../src/protocol.js";
import { createTestOperation, testAnalysisGeneration } from "./test-request-guard.js";
import { testWorkspaceDocumentUris } from "./test-document-uris.js";

const workspaceRoot = path.resolve("binding-uncertainty-explanation-workspace");
const documentUris = testWorkspaceDocumentUris(workspaceRoot);
const templateUri = documentUris.uriForWorkspaceRelativePath("src/my-app.html")!;
const templateText = '<template><input value.two-way="person.name"></template>';
const bindingStart = templateText.indexOf("value.two-way");
const bindingEnd = bindingStart + 'value.two-way="person.name"'.length;
const expressionStart = templateText.indexOf("person.name");
const expressionEnd = expressionStart + "person.name".length;
const document = TextDocument.create(templateUri, "html", 7, templateText);
const bindingRange = {
  start: document.positionAt(bindingStart),
  end: document.positionAt(bindingEnd),
};
const invokedPosition = document.positionAt(expressionStart + 2);

describe("binding uncertainty explanation protocol boundary", () => {
  test("isolates a source URI projection failure", () => {
    const mapped = mapBindingUncertaintyExplanationSourceTarget(
      source("src/broken.ts", 0, 1),
      {
        documentUris: {
          uriForWorkspaceRelativePath: () => {
            throw new Error("broken URI projection");
          },
        } as never,
        lookupText: expect.unreachable,
      },
    );

    expect(mapped).toEqual({ state: "unavailable", reason: "source-uri-unavailable" });
  });

  test("re-proves a contained cursor and maps exact engine evidence without leaking handles", async () => {
    const query = vi.fn(async () => explanationAnswer());
    const response = await handleBindingUncertaintyExplanation(
      context() as never,
      params(),
      operation(query),
    );

    expect(query).toHaveBeenCalledWith("app", templateUri, invokedPosition);
    expect(response).toMatchObject({
      fingerprint: testAnalysisGeneration.fingerprint,
      documentVersion: 7,
      answer: { result: "answered", selection: "exact" },
      result: {
        status: "explained",
        explanation: {
          subject: {
            subjectKey: "binding:my-app:value",
            projectKey: "app",
            source: {
              state: "available",
              location: { uri: templateUri, range: bindingRange },
            },
          },
          evidence: {
            lanes: [{
              source: { state: "available" },
              expressionSource: { state: "available" },
              sourceAssignmentOccurrenceSource: { state: "absent" },
              valueConverterWritebackStages: [{
                inputTypeSource: { state: "available" },
                outputTypeSource: { state: "absent" },
              }],
            }],
            blockers: [{ sources: [{ state: "available" }] }],
          },
          nextSteps: [{ source: { state: "available" } }],
          currentness: { authority: "answer-analysis-basis" },
        },
      },
    });
    expect(response.answer?.continuations?.[0]).toMatchObject({
      targetQuery: { sourceFile: { state: "available", uri: templateUri } },
      evidence: { sourceFacts: [{ source: { state: "available" } }] },
    });
    const serialized = JSON.stringify(response);
    expect(serialized).not.toContain('"path"');
    expect(serialized).not.toContain('"handles"');
  });

  test("refuses a stale command before querying the current generation", async () => {
    const query = vi.fn();
    const response = await handleBindingUncertaintyExplanation(
      context() as never,
      { ...params(), documentVersion: 6 },
      operation(query),
    );

    expect(query).not.toHaveBeenCalled();
    expect(response).toMatchObject({
      documentVersion: 7,
      answer: null,
      result: { status: "refused", refusal: { kind: "documentVersionMismatch" } },
    });
  });

  test("rejects a command seed whose cursor is outside its claimed binding carrier", async () => {
    const query = vi.fn();
    await expect(handleBindingUncertaintyExplanation(
      context() as never,
      { ...params(), position: document.positionAt(bindingEnd + 1) },
      operation(query),
    )).rejects.toThrow("contained cursor");
    expect(query).not.toHaveBeenCalled();
  });

  test("preserves absent and ambiguous selection without choosing a contender", async () => {
    const absent = await handleBindingUncertaintyExplanation(
      context() as never,
      params(),
      operation(vi.fn(async () => explanationAnswer({
        selection: "absent",
        explanation: null,
        contenders: [],
      }))),
    );
    expect(absent).toMatchObject({
      result: { status: "refused", refusal: { kind: "subjectAbsent" }, contenders: [] },
    });

    const contender = explanation().subject;
    const ambiguous = await handleBindingUncertaintyExplanation(
      context() as never,
      params(),
      operation(vi.fn(async () => explanationAnswer({
        selection: "ambiguous",
        explanation: null,
        contenders: [
          { subject: contender, conclusionKind: "flow-blocked" },
          {
            subject: { ...contender, subjectKey: "binding:other" },
            conclusionKind: "flow-partially-proved",
          },
        ],
      }))),
    );
    expect(ambiguous).toMatchObject({
      result: {
        status: "refused",
        refusal: { kind: "subjectAmbiguous" },
        contenders: [
          { subject: { subjectKey: "binding:my-app:value", source: { state: "available" } } },
          { subject: { subjectKey: "binding:other", source: { state: "available" } } },
        ],
      },
    });
  });

  test("refuses an exact answer whose project, document, or binding range changed", async () => {
    const current = explanation();
    const response = await handleBindingUncertaintyExplanation(
      context() as never,
      params(),
      operation(vi.fn(async () => explanationAnswer({
        explanation: {
          ...current,
          subject: {
            ...current.subject,
            source: source("src/my-app.html", bindingStart, bindingEnd - 1),
          },
        },
      }))),
    );

    expect(response).toMatchObject({
      result: { status: "refused", refusal: { kind: "subjectMismatch" } },
    });

    const wrongProject = await handleBindingUncertaintyExplanation(
      context() as never,
      params(),
      operation(vi.fn(async () => explanationAnswer({ projectKey: "other-app" }))),
    );
    expect(wrongProject).toMatchObject({
      result: { status: "refused", refusal: { kind: "subjectMismatch" } },
    });
  });

  test("turns an unmappable exact subject into a typed refusal", async () => {
    const current = explanation();
    const response = await handleBindingUncertaintyExplanation(
      context() as never,
      params(),
      operation(vi.fn(async () => explanationAnswer({
        explanation: {
          ...current,
          subject: { ...current.subject, source: source("src/missing.html", 0, 4) },
        },
      }))),
    );

    expect(response).toMatchObject({
      result: { status: "refused", refusal: { kind: "subjectSourceUnavailable" } },
    });
  });

  test("returns a freshly closed proof instead of treating resolution as a refusal", async () => {
    const current = explanation();
    const response = await handleBindingUncertaintyExplanation(
      context() as never,
      params(),
      operation(vi.fn(async () => explanationAnswer({
        explanation: {
          ...current,
          conclusion: { ...current.conclusion, kind: "flow-proved" },
          uncertainty: { state: "closed", reasons: [], explanation: "Every lane is closed." },
        },
      }))),
    );

    expect(response).toMatchObject({
      result: {
        status: "explained",
        explanation: { conclusion: { kind: "flow-proved" }, uncertainty: { state: "closed" } },
      },
    });
  });

  test("refuses missing documents and preserves a non-answer envelope", async () => {
    const missingQuery = vi.fn();
    const missing = await handleBindingUncertaintyExplanation(
      context() as never,
      params(),
      operation(missingQuery, null),
    );
    expect(missingQuery).not.toHaveBeenCalled();
    expect(missing).toMatchObject({
      documentVersion: null,
      result: { status: "refused", refusal: { kind: "documentUnavailable" } },
    });

    const failed = await handleBindingUncertaintyExplanation(
      context() as never,
      params(),
      operation(vi.fn(async () => ({
        schemaVersion: "0.2",
        result: "failed",
        selection: "not-applicable",
        coverage: "not-applicable",
        summary: "engine query failed",
        value: {},
        page: null,
      }))),
    );
    expect(failed).toMatchObject({
      answer: { result: "failed", selection: "not-applicable" },
      result: { status: "refused", refusal: { kind: "semanticAnswerUnavailable" } },
    });
  });
});

function params(): BindingUncertaintyExplanationParams {
  return {
    uri: templateUri,
    position: invokedPosition,
    range: bindingRange,
    documentVersion: document.version,
    projectKey: "app",
  };
}

function context() {
  return { documentUris };
}

function operation(
  bindingUncertaintyExplanation: ReturnType<typeof vi.fn>,
  programDocument: TextDocument | null = document,
) {
  return createTestOperation({
    documents: {
      ensureProgramDocument: () => programDocument,
      lookupText: (uri: string) => documentUris.sameDocument(uri, templateUri) ? templateText : null,
    },
    bindingUncertaintyExplanation,
  });
}

function explanationAnswer(overrides: {
  readonly selection?: "exact" | "ambiguous" | "absent";
  readonly projectKey?: string;
  readonly explanation?: unknown | null;
  readonly contenders?: readonly unknown[];
} = {}) {
  return {
    schemaVersion: "0.2",
    result: "answered",
    selection: overrides.selection ?? "exact",
    coverage: "open",
    summary: "engine-authored binding explanation",
    value: {
      displayText: "engine-authored binding explanation",
      projectKey: overrides.projectKey ?? "app",
      explanation: overrides.explanation === undefined ? explanation() : overrides.explanation,
      contenders: overrides.contenders ?? [],
    },
    page: null,
    continuations: [{
      kind: "inspect",
      rationale: "Inspect binding data-flow lanes.",
      targetQueryKind: "binding-data-flows",
      targetQuery: {
        kind: "binding-data-flows",
        sourceFile: { filePath: "src/my-app.html" },
      },
      targetAppBuilderQueryKind: null,
      targetAppBuilderQuery: null,
      intents: [],
      cost: null,
      evidence: {
        sourceRequirement: "exact-authored-span",
        sourceFacts: [{
          source: source("src/my-app.html", bindingStart, bindingEnd),
          facets: ["exact-authored-span"],
          count: 1,
        }],
        epochDependencies: [],
      },
      blockers: [],
    }],
  };
}

function explanation() {
  const bindingSource = source("src/my-app.html", bindingStart, bindingEnd);
  const expressionSource = source("src/my-app.html", expressionStart, expressionEnd);
  return {
    subject: {
      subjectKey: "binding:my-app:value",
      projectKey: "app",
      definitionName: "my-app",
      compilationLane: "app-runtime",
      bindingKind: "property",
      source: bindingSource,
      expressionSource,
      templateSource: source("src/my-app.html", 0, templateText.length),
      targetProperties: ["value"],
    },
    conclusion: {
      kind: "flow-partially-proved",
      title: "Binding flow is partially proved",
      explanation: "The source type remains open.",
      action: "Inspect the binding data-flow evidence.",
    },
    evidence: {
      lanes: [{
        definitionName: "my-app",
        bindingKind: "property",
        sourceAssignmentOccurrenceSource: null,
        sourceAssignmentTargetSource: null,
        valueConverterWritebackStages: [{
          converterName: "format",
          stageIndex: 0,
          inputTypeSource: expressionSource,
          outputTypeSource: null,
          source: expressionSource,
          handles: { valueConverterApplicationProductHandle: "product:converter" },
        }],
        expressionSource,
        source: bindingSource,
        handles: { dataFlowProductHandle: "product:data-flow" },
      }],
      blockers: [{
        kind: "open-seam",
        seamKindKey: "binding.source-type",
        summary: "The source type is open.",
        reasonKinds: ["unsupported-expression"],
        boundaryKinds: ["type-system"],
        laneIndexes: [0],
        sources: [expressionSource],
      }],
    },
    uncertainty: {
      state: "open",
      reasons: ["source-type-open"],
      explanation: "One data-flow input remains open.",
    },
    currentness: {
      authority: "answer-analysis-basis",
      explanation: "This explanation belongs to the enclosing answer analysis basis.",
    },
    nextSteps: [{
      kind: "inspect-query",
      label: "Inspect binding data flows",
      source: bindingSource,
      relatedQueryKind: "binding-data-flows",
      targetQuery: { kind: "binding-data-flows", cursor: null },
    }],
  } as const;
}

function source(sourcePath: string, start: number, end: number) {
  return {
    kind: "source-span-address",
    label: `${sourcePath}@${start}..${end}`,
    path: sourcePath,
    start,
    end,
    role: "binding",
  } as const;
}
