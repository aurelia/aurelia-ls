/**
 * Entry Point Transform Tests
 *
 * Tests for analyzing and transforming Aurelia entry points.
 */

import { describe, it } from "vitest";
import assert from "node:assert";
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

      assert.strictEqual(analysis.initPattern, "static-api");
      assert.strictEqual(analysis.hasStandardConfiguration, true);
      assert.strictEqual(analysis.configLocation?.type, "implicit");
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

      assert.strictEqual(analysis.initPattern, "static-api");
      assert.strictEqual(analysis.hasStandardConfiguration, true);
      assert.strictEqual(analysis.preservedRegistrations.length, 1);
      assert.strictEqual(
        analysis.preservedRegistrations[0]?.expression,
        "RouterConfiguration"
      );
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

      assert.strictEqual(analysis.preservedRegistrations.length, 2);
      assert.strictEqual(
        analysis.preservedRegistrations[0]?.expression,
        "RouterConfiguration"
      );
      assert.strictEqual(
        analysis.preservedRegistrations[1]?.expression,
        "DialogConfiguration"
      );
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

      assert.strictEqual(analysis.initPattern, "instance-api");
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

      assert.strictEqual(analysis.hasStandardConfiguration, true);
      assert.strictEqual(analysis.configLocation?.type, "explicit");
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

      assert.strictEqual(analysis.imports.primarySource, "aurelia");
      assert.strictEqual(analysis.imports.aureliaImports.length, 1);
      assert.strictEqual(analysis.imports.aureliaImports[0]?.hasDefault, true);
      assert.strictEqual(
        analysis.imports.aureliaImports[0]?.defaultName,
        "Aurelia"
      );
    });

    it("handles scoped @aurelia/* imports", () => {
      const source = `
import { Aurelia } from '@aurelia/runtime-html';
import { RouterConfiguration } from '@aurelia/router';
import { MyApp } from './my-app';

new Aurelia().register(RouterConfiguration).app(MyApp).start();
`.trim();

      const analysis = analyzeEntryPoint(source);

      assert.strictEqual(analysis.imports.aureliaImports.length, 2);
      assert.ok(
        analysis.imports.aureliaImports.some(
          (i) => i.source === "@aurelia/runtime-html"
        )
      );
      assert.ok(
        analysis.imports.aureliaImports.some(
          (i) => i.source === "@aurelia/router"
        )
      );
    });

    it("preserves non-Aurelia imports", () => {
      const source = `
import Aurelia from 'aurelia';
import { MyApp } from './my-app';
import { someUtil } from './utils';

Aurelia.app(MyApp).start();
`.trim();

      const analysis = analyzeEntryPoint(source);

      assert.strictEqual(analysis.imports.otherImports.length, 2);
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

      assert.strictEqual(analysis.initChain?.component, "MyApp");
    });

    it("extracts method chain", () => {
      const source = `
import Aurelia from 'aurelia';
import { MyApp } from './my-app';

Aurelia.register(X).app(MyApp).start();
`.trim();

      const analysis = analyzeEntryPoint(source);

      assert.ok(analysis.initChain);
      assert.strictEqual(analysis.initChain.methods.length, 3);
      assert.strictEqual(analysis.initChain.methods[0]?.name, "register");
      assert.strictEqual(analysis.initChain.methods[1]?.name, "app");
      assert.strictEqual(analysis.initChain.methods[2]?.name, "start");
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

    assert.strictEqual(reason, undefined);
  });

  it("returns reason when no StandardConfiguration detected", () => {
    const source = `
import { createApp } from './custom';
createApp().start();
`.trim();

    const analysis = analyzeEntryPoint(source);
    const reason = shouldTransformEntryPoint(analysis);

    assert.ok(reason?.includes("StandardConfiguration"));
  });
});

