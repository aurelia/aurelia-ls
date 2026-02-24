/**
 * Third-party resolution module tests.
 *
 * Tests for merge utilities, scan heuristics, and explicit resource building.
 */

import { describe, it, expect } from "vitest";
import {
  applyThirdPartyResources,
  buildThirdPartyResources,
  hasThirdPartyResources,
  mergeResourceCollections,
  mergeScopeResources,
  shouldScanPackage,
} from "../../out/project-semantics/third-party/index.js";
import { discoverProjectSemantics } from "../../out/project-semantics/resolve.js";
import { unwrapSourced, type NormalizedPath, type ResourceCollections } from "../../out/project-semantics/compiler.js";
import { DiagnosticsRuntime } from "../../out/diagnostics/runtime.js";
import { createProgramFromMemory } from "./_helpers/index.js";
import type { FileSystemContext } from "../../out/project-semantics/project/context.js";

// ============================================================================
// shouldScanPackage
// ============================================================================

describe("shouldScanPackage", () => {
  it("returns true for 'aurelia' package", async () => {
    expect(await shouldScanPackage("aurelia", "/fake")).toBe(true);
  });

  it("returns true for @aurelia/* scoped packages", async () => {
    expect(await shouldScanPackage("@aurelia/runtime-html", "/fake")).toBe(true);
    expect(await shouldScanPackage("@aurelia/router", "/fake")).toBe(true);
  });

  it("returns true for packages containing 'aurelia' in the name", async () => {
    expect(await shouldScanPackage("aurelia2-table", "/fake")).toBe(true);
    expect(await shouldScanPackage("my-aurelia-plugin", "/fake")).toBe(true);
  });

  it("returns false for unrelated packages with non-existent path", async () => {
    expect(await shouldScanPackage("lodash", "/non/existent/path")).toBe(false);
    expect(await shouldScanPackage("express", "/non/existent/path")).toBe(false);
  });
});

// ============================================================================
// hasThirdPartyResources
// ============================================================================

describe("hasThirdPartyResources", () => {
  it("returns false for empty object", () => {
    expect(hasThirdPartyResources({})).toBe(false);
  });

  it("returns false for collections with empty records", () => {
    expect(hasThirdPartyResources({ elements: {}, attributes: {} })).toBe(false);
  });

  it("returns true when elements are present", () => {
    expect(hasThirdPartyResources({
      elements: { "my-el": { kind: "element", name: "my-el", bindables: {} } },
    })).toBe(true);
  });

  it("returns true when attributes are present", () => {
    expect(hasThirdPartyResources({
      attributes: { "my-attr": { kind: "attribute", name: "my-attr", bindables: {} } },
    })).toBe(true);
  });

  it("returns true when value converters are present", () => {
    expect(hasThirdPartyResources({
      valueConverters: { "slugify": { name: "slugify", in: { kind: "unknown" }, out: { kind: "unknown" } } },
    })).toBe(true);
  });
});

// ============================================================================
// buildThirdPartyResources
// ============================================================================

