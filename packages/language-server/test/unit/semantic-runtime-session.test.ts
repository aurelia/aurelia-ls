import { afterEach, describe, expect, test, vi } from "vitest";
import fs from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { TextDocument } from "vscode-languageserver-textdocument";
import {
  InquiryContinuationKind,
  ManagedSemanticWorkspaceOperationReceipt,
  NodeSemanticRuntimeProjectInputHost,
  SEMANTIC_RUNTIME_API_VERSION,
  SemanticAppQueryKind,
  SemanticRuntime,
  SemanticRuntimeAnswerCoverage,
  SemanticRuntimeAnswerResult,
  SemanticRuntimeAnswerSelection,
  SemanticSourceWorldCurrentnessKind,
  type SemanticAuthoredSourceOwnershipResult,
  type SemanticRuntimeAnswer,
  type SemanticRuntimeContinuationRow,
  type SemanticRuntimeSummary,
} from "@aurelia-ls/semantic-runtime";
import {
  SemanticRuntimeLspReentrantLifecycleError,
  SemanticRuntimeLspSession,
  drainSemanticRuntimePages,
  isSemanticRuntimeLspRequestAborted,
  type SemanticRuntimeLspGeneration,
} from "../../src/runtime/semantic-runtime-session.js";
import {
  OpenDocumentSourceTextOverlay,
  type OpenTextDocumentListener,
  type OpenTextDocumentStore,
} from "../../src/runtime/open-document-source-text-overlay.js";
import { WorkspaceDocumentUris } from "../../src/utils/document-uri.js";

const temporaryWorkspaceRoots: string[] = [];

afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(temporaryWorkspaceRoots.splice(0).map((root) =>
    fs.promises.rm(root, { force: true, recursive: true })));
});

class TestDocumentStore implements OpenTextDocumentStore {
  private readonly documents = new Map<string, TextDocument>();
  private readonly openListeners: OpenTextDocumentListener[] = [];
  private readonly changeListeners: OpenTextDocumentListener[] = [];
  private readonly closeListeners: OpenTextDocumentListener[] = [];

  add(document: TextDocument): void {
    const wasOpen = this.documents.has(document.uri);
    this.documents.set(document.uri, document);
    if (!wasOpen) {
      for (const listener of this.openListeners) listener({ document });
    }
    for (const listener of this.changeListeners) listener({ document });
  }

  get(uri: string): TextDocument | undefined {
    return this.documents.get(uri);
  }

  all(): TextDocument[] {
    return [...this.documents.values()];
  }

  onDidOpen(listener: OpenTextDocumentListener): void {
    this.openListeners.push(listener);
  }

  onDidChangeContent(listener: OpenTextDocumentListener): void {
    this.changeListeners.push(listener);
  }

  onDidClose(listener: OpenTextDocumentListener): void {
    this.closeListeners.push(listener);
  }
}

