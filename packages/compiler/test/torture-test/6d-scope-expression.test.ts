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

describe("6D-4: $parent traversal — crosses CE boundary", () => {
  // The manifest fixture: inner-el's template uses both $parent.outerValue
  // (should resolve across CE boundary) and bare outerValue (should NOT
  // resolve — stops at CE boundary). This is the fundamental asymmetry.
  const result = runInterpreter({
    "/src/inner-el.ts": `
      import { customElement } from 'aurelia';

      @customElement({
        name: 'inner-el',
        template: '<div>\${$parent.outerValue}</div><div>\${outerValue}</div>'
      })
      export class InnerEl {}
    `,
    "/src/outer-el.ts": `
      import { customElement } from 'aurelia';
      import { InnerEl } from './inner-el';

      @customElement({
        name: 'outer-el',
        template: '<inner-el></inner-el>',
        dependencies: [InnerEl]
      })
      export class OuterEl {
        outerValue = 'from outer';
      }
    `,
  });

  it("inner-el's template has CE boundary for inner-el", () => {
    const innerAnalysis = analyzeTemplate(result, "inner-el");
    const div = findElement(innerAnalysis, "div");
    assertCeBoundary(div, "inner-el");
    assertScopeChain(div, ['ce-boundary']);
  });

  it("outer-el's template has CE boundary for outer-el", () => {
    const outerAnalysis = analyzeTemplate(result, "outer-el");
    const innerEl = findElement(outerAnalysis, "inner-el");
    assertCeBoundary(innerEl, "outer-el");
  });

  it("bare outerValue stops at inner-el's CE boundary (isBoundary: true)", () => {
    // inner-el's template has [ce-boundary(InnerEl)] with isBoundary: true.
    // Bare identifier resolution checks InnerEl's bindingContext → no outerValue.
    // Stops at boundary. Does NOT reach OuterEl. This is the encapsulation claim.
    const innerAnalysis = analyzeTemplate(result, "inner-el");
    const div = findElement(innerAnalysis, "div");
    const boundary = div.scopeChain.find(s => s.kind === 'ce-boundary');
    expect(boundary).toBeDefined();
    expect(boundary!.isBoundary).toBe(true);
  });

  it("$parent traversal ignores isBoundary — structural precondition", () => {
    // $parent.outerValue would hop one scope level from inner-el's CE
    // boundary to outer-el's CE boundary, ignoring isBoundary.
    // At template analysis level, we verify the structural precondition:
    // inner-el IS inside outer-el's template, and both scopes exist
    // in the correct hierarchy.
    const outerAnalysis = analyzeTemplate(result, "outer-el");
    const innerEl = findElement(outerAnalysis, "inner-el");
    // inner-el is in outer-el's template → outer-el's scope is the parent
    assertScopeChain(innerEl, ['ce-boundary']);
    assertCeBoundary(innerEl, "outer-el");
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
    // The expression entry point is IsIterator — "item of data"
    // is iterator syntax, not property access
    assertBinding(forAttr, { expressionEntry: 'IsIterator' });
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
          <let full-message.bind="greeting + ' ' + name"></let>
          <div>\\\${greeting}</div>
          <div>\\\${fullMessage}</div>
          <div>\\\${name}</div>
        \`
      })
      export class App {
        name = 'World';
      }
    `,
  });

  it("<let> is recognized as an element", () => {
    const analysis = analyzeTemplate(result, "app");
    const letEls = findElements(analysis, "let");
    expect(letEls.length).toBe(2);
  });

  it("<let> produces a let scope entry with the bound variable", () => {
    const analysis = analyzeTemplate(result, "app");
    const letEls = findElements(analysis, "let");
    const letScope = letEls[0]!.scopeChain.find(s => s.kind === 'let');
    expect(letScope).toBeDefined();
    if (letScope?.kind === 'let') {
      expect(letScope.bindings).toContain('greeting');
    }
  });

  it("hyphenated let target is camelCase-transformed: full-message → fullMessage", () => {
    const analysis = analyzeTemplate(result, "app");
    const letEls = findElements(analysis, "let");
    // The second <let> has full-message.bind — should be transformed
    // to fullMessage (HTML kebab-case → JS camelCase convention)
    const secondLet = letEls[1]!;
    const letScope = secondLet.scopeChain.find(s => s.kind === 'let');
    expect(letScope).toBeDefined();
    if (letScope?.kind === 'let') {
      expect(letScope.bindings).toContain('fullMessage');
    }
  });

  it("<let> does NOT create a child scope — downstream elements have CE scope only", () => {
    const analysis = analyzeTemplate(result, "app");
    // <let> injects into the existing scope's overrideContext.
    // It does NOT create a child scope. Downstream div elements
    // should still have just [ce-boundary] — the let entry only
    // appears on the <let> element itself (as the injection source).
    const divs = findElements(analysis, "div");
    for (const div of divs) {
      assertScopeChain(div, ['ce-boundary']);
    }
  });
});
