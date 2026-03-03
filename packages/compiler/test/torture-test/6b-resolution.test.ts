/**
 * Tier 6B: Element and Resource Resolution Claims (5 claims)
 *
 * Tests element identity resolution: tag → CE lookup via scope-visibility,
 * as-element override, alias resolution, and grounded vs ungrounded
 * negative assertions.
 */

import { describe, it, expect } from "vitest";
import {
  runInterpreter,
  analyzeTemplate,
  findElement,
  assertResolvedCe,
  assertPlainHtml,
  assertElementNotFound,
} from "./harness.js";

// =============================================================================
// 6B-1: Tag → CE resolution (baseline)
// =============================================================================

describe("6B-1: Tag → CE resolution (baseline)", () => {
  const result = runInterpreter({
    "/src/greeting.ts": `
      import { customElement, bindable } from 'aurelia';

      @customElement({
        name: 'greeting',
        template: '<span>hello</span>'
      })
      export class Greeting {
        @bindable message: string = '';
      }
    `,
    "/src/app.ts": `
      import { customElement } from 'aurelia';
      import { Greeting } from './greeting';

      @customElement({
        name: 'app',
        template: '<greeting message.bind="msg"></greeting>',
        dependencies: [Greeting]
      })
      export class App {
        msg = 'hello';
      }
    `,
  });

  it("resolves <greeting> to CE greeting", () => {
    const analysis = analyzeTemplate(result, "app");
    const el = findElement(analysis, "greeting");
    assertResolvedCe(el, 'custom-element:greeting');
  });

  it("resolved via tag-name", () => {
    const analysis = analyzeTemplate(result, "app");
    const el = findElement(analysis, "greeting");
    expect(el.resolution.kind).toBe('custom-element');
    if (el.resolution.kind === 'custom-element') {
      expect(el.resolution.via).toBe('tag-name');
    }
  });
});

// =============================================================================
// 6B-2: as-element override
// =============================================================================

describe("6B-2: as-element override", () => {
  const result = runInterpreter({
    "/src/my-panel.ts": `
      import { customElement } from 'aurelia';

      @customElement({
        name: 'my-panel',
        template: '<div class="panel">panel</div>'
      })
      export class MyPanel {}
    `,
    "/src/app.ts": `
      import { customElement } from 'aurelia';
      import { MyPanel } from './my-panel';

      @customElement({
        name: 'app',
        template: '<section as-element="my-panel">panel content</section>',
        dependencies: [MyPanel]
      })
      export class App {}
    `,
  });

  it("resolves <section as-element='my-panel'> as CE my-panel", () => {
    const analysis = analyzeTemplate(result, "app");
    const el = findElement(analysis, "section");
    assertResolvedCe(el, 'custom-element:my-panel');
  });

  it("resolved via as-element", () => {
    const analysis = analyzeTemplate(result, "app");
    const el = findElement(analysis, "section");
    if (el.resolution.kind === 'custom-element') {
      expect(el.resolution.via).toBe('as-element');
    }
  });
});

// =============================================================================
// 6B-3: Alias resolution
// =============================================================================

describe("6B-3: Alias resolution", () => {
  const result = runInterpreter({
    "/src/data-card.ts": `
      import { customElement } from 'aurelia';

      @customElement({
        name: 'data-card',
        aliases: ['info-card', 'detail-card'],
        template: '<div class="card">card</div>'
      })
      export class DataCard {}
    `,
    "/src/app.ts": `
      import { customElement } from 'aurelia';
      import { DataCard } from './data-card';

      @customElement({
        name: 'app',
        template: '<info-card>card content</info-card>',
        dependencies: [DataCard]
      })
      export class App {}
    `,
  });

  it("resolves <info-card> (alias) to CE data-card", () => {
    const analysis = analyzeTemplate(result, "app");
    const el = findElement(analysis, "info-card");

    // info-card is not a CE's primary name — it is an alias of data-card.
    // The resolution finds the CE through the alias. The concluded
    // definition is the same as if <data-card> had been used.
    assertResolvedCe(el, 'custom-element:data-card');
  });

  it("resolved via alias (not tag-name)", () => {
    const analysis = analyzeTemplate(result, "app");
    const el = findElement(analysis, "info-card");
    expect(el.resolution.kind).toBe('custom-element');
    if (el.resolution.kind === 'custom-element') {
      expect(el.resolution.via).toBe('alias');
    }
  });
});

// =============================================================================
// 6B-4: Not found + complete scope → grounded negative
// =============================================================================

describe("6B-4: Not found + complete scope → grounded negative", () => {
  const result = runInterpreter({
    "/src/main.ts": `
      import Aurelia from 'aurelia';
      import { App } from './app';
      new Aurelia().app(App).start();
    `,
    "/src/app.ts": `
      import { customElement } from 'aurelia';

      @customElement({
        name: 'app',
        template: '<unknown-widget>content</unknown-widget>'
      })
      export class App {}
    `,
  });

  it("unknown-widget is not found", () => {
    const analysis = analyzeTemplate(result, "app");
    const el = findElement(analysis, "unknown-widget");
    assertElementNotFound(el, true); // grounded: true (scope is complete)
  });
});

// =============================================================================
// 6B-5: Not found + incomplete scope → ungrounded negative
// =============================================================================

describe("6B-5: Not found + incomplete scope → ungrounded negative", () => {
  const result = runInterpreter({
    "/src/main.ts": `
      import Aurelia from 'aurelia';
      import { getPlugins } from './plugin-loader';
      import { App } from './app';

      Aurelia.register(...getPlugins()).app(App).start();
    `,
    "/src/plugin-loader.ts": `
      import type { IRegistry } from 'aurelia';
      export function getPlugins(): IRegistry[] {
        return [];
      }
    `,
    "/src/app.ts": `
      import { customElement } from 'aurelia';

      @customElement({
        name: 'app',
        template: '<plugin-widget>content</plugin-widget>'
      })
      export class App {}
    `,
  });

  it("plugin-widget is not found but scope is incomplete → ungrounded", () => {
    const analysis = analyzeTemplate(result, "app");
    const el = findElement(analysis, "plugin-widget");
    assertElementNotFound(el, false); // grounded: false (scope has gaps)
  });
});
