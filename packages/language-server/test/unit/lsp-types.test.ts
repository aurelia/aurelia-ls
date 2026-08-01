import { describe, test, expect } from "vitest";
import { CompletionItemKind } from "vscode-languageserver/node";
import { TextDocument } from "vscode-languageserver-textdocument";
import {
  AURELIA_LSP_DIAGNOSTIC_NAMESPACE_KEY,
  AURELIA_LSP_DIAGNOSTIC_TAXONOMY_SCHEMA,
  canonicalDocumentUri,
  guessLanguage,
  mapSemanticRuntimeAppDiagnostics,
  mapSemanticRuntimeTemplateCodeActions,
  mapSemanticRuntimeTemplateDefinition,
  mapSemanticRuntimeTemplateHover,
  mapSemanticRuntimeTemplateCompletions,
  mapSemanticRuntimeTemplateReferences,
  mapSemanticRuntimeTemplateRenameEdit,
  spanToRange,
  toLspUri,
  type LookupTextFn,
} from "@aurelia-ls/language-server/api";

type DocumentUri = string;
type SourceSpan = { start: number; end: number };

const spanUri: DocumentUri = canonicalDocumentUri(
  "file:///C:/projects/app/src/span.html",
).uri;
const definitionLspUri = "file:///C:/projects/app/src/component.ts";
const definitionUri = canonicalDocumentUri(definitionLspUri).uri;
const definitionText = 'export class Component {\n  message = "hello";\n}';

const textByUri = new Map<DocumentUri, string>([
  [spanUri, "alpha\nbeta\ngamma"],
  [definitionUri, definitionText],
]);

const lookupText: LookupTextFn = (uri) => textByUri.get(uri) ?? null;

function makeSpan(start: number, end: number): SourceSpan {
  return { start, end };
}

describe("toLspUri", () => {
  test("converts document URI to proper file URI", () => {
    const result = toLspUri(
      canonicalDocumentUri("file:///C:/projects/app/src/component.html").uri,
    );
    expect(result).toMatch(
      /^file:\/\/\/[Cc]:\/projects\/app\/src\/component\.html$/,
    );
  });

  test("preserves Unix paths correctly", () => {
    const result = toLspUri(
      canonicalDocumentUri("file:///home/user/project/src/view.html").uri,
    );
    expect(result).toBe("file:///home/user/project/src/view.html");
  });
});

describe("guessLanguage", () => {
  test("returns typescript for .ts and .js files", () => {
    expect(guessLanguage("file:///app/src/component.ts")).toBe("typescript");
    expect(guessLanguage("file:///app/src/component.js")).toBe("typescript");
  });

  test("returns json for .json files and html by default", () => {
    expect(guessLanguage("file:///app/package.json")).toBe("json");
    expect(guessLanguage("file:///app/src/component.html")).toBe("html");
    expect(guessLanguage("file:///app/src/view.au")).toBe("html");
  });
});

describe("spanToRange", () => {
  test("maps offsets to line and character positions", () => {
    const range = spanToRange(
      { uri: spanUri, span: makeSpan(6, 10) },
      lookupText,
    );
    expect(range).toEqual({
      start: { line: 1, character: 0 },
      end: { line: 1, character: 4 },
    });
  });
});

