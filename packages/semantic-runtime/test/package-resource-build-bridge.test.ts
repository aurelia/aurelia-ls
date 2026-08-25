import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, test } from "vitest";

import {
  createSemanticRuntime,
  SemanticAppQueryKind,
  SemanticRuntimeAnswerCoverage,
} from "../src/index.js";
import { OpenRegistrationAdmission } from "../src/registration/registration-admission.js";

const packageRoot = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const temporaryRoots: string[] = [];

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe("package resource build bridge", () => {
  test("joins condition-selected generated metadata to the exact source class and registry application", async () => {
    const fixture = packageBuildFixture();
    const runtime = await createSemanticRuntime({
      workspaceRoot: fixture.root,
      storeKey: `test:package-resource-build:${path.basename(fixture.root)}`,
    });
    const app = await runtime.openApp({ analysisDepth: "binding-observation" });

    const inventory = app.ask({
      kind: SemanticAppQueryKind.ResourceInventory,
      page: { size: 100 },
    });
    const widget = inventory.value.rows.find(
      (row) => row.name === "build-widget",
    );
    expect(inventory.coverage).toBe(SemanticRuntimeAnswerCoverage.Complete);
    expect(widget).toMatchObject({
      declarationModes: ["convention"],
      metadataState: "full-definition",
      origin: {
        kind: "package",
        packageName: "@acme/generated-widget",
      },
      sources: {
        implementation: expect.objectContaining({
          path: "node_modules/@acme/generated-widget/src/build-widget.ts",
          sourceFileRole: "external-source",
        }),
      },
    });
    expect(widget?.bindables).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "value", attribute: "value" }),
      ]),
    );

    const cursor = sourceCursor(fixture.template, "build-widget", 4);
    const info = app.ask({
      kind: SemanticAppQueryKind.TemplateCursorInfo,
      cursor,
    });
    expect(info.coverage).toBe(SemanticRuntimeAnswerCoverage.Complete);
    expect(info.value.selectedDefinition?.name).toBe("build-widget");
    expect(info.value.missingInputs).not.toContain(
      "template-resource-scope:registration-open",
    );

    const completion = app.ask({
      kind: SemanticAppQueryKind.TemplateCompletions,
      cursor,
      page: { size: 100 },
    });
    expect(completion.coverage).toBe(SemanticRuntimeAnswerCoverage.Complete);
    expect(completion.value.candidates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "build-widget" }),
      ]),
    );

    const diagnostics = app.ask({
      kind: SemanticAppQueryKind.TemplateDiagnostics,
      sourceFile: { filePath: "src/app.html" },
      page: { size: 100 },
    });
    expect(diagnostics.coverage).toBe(SemanticRuntimeAnswerCoverage.Complete);
    expect(diagnostics.value.rows).toEqual([]);

    const refinedOperations =
      app.emission.appWorld.diWorld.registrationOperations.filter(
        (operation) =>
          operation.evidenceAuthority === "evaluation" &&
          operation.admission instanceof OpenRegistrationAdmission &&
          ["BuildWidget", "PlainService"].includes(
            operation.admission.registeredValue?.localName ?? "",
          ),
      );
    expect(refinedOperations).toHaveLength(2);
    expect(
      new Set(
        refinedOperations.map((operation) => operation.admission.productHandle),
      ).size,
    ).toBe(2);
    expect(
      app.emission.appWorld.diWorld.registrationOpenSeamScopes.some((scope) =>
        refinedOperations.includes(scope.operation),
      ),
    ).toBe(false);
    expect(
      app.emission.appWorld.diWorld.resourceSlots.some(
        (slot) =>
          slot.resourceKey === "au:resource:custom-element:build-widget",
      ),
    ).toBe(true);
  }, 30_000);

  test.each([
    ["stale mapped source", { staleSourceContent: true }],
    ["unmapped decorator helper", { mapOutsideClass: true }],
    ["unused generated metadata", { omitMetadataUse: true }],
    ["nonempty generated dependencies", { nonemptyDependencies: true }],
    ["source map outside the package", { outsidePackageSource: true }],
    ["decorator mapping to another exported class", { mapWrongClass: true }],
  ] as const)(
    "leaves %s unsupported",
    async (_label, options) => {
      const fixture = packageBuildFixture(options);
      const runtime = await createSemanticRuntime({
        workspaceRoot: fixture.root,
        storeKey: `test:package-resource-build-counter:${path.basename(
          fixture.root,
        )}`,
      });
      const app = await runtime.openApp({
        analysisDepth: "binding-observation",
      });
      const definitions = app.ask({
        kind: SemanticAppQueryKind.ResourceDefinitions,
        page: { size: 100 },
      });
      expect(
        definitions.value.rows.some((row) => row.name === "build-widget"),
      ).toBe(false);
    },
    30_000,
  );
});

