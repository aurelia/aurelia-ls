import { describe, expect, test } from "vitest";

import type { CompilerCase } from "../src/testing/compiler-case.js";
import { JIT_ORACLE_CASES } from "../src/testing/jit-oracle-case-registry.js";
import {
  SemanticCompilerGalleryPlanner,
  SemanticCompilerGalleryUnsupportedReason,
} from "../src/testing/semantic-compiler-gallery-plan.js";
import {
  projectSemanticCompilerGallerySetup,
  semanticCompilerGallerySetupIsSourceProjectable,
  SemanticCompilerGallerySetupResourceKind,
} from "../src/testing/semantic-compiler-gallery-setup-source.js";

describe("semantic compiler gallery setup source", () => {
  test("projects fresh nominal CE and CA resources without executing a materializer", () => {
    const elementInvocation = {
      symbol: "element",
      factory: "resource.custom-element",
      args: {
        name: "local-card",
        template: "<template>${value}</template>",
        bindables: [{ name: "value", attribute: "public-value", mode: 2 }],
        capture: true,
        containerless: false,
        shadowMode: "open",
      },
    } as const;
    const attributeInvocation = {
      symbol: "attribute",
      factory: "resource.custom-attribute",
      args: {
        name: "status-tone",
        bindables: [{ name: "tone" }],
        isTemplateController: false,
        noMultiBindings: true,
        defaultProperty: "tone",
        aliases: ["tone"],
      },
    } as const;

    const first = projectSemanticCompilerGallerySetup(elementInvocation, "GalleryElementOne");
    const repeated = projectSemanticCompilerGallerySetup(elementInvocation, "GalleryElementTwo");
    const attribute = projectSemanticCompilerGallerySetup(attributeInvocation, "GalleryAttribute");

    expect(first.resources[0]).toMatchObject({
      kind: SemanticCompilerGallerySetupResourceKind.CustomElement,
      className: "GalleryElementOne",
      publicName: "local-card",
      metadata: {
        bindables: { value: { attribute: "public-value", mode: 2 } },
        capture: true,
        shadowOptions: { mode: "open" },
      },
    });
    expect(first.exports[0]?.resource).toBe(first.resources[0]);
    expect(repeated.resources[0]).not.toBe(first.resources[0]);
    expect(attribute.resources[0]).toMatchObject({
      kind: SemanticCompilerGallerySetupResourceKind.CustomAttribute,
      publicName: "status-tone",
      aliases: ["tone"],
      metadata: {
        bindables: { tone: true },
        noMultiBindings: true,
        defaultProperty: "tone",
      },
    });
  });

  test("keeps opaque factories and non-definition-local registrations unsupported", () => {
    expect(semanticCompilerGallerySetupIsSourceProjectable({
      symbol: "opaque",
      factory: "extension.template-compiler-hook",
    })).toBe(false);
    expect(() => projectSemanticCompilerGallerySetup({
      symbol: "opaque",
      factory: "extension.template-compiler-hook",
    }, "OpaqueSetup")).toThrow(/cannot be projected/u);

    const source = requireCase("resource.as-element.physical-tag-resource");
    const compilationLocal: CompilerCase = {
      ...source,
      id: "resource.as-element.compilation-local-control",
      world: {
        ...source.world,
        registrations: source.world.registrations.map((registration) => ({
          ...registration,
          site: "compilation-local" as const,
        })),
      },
    };
    const plan = new SemanticCompilerGalleryPlanner().plan([compilationLocal]);
    expect(plan.admitted).toEqual([]);
    expect(plan.unsupported[0]?.reasons).toEqual([
      SemanticCompilerGalleryUnsupportedReason.RegistrationMaterialization,
    ]);
  });

  test("wires projected resources only into the owning definition dependency scope", () => {
    const candidate = requireCase("resource.element-bindable.same-name-attribute");
    const plan = new SemanticCompilerGalleryPlanner().plan([candidate]);
    const galleryCase = plan.admitted[0];
    if (galleryCase == null) throw new Error("Expected one source-projectable gallery case.");
    const setupClassNames = galleryCase.setupProjections.flatMap((projection) =>
      projection.resources.map((resource) => resource.className)
    );
    const registerLine = plan.sourceText.split("\n").find((line) => line.startsWith("void new Aurelia"));

    expect(galleryCase.dependencies.map((dependency) => dependency.resource.className))
      .toEqual(setupClassNames);
    expect(plan.sourceText).toContain(`"dependencies":[${setupClassNames.join(",")}]`);
    for (const className of setupClassNames) expect(registerLine).not.toContain(className);
  });
});

function requireCase(id: string): CompilerCase {
  const candidate = JIT_ORACLE_CASES.find((entry) => entry.id === id);
  if (candidate == null) throw new Error(`Expected compiler case ${id}.`);
  return candidate;
}