describe("mapSemanticRuntimeAppDiagnostics", () => {
  test("maps runtime diagnostic rows with authored spans and metadata", () => {
    const doc = TextDocument.create(
      "file:///C:/projects/app/src/component.html",
      "html",
      1,
      "alpha\nbeta\ngamma",
    );
    const mapped = mapSemanticRuntimeAppDiagnostics(
      {
        value: {
          rows: [
            {
              projectKey: "app",
              diagnosticDomain: "template",
              phase: null,
              diagnosticKind: "missing-expression-member",
              diagnosticAuthority: "type-checker",
              frameworkErrorCode: null,
              frameworkRawErrorAuthority: null,
              severity: "warning",
              summary: "Missing member",
              missingInput: "expression-member:selected-member-missing",
              missingInputs: ["expression-member:selected-member-missing"],
              source: {
                kind: "source-span-address",
                label: "src/component.html@6..10",
                path: "src/component.html",
                start: 6,
                end: 10,
                role: "expression",
              },
              subject: {
                subjectKind: "template-member-access",
                subjectName: "beta",
                source: null,
              },
              diagnosticIdentityHandle: 2,
              diagnosticRelations: [{
                relationKind: "same-operation-evidence",
                relatedDiagnosticIdentityHandle: 5,
              }],
              relatedInformation: [
                {
                  relationKind: "subject-declaration",
                  code: null,
                  message: "The member is declared here.",
                  source: {
                    kind: "source-span-address",
                    label: "src/component.html@0..5",
                    path: doc.uri,
                    start: 0,
                    end: 5,
                    role: "name",
                  },
                },
              ],
              suggestion: null,
              sourceRole: "template",
              relatedQueryKind: "template-diagnostics",
              handles: {
                productHandle: 1,
                identityHandle: 2,
                ownerIdentityHandle: null,
                sourceAddressHandle: 3,
                relatedSourceAddressHandles: [4],
                overlayOriginKey: null,
                overlayFileName: null,
                overlaySegmentLabel: null,
              },
            },
          ],
        },
      } as never,
      doc,
    );

    expect(mapped.failures).toEqual([]);
    expect(mapped.value).toHaveLength(1);
    expect(mapped.value[0]?.range).toEqual({
      start: { line: 1, character: 0 },
      end: { line: 1, character: 4 },
    });
    expect(mapped.value[0]?.source).toBe("aurelia");
    expect(mapped.value[0]?.code).toBe("missing-expression-member");
    expect(mapped.value[0]?.data).toMatchObject({
      semanticRuntime: {
        queryKind: "app-diagnostics",
        diagnosticDomain: "template",
        phase: null,
        diagnosticKind: "missing-expression-member",
        missingInputs: ["expression-member:selected-member-missing"],
        subject: { subjectName: "beta" },
        relatedInformation: [
          {
            relationKind: "subject-declaration",
            message: "The member is declared here.",
          },
        ],
      },
      [AURELIA_LSP_DIAGNOSTIC_NAMESPACE_KEY]: {
        diagnostics: {
          schema: AURELIA_LSP_DIAGNOSTIC_TAXONOMY_SCHEMA,
          impact: "degraded",
          actionability: "manual",
          category: "template-syntax",
          runtime: {
            relatedQueryKind: "template-diagnostics",
          },
        },
      },
    });
    expect(mapped.value[0]?.data).not.toHaveProperty("semanticRuntime.diagnosticIdentityHandle");
    expect(mapped.value[0]?.data).not.toHaveProperty("semanticRuntime.diagnosticRelations");
    expect(mapped.value[0]?.data).not.toHaveProperty("semanticRuntime.handles");
    expect(mapped.value[0]?.relatedInformation).toEqual([
      expect.objectContaining({ message: "The member is declared here." }),
    ]);
  });

  test("uses TypeScript codes for template overlay diagnostics without losing runtime identity", () => {
    const doc = TextDocument.create(
      "file:///C:/projects/app/src/component.html",
      "html",
      1,
      "alpha\nbeta\ngamma",
    );
    const mapped = mapSemanticRuntimeAppDiagnostics(
      {
        value: {
          rows: [
            {
              projectKey: "app",
              diagnosticDomain: "template",
              phase: null,
              diagnosticKind: "template-expression-typescript-diagnostic",
              diagnosticAuthority: "typescript",
              frameworkErrorCode: null,
              frameworkRawErrorAuthority: null,
              severity: "error",
              summary:
                "TS2345: Argument of type 'string' is not assignable to parameter of type 'number'.",
              missingInput: "typescript:TS2345",
              missingInputs: ["typescript:TS2345"],
              source: {
                kind: "source-span-address",
                label: "src/component.html@6..10",
                path: "src/component.html",
                start: 6,
                end: 10,
                role: "expression",
              },
              subject: null,
              relatedInformation: [],
              suggestion: null,
              sourceRole: "template",
              relatedQueryKind: "template-diagnostics",
            },
          ],
        },
      } as never,
      doc,
    );

    expect(mapped.failures).toEqual([]);
    expect(mapped.value).toHaveLength(1);
    expect(mapped.value[0]?.source).toBe("aurelia");
    expect(mapped.value[0]?.code).toBe("TS2345");
    expect(mapped.value[0]?.data).toMatchObject({
      semanticRuntime: {
        diagnosticDomain: "template",
        diagnosticKind: "template-expression-typescript-diagnostic",
        diagnosticAuthority: "typescript",
        missingInput: "typescript:TS2345",
      },
    });
  });

  test("reports a source-backed diagnostic whose authored span cannot be mapped", () => {
    const doc = TextDocument.create(
      "file:///C:/projects/app/src/component.html",
      "html",
      1,
      "short",
    );
    const mapped = mapSemanticRuntimeAppDiagnostics({
      value: {
        rows: [{
          diagnosticDomain: "template",
          diagnosticKind: "missing-expression-member",
          diagnosticAuthority: "semantic-authoring-policy",
          frameworkErrorCode: null,
          severity: "error",
          summary: "Missing member",
          missingInput: "member",
          missingInputs: ["member"],
          source: {
            kind: "source-span-address",
            label: "src/component.html@10..16",
            path: "src/component.html",
            start: 10,
            end: 16,
            role: "expression",
          },
          relatedInformation: [],
          suggestion: null,
        }],
      },
    } as never, doc);

    expect(mapped.value).toEqual([]);
    expect(mapped.failures).toEqual([
      expect.stringContaining("src/component.html@10..16"),
    ]);
  });

  test("maps broad related evidence without inventing precision and reports unreadable exact evidence", () => {
    const doc = TextDocument.create(
      "file:///C:/projects/app/src/component.html",
      "html",
      1,
      "value",
    );
    const mapped = mapSemanticRuntimeAppDiagnostics({
      value: {
        rows: [{
          diagnosticDomain: "template",
          diagnosticKind: "missing-expression-member",
          diagnosticAuthority: "semantic-authoring-policy",
          frameworkErrorCode: null,
          severity: "error",
          summary: "Missing member",
          missingInput: "member",
          missingInputs: ["member"],
          source: {
            kind: "source-span-address",
            label: "src/component.html@0..5",
            path: "src/component.html",
            start: 0,
            end: 5,
            role: "expression",
          },
          relatedInformation: [
            {
              message: "Declared by this source file.",
              source: {
                kind: "source-file-address",
                label: "src/owner.ts",
                path: "src/owner.ts",
              },
            },
            {
              message: "Exact evidence in an unavailable document.",
              source: {
                kind: "source-span-address",
                label: "src/missing.ts@0..4",
                path: "src/missing.ts",
                start: 0,
                end: 4,
                role: "name",
              },
            },
          ],
          suggestion: null,
        }],
      },
    } as never, doc, "C:/projects/app", () => null);

    expect(mapped.value[0]?.relatedInformation).toEqual([{
      location: {
        uri: "file:///c:/projects/app/src/owner.ts",
        range: {
          start: { line: 0, character: 0 },
          end: { line: 0, character: 0 },
        },
      },
      message: "Declared by this source file.",
    }]);
    expect(mapped.failures).toEqual([
      expect.stringContaining("src/missing.ts@0..4 targets a document with no readable text"),
    ]);
  });
});

