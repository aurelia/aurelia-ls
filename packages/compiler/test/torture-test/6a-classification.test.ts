/**
 * Tier 6A: Attribute Classification Claims (9 claims)
 *
 * Tests the 8-step attribute classification algorithm on the NEW
 * single-pass lowerTemplate() from semantic-analysis.ts.
 */

import { describe, it, expect } from "vitest";
import {
  runInterpreter,
  analyzeTemplate,
  findElement,
  findElements,
  findAttr,
  assertClassified,
  assertBinding,
  assertNoBinding,
  assertResolvedCe,
  assertPlainHtml,
  evaluateProjectVocabulary,
  evaluateVisibility,
  assertNotComplete,
  assertRegistrationGap,
  pullValue,
} from "./harness.js";

// =============================================================================
// 6A-1: Plain HTML attribute → step 8 (baseline)
// =============================================================================

describe("6A-1: Plain HTML attribute → step 8 (baseline)", () => {
  const result = runInterpreter({
    "/src/app.ts": `
      import { customElement } from 'aurelia';

      @customElement({
        name: 'app',
        template: '<div id="main" class="container" title="tooltip">content</div>'
      })
      export class App {}
    `,
  });

  it("classifies all three attributes at step 8", () => {
    const s = analyzeTemplate(result, "app");
    const div = findElement(s, "div");

    assertClassified(findAttr(div, 'id'), 8, 'plain-attribute');
    assertClassified(findAttr(div, 'class'), 8, 'plain-attribute');
    assertClassified(findAttr(div, 'title'), 8, 'plain-attribute');
  });

  it("all three are truly plain (no binding, sub-path 8a)", () => {
    const s = analyzeTemplate(result, "app");
    const div = findElement(s, "div");

    assertNoBinding(findAttr(div, 'id'));
    assertNoBinding(findAttr(div, 'class'));
    assertNoBinding(findAttr(div, 'title'));
  });
});

// =============================================================================
// 6A-2: as-element → step 1 (special attribute)
// =============================================================================

describe("6A-2: as-element → step 1 (special attribute)", () => {
  const result = runInterpreter({
    "/src/my-panel.ts": `
      import { customElement } from 'aurelia';

      @customElement({
        name: 'my-panel',
        template: '<div>panel content</div>'
      })
      export class MyPanel {}
    `,
    "/src/app.ts": `
      import { customElement } from 'aurelia';
      import { MyPanel } from './my-panel';

      @customElement({
        name: 'app',
        template: '<div as-element="my-panel">projected content</div>',
        dependencies: [MyPanel]
      })
      export class App {}
    `,
  });

  it("classifies as-element at step 1 (special)", () => {
    const s = analyzeTemplate(result, "app");
    const div = findElement(s, "div");
    assertClassified(findAttr(div, 'as-element'), 1, 'special-attribute');
  });

  it("element resolves as CE my-panel via as-element override", () => {
    const s = analyzeTemplate(result, "app");
    const div = findElement(s, "div");
    assertResolvedCe(div, 'my-panel');
    expect(div.resolution.kind).toBe('custom-element');
    if (div.resolution.kind === 'custom-element') {
      expect(div.resolution.via).toBe('as-element');
    }
  });
});

// =============================================================================
// 6A-3: CE with capture: true → step 2 (captured attribute)
// =============================================================================

describe("6A-3: CE with capture: true → step 2", () => {
  const result = runInterpreter({
    "/src/capture-el.ts": `
      import { customElement } from 'aurelia';

      @customElement({
        name: 'capture-el',
        template: '<div>captures everything</div>',
        capture: true
      })
      export class CaptureEl {}
    `,
    "/src/app.ts": `
      import { customElement } from 'aurelia';
      import { CaptureEl } from './capture-el';

      @customElement({
        name: 'app',
        template: '<capture-el custom-data="hello" anything="world"></capture-el>',
        dependencies: [CaptureEl]
      })
      export class App {}
    `,
  });

  it("classifies attributes at step 2 (captured)", () => {
    const s = analyzeTemplate(result, "app");
    const el = findElement(s, "capture-el");

    assertClassified(findAttr(el, 'custom-data'), 2, 'captured-attribute');
    assertClassified(findAttr(el, 'anything'), 2, 'captured-attribute');
  });
});

