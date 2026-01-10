import { describe, it, expect } from "vitest";
import { resolve, ssrDefines } from "@aurelia-ls/resolution";
import { createProgramFromMemory } from "../_helpers/index.js";

describe("Full Pipeline: conditional registration guards", () => {
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

    const result = resolve(program);
    expect(
      result.registration.activatedPlugins.some(
        (plugin) => plugin.exportName === "RouterConfiguration"
      )
    ).toBe(true);

    const conditionalDiagnostics = result.diagnostics.filter(
      (d) => d.code === "gap:conditional-registration"
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

    const result = resolve(program);

    expect(
      result.registration.activatedPlugins.some(
        (plugin) => plugin.exportName === "RouterConfiguration"
      )
    ).toBe(true);

    const conditional = result.diagnostics.find(
      (d) => d.code === "gap:conditional-registration"
    );
    expect(conditional).toBeTruthy();
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

    const result = resolve(program);

    expect(
      result.registration.activatedPlugins.some(
        (plugin) => plugin.exportName === "RouterConfiguration"
      )
    ).toBe(false);

    const conditionalDiagnostics = result.diagnostics.filter(
      (d) => d.code === "gap:conditional-registration"
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

    const result = resolve(program);

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

    const result = resolve(program, {
      defines: ssrDefines(),
    });

    expect(
      result.registration.activatedPlugins.some(
        (plugin) => plugin.exportName === "RouterConfiguration"
      )
    ).toBe(true);

    const conditionalDiagnostics = result.diagnostics.filter(
      (d) => d.code === "gap:conditional-registration"
    );
    expect(conditionalDiagnostics.length).toBe(0);
  });
});
