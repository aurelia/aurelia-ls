import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import {
  createSemanticRuntime,
  SemanticAppQueryKind,
  type SemanticAppDiagnosticRow,
} from "../src/index.js";
import {
  expressionParseErrorDiagnostic,
  expressionRuntimeEvaluationErrorDiagnostic,
  templateCompilerErrorDiagnostic,
} from "../src/api/template-diagnostic-policy.js";
import { RuntimeAstFrameworkErrorCode } from "../src/type-system/framework-error-code.js";

const packageRoot = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const source = {
  kind: "source-span-address" as const,
  label: "src/app.html@10..20",
  path: "src/app.html",
  start: 10,
  end: 20,
  role: "template-expression" as const,
};

async function fixtureDiagnostics(
  fixture: string,
  sourceFile: string,
): Promise<readonly SemanticAppDiagnosticRow[]> {
  const runtime = await createSemanticRuntime({
    workspaceRoot: path.join(packageRoot, `fixtures/pressure/${fixture}`),
    storeKey: `template-diagnostic-policy-${fixture}-${sourceFile}`,
  });
  const app = await runtime.openApp({ analysisDepth: "binding-observation" });
  return app.ask({
    kind: SemanticAppQueryKind.AppDiagnostics,
    sourceFile: { filePath: sourceFile },
    diagnosticProjection: "type-projection",
    page: { size: 300 },
  }).value.rows;
}

describe("template diagnostic policy", () => {
  test("normalizes producer sentences while retaining structured framework codes", () => {
    const parse = expressionParseErrorDiagnostic(
      "Expected an identifier..",
      "AUR0167",
      source,
    );
    const compiler = templateCompilerErrorDiagnostic(
      "Template compilation error: unknown binding command: \"invalid\".",
      "AUR0710",
      source,
    );
    const evaluation = expressionRuntimeEvaluationErrorDiagnostic(
      RuntimeAstFrameworkErrorCode.AstNotAFunction,
      "The selected value is not callable.",
      source,
      "selectedValue",
    );

    expect(parse).toMatchObject({
      frameworkErrorCode: "AUR0167",
      summary: "Expected an identifier.",
    });
    expect(compiler).toMatchObject({
      frameworkErrorCode: "AUR0710",
      summary: "Unknown binding command: \"invalid\".",
    });
    expect(evaluation).toMatchObject({
      frameworkErrorCode: RuntimeAstFrameworkErrorCode.AstNotAFunction,
      summary: "The selected value is not callable.",
    });
  });

  test("removes framework wrappers across the runtime diagnostic families", async () => {
    const fixtureRows = await Promise.all([
      fixtureDiagnostics(
        "template-expression-resource-combinators",
        "src/invalid-expression-gallery.html",
      ),
      fixtureDiagnostics(
        "template-expression-resource-combinators",
        "src/resource-combinator-gallery.html",
      ),
      fixtureDiagnostics(
        "template-spread-capture-semantics",
        "src/template-spread-capture-semantics-app.html",
      ),
      fixtureDiagnostics(
        "runtime-html-au-compose-errors",
        "src/runtime-html-au-compose-errors-app.html",
      ),
    ]);
    const rows = fixtureRows.flat().filter((row) => row.frameworkErrorCode != null);
    const kinds = new Set(rows.map((row) => row.diagnosticKind));

    expect([...kinds]).toEqual(expect.arrayContaining([
      "expression-parse-error",
      "template-compiler-error",
      "expression-runtime-evaluation-error",
      "runtime-binding-framework-error",
      "runtime-renderer-framework-error",
      "runtime-controller-framework-error",
      "runtime-binding-behavior-framework-error",
      "runtime-value-converter-framework-error",
    ]));
    for (const row of rows) {
      const frameworkErrorCode = row.frameworkErrorCode;
      if (frameworkErrorCode == null) {
        throw new Error("Filtered framework diagnostic lost its structured code.");
      }
      expect(row.summary).toBe(row.summary.trim());
      expect(row.summary).not.toMatch(/\.\.$/u);
      expect(row.summary).not.toContain(frameworkErrorCode);
      expect(row.summary).not.toMatch(/^Aurelia (?:expression parser|template compiler|runtime)\b/u);
    }
  });

  test("keeps definite primitive-owner missing members at warning severity", async () => {
    const rows = await fixtureDiagnostics("mixed-form-surfaces", "src/app.html");
    const missingPrimitiveMember = rows.find((row) =>
      row.diagnosticKind === "missing-expression-member"
      && row.subject?.subjectName === "label"
    );

    expect(missingPrimitiveMember).toMatchObject({
      severity: "warning",
      suggestion: {
        suggestionKind: "inspect-owner-type",
        actionKind: "inspect-owner-type",
      },
    });
  });
});