describe("buildAotConfiguration", () => {
  it("generates configuration code", () => {
    const result = buildAotConfiguration({
      preservedRegistrations: [],
    });

    assert.ok(result.code.includes("const AotConfiguration"));
    assert.ok(result.code.includes("DirtyChecker"));
    assert.ok(result.code.includes("NodeObserverLocator"));
    assert.ok(result.code.includes("DefaultResources"));
    assert.ok(result.code.includes("DefaultRenderers"));
  });

  it("generates factory function", () => {
    const result = buildAotConfiguration({
      preservedRegistrations: [],
    });

    assert.ok(result.code.includes("function createAotAurelia"));
    assert.ok(result.code.includes("BrowserPlatform"));
    assert.ok(result.code.includes("DI.createContainer"));
  });

  it("includes required imports", () => {
    const result = buildAotConfiguration({
      preservedRegistrations: [],
    });

    assert.ok(
      result.requiredImports.some((i) => i.source === "@aurelia/kernel")
    );
    assert.ok(
      result.requiredImports.some((i) => i.source === "@aurelia/runtime")
    );
    assert.ok(
      result.requiredImports.some((i) => i.source === "@aurelia/runtime-html")
    );
    assert.ok(
      result.requiredImports.some((i) => i.source === "@aurelia/platform-browser")
    );
  });

  it("adds imports for preserved known configurations", () => {
    const result = buildAotConfiguration({
      preservedRegistrations: ["RouterConfiguration"],
    });

    assert.ok(
      result.requiredImports.some(
        (i) =>
          i.source === "@aurelia/router" &&
          i.specifiers.includes("RouterConfiguration")
      )
    );
  });
});

describe("generateInitialization", () => {
  it("generates basic initialization", () => {
    const code = generateInitialization({
      component: "MyApp",
      preservedRegistrations: [],
    });

    assert.ok(code.includes("createAotAurelia()"));
    assert.ok(code.includes(".app("));
    assert.ok(code.includes("MyApp"));
    assert.ok(code.includes(".start()"));
  });

  it("includes preserved registrations", () => {
    const code = generateInitialization({
      component: "MyApp",
      preservedRegistrations: ["RouterConfiguration", "DialogConfiguration"],
    });

    assert.ok(code.includes(".register(RouterConfiguration, DialogConfiguration)"));
  });

  it("uses custom host when specified", () => {
    const code = generateInitialization({
      component: "MyApp",
      host: "document.querySelector('#app')",
      preservedRegistrations: [],
    });

    assert.ok(code.includes("document.querySelector('#app')"));
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

    assert.strictEqual(result.transformed, true);
    assert.ok(result.code.includes("AotConfiguration"));
    assert.ok(result.code.includes("createAotAurelia"));
    assert.ok(result.code.includes("@aurelia/kernel"));
    assert.ok(!result.code.includes("import Aurelia from 'aurelia'"));
  });

  it("preserves other registrations", () => {
    const source = `
import Aurelia, { RouterConfiguration } from 'aurelia';
import { MyApp } from './my-app';

Aurelia.register(RouterConfiguration).app(MyApp).start();
`.trim();

    const result = transformEntryPoint({ source, filePath: "main.ts" });

    assert.strictEqual(result.transformed, true);
    assert.ok(result.code.includes("RouterConfiguration"));
    assert.ok(result.code.includes(".register(RouterConfiguration)"));
  });

  it("skips transformation when no StandardConfiguration", () => {
    const source = `
import { createCustomApp } from './custom';
createCustomApp().start();
`.trim();

    const result = transformEntryPoint({ source, filePath: "main.ts" });

    assert.strictEqual(result.transformed, false);
    assert.ok(result.skipReason?.includes("StandardConfiguration"));
    assert.strictEqual(result.code, source);
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
    assert.strictEqual(analysis.preservedRegistrations.length, 1);
    assert.strictEqual(
      analysis.preservedRegistrations[0]?.expression,
      "RouterConfiguration"
    );
  });
});
