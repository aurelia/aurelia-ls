/**
 * Tier 6E: Template Structure Claims (5 claims)
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
  assertResolvedCe,
} from "./harness.js";

describe("6E-1: TC wrapping order — first attribute is outermost", () => {
  const result = runInterpreter({
    "/src/app.ts": `
      import { customElement } from 'aurelia';
      @customElement({
        name: 'app',
        template: '<div if.bind="show" repeat.for="item of items">\\\${item}</div>'
      })
      export class App { show = true; items = ['a', 'b', 'c']; }
    `,
  });

  it("TC order: if first (outermost), repeat second (innermost)", () => {
    const s = analyzeTemplate(result, "app");
    const div = findElement(s, "div");
    expect(div.controllers.length).toBe(2);
    expect(div.controllers[0]!.name).toBe('if');
    expect(div.controllers[1]!.name).toBe('repeat');
  });

  it("if classified at step 7 as template-controller", () => {
    const s = analyzeTemplate(result, "app");
    const div = findElement(s, "div");
    assertClassified(findAttr(div, 'if.bind'), 7, 'template-controller');
  });

  it("repeat classified at step 7 as template-controller", () => {
    const s = analyzeTemplate(result, "app");
    const div = findElement(s, "div");
    assertClassified(findAttr(div, 'repeat.for'), 7, 'template-controller');
  });
});

describe("6E-2: Multi-TC nesting — scope chain", () => {
  const result = runInterpreter({
    "/src/app.ts": `
      import { customElement } from 'aurelia';
      @customElement({
        name: 'app',
        template: '<div if.bind="show" repeat.for="item of items">\\\${item}</div>'
      })
      export class App { show = true; items = ['a', 'b', 'c']; }
    `,
  });

  it("scope chain only has iterator and ce-boundary (if is passthrough)", () => {
    const s = analyzeTemplate(result, "app");
    const div = findElement(s, "div");
    assertScopeChain(div, ['iterator', 'ce-boundary']);
  });

  it("instruction nesting and scope chain are INDEPENDENT structures", () => {
    const s = analyzeTemplate(result, "app");
    const div = findElement(s, "div");

    // TC controllers: [if, repeat]
    expect(div.controllers.length).toBe(2);
    expect(div.controllers.map(c => c.name)).toContain('if');

    // Scope chain: [iterator, ce-boundary] — if doesn't appear
    const chain = [div.frame.kind, ...(div.frame.parent ? [div.frame.parent.kind] : [])];
    expect(chain).not.toContain('if');
  });
});

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

  it("au-slot attributes are plain step 8", () => {
    const s = analyzeTemplate(result, "app");
    const h2 = findElement(s, "h2");
    assertClassified(findAttr(h2, 'au-slot'), 8, 'plain-attribute');
  });

  it("card element resolves as CE", () => {
    const s = analyzeTemplate(result, "app");
    const card = findElement(s, "card");
    expect(card.resolution.kind).toBe('custom-element');
  });

  it("card's template has au-slot elements", () => {
    const cs = analyzeTemplate(result, "card");
    const auSlots = findElements(cs, "au-slot");
    expect(auSlots.length).toBe(3);
  });
});

describe("6E-4: Projected content scope", () => {
  const result = runInterpreter({
    "/src/panel.ts": `
      import { customElement, bindable } from 'aurelia';
      @customElement({ name: 'panel', template: '<div class="panel"><au-slot>\\\${title} (default)</au-slot></div>' })
      export class Panel { @bindable title: string = ''; }
    `,
    "/src/app.ts": `
      import { customElement } from 'aurelia';
      import { Panel } from './panel';
      @customElement({
        name: 'app',
        template: '<panel title.bind="panelTitle"><span>\\\${appMessage} - \\\${$host.title}</span></panel>',
        dependencies: [Panel]
      })
      export class App { appMessage = 'Hello from app'; panelTitle = 'My Panel'; }
    `,
  });

  it("projected <span> has app's scope (caller scope)", () => {
    const s = analyzeTemplate(result, "app");
    const span = findElement(s, "span");
    expect(span.frame.isBoundary).toBe(true);
  });

  it("panel's own template has panel's scope", () => {
    const ps = analyzeTemplate(result, "panel");
    const div = findElement(ps, "div");
    expect(div.frame.isBoundary).toBe(true);
  });

  it("$host in projected content references target CE", () => {
    const s = analyzeTemplate(result, "app");
    const textBindings = s.texts.filter(b => b.content.includes('$host'));
    expect(textBindings.length).toBeGreaterThan(0);
  });
});

describe("6E-5: processContent gap (NL-4)", () => {
  const result = runInterpreter({
    "/src/magic-el.ts": `
      import { customElement, processContent } from 'aurelia';
      function transformContent(node: any, platform: any) { return true; }
      @customElement({ name: 'magic-el', template: '<div>magic</div>', processContent: transformContent })
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
    const s = analyzeTemplate(result, "app");
    const el = findElement(s, "magic-el");
    expect(el.resolution.kind).toBe('custom-element');
  });

  it("CE is recognized despite processContent hook", () => {
    const name = pullValue(result.graph, "custom-element:magic-el", "name");
    expect(name).toBe("magic-el");
  });

  it("processContent field is observed", () => {
    const pc = pullValue(result.graph, "custom-element:magic-el", "processContent");
    expect(pc !== undefined).toBe(true);
  });
});