describe("SemanticRuntimeLspSession", () => {
  test("uses an opaque session identity in transport fingerprints", async () => {
    const fixtureRoot = minimalFixtureRoot();
    const session = createSession(fixtureRoot, new TestDocumentStore());

    const fingerprint = (await session.runRequest(null, (operation) => operation.generation)).fingerprint;

    expect(fingerprint).toMatch(/^semantic-runtime:[^:]+:workspace-\d+:source-world-.+:request-\d+$/);
    expect(fingerprint).not.toContain(fixtureRoot);
  });

  test("answers template completions from open document source text", async () => {
    const packageRoot = path.resolve(
      fileURLToPath(new URL("../..", import.meta.url)),
    );
    const fixtureRoot = path.resolve(
      packageRoot,
      "../semantic-runtime/fixtures/pressure/app-pattern-minimal-app",
    );
    const htmlPath = path.join(fixtureRoot, "src/app.html");
    const tsPath = path.join(fixtureRoot, "src/app.ts");
    const htmlText = fs
      .readFileSync(htmlPath, "utf8")
      .replace("${message}", "${t}");
    const tsText = fs
      .readFileSync(tsPath, "utf8")
      .replace(
        "message = 'Hello semantic runtime'",
        "title = 'Edited in memory'",
      );
    const htmlUri = pathToFileURL(htmlPath).toString();
    const tsUri = pathToFileURL(tsPath).toString();
    const htmlDocument = TextDocument.create(htmlUri, "html", 2, htmlText);
    const tsDocument = TextDocument.create(tsUri, "typescript", 2, tsText);
    const documents = new TestDocumentStore();
    documents.add(htmlDocument);
    documents.add(tsDocument);

    const session = createSession(fixtureRoot, documents);
    const answer = await session.runRequest(null, (operation) => operation.templateCompletions(
      htmlDocument,
      positionAfter(htmlText, "${t"),
    ));
    const candidateNames = answer.value.candidates.map(
      (candidate) => candidate.name,
    );

    expect(answer.result).toBe("answered");
    expect(candidateNames).toContain("title");
    expect(candidateNames).not.toContain("message");
  });

  test("answers from changed open document text after a source generation change", async () => {
    const packageRoot = path.resolve(
      fileURLToPath(new URL("../..", import.meta.url)),
    );
    const fixtureRoot = path.resolve(
      packageRoot,
      "../semantic-runtime/fixtures/pressure/app-pattern-minimal-app",
    );
    const htmlPath = path.join(fixtureRoot, "src/app.html");
    const tsPath = path.join(fixtureRoot, "src/app.ts");
    const htmlUri = pathToFileURL(htmlPath).toString();
    const tsUri = pathToFileURL(tsPath).toString();
    const htmlText = fs
      .readFileSync(htmlPath, "utf8")
      .replace("${message}", "${t}");
    const tsText = fs
      .readFileSync(tsPath, "utf8")
      .replace(
        "message = 'Hello semantic runtime'",
        "title = 'Edited in memory'",
      );
    const documents = new TestDocumentStore();
    documents.add(TextDocument.create(htmlUri, "html", 2, htmlText));
    documents.add(TextDocument.create(tsUri, "typescript", 2, tsText));

    const session = createSession(fixtureRoot, documents);
    const firstAnswer = await session.runRequest(null, (operation) => operation.templateCompletions(
      documents.get(htmlUri)!,
      positionAfter(htmlText, "${t"),
    ));
    expect(
      firstAnswer.value.candidates.map((candidate) => candidate.name),
    ).toContain("title");

    const nextHtmlText = fs
      .readFileSync(htmlPath, "utf8")
      .replace("${message}", "${h}");
    const nextTsText = fs
      .readFileSync(tsPath, "utf8")
      .replace(
        "message = 'Hello semantic runtime'",
        "headline = 'Edited again'",
      );
    documents.add(TextDocument.create(htmlUri, "html", 3, nextHtmlText));
    documents.add(TextDocument.create(tsUri, "typescript", 3, nextTsText));
    session.recordSourceTextChanged([htmlPath, tsPath]);
    const secondAnswer = await session.runRequest(null, (operation) => operation.templateCompletions(
      documents.get(htmlUri)!,
      positionAfter(nextHtmlText, "${h"),
    ));
    const candidateNames = secondAnswer.value.candidates.map(
      (candidate) => candidate.name,
    );

    expect(candidateNames).toContain("headline");
    expect(candidateNames).not.toContain("title");
    expect(candidateNames).not.toContain("message");
  });

  test("projects document URIs through native authored-source ownership", async () => {
    const fixtureRoot = minimalFixtureRoot();
    const appPath = path.join(fixtureRoot, "src/app.ts");
    const appUri = pathToFileURL(appPath).toString();
    const documents = new TestDocumentStore();
    const session = createSession(fixtureRoot, documents);

    const answer = await session.runRequest(null, (operation) =>
      operation.authoredSourceOwnership(appUri));

    expect(answer.value.sourceFilePath).toBe(path.normalize(appPath));
    expect(answer.value.owners).toEqual([
      expect.objectContaining({
        projectRootDir: path.normalize(fixtureRoot),
        projectPath: "src/app.ts",
        role: "app-source",
      }),
    ]);
  });

  test("passes host project-root evidence through shared semantic discovery", async () => {
    const fixtureRoot = minimalFixtureRoot();
    const hintedRoot = path.join(fixtureRoot, "src");
    const appPath = path.join(hintedRoot, "app.ts");
    const appUri = pathToFileURL(appPath).toString();
    const session = createSession(fixtureRoot, new TestDocumentStore());
    const beforeHintGeneration = await session.runRequest(null, (operation) => operation.generation);

    session.configureWorkspace([hintedRoot]);
    const hintedGeneration = await session.runRequest(null, (operation) => operation.generation);
    expect(hintedGeneration.requestEpoch).not.toBe(beforeHintGeneration.requestEpoch);
    session.configureWorkspace([path.join(hintedRoot, "."), hintedRoot]);
    const normalizedHintGeneration = await session.runRequest(null, (operation) => operation.generation);
    expect(normalizedHintGeneration).toEqual(hintedGeneration);
    const answer = await session.runRequest(null, (operation) =>
      operation.authoredSourceOwnership(appUri));

    expect(answer.value.owners).toEqual([
      expect.objectContaining({
        projectRootDir: path.normalize(hintedRoot),
        projectPath: "app.ts",
      }),
    ]);
  });

  test("reads open native project-configuration diagnostics by URI", async () => {
    const fixtureRoot = minimalFixtureRoot();
    const configPath = path.join(fixtureRoot, "aurelia.project.json");
    const configUri = pathToFileURL(configPath).toString();
    const configText = '{"version":1,"unknown":true}';
    const documents = new TestDocumentStore();
    documents.add(TextDocument.create(configUri, "json", 1, configText));
    const session = createSession(fixtureRoot, documents);

    const answer = await session.runRequest(null, (operation) =>
      operation.projectConfigurationDiagnostics(configUri));

    expect(answer.value.rows).toEqual([
      expect.objectContaining({
        diagnosticKind: "aurelia-project-config-unknown-property",
        source: expect.objectContaining({
          filePath: configPath.replace(/\\/g, "/"),
          start: configText.indexOf('"unknown"'),
          end: configText.indexOf('"unknown"') + '"unknown"'.length,
        }),
      }),
    ]);
  });

  test("drains completion candidates beyond the public first page", async () => {
    const fixtureRoot = minimalFixtureRoot();
    const htmlPath = path.join(fixtureRoot, "src/app.html");
    const tsPath = path.join(fixtureRoot, "src/app.ts");
    const htmlUri = pathToFileURL(htmlPath).toString();
    const tsUri = pathToFileURL(tsPath).toString();
    const htmlText = "<main>${candidate}</main>";
    const candidateProperties = Array.from(
      { length: 140 },
      (_, index) => `  candidate${String(index).padStart(3, "0")} = ${index};`,
    ).join("\n");
    const tsText = fs
      .readFileSync(tsPath, "utf8")
      .replace("  message = 'Hello semantic runtime';", candidateProperties);
    const documents = new TestDocumentStore();
    const htmlDocument = TextDocument.create(htmlUri, "html", 2, htmlText);
    documents.add(htmlDocument);
    documents.add(TextDocument.create(tsUri, "typescript", 2, tsText));
    const session = createSession(fixtureRoot, documents);

    const answer = await session.runRequest(null, (operation) => operation.templateCompletions(
      htmlDocument,
      positionAfter(htmlText, "${candidate"),
    ));
    const names = answer.value.candidates.map((candidate) => candidate.name);

    expect(answer.page).toBeNull();
    expect(names).toContain("candidate000");
    expect(names).toContain("candidate139");
    expect(names.filter((name) => name.startsWith("candidate"))).toHaveLength(140);
  });

  test("aborts a cancelled request before opening the runtime", async () => {
    const fixtureRoot = minimalFixtureRoot();
    const htmlUri = pathToFileURL(
      path.join(fixtureRoot, "src/app.html"),
    ).toString();
    const document = TextDocument.create(
      htmlUri,
      "html",
      1,
      "<template>${m}</template>",
    );
    const documents = new TestDocumentStore();
    documents.add(document);
    const session = createSession(fixtureRoot, documents);
    const callback = vi.fn();

    await expect(
      session.runRequest(() => true, callback),
    ).rejects.toMatchObject({ reason: "cancelled" });
    expect(callback).not.toHaveBeenCalled();
  });

  test("aborts a request captured before a source generation change", async () => {
    const fixtureRoot = minimalFixtureRoot();
    const htmlUri = pathToFileURL(
      path.join(fixtureRoot, "src/app.html"),
    ).toString();
    const document = TextDocument.create(
      htmlUri,
      "html",
      1,
      "<template>${m}</template>",
    );
    const documents = new TestDocumentStore();
    documents.add(document);
    const session = createSession(fixtureRoot, documents);

    await expect(
      session.runRequest(null, (operation) => {
        session.recordSourceTextChanged([path.join(fixtureRoot, "src/app.html")]);
        return operation.templateCompletions(document, { line: 0, character: 13 });
      }),
    ).rejects.toMatchObject({ reason: "stale" });
  });

  test("rejects reentrant workspace lifecycle before mutation across a macrotask", async () => {
    const fixtureRoot = minimalFixtureRoot();
    const session = createSession(fixtureRoot, new TestDocumentStore());
    const baselineGeneration = await session.runRequest(null, (operation) => operation.generation);

    const attempts = await session.runRequest(null, async () => {
      await yieldTurn();
      return {
        configure: captureThrown(() => session.configureWorkspace([path.join(fixtureRoot, "src")])),
        dispose: captureThrown(() => session.dispose()),
      };
    });

    expect(attempts.configure).toBeInstanceOf(SemanticRuntimeLspReentrantLifecycleError);
    expect(attempts.configure).toMatchObject({
      code: "SEMANTIC_RUNTIME_LSP_REENTRANT_LIFECYCLE",
      action: "configure-workspace",
    });
    expect(attempts.dispose).toBeInstanceOf(SemanticRuntimeLspReentrantLifecycleError);
    expect(attempts.dispose).toMatchObject({
      code: "SEMANTIC_RUNTIME_LSP_REENTRANT_LIFECYCLE",
      action: "dispose",
    });
    await expect(session.runRequest(null, (operation) => operation.generation))
      .resolves.toEqual(baselineGeneration);
    await expect(session.dispose()).resolves.toBeUndefined();
  });

  test("allows an external workspace reconfiguration to stale a paused request", async () => {
    const fixtureRoot = minimalFixtureRoot();
    const session = createSession(fixtureRoot, new TestDocumentStore());
    const entered = deferred<SemanticRuntimeLspGeneration>();
    const release = deferred<void>();
    const paused = session.runRequest(null, async (operation) => {
      entered.resolve(operation.generation);
      await release.promise;
      return "obsolete";
    });
    const staleGeneration = await entered.promise;

    session.configureWorkspace([path.join(fixtureRoot, "src")]);
    release.resolve(undefined);

    await expect(paused).rejects.toMatchObject({ reason: "stale" });
    const currentGeneration = await session.runRequest(null, (operation) => operation.generation);
    expect(currentGeneration.requestEpoch).not.toBe(staleGeneration.requestEpoch);
    expect(currentGeneration.workspaceGeneration).not.toBe(staleGeneration.workspaceGeneration);
    await expect(session.dispose()).resolves.toBeUndefined();
  });

  test("transfers a nested marker owner through one stale request and reuses the replacement incarnation", async () => {
    const { workspaceRoot, nestedRoot, nestedSourcePath, markerPath } = createNestedMarkerWorkspace();
    const nestedSourceUri = pathToFileURL(nestedSourcePath).toString();
    const publishEffect = vi.fn();
    const session = createSession(workspaceRoot, new TestDocumentStore(), publishEffect);
    // eslint-disable-next-line @typescript-eslint/unbound-method -- the spy invokes this with its captured runtime receiver.
    const rawSummary = SemanticRuntime.prototype.summary;
    const runtimeIdentities: SemanticRuntime[] = [];
    const summarySpy = vi.spyOn(SemanticRuntime.prototype, "summary")
      .mockImplementation(function (this: SemanticRuntime, request = {}) {
        runtimeIdentities.push(this);
        return rawSummary.call(this, { ...request, projectPage: { size: 20 } });
      });
    const entered = deferred<LspMarkerSnapshot>();
    const release = deferred<void>();
    const paused = session.runRequest(null, async (operation) => {
      const summary = await operation.workspaceSummary();
      const ownership = await operation.authoredSourceOwnership(nestedSourceUri);
      operation.deferEffect({ kind: "log", level: "info", message: "obsolete marker result" });
      entered.resolve({ generation: operation.generation, summary, ownership });
      await release.promise;
      return "obsolete";
    });
    const baseline = await entered.promise;

    fs.writeFileSync(markerPath, '{"name":"nested-feature"}\n', "utf8");
    session.recordProjectTopologyChanged([markerPath]);
    release.resolve(undefined);
    const staleError = await paused.then(
      () => null,
      (error: unknown) => error,
    );

    expect(staleError).toMatchObject({
      reason: "stale",
      cause: {
        code: "SEMANTIC_RUNTIME_OPERATION_STALE",
        currentnessKind: SemanticSourceWorldCurrentnessKind.FreshBootRequired,
      },
    });
    expect(publishEffect).not.toHaveBeenCalled();
    expect(baseline.ownership.value.owners).toEqual([
      expect.objectContaining({
        projectRootDir: path.normalize(workspaceRoot),
        projectPath: "packages/feature/src/feature.ts",
      }),
    ]);

    const replacement = await captureMarkerSnapshot(session, nestedSourceUri);
    const reused = await captureMarkerSnapshot(session, nestedSourceUri);
    const nestedProject = replacement.summary.value.projects.find(
      (project) => path.normalize(project.rootDir) === path.normalize(nestedRoot),
    );

    expect(baseline.summary.value.projects.some(
      (project) => path.normalize(project.rootDir) === path.normalize(nestedRoot),
    )).toBe(false);
    expect(replacement.generation.requestEpoch).not.toBe(baseline.generation.requestEpoch);
    expect(replacement.generation.workspaceGeneration).not.toBe(baseline.generation.workspaceGeneration);
    expect(replacement.generation.sourceWorldRevision).not.toBe(baseline.generation.sourceWorldRevision);
    expect(nestedProject?.admissionOrigins).toEqual([{
      kind: "package-json-marker",
      sourceFilePath: path.normalize(markerPath),
      viaProjectRootHintDir: null,
    }]);
    expect(replacement.ownership.value.owners).toEqual([
      expect.objectContaining({
        projectRootDir: path.normalize(nestedRoot),
        projectPath: "src/feature.ts",
      }),
    ]);
    expect(reused.generation).toEqual(replacement.generation);
    expect(reused.summary.value.projects).toEqual(replacement.summary.value.projects);
    expect(runtimeIdentities).toHaveLength(3);
    expect(runtimeIdentities[1]).not.toBe(runtimeIdentities[0]);
    expect(runtimeIdentities[2]).toBe(runtimeIdentities[1]);

    summarySpy.mockRestore();
    await expect(session.dispose()).resolves.toBeUndefined();
  });

  test("does not return an accepted result when the final deferred effect closes the session", async () => {
    const fixtureRoot = minimalFixtureRoot();
    let session!: SemanticRuntimeLspSession;
    session = createSession(
      fixtureRoot,
      new TestDocumentStore(),
      async () => session.dispose(),
    );

    await expect(session.runRequest(null, (operation) => {
      operation.deferEffect({ kind: "log", level: "info", message: "accepted effect" });
      return "accepted result";
    })).rejects.toMatchObject({ reason: "stale" });
  });

  test("requests resource definitions without handles and keeps inventory type surfaces caller-selected", async () => {
    const session = createSession(minimalFixtureRoot(), new TestDocumentStore());
    const result = await session.runRequest(null, async (operation) => {
      const summary = await operation.workspaceSummary();
      const projectKey = summary.value.appCandidates[0]?.projectKey;
      if (projectKey == null) {
        throw new Error("Expected the fixture to expose one app candidate.");
      }
      const definitions = await operation.resourceDefinitions();
      const compact = await operation.resourceInventory(projectKey, false);
      const rich = await operation.resourceInventory(projectKey, true);
      return {
        definitionRows: definitions.value.rows.length,
        definitionsHaveHandles: definitions.value.rows.some((row) =>
          Object.hasOwn(row, "handles")),
        compactTypeSurfacesIncluded: compact.value.typeSurfacesIncluded,
        richTypeSurfacesIncluded: rich.value.typeSurfacesIncluded,
      };
    });

    expect(result.definitionRows).toBeGreaterThan(0);
    expect(result.definitionsHaveHandles).toBe(false);
    expect(result.compactTypeSurfacesIncluded).toBe(false);
    expect(result.richTypeSurfacesIncluded).toBe(true);
  });
});

