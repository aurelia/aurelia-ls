import path from "node:path";
import { describe, expect, test, vi } from "vitest";
import { TextDocument } from "vscode-languageserver-textdocument";
import { handleAttributeInterpretationExplanation } from "../../src/handlers/custom.js";
import type { AttributeInterpretationExplanationParams } from "../../src/protocol.js";
import { createTestOperation, testAnalysisGeneration } from "./test-request-guard.js";
import { testWorkspaceDocumentUris } from "./test-document-uris.js";

const workspaceRoot = path.resolve("attribute-interpretation-explanation-workspace");
const documentUris = testWorkspaceDocumentUris(workspaceRoot);
const templateUri = documentUris.uriForWorkspaceRelativePath("src/my-app.html")!;
const templateText = '<template><input value.two-way="person.name"></template>';
const nameStart = templateText.indexOf("value.two-way");
const nameEnd = nameStart + "value.two-way".length;
const attributeEnd = templateText.indexOf('"', nameEnd + 2) + 1;
const document = TextDocument.create(templateUri, "html", 7, templateText);
const nameRange = { start: document.positionAt(nameStart), end: document.positionAt(nameEnd) };

describe("attribute interpretation explanation protocol boundary", () => {
  test("re-proves the exact name carrier and recursively maps engine evidence", async () => {
    const query = vi.fn(async () => explanationAnswer());
    const response = await handleAttributeInterpretationExplanation(
      context() as never,
      params(),
      operation(query),
    );

    expect(query).toHaveBeenCalledWith("app", templateUri, nameRange.start);
    expect(response).toMatchObject({
      fingerprint: testAnalysisGeneration.fingerprint,
      documentVersion: 7,
      answer: { result: "answered", selection: "exact" },
      result: {
        status: "explained",
        explanation: {
          subject: {
            subjectKey: "attribute:my-app:value.two-way",
            nameSource: { state: "available", location: { uri: templateUri, range: nameRange } },
          },
          evidence: {
            syntax: {
              nameSource: { state: "available" },
              targetSource: { state: "available" },
              commandSource: { state: "available" },
            },
            valueSites: [{ source: { state: "available" } }],
            lowerings: [{ source: { state: "available" } }],
            effects: [{ source: { state: "available" } }],
            issues: [{ source: { state: "available" }, relatedSources: [{ state: "available" }] }],
            blockers: [{ sources: [{ state: "available" }] }],
          },
          nextSteps: [{ source: { state: "available" } }],
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

  test("refuses stale, absent, ambiguous, mismatched, and unmappable subjects", async () => {
    const staleQuery = vi.fn();
    const stale = await handleAttributeInterpretationExplanation(
      context() as never,
      { ...params(), documentVersion: 6 },
      operation(staleQuery),
    );
    expect(staleQuery).not.toHaveBeenCalled();
    expect(stale.result).toMatchObject({ status: "refused", refusal: { kind: "documentVersionMismatch" } });

    const absent = await handleAttributeInterpretationExplanation(
      context() as never,
      params(),
      operation(vi.fn(async () => explanationAnswer({ selection: "absent", explanation: null }))),
    );
    expect(absent.result).toMatchObject({ status: "refused", refusal: { kind: "subjectAbsent" } });

    const ambiguous = await handleAttributeInterpretationExplanation(
      context() as never,
      params(),
      operation(vi.fn(async () => explanationAnswer({
        selection: "ambiguous",
        explanation: null,
        contenders: [{ subject: explanation().subject, conclusionKind: "instruction-backed" }],
      }))),
    );
    expect(ambiguous.result).toMatchObject({
      status: "refused",
      refusal: { kind: "subjectAmbiguous" },
      contenders: [{ subject: { nameSource: { state: "available" } } }],
    });

    const changed = explanation();
    const mismatch = await handleAttributeInterpretationExplanation(
      context() as never,
      params(),
      operation(vi.fn(async () => explanationAnswer({
        explanation: {
          ...changed,
          subject: { ...changed.subject, nameSource: source("src/my-app.html", nameStart, nameEnd - 1) },
        },
      }))),
    );
    expect(mismatch.result).toMatchObject({ status: "refused", refusal: { kind: "subjectMismatch" } });

    const unavailable = await handleAttributeInterpretationExplanation(
      context() as never,
      params(),
      operation(vi.fn(async () => explanationAnswer({
        explanation: {
          ...changed,
          subject: { ...changed.subject, nameSource: source("src/missing.html", 0, 4) },
        },
      }))),
    );
    expect(unavailable.result).toMatchObject({
      status: "refused",
      refusal: { kind: "subjectSourceUnavailable" },
    });
  });

  test("preserves a freshly proved plain-attribute truth for command presentation", async () => {
    const current = explanation();
    const response = await handleAttributeInterpretationExplanation(
      context() as never,
      params(),
      operation(vi.fn(async () => explanationAnswer({
        explanation: {
          ...current,
          conclusion: { ...current.conclusion, kind: "plain-attribute" },
          uncertainty: { state: "closed", reasons: [], explanation: "The plain attribute is closed." },
        },
      }))),
    );
    expect(response.result).toMatchObject({
      status: "explained",
      explanation: { conclusion: { kind: "plain-attribute" }, uncertainty: { state: "closed" } },
    });
  });
});

function params(): AttributeInterpretationExplanationParams {
  return {
    uri: templateUri,
    position: nameRange.start,
    range: nameRange,
    documentVersion: 7,
    projectKey: "app",
  };
}

function context() {
  return { documentUris };
}

function operation(attributeInterpretationExplanation: ReturnType<typeof vi.fn>) {
  return createTestOperation({
    documents: {
      ensureProgramDocument: () => document,
      lookupText: (uri: string) => documentUris.sameDocument(uri, templateUri) ? templateText : null,
    },
    attributeInterpretationExplanation,
  });
}

function explanationAnswer(overrides: Record<string, unknown> = {}) {
  const selection = overrides.selection ?? "exact";
  const { selection: _selection, ...valueOverrides } = overrides;
  return {
    schemaVersion: "0.2",
    result: "answered",
    selection,
    coverage: "complete",
    summary: "Exact attribute interpretation.",
    analysisBasis: { sourceWorldRevision: "semantic-source-world:test" },
    value: {
      displayText: "Exact attribute interpretation.",
      projectKey: "app",
      explanation: explanation(),
      contenders: [],
      ...valueOverrides,
    },
    page: null,
    continuations: [{
      continuationKey: "inspect-source",
      kind: "inspect-query",
      label: "Inspect source",
      targetQuery: {
        kind: "source-files",
        sourceFile: { filePath: "src/my-app.html" },
      },
      evidence: {
        sourceFacts: [{ label: "attribute", source: source("src/my-app.html", nameStart, nameEnd) }],
      },
    }],
  };
}

function explanation() {
  const name = source("src/my-app.html", nameStart, nameEnd);
  const whole = source("src/my-app.html", nameStart, attributeEnd);
  const value = source("src/my-app.html", nameEnd + 2, attributeEnd - 1);
  return {
    subject: {
      subjectKey: "attribute:my-app:value.two-way",
      projectKey: "app",
      definitionName: "my-app",
      compilationLane: "app-runtime",
      rawName: "value.two-way",
      source: whole,
      nameSource: name,
      valueSource: value,
      templateSource: source("src/my-app.html", 0, templateText.length),
    },
    conclusion: {
      kind: "instruction-backed",
      title: "Aurelia binds the input value",
      explanation: "Compiler evidence contains a property binding instruction.",
      action: "Inspect the lowering if needed.",
    },
    evidence: {
      syntax: {
        syntaxKind: "command",
        target: "value",
        command: "two-way",
        parts: ["value", "two-way"],
        pattern: "PART.PART",
        nameSource: name,
        targetSource: source("src/my-app.html", nameStart, nameStart + 5),
        commandSource: source("src/my-app.html", nameStart + 6, nameEnd),
      },
      classification: {
        classificationKind: "binding-command",
        resourceKind: null,
        resourceName: null,
        bindableName: "value",
        bindableAttribute: "value",
        bindingCommandName: "two-way",
        openReason: null,
      },
      valueSites: [{
        siteKind: "attribute-value",
        rawValue: "person.name",
        entryFamily: "property-binding",
        parseState: "parsed",
        resultKind: "property-access",
        source: value,
      }],
      lowerings: [{
        commandName: "two-way",
        state: "lowered",
        message: null,
        frameworkErrorCode: null,
        effectIndexes: [0],
        source: name,
      }],
      effects: [{ kind: "bind-property", instructionKind: "property-binding", summary: "Bind value.", source: whole }],
      issues: [{
        phase: "compile",
        issueKind: "warning",
        severity: "warning",
        message: "Example issue evidence.",
        frameworkErrorCode: null,
        source: name,
        relatedSources: [value],
      }],
      blockers: [{
        kind: "open-seam",
        summary: "Example blocker.",
        reasonKinds: ["unresolved-module"],
        boundaryKinds: ["module"],
        sources: [name],
      }],
    },
    uncertainty: { state: "open", reasons: ["compiler-open-seam"], explanation: "One seam remains open." },
    currentness: { authority: "answer-analysis-basis", explanation: "Current answer basis." },
    nextSteps: [{
      kind: "inspect-source",
      label: "Inspect attribute",
      source: name,
      relatedQueryKind: null,
      targetQuery: null,
    }],
  };
}

function source(sourcePath: string, start: number, end: number) {
  return {
    kind: "source-span-address",
    label: `${sourcePath}@${start}..${end}`,
    path: sourcePath,
    start,
    end,
    role: "attribute",
  };
}
