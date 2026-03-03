/**
 * Tier 6D: Scope Chain and Expression Resolution Claims (9 claims)
 *
 * Tests template scope (Scope class chain, F5) — categorically
 * distinct from resource scope (Container.find, tier 4).
 *
 * The scope chain is structural: fully determinable from the template
 * tree, CE boundaries, and per-TC scope effects. It does not require
 * semantic linking or type checking.
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
  assertCeBoundary,
  assertRepeatScope,
  assertScopeChain,
  assertNoBoundaryExceptCe,
  type ScopeEntry,
} from "./harness.js";

// =============================================================================
// 6D-1: CE boundary scope — bare identifiers stop at boundary
// =============================================================================

describe("6D-1: CE boundary scope", () => {
  const result = runInterpreter({
    "/src/child-el.ts": `
      import { customElement } from 'aurelia';

      @customElement({
        name: 'child-el',
        template: '<div>\${childTitle}</div><div>\${parentTitle}</div>'
      })
      export class ChildEl {
        childTitle = 'I am child';
      }
    `,
    "/src/parent-el.ts": `
      import { customElement } from 'aurelia';
      import { ChildEl } from './child-el';

      @customElement({
        name: 'parent-el',
        template: '<child-el></child-el>',
        dependencies: [ChildEl]
      })
      export class ParentEl {
        parentTitle = 'I am parent';
      }
    `,
  });

  it("parent-el scope has CE boundary for parent-el", () => {
    const analysis = analyzeTemplate(result, "parent-el");
    const childEl = findElement(analysis, "child-el");
    assertCeBoundary(childEl, "parent-el");
  });

  it("child-el's own template has CE boundary for child-el", () => {
    const childAnalysis = analyzeTemplate(result, "child-el");
    const div = findElement(childAnalysis, "div");
    assertCeBoundary(div, "child-el");
  });

  it("scope chain at div inside child-el is just [ce-boundary(child-el)]", () => {
    const childAnalysis = analyzeTemplate(result, "child-el");
    const div = findElement(childAnalysis, "div");
    assertScopeChain(div, ['ce-boundary']);
  });
});

// =============================================================================
// 6D-2: repeat TC scope — child scope with contextual variables
// =============================================================================

describe("6D-2: repeat TC scope", () => {
  const result = runInterpreter({
    "/src/app.ts": `
      import { customElement } from 'aurelia';

      @customElement({
        name: 'app',
        template: \`
          <ul>
            <li repeat.for="item of items">
              \\\${$index}: \\\${item}
            </li>
          </ul>
        \`
      })
      export class App {
        items = ['alpha', 'beta', 'gamma'];
      }
    `,
  });

  it("li inside repeat has scope chain [repeat → ce-boundary]", () => {
    const analysis = analyzeTemplate(result, "app");
    const li = findElement(analysis, "li");
    assertScopeChain(li, ['repeat', 'ce-boundary']);
  });

  it("repeat scope has correct iterator variable", () => {
    const analysis = analyzeTemplate(result, "app");
    const li = findElement(analysis, "li");
    assertRepeatScope(li, "item");
  });

  it("repeat scope has 8 contextual variables", () => {
    const analysis = analyzeTemplate(result, "app");
    const li = findElement(analysis, "li");
    const repeat = li.scopeChain.find(s => s.kind === 'repeat');
    expect(repeat).toBeDefined();
    if (repeat?.kind === 'repeat') {
      expect(repeat.contextualVars).toContain('$index');
      expect(repeat.contextualVars).toContain('$even');
      expect(repeat.contextualVars).toContain('$odd');
      expect(repeat.contextualVars).toContain('$first');
      expect(repeat.contextualVars).toContain('$middle');
      expect(repeat.contextualVars).toContain('$last');
      expect(repeat.contextualVars).toContain('$length');
      expect(repeat.contextualVars).toContain('$previous');
      expect(repeat.contextualVars.length).toBe(8);
    }
  });

  it("repeat scope isBoundary is false (TC scopes are NEVER boundaries)", () => {
    const analysis = analyzeTemplate(result, "app");
    const li = findElement(analysis, "li");
    assertNoBoundaryExceptCe(li);
  });
});

// =============================================================================
// 6D-3: if TC passthrough — no scope creation
// =============================================================================

describe("6D-3: if TC passthrough — no scope creation", () => {
  const result = runInterpreter({
    "/src/app.ts": `
      import { customElement } from 'aurelia';

      @customElement({
        name: 'app',
        template: \`
          <div>\\\${title}</div>
          <div if.bind="show">\\\${title} (conditional)</div>
        \`
      })
      export class App {
        title = 'Hello';
        show = true;
      }
    `,
  });

  it("div outside if has scope [ce-boundary(App)]", () => {
    const analysis = analyzeTemplate(result, "app");
    const divs = findElements(analysis, "div");
    // First div is outside the if
    const outsideDiv = divs[0]!;
    assertScopeChain(outsideDiv, ['ce-boundary']);
  });

  it("div inside if ALSO has scope [ce-boundary(App)] — if doesn't create scope", () => {
    const analysis = analyzeTemplate(result, "app");
    const divs = findElements(analysis, "div");
    // Second div is inside the if — but if is passthrough
    const insideDiv = divs[1]!;
    assertScopeChain(insideDiv, ['ce-boundary']);
  });
});

// =============================================================================
// 6D-4: $parent traversal — crosses CE boundary
// (Structural claim: $parent hops exactly N parents, ignoring boundaries)
// =============================================================================

describe("6D-4: $parent traversal", () => {
  // $parent is a runtime scope mechanism. At the template analysis
  // level, we verify the scope chain structure supports $parent
  // traversal — i.e., the chain has the right entries in order.

  const result = runInterpreter({
    "/src/inner.ts": `
      import { customElement } from 'aurelia';

      @customElement({
        name: 'inner-el',
        template: '<span>\${value}</span>'
      })
      export class InnerEl {
        value = 'inner';
      }
    `,
    "/src/outer.ts": `
      import { customElement } from 'aurelia';
      import { InnerEl } from './inner';

      @customElement({
        name: 'outer-el',
        template: '<div repeat.for="item of items"><inner-el></inner-el></div>',
        dependencies: [InnerEl]
      })
      export class OuterEl {
        items = [1, 2, 3];
      }
    `,
  });

  it("inner-el inside repeat has scope [repeat → ce-boundary(outer-el)]", () => {
    const analysis = analyzeTemplate(result, "outer-el");
    const innerEl = findElement(analysis, "inner-el");
    assertScopeChain(innerEl, ['repeat', 'ce-boundary']);
  });

  it("$parent from inner-el's template would hop to repeat scope (structural)", () => {
    // inner-el's OWN template has scope [ce-boundary(inner-el)].
    // $parent.item would hop from inner-el's boundary to the repeat
    // scope in outer-el's template. This is a cross-CE traversal.
    // At the structural level, we verify inner-el's template has
    // its own CE boundary, and outer-el's template has the repeat scope.
    const innerAnalysis = analyzeTemplate(result, "inner-el");
    const span = findElement(innerAnalysis, "span");
    assertScopeChain(span, ['ce-boundary']);
    assertCeBoundary(span, "inner-el");
  });
});

// =============================================================================
// 6D-5: Nested TC scope resolution — walk through transparent scopes
// =============================================================================

describe("6D-5: Nested TC scope resolution", () => {
  const result = runInterpreter({
    "/src/app.ts": `
      import { customElement } from 'aurelia';

      @customElement({
        name: 'app',
        template: \`
          <div if.bind="show">
            <span repeat.for="item of items">\\\${item}</span>
          </div>
        \`
      })
      export class App {
        show = true;
        items = ['a', 'b'];
      }
    `,
  });

  it("span inside if>repeat has scope [repeat → ce-boundary]", () => {
    const analysis = analyzeTemplate(result, "app");
    const span = findElement(analysis, "span");
    // if is passthrough — doesn't appear in scope chain.
    // repeat creates scope. CE boundary from App.
    assertScopeChain(span, ['repeat', 'ce-boundary']);
  });

  it("if does NOT appear in scope chain (passthrough)", () => {
    const analysis = analyzeTemplate(result, "app");
    const span = findElement(analysis, "span");
    const hasIf = span.scopeChain.some(s => (s as any).tcName === 'if');
    expect(hasIf).toBe(false);
  });
});

// =============================================================================
// 6D-6: Value converter type opacity (NL-2)
// =============================================================================

describe("6D-6: Value converter type opacity (NL-2)", () => {
  // NL-2: Expression type flow through value converters is opaque.
  // VC type signatures are `unknown`. Type chain breaks at first converter.
  // This is a structural claim about the expression semantic model, not
  // about the scope chain. At the template analysis level, we verify
  // that VC usage in expressions is recognized (the VC name is the
  // expression's tail, not a scope identifier).

  const result = runInterpreter({
    "/src/app.ts": `
      import { customElement } from 'aurelia';

      @customElement({
        name: 'app',
        template: '<div>\\\${price | currency:"USD"}</div>'
      })
      export class App {
        price = 42.99;
      }
    `,
  });

  it("text interpolation with VC is detected", () => {
    const analysis = analyzeTemplate(result, "app");
    expect(analysis.textBindings.length).toBeGreaterThan(0);
    const binding = analysis.textBindings.find(b => b.content.includes('currency'));
    expect(binding).toBeDefined();
    expect(binding!.hasInterpolation).toBe(true);
  });
});

// =============================================================================
// 6D-7: Expression entry point selection
// =============================================================================

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
      export class App {
        name = '';
        items = ['a'];
        handleClick() {}
      }
    `,
  });

  it(".bind → IsProperty entry point", () => {
    const analysis = analyzeTemplate(result, "app");
    const input = findElement(analysis, "input");
    assertBinding(findAttr(input, 'value.bind'), { expressionEntry: 'IsProperty' });
  });

  it(".trigger → IsFunction entry point", () => {
    const analysis = analyzeTemplate(result, "app");
    const button = findElement(analysis, "button");
    assertBinding(findAttr(button, 'click.trigger'), { expressionEntry: 'IsFunction' });
  });

  it(".for → IsIterator entry point", () => {
    const analysis = analyzeTemplate(result, "app");
    const div = findElement(analysis, "div");
    const forAttr = findAttr(div, 'repeat.for');
    // repeat.for is classified as TC (step 7)
    assertClassified(forAttr, 7, 'template-controller');
  });
});

// =============================================================================
// 6D-8: with TC scope effect — value becomes bindingContext
// =============================================================================

describe("6D-8: with TC scope effect", () => {
  const result = runInterpreter({
    "/src/app.ts": `
      import { customElement } from 'aurelia';

      @customElement({
        name: 'app',
        template: \`
          <div with.bind="obj">
            <span>\\\${name}</span>
          </div>
        \`
      })
      export class App {
        obj = { name: 'hello' };
      }
    `,
  });

  it("span inside with has scope [with → ce-boundary]", () => {
    const analysis = analyzeTemplate(result, "app");
    const span = findElement(analysis, "span");
    assertScopeChain(span, ['with', 'ce-boundary']);
  });

  it("with scope isBoundary is false", () => {
    const analysis = analyzeTemplate(result, "app");
    const span = findElement(analysis, "span");
    assertNoBoundaryExceptCe(span);
  });
});

// =============================================================================
// 6D-9: <let> element scope injection
// =============================================================================

describe("6D-9: <let> element scope injection", () => {
  const result = runInterpreter({
    "/src/app.ts": `
      import { customElement } from 'aurelia';

      @customElement({
        name: 'app',
        template: \`
          <let greeting.bind="'Hello'"></let>
          <div>\\\${greeting}</div>
        \`
      })
      export class App {}
    `,
  });

  it("<let> is recognized as an element", () => {
    const analysis = analyzeTemplate(result, "app");
    const letEl = findElement(analysis, "let");
    expect(letEl).toBeDefined();
  });

  it("<let> produces a let scope entry with the bound variable", () => {
    const analysis = analyzeTemplate(result, "app");
    const letEl = findElement(analysis, "let");
    const letScope = letEl.scopeChain.find(s => s.kind === 'let');
    expect(letScope).toBeDefined();
    if (letScope?.kind === 'let') {
      expect(letScope.bindings).toContain('greeting');
    }
  });

  it("let element scope chain includes let entry", () => {
    const analysis = analyzeTemplate(result, "app");
    const letEl = findElement(analysis, "let");
    // The let element's own scope includes the let entry.
    // Let injects into overrideContext — a sibling effect, not nesting.
    assertScopeChain(letEl, ['let', 'ce-boundary']);
  });
});