describe("buildThirdPartyResources", () => {
  it("returns empty object for undefined config", () => {
    const result = buildThirdPartyResources(undefined);
    expect(hasThirdPartyResources(result)).toBe(false);
  });

  it("returns empty object for empty config", () => {
    const result = buildThirdPartyResources({});
    expect(hasThirdPartyResources(result)).toBe(false);
  });

  it("builds elements with bindables", () => {
    const result = buildThirdPartyResources({
      elements: {
        "my-element": {
          bindables: {
            value: {
              property: "displayData",
              attribute: "display-data",
              mode: "two-way",
              primary: true,
              type: "DisplayData",
              doc: "Display payload",
            },
            label: {},
          },
        },
      },
    });
    expect(result.elements).toBeDefined();
    const el = result.elements!["my-element"];
    expect(el).toBeDefined();
    expect(el!.name).toBe("my-element");
    expect(el!.bindables["displayData"]!.attribute).toBe("display-data");
    expect(el!.bindables["displayData"]!.mode).toBe("twoWay");
    expect(el!.bindables["displayData"]!.primary).toBe(true);
    expect(el!.bindables["displayData"]!.type).toEqual({ kind: "ts", name: "DisplayData" });
    expect(el!.bindables["displayData"]!.doc).toBe("Display payload");
    expect(el!.bindables["label"]!.name).toBe("label");
    expect(el!.bindables["label"]!.mode).toBeUndefined();
  });

  it("normalizes bindable type aliases for any and unknown", () => {
    const result = buildThirdPartyResources({
      elements: {
        "typed-el": {
          bindables: {
            anyProp: { type: "any" },
            unknownProp: { type: "unknown" },
          },
        },
      },
    });

    const el = result.elements!["typed-el"]!;
    expect(el.bindables["anyProp"]!.type).toEqual({ kind: "any" });
    expect(el.bindables["unknownProp"]!.type).toEqual({ kind: "unknown" });
  });

  it("builds attributes with template controller flag", () => {
    const result = buildThirdPartyResources({
      attributes: {
        "my-if": {
          bindables: {
            condition: {
              property: "condition",
              attribute: "if",
              mode: "to-view",
              primary: true,
              type: "boolean",
              doc: "Template branch condition",
            },
          },
          isTemplateController: true,
        },
      },
    });
    const attr = result.attributes!["my-if"];
    expect(attr).toBeDefined();
    expect(attr!.name).toBe("my-if");
    expect((attr as any).isTemplateController).toBe(true);
    expect(attr!.bindables["condition"]!.attribute).toBe("if");
    expect(attr!.bindables["condition"]!.mode).toBe("toView");
    expect(attr!.bindables["condition"]!.primary).toBe(true);
    expect(attr!.bindables["condition"]!.type).toEqual({ kind: "ts", name: "boolean" });
    expect(attr!.bindables["condition"]!.doc).toBe("Template branch condition");
  });

  it("builds value converters", () => {
    const result = buildThirdPartyResources({
      valueConverters: ["slugify", "titlecase"],
    });
    expect(result.valueConverters).toBeDefined();
    expect(result.valueConverters!["slugify"]).toBeDefined();
    expect(result.valueConverters!["titlecase"]).toBeDefined();
  });

  it("builds binding behaviors", () => {
    const result = buildThirdPartyResources({
      bindingBehaviors: ["debounce", "throttle"],
    });
    expect(result.bindingBehaviors).toBeDefined();
    expect(result.bindingBehaviors!["debounce"]!.name).toBe("debounce");
    expect(result.bindingBehaviors!["throttle"]!.name).toBe("throttle");
  });

  it("normalizes resource names to lowercase", () => {
    const result = buildThirdPartyResources({
      elements: { "MyElement": { bindables: {} } },
      attributes: { "MyAttr": {} },
    });
    expect(result.elements!["myelement"]).toBeDefined();
    expect(result.attributes!["myattr"]).toBeDefined();
  });

  it("converts all binding mode strings", () => {
    const result = buildThirdPartyResources({
      elements: {
        "test-el": {
          bindables: {
            a: { mode: "one-time" },
            b: { mode: "to-view" },
            c: { mode: "from-view" },
            d: { mode: "two-way" },
          },
        },
      },
    });
    const el = result.elements!["test-el"]!;
    expect(el.bindables["a"]!.mode).toBe("oneTime");
    expect(el.bindables["b"]!.mode).toBe("toView");
    expect(el.bindables["c"]!.mode).toBe("fromView");
    expect(el.bindables["d"]!.mode).toBe("twoWay");
  });
});

// ============================================================================
// mergeResourceCollections
// ============================================================================