describe("mapSemanticRuntimeTemplateCodeActions", () => {
  test("attaches every LSP diagnostic contributing to one semantic edit plan", () => {
    const doc = TextDocument.create(
      "file:///C:/projects/app/src/component.html",
      "html",
      7,
      "alpha\nbeta\ngamma",
    );
    const source = {
      kind: "source-span-address",
      label: "src/component.html@6..10",
      path: doc.uri,
      start: 6,
      end: 10,
      role: "expression",
    };
    const semanticDiagnostic = {
      diagnosticKind: "missing-expression-member",
      diagnosticAuthority: "semantic-authoring-policy",
      source,
    };
    const checkerDiagnostic = {
      diagnosticKind: "template-expression-typescript-diagnostic",
      diagnosticAuthority: "typescript",
      source,
    };
    const range = {
      start: { line: 1, character: 0 },
      end: { line: 1, character: 4 },
    };
    const diagnostics = [
      {
        range,
        message: "Missing member",
        data: { semanticRuntime: semanticDiagnostic },
      },
      {
        range,
        message: "TS2339: Missing member",
        data: { semanticRuntime: checkerDiagnostic },
      },
    ];

    const actions = mapSemanticRuntimeTemplateCodeActions(
      {
        value: {
          rows: [
            {
              title: "Declare member",
              kind: "quickfix",
              diagnostics: [semanticDiagnostic, checkerDiagnostic],
              repair: {
                actionKind: "declare-missing-member",
                planKind: "source-member-declaration",
                changeDomain: "app-source",
                readiness: "ready-to-plan",
                targetSourceCoverage: "all",
                actionability: "guided",
              },
              edits: [
                {
                  editKind: "declare-view-model-member",
                  source: { ...source, start: 0, end: 0 },
                  oldText: "",
                  newText: "declared",
                },
              ],
              isPreferred: true,
            },
          ],
        },
      } as never,
      () => null,
      {
        workspaceRoot: null,
        originDocument: doc,
        diagnostics,
      },
    );

    expect(actions).toHaveLength(1);
    expect(actions?.[0]?.diagnostics).toEqual(diagnostics);
  });
});

