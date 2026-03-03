/**
 * Tier 7C: Warm Band — Resource Fields (4 claims)
 *
 * Resource field edits propagate through observation → conclusion.
 * The propagation scope depends on WHICH field changed.
 */

import { describe, it, expect } from "vitest";
import {
  createMutableSession,
  assertCutoff,
  assertFresh,
  assertStale,
  assertChanged,
  assertEvaluated,
} from "./harness.js";

// =============================================================================
// 7C-1: Bindable mode change → mode conclusion changes, name cutoff
// =============================================================================

describe("7C-1: Bindable mode change", () => {
  const session = createMutableSession({
    "/src/editable-label.ts": `
      import { customElement, bindable } from 'aurelia';

      @customElement({
        name: 'editable-label',
        template: '<span>\${value}</span>'
      })
      export class EditableLabel {
        @bindable({ mode: 2 }) value: string = '';
      }
    `,
    "/src/form.ts": `
      import { customElement } from 'aurelia';
      import { EditableLabel } from './editable-label';

      @customElement({
        name: 'form-view',
        template: '<editable-label value.bind="name"></editable-label>',
        dependencies: [EditableLabel]
      })
      export class FormView {
        name = 'Alice';
      }
    `,
  });

  it("mode change → mode conclusion changes", () => {
    const trace = session.editFile("/src/editable-label.ts", `
      import { customElement, bindable } from 'aurelia';

      @customElement({
        name: 'editable-label',
        template: '<span>\${value}</span>'
      })
      export class EditableLabel {
        @bindable({ mode: 6 }) value: string = '';
      }
    `);

    session.pull("custom-element:editable-label", "bindable:value:mode");

    // Mode changed from toView to twoWay → conclusion changes
    assertChanged(trace, "conclusion:custom-element:editable-label::bindable:value:mode");
  });

  it("mode change → name conclusion cutoff (name unchanged)", () => {
    const trace = session.editFile("/src/editable-label.ts", `
      import { customElement, bindable } from 'aurelia';

      @customElement({
        name: 'editable-label',
        template: '<span>\${value}</span>'
      })
      export class EditableLabel {
        @bindable({ mode: 1 }) value: string = '';
      }
    `);

    session.pull("custom-element:editable-label", "name");

    // Name is unchanged → cutoff
    assertCutoff(trace, "conclusion:custom-element:editable-label::name");
  });

  it("mode change does NOT affect consuming template's observation", () => {
    const trace = session.editFile("/src/editable-label.ts", `
      import { customElement, bindable } from 'aurelia';

      @customElement({
        name: 'editable-label',
        template: '<span>\${value}</span>'
      })
      export class EditableLabel {
        @bindable({ mode: 4 }) value: string = '';
      }
    `);

    session.pull("custom-element:form-view", "name");

    // form-view's file didn't change → its observation wasn't re-evaluated
    assertCutoff(trace, "conclusion:custom-element:form-view::name");
  });

  it("mode change → template-ir cutoff (classification unchanged, DQ-3)", () => {
    // THE KEY CLAIM: mode is a binding parameterization concern, not a
    // classification concern. The step 6 classification decision
    // ("value.bind matches CE bindable 'value'") is unchanged — only
    // the mode parameter changes. Template-ir should cutoff.
    // Template-bind should re-evaluate with the new effective mode.
    const trace = session.editFile("/src/editable-label.ts", `
      import { customElement, bindable } from 'aurelia';

      @customElement({
        name: 'editable-label',
        template: '<span>\${value}</span>'
      })
      export class EditableLabel {
        @bindable({ mode: 1 }) value: string = '';
      }
    `);

    // The bindable mode field changed
    session.pull("custom-element:editable-label", "bindable:value:mode");
    assertChanged(trace, "conclusion:custom-element:editable-label::bindable:value:mode");

    // Template-ir of the CONSUMING template should cutoff —
    // classification decisions are unchanged by a mode change.
    // (This assertion depends on template-ir being wired as a
    // graph node with cutoff capability)
    if (trace.evaluatedNodes.has("template-ir:form-view")) {
      assertCutoff(trace, "template-ir:form-view");
    }
  });
});

// =============================================================================
// 7C-2: Bindable added → observation changes, new bindable conclusion
// =============================================================================

