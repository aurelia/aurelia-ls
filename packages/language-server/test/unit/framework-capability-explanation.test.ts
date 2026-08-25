import path from "node:path";
import { describe, expect, test, vi } from "vitest";
import { TextDocument } from "vscode-languageserver-textdocument";
import { handleFrameworkCapabilityExplanation } from "../../src/handlers/custom.js";
import { mapFrameworkCapabilityExplanationSourceTarget } from "../../src/mapping/framework-capability-explanation.js";
import type { FrameworkCapabilityExplanationParams } from "../../src/protocol.js";
import { createTestOperation, testAnalysisGeneration } from "./test-request-guard.js";
import { testWorkspaceDocumentUris } from "./test-document-uris.js";

const workspaceRoot = path.resolve("framework-capability-explanation-workspace");
const documentUris = testWorkspaceDocumentUris(workspaceRoot);
const templateUri = documentUris.uriForWorkspaceRelativePath("src/my-app.html")!;
const templateText = '<template><div t="hello"></div></template>';
const demandStart = templateText.indexOf("t=");
const demandEnd = demandStart + 1;
const document = TextDocument.create(templateUri, "html", 7, templateText);
const demandRange = {
  start: document.positionAt(demandStart),
  end: document.positionAt(demandEnd),
};

describe("framework capability explanation protocol boundary", () => {
  test("isolates a source URI projection failure instead of crashing the explanation", () => {
    const mapped = mapFrameworkCapabilityExplanationSourceTarget(
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

  test("re-proves and maps one exact engine explanation without leaking source references", async () => {
    const query = vi.fn(async () => explanationAnswer());
    const response = await handleFrameworkCapabilityExplanation(
      context() as never,
      params(),
      operation(query),
    );

    expect(query).toHaveBeenCalledWith(
      "app",
      templateUri,
      demandRange.start,
      "i18n.translation-syntax",
    );
    expect(response).toMatchObject({
      fingerprint: testAnalysisGeneration.fingerprint,
      documentVersion: 7,
      answer: { result: "answered", selection: "exact" },
      result: {
        status: "explained",
        explanation: {
          subject: {
            projectKey: "app",
            requiredCapability: "i18n.translation-syntax",
            source: {
              state: "available",
              location: { uri: templateUri, range: demandRange },
            },
          },
          evidence: {
            admission: { sources: [{ state: "available" }] },
            package: {
              evidence: [{ source: { state: "unavailable", reason: "source-text-unavailable" } }],
            },
            blockers: [{ sources: [{ state: "unavailable", reason: "source-text-unavailable" }] }],
          },
          nextSteps: [{ source: { state: "absent" } }],
        },
      },
    });
    expect(response.answer?.continuations?.[0]).toMatchObject({
      targetQuery: {
        sourceFile: { state: "available", uri: templateUri },
      },
      evidence: {
        sourceFacts: [{ source: { state: "available", location: { uri: templateUri } } }],
      },
    });
    const serialized = JSON.stringify(response);
    expect(serialized).not.toContain('"path"');
    expect(serialized).not.toContain('"handles"');
  });

  test("refuses a stale command seed before querying a newer document generation", async () => {
    const query = vi.fn();
    const response = await handleFrameworkCapabilityExplanation(
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

  test("passes a different known capability to the engine and preserves its absent refusal", async () => {
    const query = vi.fn(async () => explanationAnswer({ selection: "absent", explanation: null }));
    const response = await handleFrameworkCapabilityExplanation(
      context() as never,
      { ...params(), frameworkCapability: "router.default-resources" },
      operation(query),
    );

    expect(query).toHaveBeenCalledWith(
      "app",
      templateUri,
      demandRange.start,
      "router.default-resources",
    );
    expect(response).toMatchObject({
      answer: { result: "answered", selection: "absent" },
      result: { status: "refused", refusal: { kind: "subjectAbsent" }, contenders: [] },
    });
  });

  test("preserves ambiguous contenders but never selects one in the transport", async () => {
    const contender = explanation().subject;
    const query = vi.fn(async () => explanationAnswer({
      selection: "ambiguous",
      explanation: null,
      contenders: [
        { subject: contender, conclusionKind: "not-admitted" },
        { subject: { ...contender, authoredName: "other" }, conclusionKind: "configured-out" },
      ],
    }));
    const response = await handleFrameworkCapabilityExplanation(
      context() as never,
      params(),
      operation(query),
    );

    expect(response).toMatchObject({
      answer: { selection: "ambiguous" },
      result: {
        status: "refused",
        refusal: { kind: "subjectAmbiguous" },
        contenders: [
          { subject: { authoredName: "t", source: { state: "available" } } },
          { subject: { authoredName: "other", source: { state: "available" } } },
        ],
      },
    });
  });

  test("refuses an exact answer whose capability or source no longer matches the diagnostic", async () => {
    const mismatch = explanation();
    const query = vi.fn(async () => explanationAnswer({
      explanation: {
        ...mismatch,
        subject: {
          ...mismatch.subject,
          requiredCapability: "router.default-resources" as never,
        },
      },
    }));
    const response = await handleFrameworkCapabilityExplanation(
      context() as never,
      params(),
      operation(query),
    );

    expect(response).toMatchObject({
      answer: { selection: "exact" },
      result: { status: "refused", refusal: { kind: "subjectMismatch" } },
    });
  });

  test("turns an unmappable exact subject into a typed refusal", async () => {
    const unmappable = explanation();
    const query = vi.fn(async () => explanationAnswer({
      explanation: {
        ...unmappable,
        subject: {
          ...unmappable.subject,
          source: source("src/missing.ts", 0, 4),
        },
      },
    }));
    const response = await handleFrameworkCapabilityExplanation(
      context() as never,
      params(),
      operation(query),
    );

    expect(response).toMatchObject({
      result: { status: "refused", refusal: { kind: "subjectSourceUnavailable" } },
    });
  });

  test("refuses unknown wire vocabulary and missing documents without invoking semantic-runtime", async () => {
    const unknownQuery = vi.fn();
    const unknown = await handleFrameworkCapabilityExplanation(
      context() as never,
      { ...params(), frameworkCapability: "plugin.unknown-surface" as never },
      operation(unknownQuery),
    );
    expect(unknownQuery).not.toHaveBeenCalled();
    expect(unknown).toMatchObject({
      result: { status: "refused", refusal: { kind: "invalidFrameworkCapability" } },
    });

    const missingQuery = vi.fn();
    const missing = await handleFrameworkCapabilityExplanation(
      context() as never,
      params(),
      operation(missingQuery, null),
    );
    expect(missingQuery).not.toHaveBeenCalled();
    expect(missing).toMatchObject({
      documentVersion: null,
      result: { status: "refused", refusal: { kind: "documentUnavailable" } },
    });
  });

  test("preserves a non-answer envelope without reading explanation rows", async () => {
    const query = vi.fn(async () => ({
      schemaVersion: "0.2",
      result: "failed",
      selection: "not-applicable",
      coverage: "not-applicable",
      summary: "engine query failed",
      value: {},
      page: null,
    }));

    const response = await handleFrameworkCapabilityExplanation(
      context() as never,
      params(),
      operation(query),
    );

    expect(response).toMatchObject({
      answer: { result: "failed", selection: "not-applicable" },
      result: { status: "refused", refusal: { kind: "semanticAnswerUnavailable" } },
    });
  });
});

function params(): FrameworkCapabilityExplanationParams {
  return {
    uri: templateUri,
    position: demandRange.start,
    range: demandRange,
    documentVersion: document.version,
    projectKey: "app",
    frameworkCapability: "i18n.translation-syntax",
  };
}

function context() {
  return { documentUris };
}

function operation(
  frameworkCapabilityExplanation: ReturnType<typeof vi.fn>,
  programDocument: TextDocument | null = document,
) {
  return createTestOperation({
    documents: {
      ensureProgramDocument: () => programDocument,
      lookupText: (uri: string) => documentUris.sameDocument(uri, templateUri) ? templateText : null,
    },
    frameworkCapabilityExplanation,
  });
}

function explanationAnswer(overrides: {
  readonly selection?: "exact" | "ambiguous" | "absent";
  readonly explanation?: ReturnType<typeof explanation> | null;
  readonly contenders?: readonly unknown[];
} = {}) {
  return {
    schemaVersion: "0.2",
    result: "answered",
    selection: overrides.selection ?? "exact",
    coverage: "open",
    summary: "engine-authored explanation answer",
    value: {
      displayText: "engine-authored explanation",
      projectKey: "app",
      explanation: overrides.explanation === undefined ? explanation() : overrides.explanation,
      contenders: overrides.contenders ?? [],
    },
    page: null,
    continuations: [{
      kind: "inspect",
      rationale: "Inspect the source-scoped demand facts.",
      targetQueryKind: "framework-capability-demands",
      targetQuery: {
        kind: "framework-capability-demands",
        sourceFile: { filePath: "src/my-app.html" },
      },
      targetAppBuilderQueryKind: null,
      targetAppBuilderQuery: null,
      intents: [],
      cost: null,
      evidence: {
        sourceRequirement: "exact-authored-span",
        sourceFacts: [{
          source: source("src/my-app.html", demandStart, demandEnd),
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
  const subjectSource = source("src/my-app.html", demandStart, demandEnd);
  const missingSource = source("src/missing.ts", 0, 4);
  return {
    subject: {
      projectKey: "app",
      authoredName: "t",
      siteKind: "attribute-pattern",
      demandKind: "attribute-pattern",
      requiredCapability: "i18n.translation-syntax",
      source: subjectSource,
      templateSource: source("src/my-app.html", 0, templateText.length),
    },
    conclusion: {
      kind: "not-admitted",
      title: "Translation syntax is not admitted",
      explanation: "The current app world does not admit the demanded translation syntax.",
      action: "Inspect the app registration path.",
    },
    evidence: {
      admission: {
        state: "not-admitted",
        requiredRegistrationKinds: ["i18n-configuration"],
        sources: [subjectSource],
      },
      configuration: { state: "not-indicated", sources: [] },
      package: {
        availabilityState: "no-evidence",
        candidateModuleNames: ["@aurelia/i18n"],
        recommendedModuleName: "@aurelia/i18n",
        evidence: [{
          evidenceKind: "package-manifest",
          packageName: "app",
          moduleName: "@aurelia/i18n",
          scope: "project",
          source: missingSource,
          handles: { sourceAddressHandle: null },
        }],
      },
      blockers: [{
        kind: "open-seam",
        seamKindKey: "registration.dynamic",
        summary: "A dynamic registration remains open.",
        reasonKinds: ["runtime-only-value"],
        boundaryKinds: ["configuration"],
        sources: [missingSource],
      }],
    },
    uncertainty: {
      state: "open",
      reasons: ["blocking-open-seam"],
      explanation: "One registration boundary remains open.",
    },
    currentness: {
      authority: "answer-analysis-basis",
      explanation: "This answer belongs to the current analysis basis.",
    },
    nextSteps: [{
      kind: "inspect-query",
      label: "Inspect framework capability demands",
      source: null,
      relatedQueryKind: "framework-capability-demands",
      targetQuery: { kind: "framework-capability-demands" },
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
    role: "name",
  } as const;
}