describe("source-backed edit mapping", () => {
  test("rejects zero-width insertions beyond the current document", () => {
    const doc = TextDocument.create(
      "file:///C:/projects/app/src/component.ts",
      "typescript",
      7,
      "export class Component {}",
    );
    const invalidOffset = doc.getText().length + 1;

    const mapping = mapSemanticRuntimeTemplateRenameEdit(
      {
        value: {
          status: "available",
          edits: [
            {
              editKind: "typescript-reference",
              source: {
                kind: "source-span-address",
                label: `src/component.ts@${invalidOffset}..${invalidOffset}`,
                path: doc.uri,
                start: invalidOffset,
                end: invalidOffset,
                role: "insertion",
              },
              oldText: "",
              newText: "declare member;",
            },
          ],
        },
      } as never,
      () => null,
      {
        workspaceRoot: "C:/projects/app",
        originDocument: doc,
      },
    );

    expect(mapping.edit).toBeNull();
    expect(mapping.failures).toEqual([
      expect.stringContaining("span outside the current document text"),
    ]);
  });
});

describe("mapSemanticRuntimeTemplateCompletions", () => {
  test("preserves authorable template-domain roles as specific LSP kinds", () => {
    const mapped = mapSemanticRuntimeTemplateCompletions({
      result: "answered",
      value: {
        candidates: [
          {
            name: "component",
            candidateKind: "ref-target",
            sourceKind: "framework",
          },
          { name: "click", candidateKind: "event", sourceKind: "type-system" },
          {
            name: "prevent",
            candidateKind: "event-modifier",
            sourceKind: "framework",
          },
          {
            name: "twoWay",
            candidateKind: "bindable-mode",
            sourceKind: "framework",
          },
        ],
        missingInputs: [],
      },
      page: null,
    } as never);

    expect(mapped.items.map((item) => [item.label, item.kind])).toEqual([
      ["component", CompletionItemKind.Reference],
      ["click", CompletionItemKind.Event],
      ["prevent", CompletionItemKind.Keyword],
      ["twoWay", CompletionItemKind.EnumMember],
    ]);
  });

  test("does not collapse semantic coverage into the transport paging flag", () => {
    const mapped = mapSemanticRuntimeTemplateCompletions({
      result: "answered",
      coverage: "truncated",
      value: {
        candidates: [
          {
            name: "component",
            candidateKind: "ref-target",
            sourceKind: "framework",
          },
        ],
        missingInputs: [],
      },
      page: null,
    } as never);

    expect(mapped.isIncomplete).toBe(false);
    expect(mapped.items.map((item) => item.label)).toEqual(["component"]);
  });

  test("does not expose an undisposed transport page as LSP completion narrowing", () => {
    const mapped = mapSemanticRuntimeTemplateCompletions({
      result: "answered",
      coverage: "complete",
      value: {
        candidates: [
          {
            name: "component",
            candidateKind: "ref-target",
            sourceKind: "framework",
          },
        ],
        missingInputs: [],
      },
      page: { nextCursor: "next" },
    } as never);

    expect(mapped.isIncomplete).toBe(false);
    expect(mapped.items.map((item) => item.label)).toEqual(["component"]);
  });
});