describe("SemanticRuntimeLspSession diagnostic receipt cache", () => {
  test("does not retain a proof when the final deferred effect closes the session", async () => {
    const fixtureRoot = minimalFixtureRoot();
    const htmlPath = path.join(fixtureRoot, "src/app.html");
    const htmlUri = pathToFileURL(htmlPath).toString();
    const documents = new TestDocumentStore();
    documents.add(TextDocument.create(htmlUri, "html", 1, fs.readFileSync(htmlPath, "utf8")));
    let session!: SemanticRuntimeLspSession;
    session = createSession(fixtureRoot, documents, async () => session.dispose());

    await expect(session.runDiagnosticRequest(
      null,
      diagnosticRequest(htmlUri),
      (operation) => {
        operation.documents.ensureProgramDocument(htmlUri);
        operation.deferEffect({ kind: "log", level: "info", message: "accepted diagnostic" });
        return [];
      },
    )).rejects.toMatchObject({ reason: "stale" });

    const cache = Reflect.get(session, "diagnosticCache") as Map<string, unknown>;
    expect(cache.size).toBe(0);
  });

  test("absorbs a current completed proof, skips rendering, and rotates receipt ownership", async () => {
    const fixtureRoot = minimalFixtureRoot();
    const htmlPath = path.join(fixtureRoot, "src/app.html");
    const htmlUri = pathToFileURL(htmlPath).toString();
    const documents = new TestDocumentStore();
    documents.add(TextDocument.create(htmlUri, "html", 1, fs.readFileSync(htmlPath, "utf8")));
    const session = createSession(fixtureRoot, documents);
    const render = vi.fn((operation) => {
      const document = operation.documents.ensureProgramDocument(htmlUri);
      return [{ message: document?.getText() ?? "missing" }];
    });
    const dispose = vi.spyOn(ManagedSemanticWorkspaceOperationReceipt.prototype, "dispose");

    const first = await session.runDiagnosticRequest(
      null,
      diagnosticRequest(htmlUri),
      render,
    );
    expect(first.kind).toBe("full");
    if (first.kind !== "full") throw new Error("Expected a full diagnostic report.");

    const second = await session.runDiagnosticRequest(
      null,
      diagnosticRequest(htmlUri, first.resultId),
      render,
    );

    expect(second).toEqual({ kind: "unchanged", resultId: first.resultId });
    expect(render).toHaveBeenCalledOnce();
    expect(dispose).toHaveBeenCalledTimes(1);
    await session.dispose();
    expect(dispose).toHaveBeenCalledTimes(2);
    dispose.mockRestore();
  });

  test("recomputes when a mapping-only dependency changes outside the diagnostic URI", async () => {
    const fixtureRoot = minimalFixtureRoot();
    const htmlPath = path.join(fixtureRoot, "src/app.html");
    const tsPath = path.join(fixtureRoot, "src/app.ts");
    const htmlUri = pathToFileURL(htmlPath).toString();
    const tsUri = pathToFileURL(tsPath).toString();
    const documents = new TestDocumentStore();
    documents.add(TextDocument.create(htmlUri, "html", 1, fs.readFileSync(htmlPath, "utf8")));
    documents.add(TextDocument.create(tsUri, "typescript", 1, "export class App { value = 1; }"));
    const session = createSession(fixtureRoot, documents);
    const render = vi.fn((operation) => {
      operation.documents.ensureProgramDocument(htmlUri);
      return [{ message: operation.documents.lookupText(tsUri) ?? "missing" }];
    });

    const first = await session.runDiagnosticRequest(null, diagnosticRequest(htmlUri), render);
    if (first.kind !== "full") throw new Error("Expected a full diagnostic report.");
    documents.add(TextDocument.create(tsUri, "typescript", 2, "export class App { value = 2; }"));
    session.recordSourceTextChanged([tsPath]);

    const second = await session.runDiagnosticRequest(
      null,
      diagnosticRequest(htmlUri, first.resultId),
      render,
    );

    expect(second.kind).toBe("full");
    expect(second.resultId).not.toBe(first.resultId);
    expect(render).toHaveBeenCalledTimes(2);
    await session.dispose();
  });

  test("evicts the directly changed URI and disposes its retained proof", async () => {
    const fixtureRoot = minimalFixtureRoot();
    const htmlPath = path.join(fixtureRoot, "src/app.html");
    const htmlUri = pathToFileURL(htmlPath).toString();
    const documents = new TestDocumentStore();
    documents.add(TextDocument.create(htmlUri, "html", 1, fs.readFileSync(htmlPath, "utf8")));
    const session = createSession(fixtureRoot, documents);
    const render = vi.fn((operation) => {
      operation.documents.ensureProgramDocument(htmlUri);
      return [];
    });
    const first = await session.runDiagnosticRequest(null, diagnosticRequest(htmlUri), render);
    if (first.kind !== "full") throw new Error("Expected a full diagnostic report.");
    const dispose = vi.spyOn(ManagedSemanticWorkspaceOperationReceipt.prototype, "dispose");

    session.recordSourceTextChanged([htmlPath]);
    expect(dispose).toHaveBeenCalledOnce();
    const second = await session.runDiagnosticRequest(
      null,
      diagnosticRequest(htmlUri, first.resultId),
      render,
    );

    expect(second.kind).toBe("full");
    expect(render).toHaveBeenCalledTimes(2);
    dispose.mockRestore();
    await session.dispose();
  });

  test("keeps the accepted cache entry when a replacement renderer fails", async () => {
    const fixtureRoot = minimalFixtureRoot();
    const htmlPath = path.join(fixtureRoot, "src/app.html");
    const htmlUri = pathToFileURL(htmlPath).toString();
    const text = fs.readFileSync(htmlPath, "utf8");
    const documents = new TestDocumentStore();
    documents.add(TextDocument.create(htmlUri, "html", 1, text));
    const session = createSession(fixtureRoot, documents);
    const render = vi.fn((operation) => {
      operation.documents.ensureProgramDocument(htmlUri);
      return [];
    });
    const first = await session.runDiagnosticRequest(null, diagnosticRequest(htmlUri), render);
    if (first.kind !== "full") throw new Error("Expected a full diagnostic report.");

    documents.add(TextDocument.create(htmlUri, "html", 2, text));
    await expect(session.runDiagnosticRequest(
      null,
      diagnosticRequest(htmlUri, first.resultId),
      () => { throw new Error("mapping failed"); },
    )).rejects.toThrow("mapping failed");
    documents.add(TextDocument.create(htmlUri, "html", 1, text));

    const recovered = await session.runDiagnosticRequest(
      null,
      diagnosticRequest(htmlUri, first.resultId),
      render,
    );
    expect(recovered).toEqual({ kind: "unchanged", resultId: first.resultId });
    expect(render).toHaveBeenCalledOnce();
    await session.dispose();
  });

  test("does not let an older concurrent completion replace a newer publication", async () => {
    const fixtureRoot = minimalFixtureRoot();
    const htmlPath = path.join(fixtureRoot, "src/app.html");
    const htmlUri = pathToFileURL(htmlPath).toString();
    const documents = new TestDocumentStore();
    documents.add(TextDocument.create(htmlUri, "html", 1, fs.readFileSync(htmlPath, "utf8")));
    const session = createSession(fixtureRoot, documents);
    let releaseFirst!: () => void;
    let announceFirst!: () => void;
    const firstEntered = new Promise<void>((resolve) => { announceFirst = resolve; });
    const firstGate = new Promise<void>((resolve) => { releaseFirst = resolve; });
    const firstRequest = session.runDiagnosticRequest(
      null,
      diagnosticRequest(htmlUri),
      async (operation) => {
        operation.documents.ensureProgramDocument(htmlUri);
        announceFirst();
        await firstGate;
        return [{ message: "older" }];
      },
    );
    await firstEntered;
    const newer = await session.runDiagnosticRequest(
      null,
      diagnosticRequest(htmlUri),
      (operation) => {
        operation.documents.ensureProgramDocument(htmlUri);
        return [{ message: "newer" }];
      },
    );
    if (newer.kind !== "full") throw new Error("Expected a full diagnostic report.");
    releaseFirst();
    await firstRequest;
    const renderer = vi.fn(() => [{ message: "unexpected" }]);

    const current = await session.runDiagnosticRequest(
      null,
      diagnosticRequest(htmlUri, newer.resultId),
      renderer,
    );

    expect(current).toEqual({ kind: "unchanged", resultId: newer.resultId });
    expect(renderer).not.toHaveBeenCalled();
    await session.dispose();
  });

  test("preserves open-document presentation URI, language, and version on managed text", async () => {
    const fixtureRoot = minimalFixtureRoot();
    const htmlPath = path.join(fixtureRoot, "src/app.html");
    const canonicalUri = pathToFileURL(htmlPath).toString();
    const presentationUri = canonicalUri.replace("app.html", "app%2Ehtml");
    const documents = new TestDocumentStore();
    documents.add(TextDocument.create(
      presentationUri,
      "aurelia-html",
      17,
      fs.readFileSync(htmlPath, "utf8"),
    ));
    const session = createSession(fixtureRoot, documents);

    const snapshot = await session.runRequest(null, (operation) =>
      operation.documents.lookupDocumentSnapshot(canonicalUri));

    expect(snapshot).toMatchObject({
      uri: presentationUri,
      languageId: "aurelia-html",
      version: 17,
    });
    await session.dispose();
  });

  test("bounds retained diagnostic proofs and evicts the least-recently published entry", async () => {
    const session = createSession(minimalFixtureRoot(), new TestDocumentStore());
    const publish = Reflect.get(session, "publishDiagnosticCacheEntry") as (
      cacheKey: string,
      entry: {
        documentKey: string;
        presentationKey: string;
        resultId: string;
        receipt: ManagedSemanticWorkspaceOperationReceipt;
        publishOrdinal: number;
      },
    ) => boolean;
    const cache = Reflect.get(session, "diagnosticCache") as Map<string, unknown>;
    const disposals = Array.from({ length: 258 }, () => vi.fn());
    const entry = (index: number) => ({
      documentKey: `document-${index}`,
      presentationKey: `presentation-${index}`,
      resultId: `result-${index}`,
      receipt: {
        analysisBasis: { revision: `basis-${index}` },
        dispose: disposals[index],
      } as unknown as ManagedSemanticWorkspaceOperationReceipt,
      publishOrdinal: index + 1,
    });
    for (let index = 0; index < 256; index += 1) {
      publish.call(session, `cache-${index}`, entry(index));
    }
    publish.call(session, "cache-0", entry(256));
    publish.call(session, "cache-256", entry(257));

    expect(cache.size).toBe(256);
    expect(cache.has("cache-0")).toBe(true);
    expect(cache.has("cache-1")).toBe(false);
    expect(disposals[0]).toHaveBeenCalledOnce();
    expect(disposals[1]).toHaveBeenCalledOnce();
    await session.dispose();
  });
});

