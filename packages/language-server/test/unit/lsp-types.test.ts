import path from "node:path";
import { describe, test, expect } from "vitest";
import {
  CodeActionKind,
  CompletionItemKind,
  CompletionItemTag,
  DiagnosticSeverity,
  LSPErrorCodes,
  ResponseError,
} from "vscode-languageserver/node";
import { TextDocument } from "vscode-languageserver-textdocument";
import { appDiagnosticPresentation } from "@aurelia-ls/semantic-runtime";
import {
  codeActionKindMatchesOnly,
  mapSemanticRuntimeAppDiagnostics,
  mapSemanticProjectConfigurationDiagnostics,
  mapSemanticRuntimeTemplateCodeActions,
  mapSemanticRuntimeTemplateDefinition,
  mapSemanticRuntimeTemplateHover,
  mapSemanticRuntimeTemplateCompletions,
  mapSemanticRuntimeTemplateReferences,
  mapSemanticRuntimeTemplateRenameEdit,
  semanticRuntimeDiagnosticCode,
  type LookupTextFn,
} from "../../src/mapping/lsp-types.js";
import { languageIdForSource } from "../../src/utils/document-kind.js";
import { WorkspaceDocumentUris } from "../../src/utils/document-uri.js";

type DocumentUri = string;
const appDocumentUris = new WorkspaceDocumentUris();
appDocumentUris.configure("file:///C:/projects/app");
const definitionLspUri = "file:///C:/projects/app/src/component.ts";
const definitionUri = appDocumentUris.resolve(definitionLspUri).uri;
const definitionText = 'export class Component {\n  message = "hello";\n}';
const textByUri = new Map<DocumentUri, string>([
  [definitionUri, definitionText],
]);

const lookupText: LookupTextFn = (uri) => textByUri.get(uri) ?? null;

function completeDiagnosticAnswer<T extends { readonly value: { readonly rows: readonly unknown[] } }>(
  answer: T,
): T {
  return {
    ...answer,
    value: {
      ...answer.value,
      presentation: appDiagnosticPresentation(answer.value.rows as never, true),
    },
  } as T;
}

function sourceReference(sourcePath: string, start: number, end: number) {
  return {
    kind: "source-span-address",
    label: `${sourcePath}@${start}..${end}`,
    path: sourcePath,
    start,
    end,
    role: "name",
  };
}

function semanticEditAt(
  uri: string,
  text: string,
  start: number,
  end: number,
  newText: string,
) {
  return {
    editKind: "typescript-reference",
    source: {
      kind: "source-span-address",
      label: `${uri}@${start}..${end}`,
      path: uri,
      start,
      end,
      role: start === end ? "insertion" : "reference",
    },
    oldText: text.slice(start, end),
    newText,
  };
}

describe("languageIdForSource", () => {
  test("returns typescript for .ts and .js files", () => {
    expect(languageIdForSource("file:///app/src/component.ts")).toBe("typescript");
    expect(languageIdForSource("file:///app/src/component.js")).toBe("javascript");
  });

  test("returns json for .json files and plaintext for unsupported source forms", () => {
    expect(languageIdForSource("file:///app/package.json")).toBe("json");
    expect(languageIdForSource("file:///app/src/component.html")).toBe("html");
    expect(languageIdForSource("file:///app/src/view.au")).toBe("plaintext");
  });
});