describe("mapSemanticRuntimeTemplateHover", () => {
  test("maps selected runtime member facts to markdown hover", () => {
    const mapped = mapSemanticRuntimeTemplateHover({
      value: {
        siteKind: "expression",
        expressionFrontier: null,
        missingInputs: [],
        template: { compilationLane: "authoring", source: null },
        html: {
          nodeKind: "element",
          tagName: "div",
          attributeName: null,
          attributeValue: null,
          source: null,
          attributeSource: null,
        },
        valueSite: null,
        selectedDefinition: null,
        selectedBindable: null,
        selectedMemberName: "message",
        selectedMember: {
          name: "message",
          memberKind: "property",
          typeDisplay: "string",
          isOptional: false,
          isReadonly: false,
          source: null,
        },
        memberOwnerType: {
          display: "Component",
          shapeKind: "object",
          origin: "typescript",
          source: null,
          declarationSource: null,
        },
        diagnostics: [],
      },
    } as never);

    const value = (mapped?.contents as { value?: string }).value ?? "";
    expect(value).toContain("message: string");
    expect(value).toContain("owner: `Component`");
  });

  test("qualifies an exact hover only when concrete semantic inputs are missing", () => {
    const mapped = mapSemanticRuntimeTemplateHover({
      value: {
        siteKind: "expression",
        expressionFrontier: null,
        missingInputs: [
          "expression-member-owner-type:dynamic",
          "binding-source-context:ambiguous",
          "third-gap",
        ],
        template: { compilationLane: "authoring", source: null },
        html: {
          nodeKind: "element",
          tagName: "div",
          attributeName: null,
          attributeValue: null,
          source: null,
          attributeSource: null,
        },
        valueSite: null,
        selectedDefinition: null,
        selectedBindable: null,
        selectedMemberName: "message",
        selectedMember: {
          name: "message",
          memberKind: "property",
          typeDisplay: "string",
          isOptional: false,
          isReadonly: false,
          source: null,
        },
        memberOwnerType: null,
        diagnostics: [],
      },
    } as never);

    const value = (mapped?.contents as { value?: string }).value ?? "";
    expect(value).toContain("message: string");
    expect(value).toContain("Analysis is incomplete because");
    expect(value).toContain("`expression-member-owner-type:dynamic`");
    expect(value).toContain("and 1 more input");
  });
});

