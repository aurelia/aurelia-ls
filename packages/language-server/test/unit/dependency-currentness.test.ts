import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  DocumentDiagnosticReportKind,
  type CancellationToken,
  type DocumentDiagnosticParams,
  type DocumentDiagnosticReport,
} from "vscode-languageserver/node";
import { TextDocument } from "vscode-languageserver-textdocument";
import { afterEach, describe, expect, test, vi } from "vitest";

import { createServerContext } from "../../src/context.js";
import { registerDiagnosticHandlers } from "../../src/handlers/diagnostics.js";

const temporaryRoots: string[] = [];

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

describe("language-server dependency currentness", () => {
  test("revalidates an unowned dependency before accepting an unchanged diagnostic result", async () => {
    const workspaceRoot = createWorkspace();
    const templatePath = path.join(workspaceRoot, "src/app.html");
    const dependencyPath = path.join(workspaceRoot, "shared/app-state.ts");
    const templateUri = pathToFileURL(templatePath).toString();
    const dependencyUri = pathToFileURL(dependencyPath).toString();
    const templateDocument = TextDocument.create(
      templateUri,
      "html",
      1,
      fs.readFileSync(templatePath, "utf8"),
    );
    const documents = {
      get: vi.fn((uri: string) => uri === templateUri ? templateDocument : undefined),
      all: vi.fn(() => [templateDocument]),
    };
    let diagnosticHandler: DiagnosticHandler | null = null;
    const connection = {
      languages: {
        diagnostics: {
          on: vi.fn((handler: DiagnosticHandler) => { diagnosticHandler = handler; }),
        },
      },
    };
    const ctx = createServerContext({
      connection: connection as never,
      documents: documents as never,
      logger: {
        log: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      },
    });
    ctx.configureWorkspace(pathToFileURL(workspaceRoot).toString());
    registerDiagnosticHandlers(ctx);

    expect(diagnosticHandler).not.toBeNull();
    expect((await ctx.semanticRuntime.authoredSourceOwnership(
      templateUri,
      ctx.semanticRuntime.requestGuard(null),
    )).value.owners).not.toEqual([]);
    expect((await ctx.semanticRuntime.authoredSourceOwnership(
      dependencyUri,
      ctx.semanticRuntime.requestGuard(null),
    )).value.owners).toEqual([]);

    const first = await diagnosticHandler!({
      textDocument: { uri: templateUri },
    } as DocumentDiagnosticParams, token);
    expect(first.kind).toBe(DocumentDiagnosticReportKind.Full);
    if (first.kind !== DocumentDiagnosticReportKind.Full) {
      throw new Error("Expected the first diagnostic pull to return a full report.");
    }
    expect(first.items.some((item) => diagnosticMessage(item.message).includes("required"))).toBe(true);

    fs.writeFileSync(
      dependencyPath,
      "export interface AppState { present: string; required: string; }\n",
      "utf8",
    );

    expect((await ctx.semanticRuntime.authoredSourceOwnership(
      dependencyUri,
      ctx.semanticRuntime.requestGuard(null),
    )).value.owners).toEqual([]);

    const second = await diagnosticHandler!({
      textDocument: { uri: templateUri },
      previousResultId: first.resultId,
    } as DocumentDiagnosticParams, token);

    expect(second.kind).toBe(DocumentDiagnosticReportKind.Full);
    if (second.kind !== DocumentDiagnosticReportKind.Full) {
      throw new Error("Expected dependency revalidation to replace the prior diagnostic report.");
    }
    expect(second.items.some((item) => diagnosticMessage(item.message).includes("required"))).toBe(false);
  }, 30_000);
});

type DiagnosticHandler = (
  params: DocumentDiagnosticParams,
  token: CancellationToken,
) => Promise<DocumentDiagnosticReport>;

const token = {
  isCancellationRequested: false,
  onCancellationRequested: vi.fn(),
} as unknown as CancellationToken;

function createWorkspace(): string {
  const packageRoot = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));
  const workspaceRoot = fs.mkdtempSync(path.join(packageRoot, ".dependency-currentness-"));
  temporaryRoots.push(workspaceRoot);

  writeWorkspaceFile(workspaceRoot, "package.json", JSON.stringify({
    name: "dependency-currentness-app",
    private: true,
    type: "module",
    dependencies: { aurelia: "^2.0.0-rc.1" },
  }));
  writeWorkspaceFile(workspaceRoot, "tsconfig.json", JSON.stringify({
    compilerOptions: {
      target: "ES2022",
      module: "ESNext",
      moduleResolution: "Bundler",
      strict: true,
      skipLibCheck: true,
      allowArbitraryExtensions: true,
      noEmit: true,
    },
    include: ["src"],
  }));
  writeWorkspaceFile(workspaceRoot, "aurelia.project.json", JSON.stringify({
    version: 1,
    authoredSources: { excludedRoots: ["shared"] },
  }));
  writeWorkspaceFile(
    workspaceRoot,
    "src/aurelia-assets.d.ts",
    "declare module '*.html' { const markup: string; export default markup; }\n",
  );
  writeWorkspaceFile(workspaceRoot, "src/main.ts", [
    "import Aurelia from 'aurelia';",
    "import { App } from './app.js';",
    "Aurelia.app(App).start();",
    "",
  ].join("\n"));
  writeWorkspaceFile(workspaceRoot, "src/app.ts", [
    "import { customElement } from 'aurelia';",
    "import template from './app.html';",
    "import type { AppState } from '../shared/app-state.js';",
    "@customElement({ name: 'app-root', template })",
    "export class App { state!: AppState; }",
    "",
  ].join("\n"));
  writeWorkspaceFile(workspaceRoot, "src/app.html", "<main>${state.required}</main>\n");
  writeWorkspaceFile(
    workspaceRoot,
    "shared/app-state.ts",
    "export interface AppState { present: string; }\n",
  );

  return workspaceRoot;
}

function writeWorkspaceFile(workspaceRoot: string, relativePath: string, text: string): void {
  const filePath = path.join(workspaceRoot, relativePath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, text, "utf8");
}

function diagnosticMessage(message: string | { readonly value: string }): string {
  return typeof message === "string" ? message : message.value;
}