describe("mapSemanticProjectConfigurationDiagnostics", () => {
  test("maps exact config offsets from the current document", () => {
    const text = '{\n  "version": 3\n}';
    const uri = "file:///C:/projects/app/aurelia.project.json";
    const document = TextDocument.create(uri, "json", 4, text);
    const start = text.indexOf("3");
    const mapped = mapSemanticProjectConfigurationDiagnostics({
      value: {
        rows: [{
          projectKey: "app",
          diagnosticKind: "aurelia-project-config-unsupported-version",
          severity: "error",
          message: "Unsupported project configuration version.",
          source: {
            filePath: "C:/projects/app/aurelia.project.json",
            start,
            end: start + 1,
            startPosition: { line: 1, character: 13 },
            endPosition: { line: 1, character: 14 },
          },
        }],
      },
    } as never, document, appDocumentUris);

    expect(mapped).toEqual({
      value: [{
        range: {
          start: document.positionAt(start),
          end: document.positionAt(start + 1),
        },
        message: "Unsupported project configuration version.",
        severity: DiagnosticSeverity.Error,
        code: "aurelia-project-config-unsupported-version",
        source: "aurelia",
        data: {
          semanticRuntime: {
            queryKind: "project-configuration-diagnostics",
            projectKey: "app",
            diagnosticKind: "aurelia-project-config-unsupported-version",
            severity: "error",
            message: "Unsupported project configuration version.",
            source: {
              filePath: "C:/projects/app/aurelia.project.json",
              start,
              end: start + 1,
              startPosition: { line: 1, character: 13 },
              endPosition: { line: 1, character: 14 },
            },
          },
        },
      }],
      failures: [],
    });
  });

  test("reports source and range failures without inventing config locations", () => {
    const uri = "file:///C:/projects/app/aurelia.project.json";
    const document = TextDocument.create(uri, "json", 1, '{"version":1}');
    const row = {
      projectKey: "app",
      diagnosticKind: "aurelia-project-config-syntax",
      severity: "error",
      message: "Invalid configuration.",
      source: {
        filePath: "C:/projects/app/aurelia.project.json",
        start: 0,
        end: 1,
        startPosition: { line: 0, character: 0 },
        endPosition: { line: 0, character: 1 },
      },
    };
    const mapped = mapSemanticProjectConfigurationDiagnostics({
      value: {
        rows: [
          {
            ...row,
            source: { ...row.source, filePath: "C:/projects/app/other.json" },
          },
          {
            ...row,
            source: { ...row.source, start: 0, end: document.getText().length + 1 },
          },
        ],
      },
    } as never, document, appDocumentUris);

    expect(mapped.value).toEqual([]);
    expect(mapped.failures).toEqual([
      expect.stringContaining("not the current document"),
      expect.stringContaining("invalid source offsets"),
    ]);
  });

  test("uses workspace URI projection for remote configuration documents", () => {
    const documentUris = new WorkspaceDocumentUris();
    documentUris.configure("vscode-remote://ssh-remote+dev/home/user/my%20app");
    const uri = "vscode-remote://ssh-remote%2Bdev/home/user/my%20app/aurelia.project.json";
    const text = '{"version":3}';
    const document = TextDocument.create(uri, "json", 2, text);
    const start = text.indexOf("3");

    const mapped = mapSemanticProjectConfigurationDiagnostics({
      value: {
        rows: [{
          projectKey: "app",
          diagnosticKind: "aurelia-project-config-unsupported-version",
          severity: "error",
          message: "Unsupported project configuration version.",
          source: {
            filePath: path.normalize("/home/user/my app/aurelia.project.json"),
            start,
            end: start + 1,
            startPosition: { line: 0, character: start },
            endPosition: { line: 0, character: start + 1 },
          },
        }],
      },
    } as never, document, documentUris);

    expect(mapped.value).toEqual([
      expect.objectContaining({
        range: {
          start: document.positionAt(start),
          end: document.positionAt(start + 1),
        },
        code: "aurelia-project-config-unsupported-version",
      }),
    ]);
    expect(mapped.failures).toEqual([]);
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
      completeDiagnosticAnswer({
        value: {
          rows: [
            {
              projectKey: "app",
              diagnosticDomain: "template",
              phase: null,
              diagnosticKind: "missing-expression-member",
              diagnosticAuthority: "semantic-authoring-policy",
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
      } as never),
      doc,
      appDocumentUris,
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
    });
    expect(mapped.value[0]?.data).not.toHaveProperty("semanticRuntime.diagnosticIdentityHandle");
    expect(mapped.value[0]?.data).not.toHaveProperty("semanticRuntime.diagnosticRelations");
    expect(mapped.value[0]?.data).not.toHaveProperty("semanticRuntime.handles");
    expect(mapped.value[0]?.relatedInformation).toEqual([
      expect.objectContaining({ message: "The member is declared here." }),
    ]);
  });

  test.each(["warning", "information"] as const)(
    "keeps a %s semantic primary visible while conserving contextual checker severity and facts",
    (primarySeverity) => {
      const doc = TextDocument.create(
        "file:///C:/projects/app/src/component.html",
        "html",
        1,
        "alpha\nbeta\ngamma",
      );
      const source = sourceReference("src/component.html", 6, 10);
      const rows = [
        {
          projectKey: "app",
          diagnosticDomain: "template",
          phase: "binding",
          diagnosticKind: "missing-expression-member",
          diagnosticAuthority: "semantic-authoring-policy",
          typeScriptDiagnosticCode: null,
          frameworkErrorCode: null,
          frameworkRawErrorAuthority: null,
          severity: primarySeverity,
          summary: "Member 'beta' is not projected on the owner type.",
          missingInput: "expression-member:selected-member-missing",
          missingInputs: ["expression-member:selected-member-missing"],
          source,
          subject: { subjectKind: "template-member-access", subjectName: "beta", source },
          diagnosticIdentityHandle: null,
          relatedInformation: [{
            relationKind: "subject-declaration",
            code: null,
            message: "Owner is declared here.",
            source: sourceReference("src/component.html", 0, 5),
          }],
          suggestion: null,
          sourceRole: "template",
          relatedQueryKind: "template-diagnostics",
        },
        {
          projectKey: "app",
          diagnosticDomain: "template",
          phase: "semantic",
          diagnosticKind: "template-expression-typescript-diagnostic",
          diagnosticAuthority: "typescript",
          typeScriptDiagnosticCode: 2339,
          frameworkErrorCode: null,
          frameworkRawErrorAuthority: null,
          severity: "error",
          summary: "TS2339: Property 'beta' does not exist on type 'Owner'.",
          missingInput: "typescript:TS2339",
          missingInputs: ["typescript:TS2339"],
          source,
          subject: { subjectKind: "template-member-access", subjectName: "beta", source },
          diagnosticIdentityHandle: null,
          relatedInformation: [{
            relationKind: "subject-declaration",
            code: null,
            message: "Owner is declared here.",
            source: sourceReference("src/component.html", 0, 5),
          }],
          suggestion: null,
          sourceRole: "template",
          relatedQueryKind: "template-diagnostics",
        },
      ];

      const mapped = mapSemanticRuntimeAppDiagnostics(
        completeDiagnosticAnswer({ value: { rows } } as never),
        doc,
        appDocumentUris,
        null,
        { clientOwnsTypeScriptProgramDiagnostics: true },
      );

      expect(mapped.failures).toEqual([]);
      expect(mapped.value).toHaveLength(1);
      expect(mapped.value[0]?.severity).toBe(
        primarySeverity === "warning" ? DiagnosticSeverity.Warning : DiagnosticSeverity.Information,
      );
      expect(mapped.value[0]?.relatedInformation?.map((entry) => entry.message)).toEqual([
        "Owner is declared here.",
        "TS2339: Property 'beta' does not exist on type 'Owner'.",
      ]);
      expect(mapped.value[0]?.data).toMatchObject({
        semanticRuntime: {
          severity: primarySeverity,
          presentation: {
            rawRowCount: 2,
            primarySeverity,
            maxRawSeverity: "error",
            contextual: [{
              relation: "checker-evidence",
              diagnostic: {
                diagnosticDomain: "template",
                diagnosticKind: "template-expression-typescript-diagnostic",
                diagnosticAuthority: "typescript",
                typeScriptDiagnosticCode: 2339,
                severity: "error",
                repairAffordance: null,
              },
            }],
          },
        },
      });
      expect(mapped.value[0]?.data).not.toHaveProperty(
        "semanticRuntime.presentation.contextual.0.diagnostic.handles",
      );
      expect(mapped.value[0]?.data).not.toHaveProperty(
        "semanticRuntime.presentation.contextual.0.diagnostic.diagnosticIdentityHandle",
      );
    },
  );

  test("honors an explicit context-only weak-owner withholding decision", () => {
    const doc = TextDocument.create(
      "file:///C:/projects/app/src/component.html",
      "html",
      1,
      "alpha\nbeta\ngamma",
    );
    const source = sourceReference("src/component.html", 6, 10);
    const rows = [{
      projectKey: "app",
      diagnosticDomain: "template",
      phase: "binding",
      diagnosticKind: "weak-expression-member-owner",
      diagnosticAuthority: "semantic-authoring-policy",
      typeScriptDiagnosticCode: null,
      frameworkErrorCode: null,
      frameworkRawErrorAuthority: null,
      severity: "information",
      summary: "The index-signature owner does not expose a concrete member inventory.",
      missingInput: "expression-member-owner-type:index-signature-only",
      missingInputs: ["expression-member-owner-type:index-signature-only"],
      source,
      subject: { subjectKind: "template-member-access", subjectName: "beta", source },
      diagnosticIdentityHandle: null,
      relatedInformation: [],
      suggestion: null,
      sourceRole: "template",
      relatedQueryKind: "template-diagnostics",
    }];

    const mapped = mapSemanticRuntimeAppDiagnostics(
      completeDiagnosticAnswer({ value: { rows } } as never),
      doc,
      appDocumentUris,
    );

    expect(mapped).toEqual({ value: [], failures: [] });
  });

  test("fails the pull boundary when semantic presentation is missing or incomplete", () => {
    const doc = TextDocument.create(
      "file:///C:/projects/app/src/component.html",
      "html",
      1,
      "value",
    );
    const rows: never[] = [];

    expect(() => mapSemanticRuntimeAppDiagnostics(
      { value: { rows } } as never,
      doc,
      appDocumentUris,
    )).toThrowError(/requires a semantic diagnostic presentation/u);
    expect(() => mapSemanticRuntimeAppDiagnostics(
      {
        value: {
          rows,
          presentation: appDiagnosticPresentation(rows, false),
        },
      } as never,
      doc,
      appDocumentUris,
    )).toThrowError(/requires a complete semantic diagnostic presentation/u);
  });

  test("uses structured TypeScript codes for template overlay diagnostics without legacy inference", () => {
    const doc = TextDocument.create(
      "file:///C:/projects/app/src/component.html",
      "html",
      1,
      "alpha\nbeta\ngamma",
    );
    const mapped = mapSemanticRuntimeAppDiagnostics(
      completeDiagnosticAnswer({
        value: {
          rows: [
            {
              projectKey: "app",
              diagnosticDomain: "template",
              phase: null,
              diagnosticKind: "template-expression-typescript-diagnostic",
              diagnosticAuthority: "typescript",
              typeScriptDiagnosticCode: 2345,
              frameworkErrorCode: null,
              frameworkRawErrorAuthority: null,
              severity: "error",
              summary:
                "TS2345: Argument of type 'string' is not assignable to parameter of type 'number'.",
              missingInput: "typescript:TS9999",
              missingInputs: [],
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
      } as never),
      doc,
      appDocumentUris,
      null,
      { clientOwnsTypeScriptProgramDiagnostics: true },
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
        typeScriptDiagnosticCode: 2345,
        missingInput: "typescript:TS9999",
        missingInputs: [],
      },
    });
  });

  test("maps direct TypeScript codes structurally into the wire diagnostic and detached data", () => {
    const text = "const count: string = 1;";
    const doc = TextDocument.create(
      "file:///C:/projects/app/src/component.ts",
      "typescript",
      1,
      text,
    );
    const start = text.lastIndexOf("1");
    const answer = completeDiagnosticAnswer({
      value: {
        rows: [
          {
            projectKey: "app",
            diagnosticDomain: "typescript",
            phase: "semantic",
            diagnosticKind: "TS2322",
            diagnosticAuthority: "typescript",
            typeScriptDiagnosticCode: 2322,
            frameworkErrorCode: null,
            frameworkRawErrorAuthority: null,
            severity: "error",
            summary: "Type 'number' is not assignable to type 'string'.",
            missingInput: "typescript:TS9999",
            missingInputs: [],
            source: {
              kind: "typescript-diagnostic",
              label: `src/component.ts@${start}..${start + 1}`,
              path: "src/component.ts",
              start,
              end: start + 1,
              role: "line:0:character:22",
            },
            subject: null,
            diagnosticIdentityHandle: null,
            relatedInformation: [],
            suggestion: null,
            sourceRole: "app-source",
            relatedQueryKind: "typescript-diagnostics",
          },
        ],
      },
    } as never);
    const mapped = mapSemanticRuntimeAppDiagnostics(
      answer,
      doc,
      appDocumentUris,
    );

    expect(mapped.failures).toEqual([]);
    expect(mapped.value).toHaveLength(1);
    expect(mapped.value[0]?.source).toBe("typescript");
    expect(mapped.value[0]?.code).toBe("TS2322");
    expect(mapped.value[0]?.data).toMatchObject({
      semanticRuntime: {
        diagnosticDomain: "typescript",
        diagnosticKind: "TS2322",
        diagnosticAuthority: "typescript",
        typeScriptDiagnosticCode: 2322,
        missingInput: "typescript:TS9999",
        missingInputs: [],
      },
    });

    expect(mapSemanticRuntimeAppDiagnostics(
      answer,
      doc,
      appDocumentUris,
      null,
      { clientOwnsTypeScriptProgramDiagnostics: true },
    )).toEqual({ value: [], failures: [] });
  });

  test("prefers framework and structured TypeScript codes before the diagnostic-kind fallback", () => {
    expect(semanticRuntimeDiagnosticCode({
      diagnosticKind: "fallback-diagnostic",
      frameworkErrorCode: "AUR9999",
      typeScriptDiagnosticCode: 2345,
    } as never)).toBe("AUR9999");
    expect(semanticRuntimeDiagnosticCode({
      diagnosticKind: "fallback-diagnostic",
      frameworkErrorCode: null,
      typeScriptDiagnosticCode: 2345,
    } as never)).toBe("TS2345");
    expect(semanticRuntimeDiagnosticCode({
      diagnosticKind: "fallback-diagnostic",
      frameworkErrorCode: null,
      missingInput: "typescript:TS9999",
      missingInputs: ["typescript:TS9998"],
    } as never)).toBe("fallback-diagnostic");
  });

  test("reports a source-backed diagnostic whose authored span cannot be mapped", () => {
    const doc = TextDocument.create(
      "file:///C:/projects/app/src/component.html",
      "html",
      1,
      "short",
    );
    const mapped = mapSemanticRuntimeAppDiagnostics(completeDiagnosticAnswer({
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
    } as never), doc, appDocumentUris);

    expect(mapped.value).toEqual([]);
    expect(mapped.failures).toEqual([
      expect.stringContaining("src/component.html@10..16"),
    ]);
  });

  test("does not project a diagnostic from another source onto matching offsets in the current document", () => {
    const doc = TextDocument.create(
      "file:///C:/projects/app/src/component.html",
      "html",
      1,
      "value",
    );
    const mapped = mapSemanticRuntimeAppDiagnostics(completeDiagnosticAnswer({
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
            label: "src/other.html@0..5",
            path: "src/other.html",
            start: 0,
            end: 5,
            role: "expression",
          },
          relatedInformation: [],
          suggestion: null,
        }],
      },
    } as never), doc, appDocumentUris);

    expect(mapped.value).toEqual([]);
    expect(mapped.failures).toEqual([
      expect.stringContaining("src/other.html@0..5"),
    ]);
  });

  test("maps broad related evidence without inventing precision and reports unreadable exact evidence", () => {
    const doc = TextDocument.create(
      "file:///C:/projects/app/src/component.html",
      "html",
      1,
      "value",
    );
    const mapped = mapSemanticRuntimeAppDiagnostics(completeDiagnosticAnswer({
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
    } as never), doc, appDocumentUris, () => null);

    expect(mapped.value[0]?.relatedInformation).toEqual([{
      location: {
        uri: "file:///C:/projects/app/src/owner.ts",
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
  test("applies hierarchical context.only matching and treats an explicit empty list as no requested actions", () => {
    expect(codeActionKindMatchesOnly(CodeActionKind.QuickFix, undefined)).toBe(true);
    expect(codeActionKindMatchesOnly(CodeActionKind.QuickFix, [CodeActionKind.Empty])).toBe(true);
    expect(codeActionKindMatchesOnly(CodeActionKind.QuickFix, [CodeActionKind.QuickFix])).toBe(true);
    expect(codeActionKindMatchesOnly(CodeActionKind.QuickFix, [])).toBe(false);
    expect(codeActionKindMatchesOnly(CodeActionKind.QuickFix, [CodeActionKind.Refactor])).toBe(false);
    expect(codeActionKindMatchesOnly(CodeActionKind.QuickFix, ["quickfix.aurelia"])).toBe(false);
  });

  test("classifies a non-answer before reading code-action rows", () => {
    let failure: unknown = null;
    try {
      mapSemanticRuntimeTemplateCodeActions(
        { result: "failed", value: {} } as never,
        expect.unreachable,
        {
          documentUris: appDocumentUris,
          originDocument: TextDocument.create(
            "file:///C:/projects/app/src/component.html",
            "html",
            1,
            "<template></template>",
          ),
        },
      );
    } catch (error) {
      failure = error;
    }

    expect(failure).toBeInstanceOf(ResponseError);
    expect((failure as ResponseError<unknown>).code).toBe(LSPErrorCodes.RequestFailed);
    expect((failure as Error).message).toContain("semantic runtime returned result=failed");
  });

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
        result: "answered",
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
        documentUris: appDocumentUris,
        originDocument: doc,
        diagnostics,
      },
    );

    expect(actions).toHaveLength(1);
    expect(actions?.[0]?.diagnostics).toEqual(diagnostics);
  });

  test("keeps same-range checker diagnostics distinct by structured TypeScript code", () => {
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
    const range = {
      start: { line: 1, character: 0 },
      end: { line: 1, character: 4 },
    };
    const checkerDiagnostic = (typeScriptDiagnosticCode: number) => ({
      diagnosticKind: "template-expression-typescript-diagnostic",
      diagnosticAuthority: "typescript",
      typeScriptDiagnosticCode,
      missingInput: null,
      missingInputs: [],
      selectedMemberName: null,
      source,
    });
    const lspDiagnostic = (typeScriptDiagnosticCode: number, detachedCode: boolean) => ({
      range,
      message: `TS${typeScriptDiagnosticCode}: checker diagnostic`,
      code: `TS${typeScriptDiagnosticCode}`,
      data: {
        semanticRuntime: {
          diagnosticKind: "template-expression-typescript-diagnostic",
          diagnosticAuthority: "typescript",
          ...(detachedCode ? { typeScriptDiagnosticCode } : {}),
        },
      },
    });
    const row = (typeScriptDiagnosticCode: number) => ({
      title: "Inspect checker diagnostic",
      kind: "quickfix",
      diagnostics: [checkerDiagnostic(typeScriptDiagnosticCode)],
      repair: {},
      edits: [semanticEditAt(doc.uri, doc.getText(), 0, 0, "declared")],
      isPreferred: false,
    });
    const diagnostics = [
      lspDiagnostic(2339, false),
      lspDiagnostic(2322, true),
    ];

    const actions = mapSemanticRuntimeTemplateCodeActions(
      { result: "answered", value: { rows: [row(2339), row(2322)] } } as never,
      () => null,
      {
        documentUris: appDocumentUris,
        originDocument: doc,
        diagnostics,
      },
    );

    expect(actions).toHaveLength(2);
    expect(actions?.[0]?.diagnostics).toEqual([diagnostics[0]]);
    expect(actions?.[1]?.diagnostics).toEqual([diagnostics[1]]);
    const identities = actions?.map((action) =>
      (action.data as { semanticRuntime?: { actionIdentity?: unknown } } | undefined)
        ?.semanticRuntime?.actionIdentity
    );
    expect(identities?.every((identity) => typeof identity === "string")).toBe(true);
    expect(new Set(identities).size).toBe(2);
  });

  test("filters context-excluded and non-exact quickfix kinds before mapping edits", () => {
    const text = "abcdef";
    const doc = TextDocument.create(
      "file:///C:/projects/app/src/component.ts",
      "typescript",
      7,
      text,
    );
    const row = {
      title: "Excluded quickfix",
      kind: "quickfix",
      diagnostics: [],
      repair: {},
      edits: [semanticEditAt(doc.uri, text, 0, 1, "A")],
      isPreferred: false,
    };

    const actions = mapSemanticRuntimeTemplateCodeActions(
      {
        result: "answered",
        value: {
          rows: [row],
        },
      } as never,
      expect.unreachable,
      {
        documentUris: appDocumentUris,
        originDocument: doc,
        only: [CodeActionKind.Refactor],
      },
    );

    expect(actions).toBeNull();

    const nonExactKindActions = mapSemanticRuntimeTemplateCodeActions(
      {
        result: "answered",
        value: { rows: [{ ...row, kind: "quickfix.aurelia" }] },
      } as never,
      expect.unreachable,
      {
        documentUris: appDocumentUris,
        originDocument: doc,
        only: [CodeActionKind.Empty],
      },
    );
    expect(nonExactKindActions).toBeNull();
  });

  test("skips only the action whose same-document edits overlap", () => {
    const text = "abcdef";
    const doc = TextDocument.create(
      "file:///C:/projects/app/src/component.ts",
      "typescript",
      7,
      text,
    );
    const skipped: { title: string; failures: readonly string[] }[] = [];

    const actions = mapSemanticRuntimeTemplateCodeActions(
      {
        result: "answered",
        value: {
          rows: [
            {
              title: "Unsafe overlapping quickfix",
              kind: "quickfix",
              diagnostics: [],
              repair: {},
              edits: [
                semanticEditAt(doc.uri, text, 0, 4, "ABCD"),
                semanticEditAt(doc.uri, text, 2, 5, "CDE"),
              ],
              isPreferred: false,
            },
            {
              title: "Safe quickfix",
              kind: "quickfix",
              diagnostics: [],
              repair: {},
              edits: [semanticEditAt(doc.uri, text, 4, 6, "EF")],
              isPreferred: true,
            },
          ],
        },
      } as never,
      () => null,
      {
        documentUris: appDocumentUris,
        originDocument: doc,
        onMappingFailure: (row, failures) => skipped.push({ title: row.title, failures }),
      },
    );

    expect(actions?.map((action) => action.title)).toEqual(["Safe quickfix"]);
    expect(skipped).toEqual([{
      title: "Unsafe overlapping quickfix",
      failures: [expect.stringContaining("overlap")],
    }]);
  });
});

