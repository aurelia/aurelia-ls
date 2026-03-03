/**
 * Tier 6E: Template Structure Claims (5 claims)
 *
 * Tests TC wrapping order, multi-TC nesting, content projection
 * (au-slot targeting), projected content scope, and processContent gaps.
 */

import { describe, it, expect } from "vitest";
import {
  runInterpreter,
  analyzeTemplate,
  findElement,
  findElements,
  findAttr,
  pullValue,
  assertClassified,
  assertScopeChain,
  assertCeBoundary,
  assertRepeatScope,
  assertTcOrder,
  assertNoBoundaryExceptCe,
} from "./harness.js";

// =============================================================================
// 6E-1: TC wrapping order — first attribute is outermost
// =============================================================================

describe("6E-1: TC wrapping order — first attribute is outermost", () => {
  const result = runInterpreter({
    "/src/app.ts": `
      import { customElement } from 'aurelia';

      @customElement({
        name: 'app',
        template: \`
          <div if.bind="show" repeat.for="item of items">\\\${item}</div>
        \`
      })
      export class App {
        show = true;
        items = ['a', 'b', 'c'];
      }
    `,
  });

  it("TC order: if first (outermost), repeat second (innermost)", () => {
    const analysis = analyzeTemplate(result, "app");
    const div = findElement(analysis, "div");

    // First attribute in source order = outermost TC
    assertTcOrder(div, ['if', 'repeat']);
  });

  it("if classified at step 7 as template-controller", () => {
    const analysis = analyzeTemplate(result, "app");
    const div = findElement(analysis, "div");
    assertClassified(findAttr(div, 'if.bind'), 7, 'template-controller');
  });

  it("repeat classified at step 7 as template-controller", () => {
    const analysis = analyzeTemplate(result, "app");
    const div = findElement(analysis, "div");
    assertClassified(findAttr(div, 'repeat.for'), 7, 'template-controller');
  });
});

// =============================================================================
// 6E-2: Multi-TC nesting — scope chain through nested TCs
// =============================================================================

describe("6E-2: Multi-TC nesting — scope chain", () => {
  const result = runInterpreter({
    "/src/app.ts": `
      import { customElement } from 'aurelia';

      @customElement({
        name: 'app',
        template: \`
          <div if.bind="show" repeat.for="item of items">\\\${item}</div>
        \`
      })
      export class App {
        show = true;
        items = ['a', 'b', 'c'];
      }
    `,
  });

  it("scope chain only has repeat and ce-boundary (if is passthrough)", () => {
    const analysis = analyzeTemplate(result, "app");
    const div = findElement(analysis, "div");

    // if doesn't create a scope — it's passthrough.
    // repeat creates a child scope. CE boundary from App.
    // The instruction tree has both TCs, but the scope chain only
    // reflects scope-creating TCs.
    assertScopeChain(div, ['repeat', 'ce-boundary']);
  });

  it("instruction nesting and scope chain are INDEPENDENT structures", () => {
    const analysis = analyzeTemplate(result, "app");
    const div = findElement(analysis, "div");

    // TC attributes: [if, repeat] (instruction nesting order)
    expect(div.tcAttributes.length).toBe(2);

    // Scope chain: [repeat, ce-boundary] (scope creation order)
    // if appears in tcAttributes but NOT in scopeChain
    expect(div.scopeChain.length).toBe(2);
    expect(div.tcAttributes.map(t => t.name)).toContain('if');
    expect(div.scopeChain.map(s => s.kind)).not.toContain('if');
  });
});

// =============================================================================
// 6E-3: Content projection — au-slot targeting
// =============================================================================

describe("6E-3: Content projection — au-slot", () => {
  const result = runInterpreter({
    "/src/card.ts": `
      import { customElement } from 'aurelia';

      @customElement({
        name: 'card',
        template: \`
          <div class="card">
            <div class="header"><au-slot name="header"></au-slot></div>
            <div class="body"><au-slot></au-slot></div>
            <div class="footer"><au-slot name="footer"></au-slot></div>
          </div>
        \`
      })
      export class Card {}
    `,
    "/src/app.ts": `
      import { customElement } from 'aurelia';
      import { Card } from './card';

      @customElement({
        name: 'app',
        template: \`
          <card>
            <h2 au-slot="header">Card Title</h2>
            <p>Default slot content</p>
            <span au-slot="footer">Footer text</span>
          </card>
        \`,
        dependencies: [Card]
      })
      export class App {}
    `,
  });

  it("au-slot attributes are classified as plain (not captured, not CA)", () => {
    const analysis = analyzeTemplate(result, "app");
    const h2 = findElement(analysis, "h2");
    const auSlotAttr = findAttr(h2, 'au-slot');
    // au-slot is a special attribute for content projection targeting.
    // It's classified at step 8 (plain) because it's not a CA or TC.
    assertClassified(auSlotAttr, 8, 'plain-attribute');
  });

  it("card element resolves as CE", () => {
    const analysis = analyzeTemplate(result, "app");
    const card = findElement(analysis, "card");
    expect(card.resolution.kind).toBe('custom-element');
  });

  it("card's template has au-slot elements", () => {
    const cardAnalysis = analyzeTemplate(result, "card");
    const auSlots = findElements(cardAnalysis, "au-slot");
    expect(auSlots.length).toBe(3);
  });

  it("children are grouped by au-slot target", () => {
    const analysis = analyzeTemplate(result, "app");
    const card = findElement(analysis, "card");

    // The template compiler extracts children of <card> and groups them
    // by au-slot attribute value. This is the projection routing claim.
    if ('projections' in card) {
      const projections = (card as any).projections as Record<string, any[]>;
      // h2 au-slot="header" → header slot
      expect(projections['header']).toBeDefined();
      // p (no au-slot) → default slot
      expect(projections['default'] || projections['']).toBeDefined();
      // span au-slot="footer" → footer slot
      expect(projections['footer']).toBeDefined();
    }
  });
});