interface PackageBuildFixtureOptions {
  readonly staleSourceContent?: boolean;
  readonly mapOutsideClass?: boolean;
  readonly omitMetadataUse?: boolean;
  readonly nonemptyDependencies?: boolean;
  readonly outsidePackageSource?: boolean;
  readonly mapWrongClass?: boolean;
}

function packageBuildFixture(options: PackageBuildFixtureOptions = {}): {
  readonly root: string;
  readonly template: string;
} {
  const root = mkdtempSync(path.join(packageRoot, ".package-resource-build-"));
  temporaryRoots.push(root);
  const dependencyRoot = path.join(
    root,
    "node_modules",
    "@acme",
    "generated-widget",
  );
  const template = '<build-widget value.bind="message"></build-widget>\n';
  writeProjectFile(
    root,
    "package.json",
    JSON.stringify(
      {
        name: "package-resource-build-app",
        version: "0.0.0",
        type: "module",
        dependencies: { "@acme/generated-widget": "0.0.0" },
      },
      null,
      2,
    ),
  );
  writeProjectFile(
    root,
    "tsconfig.json",
    JSON.stringify(
      {
        compilerOptions: {
          target: "ES2022",
          module: "ESNext",
          moduleResolution: "Bundler",
          strict: true,
          skipLibCheck: true,
        },
        include: ["src/**/*.ts", "src/**/*.d.ts"],
      },
      null,
      2,
    ),
  );
  writeProjectFile(
    root,
    "src/main.ts",
    [
      "import { Aurelia, StandardConfiguration } from '@aurelia/runtime-html';",
      "import { BuildPackage } from '@acme/generated-widget';",
      "import { App } from './app.js';",
      "",
      "new Aurelia()",
      "  .register(StandardConfiguration, BuildPackage)",
      "  .app({ host: document.body, component: App })",
      "  .start();",
      "",
    ].join("\n"),
  );
  writeProjectFile(
    root,
    "src/app.ts",
    [
      "import { customElement } from '@aurelia/runtime-html';",
      "import template from './app.html';",
      "",
      "@customElement({ name: 'app-root', template })",
      "export class App {",
      "  message = 'hello';",
      "}",
      "",
    ].join("\n"),
  );
  writeProjectFile(root, "src/app.html", template);
  writeProjectFile(
    root,
    "src/aurelia-assets.d.ts",
    [
      "declare module '*.html' {",
      "  const value: string;",
      "  export default value;",
      "}",
      "",
    ].join("\n"),
  );

  writeProjectFile(
    dependencyRoot,
    "package.json",
    JSON.stringify(
      {
        name: "@acme/generated-widget",
        version: "1.0.0",
        type: "module",
        dependencies: { aurelia: "2.0.0" },
        exports: {
          ".": {
            types: "./dist/types/index.d.ts",
            import: "./dist/index.js",
          },
        },
      },
      null,
      2,
    ),
  );
  writeProjectFile(
    dependencyRoot,
    "dist/types/index.d.ts",
    [
      "import type { IContainer } from 'aurelia';",
      "export declare class BuildWidget { value: string; }",
      "export declare const BuildPackage: { register(container: IContainer): IContainer; };",
      "",
    ].join("\n"),
  );
  const widgetSource = [
    "import { bindable } from 'aurelia';",
    "",
    "export class DecoyWidget {}",
    "",
    "export class BuildWidget {",
    '  @bindable value = "";',
    "}",
    "",
  ].join("\n");
  writeProjectFile(dependencyRoot, "src/build-widget.ts", widgetSource);
  writeProjectFile(
    dependencyRoot,
    "src/index.ts",
    [
      "import type { IContainer } from 'aurelia';",
      "import { BuildWidget } from './build-widget.js';",
      "",
      "class PlainService {}",
      "",
      "export const BuildPackage = {",
      "  register(container: IContainer): IContainer {",
      "    return container.register(BuildWidget, PlainService);",
      "  },",
      "};",
      "",
      "export { BuildWidget } from './build-widget.js';",
      "",
    ].join("\n"),
  );
  const widgetTemplate = "<template><span>${value}</span></template>\n";
  writeProjectFile(dependencyRoot, "src/build-widget.html", widgetTemplate);
  writeProjectFile(
    dependencyRoot,
    "dist/index.js",
    [
      "export { BuildWidget } from './build-widget.js';",
      "export const BuildPackage = {};",
      "",
    ].join("\n"),
  );
  const decoratorArgument = options.omitMetadataUse
    ? "{}"
    : "build_widget_$au_exports";
  const widgetRuntime = [
    "import { customElement } from '@aurelia/runtime-html';",
    "import { build_widget_$au_exports } from './build-widget._au.js';",
    "let BuildWidget;",
    "(class {",
    `  static { ({ e: [BuildWidget] } = decorate(this, [customElement(${decoratorArgument})])); }`,
    "});",
    "export { BuildWidget };",
    "",
    "//# sourceMappingURL=build-widget.js.map",
    "",
  ].join("\n");
  writeProjectFile(dependencyRoot, "dist/build-widget.js", widgetRuntime);
  const helperOffset = widgetRuntime.indexOf("decorate(this");
  const helperPosition = lineAndColumn(widgetRuntime, helperOffset);
  const mappedSource = options.outsidePackageSource
    ? "../../outside.ts"
    : "../src/build-widget.ts";
  writeProjectFile(
    dependencyRoot,
    "dist/build-widget.js.map",
    JSON.stringify({
      version: 3,
      file: "build-widget.js",
      names: [],
      sources: [mappedSource],
      sourcesContent: [
        options.staleSourceContent ? `${widgetSource}// stale\n` : widgetSource,
      ],
      mappings: singleSourceMapping(
        helperPosition.line,
        helperPosition.column + 2,
        options.mapOutsideClass ? 0 : options.mapWrongClass ? 2 : 4,
        7,
      ),
    }),
  );

  const dependencies = options.nonemptyDependencies
    ? "[BuildDependency]"
    : "[]";
  const virtualMetadata = [
    "import { CustomElement } from '@aurelia/runtime-html';",
    'export const name = "build-widget";',
    `export const template = ${JSON.stringify(widgetTemplate)};`,
    "export default template;",
    `export const dependencies = ${dependencies};`,
    "export const bindables = {};",
    "let _e;",
    "export function register(container) {",
    "  if (!_e) _e = CustomElement.define({ name, template, dependencies, bindables });",
    "  container.register(_e);",
    "}",
    "",
  ].join("\n");
  writeProjectFile(
    dependencyRoot,
    "dist/runtime.js",
    "export function __exportAll(value) { return value; }\n",
  );
  writeProjectFile(
    dependencyRoot,
    "dist/build-widget._au.js",
    [
      "import { __exportAll } from './runtime.js';",
      'const name = "build-widget";',
      `const template = ${JSON.stringify(widgetTemplate)};`,
      `const dependencies = ${dependencies};`,
      "const bindables = {};",
      "function register(container) {}",
      "const build_widget_$au_exports = __exportAll({",
      "  bindables: () => bindables,",
      "  default: () => template,",
      "  dependencies: () => dependencies,",
      "  name: () => name,",
      "  register: () => register,",
      "  template: () => template,",
      "});",
      "export { bindables, template as default, dependencies, name, register, template, build_widget_$au_exports };",
      "",
      "//# sourceMappingURL=build-widget._au.js.map",
      "",
    ].join("\n"),
  );
  writeProjectFile(
    dependencyRoot,
    "dist/build-widget._au.js.map",
    JSON.stringify({
      version: 3,
      file: "build-widget._au.js",
      names: [],
      sources: ["../src/build-widget.$au.ts"],
      sourcesContent: [virtualMetadata],
      mappings: "",
    }),
  );
  return { root, template };
}

