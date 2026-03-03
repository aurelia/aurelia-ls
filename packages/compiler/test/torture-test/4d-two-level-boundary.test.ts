/**
 * Tier 4D: Two-Level Lookup Boundary Claims (3 entries)
 *
 * Tests the two-level lookup boundary: resources in intermediate
 * containers (between root and a template's local container) are
 * NOT visible. Container.find() checks local → root only. No
 * intermediate ancestor traversal.
 *
 * This is the most common scope implementation error. Developers
 * and agents intuitively expect hierarchical lookup ("parent has it,
 * so child should see it"). These entries specify that hierarchical
 * is wrong — two-level lookup skips intermediates.
 *
 * Authority: tier-4.md §4D, scope-resolution.md §Two-Level Lookup,
 * §Predictive Commitment, §NL-1 (user-confusion pattern).
 */

import { describe, it } from "vitest";
import {
  runInterpreter,
  evaluateVisibility,
  assertVisible,
  assertNotVisible,
  assertComplete,
} from "./harness.js";

describe("4D: Two-Level Lookup Boundary Claims", () => {
  it("#4D.1 parent's local dependency invisible in child", () => {
    const result = runInterpreter({
      "/src/main.ts": `
        import Aurelia from 'aurelia';
        import { ParentPage } from './parent-page';
        import { App } from './app';

        Aurelia.register(ParentPage).app(App).start();
      `,
      "/src/app.ts": `
        import { customElement } from 'aurelia';

        @customElement({
          name: 'app',
          template: '<parent-page></parent-page>'
        })
        export class App {}
      `,
      "/src/parent-page.ts": `
        import { customElement } from 'aurelia';
        import { SharedHelper } from './shared-helper';
        import { ChildWidget } from './child-widget';

        @customElement({
          name: 'parent-page',
          template: '<shared-helper></shared-helper><child-widget></child-widget>',
          dependencies: [SharedHelper, ChildWidget]
        })
        export class ParentPage {}
      `,
      "/src/shared-helper.ts": `
        import { customElement } from 'aurelia';

        @customElement({ name: 'shared-helper', template: '<span>helper</span>' })
        export class SharedHelper {}
      `,
      "/src/child-widget.ts": `
        import { customElement } from 'aurelia';

        @customElement({
          name: 'child-widget',
          template: '<shared-helper></shared-helper>'
        })
        export class ChildWidget {}
      `,
    });

    const vis = evaluateVisibility(result);

    // Parent sees shared-helper via local lookup
    assertVisible(vis, "shared-helper", "parent-page", "local");
    assertVisible(vis, "child-widget", "parent-page", "local");

    // Child does NOT see shared-helper — two-level lookup:
    // child-widget's local (empty) → root (no shared-helper) → miss.
    // Parent's container is NEVER checked.
    assertNotVisible(vis, "shared-helper", "child-widget");

    // Both scopes are complete (all registrations deterministic) →
    // the negative assertion is grounded (safe for diagnostics)
    assertComplete(vis, "parent-page");
    assertComplete(vis, "child-widget");
  });

  it("#4D.2 root + parent: child sees root version, not parent's local override", () => {
    const result = runInterpreter({
      "/src/main.ts": `
        import Aurelia from 'aurelia';
        import { StatusIcon } from './status-icon';
        import { ParentPanel } from './parent-panel';
        import { App } from './app';

        Aurelia.register(StatusIcon, ParentPanel).app(App).start();
      `,
      "/src/app.ts": `
        import { customElement } from 'aurelia';

        @customElement({
          name: 'app',
          template: '<parent-panel></parent-panel>'
        })
        export class App {}
      `,
      "/src/status-icon.ts": `
        import { customElement } from 'aurelia';

        @customElement({ name: 'status-icon', template: '<i>root-icon</i>' })
        export class StatusIcon {}
      `,
      "/src/parent-panel.ts": `
        import { customElement } from 'aurelia';
        import { LocalStatusIcon } from './local-status-icon';
        import { ChildDetail } from './child-detail';

        @customElement({
          name: 'parent-panel',
          template: '<status-icon></status-icon><child-detail></child-detail>',
          dependencies: [LocalStatusIcon, ChildDetail]
        })
        export class ParentPanel {}
      `,
      "/src/local-status-icon.ts": `
        import { customElement } from 'aurelia';

        @customElement({ name: 'status-icon', template: '<i>local-icon</i>' })
        export class LocalStatusIcon {}
      `,
      "/src/child-detail.ts": `
        import { customElement } from 'aurelia';

        @customElement({
          name: 'child-detail',
          template: '<status-icon></status-icon>'
        })
        export class ChildDetail {}
      `,
    });

    const vis = evaluateVisibility(result);

    // Parent sees local override (local takes precedence per 4A.6)
    assertVisible(vis, "status-icon", "parent-panel", "local");

    // Child sees ROOT version — child-detail's local is empty,
    // root has StatusIcon. Parent's local override is invisible.
    assertVisible(vis, "status-icon", "child-detail", "root");
  });

  it("#4D.3 three-level nesting — grandparent's dependency invisible to descendants", () => {
    const result = runInterpreter({
      "/src/main.ts": `
        import Aurelia from 'aurelia';
        import { GrandparentEl } from './grandparent-el';
        import { App } from './app';

        Aurelia.register(GrandparentEl).app(App).start();
      `,
      "/src/app.ts": `
        import { customElement } from 'aurelia';

        @customElement({
          name: 'app',
          template: '<grandparent-el></grandparent-el>'
        })
        export class App {}
      `,
      "/src/grandparent-el.ts": `
        import { customElement } from 'aurelia';
        import { Tooltip } from './tooltip';
        import { ParentEl } from './parent-el';

        @customElement({
          name: 'grandparent-el',
          template: '<tooltip></tooltip><parent-el></parent-el>',
          dependencies: [Tooltip, ParentEl]
        })
        export class GrandparentEl {}
      `,
      "/src/tooltip.ts": `
        import { customElement } from 'aurelia';

        @customElement({ name: 'tooltip', template: '<span>tip</span>' })
        export class Tooltip {}
      `,
      "/src/parent-el.ts": `
        import { customElement } from 'aurelia';
        import { ChildEl } from './child-el';

        @customElement({
          name: 'parent-el',
          template: '<tooltip></tooltip><child-el></child-el>',
          dependencies: [ChildEl]
        })
        export class ParentEl {}
      `,
      "/src/child-el.ts": `
        import { customElement } from 'aurelia';

        @customElement({
          name: 'child-el',
          template: '<tooltip></tooltip>'
        })
        export class ChildEl {}
      `,
    });

    const vis = evaluateVisibility(result);

    // Grandparent sees tooltip via local lookup
    assertVisible(vis, "tooltip", "grandparent-el", "local");

    // Parent does NOT see tooltip — parent-el's local has only ChildEl,
    // root has no tooltip. Grandparent's container skipped.
    assertNotVisible(vis, "tooltip", "parent-el");

    // Child does NOT see tooltip — child-el's local is empty,
    // root has no tooltip. Two-level boundary holds at every depth.
    assertNotVisible(vis, "tooltip", "child-el");

    // All scopes complete → negative assertions are grounded
    assertComplete(vis, "grandparent-el");
    assertComplete(vis, "parent-el");
    assertComplete(vis, "child-el");
  });
});
