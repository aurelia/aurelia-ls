/**
 * Tier 6A: Attribute Classification Claims (9 claims)
 *
 * Tests the 8-step attribute classification algorithm:
 * 1. Special attributes (as-element, containerless)
 * 2. Captured attributes (CE with capture: true)
 * 3. Spread transferred (...$attrs)
 * 4. Override BCs (ignoreAttr: true)
 * 5. Spread value (...$bindables)
 * 6. CE bindable properties
 * 7. CAs and TCs
 * 8. Plain attributes (fallback)
 *
 * Entries 7-9 test the misclassification triad: upstream gaps at tiers
 * 5, 3, and 4 cause attributes to fall through to step 8.
 */

import { describe, it, expect } from "vitest";
import {
  runInterpreter,
  injectFixture,
  analyzeTemplate,
  findElement,
  findAttr,
  assertClassified,
  assertBinding,
  assertNoBinding,
  assertResolvedCe,
  assertPlainHtml,
  evaluateProjectVocabulary,
  assertInVocabulary,
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
    const analysis = analyzeTemplate(result, "app");
    const div = findElement(analysis, "div");

    assertClassified(findAttr(div, 'id'), 8, 'plain-attribute');
    assertClassified(findAttr(div, 'class'), 8, 'plain-attribute');
    assertClassified(findAttr(div, 'title'), 8, 'plain-attribute');
  });

  it("all three are truly plain (no binding, sub-path 8a)", () => {
    const analysis = analyzeTemplate(result, "app");
    const div = findElement(analysis, "div");

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

  it("classifies as-element at step 1 (special attribute)", () => {
    const analysis = analyzeTemplate(result, "app");
    const div = findElement(analysis, "div");
    assertClassified(findAttr(div, 'as-element'), 1, 'special-attribute');
  });

  it("element resolves as CE my-panel via as-element override", () => {
    const analysis = analyzeTemplate(result, "app");
    const div = findElement(analysis, "div");
    assertResolvedCe(div, 'custom-element:my-panel');
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
      import { customElement, capture } from 'aurelia';

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
    const analysis = analyzeTemplate(result, "app");
    const el = findElement(analysis, "capture-el");

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

  it("classifies click.trigger at step 4 (override BC)", () => {
    const analysis = analyzeTemplate(result, "app");
    const button = findElement(analysis, "button");
    assertClassified(findAttr(button, 'click.trigger'), 4, 'override-bc');
  });

  it("produces ListenerBinding instruction", () => {
    const analysis = analyzeTemplate(result, "app");
    const button = findElement(analysis, "button");
    assertBinding(findAttr(button, 'click.trigger'), {
      instructionType: 'ListenerBinding',
      expressionEntry: 'IsFunction',
    });
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

  it("classifies value.bind on CE at step 6 (CE bindable)", () => {
    const analysis = analyzeTemplate(result, "app");
    const el = findElement(analysis, "my-input");
    assertClassified(findAttr(el, 'value.bind'), 6, 'ce-bindable');
  });

  it("produces PropertyBinding targeting the bindable property", () => {
    const analysis = analyzeTemplate(result, "app");
    const el = findElement(analysis, "my-input");
    assertBinding(findAttr(el, 'value.bind'), {
      instructionType: 'PropertyBinding',
      targetProperty: 'value',
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
    const analysis = analyzeTemplate(result, "app");
    const div = findElement(analysis, "div");
    assertClassified(findAttr(div, 'highlight'), 7, 'custom-attribute');
  });

  it("produces HydrateAttribute instruction", () => {
    const analysis = analyzeTemplate(result, "app");
    const div = findElement(analysis, "div");
    assertBinding(findAttr(div, 'highlight'), {
      instructionType: 'HydrateAttribute',
    });
  });
});

// =============================================================================
// 6A-7: Vocabulary gap → step 4 misses → step 8 (misclassification)
// =============================================================================

describe("6A-7: Vocabulary gap → step 4 misclassification", () => {
  // Simulates a scenario where the 'dispatch' BC (ignoreAttr: true)
  // is NOT in the vocabulary (state plugin not registered).
  // click.dispatch should be caught at step 4 but falls through to 8.
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
    const analysis = analyzeTemplate(result, "app");
    const div = findElement(analysis, "div");
    const attr = findAttr(div, 'click.dispatch');

    // dispatch is not in the core vocabulary (state plugin not registered).
    // The AP parses click.dispatch → target: click, command: dispatch.
    // Step 4 checks vocabulary for dispatch → not found (no ignoreAttr).
    // Falls through to step 8.
    assertClassified(attr, 8, 'plain-attribute');
  });

  it("upstream gap: dispatch BC absent from vocabulary (state plugin not registered)", () => {
    const vocab = evaluateProjectVocabulary(result);

    // The upstream cause: dispatch is not in the vocabulary at all.
    // This is what makes the step 8 classification a misclassification —
    // dispatch SHOULD be at step 4 if the state plugin were registered.
    const cmd = vocab.green.commands.get("dispatch");
    expect(cmd).toBeUndefined();
  });

  it("no binding produced — silent misclassification (no error signal)", () => {
    const analysis = analyzeTemplate(result, "app");
    const div = findElement(analysis, "div");
    const attr = findAttr(div, 'click.dispatch');

    // dispatch is unknown → no DispatchBinding instruction produced.
    // This is the silence: no error, no binding, the attribute is just
    // left on the DOM. The misclassification is invisible.
    expect(attr.binding).toBeNull();
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
    const analysis = analyzeTemplate(result, "app");
    const el = findElement(analysis, "dynamic-el");

    // computeBindables() is opaque — the product can't determine the
    // bindable list. Both attributes fall through step 6 to step 8.
    const title = findAttr(el, 'title.bind');
    const subtitle = findAttr(el, 'subtitle.bind');

    assertClassified(title, 8, 'plain-attribute');
    assertClassified(subtitle, 8, 'plain-attribute');
  });

  it("upstream gap: bindable list is opaque (computeBindables())", () => {
    // The upstream cause: the bindables field on dynamic-el's conclusion
    // is gapped because computeBindables() is an opaque function call.
    // This is what makes step 6 miss — it can't find subtitle in the
    // bindable list because the list is indeterminate.
    const bindables = pullValue(result.graph, "custom-element:dynamic-el", "bindables");

    // The product either has no bindables (fully opaque) or has a gap marker.
    // Either way, subtitle is not discoverable as a bindable.
    expect(bindables === undefined || bindables === null ||
      (typeof bindables === 'object' && !Array.isArray(bindables) &&
        !Object.keys(bindables as Record<string, unknown>).includes('subtitle'))
    ).toBe(true);
  });
});

// =============================================================================
// 6A-9: Scope gap → step 7 misses → step 8
// =============================================================================

describe("6A-9: Scope gap → step 7 misclassification", () => {
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

  it("tooltip CA registered via opaque getPlugins() → step 7 misses", () => {
    const analysis = analyzeTemplate(result, "app");
    const div = findElement(analysis, "div");
    const attr = findAttr(div, 'tooltip');

    // tooltip is a CA, but it's registered via getPlugins() which is
    // opaque. The scope has a registration gap. tooltip is not in the
    // visibility set for app's scope. Step 7 can't find it.
    // Falls through to step 8.
    assertClassified(attr, 8, 'plain-attribute');
  });

  it("upstream gap: scope has registration gap from getPlugins()", () => {
    const vis = evaluateVisibility(result);

    // The upstream cause: getPlugins() is opaque, creating a registration
    // gap in the root scope. This gap propagates to app's scope, making
    // the CA catalog incomplete. Step 7 can't find tooltip because the
    // scope-visibility layer can't guarantee it's there.
    assertNotComplete(vis, "app");
    assertRegistrationGap(vis, "app", { reason: "opaque" });
  });
});