describe("source-backed edit mapping", () => {
  function mapRenameEdits(document: TextDocument, edits: readonly unknown[]) {
    return mapSemanticRuntimeTemplateRenameEdit(
      {
        value: {
          status: "available",
          edits,
        },
      } as never,
      () => null,
      {
        documentUris: appDocumentUris,
        originDocument: document,
      },
    );
  }

  test("rejects edits outside the workspace URI boundary before reading target text", () => {
    const doc = TextDocument.create(
      "file:///C:/projects/app/src/component.ts",
      "typescript",
      7,
      "export class Component {}",
    );
    const lookup = expect.unreachable;

    const mapping = mapSemanticRuntimeTemplateRenameEdit(
      {
        value: {
          status: "available",
          edits: [{
            editKind: "typescript-reference",
            source: {
              kind: "source-span-address",
              label: "external declaration",
              path: "C:/projects/external/dependency.ts",
              start: 0,
              end: 4,
              role: "declaration",
            },
            oldText: "name",
            newText: "renamed",
          }],
        },
      } as never,
      lookup,
      {
        documentUris: appDocumentUris,
        originDocument: doc,
      },
    );

    expect(mapping.edit).toBeNull();
    expect(mapping.failures).toEqual([
      expect.stringContaining("outside this workspace's authored URI boundary"),
    ]);
  });

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
        documentUris: appDocumentUris,
        originDocument: doc,
      },
    );

    expect(mapping.edit).toBeNull();
    expect(mapping.failures).toEqual([
      expect.stringContaining("span outside the current document text"),
    ]);
  });

  test("rejects true overlap as an all-or-nothing rename failure", () => {
    const text = "abcdef";
    const doc = TextDocument.create(
      "file:///C:/projects/app/src/component.ts",
      "typescript",
      7,
      text,
    );

    const mapping = mapRenameEdits(doc, [
      semanticEditAt(doc.uri, text, 0, 4, "ABCD"),
      semanticEditAt(doc.uri, text, 2, 5, "CDE"),
    ]);

    expect(mapping.edit).toBeNull();
    expect(mapping.failures).toEqual([expect.stringContaining("overlap")]);
  });

  test("rejects duplicate insertions at the same document offset", () => {
    const text = "abcdef";
    const doc = TextDocument.create(
      "file:///C:/projects/app/src/component.ts",
      "typescript",
      7,
      text,
    );

    const mapping = mapRenameEdits(doc, [
      semanticEditAt(doc.uri, text, 2, 2, "first"),
      semanticEditAt(doc.uri, text, 2, 2, "second"),
    ]);

    expect(mapping.edit).toBeNull();
    expect(mapping.failures).toEqual([expect.stringContaining("duplicate insertions")]);
  });

  test("allows adjacent half-open edits and insertions at edit boundaries", () => {
    const text = "abcdef";
    const doc = TextDocument.create(
      "file:///C:/projects/app/src/component.ts",
      "typescript",
      7,
      text,
    );

    const mapping = mapRenameEdits(doc, [
      semanticEditAt(doc.uri, text, 0, 2, "AB"),
      semanticEditAt(doc.uri, text, 2, 2, "inserted"),
      semanticEditAt(doc.uri, text, 2, 4, "CD"),
    ]);

    expect(mapping.failures).toEqual([]);
    expect(mapping.edit?.documentChanges).toEqual([
      expect.objectContaining({ edits: expect.arrayContaining([
        expect.objectContaining({ newText: "AB" }),
        expect.objectContaining({ newText: "inserted" }),
        expect.objectContaining({ newText: "CD" }),
      ]) }),
    ]);
  });
});

