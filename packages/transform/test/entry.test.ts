/**
 * Entry Point Transform Tests
 *
 * Tests for analyzing and transforming Aurelia entry points.
 */

import { describe, it, expect } from "vitest";
import {
  analyzeEntryPoint,
  shouldTransformEntryPoint,
  buildAotConfiguration,
  generateInitialization,
  transformEntryPoint,
} from "@aurelia-ls/transform";

describe("analyzeEntryPoint", () => {
  describe("static API detection", () => {
    it("detects Aurelia.app() as static API with implicit StandardConfiguration", () => {
      const source = `
import Aurelia from 'aurelia';
import { MyApp } from './my-app';

Aurelia.app(MyApp).start();
`.trim();

      const analysis = analyzeEntryPoint(source);

      expect(analysis.initPattern).toBe("static-api");
      expect(analysis.hasStandardConfiguration).toBe(true);
      expect(analysis.configLocation?.type).toBe("implicit");
    });

    it("detects Aurelia.register(...).app() with preserved registrations", () => {
      const source = `
import Aurelia, { RouterConfiguration } from 'aurelia';
import { MyApp } from './my-app';

Aurelia
  .register(RouterConfiguration)
  .app(MyApp)
  .start();
`.trim();

      const analysis = analyzeEntryPoint(source);

      expect(analysis.initPattern).toBe("static-api");
      expect(analysis.hasStandardConfiguration).toBe(true);
      expect(analysis.preservedRegistrations.length).toBe(1);
      expect(analysis.preservedRegistrations[0]?.expression).toBe("RouterConfiguration");
    });

    it("detects multiple preserved registrations", () => {
      const source = `
import Aurelia, { RouterConfiguration, DialogConfiguration } from 'aurelia';
import { MyApp } from './my-app';

Aurelia
  .register(RouterConfiguration, DialogConfiguration)
  .app(MyApp)
  .start();
`.trim();

      const analysis = analyzeEntryPoint(source);

      expect(analysis.preservedRegistrations.length).toBe(2);
      expect(analysis.preservedRegistrations[0]?.expression).toBe("RouterConfiguration");
      expect(analysis.preservedRegistrations[1]?.expression).toBe("DialogConfiguration");
    });
  });

  describe("instance API detection", () => {
    it("detects new Aurelia().app() as instance API", () => {
      const source = `
import { Aurelia } from '@aurelia/runtime-html';
import { MyApp } from './my-app';

new Aurelia().app(MyApp).start();
`.trim();

      const analysis = analyzeEntryPoint(source);

      expect(analysis.initPattern).toBe("instance-api");
    });

    it("detects explicit StandardConfiguration in .register()", () => {
      const source = `
import { Aurelia, StandardConfiguration } from '@aurelia/runtime-html';
import { MyApp } from './my-app';

new Aurelia()
  .register(StandardConfiguration)
  .app(MyApp)
  .start();
`.trim();

      const analysis = analyzeEntryPoint(source);

      expect(analysis.hasStandardConfiguration).toBe(true);
      expect(analysis.configLocation?.type).toBe("explicit");
    });
  });

  describe("import analysis", () => {
    it("collects Aurelia imports", () => {
      const source = `
import Aurelia, { RouterConfiguration } from 'aurelia';
import { MyApp } from './my-app';

Aurelia.app(MyApp).start();
`.trim();

      const analysis = analyzeEntryPoint(source);

      expect(analysis.imports.primarySource).toBe("aurelia");
      expect(analysis.imports.aureliaImports.length).toBe(1);
      expect(analysis.imports.aureliaImports[0]?.hasDefault).toBe(true);
      expect(analysis.imports.aureliaImports[0]?.defaultName).toBe("Aurelia");
    });

    it("handles scoped @aurelia/* imports", () => {
      const source = `
import { Aurelia } from '@aurelia/runtime-html';
import { RouterConfiguration } from '@aurelia/router';
import { MyApp } from './my-app';

new Aurelia().register(RouterConfiguration).app(MyApp).start();
`.trim();

      const analysis = analyzeEntryPoint(source);

      expect(analysis.imports.aureliaImports.length).toBe(2);
      expect(analysis.imports.aureliaImports.some((i) => i.source === "@aurelia/runtime-html")).toBe(true);
      expect(analysis.imports.aureliaImports.some((i) => i.source === "@aurelia/router")).toBe(true);
    });

    it("preserves non-Aurelia imports", () => {
      const source = `
import Aurelia from 'aurelia';
import { MyApp } from './my-app';
import { someUtil } from './utils';

Aurelia.app(MyApp).start();
`.trim();

      const analysis = analyzeEntryPoint(source);

      expect(analysis.imports.otherImports.length).toBe(2);
    });
  });

  describe("init chain extraction", () => {
    it("extracts component from .app() call", () => {
      const source = `
import Aurelia from 'aurelia';
import { MyApp } from './my-app';

Aurelia.app(MyApp).start();
`.trim();

      const analysis = analyzeEntryPoint(source);

      expect(analysis.initChain?.component).toBe("MyApp");
    });

    it("extracts method chain", () => {
      const source = `
import Aurelia from 'aurelia';
import { MyApp } from './my-app';

Aurelia.register(X).app(MyApp).start();
`.trim();

      const analysis = analyzeEntryPoint(source);

      expect(analysis.initChain).toBeTruthy();
      expect(analysis.initChain!.methods.length).toBe(3);
      expect(analysis.initChain!.methods[0]?.name).toBe("register");
      expect(analysis.initChain!.methods[1]?.name).toBe("app");
      expect(analysis.initChain!.methods[2]?.name).toBe("start");
    });
  });
});

