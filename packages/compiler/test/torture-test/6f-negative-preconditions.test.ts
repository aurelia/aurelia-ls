/**
 * Tier 6F: F9 Negative Precondition Claims
 *
 * Tests that the system produces NO Aurelia assertions at template
 * positions where no Aurelia semantics exist. Rung 4 of the
 * degradation ladder: "not applicable."
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

describe("6F-1: Plain HTML elements → no Aurelia claims", () => {
  const result = runInterpreter({
    "/src/app.ts": `
      import { customElement } from 'aurelia';
      @customElement({
        name: 'app',
        template: \`
          <header>
            <h1>Welcome</h1>
            <nav><a href="/home">Home</a><a href="/about">About</a></nav>
          </header>
          <main>
            <p>This is plain HTML content.</p>
            <img src="photo.jpg" alt="A photo">
            <ul><li>Item 1</li><li>Item 2</li></ul>
          </main>
          <footer><small>Copyright 2026</small></footer>
        \`
      })
      export class App {}
    `,
  });

  it("recognizes standard HTML elements as plain HTML", () => {
    const s = analyzeTemplate(result, "app");
    for (const el of s.elements) {
      assertPlainHtml(el);
    }
  });

  it("produces no Aurelia-specific bindings (set-property for static attrs is OK)", () => {
    const s = analyzeTemplate(result, "app");
    for (const el of s.elements) {
      for (const attr of el.attributes) {
        if (attr.binding !== null && attr.binding.kind !== 'set-property') {
          throw new Error(
            `Unexpected Aurelia binding on <${el.tagName}> '${attr.rawName}': ${attr.binding.kind}`
          );
        }
      }
    }
  });

  it("no text interpolation bindings", () => {
    const s = analyzeTemplate(result, "app");
    expect(s.texts.length).toBe(0);
  });

  it("recognizes common HTML elements", () => {
    const s = analyzeTemplate(result, "app");
    const tags = s.elements.map(e => e.tagName.toLowerCase());
    for (const tag of ['header', 'h1', 'nav', 'a', 'main', 'p', 'img', 'ul', 'li', 'footer', 'small']) {
      expect(tags).toContain(tag);
    }
  });
});

describe("6F-2: Plain HTML attributes → correct step 8", () => {
  const result = runInterpreter({
    "/src/my-widget.ts": `
      import { customElement, bindable } from 'aurelia';
      @customElement({ name: 'my-widget', template: '<div>\${label}</div>' })
      export class MyWidget { @bindable label: string = ''; }
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
      export class App { text = 'hello'; }
    `,
  });

  it("classifies plain HTML attrs at step 8", () => {
    const s = analyzeTemplate(result, "app");
    const div = findElement(s, "div");
    assertClassified(findAttr(div, 'id'), 8, 'plain-attribute');
    assertClassified(findAttr(div, 'class'), 8, 'plain-attribute');
    assertClassified(findAttr(div, 'style'), 8, 'plain-attribute');
  });

  it("classifies plain attrs on CE at step 8 alongside CE bindable", () => {
    const s = analyzeTemplate(result, "app");
    const widget = findElement(s, "my-widget");
    assertClassified(findAttr(widget, 'label.bind'), 6, 'ce-bindable');
    assertClassified(findAttr(widget, 'class'), 8, 'plain-attribute');
    assertClassified(findAttr(widget, 'data-id'), 8, 'plain-attribute');
  });

  it("plain attrs on div have no binding", () => {
    const s = analyzeTemplate(result, "app");
    const div = findElement(s, "div");
    assertNoBinding(findAttr(div, 'id'));
    assertNoBinding(findAttr(div, 'class'));
  });
});

describe("6F-3: data-* and ARIA passthrough", () => {
  const result = runInterpreter({
    "/src/app.ts": `
      import { customElement } from 'aurelia';
      @customElement({
        name: 'app',
        template: \`
          <div data-testid="main-container" data-analytics-event="page-view"
               aria-label="Main content" aria-expanded="false" role="main">
            <button data-action="submit" aria-pressed="false" role="button" disabled>Submit</button>
          </div>
        \`
      })
      export class App {}
    `,
  });

  it("data-* attributes classified at step 8", () => {
    const s = analyzeTemplate(result, "app");
    const div = findElement(s, "div");
    assertClassified(findAttr(div, 'data-testid'), 8, 'plain-attribute');
    assertClassified(findAttr(div, 'data-analytics-event'), 8, 'plain-attribute');
  });

  it("aria-* attributes classified at step 8", () => {
    const s = analyzeTemplate(result, "app");
    const div = findElement(s, "div");
    assertClassified(findAttr(div, 'aria-label'), 8, 'plain-attribute');
    assertClassified(findAttr(div, 'aria-expanded'), 8, 'plain-attribute');
  });

  it("role and boolean disabled at step 8", () => {
    const s = analyzeTemplate(result, "app");
    const div = findElement(s, "div");
    assertClassified(findAttr(div, 'role'), 8, 'plain-attribute');
    const button = findElement(s, "button");
    assertClassified(findAttr(button, 'disabled'), 8, 'plain-attribute');
  });

  it("all data-*/aria-*/role have no binding (truly plain)", () => {
    const s = analyzeTemplate(result, "app");
    const div = findElement(s, "div");
    assertNoBinding(findAttr(div, 'data-testid'));
    assertNoBinding(findAttr(div, 'aria-label'));
    assertNoBinding(findAttr(div, 'role'));
  });
});

