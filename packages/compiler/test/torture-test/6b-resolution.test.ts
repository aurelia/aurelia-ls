/**
 * Tier 6B: Element and Resource Resolution Claims (5 claims)
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

describe("6B-1: Tag → CE resolution (baseline)", () => {
  const result = runInterpreter({
    "/src/greeting.ts": `
      import { customElement, bindable } from 'aurelia';
      @customElement({ name: 'greeting', template: '<span>hello</span>' })
      export class Greeting { @bindable message: string = ''; }
    `,
    "/src/app.ts": `
      import { customElement } from 'aurelia';
      import { Greeting } from './greeting';
      @customElement({
        name: 'app',
        template: '<greeting message.bind="msg"></greeting>',
        dependencies: [Greeting]
      })
      export class App { msg = 'hello'; }
    `,
  });

  it("resolves <greeting> to CE greeting", () => {
    const s = analyzeTemplate(result, "app");
    const el = findElement(s, "greeting");
    assertResolvedCe(el, 'greeting');
  });

  it("resolved via tag-name", () => {
    const s = analyzeTemplate(result, "app");
    const el = findElement(s, "greeting");
    expect(el.resolution.kind === 'custom-element' && el.resolution.via).toBe('tag-name');
  });
});

describe("6B-2: as-element override", () => {
  const result = runInterpreter({
    "/src/my-panel.ts": `
      import { customElement } from 'aurelia';
      @customElement({ name: 'my-panel', template: '<div class="panel">panel</div>' })
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

  it("resolves <section as-element='my-panel'> as CE", () => {
    const s = analyzeTemplate(result, "app");
    const el = findElement(s, "section");
    assertResolvedCe(el, 'my-panel');
  });

  it("resolved via as-element", () => {
    const s = analyzeTemplate(result, "app");
    const el = findElement(s, "section");
    if (el.resolution.kind === 'custom-element') {
      expect(el.resolution.via).toBe('as-element');
    }
  });
});

describe("6B-3: Alias resolution", () => {
  const result = runInterpreter({
    "/src/data-card.ts": `
      import { customElement } from 'aurelia';
      @customElement({
        name: 'data-card', aliases: ['info-card', 'detail-card'],
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
    const s = analyzeTemplate(result, "app");
    const el = findElement(s, "info-card");
    assertResolvedCe(el, 'data-card');
  });

  it("resolved via alias", () => {
    const s = analyzeTemplate(result, "app");
    const el = findElement(s, "info-card");
    expect(el.resolution.kind === 'custom-element' && el.resolution.via).toBe('alias');
  });
});

describe("6B-4: Not found + complete scope → grounded negative", () => {
  const result = runInterpreter({
    "/src/main.ts": `
      import Aurelia from 'aurelia';
      import { App } from './app';
      new Aurelia().app(App).start();
    `,
    "/src/app.ts": `
      import { customElement } from 'aurelia';
      @customElement({ name: 'app', template: '<unknown-widget>content</unknown-widget>' })
      export class App {}
    `,
  });

  it("unknown-widget is not found", () => {
    const s = analyzeTemplate(result, "app");
    const el = findElement(s, "unknown-widget");
    assertElementNotFound(el, true);
  });
});

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
      export function getPlugins(): IRegistry[] { return []; }
    `,
    "/src/app.ts": `
      import { customElement } from 'aurelia';
      @customElement({ name: 'app', template: '<plugin-widget>content</plugin-widget>' })
      export class App {}
    `,
  });

  it("plugin-widget is not found but scope is incomplete → ungrounded", () => {
    const s = analyzeTemplate(result, "app");
    const el = findElement(s, "plugin-widget");
    assertElementNotFound(el, false);
  });
});