describe("shouldTransformEntryPoint", () => {
  it("returns undefined (allow transform) when StandardConfiguration is detected", () => {
    const source = `
import Aurelia from 'aurelia';
Aurelia.app(MyApp).start();
`.trim();

    const analysis = analyzeEntryPoint(source);
    const reason = shouldTransformEntryPoint(analysis);

    expect(reason).toBe(undefined);
  });

  it("returns reason when no StandardConfiguration detected", () => {
    const source = `
import { createApp } from './custom';
createApp().start();
`.trim();

    const analysis = analyzeEntryPoint(source);
    const reason = shouldTransformEntryPoint(analysis);

    expect(reason).toContain("StandardConfiguration");
  });
});

describe("buildAotConfiguration", () => {
  it("generates configuration code", () => {
    const result = buildAotConfiguration({
      preservedRegistrations: [],
    });

    expect(result.code).toContain("const AotConfiguration");
    expect(result.code).toContain("DirtyChecker");
    expect(result.code).toContain("NodeObserverLocator");
    expect(result.code).toContain("DefaultResources");
    expect(result.code).toContain("DefaultRenderers");
  });

  it("generates factory function", () => {
    const result = buildAotConfiguration({
      preservedRegistrations: [],
    });

    expect(result.code).toContain("function createAotAurelia");
    expect(result.code).toContain("BrowserPlatform");
    expect(result.code).toContain("DI.createContainer");
  });

  it("includes required imports", () => {
    const result = buildAotConfiguration({
      preservedRegistrations: [],
    });

    expect(result.requiredImports.some((i) => i.source === "@aurelia/kernel")).toBe(true);
    expect(result.requiredImports.some((i) => i.source === "@aurelia/runtime")).toBe(true);
    expect(result.requiredImports.some((i) => i.source === "@aurelia/runtime-html")).toBe(true);
    expect(result.requiredImports.some((i) => i.source === "@aurelia/platform-browser")).toBe(true);
  });

  it("adds imports for preserved known configurations", () => {
    const result = buildAotConfiguration({
      preservedRegistrations: ["RouterConfiguration"],
    });

    expect(
      result.requiredImports.some(
        (i) =>
          i.source === "@aurelia/router" &&
          i.specifiers.includes("RouterConfiguration")
      )
    ).toBe(true);
  });
});

describe("generateInitialization", () => {
  it("generates basic initialization", () => {
    const code = generateInitialization({
      component: "MyApp",
      preservedRegistrations: [],
    });

    expect(code).toContain("createAotAurelia()");
    expect(code).toContain(".app(");
    expect(code).toContain("MyApp");
    expect(code).toContain(".start()");
  });

  it("includes preserved registrations", () => {
    const code = generateInitialization({
      component: "MyApp",
      preservedRegistrations: ["RouterConfiguration", "DialogConfiguration"],
    });

    expect(code).toContain(".register(RouterConfiguration, DialogConfiguration)");
  });

  it("uses custom host when specified", () => {
    const code = generateInitialization({
      component: "MyApp",
      host: "document.querySelector('#app')",
      preservedRegistrations: [],
    });

    expect(code).toContain("document.querySelector('#app')");
  });
});

describe("transformEntryPoint", () => {
  it("transforms simple Aurelia.app() pattern", () => {
    const source = `
import Aurelia from 'aurelia';
import { MyApp } from './my-app';

Aurelia.app(MyApp).start();
`.trim();

    const result = transformEntryPoint({ source, filePath: "main.ts" });

    expect(result.transformed).toBe(true);
    expect(result.code).toContain("AotConfiguration");
    expect(result.code).toContain("createAotAurelia");
    expect(result.code).toContain("@aurelia/kernel");
    expect(result.code).not.toContain("import Aurelia from 'aurelia'");
  });

  it("preserves other registrations", () => {
    const source = `
import Aurelia, { RouterConfiguration } from 'aurelia';
import { MyApp } from './my-app';

Aurelia.register(RouterConfiguration).app(MyApp).start();
`.trim();

    const result = transformEntryPoint({ source, filePath: "main.ts" });

    expect(result.transformed).toBe(true);
    expect(result.code).toContain("RouterConfiguration");
    expect(result.code).toContain(".register(RouterConfiguration)");
  });

  it("skips transformation when no StandardConfiguration", () => {
    const source = `
import { createCustomApp } from './custom';
createCustomApp().start();
`.trim();

    const result = transformEntryPoint({ source, filePath: "main.ts" });

    expect(result.transformed).toBe(false);
    expect(result.skipReason).toContain("StandardConfiguration");
    expect(result.code).toBe(source);
  });

  it("excludes StandardConfiguration from preserved registrations", () => {
    const source = `
import Aurelia, { StandardConfiguration, RouterConfiguration } from 'aurelia';
import { MyApp } from './my-app';

Aurelia.register(StandardConfiguration, RouterConfiguration).app(MyApp).start();
`.trim();

    const result = transformEntryPoint({ source, filePath: "main.ts" });

    // StandardConfiguration should be removed, RouterConfiguration preserved
    const analysis = result.analysis;
    expect(analysis.preservedRegistrations.length).toBe(1);
    expect(analysis.preservedRegistrations[0]?.expression).toBe("RouterConfiguration");
  });
});