describe("drainSemanticRuntimePages", () => {
  test("conserves rows, open coverage, and non-page continuations until exhaustion", async () => {
    const inspectOpenSeams = continuation(
      InquiryContinuationKind.InspectOpenSeams,
      "Inspect the unresolved semantic evidence.",
    );
    const reroute = continuation(
      InquiryContinuationKind.Reroute,
      "Ask the owning semantic lane.",
    );
    const nextPage = continuation(
      InquiryContinuationKind.NextPage,
      "Continue paging.",
    );
    const answers = [
      rowPageAnswer(
        [1],
        null,
        "page-2",
        false,
        [nextPage, inspectOpenSeams],
        standardOpenAxes,
      ),
      rowPageAnswer(
        [2],
        "page-2",
        "page-3",
        false,
        [nextPage, inspectOpenSeams, reroute],
        standardOpenAxes,
      ),
      rowPageAnswer(
        [3],
        "page-3",
        null,
        true,
        [reroute],
        standardOpenAxes,
      ),
    ];
    const requestedCursors: (string | null | undefined)[] = [];
    let answerIndex = 0;
    let activeChecks = 0;

    const answer = await drainSemanticRuntimePages({
      label: "test row",
      assertActive: () => {
        activeChecks += 1;
      },
      readPage: (cursor) => {
        requestedCursors.push(cursor);
        return Promise.resolve(answers[answerIndex++]!);
      },
      rowsForValue: (value) => value.rows,
      mergeValue: (_terminalValue, rows) => ({
        displayText: `${rows.length} row(s).`,
        rows,
      }),
    });

    expect(requestedCursors).toEqual([undefined, "page-2", "page-3"]);
    expect(activeChecks).toBe(6);
    expect(answer.value).toEqual({
      displayText: "3 row(s).",
      rows: [1, 2, 3],
    });
    expect(answer.coverage).toBe(SemanticRuntimeAnswerCoverage.Open);
    expect(answer.summary).toBe("Returned 3 test row(s).");
    expect(answer.page).toBeNull();
    expect(answer.continuations).toEqual([inspectOpenSeams, reroute]);
  });

  test.each([
    {
      axis: "result",
      nextAxes: {
        ...standardOpenAxes,
        result: SemanticRuntimeAnswerResult.Failed,
      },
    },
    {
      axis: "selection",
      nextAxes: {
        ...standardOpenAxes,
        selection: SemanticRuntimeAnswerSelection.Ambiguous,
      },
    },
    {
      axis: "coverage",
      nextAxes: {
        ...standardOpenAxes,
        coverage: SemanticRuntimeAnswerCoverage.Complete,
      },
    },
  ])("rejects $axis drift between pages", async ({ axis, nextAxes }) => {
    const answers = [
      rowPageAnswer([1], null, "page-2", false, [], standardOpenAxes),
      rowPageAnswer([2], "page-2", null, true, [], nextAxes),
    ];
    let answerIndex = 0;

    await expect(drainSemanticRuntimePages({
      label: "test row",
      assertActive: () => {},
      readPage: () => Promise.resolve(answers[answerIndex++]!),
      rowsForValue: (value) => value.rows,
      mergeValue: (_terminalValue, rows) => ({ rows }),
    })).rejects.toThrow(`changed test row ${axis} while paging`);
  });

  test("rejects a terminal page that has not reported exhaustion", async () => {
    await expect(drainSemanticRuntimePages({
      label: "test row",
      assertActive: () => {},
      readPage: () => Promise.resolve(
        rowPageAnswer([1], null, null, false, [], standardOpenAxes),
      ),
      rowsForValue: (value) => value.rows,
      mergeValue: (_terminalValue, rows) => ({ rows }),
    })).rejects.toThrow("ended test row paging before reporting exhaustion");
  });

  test("preserves semantic answer context when a row query returns a non-row value", async () => {
    const malformed = {
      ...rowPageAnswer([], null, null, true, [], standardOpenAxes),
      result: SemanticRuntimeAnswerResult.Failed,
      summary: "The query supplied an unsupported sourceFile axis.",
      value: { displayText: "No row result." },
    } as unknown as SemanticRuntimeAnswer<TestRowPageValue>;

    await expect(drainSemanticRuntimePages({
      label: "test row",
      assertActive: () => {},
      readPage: () => Promise.resolve(malformed),
      rowsForValue: (value) => value.rows,
      mergeValue: (_terminalValue, rows) => ({ rows }),
    })).rejects.toThrow(
      "returned test row without a row collection (result=failed; selection=exact; coverage=open): "
      + "The query supplied an unsupported sourceFile axis.",
    );
  });

  test("rejects an exhausted page that advertises another cursor", async () => {
    await expect(drainSemanticRuntimePages({
      label: "test row",
      assertActive: () => {},
      readPage: () => Promise.resolve(
        rowPageAnswer([1], null, "page-2", true, [], standardOpenAxes),
      ),
      rowsForValue: (value) => value.rows,
      mergeValue: (_terminalValue, rows) => ({ rows }),
    })).rejects.toThrow("reported an exhausted test row page with a next cursor");
  });

  test("rejects a repeated continuation cursor", async () => {
    const answers = [
      rowPageAnswer([1], null, "page-2", false, [], standardOpenAxes),
      rowPageAnswer([2], "page-2", "page-2", false, [], standardOpenAxes),
    ];
    let answerIndex = 0;

    await expect(drainSemanticRuntimePages({
      label: "test row",
      assertActive: () => {},
      readPage: () => Promise.resolve(answers[answerIndex++]!),
      rowsForValue: (value) => value.rows,
      mergeValue: (_terminalValue, rows) => ({ rows }),
    })).rejects.toThrow("repeated a test row page cursor");
  });

  test.each([
    {
      name: "cursor",
      mutate: (answer: SemanticRuntimeAnswer<TestRowPageValue>) => ({
        ...answer,
        page: { ...answer.page!, cursor: "wrong-page" },
      }),
      message: "page metadata for a different cursor",
    },
    {
      name: "returned row count",
      mutate: (answer: SemanticRuntimeAnswer<TestRowPageValue>) => ({
        ...answer,
        page: { ...answer.page!, returnedRows: 2 },
      }),
      message: "reported 2 test row row(s) but returned 1",
    },
  ])("rejects inconsistent $name metadata", async ({ mutate, message }) => {
    await expect(drainSemanticRuntimePages({
      label: "test row",
      assertActive: () => {},
      readPage: () => Promise.resolve(mutate(
        rowPageAnswer([1], null, null, true, [], standardOpenAxes, 1),
      )),
      rowsForValue: (value) => value.rows,
      mergeValue: (_terminalValue, rows) => ({ rows }),
    })).rejects.toThrow(message);
  });

  test("rejects total-row drift between pages", async () => {
    const answers = [
      rowPageAnswer([1], null, "page-2", false, [], standardOpenAxes, 2),
      rowPageAnswer([2], "page-2", null, true, [], standardOpenAxes, 3),
    ];
    let answerIndex = 0;

    await expect(drainSemanticRuntimePages({
      label: "test row",
      assertActive: () => {},
      readPage: () => Promise.resolve(answers[answerIndex++]!),
      rowsForValue: (value) => value.rows,
      mergeValue: (_terminalValue, rows) => ({ rows }),
    })).rejects.toThrow("changed test row total rows while paging");
  });
});