// =============================================================================
// 6A-4: Override BC (ignoreAttr: true) → step 4
// =============================================================================

describe("6A-4: Override BC (ignoreAttr: true) → step 4", () => {
  const result = runInterpreter({
    "/src/app.ts": `
      import { customElement } from 'aurelia';

      @customElement({
        name: 'app',
        template: '<button click.trigger="handleClick()">Click</button>'
      })
      export class App {
        handleClick() { }
      }
    `,
  });

  it("classifies click.trigger at step 4 (override-command)", () => {
    const s = analyzeTemplate(result, "app");
    const button = findElement(s, "button");
    assertClassified(findAttr(button, 'click.trigger'), 4, 'override-bc');
  });

  it("produces listener binding", () => {
    const s = analyzeTemplate(result, "app");
    const button = findElement(s, "button");
    assertBinding(findAttr(button, 'click.trigger'), { kind: 'listener' });
  });
});

// =============================================================================
// 6A-5: CE bindable → step 6
// =============================================================================

describe("6A-5: CE bindable → step 6", () => {
  const result = runInterpreter({
    "/src/my-input.ts": `
      import { customElement, bindable } from 'aurelia';

      @customElement({
        name: 'my-input',
        template: '<input value.bind="value">'
      })
      export class MyInput {
        @bindable value: string = '';
      }
    `,
    "/src/app.ts": `
      import { customElement } from 'aurelia';
      import { MyInput } from './my-input';

      @customElement({
        name: 'app',
        template: '<my-input value.bind="name"></my-input>',
        dependencies: [MyInput]
      })
      export class App {
        name = 'hello';
      }
    `,
  });

  it("classifies value.bind on CE at step 6 (element-bindable)", () => {
    const s = analyzeTemplate(result, "app");
    const el = findElement(s, "my-input");
    assertClassified(findAttr(el, 'value.bind'), 6, 'ce-bindable');
  });

  it("produces bindable binding targeting the value property", () => {
    const s = analyzeTemplate(result, "app");
    const el = findElement(s, "my-input");
    assertBinding(findAttr(el, 'value.bind'), {
      kind: 'bindable',
      property: 'value',
      expressionEntry: 'IsProperty',
    });
  });
});

// =============================================================================
// 6A-6: CA/TC → step 7
// =============================================================================

describe("6A-6: CA → step 7", () => {
  const result = runInterpreter({
    "/src/highlight.ts": `
      import { customAttribute, bindable } from 'aurelia';

      @customAttribute('highlight')
      export class Highlight {
        @bindable color: string = 'yellow';
      }
    `,
    "/src/app.ts": `
      import { customElement } from 'aurelia';
      import { Highlight } from './highlight';

      @customElement({
        name: 'app',
        template: '<div highlight="red">highlighted</div>',
        dependencies: [Highlight]
      })
      export class App {}
    `,
  });

  it("classifies highlight at step 7 (custom attribute)", () => {
    const s = analyzeTemplate(result, "app");
    const div = findElement(s, "div");
    assertClassified(findAttr(div, 'highlight'), 7, 'custom-attribute');
  });

  it("produces CA binding", () => {
    const s = analyzeTemplate(result, "app");
    const div = findElement(s, "div");
    // CA produces a binding — either a bindable or set-property depending
    // on whether there's a command
    expect(findAttr(div, 'highlight').binding).toBeDefined();
  });
});

// =============================================================================
// 6A-7: Vocabulary gap → step 4 misses → step 8 (misclassification)
// =============================================================================