describe("mergeResourceCollections", () => {
  const base: ResourceCollections = {
    elements: { "el-a": { kind: "element", name: "el-a", bindables: {} } },
    attributes: { "attr-a": { kind: "attribute", name: "attr-a", bindables: {} } },
    controllers: {},
    valueConverters: {},
    bindingBehaviors: {},
  };

  it("returns base when extra is empty", () => {
    const result = mergeResourceCollections(base, {});
    expect(result.elements).toBe(base.elements);
    expect(result.attributes).toBe(base.attributes);
  });

  it("merges extra elements into base", () => {
    const extra = {
      elements: { "el-b": { kind: "element" as const, name: "el-b", bindables: {} } },
    };
    const result = mergeResourceCollections(base, extra);
    expect(result.elements["el-a"]).toBeDefined();
    expect(result.elements["el-b"]).toBeDefined();
  });

  it("extra overrides base for same key", () => {
    const extra = {
      elements: { "el-a": { kind: "element" as const, name: "el-a-override", bindables: { x: { name: "x" } } } },
    };
    const result = mergeResourceCollections(base, extra);
    expect(result.elements["el-a"]!.name).toBe("el-a-override");
  });

  it("merges explicit bindable fields into resolved collections", () => {
    const baseWithBindable: ResourceCollections = {
      elements: {
        "el-a": {
          kind: "element",
          name: "el-a",
          bindables: {
            displayData: {
              name: "displayData",
              mode: "toView",
            },
          },
        },
      },
      attributes: {},
      controllers: {},
      valueConverters: {},
      bindingBehaviors: {},
    };

    const extra = buildThirdPartyResources({
      elements: {
        "el-a": {
          bindables: {
            displayData: {
              mode: "two-way",
              primary: true,
              attribute: "display-data",
              type: "DisplayData",
              doc: "Payload from explicit config",
            },
          },
        },
      },
    });

    const result = mergeResourceCollections(baseWithBindable, extra);
    const bindable = result.elements["el-a"]!.bindables["displayData"]!;
    expect(bindable.name).toBe("displayData");
    expect(bindable.attribute).toBe("display-data");
    expect(bindable.mode).toBe("twoWay");
    expect(bindable.primary).toBe(true);
    expect(bindable.type).toEqual({ kind: "ts", name: "DisplayData" });
    expect(bindable.doc).toBe("Payload from explicit config");
  });
});

// ============================================================================
// mergeScopeResources
// ============================================================================

describe("mergeScopeResources", () => {
  it("handles undefined base", () => {
    const extra = {
      elements: { "el-a": { kind: "element" as const, name: "el-a", bindables: {} } },
    };
    const result = mergeScopeResources(undefined, extra);
    expect(result.elements!["el-a"]).toBeDefined();
  });

  it("merges attributes from both sides", () => {
    const base = {
      attributes: { "a": { kind: "attribute" as const, name: "a", bindables: {} } },
    };
    const extra = {
      attributes: { "b": { kind: "attribute" as const, name: "b", bindables: {} } },
    };
    const result = mergeScopeResources(base, extra);
    expect(result.attributes!["a"]).toBeDefined();
    expect(result.attributes!["b"]).toBeDefined();
  });
});

// ============================================================================
// applyThirdPartyResources
// ============================================================================