describe("mapSemanticRuntimeTemplateCompletions", () => {
  const completionText = "<template>${m}</template>";
  const completionStart = completionText.indexOf("m");
  const completionUri = appDocumentUris.uriForWorkspaceRelativePath("src/component.html")!;
  const completionDocument = TextDocument.create(completionUri, "html", 1, completionText);
  const completionOptions = {
    documentUris: appDocumentUris,
    originDocument: completionDocument,
  };
  const edit = (newText: string, start = completionStart, end = completionStart + 1) => ({
    source: {
      kind: "source-span-address",
      label: `src/component.html@${start}..${end}`,
      path: "src/component.html",
      start,
      end,
    },
    newText,
  });
  const completionCandidate = (overrides: Record<string, unknown>) => ({
    name: "candidate",
    candidateKind: "type-member",
    sourceKind: "type-system",
    summary: null,
    typeDisplay: "string",
    memberKind: "property",
    memberVisibility: "public",
    memberIsOptional: false,
    memberIsReadonly: false,
    memberIsDeprecated: false,
    aureliaHookKind: null,
    edit: edit("candidate"),
    ...overrides,
  });

  test("preserves authorable template-domain roles as specific LSP kinds", () => {
    const mapped = mapSemanticRuntimeTemplateCompletions({
      result: "answered",
      value: {
        candidates: [
          {
            name: "component",
            candidateKind: "ref-target",
            sourceKind: "framework",
            edit: edit("component"),
          },
          { name: "click", candidateKind: "event", sourceKind: "type-system", edit: edit("click") },
          {
            name: "prevent",
            candidateKind: "event-modifier",
            sourceKind: "framework",
            edit: edit("prevent"),
          },
          {
            name: "twoWay",
            candidateKind: "bindable-mode",
            sourceKind: "framework",
            edit: edit("twoWay"),
          },
        ],
        missingInputs: [],
      },
      page: null,
    } as never, completionOptions);

    expect(mapped.failures).toEqual([]);
    expect(mapped.value?.items.map((item) => [item.label, item.kind])).toEqual([
      ["click", CompletionItemKind.Event],
      ["component", CompletionItemKind.Reference],
      ["prevent", CompletionItemKind.Keyword],
      ["twoWay", CompletionItemKind.EnumMember],
    ]);
    expect(mapped.value?.items.find((item) => item.label === "component")?.textEdit).toEqual({
      range: {
        start: completionDocument.positionAt(completionStart),
        end: completionDocument.positionAt(completionStart + 1),
      },
      newText: "component",
    });
  });

  test("orders both checker-backed lanes by IDE quality and marks deprecated members", () => {
    const mapped = mapSemanticRuntimeTemplateCompletions({
      result: "answered",
      value: {
        candidates: [
          completionCandidate({
            name: "privateText",
            candidateKind: "binding-context-slot",
            sourceKind: "binding-scope",
            memberVisibility: "private",
            edit: edit("privateText"),
          }),
          completionCandidate({
            name: "legacyStockText",
            memberIsDeprecated: true,
            edit: edit("legacyStockText"),
          }),
          completionCandidate({
            name: "binding",
            candidateKind: "binding-context-slot",
            sourceKind: "binding-scope",
            aureliaHookKind: "component-lifecycle",
            memberKind: "method",
            edit: edit("binding"),
          }),
          completionCandidate({
            name: "protectedText",
            memberVisibility: "protected",
            edit: edit("protectedText"),
          }),
          completionCandidate({
            name: "stockText",
            edit: edit("stockText"),
          }),
          completionCandidate({
            name: "activeItem",
            candidateKind: "binding-context-slot",
            sourceKind: "binding-scope",
            edit: edit("activeItem"),
          }),
        ],
      },
    } as never, completionOptions);

    expect(mapped.failures).toEqual([]);
    expect(mapped.value?.items.map((item) => item.label)).toEqual([
      "activeItem",
      "stockText",
      "binding",
      "protectedText",
      "privateText",
      "legacyStockText",
    ]);
    expect(mapped.value?.items.map((item) => item.sortText)).toEqual([
      "0000",
      "0001",
      "0002",
      "0003",
      "0004",
      "0005",
    ]);
    expect(mapped.value?.items.find((item) => item.label === "stockText")?.tags).toBeUndefined();
    expect(mapped.value?.items.find((item) => item.label === "legacyStockText")?.tags)
      .toEqual([CompletionItemTag.Deprecated]);
    expect(mapped.value?.items.find((item) => item.label === "legacyStockText")?.data)
      .toMatchObject({ semanticRuntime: { memberIsDeprecated: true } });
  });

  test("maps the remaining list when semantic admission has excluded an unauthorable checker row", () => {
    const mapped = mapSemanticRuntimeTemplateCompletions({
      result: "answered",
      value: {
        // The semantic completion boundary has already excluded the owner's `__@iterator@...` row.
        candidates: [
          completionCandidate({ name: "stockText", edit: edit("stockText") }),
          completionCandidate({
            name: "protectedText",
            memberVisibility: "protected",
            edit: edit("protectedText"),
          }),
        ],
      },
    } as never, completionOptions);

    expect(mapped.failures).toEqual([]);
    expect(mapped.value?.items.map((item) => item.label)).toEqual(["stockText", "protectedText"]);
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
            edit: edit("component"),
          },
        ],
        missingInputs: [],
      },
      page: null,
    } as never, completionOptions);

    expect(mapped.value?.isIncomplete).toBe(false);
    expect(mapped.value?.items.map((item) => item.label)).toEqual(["component"]);
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
            edit: edit("component"),
          },
        ],
        missingInputs: [],
      },
      page: { nextCursor: "next" },
    } as never, completionOptions);

    expect(mapped.value?.isIncomplete).toBe(false);
    expect(mapped.value?.items.map((item) => item.label)).toEqual(["component"]);
  });

  test("maps zero-width semantic insertion plans without widening them", () => {
    const mapped = mapSemanticRuntimeTemplateCompletions({
      result: "answered",
      value: {
        candidates: [{
          name: "message",
          candidateKind: "type-member",
          sourceKind: "type-system",
          edit: edit("message", completionStart, completionStart),
        }],
      },
    } as never, completionOptions);

    expect(mapped.value?.items[0]?.textEdit).toEqual({
      range: {
        start: completionDocument.positionAt(completionStart),
        end: completionDocument.positionAt(completionStart),
      },
      newText: "message",
    });
  });

  test("refuses the whole completion list when an edit plan targets another document", () => {
    const mapped = mapSemanticRuntimeTemplateCompletions({
      result: "answered",
      value: {
        candidates: [{
          name: "message",
          candidateKind: "type-member",
          sourceKind: "type-system",
          edit: {
            ...edit("message"),
            source: { ...edit("message").source, path: "src/other.html" },
          },
        }],
      },
    } as never, completionOptions);

    expect(mapped.value).toBeNull();
    expect(mapped.failures).toEqual([expect.stringContaining("does not edit the requesting document")]);
  });

  test("classifies a non-answered envelope before reading completion candidates", () => {
    const mapped = mapSemanticRuntimeTemplateCompletions({
      result: "unsupported",
      value: {},
    } as never, completionOptions);

    expect(mapped).toEqual({
      value: null,
      failures: ["Semantic runtime returned completion result=unsupported."],
    });
  });
});

