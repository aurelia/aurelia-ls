import { describe, expect, test } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { TextDocument } from "vscode-languageserver-textdocument";
import {
  InquiryContinuationKind,
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
import type { OpenTextDocumentStore } from "../../src/runtime/open-document-source-text-overlay.js";

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

    const session = new SemanticRuntimeLspSession({
      workspaceRoot: fixtureRoot,
      documents,
    });
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

    const session = new SemanticRuntimeLspSession({
      workspaceRoot: fixtureRoot,
      documents,
    });
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
    await session.recordSourceTextChanged();
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
    const session = new SemanticRuntimeLspSession({
      workspaceRoot: fixtureRoot,
      documents,
    });

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
    const session = new SemanticRuntimeLspSession({
      workspaceRoot: fixtureRoot,
      documents,
    });
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
    const session = new SemanticRuntimeLspSession({
      workspaceRoot: fixtureRoot,
      documents,
    });
    const guard = session.requestGuard(null);

    await session.recordSourceTextChanged();

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
