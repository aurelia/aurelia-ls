import { describe, expect, test } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { TextDocument } from "vscode-languageserver-textdocument";
import {
  InquiryContinuationKind,
  NodeSemanticRuntimeProjectInputHost,
  SEMANTIC_RUNTIME_API_VERSION,
  SemanticRuntimeAnswerCoverage,
  SemanticRuntimeAnswerResult,
  SemanticRuntimeAnswerSelection,
  type SemanticRuntimeAnswer,
  type SemanticRuntimeContinuationRow,
} from "@aurelia-ls/semantic-runtime";
import {
  SemanticRuntimeLspSession,
  drainSemanticRuntimePages,
  isSemanticRuntimeLspRequestAborted,
} from "../../src/runtime/semantic-runtime-session.js";
import {
  OpenDocumentSourceTextOverlay,
  type OpenTextDocumentStore,
} from "../../src/runtime/open-document-source-text-overlay.js";
import { WorkspaceDocumentUris } from "../../src/utils/document-uri.js";

class TestDocumentStore implements OpenTextDocumentStore {
  private readonly documents = new Map<string, TextDocument>();

  add(document: TextDocument): void {
    this.documents.set(document.uri, document);
  }

  get(uri: string): TextDocument | undefined {
    return this.documents.get(uri);
  }

  all(): TextDocument[] {
    return [...this.documents.values()];
  }
}

describe("SemanticRuntimeLspSession", () => {
  test("uses an opaque session identity in transport fingerprints", async () => {
    const fixtureRoot = minimalFixtureRoot();
    const session = createSession(fixtureRoot, new TestDocumentStore());

    const fingerprint = (await session.preflight(session.requestGuard(null))).fingerprint;

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
    const guard = session.requestGuard(null);

    const answer = await session.templateCompletions(
      htmlDocument,
      positionAfter(htmlText, "${t"),
      guard,
    );
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
    const firstGuard = session.requestGuard(null);

    const firstAnswer = await session.templateCompletions(
      documents.get(htmlUri)!,
      positionAfter(htmlText, "${t"),
      firstGuard,
    );
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
    const secondGuard = session.requestGuard(null);

    const secondAnswer = await session.templateCompletions(
      documents.get(htmlUri)!,
      positionAfter(nextHtmlText, "${h"),
      secondGuard,
    );
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

    const answer = await session.authoredSourceOwnership(
      appUri,
      session.requestGuard(null),
    );

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
    const beforeHint = session.requestGuard(null);
    const beforeHintGeneration = await session.preflight(beforeHint);

    session.configureWorkspace([hintedRoot]);
    expect(session.isCurrentGeneration(beforeHintGeneration)).toBe(false);
    const normalizedHintGeneration = await session.preflight(session.requestGuard(null));
    session.configureWorkspace([path.join(hintedRoot, "."), hintedRoot]);
    expect(session.isCurrentGeneration(normalizedHintGeneration)).toBe(true);
    const answer = await session.authoredSourceOwnership(
      appUri,
      session.requestGuard(null),
    );

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

    const answer = await session.projectConfigurationDiagnostics(
      configUri,
      session.requestGuard(null),
    );

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

    const answer = await session.templateCompletions(
      htmlDocument,
      positionAfter(htmlText, "${candidate"),
      session.requestGuard(null),
    );
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
    const guard = session.requestGuard(() => true);

    await expect(
      session.templateCompletions(document, { line: 0, character: 13 }, guard),
    ).rejects.toSatisfy(isSemanticRuntimeLspRequestAborted);
    await expect(
      session.templateCompletions(document, { line: 0, character: 13 }, guard),
    ).rejects.toMatchObject({ reason: "cancelled" });
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
    const guard = session.requestGuard(null);

    session.recordSourceTextChanged([path.join(fixtureRoot, "src/app.html")]);

    await expect(
      session.templateCompletions(document, { line: 0, character: 13 }, guard),
    ).rejects.toSatisfy(isSemanticRuntimeLspRequestAborted);
    await expect(
      session.templateCompletions(document, { line: 0, character: 13 }, guard),
    ).rejects.toMatchObject({ reason: "stale" });
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
  });
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