describe("applyThirdPartyResources", () => {
  it("recomputes authority/evidence/convergence channels for overlays", () => {
    const { program } = createProgramFromMemory(
      {
        "/workspace/out/local-debounce.ts": `
          declare function bindingBehavior(name: string): ClassDecorator;
          @bindingBehavior("debounce")
          export class LocalDebounceBindingBehavior {}
        `,
        "/external/runtime-debounce.ts": `
          declare function bindingBehavior(name: string): ClassDecorator;
          @bindingBehavior("debounce")
          export class RuntimeDebounceBindingBehavior {}
        `,
      },
      [
        "/workspace/out/local-debounce.ts",
        "/external/runtime-debounce.ts",
      ],
    );
    const diagnostics = new DiagnosticsRuntime();
    const base = discoverProjectSemantics(program, {
      packagePath: "/workspace",
      diagnostics: diagnostics.forSource("project"),
    });

    const extra = buildThirdPartyResources({
      bindingBehaviors: ["debounce", "rate-limit"],
    });
    const merged = applyThirdPartyResources(base, extra);

    expect(merged.definition.evidence.length).toBeGreaterThan(base.definition.evidence.length);
    expect(
      merged.definition.evidence.some(
        (resource) => resource.kind === "binding-behavior" && unwrapSourced(resource.name) === "rate-limit",
      ),
    ).toBe(true);
    expect(
      merged.definition.authority.some(
        (resource) => resource.kind === "binding-behavior" && unwrapSourced(resource.name) === "rate-limit",
      ),
    ).toBe(true);

    const debounceAuthority = merged.definition.authority.find(
      (resource) => resource.kind === "binding-behavior" && unwrapSourced(resource.name) === "debounce",
    );
    expect(debounceAuthority).toBeDefined();
    expect(debounceAuthority!.file).toBe("/workspace/out/local-debounce.ts");

    const debounceConvergence = merged.definition.convergence.find(
      (record) => record.resourceKind === "binding-behavior" && record.resourceName === "debounce",
    );
    expect(debounceConvergence).toBeDefined();
    expect(debounceConvergence!.candidates.length).toBeGreaterThanOrEqual(3);

    const newDiagnostics = merged.diagnostics.slice(base.diagnostics.length);
    expect(newDiagnostics.some((diagnostic) => diagnostic.code === "aurelia/project/definition-convergence")).toBe(true);
  });

  it("keeps local winner stable under root-order permutations after overlay recompute", () => {
    const files = {
      "/workspace/out/local-debounce.ts": `
        declare function bindingBehavior(name: string): ClassDecorator;
        @bindingBehavior("debounce")
        export class LocalDebounceBindingBehavior {}
      `,
      "/external/runtime-debounce.ts": `
        declare function bindingBehavior(name: string): ClassDecorator;
        @bindingBehavior("debounce")
        export class RuntimeDebounceBindingBehavior {}
      `,
    };
    const diagnostics = new DiagnosticsRuntime();
    const extras = buildThirdPartyResources({ bindingBehaviors: ["debounce"] });

    const forward = discoverProjectSemantics(
      createProgramFromMemory(files, [
        "/workspace/out/local-debounce.ts",
        "/external/runtime-debounce.ts",
      ]).program,
      { packagePath: "/workspace", diagnostics: diagnostics.forSource("project") },
    );
    const reverse = discoverProjectSemantics(
      createProgramFromMemory(files, [
        "/external/runtime-debounce.ts",
        "/workspace/out/local-debounce.ts",
      ]).program,
      { packagePath: "/workspace", diagnostics: diagnostics.forSource("project") },
    );

    const mergedForward = applyThirdPartyResources(forward, extras);
    const mergedReverse = applyThirdPartyResources(reverse, extras);

    const forwardAuthority = mergedForward.definition.authority.find(
      (resource) => resource.kind === "binding-behavior" && unwrapSourced(resource.name) === "debounce",
    );
    const reverseAuthority = mergedReverse.definition.authority.find(
      (resource) => resource.kind === "binding-behavior" && unwrapSourced(resource.name) === "debounce",
    );
    expect(forwardAuthority).toBeDefined();
    expect(reverseAuthority).toBeDefined();
    expect(forwardAuthority!.file).toBe("/workspace/out/local-debounce.ts");
    expect(reverseAuthority!.file).toBe("/workspace/out/local-debounce.ts");
  });

  it("keeps template-meta candidates weak after replay (winner + provenance stable)", () => {
    const files: Record<string, string> = {
      "/workspace/out/device-list.ts": `
        declare function customElement(name: string): ClassDecorator;
        @customElement("device-list")
        export class DeviceListCustomElement {
          static bindables = {
            displayData: { mode: "toView" },
          };
        }
      `,
      "/workspace/out/placeholder.ts": `export const placeholder = true;`,
      "/workspace/out/device-list.html": `
        <bindable name="display-data" mode="two-way"></bindable>
      `,
    };

    const run = (rootNames: string[]) => {
      const { program } = createProgramFromMemory(files, rootNames);
      const diagnostics = new DiagnosticsRuntime();
      const base = discoverProjectSemantics(program, {
        packagePath: "/workspace",
        fileSystem: createMockFileSystemForFiles(files),
        diagnostics: diagnostics.forSource("project"),
      });
      const merged = applyThirdPartyResources(
        base,
        buildThirdPartyResources({ bindingBehaviors: ["debounce"] }),
      );
      return { base, merged };
    };

    const forward = run([
      "/workspace/out/device-list.ts",
      "/workspace/out/placeholder.ts",
    ]);
    const reverse = run([
      "/workspace/out/placeholder.ts",
      "/workspace/out/device-list.ts",
    ]);

    const assertWeakTemplateMetaContract = (result: ReturnType<typeof run>) => {
      const element = result.merged.semantics.elements["device-list"];
      expect(element).toBeDefined();
      expect(unwrapSourced(element!.bindables.displayData?.mode)).toBe("toView");

      const convergence = result.merged.definition.convergence.find(
        (record) => record.resourceKind === "custom-element" && record.resourceName === "device-list",
      );
      expect(convergence).toBeDefined();
      const htmlCandidate = convergence!.candidates.find((candidate) => candidate.file?.endsWith(".html"));
      expect(htmlCandidate).toBeDefined();
      expect(htmlCandidate!.sourceKind).toBe("analysis-convention");
    };

    assertWeakTemplateMetaContract(forward);
    assertWeakTemplateMetaContract(reverse);
  });

  it("keeps inline template-meta candidates weak after replay (winner + provenance stable)", () => {
    const files: Record<string, string> = {
      "/workspace/out/inline-device.ts": `
        declare function customElement(definition: { name: string; template: string }): ClassDecorator;
        @customElement({
          name: "inline-device",
          template: \`<bindable name="display-data" mode="two-way"></bindable>\`,
        })
        export class InlineDeviceCustomElement {
          static bindables = {
            displayData: { mode: "toView" },
          };
        }
      `,
      "/workspace/out/placeholder.ts": `export const placeholder = true;`,
    };

    const run = (rootNames: string[]) => {
      const { program } = createProgramFromMemory(files, rootNames);
      const diagnostics = new DiagnosticsRuntime();
      const base = discoverProjectSemantics(program, {
        packagePath: "/workspace",
        diagnostics: diagnostics.forSource("project"),
      });
      const merged = applyThirdPartyResources(
        base,
        buildThirdPartyResources({ bindingBehaviors: ["debounce"] }),
      );
      return { merged };
    };

    const forward = run([
      "/workspace/out/inline-device.ts",
      "/workspace/out/placeholder.ts",
    ]);
    const reverse = run([
      "/workspace/out/placeholder.ts",
      "/workspace/out/inline-device.ts",
    ]);

    const assertWeakInlineTemplateMetaContract = (result: ReturnType<typeof run>) => {
      const element = result.merged.semantics.elements["inline-device"];
      expect(element).toBeDefined();
      expect(unwrapSourced(element!.bindables.displayData?.mode)).toBe("toView");

      const convergence = result.merged.definition.convergence.find(
        (record) => record.resourceKind === "custom-element" && record.resourceName === "inline-device",
      );
      expect(convergence).toBeDefined();
      const weakCandidate = convergence!.candidates.find((candidate) => candidate.sourceKind === "analysis-convention");
      expect(weakCandidate).toBeDefined();
    };

    assertWeakInlineTemplateMetaContract(forward);
    assertWeakInlineTemplateMetaContract(reverse);
  });

  it("keeps local-template bindables authoritative and surface-only fields inert after overlay replay", () => {
    const files: Record<string, string> = {
      "/workspace/out/my-page.ts": `
        declare function customElement(name: string): ClassDecorator;
        @customElement("my-page")
        export class MyPageCustomElement {}
      `,
      "/workspace/out/my-page.html": `
        <template as-custom-element="local-card">
          <bindable name="status" mode="two-way"></bindable>
          <alias name="local-alias"></alias>
          <containerless></containerless>
        </template>
      `,
      "/workspace/out/placeholder.ts": `export const placeholder = true;`,
    };

    const run = (rootNames: string[]) => {
      const { program } = createProgramFromMemory(files, rootNames);
      const diagnostics = new DiagnosticsRuntime();
      const base = discoverProjectSemantics(program, {
        packagePath: "/workspace",
        fileSystem: createMockFileSystemForFiles(files),
        diagnostics: diagnostics.forSource("project"),
      });
      const merged = applyThirdPartyResources(
        base,
        buildThirdPartyResources({ bindingBehaviors: ["debounce"] }),
      );
      return { base, merged };
    };

    const forward = run([
      "/workspace/out/my-page.ts",
      "/workspace/out/placeholder.ts",
    ]);
    const reverse = run([
      "/workspace/out/placeholder.ts",
      "/workspace/out/my-page.ts",
    ]);

    const assertLocalTemplateContract = (result: ReturnType<typeof run>) => {
      const localDefinitionSite = result.base.registration.sites.find((site) =>
        site.evidence.kind === "local-template-definition"
        && site.evidence.localTemplateName === "local-card",
      );
      expect(localDefinitionSite).toBeDefined();
      expect(localDefinitionSite?.resourceRef.kind).toBe("resolved");
      if (localDefinitionSite?.resourceRef.kind === "resolved") {
        expect(unwrapSourced(localDefinitionSite.resourceRef.resource.bindables.status?.mode)).toBe("twoWay");
        expect(unwrapSourced(localDefinitionSite.resourceRef.resource.containerless)).toBeUndefined();
        expect(localDefinitionSite.resourceRef.resource.aliases).toHaveLength(0);
      }

      const localScope = result.merged.resourceGraph.scopes["local:/workspace/out/my-page.ts"];
      const localCard = localScope?.resources?.elements?.["local-card"];
      expect(localCard).toBeDefined();
      expect(localCard?.bindables?.status?.mode).toBe("twoWay");
      expect(localCard?.containerless).toBeUndefined();
      expect(localCard?.aliases).toBeUndefined();
    };

    assertLocalTemplateContract(forward);
    assertLocalTemplateContract(reverse);
  });

  it("enrolls builtin repeat in convergence when overlay collides on template-controller key", () => {
    const { program } = createProgramFromMemory(
      { "/workspace/out/placeholder.ts": "export const x = 1;" },
      ["/workspace/out/placeholder.ts"],
    );
    const diagnostics = new DiagnosticsRuntime();
    const base = discoverProjectSemantics(program, {
      packagePath: "/workspace",
      diagnostics: diagnostics.forSource("project"),
    });

    const extra = buildThirdPartyResources({
      attributes: {
        repeat: {
          isTemplateController: true,
          bindables: {
            items: { mode: "from-view" },
            tracked: {},
          },
        },
      },
    });

    const merged = applyThirdPartyResources(base, extra);
    const repeat = merged.semantics.controllers.repeat;
    expect(repeat).toBeDefined();
    expect(repeat.semantics?.injects?.contextuals).toContain("$previous");
    expect(unwrapSourced(repeat.bindables.items?.mode)).toBe("fromView");
    expect(repeat.bindables.tracked).toBeDefined();

    const convergence = merged.definition.convergence.find(
      (record) => record.resourceKind === "template-controller" && record.resourceName === "repeat",
    );
    expect(convergence).toBeDefined();
    const sourceKinds = new Set(convergence!.candidates.map((candidate) => candidate.sourceKind));
    expect(sourceKinds.has("builtin")).toBe(true);
    expect(sourceKinds.has("explicit-config")).toBe(true);
  });

  it("does not create repeat convergence when overlay does not redefine repeat", () => {
    const { program } = createProgramFromMemory(
      { "/workspace/out/placeholder.ts": "export const x = 1;" },
      ["/workspace/out/placeholder.ts"],
    );
    const diagnostics = new DiagnosticsRuntime();
    const base = discoverProjectSemantics(program, {
      packagePath: "/workspace",
      diagnostics: diagnostics.forSource("project"),
    });

    const extra = buildThirdPartyResources({
      attributes: {
        "external-only": {
          isTemplateController: true,
          bindables: {
            value: {},
          },
        },
      },
    });

    const merged = applyThirdPartyResources(base, extra);
    const repeatConvergence = merged.definition.convergence.filter(
      (record) => record.resourceKind === "template-controller" && record.resourceName === "repeat",
    );
    expect(repeatConvergence).toHaveLength(0);
  });
});

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
