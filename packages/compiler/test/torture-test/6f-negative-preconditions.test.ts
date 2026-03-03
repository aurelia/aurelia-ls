/**
 * Tier 6F: F9 Negative Precondition Claims
 *
 * Tests that the system produces NO Aurelia assertions at template
 * positions where no Aurelia semantics exist. Rung 4 of the
 * degradation ladder: "not applicable."
 *
 * Getting rung 4 right is MORE important than rungs 1-3 because
 * rung 4 failures (false assertions on valid HTML) directly violate
 * punishment #1 (false assertions are the worst punishment).
 */

import { describe, it, expect } from "vitest";
import {
  runInterpreter,
  analyzeTemplate,
  findElement,
  findElements,
  findAttr,
  assertClassified,
  assertPlainHtml,
  assertNotApplicable,
  assertNoBinding,
  assertBinding,
  assertResolvedCe,
} from "./harness.js";

// =============================================================================
// 6F-1: Plain HTML element → no Aurelia claims (rung 4)
// =============================================================================

describe("6F-1: Plain HTML elements → no Aurelia claims", () => {
  const result = runInterpreter({
    "/src/app.ts": `
      import { customElement } from 'aurelia';

      @customElement({
        name: 'app',
        template: \`
          <header>
            <h1>Welcome</h1>
            <nav>
              <a href="/home">Home</a>
              <a href="/about">About</a>
            </nav>
          </header>
          <main>
            <p>This is plain HTML content.</p>
            <img src="photo.jpg" alt="A photo">
            <ul>
              <li>Item 1</li>
              <li>Item 2</li>
            </ul>
          </main>
          <footer>
            <small>Copyright 2026</small>
          </footer>
        \`
      })
      export class App {}
    `,
  });

  it("recognizes standard HTML elements as plain HTML (not CEs)", () => {
    const analysis = analyzeTemplate(result, "app");

    // Every element should be plain HTML
    for (const el of analysis.elements) {
      assertPlainHtml(el);
    }
  });

  it("produces no Aurelia-specific instructions", () => {
    const analysis = analyzeTemplate(result, "app");

    for (const el of analysis.elements) {
      assertNotApplicable(el);
    }
  });

  it("no text interpolation bindings", () => {
    const analysis = analyzeTemplate(result, "app");
    expect(analysis.textBindings.length).toBe(0);
  });

  it("recognizes common HTML elements: header, nav, main, footer, ul, li", () => {
    const analysis = analyzeTemplate(result, "app");
    const tags = analysis.elements.map(e => e.tagName.toLowerCase());
    for (const tag of ['header', 'h1', 'nav', 'a', 'main', 'p', 'img', 'ul', 'li', 'footer', 'small']) {
      expect(tags).toContain(tag);
    }
  });
});

// =============================================================================
// 6F-2: Plain HTML attributes → correct step 8 (not misclassification)
// =============================================================================

describe("6F-2: Plain HTML attributes → correct step 8", () => {
  const result = runInterpreter({
    "/src/my-widget.ts": `
      import { customElement, bindable } from 'aurelia';

      @customElement({
        name: 'my-widget',
        template: '<div>\${label}</div>'
      })
      export class MyWidget {
        @bindable label: string = '';
      }
    `,
    "/src/app.ts": `
      import { customElement } from 'aurelia';
      import { MyWidget } from './my-widget';

      @customElement({
        name: 'app',
        template: \`
          <div id="container" class="main" style="color: red">
            <my-widget label.bind="text" class="widget" data-id="w1"></my-widget>
          </div>
        \`,
        dependencies: [MyWidget]
      })
      export class App {
        text = 'hello';
      }
    `,
  });

  it("classifies plain HTML attrs at step 8", () => {
    const analysis = analyzeTemplate(result, "app");
    const div = findElement(analysis, "div");

    assertClassified(findAttr(div, 'id'), 8, 'plain-attribute');
    assertClassified(findAttr(div, 'class'), 8, 'plain-attribute');
    assertClassified(findAttr(div, 'style'), 8, 'plain-attribute');
  });

  it("classifies plain attrs on CE at step 8 alongside CE bindable", () => {
    const analysis = analyzeTemplate(result, "app");
    const widget = findElement(analysis, "my-widget");

    // label.bind → step 6 (CE bindable)
    assertClassified(findAttr(widget, 'label.bind'), 6, 'ce-bindable');

    // class="widget" → step 8 (plain, correct)
    assertClassified(findAttr(widget, 'class'), 8, 'plain-attribute');

    // data-id="w1" → step 8 (plain, correct)
    assertClassified(findAttr(widget, 'data-id'), 8, 'plain-attribute');
  });

  it("plain attrs on div have no binding (sub-path 8a)", () => {
    const analysis = analyzeTemplate(result, "app");
    const div = findElement(analysis, "div");

    assertNoBinding(findAttr(div, 'id'));
    assertNoBinding(findAttr(div, 'class'));
  });
});