function singleSourceMapping(
  generatedLine: number,
  generatedColumn: number,
  originalLine: number,
  originalColumn: number,
): string {
  return `${";".repeat(generatedLine)}${[
    generatedColumn,
    0,
    originalLine,
    originalColumn,
  ]
    .map(encodeVlq)
    .join("")}`;
}

const base64 =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

function encodeVlq(value: number): string {
  let vlq = value < 0 ? (-value << 1) + 1 : value << 1;
  let output = "";
  do {
    let digit = vlq & 31;
    vlq >>>= 5;
    if (vlq > 0) digit |= 32;
    output += base64[digit]!;
  } while (vlq > 0);
  return output;
}

function lineAndColumn(
  text: string,
  offset: number,
): { readonly line: number; readonly column: number } {
  const prefix = text.slice(0, offset);
  const lines = prefix.split("\n");
  return { line: lines.length - 1, column: lines.at(-1)?.length ?? 0 };
}

function sourceCursor(
  template: string,
  marker: string,
  markerOffset: number,
): { readonly filePath: string; readonly offset: number } {
  const start = template.indexOf(marker);
  if (start < 0) throw new Error(`Expected template marker '${marker}'.`);
  return { filePath: "src/app.html", offset: start + markerOffset };
}

function writeProjectFile(
  root: string,
  relativePath: string,
  text: string,
): void {
  const fileName = path.join(root, relativePath);
  mkdirSync(path.dirname(fileName), { recursive: true });
  writeFileSync(fileName, text.endsWith("\n") ? text : `${text}\n`, "utf8");
}