interface TestRowPageValue {
  readonly displayText: string;
  readonly rows: readonly number[];
}

type TestAnswerAxes = Pick<
  SemanticRuntimeAnswer<TestRowPageValue>,
  "result" | "selection" | "coverage"
>;

const standardOpenAxes: TestAnswerAxes = {
  result: SemanticRuntimeAnswerResult.Answered,
  selection: SemanticRuntimeAnswerSelection.Exact,
  coverage: SemanticRuntimeAnswerCoverage.Open,
};

function rowPageAnswer(
  rows: readonly number[],
  cursor: string | null,
  nextCursor: string | null,
  exhausted: boolean,
  continuations: readonly SemanticRuntimeContinuationRow[],
  axes: TestAnswerAxes,
  totalRows = 3,
): SemanticRuntimeAnswer<TestRowPageValue> {
  return {
    schemaVersion: SEMANTIC_RUNTIME_API_VERSION,
    ...axes,
    summary: `${rows.length} test row(s).`,
    value: {
      displayText: `${rows.length} test row(s).`,
      rows,
    },
    page: {
      size: 1,
      cursor,
      nextCursor,
      returnedRows: rows.length,
      totalRows,
      exhausted,
    },
    continuations,
  };
}

function continuation(
  kind: InquiryContinuationKind,
  rationale: string,
): SemanticRuntimeContinuationRow {
  return {
    kind,
    rationale,
    intents: [],
    cost: null,
    evidence: null,
    blockers: [],
  };
}

