import path from "node:path";
import { describe, expect, test, vi } from "vitest";
import { TextDocument } from "vscode-languageserver-textdocument";
import {
  handleResourceAvailabilityExplanation,
  registerCustomHandlers,
} from "../../src/handlers/custom.js";
import { mapResourceAvailabilityExplanation } from "../../src/mapping/resource-availability-explanation.js";
import {
  AureliaProtocolRequest,
  type ResourceAvailabilityExplanationParams,
} from "../../src/protocol.js";
import { createTestOperation, testAnalysisGeneration } from "./test-request-guard.js";
import { testWorkspaceDocumentUris } from "./test-document-uris.js";

const workspaceRoot = path.resolve("resource-availability-explanation-workspace");
const documentUris = testWorkspaceDocumentUris(workspaceRoot);
const templateUri = documentUris.uriForWorkspaceRelativePath("src/my-app.html")!;
const templateText = "<template><product-card></product-card></template>";
const resourceText = "export class ProductCard {}";
const document = TextDocument.create(templateUri, "html", 7, templateText);
const invokedPosition = document.positionAt(templateText.indexOf("product-card") + 2);

describe("resource availability explanation protocol boundary", () => {
  test("maps every source defensively when URI projection fails", () => {
    const mapped = mapResourceAvailabilityExplanation(explanation() as never, {
      documentUris: {
        uriForWorkspaceRelativePath: () => {
          throw new Error("broken URI projection");
        },
      } as never,
      lookupText: expect.unreachable,
    });

    expect(mapped.subject.template.source).toEqual({
      state: "unavailable",
      reason: "source-uri-unavailable",
    });
    expect(mapped.subject.resource.sources.publicName).toEqual({
      state: "unavailable",
      reason: "source-uri-unavailable",
    });
    expect(mapped.evidence.exclusion).toMatchObject({
      contenderSource: { state: "unavailable", reason: "source-uri-unavailable" },
      winnerSource: { state: "unavailable", reason: "source-uri-unavailable" },
    });
  });

  test("re-proves an exact resource, scope, template, and contained cursor without leaking handles", async () => {
    const query = vi.fn(async () => explanationAnswer());
    const response = await handleResourceAvailabilityExplanation(
      context() as never,
      params(),
      operation(query),
    );

    expect(query).toHaveBeenCalledWith(
      "app",
      templateUri,
      invokedPosition,
      "resource:product-card:v1",
      "scope:my-app:v1",
    );
    expect(response).toMatchObject({
      fingerprint: testAnalysisGeneration.fingerprint,
      documentVersion: 7,
      answer: {
        result: "answered",
        selection: "exact",
        analysisBasis: { sourceWorldRevision: "semantic-source-world:test" },
      },
      result: {
        status: "explained",
        explanation: {
          subject: {
            resourceIdentityKey: "resource:product-card:v1",
            resource: { identityKey: "resource:product-card:v1" },
            template: {
              scopeIdentityKey: "scope:my-app:v1",
              source: { state: "available", location: { uri: templateUri } },
            },
          },
          evidence: {
            effectiveResource: { identityKey: "resource:winner-card:v1" },
            availabilitySource: { state: "available" },
            exclusion: {
              contenderSource: { state: "available" },
              winnerSource: { state: "available" },
            },
            blockers: [{ sources: [{ state: "available" }] }],
          },
          currentness: { authority: "answer-analysis-basis" },
          nextSteps: [{
            source: { state: "available" },
            targetQuery: { sourceFile: { state: "available", uri: templateUri } },
          }],
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

  test("refuses stale seeds before querying and preserves engine ambiguity", async () => {
    const staleQuery = vi.fn();
    const stale = await handleResourceAvailabilityExplanation(
      context() as never,
      { ...params(), documentVersion: 6 },
      operation(staleQuery),
    );
    expect(staleQuery).not.toHaveBeenCalled();
    expect(stale).toMatchObject({
      documentVersion: 7,
      answer: null,
      result: { status: "refused", refusal: { kind: "documentVersionMismatch" } },
    });

    const contender = explanation().subject;
    const ambiguous = await handleResourceAvailabilityExplanation(
      context() as never,
      { ...params(), templateResourceScopeIdentityKey: undefined },
      operation(vi.fn(async () => explanationAnswer({
        selection: "ambiguous",
        explanation: null,
        contenders: [
          { subject: contender, conclusionKind: "shadowed" },
          {
            subject: {
              ...contender,
              subjectKey: "resource-availability:other-scope",
              template: { ...contender.template, scopeIdentityKey: "scope:other:v1" },
            },
            conclusionKind: "available",
          },
        ],
      }))),
    );
    expect(ambiguous).toMatchObject({
      answer: { selection: "ambiguous" },
      result: {
        status: "refused",
        refusal: { kind: "subjectAmbiguous" },
        contenders: [
          { subject: { template: { scopeIdentityKey: "scope:my-app:v1" } } },
          { subject: { template: { scopeIdentityKey: "scope:other:v1" } } },
        ],
      },
    });
  });

  test("refuses exact answers whose resource, selected scope, or template locus changed", async () => {
    const current = explanation();
    const wrongResource = await handleResourceAvailabilityExplanation(
      context() as never,
      params(),
      operation(vi.fn(async () => explanationAnswer({
        explanation: {
          ...current,
          subject: { ...current.subject, resourceIdentityKey: "resource:other:v1" },
        },
      }))),
    );
    expect(wrongResource).toMatchObject({
      result: { status: "refused", refusal: { kind: "subjectMismatch" } },
    });

    const wrongScope = await handleResourceAvailabilityExplanation(
      context() as never,
      params(),
      operation(vi.fn(async () => explanationAnswer({
        explanation: {
          ...current,
          subject: {
            ...current.subject,
            template: { ...current.subject.template, scopeIdentityKey: "scope:other:v1" },
          },
        },
      }))),
    );
    expect(wrongScope).toMatchObject({
      result: { status: "refused", refusal: { kind: "subjectMismatch" } },
    });

    const wrongTemplate = await handleResourceAvailabilityExplanation(
      context() as never,
      params(),
      operation(vi.fn(async () => explanationAnswer({
        explanation: {
          ...current,
          subject: {
            ...current.subject,
            template: {
              ...current.subject.template,
              source: source("src/other.html", 0, 20),
            },
          },
        },
      }))),
    );
    expect(wrongTemplate).toMatchObject({
      result: { status: "refused", refusal: { kind: "subjectMismatch" } },
    });

    const unmappableTemplate = await handleResourceAvailabilityExplanation(
      context() as never,
      params(),
      operation(vi.fn(async () => explanationAnswer({
        explanation: {
          ...current,
          subject: {
            ...current.subject,
            template: {
              ...current.subject.template,
              source: source("src/missing.html", 0, 20),
            },
          },
        },
      }))),
    );
    expect(unmappableTemplate).toMatchObject({
      result: { status: "refused", refusal: { kind: "templateSourceUnavailable" } },
    });
  });

  test("uses document ownership as the request guard and returns a calm source refusal", async () => {
    const handlers = new Map<string, (params: unknown, token: unknown) => Promise<unknown>>();
    const query = vi.fn();
    const guardedOperation = operation(query, document, {
      authoredSourceOwnership: vi.fn(async () => ({ value: { owners: [] } })),
    });
    const ctx = {
      connection: {
        onRequest: vi.fn((method: string, handler: (params: unknown, token: unknown) => Promise<unknown>) => {
          handlers.set(method, handler);
        }),
      },
      documentUris,
      ownsDocument: vi.fn(() => true),
      semanticRuntime: {
        runRequest: vi.fn(async (
          _isCancelled: (() => boolean) | null,
          request: (current: typeof guardedOperation) => unknown,
        ) => await request(guardedOperation)),
      },
      logger: { log: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    };
    registerCustomHandlers(ctx as never);
    const handler = handlers.get(AureliaProtocolRequest.ResourceAvailabilityExplanation);
    if (handler == null) throw new Error("Expected resource availability request registration.");

    const response = await handler(params(), {
      isCancellationRequested: false,
      onCancellationRequested: vi.fn(),
    });

    expect(query).not.toHaveBeenCalled();
    expect(response).toMatchObject({
      documentVersion: 7,
      result: { status: "refused", refusal: { kind: "sourceNotAuthored" } },
    });
  });
});

function params(): ResourceAvailabilityExplanationParams {
  return {
    uri: templateUri,
    position: invokedPosition,
    documentVersion: document.version,
    projectKey: "app",
    resourceIdentityKey: "resource:product-card:v1",
    templateResourceScopeIdentityKey: "scope:my-app:v1",
  };
}

function context() {
  return { documentUris };
}

function operation(
  resourceAvailabilityExplanation: ReturnType<typeof vi.fn>,
  programDocument: TextDocument | null = document,
  overrides: Record<string, unknown> = {},
) {
  return createTestOperation({
    documents: {
      ensureProgramDocument: () => programDocument,
      lookupText: (uri: string) => {
        if (documentUris.sameDocument(uri, templateUri)) return templateText;
        if (uri.endsWith("/other.html")) return templateText;
        if (uri.endsWith("/product-card.ts") || uri.endsWith("/winner-card.ts") || uri.endsWith("/main.ts")) {
          return resourceText;
        }
        return null;
      },
    },
    resourceAvailabilityExplanation,
    ...overrides,
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
    summary: "engine-authored resource availability explanation",
    analysisBasis: {
      sourceWorldRevision: "semantic-source-world:test",
      appWorldRevision: "app-world:test",
    },
    value: {
      displayText: "engine-authored resource availability explanation",
      projectKey: overrides.projectKey ?? "app",
      explanation: overrides.explanation === undefined ? explanation() : overrides.explanation,
      contenders: overrides.contenders ?? [],
    },
    page: null,
    continuations: [{
      kind: "inspect",
      rationale: "Inspect the exact resource scope.",
      targetQueryKind: "template-resource-availability",
      targetQuery: {
        kind: "template-resource-availability",
        sourceFile: { filePath: "src/my-app.html" },
      },
      targetAppBuilderQueryKind: null,
      targetAppBuilderQuery: null,
      intents: [],
      cost: null,
      evidence: {
        sourceRequirement: "exact-authored-span",
        sourceFacts: [{
          source: source("src/my-app.html", 0, templateText.length),
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
  const requested = resourceRow(
    "resource:product-card:v1",
    "product-card",
    "src/product-card.ts",
  );
  const winner = resourceRow(
    "resource:winner-card:v1",
    "winner-card",
    "src/winner-card.ts",
  );
  return {
    subject: {
      subjectKey: "resource-availability:product-card:my-app",
      projectKey: "app",
      resourceIdentityKey: requested.identityKey,
      resourceKind: "custom-element",
      name: requested.name,
      lookupKind: "canonical-name",
      registrationKey: requested.registrationKey,
      resource: requested,
      template: {
        templateIdentityKey: "template:my-app:v1",
        scopeIdentityKey: "scope:my-app:v1",
        definitionName: "my-app",
        compilationLane: "app-runtime",
        source: source("src/my-app.html", 0, templateText.length),
      },
      handles: { resourceProductHandle: "product:requested" },
    },
    conclusion: {
      kind: "shadowed",
      title: "product-card is shadowed",
      explanation: "An earlier registration owns the canonical lookup key.",
      action: "Inspect the winning registration.",
    },
    evidence: {
      effectiveResource: winner,
      availabilitySource: source("src/main.ts", 0, 6),
      exclusion: {
        reason: "lookup-key-conflict",
        lookupKeys: ["au:resource:custom-element:product-card"],
        contenderLane: "local",
        contenderSource: source("src/product-card.ts", 0, resourceText.length),
        winnerSource: source("src/winner-card.ts", 0, resourceText.length),
        handles: { winnerProductHandle: "product:winner" },
      },
      configuration: {
        state: "not-indicated",
        requiredCapability: null,
        sources: [],
      },
      blockers: [{
        kind: "open-seam",
        seamKindKey: "registration.dynamic",
        summary: "One registration boundary remains open.",
        reasonKinds: ["runtime-only-value"],
        boundaryKinds: ["configuration"],
        sources: [source("src/main.ts", 0, 6)],
        handles: { seamHandle: "seam:open" },
      }],
    },
    uncertainty: {
      state: "open",
      reasons: ["blocking-open-seam"],
      explanation: "A registration boundary remains open.",
    },
    currentness: {
      authority: "answer-analysis-basis",
      explanation: "This explanation belongs to the enclosing answer basis.",
    },
    nextSteps: [{
      kind: "inspect-query",
      label: "Inspect template resources",
      source: source("src/my-app.html", 0, templateText.length),
      relatedQueryKind: "template-resource-availability",
      targetQuery: {
        kind: "template-resource-availability",
        sourceFile: { filePath: "src/my-app.html" },
      },
      handles: { queryClaimHandle: "claim:next" },
    }],
  } as const;
}

function resourceRow(identityKey: string, name: string, file: string) {
  const publicName = source(file, 13, 24);
  return {
    identityKey,
    projectKey: "app",
    resourceKind: "custom-element",
    name,
    registrationKey: `au:resource:custom-element:${name}`,
    aliases: [],
    bindables: [],
    declarationModes: ["decorator"],
    metadataState: "full-definition",
    origin: {
      kind: "project",
      projectKey: "app",
      packageName: null,
      moduleKey: file,
      catalogGroup: null,
    },
    locality: {
      kind: "project",
      ownerIdentityKey: null,
      ownerName: null,
      ownerSource: null,
    },
    sources: {
      publicName,
      declaration: source(file, 0, resourceText.length),
      implementation: publicName,
      navigation: publicName,
      navigationRole: "public-name",
      navigationUnavailableReason: null,
    },
    handles: { productHandle: `product:${identityKey}` },
  } as const;
}

function source(file: string, start: number, end: number) {
  return {
    kind: "source-span-address",
    label: `${file}@${start}..${end}`,
    path: file,
    start,
    end,
    role: "name",
  } as const;
}
