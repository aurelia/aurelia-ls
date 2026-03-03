/**
 * Tier 7E: Frozen Band — Syntax Extension (1 claim)
 *
 * Vocabulary changes are the rarest but have the widest blast radius.
 * When the frozen tier changes, ALL template-ir nodes are potentially
 * affected. But cutoff holds for templates that don't use the new syntax.
 *
 * At the current architecture level, vocabulary is a standalone
 * evaluation (not a graph node). This test verifies that vocabulary
 * changes are detectable and that resource-level conclusions are
 * unaffected by vocabulary changes.
 */

import { describe, it, expect } from "vitest";
import {
  createMutableSession,
  assertCutoff,
  assertChanged,
  assertFresh,
  evaluateProjectVocabulary,
  assertInVocabulary,
} from "./harness.js";

// =============================================================================
// 7E-1: New BC registered → vocabulary changes, resource nodes unaffected
// =============================================================================

describe("7E-1: New BC registered via plugin", () => {
  const session = createMutableSession({
    "/src/main.ts": `
      import Aurelia from 'aurelia';
      import { App } from './app';

      new Aurelia().app(App).start();
    `,
    "/src/widget.ts": `
      import { customElement, bindable } from 'aurelia';

      @customElement({
        name: 'widget',
        template: '<input value.bind="value">'
      })
      export class Widget {
        @bindable value: string = '';
      }
    `,
    "/src/app.ts": `
      import { customElement } from 'aurelia';
      import { Widget } from './widget';

      @customElement({
        name: 'app',
        template: '<widget value.bind="data"></widget>',
        dependencies: [Widget]
      })
      export class App {
        data = 'hello';
      }
    `,
  });

  it("initial vocabulary has standard BCs only", () => {
    const vocab = evaluateProjectVocabulary(session.result);
    assertInVocabulary(vocab, "bind");
    assertInVocabulary(vocab, "trigger");
    expect(vocab.green.commands.has("state")).toBe(false);
  });

  it("registering state plugin adds state/dispatch BCs to vocabulary", () => {
    session.editFile("/src/main.ts", `
      import Aurelia from 'aurelia';
      import { StateDefaultConfiguration } from '@aurelia/state';
      import { App } from './app';

      Aurelia.register(StateDefaultConfiguration.init({}, () => {})).app(App).start();
    `);

    // Pull root registrations to trigger re-evaluation
    session.pull("root-registrations", "registrations");

    // Re-evaluate vocabulary with new root registrations
    const vocab = evaluateProjectVocabulary(session.result);
    assertInVocabulary(vocab, "state");
    assertInVocabulary(vocab, "dispatch");
  });

  it("vocabulary change does NOT affect widget's resource conclusions", () => {
    const trace = session.editFile("/src/main.ts", `
      import Aurelia from 'aurelia';
      import { StateDefaultConfiguration } from '@aurelia/state';
      import { App } from './app';

      Aurelia.register(StateDefaultConfiguration.init({}, () => {})).app(App).start();
    `);

    session.pull("custom-element:widget", "name");

    // widget.ts wasn't edited and has no dependency on main.ts →
    // its conclusion was never on the staleness path
    assertFresh(trace, "conclusion:custom-element:widget::name");
  });
});