describe("mapSemanticRuntimeTemplateHover", () => {
  const hoverText = "<template><product-card item.bind=\"message\">${message}</product-card></template>";
  const hoverUri = appDocumentUris.uriForWorkspaceRelativePath("src/component.html")!;
  const hoverDocument = TextDocument.create(hoverUri, "html", 7, hoverText);
  const messageStart = hoverText.lastIndexOf("message");
  const messageSource = {
    kind: "source-span-address",
    label: `src/component.html@${messageStart}..${messageStart + "message".length}`,
    path: "src/component.html",
    start: messageStart,
    end: messageStart + "message".length,
  };
  const hoverOptions = {
    documentUris: appDocumentUris,
    originDocument: hoverDocument,
  };
  const expressionText = "<template>${$this}</template>";
  const expressionUri = appDocumentUris.uriForWorkspaceRelativePath("src/expression.html")!;
  const expressionDocument = TextDocument.create(expressionUri, "html", 3, expressionText);
  const expressionStart = expressionText.indexOf("$this");
  const expressionSource = {
    kind: "source-span-address",
    label: `src/expression.html@${expressionStart}..${expressionStart + "$this".length}`,
    path: "src/expression.html",
    start: expressionStart,
    end: expressionStart + "$this".length,
    role: "expression",
  };
  const expressionOptions = {
    documentUris: appDocumentUris,
    originDocument: expressionDocument,
  };

  function expressionHoverAnswer(
    expressionOverrides: Record<string, unknown> = {},
    valueOverrides: Record<string, unknown> = {},
    answerOverrides: Record<string, unknown> = {},
  ) {
    return {
      schemaVersion: "0.2",
      result: "answered",
      selection: "exact",
      coverage: "complete",
      summary: "mock",
      ...answerOverrides,
      value: {
        displayText: "mock",
        siteKind: "expression",
        activeSource: expressionSource,
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
        selectedMemberName: null,
        selectedMember: null,
        selectedExpression: {
          expressionKind: "AccessThis",
          typeDisplay: "ExpressionApp",
          typeShapeKind: "class",
          typeOrigin: "type-checker",
          openKind: null,
          openReason: null,
          source: expressionSource,
          typeSource: null,
          typeDeclarationSource: null,
          ...expressionOverrides,
        },
        memberOwnerType: null,
        diagnostics: [],
        ...valueOverrides,
      },
    } as never;
  }

  test("maps selected runtime member facts to markdown hover", () => {
    const mapped = mapSemanticRuntimeTemplateHover({
      schemaVersion: "0.2",
      result: "answered",
      selection: "exact",
      coverage: "complete",
      summary: "mock",
      value: {
        displayText: "must not be copied into native hover",
        siteKind: "expression",
        activeSource: messageSource,
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
    } as never, hoverOptions);

    const value = (mapped.value?.contents as { value?: string }).value ?? "";
    expect(value).toContain("message: string");
    expect(value).not.toContain("owner:");
    expect(value).not.toContain("owner origin:");
    expect(value).not.toContain("must not be copied");
    expect(mapped.value?.range).toEqual({
      start: hoverDocument.positionAt(messageStart),
      end: hoverDocument.positionAt(messageStart + "message".length),
    });
    expect(mapped.failures).toEqual([]);
  });

  test("uses typed uncertainty without exposing raw missing inputs", () => {
    const mapped = mapSemanticRuntimeTemplateHover({
      schemaVersion: "0.2",
      result: "answered",
      selection: "exact",
      coverage: "open",
      summary: "mock",
      value: {
        displayText: "mock",
        siteKind: "expression",
        activeSource: messageSource,
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
          typeDisplay: null,
          isOptional: false,
          isReadonly: false,
          source: null,
        },
        uncertainty: {
          category: "type-information-incomplete",
          affectedDomain: "member",
          affectedLocus: "selected-member",
        },
        memberOwnerType: null,
        diagnostics: [],
      },
    } as never, hoverOptions);

    const value = (mapped.value?.contents as { value?: string }).value ?? "";
    expect(value).toContain("message");
    expect(value).not.toContain("message: string");
    expect(value).toContain("Type unavailable for this expression.");
    expect(value).not.toContain("expression-member-owner-type:dynamic");
    expect(value).not.toContain("binding-source-context:ambiguous");
    expect(value).not.toContain("third-gap");
  });

  test("maps closed and open bare current-context expressions with exact range and pressure", () => {
    const closed = mapSemanticRuntimeTemplateHover(
      expressionHoverAnswer(),
      expressionOptions,
    );
    const closedMarkdown = (closed.value?.contents as { value?: string }).value ?? "";
    expect(closed.value?.range).toEqual({
      start: expressionDocument.positionAt(expressionStart),
      end: expressionDocument.positionAt(expressionStart + "$this".length),
    });
    expect(closedMarkdown).toContain("$this: ExpressionApp");
    expect(closedMarkdown).toContain("Current Aurelia binding context.");
    expect(closedMarkdown).not.toContain("type shape");
    expect(closedMarkdown).not.toContain("type origin");
    expect(closed.failures).toEqual([]);

    const open = mapSemanticRuntimeTemplateHover(
      expressionHoverAnswer({
        typeDisplay: "{ item: AccessUseItem; }",
        typeShapeKind: "object",
        typeOrigin: "synthetic-template-type",
        openKind: "missing-context-type",
        openReason: "The repeated binding context has no closed aggregate context type.",
      }, {
        missingInputs: ["selected-expression-type:missing-context-type"],
        uncertainty: {
          category: "type-information-incomplete",
          affectedDomain: "binding-context",
          affectedLocus: "selected-expression",
        },
      }, {
        coverage: "open",
      }),
      expressionOptions,
    );
    const openMarkdown = (open.value?.contents as { value?: string }).value ?? "";
    expect(open.value?.range).toEqual(closed.value?.range);
    expect(openMarkdown).toContain("$this: { item: AccessUseItem; }");
    expect(openMarkdown).toContain("Current binding-context type is unavailable.");
    expect(openMarkdown).not.toContain("missing-context-type");
    expect(openMarkdown).not.toContain("The repeated binding context");
    expect(openMarkdown).not.toContain("selected-expression-type:");
    expect(open.failures).toEqual([]);
  });

  test("fails closed when a bare expression is co-selected with member evidence", () => {
    const conflicts: Array<Record<string, unknown>> = [{
      selectedMemberName: "value",
    }, {
      selectedMember: {
        name: "value",
        memberKind: "property",
        typeDisplay: "string",
        isOptional: false,
        isReadonly: false,
        source: null,
      },
    }, {
      memberOwnerType: {
        display: "ExpressionApp",
        shapeKind: "class",
        origin: "type-checker",
        source: null,
        declarationSource: null,
      },
    }];

    for (const conflict of conflicts) {
      expect(mapSemanticRuntimeTemplateHover(
        expressionHoverAnswer({}, conflict),
        expressionOptions,
      )).toEqual({
        value: null,
        failures: ["Hover cannot select both a member and a bare expression."],
      });
    }
  });

  test("fails closed for non-exact, foreign, mismatched, and out-of-bounds expression sources", () => {
    const nonExact = {
      kind: "source-file-address",
      label: "src/expression.html",
      path: "src/expression.html",
    };
    expect(mapSemanticRuntimeTemplateHover(
      expressionHoverAnswer({ source: nonExact }),
      expressionOptions,
    ).failures).toEqual(["Hover selected expression source has no exact authored span."]);

    const foreign = {
      ...expressionSource,
      label: `src/foreign.html@${expressionStart}..${expressionStart + "$this".length}`,
      path: "src/foreign.html",
    };
    expect(mapSemanticRuntimeTemplateHover(
      expressionHoverAnswer({ source: foreign }),
      expressionOptions,
    ).failures).toEqual(["Hover selected expression source does not target the requesting document."]);

    const mismatched = {
      ...expressionSource,
      label: `src/expression.html@${expressionStart + 1}..${expressionStart + "$this".length}`,
      start: expressionStart + 1,
    };
    expect(mapSemanticRuntimeTemplateHover(
      expressionHoverAnswer({ source: mismatched }),
      expressionOptions,
    ).failures).toEqual(["Hover selected expression source does not match the active authored range."]);

    const outOfBounds = {
      ...expressionSource,
      label: "src/expression.html@999..1004",
      start: 999,
      end: 1004,
    };
    expect(mapSemanticRuntimeTemplateHover(
      expressionHoverAnswer({ source: outOfBounds }, { activeSource: outOfBounds }),
      expressionOptions,
    ).failures).toEqual(["Hover active source is outside the current document text."]);
  });

  test("fails closed for invalid expression text, kind, and unqualified missing type", () => {
    const wrongText = "<template>${$that}</template>";
    const wrongTextDocument = TextDocument.create(expressionUri, "html", 4, wrongText);
    const wrongTextStart = wrongText.indexOf("$that");
    const wrongTextSource = {
      ...expressionSource,
      label: `src/expression.html@${wrongTextStart}..${wrongTextStart + "$that".length}`,
      start: wrongTextStart,
      end: wrongTextStart + "$that".length,
    };
    expect(mapSemanticRuntimeTemplateHover(
      expressionHoverAnswer({ source: wrongTextSource }, { activeSource: wrongTextSource }),
      { ...expressionOptions, originDocument: wrongTextDocument },
    ).failures).toEqual([
      "Hover selected expression is not the exact authored current-context `$this` token.",
    ]);

    expect(mapSemanticRuntimeTemplateHover(
      expressionHoverAnswer({ expressionKind: "AccessBoundary" }),
      expressionOptions,
    ).failures).toEqual([
      "Hover selected expression is not the exact authored current-context `$this` token.",
    ]);

    expect(mapSemanticRuntimeTemplateHover(
      expressionHoverAnswer({ typeDisplay: null }),
      expressionOptions,
    ).failures).toEqual([
      "Hover selected expression has neither a type nor typed binding-context uncertainty.",
    ]);

    const openWithRawPressureOnly = mapSemanticRuntimeTemplateHover(
      expressionHoverAnswer({
        openKind: "missing-context-type",
        openReason: "Missing aggregate context type.",
      }, {
        missingInputs: [],
      }, {
        coverage: "open",
      }),
      expressionOptions,
    );
    expect(openWithRawPressureOnly.failures).toEqual([]);
    const openMarkdown = (openWithRawPressureOnly.value?.contents as { value?: string }).value ?? "";
    expect(openMarkdown).not.toContain("missing-context-type");
    expect(openMarkdown).not.toContain("Missing aggregate context type");
  });

  test("preserves the exact bindable range and renders only the presenter-selected diagnostic", () => {
    const start = hoverText.indexOf("item.bind");
    const mapped = mapSemanticRuntimeTemplateHover({
      schemaVersion: "0.2",
      result: "answered",
      selection: "exact",
      coverage: "complete",
      summary: "mock",
      value: {
        displayText: "mock",
        siteKind: "attribute-name",
        activeSource: {
          kind: "source-span-address",
          label: `src/component.html@${start}..${start + "item".length}`,
          path: "src/component.html",
          start,
          end: start + "item".length,
        },
        expressionFrontier: null,
        missingInputs: [],
        template: { compilationLane: "authoring", source: null },
        html: {
          nodeKind: "element",
          tagName: "product-card",
          attributeName: "item.bind",
          attributeValue: "message",
          source: null,
          attributeSource: {
            kind: "source-span-address",
            label: `src/component.html@${start}..${start + "item.bind".length}`,
            path: "src/component.html",
            start,
            end: start + "item.bind".length,
          },
        },
        valueSite: { bindingCommandName: "bind" },
        selectedDefinition: {
          resourceKind: "custom-element",
          name: "product-card",
          matchedName: "product-card",
          targetName: "ProductCard",
          source: null,
          nameSource: null,
          matchedNameSource: null,
          targetSource: null,
        },
        selectedBindable: {
          name: "item",
          attribute: "item",
          callback: "itemChanged",
          mode: "toView",
          setterKind: "property",
          setterTargetName: "item",
          nullable: false,
          valueType: "CatalogItem | null",
        },
        selectedMemberName: null,
        selectedMember: null,
        memberOwnerType: null,
        uncertainty: null,
        diagnostics: [{
          diagnosticKind: "missing-expression-member",
          diagnosticAuthority: "semantic-authoring-policy",
          frameworkErrorCode: null,
          severity: "error",
          summary: "First diagnostic.",
          source: {
            kind: "source-span-address",
            label: `src/component.html@${start}..${start + "item.bind".length}`,
            path: "src/component.html",
            start,
            end: start + "item.bind".length,
          },
        }, {
          diagnosticKind: "template-compiler-error",
          diagnosticAuthority: "framework-error-code",
          frameworkErrorCode: "AUR0701",
          severity: "warning",
          summary: "Second diagnostic.",
        }, {
          diagnosticKind: "template-expression-typescript-diagnostic",
          diagnosticAuthority: "typescript",
          typeScriptDiagnosticCode: 2345,
          frameworkErrorCode: null,
          severity: "error",
          summary: "Third diagnostic.",
          missingInput: "typescript:TS9999",
          missingInputs: [],
        }],
        diagnosticPresentation: {
          kind: "presented",
          rawRowCount: 3,
          group: {
            groupKey: "missing:item",
            subject: null,
            primary: {
              rowId: "missing:item",
              rowIndex: 0,
              role: "primary",
              relation: null,
            },
            related: [],
            rawRowCount: 1,
            primarySeverity: "error",
            maxRawSeverity: "error",
          },
        },
      },
    } as never, hoverOptions);

    const markdown = (mapped.value?.contents as { value?: string }).value ?? "";
    expect(mapped.value?.range).toEqual({
      start: hoverDocument.positionAt(start),
      end: hoverDocument.positionAt(start + "item".length),
    });
    expect(markdown).toContain("(bindable) item: CatalogItem | null");
    expect(markdown).toContain("Default mode: to view.");
    expect(markdown).not.toContain("nullable");
    expect(markdown).toContain("First diagnostic.");
    expect(markdown).toContain("Error `missing-expression-member`");
    expect(markdown).not.toContain("Second diagnostic.");
    expect(markdown).not.toContain("AUR0701");
    expect(markdown).not.toContain("Third diagnostic.");
    expect(markdown).not.toContain("TS2345");
    expect(markdown).not.toContain("TS9999");
    expect(mapped.failures).toEqual([]);
  });

  test("fails closed for non-answers and invalid active spans", () => {
    const nonAnswer = mapSemanticRuntimeTemplateHover({
      result: "failed",
      value: {},
    } as never, hoverOptions);
    expect(nonAnswer).toEqual({
      value: null,
      failures: ["Semantic runtime returned hover result=failed."],
    });

    const missingRange = mapSemanticRuntimeTemplateHover({
      schemaVersion: "0.2",
      result: "answered",
      selection: "exact",
      coverage: "complete",
      summary: "mock",
      value: {
        displayText: "mock",
        siteKind: "expression",
        activeSource: null,
        expressionFrontier: null,
        missingInputs: [],
        template: { compilationLane: "authoring", source: null },
        html: { nodeKind: "element", tagName: "div", attributeName: null, attributeValue: null },
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
    } as never, hoverOptions);
    expect(missingRange).toEqual({
      value: null,
      failures: ["Hover active source has no exact authored span."],
    });

    const invalidRange = mapSemanticRuntimeTemplateHover({
      schemaVersion: "0.2",
      result: "answered",
      selection: "exact",
      coverage: "complete",
      summary: "mock",
      value: {
        displayText: "mock",
        siteKind: "expression",
        activeSource: {
          kind: "source-span-address",
          label: "src/component.html@0..9999",
          path: "src/component.html",
          start: 0,
          end: 9999,
        },
        expressionFrontier: null,
        missingInputs: [],
        template: { compilationLane: "authoring", source: null },
        html: { nodeKind: "element", tagName: "div", attributeName: null, attributeValue: null },
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
    } as never, hoverOptions);
    expect(invalidRange).toEqual({
      value: null,
      failures: ["Hover active source is outside the current document text."],
    });
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
      result: "answered",
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
      documentUris: appDocumentUris,
      originDocument,
      scope: "workspace",
    });

    expect(mapping.value).toHaveLength(1);
    expect(mapping.value?.[0]?.uri).toBe(appDocumentUris.resolve(originDocument.uri).uri);
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
      result: "answered",
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
      documentUris: appDocumentUris,
      originDocument,
      scope: "origin-document",
    });

    expect(mapping.value).toBeNull();
    expect(mapping.failures).toEqual([]);
  });

  test("classifies a non-answered envelope before reading reference rows", () => {
    const originDocument = TextDocument.create(
      "file:///C:/projects/app/src/component.html",
      "html",
      1,
      "<template>${message}</template>",
    );
    const mapping = mapSemanticRuntimeTemplateReferences({
      result: "failed",
      value: {},
    } as never, () => null, {
      documentUris: appDocumentUris,
      originDocument,
      scope: "workspace",
    });

    expect(mapping).toEqual({
      value: null,
      failures: ["Semantic runtime returned references result=failed."],
    });
  });
});

