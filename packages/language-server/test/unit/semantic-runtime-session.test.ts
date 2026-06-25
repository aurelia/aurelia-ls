import { describe, expect, test } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { TextDocument } from "vscode-languageserver-textdocument";
import { SemanticRuntimeLspSession } from "../../src/runtime/semantic-runtime-session.js";
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

    const answer = await session.templateCompletions(
      htmlDocument,
      positionAfter(htmlText, "${t"),
    );
    const candidateNames = answer.value.candidates.map((candidate) => candidate.name);

    expect(answer.outcome).toBe("hit");
    expect(candidateNames).toContain("title");
    expect(candidateNames).not.toContain("message");
  });
});

function positionAfter(text: string, marker: string): { line: number; character: number } {
  const offset = text.indexOf(marker) + marker.length;
  expect(offset).toBeGreaterThanOrEqual(marker.length);
  return TextDocument.create("memory://position", "html", 0, text).positionAt(offset);
}