describe("mapSemanticRuntimeTemplateReferences", () => {
  test("returns verified locations and names every source-backed mapping failure", () => {
    const originDocument = TextDocument.create(
      "file:///C:/projects/app/src/component.html",
      "html",
      1,
      "<template>${message}</template>",
    );
    const messageStart = originDocument.getText().indexOf("message");
    const mapping = mapSemanticRuntimeTemplateReferences({
      value: {
        rows: [
          {
            referenceKind: "template-usage",
            name: "message",
            source: {
              kind: "source-span-address",
              label: `src/component.html@${messageStart}..${messageStart + 7}`,
              path: originDocument.uri,
              start: messageStart,
              end: messageStart + 7,
              role: "name",
            },
          },
          {
            referenceKind: "typescript-usage",
            name: "message",
            source: {
              kind: "typescript-node",
              label: "src/component.ts@50..57",
              path: "src/component.ts",
              start: 50,
              end: 57,
              role: "name",
            },
          },
        ],
      },
    } as never, () => "short", {
      workspaceRoot: "C:/projects/app",
      originDocument,
      scope: "workspace",
    });

    expect(mapping.value).toHaveLength(1);
    expect(mapping.value?.[0]?.uri).toBe(canonicalDocumentUri(originDocument.uri).uri);
    expect(mapping.failures).toEqual([
      expect.stringContaining("src/component.ts@50..57"),
    ]);
  });

  test("does not treat references outside document-highlight scope as mapping failures", () => {
    const originDocument = TextDocument.create(
      "file:///C:/projects/app/src/component.html",
      "html",
      1,
      "<template>${message}</template>",
    );
    const mapping = mapSemanticRuntimeTemplateReferences({
      value: {
        rows: [{
          referenceKind: "typescript-usage",
          name: "message",
          source: {
            kind: "typescript-node",
            label: "src/component.ts@0..7",
            path: "src/component.ts",
            start: 0,
            end: 7,
            role: "name",
          },
        }],
      },
    } as never, () => null, {
      workspaceRoot: "C:/projects/app",
      originDocument,
      scope: "origin-document",
    });

    expect(mapping.value).toBeNull();
    expect(mapping.failures).toEqual([]);
  });
});

