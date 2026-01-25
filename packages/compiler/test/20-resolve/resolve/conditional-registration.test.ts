import { describe, it, expect } from "vitest";
import { normalizePathForId } from "@aurelia-ls/compiler";
import { resolve, ssrDefines, DiagnosticsRuntime } from "@aurelia-ls/compiler";
import { createProgramFromMemory } from "../_helpers/index.js";

describe("Full Pipeline: conditional registration guards", () => {
  type ResolveConfig = NonNullable<Parameters<typeof resolve>[1]>;
  const resolveWithDiagnostics = (
    program: Parameters<typeof resolve>[0],
    config?: Omit<ResolveConfig, "diagnostics">,
  ) => {
    const diagnostics = new DiagnosticsRuntime();
    return resolve(program, { ...config, diagnostics: diagnostics.forSource("resolution") });
  };

  it("activates plugins when the guard resolves to true", () => {
    const { program } = createProgramFromMemory({
      "/src/main.ts": `
        import Aurelia from "aurelia";
        import { RouterConfiguration } from "@aurelia/router";
        const ENABLE_ROUTER = true;
        if (ENABLE_ROUTER) {
          Aurelia.register(RouterConfiguration);
        }
      `,
    });

    const result = resolveWithDiagnostics(program);
    expect(
      result.registration.activatedPlugins.some(
        (plugin) => plugin.exportName === "RouterConfiguration"
      )
    ).toBe(true);

    const conditionalDiagnostics = result.diagnostics.filter(
      (d) => d.code === "aurelia/gap/unknown-registration" && d.data?.gapKind === "conditional-registration"
    );
    expect(conditionalDiagnostics.length).toBe(0);
  });

  it("reports a conditional-registration gap when the guard is unknown", () => {
    const { program } = createProgramFromMemory({
      "/src/main.ts": `
        import Aurelia from "aurelia";
        import { RouterConfiguration } from "@aurelia/router";
        const ssrDef = window.__AU_DEF__;
        if (ssrDef) {
          Aurelia.register(RouterConfiguration);
        }
      `,
    });

    const result = resolveWithDiagnostics(program);

    expect(
      result.registration.activatedPlugins.some(
        (plugin) => plugin.exportName === "RouterConfiguration"
      )
    ).toBe(true);

    const conditional = result.diagnostics.find(
      (d) => d.code === "aurelia/gap/unknown-registration" && d.data?.gapKind === "conditional-registration"
    );
    expect(conditional).toBeTruthy();
    const expectedSource = normalizePathForId("/src/main.ts");
    expect(conditional?.source).toBe("resolution");
    expect(conditional?.uri).toBe(expectedSource);
    expect(result.catalog.confidence).toBe("partial");
    expect(result.semanticSnapshot.confidence).toBe("partial");
    expect(result.catalog.gaps).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "conditional-registration",
          resource: expectedSource,
        }),
      ])
    );
  });

  it("marks unresolved imports as conservative and locates the gap", () => {
    const { program } = createProgramFromMemory({
      "/src/main.ts": `
        import { customElement } from "@aurelia/runtime-html";
        import { Missing } from "./dep";

        @customElement({ name: "foo", dependencies: [Missing] })
        export class Foo {}
      `,
      "/src/dep.ts": `
        export const Present = 1;
      `,
    });

    const result = resolveWithDiagnostics(program);
    const unresolved = result.diagnostics.find(
      (d) => d.code === "aurelia/gap/partial-eval" && d.data?.gapKind === "unresolved-import"
    );
    expect(unresolved).toBeTruthy();
    const expectedSource = normalizePathForId("/src/main.ts");
    expect(unresolved?.source).toBe("resolution");
    expect(unresolved?.uri).toBe(expectedSource);
    expect(result.catalog.confidence).toBe("conservative");
    expect(result.semanticSnapshot.confidence).toBe("conservative");
    expect(result.catalog.gaps).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "unresolved-import",
          resource: expectedSource,
        }),
      ])
    );
  });

  it("filters registrations when the guard resolves to false", () => {
    const { program } = createProgramFromMemory({
      "/src/main.ts": `
        import Aurelia from "aurelia";
        import { RouterConfiguration } from "@aurelia/router";
        const ENABLE_ROUTER = false;
        if (ENABLE_ROUTER) {
          Aurelia.register(RouterConfiguration);
        }
      `,
    });

    const result = resolveWithDiagnostics(program);

    expect(
      result.registration.activatedPlugins.some(
        (plugin) => plugin.exportName === "RouterConfiguration"
      )
    ).toBe(false);

    const conditionalDiagnostics = result.diagnostics.filter(
      (d) => d.code === "aurelia/gap/unknown-registration" && d.data?.gapKind === "conditional-registration"
    );
    expect(conditionalDiagnostics.length).toBe(0);
  });

  it("honors else branches when the guard resolves to false", () => {
    const { program } = createProgramFromMemory({
      "/src/main.ts": `
        import Aurelia from "aurelia";
        import { RouterConfiguration } from "@aurelia/router";
        const ENABLE_ROUTER = false;
        if (ENABLE_ROUTER) {
          Aurelia.register([]);
        } else {
          Aurelia.register(RouterConfiguration);
        }
      `,
    });

    const result = resolveWithDiagnostics(program);

    expect(
      result.registration.activatedPlugins.some(
        (plugin) => plugin.exportName === "RouterConfiguration"
      )
    ).toBe(true);
  });

  it("can discharge SSR guards via compile-time defines", () => {
    const { program } = createProgramFromMemory({
      "/src/main.ts": `
        import Aurelia from "aurelia";
        import { RouterConfiguration } from "@aurelia/router";
        const ssrDef = window.__AU_DEF__;
        if (ssrDef) {
          Aurelia.register(RouterConfiguration);
        }
      `,
    });

    const result = resolveWithDiagnostics(program, {
      defines: ssrDefines(),
    });

    expect(
      result.registration.activatedPlugins.some(
        (plugin) => plugin.exportName === "RouterConfiguration"
      )
    ).toBe(true);

    const conditionalDiagnostics = result.diagnostics.filter(
      (d) => d.code === "aurelia/gap/unknown-registration" && d.data?.gapKind === "conditional-registration"
    );
    expect(conditionalDiagnostics.length).toBe(0);
  });
});
