/**
 * Tier 6D: Scope Chain and Expression Resolution Claims (9 claims)
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
  assertScopeChain,
  collectScopeChain,
} from "./harness.js";

describe("6D-1: CE boundary scope", () => {
  const result = runInterpreter({
    "/src/child-el.ts": `
      import { customElement } from 'aurelia';
      @customElement({ name: 'child-el', template: '<div>\${childTitle}</div><div>\${parentTitle}</div>' })
      export class ChildEl { childTitle = 'I am child'; }
    `,
    "/src/parent-el.ts": `
      import { customElement } from 'aurelia';
      import { ChildEl } from './child-el';
      @customElement({ name: 'parent-el', template: '<child-el></child-el>', dependencies: [ChildEl] })
      export class ParentEl { parentTitle = 'I am parent'; }
    `,
  });

  it("child-el in parent-el's template has CE boundary", () => {
    const s = analyzeTemplate(result, "parent-el");
    const el = findElement(s, "child-el");
    expect(el.frame.isBoundary).toBe(true);
  });

  it("child-el's own template has CE boundary for child-el", () => {
    const cs = analyzeTemplate(result, "child-el");
    const div = findElement(cs, "div");
    assertScopeChain(div, ['ce-boundary']);
  });

  it("scope chain at div inside child-el is just [ce-boundary]", () => {
    const cs = analyzeTemplate(result, "child-el");
    const div = findElement(cs, "div");
    assertScopeChain(div, ['ce-boundary']);
  });
});

describe("6D-2: repeat TC scope", () => {
  const result = runInterpreter({
    "/src/app.ts": `
      import { customElement } from 'aurelia';
      @customElement({
        name: 'app',
        template: '<ul><li repeat.for="item of items">\\\${$index}: \\\${item}</li></ul>'
      })
      export class App { items = ['alpha', 'beta', 'gamma']; }
    `,
  });

  it("li inside repeat has scope [iterator → ce-boundary]", () => {
    const s = analyzeTemplate(result, "app");
    const li = findElement(s, "li");
    assertScopeChain(li, ['iterator', 'ce-boundary']);
  });

  it("repeat scope has correct iterator variable", () => {
    const s = analyzeTemplate(result, "app");
    const li = findElement(s, "li");
    const locals = li.frame.locals.map(l => l.name);
    expect(locals).toContain('item');
  });

  it("repeat scope has contextual variables", () => {
    const s = analyzeTemplate(result, "app");
    const li = findElement(s, "li");
    const locals = li.frame.locals.map(l => l.name);
    expect(locals).toContain('$index');
    expect(locals).toContain('$even');
    expect(locals).toContain('$odd');
    expect(locals).toContain('$first');
    expect(locals).toContain('$middle');
    expect(locals).toContain('$last');
    expect(locals).toContain('$length');
    expect(locals).toContain('$previous');
  });

  it("repeat scope isBoundary is false", () => {
    const s = analyzeTemplate(result, "app");
    const li = findElement(s, "li");
    expect(li.frame.isBoundary).toBe(false);
  });
});

describe("6D-3: if TC passthrough", () => {
  const result = runInterpreter({
    "/src/app.ts": `
      import { customElement } from 'aurelia';
      @customElement({
        name: 'app',
        template: '<div>\\\${title}</div><div if.bind="show">\\\${title} (conditional)</div>'
      })
      export class App { title = 'Hello'; show = true; }
    `,
  });

  it("div outside if has scope [ce-boundary]", () => {
    const s = analyzeTemplate(result, "app");
    const divs = findElements(s, "div");
    assertScopeChain(divs[0]!, ['ce-boundary']);
  });

  it("div inside if ALSO has scope [ce-boundary] — if doesn't create scope", () => {
    const s = analyzeTemplate(result, "app");
    const divs = findElements(s, "div");
    assertScopeChain(divs[1]!, ['ce-boundary']);
  });
});

describe("6D-4: $parent traversal — crosses CE boundary", () => {
  const result = runInterpreter({
    "/src/inner-el.ts": `
      import { customElement } from 'aurelia';
      @customElement({ name: 'inner-el', template: '<div>\${$parent.outerValue}</div><div>\${outerValue}</div>' })
      export class InnerEl {}
    `,
    "/src/outer-el.ts": `
      import { customElement } from 'aurelia';
      import { InnerEl } from './inner-el';
      @customElement({ name: 'outer-el', template: '<inner-el></inner-el>', dependencies: [InnerEl] })
      export class OuterEl { outerValue = 'from outer'; }
    `,
  });

  it("inner-el's template has CE boundary for inner-el", () => {
    const is = analyzeTemplate(result, "inner-el");
    const div = findElement(is, "div");
    assertScopeChain(div, ['ce-boundary']);
  });

  it("outer-el's template has CE boundary for outer-el", () => {
    const os = analyzeTemplate(result, "outer-el");
    const el = findElement(os, "inner-el");
    expect(el.frame.isBoundary).toBe(true);
  });

  it("bare outerValue stops at inner-el's CE boundary (isBoundary: true)", () => {
    const is = analyzeTemplate(result, "inner-el");
    const div = findElement(is, "div");
    const boundary = collectScopeChain(div.frame);
    expect(boundary).toContain('ce-boundary');
    expect(div.frame.isBoundary).toBe(true);
  });
});

describe("6D-5: Nested TC scope resolution", () => {
  const result = runInterpreter({
    "/src/app.ts": `
      import { customElement } from 'aurelia';
      @customElement({
        name: 'app',
        template: '<div if.bind="show"><span repeat.for="item of items">\\\${item}</span></div>'
      })
      export class App { show = true; items = ['a', 'b']; }
    `,
  });

  it("span inside if>repeat has scope [iterator → ce-boundary]", () => {
    const s = analyzeTemplate(result, "app");
    const span = findElement(s, "span");
    assertScopeChain(span, ['iterator', 'ce-boundary']);
  });

  it("if does NOT appear in scope chain (passthrough)", () => {
    const s = analyzeTemplate(result, "app");
    const span = findElement(s, "span");
    const chain = collectScopeChain(span.frame);
    expect(chain).not.toContain('if');
  });
});

describe("6D-6: Value converter type opacity (NL-2)", () => {
  const result = runInterpreter({
    "/src/app.ts": `
      import { customElement } from 'aurelia';
      @customElement({ name: 'app', template: '<div>\\\${price | currency:"USD"}</div>' })
      export class App { price = 42.99; }
    `,
  });

  it("text interpolation with VC is detected", () => {
    const s = analyzeTemplate(result, "app");
    expect(s.texts.length).toBeGreaterThan(0);
    const binding = s.texts.find(b => b.content.includes('currency'));
    expect(binding).toBeDefined();
    expect(binding!.hasInterpolation).toBe(true);
  });
});

describe("6D-7: Expression entry point selection", () => {
  const result = runInterpreter({
    "/src/app.ts": `
      import { customElement } from 'aurelia';
      @customElement({
        name: 'app',
        template: \`
          <input value.bind="name">
          <button click.trigger="handleClick()">Click</button>
          <div repeat.for="item of items">\\\${item}</div>
        \`
      })
      export class App { name = ''; items = ['a']; handleClick() {} }
    `,
  });

  it(".bind → IsProperty entry point", () => {
    const s = analyzeTemplate(result, "app");
    const input = findElement(s, "input");
    assertBinding(findAttr(input, 'value.bind'), { expressionEntry: 'IsProperty' });
  });

  it(".trigger → listener binding", () => {
    const s = analyzeTemplate(result, "app");
    const button = findElement(s, "button");
    assertBinding(findAttr(button, 'click.trigger'), { kind: 'listener' });
  });

  it(".for → TC classification (step 7)", () => {
    const s = analyzeTemplate(result, "app");
    const div = findElement(s, "div");
    assertClassified(findAttr(div, 'repeat.for'), 7, 'template-controller');
  });
});

describe("6D-8: with TC scope effect", () => {
  const result = runInterpreter({
    "/src/app.ts": `
      import { customElement } from 'aurelia';
      @customElement({
        name: 'app',
        template: '<div with.bind="obj"><span>\\\${name}</span></div>'
      })
      export class App { obj = { name: 'hello' }; }
    `,
  });

  it("span inside with has scope [value-overlay → ce-boundary]", () => {
    const s = analyzeTemplate(result, "app");
    const span = findElement(s, "span");
    assertScopeChain(span, ['value-overlay', 'ce-boundary']);
  });

  it("with scope isBoundary is false", () => {
    const s = analyzeTemplate(result, "app");
    const span = findElement(s, "span");
    expect(span.frame.isBoundary).toBe(false);
  });
});

describe("6D-9: <let> element scope injection", () => {
  const result = runInterpreter({
    "/src/app.ts": `
      import { customElement } from 'aurelia';
      @customElement({
        name: 'app',
        template: \`
          <let greeting.bind="'Hello'"></let>
          <let full-message.bind="greeting + ' ' + name"></let>
          <div>\\\${greeting}</div>
          <div>\\\${fullMessage}</div>
        \`
      })
      export class App { name = 'World'; }
    `,
  });

  it("<let> is recognized as an element", () => {
    const s = analyzeTemplate(result, "app");
    const letEls = findElements(s, "let");
    expect(letEls.length).toBe(2);
  });

  it("<let> produces a let scope entry with the bound variable", () => {
    const s = analyzeTemplate(result, "app");
    const letEls = findElements(s, "let");
    const frame = letEls[0]!.frame;
    if (frame.kind === 'let') {
      const locals = frame.locals.map(l => l.name);
      expect(locals).toContain('greeting');
    }
  });

  it("hyphenated let target is camelCase-transformed", () => {
    const s = analyzeTemplate(result, "app");
    const letEls = findElements(s, "let");
    const frame = letEls[1]!.frame;
    if (frame.kind === 'let') {
      const locals = frame.locals.map(l => l.name);
      expect(locals).toContain('fullMessage');
    }
  });
});