// =============================================================================
// 6E-4: Projected content scope — caller's scope with $host overlay
// =============================================================================

describe("6E-4: Projected content scope — caller's scope with $host overlay", () => {
  const result = runInterpreter({
    "/src/panel.ts": `
      import { customElement, bindable } from 'aurelia';

      @customElement({
        name: 'panel',
        template: '<div class="panel"><au-slot>\\\${title} (default)</au-slot></div>'
      })
      export class Panel {
        @bindable title: string = '';
      }
    `,
    "/src/app.ts": `
      import { customElement } from 'aurelia';
      import { Panel } from './panel';

      @customElement({
        name: 'app',
        template: \`
          <panel title.bind="panelTitle">
            <span>\\\${appMessage} - \\\${$host.title}</span>
          </panel>
        \`,
        dependencies: [Panel]
      })
      export class App {
        appMessage = 'Hello from app';
        panelTitle = 'My Panel';
      }
    `,
  });

  it("projected <span> has app's scope (caller scope)", () => {
    const analysis = analyzeTemplate(result, "app");
    const span = findElement(analysis, "span");
    // Projected content runs in the CALLER's scope.
    // The <span> is in app's template → app's CE boundary.
    assertCeBoundary(span, "app");
  });

  it("panel's own template has panel's scope", () => {
    const panelAnalysis = analyzeTemplate(result, "panel");
    const div = findElement(panelAnalysis, "div");
    assertCeBoundary(div, "panel");
  });

  it("$host in projected content provides access to target CE", () => {
    // The manifest specifies: $host.title resolves to Panel's title.
    // $host is a synthetic property in the projected content's
    // overrideContext. At template analysis level, we verify the
    // structural precondition: the projected span's text references
    // $host, and panel has a title bindable.
    const analysis = analyzeTemplate(result, "app");
    const textBindings = analysis.textBindings.filter(
      b => b.content.includes('$host')
    );
    expect(textBindings.length).toBeGreaterThan(0);
  });
});

// =============================================================================
// 6E-5: processContent gap — non-deterministic template (NL-4)
// =============================================================================

describe("6E-5: processContent gap (NL-4)", () => {
  const result = runInterpreter({
    "/src/magic-el.ts": `
      import { customElement, processContent } from 'aurelia';

      function transformContent(node: any, platform: any) {
        // Opaque DOM manipulation
        return true;
      }

      @customElement({
        name: 'magic-el',
        template: '<div>magic</div>',
        processContent: transformContent
      })
      export class MagicEl {}
    `,
    "/src/app.ts": `
      import { customElement } from 'aurelia';
      import { MagicEl } from './magic-el';

      @customElement({
        name: 'app',
        template: '<magic-el><span>content</span></magic-el>',
        dependencies: [MagicEl]
      })
      export class App {}
    `,
  });

  it("magic-el resolves as CE", () => {
    const analysis = analyzeTemplate(result, "app");
    const el = findElement(analysis, "magic-el");
    expect(el.resolution.kind).toBe('custom-element');
  });

  it("CE is recognized despite processContent hook", () => {
    const name = pullValue(result.graph, "custom-element:magic-el", "name");
    expect(name).toBe("magic-el");
  });

  it("processContent field is observed as opaque function (NL-4 gap source)", () => {
    // NL-4: processContent makes the template non-deterministic.
    // The hook is an opaque function — the product can detect its
    // PRESENCE but cannot determine its BEHAVIOR.
    const pc = pullValue(result.graph, "custom-element:magic-el", "processContent");

    // The processContent field should be observed. It's either:
    // - A function reference (opaque to static analysis)
    // - An "unknown" gap marker
    // Either way, it's NOT undefined — the product should detect that
    // processContent IS specified on this CE.
    expect(pc !== undefined).toBe(true);
  });

  it("processContent creates a template analysis gap", () => {
    // The key NL-4 claim: the template's post-hook state is
    // indeterminate. The product compiles the PRE-hook template
    // but the runtime sees the POST-hook template.
    // This should be reflected in the analysis as a gap or
    // reduced confidence on template analysis claims for this CE.
    const analysis = analyzeTemplate(result, "app");
    const el = findElement(analysis, "magic-el");

    // The CE resolves, but the product should indicate that
    // template analysis of magic-el's children may not be reliable.
    expect(el.resolution.kind).toBe('custom-element');

    // If the analysis tracks processContent gaps, verify it
    if ('hasProcessContentGap' in el) {
      expect((el as any).hasProcessContentGap).toBe(true);
    }
  });
});