describe("6A-7: Vocabulary gap → step 4 misclassification", () => {
  const result = runInterpreter({
    "/src/app.ts": `
      import { customElement } from 'aurelia';

      @customElement({
        name: 'app',
        template: '<div click.dispatch="handleClick()">click me</div>'
      })
      export class App {
        handleClick() { }
      }
    `,
  });

  it("dispatch BC not in vocabulary → classified at step 8 (plain)", () => {
    const s = analyzeTemplate(result, "app");
    const div = findElement(s, "div");
    assertClassified(findAttr(div, 'click.dispatch'), 8, 'plain-attribute');
  });

  it("upstream gap: dispatch BC absent from vocabulary", () => {
    const vocab = evaluateProjectVocabulary(result);
    const cmd = vocab.green.commands.get("dispatch");
    expect(cmd).toBeUndefined();
  });

  it("no binding produced — silent misclassification", () => {
    const s = analyzeTemplate(result, "app");
    const div = findElement(s, "div");
    assertNoBinding(findAttr(div, 'click.dispatch'));
  });
});

// =============================================================================
// 6A-8: Gapped bindable list → step 6 misses → step 8
// =============================================================================

describe("6A-8: Gapped bindable list → step 6 misclassification", () => {
  const result = runInterpreter({
    "/src/dynamic-el.ts": `
      import { customElement } from 'aurelia';

      function computeBindables() {
        return { title: {}, subtitle: {} };
      }

      @customElement({
        name: 'dynamic-el',
        template: '<div>content</div>',
        bindables: computeBindables()
      })
      export class DynamicEl {
        title = '';
        subtitle = '';
      }
    `,
    "/src/app.ts": `
      import { customElement } from 'aurelia';
      import { DynamicEl } from './dynamic-el';

      @customElement({
        name: 'app',
        template: '<dynamic-el title.bind="t" subtitle.bind="s"></dynamic-el>',
        dependencies: [DynamicEl]
      })
      export class App {
        t = 'hello';
        s = 'world';
      }
    `,
  });

  it("opaque bindables → attributes fall to step 8", () => {
    const s = analyzeTemplate(result, "app");
    const el = findElement(s, "dynamic-el");

    assertClassified(findAttr(el, 'title.bind'), 8, 'plain-attribute');
    assertClassified(findAttr(el, 'subtitle.bind'), 8, 'plain-attribute');
  });

  it("upstream gap: bindable list is opaque", () => {
    const bindables = pullValue(result.graph, "custom-element:dynamic-el", "bindables");
    expect(bindables === undefined || bindables === null).toBe(true);
  });
});

// =============================================================================
// 6A-9: Scope gap → step 7 behavior
// =============================================================================

describe("6A-9: Scope gap → step 7 behavior", () => {
  // The new path includes all analyzed resources in the catalog regardless
  // of scope completeness — the scope gap affects the `grounded` flag on
  // not-found elements, not catalog population. Tooltip IS found at step 7
  // because it WAS analyzed. This is more correct than the old path.
  const result = runInterpreter({
    "/src/main.ts": `
      import Aurelia from 'aurelia';
      import { getPlugins } from './plugin-loader';
      import { App } from './app';

      Aurelia.register(...getPlugins()).app(App).start();
    `,
    "/src/plugin-loader.ts": `
      import type { IRegistry } from 'aurelia';
      import { Tooltip } from './tooltip';

      export function getPlugins(): IRegistry[] {
        return [Tooltip];
      }
    `,
    "/src/tooltip.ts": `
      import { customAttribute, bindable } from 'aurelia';

      @customAttribute('tooltip')
      export class Tooltip {
        @bindable value: string = '';
      }
    `,
    "/src/app.ts": `
      import { customElement } from 'aurelia';

      @customElement({
        name: 'app',
        template: '<div tooltip="hover text">hover me</div>'
      })
      export class App {}
    `,
  });

  it("tooltip IS found at step 7 (all analyzed resources in catalog)", () => {
    const s = analyzeTemplate(result, "app");
    const div = findElement(s, "div");
    assertClassified(findAttr(div, 'tooltip'), 7, 'custom-attribute');
  });

  it("upstream gap: scope has registration gap from getPlugins()", () => {
    const vis = evaluateVisibility(result);
    assertNotComplete(vis, "app");
    assertRegistrationGap(vis, "app", { reason: "opaque" });
  });
});
