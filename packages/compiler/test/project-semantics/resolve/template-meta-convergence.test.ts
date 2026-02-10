import { describe, expect, it } from "vitest";
import ts from "typescript";
import {
  discoverProjectSemantics,
  DiagnosticsRuntime,
  materializeResourcesForScope,
  unwrapSourced,
  type NormalizedPath,
} from "@aurelia-ls/compiler";
import type { FileSystemContext } from "../../../src/project-semantics/project/context.js";

function createProgramFromFiles(files: Record<string, string>): ts.Program {
  const host = ts.createCompilerHost({});
  host.fileExists = (fileName) => fileName in files;
  host.readFile = (fileName) => files[fileName];
  host.getSourceFile = (fileName, languageVersion) => {
    const content = files[fileName];
    return content ? ts.createSourceFile(fileName, content, languageVersion) : undefined;
  };

  return ts.createProgram(
    Object.keys(files).filter((filePath) => filePath.endsWith(".ts")),
    { target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.ESNext },
    host,
  );
}

function createMockFileSystemForFiles(files: Record<string, string>): FileSystemContext {
  return {
    fileExists: (path) => path in files,
    readFile: (path) => files[path],
    readDirectory: () => [],
    getSiblingFiles: (sourcePath, extensions) => {
      const dir = sourcePath.substring(0, sourcePath.lastIndexOf("/") + 1);
      const baseName = sourcePath.substring(sourcePath.lastIndexOf("/") + 1).replace(/\.(ts|js)$/, "");
      return extensions
        .map((extension) => {
          const siblingPath = `${dir}${baseName}${extension}`;
          if (!(siblingPath in files)) {
            return null;
          }
          return {
            path: siblingPath as NormalizedPath,
            extension,
            baseName,
          };
        })
        .filter((entry): entry is NonNullable<typeof entry> => entry !== null);
    },
    normalizePath: (path) => path as NormalizedPath,
    caseSensitive: true,
  };
}

describe("Template Meta Convergence", () => {
  it("prefers class/runtime values over sibling template metadata while still backfilling unknowns", () => {
    const files: Record<string, string> = {
      "/app/device-list.ts": `
        export class DeviceListCustomElement {
          static bindables = {
            displayData: { mode: "toView" },
            status: {},
          };
        }
      `,
      "/app/device-list.html": `
        <bindable name="display-data" mode="two-way" attribute="display-data">
        <bindable name="status" mode="two-way">
        <containerless>
        <div></div>
      `,
    };

    const program = createProgramFromFiles(files);
    const fileSystem = createMockFileSystemForFiles(files);
    const diagnostics = new DiagnosticsRuntime();
    const result = discoverProjectSemantics(program, {
      fileSystem,
      diagnostics: diagnostics.forSource("project"),
    });

    const element = result.semantics.elements["device-list"];
    expect(element).toBeDefined();
    expect(unwrapSourced(element!.bindables.displayData?.mode)).toBe("toView");
    expect(unwrapSourced(element!.bindables.status?.mode)).toBe("twoWay");
    expect(unwrapSourced(element!.containerless)).toBe(false);
    expect(result.definitionConvergence.some((entry) =>
      entry.resourceKind === "custom-element"
      && entry.resourceName === "device-list"
      && entry.candidates.some((candidate) => candidate.file?.endsWith(".html"))
    )).toBe(true);
  });

  it("applies inline root-template metadata to fill unknown bindable fields", () => {
    const files: Record<string, string> = {
      "/app/inline-demo.ts": `
        import { customElement, bindable } from "@aurelia/runtime-html";

        @customElement({
          name: "inline-demo",
          template: "<bindable name='value' mode='two-way'><div></div>"
        })
        export class InlineDemo {
          @bindable value = "";
        }
      `,
    };

    const program = createProgramFromFiles(files);
    const diagnostics = new DiagnosticsRuntime();
    const result = discoverProjectSemantics(program, {
      diagnostics: diagnostics.forSource("project"),
    });

    const element = result.semantics.elements["inline-demo"];
    expect(element).toBeDefined();
    expect(unwrapSourced(element!.bindables.value?.mode)).toBe("twoWay");
  });

  it("registers local-template definitions in component-local scope and keeps them out of root scope", () => {
    const files: Record<string, string> = {
      "/app/my-page.ts": `
        import { customElement } from "@aurelia/runtime-html";

        @customElement({ name: "my-page" })
        export class MyPage {}
      `,
      "/app/my-page.html": `
        <template as-custom-element="local-card" bindable="value">
          <bindable name="status" mode="two-way">
          <containerless>
        </template>
        <local-card></local-card>
      `,
    };

    const program = createProgramFromFiles(files);
    const fileSystem = createMockFileSystemForFiles(files);
    const diagnostics = new DiagnosticsRuntime();
    const result = discoverProjectSemantics(program, {
      fileSystem,
      diagnostics: diagnostics.forSource("project"),
    });

    const localDefinitionSite = result.registration.sites.find((site) =>
      site.evidence.kind === "local-template-definition"
      && site.evidence.localTemplateName === "local-card",
    );

    expect(localDefinitionSite).toBeDefined();
    expect(localDefinitionSite?.scope.kind).toBe("local");
    if (localDefinitionSite?.resourceRef.kind === "resolved") {
      expect(unwrapSourced(localDefinitionSite.resourceRef.resource.name)).toBe("local-card");
      expect(unwrapSourced(localDefinitionSite.resourceRef.resource.bindables.status?.mode)).toBe("twoWay");
    }

    const rootProjection = materializeResourcesForScope(
      result.semantics,
      result.resourceGraph,
      result.resourceGraph.root,
    );
    expect(rootProjection.resources.elements["local-card"]).toBeUndefined();

    const localProjection = materializeResourcesForScope(
      result.semantics,
      result.resourceGraph,
      "local:/app/my-page.ts",
    );
    expect(localProjection.resources.elements["local-card"]).toBeDefined();
  });
});