function minimalFixtureRoot(): string {
  const packageRoot = path.resolve(
    fileURLToPath(new URL("../..", import.meta.url)),
  );
  return path.resolve(
    packageRoot,
    "../semantic-runtime/fixtures/pressure/app-pattern-minimal-app",
  );
}

function createSession(
  workspaceRoot: string,
  documents: OpenTextDocumentStore,
  publishEffect: (effect: unknown) => void | PromiseLike<void> = () => undefined,
): SemanticRuntimeLspSession {
  const documentUris = new WorkspaceDocumentUris();
  documentUris.configure(pathToFileURL(workspaceRoot).toString());
  const sourceTextOverlay = new OpenDocumentSourceTextOverlay(documents, documentUris);
  return new SemanticRuntimeLspSession({
    documentUris,
    projectInputHost: new NodeSemanticRuntimeProjectInputHost(
      sourceTextOverlay,
    ),
    projectInputCurrentnessPolicy: sourceTextOverlay,
    openDocumentMetadata: (uri) => {
      const document = sourceTextOverlay.openDocument(uri);
      return document == null
        ? null
        : {
            uri: document.uri,
            languageId: document.languageId,
            version: document.version,
          };
    },
    publishEffect,
  });
}

interface LspMarkerSnapshot {
  readonly generation: SemanticRuntimeLspGeneration;
  readonly summary: SemanticRuntimeAnswer<SemanticRuntimeSummary>;
  readonly ownership: SemanticRuntimeAnswer<SemanticAuthoredSourceOwnershipResult>;
}

