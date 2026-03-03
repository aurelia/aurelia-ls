/**
 * Tier 7B: Hot Band — Template Content (2 claims)
 *
 * Template content changes at keystroke frequency. Edits to template
 * content should NOT affect resource-level nodes (observation,
 * conclusion, scope-visibility, vocabulary).
 */

import { describe, it, expect } from "vitest";
import {
  createMutableSession,
  assertCutoff,
  assertFresh,
  assertStale,
  assertChanged,
} from "./harness.js";

// =============================================================================
// 7B-1: Expression text change → resource nodes unaffected
// =============================================================================

describe("7B-1: Expression text change in inline template", () => {
  const session = createMutableSession({
    "/src/display.ts": `
      import { customElement } from 'aurelia';

      @customElement({
        name: 'display',
        template: '<p>\${message}</p>'
      })
      export class Display {
        message = 'hello';
      }
    `,
  });

  it("changing expression in template changes inlineTemplate conclusion", () => {
    const trace = session.editFile("/src/display.ts", `
      import { customElement } from 'aurelia';

      @customElement({
        name: 'display',
        template: '<p>\${greeting}</p>'
      })
      export class Display {
        greeting = 'hi';
      }
    `);

    // Pull to trigger re-evaluation
    session.pull("custom-element:display", "inlineTemplate");

    // The template changed → inlineTemplate conclusion changes
    assertChanged(trace, "conclusion:custom-element:display::inlineTemplate");
  });

  it("name and kind conclusions cutoff (resource identity unchanged)", () => {
    const trace = session.editFile("/src/display.ts", `
      import { customElement } from 'aurelia';

      @customElement({
        name: 'display',
        template: '<p>\${farewell}</p>'
      })
      export class Display {
        farewell = 'bye';
      }
    `);

    session.pull("custom-element:display", "name");
    session.pull("custom-element:display", "kind");

    // Name and kind are unchanged → cutoff
    assertCutoff(trace, "conclusion:custom-element:display::name");
    assertCutoff(trace, "conclusion:custom-element:display::kind");
  });
});

// =============================================================================
// 7B-2: Static HTML attribute edit → observation cutoff for name
// =============================================================================

describe("7B-2: Static HTML attribute edit in template", () => {
  const session = createMutableSession({
    "/src/panel.ts": `
      import { customElement, bindable } from 'aurelia';

      @customElement({
        name: 'panel',
        template: '<div class="panel-wrapper"><h3>\${header}</h3></div>'
      })
      export class Panel {
        @bindable header: string = '';
      }
    `,
  });

  it("changing class attr in template → name conclusion cutoff", () => {
    const trace = session.editFile("/src/panel.ts", `
      import { customElement, bindable } from 'aurelia';

      @customElement({
        name: 'panel',
        template: '<div class="panel-content"><h3>\${header}</h3></div>'
      })
      export class Panel {
        @bindable header: string = '';
      }
    `);

    session.pull("custom-element:panel", "name");

    // Name is unchanged → cutoff
    assertCutoff(trace, "conclusion:custom-element:panel::name");
  });

  it("bindable observation cutoff (bindable definition unchanged)", () => {
    const trace = session.editFile("/src/panel.ts", `
      import { customElement, bindable } from 'aurelia';

      @customElement({
        name: 'panel',
        template: '<div class="panel-new"><h3>\${header}</h3></div>'
      })
      export class Panel {
        @bindable header: string = '';
      }
    `);

    session.pull("custom-element:panel", "bindable:header:property");

    // Bindable definition unchanged → cutoff
    assertCutoff(trace, "conclusion:custom-element:panel::bindable:header:property");
  });
});