describe("mapSemanticRuntimeTemplateDefinition", () => {
  test("prefers reached member declarations over scope-introduction sources", () => {
    const componentStart = definitionText.indexOf("Component");
    const messageStart = definitionText.indexOf("message");
    const originDocument = TextDocument.create(
      "file:///C:/projects/app/src/component.html",
      "html",
      1,
      "<template>${message}</template>",
    );

    const mapped = mapSemanticRuntimeTemplateDefinition(
      {
        value: {
          selectedMember: {
            source: {
              kind: "typescript-node",
              label: `${definitionLspUri}@${componentStart}..${
                componentStart + "Component".length
              }`,
              path: definitionLspUri,
              start: componentStart,
              end: componentStart + "Component".length,
            },
            declarationSource: {
              kind: "typescript-node",
              label: `${definitionLspUri}@${messageStart}..${
                messageStart + "message".length
              }`,
              path: definitionLspUri,
              start: messageStart,
              end: messageStart + "message".length,
            },
          },
          selectedBindable: null,
          selectedDefinition: null,
        },
      } as never,
      lookupText,
      {
        workspaceRoot: "C:/projects/app",
        originDocument,
      },
    );

    expect(mapped?.[0]?.targetSelectionRange).toEqual({
      start: { line: 1, character: 2 },
      end: { line: 1, character: 9 },
    });
  });

  test("prefers bindable property targets over metadata name sources", () => {
    const componentStart = definitionText.indexOf("Component");
    const messageStart = definitionText.indexOf("message");
    const originDocument = TextDocument.create(
      "file:///C:/projects/app/src/component.html",
      "html",
      1,
      '<template><my-el message.bind="message"></my-el></template>',
    );

    const mapped = mapSemanticRuntimeTemplateDefinition(
      {
        value: {
          selectedMember: null,
          selectedBindable: {
            source: {
              kind: "typescript-node",
              label: `${definitionLspUri}@${componentStart}..${
                componentStart + "Component".length
              }`,
              path: definitionLspUri,
              start: componentStart,
              end: componentStart + "Component".length,
            },
            propertySource: {
              kind: "typescript-node",
              label: `${definitionLspUri}@${messageStart}..${
                messageStart + "message".length
              }`,
              path: definitionLspUri,
              start: messageStart,
              end: messageStart + "message".length,
            },
          },
          selectedDefinition: null,
        },
      } as never,
      lookupText,
      {
        workspaceRoot: "C:/projects/app",
        originDocument,
      },
    );

    expect(mapped?.[0]?.targetSelectionRange).toEqual({
      start: { line: 1, character: 2 },
      end: { line: 1, character: 9 },
    });
  });

  test("maps selected member source references to LSP location links", () => {
    const messageStart = definitionText.indexOf("message");
    const originDocument = TextDocument.create(
      "file:///C:/projects/app/src/component.html",
      "html",
      1,
      "<template>${message}</template>",
    );

    const mapped = mapSemanticRuntimeTemplateDefinition(
      {
        value: {
          displayText: "mock",
          siteKind: "expression",
          expressionFrontier: null,
          missingInputs: [],
          template: { compilationLane: "authoring", source: null },
          html: {
            nodeKind: "text",
            tagName: null,
            attributeName: null,
            attributeValue: null,
            source: null,
            attributeSource: null,
          },
          valueSite: null,
          selectedDefinition: null,
          selectedBindable: null,
          selectedMemberName: "message",
          selectedMember: {
            name: "message",
            memberKind: "property",
            typeDisplay: "string",
            isOptional: false,
            isReadonly: false,
            source: {
              kind: "typescript-node",
              label: `${definitionLspUri}@${messageStart}..${
                messageStart + "message".length
              }`,
              path: definitionLspUri,
              start: messageStart,
              end: messageStart + "message".length,
            },
          },
          memberOwnerType: null,
          diagnostics: [],
        },
      } as never,
      lookupText,
      {
        workspaceRoot: "C:/projects/app",
        originDocument,
      },
    );

    expect(mapped).toEqual([
      {
        targetUri: definitionUri,
        targetRange: {
          start: { line: 1, character: 2 },
          end: { line: 1, character: 9 },
        },
        targetSelectionRange: {
          start: { line: 1, character: 2 },
          end: { line: 1, character: 9 },
        },
      },
    ]);
  });

  test("selects an ordinary resource implementation rather than its explicit name literal", () => {
    const resourceText = '@customElement("my-el")\nexport class Component {}';
    const resourceUri = canonicalDocumentUri(
      "file:///C:/projects/app/src/my-el.ts",
    ).uri;
    const nameStart = resourceText.indexOf("my-el");
    const classStart = resourceText.indexOf("Component");
    const originDocument = TextDocument.create(
      "file:///C:/projects/app/src/app.html",
      "html",
      1,
      "<my-el></my-el>",
    );
    const source = (start: number, end: number) => ({
      kind: "source-span-address",
      label: `src/my-el.ts@${start}..${end}`,
      path: "src/my-el.ts",
      start,
      end,
    });

    const mapped = mapSemanticRuntimeTemplateDefinition(
      {
        value: {
          activeSource: null,
          selectedMember: null,
          selectedBindable: null,
          selectedDefinition: {
            resourceKind: "custom-element",
            name: "my-el",
            matchedName: "my-el",
            targetName: "Component",
            source: source(0, resourceText.length),
            nameSource: source(nameStart, nameStart + "my-el".length),
            matchedNameSource: source(nameStart, nameStart + "my-el".length),
            targetSource: source(classStart, classStart + "Component".length),
          },
        },
      } as never,
      (uri) => (uri === resourceUri ? resourceText : null),
      {
        workspaceRoot: "C:/projects/app",
        originDocument,
      },
    );

    expect(mapped?.[0]?.targetSelectionRange).toEqual({
      start: { line: 1, character: 13 },
      end: { line: 1, character: 22 },
    });
  });

  test("keeps a local resource carrier range while selecting its exact authored name", () => {
    const template =
      '<template as-custom-element="mode-panel"><p>local</p></template>';
    const nameStart = template.indexOf("mode-panel");
    const originDocument = TextDocument.create(
      "file:///C:/projects/app/src/component.html",
      "html",
      1,
      template,
    );
    const carrierSource = {
      kind: "source-span-address",
      label: `src/component.html@0..${template.length}`,
      path: "src/component.html",
      start: 0,
      end: template.length,
    };
    const nameSource = {
      kind: "source-span-address",
      label: `src/component.html@${nameStart}..${
        nameStart + "mode-panel".length
      }`,
      path: "src/component.html",
      start: nameStart,
      end: nameStart + "mode-panel".length,
    };

    const mapped = mapSemanticRuntimeTemplateDefinition(
      {
        value: {
          activeSource: nameSource,
          selectedMember: null,
          selectedBindable: null,
          selectedDefinition: {
            resourceKind: "custom-element",
            name: "mode-panel",
            matchedName: "mode-panel",
            targetName: null,
            source: carrierSource,
            nameSource,
            matchedNameSource: nameSource,
            targetSource: carrierSource,
          },
        },
      } as never,
      lookupText,
      {
        workspaceRoot: "C:/projects/app",
        originDocument,
      },
    );

    expect(mapped?.[0]?.targetRange).toEqual({
      start: { line: 0, character: 0 },
      end: { line: 0, character: template.length },
    });
    expect(mapped?.[0]?.targetSelectionRange).toEqual({
      start: { line: 0, character: nameStart },
      end: { line: 0, character: nameStart + "mode-panel".length },
    });
  });

  test("selects an explicit bindable alias inside its metadata carrier", () => {
    const template = '<bindable name="item" attribute="card-item"></bindable>';
    const aliasStart = template.indexOf("card-item");
    const propertyStart = definitionText.indexOf("message");
    const originDocument = TextDocument.create(
      "file:///C:/projects/app/src/component.html",
      "html",
      1,
      template,
    );
    const carrierSource = {
      kind: "source-span-address",
      label: `src/component.html@0..${template.length}`,
      path: "src/component.html",
      start: 0,
      end: template.length,
    };
    const aliasSource = {
      kind: "source-span-address",
      label: `src/component.html@${aliasStart}..${
        aliasStart + "card-item".length
      }`,
      path: "src/component.html",
      start: aliasStart,
      end: aliasStart + "card-item".length,
    };

    const mapped = mapSemanticRuntimeTemplateDefinition(
      {
        value: {
          activeSource: {
            kind: "source-span-address",
            label: "src/consumer.html@4..13",
            path: "src/consumer.html",
            start: 4,
            end: 13,
          },
          selectedMember: null,
          selectedDefinition: null,
          selectedBindable: {
            source: carrierSource,
            attributeSource: aliasSource,
            propertySource: {
              kind: "typescript-node",
              label: `${definitionLspUri}@${propertyStart}..${
                propertyStart + "message".length
              }`,
              path: definitionLspUri,
              start: propertyStart,
              end: propertyStart + "message".length,
            },
          },
        },
      } as never,
      lookupText,
      {
        workspaceRoot: "C:/projects/app",
        originDocument,
      },
    );

    expect(mapped?.[0]?.targetRange).toEqual({
      start: { line: 0, character: 0 },
      end: { line: 0, character: template.length },
    });
    expect(mapped?.[0]?.targetSelectionRange).toEqual({
      start: { line: 0, character: aliasStart },
      end: { line: 0, character: aliasStart + "card-item".length },
    });
  });

  test("returns null instead of inventing a link for broad source references", () => {
    const originDocument = TextDocument.create(
      "file:///C:/projects/app/src/component.html",
      "html",
      1,
      "<template>${message}</template>",
    );

    const mapped = mapSemanticRuntimeTemplateDefinition(
      {
        value: {
          displayText: "mock",
          siteKind: "expression",
          expressionFrontier: null,
          missingInputs: [],
          template: { compilationLane: "authoring", source: null },
          html: {
            nodeKind: "text",
            tagName: null,
            attributeName: null,
            attributeValue: null,
            source: null,
            attributeSource: null,
          },
          valueSite: null,
          selectedDefinition: {
            resourceKind: "custom-element",
            name: "my-el",
            targetName: "MyEl",
            source: {
              kind: "source-file-address",
              label: "src/my-el.ts",
              path: "src/my-el.ts",
            },
          },
          selectedBindable: null,
          selectedMemberName: null,
          selectedMember: null,
          memberOwnerType: null,
          diagnostics: [],
        },
      } as never,
      lookupText,
      {
        workspaceRoot: "C:/projects/app",
        originDocument,
      },
    );

    expect(mapped).toBeNull();
  });
});