// =============================================================================
// 6F-3: data-* and ARIA passthrough — transparent namespaces
// =============================================================================

describe("6F-3: data-* and ARIA passthrough", () => {
  const result = runInterpreter({
    "/src/app.ts": `
      import { customElement } from 'aurelia';

      @customElement({
        name: 'app',
        template: \`
          <div
            data-testid="main-container"
            data-analytics-event="page-view"
            data-custom-anything="value"
            aria-label="Main content"
            aria-expanded="false"
            aria-describedby="help-text"
            role="main"
          >
            <button
              data-action="submit"
              aria-pressed="false"
              role="button"
              disabled
            >Submit</button>
          </div>
        \`
      })
      export class App {}
    `,
  });

  it("data-* attributes classified at step 8", () => {
    const analysis = analyzeTemplate(result, "app");
    const div = findElement(analysis, "div");

    assertClassified(findAttr(div, 'data-testid'), 8, 'plain-attribute');
    assertClassified(findAttr(div, 'data-analytics-event'), 8, 'plain-attribute');
    assertClassified(findAttr(div, 'data-custom-anything'), 8, 'plain-attribute');
  });

  it("aria-* attributes classified at step 8", () => {
    const analysis = analyzeTemplate(result, "app");
    const div = findElement(analysis, "div");

    assertClassified(findAttr(div, 'aria-label'), 8, 'plain-attribute');
    assertClassified(findAttr(div, 'aria-expanded'), 8, 'plain-attribute');
    assertClassified(findAttr(div, 'aria-describedby'), 8, 'plain-attribute');
  });

  it("role attribute classified at step 8", () => {
    const analysis = analyzeTemplate(result, "app");
    const div = findElement(analysis, "div");
    assertClassified(findAttr(div, 'role'), 8, 'plain-attribute');
  });

  it("boolean attribute (disabled) classified at step 8", () => {
    const analysis = analyzeTemplate(result, "app");
    const button = findElement(analysis, "button");
    assertClassified(findAttr(button, 'disabled'), 8, 'plain-attribute');
  });

  it("all data-*/aria-*/role have no binding (truly plain)", () => {
    const analysis = analyzeTemplate(result, "app");
    const div = findElement(analysis, "div");

    assertNoBinding(findAttr(div, 'data-testid'));
    assertNoBinding(findAttr(div, 'aria-label'));
    assertNoBinding(findAttr(div, 'role'));
  });
});

// =============================================================================
// 6F-4: ARIA with Aurelia binding — IS an Aurelia claim
// =============================================================================

describe("6F-4: ARIA with Aurelia binding", () => {
  const result = runInterpreter({
    "/src/app.ts": `
      import { customElement } from 'aurelia';

      @customElement({
        name: 'app',
        template: \`
          <button
            aria-expanded.bind="isOpen"
            aria-label.bind="buttonLabel"
            class.bind="isOpen ? 'active' : 'inactive'"
          >Toggle</button>
        \`
      })
      export class App {
        isOpen = false;
        buttonLabel = 'Toggle panel';
      }
    `,
  });

  it("aria-expanded.bind classified at step 8 with binding command", () => {
    const analysis = analyzeTemplate(result, "app");
    const button = findElement(analysis, "button");
    const attr = findAttr(button, 'aria-expanded.bind');

    // Step 8 because <button> is not a CE (no step 6), aria-expanded
    // is not a CA (no step 7). But it has a .bind command.
    assertClassified(attr, 8, 'plain-attribute');

    // Should produce a PropertyBinding
    assertBinding(attr, {
      instructionType: 'PropertyBinding',
      mode: 'toView',
      expressionEntry: 'IsProperty',
    });
  });

  it("class.bind classified at step 8 with binding command", () => {
    const analysis = analyzeTemplate(result, "app");
    const button = findElement(analysis, "button");
    const attr = findAttr(button, 'class.bind');

    assertClassified(attr, 8, 'plain-attribute');
    assertBinding(attr, {
      instructionType: 'PropertyBinding',
      mode: 'toView',
    });
  });

  it("aria-expanded.bind targets mapped DOM property", () => {
    const analysis = analyzeTemplate(result, "app");
    const button = findElement(analysis, "button");
    const attr = findAttr(button, 'aria-expanded.bind');

    // aria-expanded → camelCase fallback → ariaExpanded
    assertBinding(attr, { targetProperty: 'ariaExpanded' });
  });

  it("class.bind targets className via attrMapper", () => {
    const analysis = analyzeTemplate(result, "app");
    const button = findElement(analysis, "button");
    const attr = findAttr(button, 'class.bind');

    // class → className via attrMapper.map()
    assertBinding(attr, { targetProperty: 'className' });
  });
});

// =============================================================================
// 6F-5: Opacity boundaries — analysis stops
// =============================================================================

