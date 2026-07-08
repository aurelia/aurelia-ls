import { describe, expect, test } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { TextDocument } from "vscode-languageserver-textdocument";
import {
  SemanticRuntimeLspSession,
  isSemanticRuntimeLspRequestAborted,
} from "../../src/runtime/semantic-runtime-session.js";
import type { OpenTextDocumentStore } from "../../src/runtime/open-document-source-text-provider.js";

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
    const packageRoot = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));
    const fixtureRoot = path.resolve(packageRoot, "../semantic-runtime/fixtures/pressure/app-pattern-minimal-app");
    const htmlPath = path.join(fixtureRoot, "src/app.html");
    const tsPath = path.join(fixtureRoot, "src/app.ts");
    const htmlText = fs.readFileSync(htmlPath, "utf8").replace("${message}", "${t}");
    const tsText = fs.readFileSync(tsPath, "utf8").replace("message = 'Hello semantic runtime'", "title = 'Edited in memory'");
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
    const candidateNames = answer.value.candidates.map((candidate) => candidate.name);

    expect(answer.outcome).toBe("hit");
    expect(candidateNames).toContain("title");
    expect(candidateNames).not.toContain("message");
  });

  test("answers from changed open document text after a source generation change", async () => {
    const packageRoot = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));
    const fixtureRoot = path.resolve(packageRoot, "../semantic-runtime/fixtures/pressure/app-pattern-minimal-app");
    const htmlPath = path.join(fixtureRoot, "src/app.html");
    const tsPath = path.join(fixtureRoot, "src/app.ts");
    const htmlUri = pathToFileURL(htmlPath).toString();
    const tsUri = pathToFileURL(tsPath).toString();
    const htmlText = fs.readFileSync(htmlPath, "utf8").replace("${message}", "${t}");
    const tsText = fs.readFileSync(tsPath, "utf8").replace("message = 'Hello semantic runtime'", "title = 'Edited in memory'");
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
    expect(firstAnswer.value.candidates.map((candidate) => candidate.name)).toContain("title");

    const nextHtmlText = fs.readFileSync(htmlPath, "utf8").replace("${message}", "${h}");
    const nextTsText = fs.readFileSync(tsPath, "utf8").replace("message = 'Hello semantic runtime'", "headline = 'Edited again'");
    documents.add(TextDocument.create(htmlUri, "html", 3, nextHtmlText));
    documents.add(TextDocument.create(tsUri, "typescript", 3, nextTsText));
    await session.recordSourceTextChanged();
    const secondGuard = session.requestGuard(null);

    const secondAnswer = await session.templateCompletions(
      documents.get(htmlUri)!,
      positionAfter(nextHtmlText, "${h"),
      secondGuard,
    );
    const candidateNames = secondAnswer.value.candidates.map((candidate) => candidate.name);

    expect(candidateNames).toContain("headline");
    expect(candidateNames).not.toContain("title");
    expect(candidateNames).not.toContain("message");
  });

  test("aborts a cancelled request before opening the runtime", async () => {
    const fixtureRoot = minimalFixtureRoot();
    const htmlUri = pathToFileURL(path.join(fixtureRoot, "src/app.html")).toString();
    const document = TextDocument.create(htmlUri, "html", 1, "<template>${m}</template>");
    const documents = new TestDocumentStore();
    documents.add(document);
    const session = new SemanticRuntimeLspSession({ workspaceRoot: fixtureRoot, documents });
    const guard = session.requestGuard(() => true);

    await expect(session.templateCompletions(document, { line: 0, character: 13 }, guard))
      .rejects.toSatisfy(isSemanticRuntimeLspRequestAborted);
    await expect(session.templateCompletions(document, { line: 0, character: 13 }, guard))
      .rejects.toMatchObject({ reason: "cancelled" });
  });

  test("aborts a request captured before a source generation change", async () => {
    const fixtureRoot = minimalFixtureRoot();
    const htmlUri = pathToFileURL(path.join(fixtureRoot, "src/app.html")).toString();
    const document = TextDocument.create(htmlUri, "html", 1, "<template>${m}</template>");
    const documents = new TestDocumentStore();
    documents.add(document);
    const session = new SemanticRuntimeLspSession({ workspaceRoot: fixtureRoot, documents });
    const guard = session.requestGuard(null);

    await session.recordSourceTextChanged();

    await expect(session.templateCompletions(document, { line: 0, character: 13 }, guard))
      .rejects.toSatisfy(isSemanticRuntimeLspRequestAborted);
    await expect(session.templateCompletions(document, { line: 0, character: 13 }, guard))
      .rejects.toMatchObject({ reason: "stale" });
  });
});

function minimalFixtureRoot(): string {
  const packageRoot = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));
  return path.resolve(packageRoot, "../semantic-runtime/fixtures/pressure/app-pattern-minimal-app");
}

function positionAfter(text: string, marker: string): { line: number; character: number } {
  const offset = text.indexOf(marker) + marker.length;
  expect(offset).toBeGreaterThanOrEqual(marker.length);
  return TextDocument.create("memory://position", "html", 0, text).positionAt(offset);
}