async function captureMarkerSnapshot(
  session: SemanticRuntimeLspSession,
  sourceUri: string,
): Promise<LspMarkerSnapshot> {
  return session.runRequest(null, async (operation) => ({
    generation: operation.generation,
    summary: await operation.workspaceSummary(),
    ownership: await operation.authoredSourceOwnership(sourceUri),
  }));
}

function createNestedMarkerWorkspace(): {
  readonly workspaceRoot: string;
  readonly nestedRoot: string;
  readonly nestedSourcePath: string;
  readonly markerPath: string;
} {
  const workspaceRoot = fs.mkdtempSync(path.join(tmpdir(), "aurelia-lsp-marker-"));
  temporaryWorkspaceRoots.push(workspaceRoot);
  const nestedRoot = path.join(workspaceRoot, "packages", "feature");
  const nestedSourcePath = path.join(nestedRoot, "src", "feature.ts");
  const markerPath = path.join(nestedRoot, "package.json");
  fs.mkdirSync(path.dirname(nestedSourcePath), { recursive: true });
  fs.mkdirSync(path.join(workspaceRoot, "src"), { recursive: true });
  fs.writeFileSync(path.join(workspaceRoot, "package.json"), '{"name":"marker-workspace"}\n', "utf8");
  fs.writeFileSync(path.join(workspaceRoot, "src", "main.ts"), "export const main = true;\n", "utf8");
  fs.writeFileSync(nestedSourcePath, "export const feature = true;\n", "utf8");
  return { workspaceRoot, nestedRoot, nestedSourcePath, markerPath };
}

interface Deferred<T> {
  readonly promise: Promise<T>;
  readonly resolve: (value: T | PromiseLike<T>) => void;
}

function deferred<T>(): Deferred<T> {
  let resolve!: Deferred<T>["resolve"];
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

function yieldTurn(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve));
}

function captureThrown(callback: () => unknown): unknown {
  try {
    callback();
    return null;
  } catch (error) {
    return error;
  }
}

function diagnosticRequest(
  uri: string,
  previousResultId: string | null = null,
) {
  return {
    uri,
    identifier: "aurelia",
    previousResultId,
    projectionKey: "test-diagnostic-projection/v1",
  };
}

function positionAfter(
  text: string,
  marker: string,
): { line: number; character: number } {
  const offset = text.indexOf(marker) + marker.length;
  expect(offset).toBeGreaterThanOrEqual(marker.length);
  return TextDocument.create("memory://position", "html", 0, text).positionAt(
    offset,
  );
}