describe("6F-5: Opacity boundaries", () => {
  const result = runInterpreter({
    "/src/app.ts": `
      import { customElement } from 'aurelia';

      @customElement({
        name: 'app',
        template: \`
          <google-map api-key="abc123" center="51.5,-0.1"></google-map>
          <iframe src="/embedded-page" title="Embedded content"></iframe>
          <canvas id="chart" width="400" height="300"></canvas>
          <video src="clip.mp4" controls></video>
        \`
      })
      export class App {}
    `,
  });

  it("web component (google-map) is not-found (no CE definition)", () => {
    const analysis = analyzeTemplate(result, "app");
    const el = findElement(analysis, "google-map");

    // Hyphenated tag not in resource catalog → not-found.
    // Diagnostic suppression (intent precondition: no binding syntax)
    // happens at the diagnostic layer, not the classification layer.
    // The grounded flag is true (scope is complete — no plugins registered).
    expect(el.resolution.kind).toBe('not-found');
  });

  it("iframe treated as plain HTML", () => {
    const analysis = analyzeTemplate(result, "app");
    const el = findElement(analysis, "iframe");
    assertPlainHtml(el);
  });

  it("canvas treated as plain HTML", () => {
    const analysis = analyzeTemplate(result, "app");
    const el = findElement(analysis, "canvas");
    assertPlainHtml(el);
  });

  it("video treated as plain HTML", () => {
    const analysis = analyzeTemplate(result, "app");
    const el = findElement(analysis, "video");
    assertPlainHtml(el);
  });

  it("web component attributes are plain (no false-positive diagnostics)", () => {
    const analysis = analyzeTemplate(result, "app");
    const el = findElement(analysis, "google-map");

    // api-key and center should be plain step 8 with no binding
    assertClassified(findAttr(el, 'api-key'), 8, 'plain-attribute');
    assertClassified(findAttr(el, 'center'), 8, 'plain-attribute');
    assertNoBinding(findAttr(el, 'api-key'));
  });
});

// =============================================================================
// 6F-6: SVG passthrough + namespace-dependent CA classification (LE-30)
// =============================================================================

describe("6F-6: SVG passthrough + namespace CA rule (LE-30)", () => {
  // Register the router so the href CA is in scope — this is the key
  // setup for the namespace collision test. Same attribute name (href),
  // same CA in scope, different classification based on namespace.
  const result = runInterpreter({
    "/src/main.ts": `
      import Aurelia from 'aurelia';
      import { RouterConfiguration } from '@aurelia/router';
      import { App } from './app';

      Aurelia.register(RouterConfiguration).app(App).start();
    `,
    "/src/app.ts": `
      import { customElement } from 'aurelia';

      @customElement({
        name: 'app',
        template: \`
          <svg viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="40" fill="blue"/>
            <use href="#icon-star"/>
          </svg>
          <a href="/about">About</a>
        \`
      })
      export class App {}
    `,
  });

  it("SVG element recognized as plain HTML (not unknown CE)", () => {
    const analysis = analyzeTemplate(result, "app");
    const svg = findElement(analysis, "svg");
    assertPlainHtml(svg);
  });

  it("SVG child elements recognized as plain", () => {
    const analysis = analyzeTemplate(result, "app");
    const circle = findElement(analysis, "circle");
    assertPlainHtml(circle);
  });

  it("SVG elements have svg namespace", () => {
    const analysis = analyzeTemplate(result, "app");
    const svg = findElement(analysis, "svg");
    expect(svg.namespace).toBe('svg');

    const circle = findElement(analysis, "circle");
    expect(circle.namespace).toBe('svg');
  });

  it("SVG attributes classified as plain step 8", () => {
    const analysis = analyzeTemplate(result, "app");
    const svg = findElement(analysis, "svg");
    assertClassified(findAttr(svg, 'viewBox'), 8, 'plain-attribute');

    const circle = findElement(analysis, "circle");
    assertClassified(findAttr(circle, 'cx'), 8, 'plain-attribute');
    assertClassified(findAttr(circle, 'fill'), 8, 'plain-attribute');
  });

  it("href on SVG <use> is plain step 8 (LE-30: bare attr in SVG skips CA)", () => {
    const analysis = analyzeTemplate(result, "app");
    const use = findElement(analysis, "use");
    const href = findAttr(use, 'href');

    // The router href CA IS in scope. But per LE-30, bare attributes
    // in non-HTML namespaces skip CA lookup at step 7. href on <use>
    // has no Aurelia binding syntax → native SVG attribute → step 8.
    assertClassified(href, 8, 'plain-attribute');
    assertNoBinding(href);
  });

  it("href on HTML <a> is step 7 (CA — router intercepts in HTML namespace)", () => {
    const analysis = analyzeTemplate(result, "app");
    const a = findElement(analysis, "a");
    const href = findAttr(a, 'href');

    // Same attribute name (href), same CA in scope, but HTML namespace.
    // In HTML namespace, step 7 CA lookup applies to bare attributes.
    // The router's href CA intercepts: step 7 classification.
    assertClassified(href, 7, 'custom-attribute');
  });
});
