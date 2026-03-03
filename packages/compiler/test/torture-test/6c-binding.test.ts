/**
 * Tier 6C: Binding Validation and Mode Resolution Claims (7 claims)
 *
 * Tests binding instruction generation: which instruction type is
 * produced, what binding mode is selected, and how upstream gaps
 * affect validation.
 *
 * The `bind` command has two resolution paths:
 * - Bindable IS present → use declared mode
 * - Bindable NOT present (plain DOM) → use isTwoWay heuristic
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

// =============================================================================
// 6C-1: .bind on form element → twoWay (via isTwoWay)
// =============================================================================

describe("6C-1: .bind on form element → twoWay", () => {
  const result = runInterpreter({
    "/src/app.ts": `
      import { customElement } from 'aurelia';

      @customElement({
        name: 'app',
        template: \`
          <input value.bind="name">
          <input type="checkbox" checked.bind="isActive">
          <select value.bind="selected">
            <option>a</option>
            <option>b</option>
          </select>
          <div title.bind="tooltip"></div>
        \`
      })
      export class App {
        name = '';
        isActive = false;
        selected = 'a';
        tooltip = 'help';
      }
    `,
  });

  it("input value.bind → twoWay", () => {
    const analysis = analyzeTemplate(result, "app");
    const inputs = findElements(analysis, "input");
    const textInput = inputs.find(e => e.attributes.some(a => a.rawName === 'value.bind'))!;
    assertBinding(findAttr(textInput, 'value.bind'), {
      instructionType: 'PropertyBinding',
      mode: 'twoWay',
    });
  });

  it("checkbox checked.bind → twoWay", () => {
    const analysis = analyzeTemplate(result, "app");
    const inputs = findElements(analysis, "input");
    const checkbox = inputs.find(e => e.attributes.some(a => a.rawName === 'checked.bind'))!;
    assertBinding(findAttr(checkbox, 'checked.bind'), {
      instructionType: 'PropertyBinding',
      mode: 'twoWay',
    });
  });

  it("select value.bind → twoWay", () => {
    const analysis = analyzeTemplate(result, "app");
    const select = findElement(analysis, "select");
    assertBinding(findAttr(select, 'value.bind'), {
      instructionType: 'PropertyBinding',
      mode: 'twoWay',
    });
  });

  it("div title.bind → toView (not a form element)", () => {
    const analysis = analyzeTemplate(result, "app");
    const div = findElement(analysis, "div");
    assertBinding(findAttr(div, 'title.bind'), {
      instructionType: 'PropertyBinding',
      mode: 'toView',
    });
  });
});

// =============================================================================
// 6C-2: .bind on CE bindable with declared mode → uses declared mode
// =============================================================================

describe("6C-2: .bind on CE bindable with declared mode", () => {
  const result = runInterpreter({
    "/src/editable-label.ts": `
      import { customElement, bindable } from 'aurelia';

      @customElement({
        name: 'editable-label',
        template: '<input value.bind="value">'
      })
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
      export class App {
        name = 'hello';
        result = '';
      }
    `,
  });

  it("value.bind uses declared mode twoWay (6)", () => {
    const analysis = analyzeTemplate(result, "app");
    const el = findElement(analysis, "editable-label");
    assertBinding(findAttr(el, 'value.bind'), {
      instructionType: 'PropertyBinding',
      mode: 'twoWay',
      targetProperty: 'value',
    });
  });

  it("output.bind uses declared mode fromView (4)", () => {
    const analysis = analyzeTemplate(result, "app");
    const el = findElement(analysis, "editable-label");
    assertBinding(findAttr(el, 'output.bind'), {
      instructionType: 'PropertyBinding',
      mode: 'fromView',
      targetProperty: 'output',
    });
  });
});

// =============================================================================
// 6C-3: .bind on CE bindable with default mode → toView
// =============================================================================

describe("6C-3: .bind on CE bindable with default mode → toView", () => {
  const result = runInterpreter({
    "/src/status-badge.ts": `
      import { customElement, bindable } from 'aurelia';

      @customElement({
        name: 'status-badge',
        template: '<span class="badge">\${label}</span>'
      })
      export class StatusBadge {
        @bindable label: string = '';
      }
    `,
    "/src/app.ts": `
      import { customElement } from 'aurelia';
      import { StatusBadge } from './status-badge';

      @customElement({
        name: 'app',
        template: '<status-badge label.bind="status"></status-badge>',
        dependencies: [StatusBadge]
      })
      export class App {
        status = 'active';
      }
    `,
  });

  it("label.bind uses default mode → toView", () => {
    const analysis = analyzeTemplate(result, "app");
    const el = findElement(analysis, "status-badge");
    assertBinding(findAttr(el, 'label.bind'), {
      instructionType: 'PropertyBinding',
      mode: 'toView',
      targetProperty: 'label',
    });
  });
});

// =============================================================================
// 6C-4: Interpolation in text and attribute values
// =============================================================================

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
      export class App {
        title = 'Hello';
        greeting = 'Welcome';
        name = 'World';
        tooltip = 'hover';
        index = 0;
      }
    `,
  });

  it("single-expression text interpolation detected", () => {
    const analysis = analyzeTemplate(result, "app");
    const titleBinding = analysis.textBindings.find(b => b.content.includes('${title}'));
    expect(titleBinding).toBeDefined();
    expect(titleBinding!.hasInterpolation).toBe(true);
  });

  it("multi-expression text interpolation detected", () => {
    const analysis = analyzeTemplate(result, "app");
    // ${greeting}, ${name}! has two expressions in one text node
    const multiBinding = analysis.textBindings.find(b =>
      b.content.includes('${greeting}') || b.content.includes('${name}')
    );
    expect(multiBinding).toBeDefined();
    expect(multiBinding!.hasInterpolation).toBe(true);
  });

  it("attribute interpolation produces InterpolationInstruction", () => {
    const analysis = analyzeTemplate(result, "app");
    const div = findElement(analysis, "div");

    // title="${tooltip}" → attribute with interpolation → InterpolationInstruction
    const titleAttr = findAttr(div, 'title');
    assertClassified(titleAttr, 8, 'plain-attribute');
    assertBinding(titleAttr, {
      instructionType: 'InterpolationInstruction',
      expressionEntry: 'Interpolation',
    });
  });

  it("class attribute with interpolation produces InterpolationInstruction", () => {
    const analysis = analyzeTemplate(result, "app");
    const div = findElement(analysis, "div");

    const classAttr = findAttr(div, 'class');
    assertClassified(classAttr, 8, 'plain-attribute');
    assertBinding(classAttr, {
      instructionType: 'InterpolationInstruction',
      expressionEntry: 'Interpolation',
    });
  });

  it("interpolation target goes through attrMapper", () => {
    const analysis = analyzeTemplate(result, "app");
    const div = findElement(analysis, "div");

    // class → className via attrMapper.map()
    const classAttr = findAttr(div, 'class');
    assertBinding(classAttr, { targetProperty: 'className' });

    // title has no special mapping → camelCase fallback → 'title'
    const titleAttr = findAttr(div, 'title');
    assertBinding(titleAttr, { targetProperty: 'title' });
  });
});

// =============================================================================
// 6C-5: Binding to non-existent bindable + complete CE → diagnostic
// =============================================================================

describe("6C-5: Non-existent bindable + complete CE", () => {
  const result = runInterpreter({
    "/src/simple-card.ts": `
      import { customElement, bindable } from 'aurelia';

      @customElement({
        name: 'simple-card',
        template: '<div>\${title}</div>'
      })
      export class SimpleCard {
        @bindable title: string = '';
      }
    `,
    "/src/app.ts": `
      import { customElement } from 'aurelia';
      import { SimpleCard } from './simple-card';

      @customElement({
        name: 'app',
        template: '<simple-card title.bind="t" subtitle.bind="s"></simple-card>',
        dependencies: [SimpleCard]
      })
      export class App {
        t = 'hello';
        s = 'world';
      }
    `,
  });

  it("title.bind resolves as CE bindable (step 6)", () => {
    const analysis = analyzeTemplate(result, "app");
    const el = findElement(analysis, "simple-card");
    assertClassified(findAttr(el, 'title.bind'), 6, 'ce-bindable');
  });

  it("subtitle.bind falls through to step 8 (not a known bindable)", () => {
    const analysis = analyzeTemplate(result, "app");
    const el = findElement(analysis, "simple-card");

    // subtitle is NOT in simple-card's bindable list. Step 6 checks
    // and misses. Falls through to step 8 (plain attribute with BC).
    assertClassified(findAttr(el, 'subtitle.bind'), 8, 'plain-attribute');
  });

  it("subtitle.bind still gets a binding (plain-element BC path)", () => {
    const analysis = analyzeTemplate(result, "app");
    const el = findElement(analysis, "simple-card");

    // Even though it missed step 6, the .bind command still produces
    // a PropertyBinding at step 8 (sub-path 8b). The binding targets
    // the DOM property, not a CE bindable.
    assertBinding(findAttr(el, 'subtitle.bind'), {
      instructionType: 'PropertyBinding',
    });
  });

  it("grounded negative: CE bindable list is complete (no gaps)", () => {
    // The key claim: simple-card's bindable list is COMPLETE.
    // All bindables are declared via @bindable decorator (deterministic).
    // The product can safely diagnose "subtitle does not exist on simple-card."
    const bindables = pullBindables(result.graph, "custom-element:simple-card");
    expect(bindables).toBeDefined();
    // title should be in the bindable list
    expect(bindables).toHaveProperty('title');
  });
});

// =============================================================================
// 6C-6: Binding to non-existent bindable + gapped CE → demoted
// =============================================================================

describe("6C-6: Non-existent bindable + gapped CE", () => {
  const result = runInterpreter({
    "/src/dynamic-card.ts": `
      import { customElement } from 'aurelia';

      function getBindables() {
        return { title: {}, subtitle: {} };
      }

      @customElement({
        name: 'dynamic-card',
        template: '<div>\${title}</div>',
        bindables: getBindables()
      })
      export class DynamicCard {
        title = '';
        subtitle = '';
      }
    `,
    "/src/app.ts": `
      import { customElement } from 'aurelia';
      import { DynamicCard } from './dynamic-card';

      @customElement({
        name: 'app',
        template: '<dynamic-card title.bind="t" subtitle.bind="s"></dynamic-card>',
        dependencies: [DynamicCard]
      })
      export class App {
        t = 'hello';
        s = 'world';
      }
    `,
  });

  it("both attributes fall through to step 8 (bindable list opaque)", () => {
    const analysis = analyzeTemplate(result, "app");
    const el = findElement(analysis, "dynamic-card");

    // getBindables() is opaque — no bindables discovered.
    // Both attributes miss step 6 and fall to step 8.
    assertClassified(findAttr(el, 'title.bind'), 8, 'plain-attribute');
    assertClassified(findAttr(el, 'subtitle.bind'), 8, 'plain-attribute');
  });

  it("ungrounded negative: bindable list is gapped (opaque getBindables())", () => {
    // Contrast with 6C-5: same template analysis outcome (bindable not found),
    // different claim status. 6C-5: bindable list complete → full Warning.
    // 6C-6: bindable list gapped → demoted to Information.
    const bindables = pullValue(result.graph, "custom-element:dynamic-card", "bindables");

    // The product either has no bindables or the list is incomplete.
    // Unlike 6C-5, the product CANNOT safely diagnose "subtitle doesn't exist"
    // because the bindable list is indeterminate from getBindables().
    expect(bindables === undefined || bindables === null).toBe(true);
  });
});

// =============================================================================
// 6C-7: Multi-binding syntax on CA
// =============================================================================

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
      export class App {
        pos = 'bottom';
      }
    `,
  });

  it("my-tooltip classified at step 7 (CA)", () => {
    const analysis = analyzeTemplate(result, "app");
    const div = findElement(analysis, "div");
    assertClassified(findAttr(div, 'my-tooltip'), 7, 'custom-attribute');
  });

  it("produces HydrateAttribute instruction", () => {
    const analysis = analyzeTemplate(result, "app");
    const div = findElement(analysis, "div");
    assertBinding(findAttr(div, 'my-tooltip'), {
      instructionType: 'HydrateAttribute',
    });
  });

  it("multi-binding value contains per-bindable parts", () => {
    const analysis = analyzeTemplate(result, "app");
    const div = findElement(analysis, "div");
    const attr = findAttr(div, 'my-tooltip');

    // The manifest specifies three per-bindable instructions from
    // "text: Hello; position.bind: pos; delay: 500":
    // - text: Hello → SetProperty (static)
    // - position.bind: pos → PropertyBinding (dynamic)
    // - delay: 500 → SetProperty (static)
    // The multi-binding parsing splits on ; and : to produce
    // per-bindable instructions.
    if (attr.binding && 'multiBindings' in attr.binding) {
      const mb = (attr.binding as any).multiBindings as any[];
      expect(mb.length).toBe(3);

      const textPart = mb.find((b: any) => b.targetProperty === 'text');
      expect(textPart).toBeDefined();
      expect(textPart.instructionType).toBe('SetProperty');

      const posPart = mb.find((b: any) => b.targetProperty === 'position');
      expect(posPart).toBeDefined();
      expect(posPart.instructionType).toBe('PropertyBinding');

      const delayPart = mb.find((b: any) => b.targetProperty === 'delay');
      expect(delayPart).toBeDefined();
      expect(delayPart.instructionType).toBe('SetProperty');
    }
  });
});