describe("mapSemanticRuntimeTemplateDefinition", () => {
  test.each(["unsupported", "invalid", "failed"] as const)(
    "classifies a %s envelope before interpreting no-target as ordinary absence",
    (result) => {
      const originDocument = TextDocument.create(
        "file:///C:/projects/app/src/component.html",
        "html",
        1,
        "<template>${message}</template>",
      );
      const mapped = mapSemanticRuntimeTemplateDefinition({
        result,
        value: {
          selectedMember: null,
          selectedBindable: null,
          selectedDefinition: null,
        },
      } as never, lookupText, {
        documentUris: appDocumentUris,
        originDocument,
      });

      expect(mapped).toEqual({
        value: null,
        failures: [`Semantic runtime returned definition result=${result}.`],
      });
    },
  );

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
        result: "answered",
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
        documentUris: appDocumentUris,
        originDocument,
      },
    );

    expect(mapped.value?.[0]?.targetSelectionRange).toEqual({
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
        result: "answered",
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
        documentUris: appDocumentUris,
        originDocument,
      },
    );

    expect(mapped.value?.[0]?.targetSelectionRange).toEqual({
      start: { line: 1, character: 2 },
      end: { line: 1, character: 9 },
    });
  });

  test("matches contextual bindable callback sources across URI spellings", () => {
    const template = '<bindable name="item" callback="itemChanged"></bindable>';
    const templateUri = "file:///C:/projects/app/src/callback-component.html";
    const callbackStart = template.indexOf("itemChanged");
    const targetText = [
      "export class CallbackComponent {",
      "  item = null;",
      "  itemChanged() {}",
      "}",
    ].join("\n");
    const targetLspUri = "file:///C:/projects/app/src/callback-component.ts";
    const targetUri = appDocumentUris.resolve(targetLspUri).uri;
    const propertyStart = targetText.indexOf("item =");
    const callbackTargetStart = targetText.indexOf("itemChanged");
    const originDocument = TextDocument.create(templateUri, "html", 1, template);
    const targetDocument = TextDocument.create(targetUri, "typescript", 1, targetText);

    const mapped = mapSemanticRuntimeTemplateDefinition(
      {
        result: "answered",
        value: {
          activeSource: sourceReference(
            templateUri,
            callbackStart,
            callbackStart + "itemChanged".length,
          ),
          selectedMember: null,
          selectedDefinition: null,
          selectedBindable: {
            source: sourceReference("src/callback-component.html", 0, template.length),
            callbackSource: sourceReference(
              "src/callback-component.html",
              callbackStart,
              callbackStart + "itemChanged".length,
            ),
            callbackTargetSource: sourceReference(
              "src/callback-component.ts",
              callbackTargetStart,
              callbackTargetStart + "itemChanged".length,
            ),
            propertySource: sourceReference(
              "src/callback-component.ts",
              propertyStart,
              propertyStart + "item".length,
            ),
          },
        },
      } as never,
      (uri) => (uri === targetUri ? targetText : null),
      {
        documentUris: appDocumentUris,
        originDocument,
      },
    );

    expect(mapped.failures).toEqual([]);
    expect(mapped.value?.[0]?.targetUri).toBe(targetUri);
    expect(mapped.value?.[0]?.targetSelectionRange).toEqual({
      start: targetDocument.positionAt(callbackTargetStart),
      end: targetDocument.positionAt(callbackTargetStart + "itemChanged".length),
    });
  });

  test("routes contextual bindable set metadata to its setter target", () => {
    const template = '<bindable name="item" set="normalizeItem"></bindable>';
    const templateUri = "file:///C:/projects/app/src/setter-component.html";
    const setStart = template.indexOf("normalizeItem");
    const targetText = [
      "export function normalizeItem(value: unknown) {",
      "  return value;",
      "}",
    ].join("\n");
    const targetLspUri = "file:///C:/projects/app/src/setter-component.ts";
    const targetUri = appDocumentUris.resolve(targetLspUri).uri;
    const setterTargetStart = targetText.indexOf("normalizeItem");
    const originDocument = TextDocument.create(templateUri, "html", 1, template);
    const targetDocument = TextDocument.create(targetUri, "typescript", 1, targetText);

    const mapped = mapSemanticRuntimeTemplateDefinition(
      {
        result: "answered",
        value: {
          activeSource: sourceReference(templateUri, setStart, setStart + "normalizeItem".length),
          selectedMember: null,
          selectedDefinition: null,
          selectedBindable: {
            source: sourceReference("src/setter-component.html", 0, template.length),
            setSource: sourceReference(
              "src/setter-component.html",
              setStart,
              setStart + "normalizeItem".length,
            ),
            setterTargetSource: sourceReference(
              "src/setter-component.ts",
              setterTargetStart,
              setterTargetStart + "normalizeItem".length,
            ),
          },
        },
      } as never,
      (uri) => (uri === targetUri ? targetText : null),
      {
        documentUris: appDocumentUris,
        originDocument,
      },
    );

    expect(mapped.failures).toEqual([]);
    expect(mapped.value?.[0]?.targetUri).toBe(targetUri);
    expect(mapped.value?.[0]?.targetSelectionRange).toEqual({
      start: targetDocument.positionAt(setterTargetStart),
      end: targetDocument.positionAt(setterTargetStart + "normalizeItem".length),
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
        result: "answered",
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
        documentUris: appDocumentUris,
        originDocument,
      },
    );

    expect(mapped.value).toEqual([
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
    const resourceUri = appDocumentUris.resolve("file:///C:/projects/app/src/my-el.ts").uri;
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
        result: "answered",
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
        documentUris: appDocumentUris,
        originDocument,
      },
    );

    expect(mapped.value?.[0]?.targetSelectionRange).toEqual({
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
        result: "answered",
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
        documentUris: appDocumentUris,
        originDocument,
      },
    );

    expect(mapped.value?.[0]?.targetRange).toEqual({
      start: { line: 0, character: 0 },
      end: { line: 0, character: template.length },
    });
    expect(mapped.value?.[0]?.targetSelectionRange).toEqual({
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
        result: "answered",
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
        documentUris: appDocumentUris,
        originDocument,
      },
    );

    expect(mapped.value?.[0]?.targetRange).toEqual({
      start: { line: 0, character: 0 },
      end: { line: 0, character: template.length },
    });
    expect(mapped.value?.[0]?.targetSelectionRange).toEqual({
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
        result: "answered",
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
        documentUris: appDocumentUris,
        originDocument,
      },
    );

    expect(mapped).toEqual({ value: null, failures: [] });
  });

  test("names URI, document-text, and selection-range mapping failures", () => {
    const originDocument = TextDocument.create(
      "file:///C:/projects/app/src/component.html",
      "html",
      1,
      "<template>${message}</template>",
    );
    const source = (end: number) => ({
      kind: "typescript-node",
      label: `${definitionLspUri}@0..${end}`,
      path: definitionLspUri,
      start: 0,
      end,
    });
    const answer = (memberSource: ReturnType<typeof source>) => ({
      result: "answered",
      value: {
        selectedMember: { source: memberSource },
        selectedBindable: null,
        selectedDefinition: null,
      },
    }) as never;

    const unconfiguredDocumentUris = new WorkspaceDocumentUris();
    const uriFailure = mapSemanticRuntimeTemplateDefinition(
      answer({ ...source(1), path: "src/component.ts" }),
      () => null,
      { documentUris: unconfiguredDocumentUris, originDocument },
    );
    expect(uriFailure).toEqual({
      value: null,
      failures: [expect.stringContaining("workspace document URI")],
    });

    const textFailure = mapSemanticRuntimeTemplateDefinition(
      answer(source(1)),
      () => null,
      { documentUris: appDocumentUris, originDocument },
    );
    expect(textFailure).toEqual({
      value: null,
      failures: [expect.stringContaining("no readable document text")],
    });

    const rangeFailure = mapSemanticRuntimeTemplateDefinition(
      answer(source(definitionText.length + 1)),
      () => definitionText,
      { documentUris: appDocumentUris, originDocument },
    );
    expect(rangeFailure).toEqual({
      value: null,
      failures: [expect.stringContaining("selection span outside the current document text")],
    });
  });
});
