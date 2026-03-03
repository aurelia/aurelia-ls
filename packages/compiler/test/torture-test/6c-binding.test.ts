/**
 * Tier 6C: Binding Validation and Mode Resolution Claims (7 claims)
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
  assertElementNotFound,
  pullValue,
  pullBindables,
} from "./harness.js";

describe("6C-1: .bind on form element → twoWay (via isTwoWay)", () => {
  const result = runInterpreter({
    "/src/app.ts": `
      import { customElement } from 'aurelia';
      @customElement({
        name: 'app',
        template: \`
          <input value.bind="name">
          <input type="checkbox" checked.bind="isActive">
          <select value.bind="selected"><option>a</option><option>b</option></select>
          <div title.bind="tooltip"></div>
        \`
      })
      export class App { name = ''; isActive = false; selected = 'a'; tooltip = 'help'; }
    `,
  });

  it("input value.bind → twoWay", () => {
    const s = analyzeTemplate(result, "app");
    const inputs = findElements(s, "input");
    const textInput = inputs.find(e => e.attributes.some(a => a.rawName === 'value.bind'))!;
    assertBinding(findAttr(textInput, 'value.bind'), { kind: 'native-prop', effectiveMode: 'twoWay' });
  });

  it("checkbox checked.bind → twoWay", () => {
    const s = analyzeTemplate(result, "app");
    const inputs = findElements(s, "input");
    const checkbox = inputs.find(e => e.attributes.some(a => a.rawName === 'checked.bind'))!;
    assertBinding(findAttr(checkbox, 'checked.bind'), { kind: 'native-prop', effectiveMode: 'twoWay' });
  });

  it("select value.bind → twoWay", () => {
    const s = analyzeTemplate(result, "app");
    const select = findElement(s, "select");
    assertBinding(findAttr(select, 'value.bind'), { kind: 'native-prop', effectiveMode: 'twoWay' });
  });

  it("div title.bind → toView (not a form element)", () => {
    const s = analyzeTemplate(result, "app");
    const div = findElement(s, "div");
    assertBinding(findAttr(div, 'title.bind'), { kind: 'native-prop', effectiveMode: 'toView' });
  });
});

describe("6C-2: .bind on CE bindable with declared mode", () => {
  const result = runInterpreter({
    "/src/editable-label.ts": `
      import { customElement, bindable } from 'aurelia';
      @customElement({ name: 'editable-label', template: '<input value.bind="value">' })
      export class EditableLabel {
        @bindable({ mode: 6 }) value: string = '';
        @bindable({ mode: 4 }) output: string = '';
      }
    `,
    "/src/app.ts": `
      import { customElement } from 'aurelia';
      import { EditableLabel } from './editable-label';
      @customElement({
        name: 'app',
        template: '<editable-label value.bind="name" output.bind="result"></editable-label>',
        dependencies: [EditableLabel]
      })
      export class App { name = 'hello'; result = ''; }
    `,
  });

  it("value.bind uses declared mode twoWay (6)", () => {
    const s = analyzeTemplate(result, "app");
    const el = findElement(s, "editable-label");
    assertBinding(findAttr(el, 'value.bind'), { kind: 'bindable', effectiveMode: 'twoWay', property: 'value' });
  });

  it("output.bind uses declared mode fromView (4)", () => {
    const s = analyzeTemplate(result, "app");
    const el = findElement(s, "editable-label");
    assertBinding(findAttr(el, 'output.bind'), { kind: 'bindable', effectiveMode: 'fromView', property: 'output' });
  });
});

describe("6C-3: .bind on CE bindable with default mode → toView", () => {
  const result = runInterpreter({
    "/src/status-badge.ts": `
      import { customElement, bindable } from 'aurelia';
      @customElement({ name: 'status-badge', template: '<span>\${label}</span>' })
      export class StatusBadge { @bindable label: string = ''; }
    `,
    "/src/app.ts": `
      import { customElement } from 'aurelia';
      import { StatusBadge } from './status-badge';
      @customElement({
        name: 'app',
        template: '<status-badge label.bind="status"></status-badge>',
        dependencies: [StatusBadge]
      })
      export class App { status = 'active'; }
    `,
  });

  it("label.bind uses default mode → toView", () => {
    const s = analyzeTemplate(result, "app");
    const el = findElement(s, "status-badge");
    assertBinding(findAttr(el, 'label.bind'), { kind: 'bindable', effectiveMode: 'toView', property: 'label' });
  });
});

describe("6C-4: Interpolation in text and attributes", () => {
  const result = runInterpreter({
    "/src/app.ts": `
      import { customElement } from 'aurelia';
      @customElement({
        name: 'app',
        template: \`
          <h1>\\\${title}</h1>
          <p>\\\${greeting}, \\\${name}!</p>
          <div title="\\\${tooltip}" class="item-\\\${index}">content</div>
        \`
      })
      export class App { title = 'Hello'; greeting = 'Welcome'; name = 'World'; tooltip = 'hover'; index = 0; }
    `,
  });

  it("single-expression text interpolation detected", () => {
    const s = analyzeTemplate(result, "app");
    const titleText = s.texts.find(b => b.content.includes('${title}'));
    expect(titleText).toBeDefined();
    expect(titleText!.hasInterpolation).toBe(true);
  });

  it("multi-expression text interpolation detected", () => {
    const s = analyzeTemplate(result, "app");
    const multiText = s.texts.find(b => b.content.includes('${greeting}') || b.content.includes('${name}'));
    expect(multiText).toBeDefined();
    expect(multiText!.hasInterpolation).toBe(true);
  });

  it("attribute interpolation produces interpolation binding", () => {
    const s = analyzeTemplate(result, "app");
    const div = findElement(s, "div");
    assertClassified(findAttr(div, 'title'), 8, 'plain-attribute');
    assertBinding(findAttr(div, 'title'), { kind: 'interpolation' });
  });

  it("class attribute with interpolation produces interpolation binding", () => {
    const s = analyzeTemplate(result, "app");
    const div = findElement(s, "div");
    assertClassified(findAttr(div, 'class'), 8, 'plain-attribute');
    assertBinding(findAttr(div, 'class'), { kind: 'interpolation' });
  });
});

describe("6C-5: Non-existent bindable + complete CE", () => {
  const result = runInterpreter({
    "/src/simple-card.ts": `
      import { customElement, bindable } from 'aurelia';
      @customElement({ name: 'simple-card', template: '<div>\${title}</div>' })
      export class SimpleCard { @bindable title: string = ''; }
    `,
    "/src/app.ts": `
      import { customElement } from 'aurelia';
      import { SimpleCard } from './simple-card';
      @customElement({
        name: 'app',
        template: '<simple-card title.bind="t" subtitle.bind="s"></simple-card>',
        dependencies: [SimpleCard]
      })
      export class App { t = 'hello'; s = 'world'; }
    `,
  });

  it("title.bind resolves as CE bindable (step 6)", () => {
    const s = analyzeTemplate(result, "app");
    const el = findElement(s, "simple-card");
    assertClassified(findAttr(el, 'title.bind'), 6, 'ce-bindable');
  });

  it("subtitle.bind falls through to step 8", () => {
    const s = analyzeTemplate(result, "app");
    const el = findElement(s, "simple-card");
    assertClassified(findAttr(el, 'subtitle.bind'), 8, 'plain-attribute');
  });

  it("subtitle.bind still gets a binding (plain-element BC path)", () => {
    const s = analyzeTemplate(result, "app");
    const el = findElement(s, "simple-card");
    expect(findAttr(el, 'subtitle.bind').binding).toBeDefined();
  });

  it("grounded negative: CE bindable list is complete", () => {
    const bindables = pullBindables(result.graph, "custom-element:simple-card");
    expect(bindables).toBeDefined();
    expect(bindables).toHaveProperty('title');
  });
});

describe("6C-6: Non-existent bindable + gapped CE", () => {
  const result = runInterpreter({
    "/src/dynamic-card.ts": `
      import { customElement } from 'aurelia';
      function getBindables() { return { title: {}, subtitle: {} }; }
      @customElement({ name: 'dynamic-card', template: '<div>\${title}</div>', bindables: getBindables() })
      export class DynamicCard { title = ''; subtitle = ''; }
    `,
    "/src/app.ts": `
      import { customElement } from 'aurelia';
      import { DynamicCard } from './dynamic-card';
      @customElement({
        name: 'app',
        template: '<dynamic-card title.bind="t" subtitle.bind="s"></dynamic-card>',
        dependencies: [DynamicCard]
      })
      export class App { t = 'hello'; s = 'world'; }
    `,
  });

  it("both attributes fall through to step 8", () => {
    const s = analyzeTemplate(result, "app");
    const el = findElement(s, "dynamic-card");
    assertClassified(findAttr(el, 'title.bind'), 8, 'plain-attribute');
    assertClassified(findAttr(el, 'subtitle.bind'), 8, 'plain-attribute');
  });

  it("ungrounded: bindable list is gapped", () => {
    const bindables = pullValue(result.graph, "custom-element:dynamic-card", "bindables");
    expect(bindables === undefined || bindables === null).toBe(true);
  });
});

describe("6C-7: Multi-binding syntax on CA", () => {
  const result = runInterpreter({
    "/src/my-tooltip.ts": `
      import { customAttribute, bindable } from 'aurelia';
      @customAttribute('my-tooltip')
      export class MyTooltip {
        @bindable text: string = '';
        @bindable position: string = 'top';
        @bindable({ mode: 2 }) delay: number = 0;
      }
    `,
    "/src/app.ts": `
      import { customElement } from 'aurelia';
      import { MyTooltip } from './my-tooltip';
      @customElement({
        name: 'app',
        template: '<div my-tooltip="text: Hello; position.bind: pos; delay: 500">hover</div>',
        dependencies: [MyTooltip]
      })
      export class App { pos = 'bottom'; }
    `,
  });

  it("my-tooltip classified at step 7 (CA)", () => {
    const s = analyzeTemplate(result, "app");
    const div = findElement(s, "div");
    assertClassified(findAttr(div, 'my-tooltip'), 7, 'custom-attribute');
  });

  it("produces CA binding", () => {
    const s = analyzeTemplate(result, "app");
    const div = findElement(s, "div");
    expect(findAttr(div, 'my-tooltip').binding).toBeDefined();
  });
});