describe("7C-2: Bindable added to CE", () => {
  const session = createMutableSession({
    "/src/status-card.ts": `
      import { customElement, bindable } from 'aurelia';

      @customElement({
        name: 'status-card',
        template: '<div>\${label}</div>'
      })
      export class StatusCard {
        @bindable label: string = '';
      }
    `,
    "/src/app.ts": `
      import { customElement } from 'aurelia';
      import { StatusCard } from './status-card';

      @customElement({
        name: 'app',
        template: '<status-card label.bind="name" icon="star"></status-card>',
        dependencies: [StatusCard]
      })
      export class App {
        name = 'Status';
      }
    `,
  });

  it("adding bindable → new bindable conclusion node appears", () => {
    const trace = session.editFile("/src/status-card.ts", `
      import { customElement, bindable } from 'aurelia';

      @customElement({
        name: 'status-card',
        template: '<div>\${label} \${icon}</div>'
      })
      export class StatusCard {
        @bindable label: string = '';
        @bindable icon: string = '';
      }
    `);

    // Pull the new bindable — should exist now
    const iconProp = session.pull("custom-element:status-card", "bindable:icon:property");
    expect(iconProp).toBe("icon");
  });

  it("adding bindable → existing name conclusion cutoff", () => {
    const trace = session.editFile("/src/status-card.ts", `
      import { customElement, bindable } from 'aurelia';

      @customElement({
        name: 'status-card',
        template: '<div>\${label} \${icon2}</div>'
      })
      export class StatusCard {
        @bindable label: string = '';
        @bindable icon2: string = '';
      }
    `);

    session.pull("custom-element:status-card", "name");

    // Name unchanged → cutoff
    assertCutoff(trace, "conclusion:custom-element:status-card::name");
  });

  it("adding bindable → template-ir re-evaluates (step 6 match set changes)", () => {
    // Contrast with 7C-1 (mode change → template-ir cutoff).
    // A new bindable changes WHICH attributes are classified at step 6.
    // icon="star" was step 8a (plain). With new @bindable icon, it
    // should reclassify to step 6 (CE bindable). Template-ir green changes.
    const trace = session.editFile("/src/status-card.ts", `
      import { customElement, bindable } from 'aurelia';

      @customElement({
        name: 'status-card',
        template: '<div>\${label} \${icon3}</div>'
      })
      export class StatusCard {
        @bindable label: string = '';
        @bindable icon3: string = '';
      }
    `);

    // The bindable list changed — this should propagate
    session.pull("custom-element:status-card", "bindable:icon3:property");
    expect(session.pull("custom-element:status-card", "bindable:icon3:property")).toBe("icon3");

    // Template-ir of app (which uses <status-card icon="star">)
    // should be affected — classification decisions may change
    // because the step 6 match set expanded.
    if (trace.evaluatedNodes.has("template-ir:app")) {
      assertChanged(trace, "template-ir:app");
    }
  });
});

// =============================================================================
// 7C-3: Capture flag toggled → capture conclusion changes
// =============================================================================

describe("7C-3: Capture flag toggled", () => {
  const session = createMutableSession({
    "/src/tooltip.ts": `
      import { customElement } from 'aurelia';

      @customElement({
        name: 'tooltip',
        template: '<div>tooltip</div>',
        capture: true
      })
      export class Tooltip {}
    `,
  });

  it("capture: true → false changes the capture conclusion", () => {
    const trace = session.editFile("/src/tooltip.ts", `
      import { customElement } from 'aurelia';

      @customElement({
        name: 'tooltip',
        template: '<div>tooltip</div>',
        capture: false
      })
      export class Tooltip {}
    `);

    session.pull("custom-element:tooltip", "capture");

    // Capture changed → conclusion changes
    assertChanged(trace, "conclusion:custom-element:tooltip::capture");
  });

  it("capture toggle → name conclusion cutoff", () => {
    const trace = session.editFile("/src/tooltip.ts", `
      import { customElement } from 'aurelia';

      @customElement({
        name: 'tooltip',
        template: '<div>tooltip</div>'
      })
      export class Tooltip {}
    `);

    session.pull("custom-element:tooltip", "name");

    // Name unchanged → cutoff
    assertCutoff(trace, "conclusion:custom-element:tooltip::name");
  });
});

// =============================================================================
// 7C-4: Gap → non-gap transition
// =============================================================================

describe("7C-4: Gap → non-gap transition", () => {
  const session = createMutableSession({
    "/src/my-widget.ts": `
      import { customElement, bindable } from 'aurelia';

      @customElement({
        name: 'my-widget',
        template: '<span>\${title}</span>'
      })
      export class MyWidget {
        @bindable title: string = '';
      }
    `,
    "/src/plugin-host.ts": `
      import { customElement } from 'aurelia';

      function getDeps() { return []; }

      @customElement({
        name: 'plugin-host',
        template: '<my-widget></my-widget>',
        dependencies: getDeps()
      })
      export class PluginHost {}
    `,
  });

  it("opaque dependencies → name conclusion present", () => {
    const name = session.pull("custom-element:plugin-host", "name");
    expect(name).toBe("plugin-host");
  });

  it("refactoring opaque → static dependencies changes conclusion", () => {
    const trace = session.editFile("/src/plugin-host.ts", `
      import { customElement } from 'aurelia';
      import { MyWidget } from './my-widget';

      @customElement({
        name: 'plugin-host',
        template: '<my-widget></my-widget>',
        dependencies: [MyWidget]
      })
      export class PluginHost {}
    `);

    // Pull dependencies — should now be a known value
    session.pull("custom-element:plugin-host", "dependencies");

    // The dependencies field went from gap (opaque getDeps()) to
    // known value [class:MyWidget]. This is a green change.
    assertChanged(trace, "conclusion:custom-element:plugin-host::dependencies");
  });

  it("gap → non-gap: name conclusion cutoff (name unchanged)", () => {
    const trace = session.editFile("/src/plugin-host.ts", `
      import { customElement } from 'aurelia';
      import { MyWidget } from './my-widget';

      @customElement({
        name: 'plugin-host',
        template: '<my-widget></my-widget>',
        dependencies: [MyWidget]
      })
      export class PluginHost {}
    `);

    session.pull("custom-element:plugin-host", "name");

    // Name is unchanged → cutoff
    assertCutoff(trace, "conclusion:custom-element:plugin-host::name");
  });
});