describe("6F-4: ARIA with Aurelia binding", () => {
  const result = runInterpreter({
    "/src/app.ts": `
      import { customElement } from 'aurelia';
      @customElement({
        name: 'app',
        template: \`
          <button aria-expanded.bind="isOpen" aria-label.bind="buttonLabel"
                  class.bind="isOpen ? 'active' : 'inactive'">Toggle</button>
        \`
      })
      export class App { isOpen = false; buttonLabel = 'Toggle panel'; }
    `,
  });

  it("aria-expanded.bind classified at step 8 with binding", () => {
    const s = analyzeTemplate(result, "app");
    const button = findElement(s, "button");
    assertClassified(findAttr(button, 'aria-expanded.bind'), 8, 'plain-attribute');
    assertBinding(findAttr(button, 'aria-expanded.bind'), {
      kind: 'native-prop', effectiveMode: 'toView',
    });
  });

  it("class.bind classified at step 8 with binding", () => {
    const s = analyzeTemplate(result, "app");
    const button = findElement(s, "button");
    assertClassified(findAttr(button, 'class.bind'), 8, 'plain-attribute');
    assertBinding(findAttr(button, 'class.bind'), { kind: 'native-prop', effectiveMode: 'toView' });
  });
});

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

  it("web component (google-map) is not-found", () => {
    const s = analyzeTemplate(result, "app");
    const el = findElement(s, "google-map");
    expect(el.resolution.kind).toBe('not-found');
  });

  it("iframe treated as plain HTML", () => {
    const s = analyzeTemplate(result, "app");
    assertPlainHtml(findElement(s, "iframe"));
  });

  it("canvas treated as plain HTML", () => {
    const s = analyzeTemplate(result, "app");
    assertPlainHtml(findElement(s, "canvas"));
  });

  it("video treated as plain HTML", () => {
    const s = analyzeTemplate(result, "app");
    assertPlainHtml(findElement(s, "video"));
  });

  it("web component attributes are plain (no false-positive diagnostics)", () => {
    const s = analyzeTemplate(result, "app");
    const el = findElement(s, "google-map");
    assertClassified(findAttr(el, 'api-key'), 8, 'plain-attribute');
    assertClassified(findAttr(el, 'center'), 8, 'plain-attribute');
    assertNoBinding(findAttr(el, 'api-key'));
  });
});

describe("6F-6: SVG passthrough", () => {
  const result = runInterpreter({
    "/src/app.ts": `
      import { customElement } from 'aurelia';
      @customElement({
        name: 'app',
        template: \`
          <svg viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="40" fill="blue"/>
          </svg>
        \`
      })
      export class App {}
    `,
  });

  it("SVG element recognized as plain HTML", () => {
    const s = analyzeTemplate(result, "app");
    assertPlainHtml(findElement(s, "svg"));
  });

  it("SVG child elements recognized as plain", () => {
    const s = analyzeTemplate(result, "app");
    assertPlainHtml(findElement(s, "circle"));
  });

  it("SVG attributes classified as plain step 8", () => {
    const s = analyzeTemplate(result, "app");
    const svg = findElement(s, "svg");
    assertClassified(findAttr(svg, 'viewBox'), 8, 'plain-attribute');
    const circle = findElement(s, "circle");
    assertClassified(findAttr(circle, 'cx'), 8, 'plain-attribute');
    assertClassified(findAttr(circle, 'fill'), 8, 'plain-attribute');
  });
});
