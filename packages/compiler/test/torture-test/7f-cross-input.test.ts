/**
 * Tier 7F: Cross-Input and Convergence (3 claims)
 *
 * Tests propagation paths that don't fit the simple file-state →
 * observation → conclusion chain: independent input axes, cycle
 * re-convergence, and completeness edge semantics.
 */

import { describe, it, expect } from "vitest";
import {
  createMutableSession,
  assertCutoff,
  assertChanged,
  assertFresh,
  assertStale,
  evaluateVisibility,
  assertComplete,
  assertNotComplete,
} from "./harness.js";

// =============================================================================
// 7F-1: Type annotation change → independent staleness axis
// =============================================================================

describe("7F-1: Type annotation change → observation cutoff", () => {
  // Type annotations are NOT part of the observation green (DQ-2).
  // Changing `string` to `number` changes the file content but NOT
  // the structural fields (name, mode, attribute name are unchanged).
  const session = createMutableSession({
    "/src/user-card.ts": `
      import { customElement, bindable } from 'aurelia';

      @customElement({
        name: 'user-card',
        template: '<div>\${name}</div>'
      })
      export class UserCard {
        @bindable name: string = '';
      }
    `,
    "/src/app.ts": `
      import { customElement } from 'aurelia';
      import { UserCard } from './user-card';

      @customElement({
        name: 'app',
        template: '<user-card name.bind="userName"></user-card>',
        dependencies: [UserCard]
      })
      export class App {
        userName = 'Alice';
      }
    `,
  });

  it("type change: string → number on bindable", () => {
    const trace = session.editFile("/src/user-card.ts", `
      import { customElement, bindable } from 'aurelia';

      @customElement({
        name: 'user-card',
        template: '<div>\${name}</div>'
      })
      export class UserCard {
        @bindable name: number = 0;
      }
    `);

    // Pull structural fields — they should cutoff
    session.pull("custom-element:user-card", "name");
    session.pull("custom-element:user-card", "bindable:name:property");

    // The resource name didn't change → cutoff
    assertCutoff(trace, "conclusion:custom-element:user-card::name");

    // The bindable property name didn't change → cutoff
    assertCutoff(trace, "conclusion:custom-element:user-card::bindable:name:property");
  });

  it("type change does not affect app's conclusions", () => {
    const trace = session.editFile("/src/user-card.ts", `
      import { customElement, bindable } from 'aurelia';

      @customElement({
        name: 'user-card',
        template: '<div>\${name}</div>'
      })
      export class UserCard {
        @bindable name: boolean = false;
      }
    `);

    session.pull("custom-element:app", "name");

    // app.ts wasn't edited → cutoff
    assertCutoff(trace, "conclusion:custom-element:app::name");
  });
});

// =============================================================================
// 7F-2: Cyclic import edit → re-convergence
// =============================================================================

describe("7F-2: Cyclic import edit → re-convergence", () => {
  const session = createMutableSession({
    "/src/constants.ts": `
      import { Registry } from './registry';
      export const DEFAULT_NAME = 'widget';
      export const REGISTRY_REF = Registry;
    `,
    "/src/registry.ts": `
      import { customElement } from 'aurelia';
      import { DEFAULT_NAME } from './constants';

      @customElement({
        name: DEFAULT_NAME,
        template: '<div>Registry</div>'
      })
      export class Registry {}
    `,
  });

  it("initial evaluation resolves the constant through the cycle", () => {
    const name = session.pull("custom-element:widget", "name");
    expect(name).toBe("widget");
  });

  it("changing constant value propagates through the cycle", () => {
    const trace = session.editFile("/src/constants.ts", `
      import { Registry } from './registry';
      export const DEFAULT_NAME = 'gadget';
      export const REGISTRY_REF = Registry;
    `);

    // The CE should now be named 'gadget'. The constant DEFAULT_NAME
    // is a tier B static string literal — the interpreter must resolve
    // it through the circular import and propagate the new value to
    // registry's name field. This is the re-convergence claim.
    const name = session.pull("custom-element:gadget", "name");
    expect(name).toBe("gadget");
  });

  it("old CE name no longer resolves after constant change", () => {
    session.editFile("/src/constants.ts", `
      import { Registry } from './registry';
      export const DEFAULT_NAME = 'gadget';
      export const REGISTRY_REF = Registry;
    `);

    // The CE 'widget' should no longer exist — it was renamed to 'gadget'
    // through the constant propagation. This verifies the old identity
    // was replaced, not duplicated.
    const oldName = session.pull("custom-element:widget", "name");
    expect(oldName).toBeUndefined();
  });
});

// =============================================================================
// 7F-3: Completeness edge — scope completeness changes
// =============================================================================

describe("7F-3: Completeness edge → scope completeness changes", () => {
  const session = createMutableSession({
    "/src/main.ts": `
      import Aurelia from 'aurelia';
      import { getPlugins } from './plugin-loader';
      import { App } from './app';

      Aurelia.register(...getPlugins()).app(App).start();
    `,
    "/src/plugin-loader.ts": `
      import type { IRegistry } from 'aurelia';
      export function getPlugins(): IRegistry[] { return []; }
    `,
    "/src/known-widget.ts": `
      import { customElement } from 'aurelia';

      @customElement({
        name: 'known-widget',
        template: '<span>Known</span>'
      })
      export class KnownWidget {}
    `,
    "/src/app.ts": `
      import { customElement } from 'aurelia';
      import { KnownWidget } from './known-widget';

      @customElement({
        name: 'app',
        template: '<known-widget></known-widget><plugin-widget></plugin-widget>',
        dependencies: [KnownWidget]
      })
      export class App {}
    `,
  });

  it("initial state: app scope is incomplete (opaque getPlugins)", () => {
    const vis = evaluateVisibility(session.result);
    assertNotComplete(vis, "app");
  });

  it("adding static registration resolves the data edge", () => {
    // Create plugin-widget and register it statically
    session.editFile("/src/plugin-widget.ts", `
      import { customElement } from 'aurelia';

      @customElement({
        name: 'plugin-widget',
        template: '<div>Plugin</div>'
      })
      export class PluginWidget {}
    `);

    session.editFile("/src/app.ts", `
      import { customElement } from 'aurelia';
      import { KnownWidget } from './known-widget';
      import { PluginWidget } from './plugin-widget';

      @customElement({
        name: 'app',
        template: '<known-widget></known-widget><plugin-widget></plugin-widget>',
        dependencies: [KnownWidget, PluginWidget]
      })
      export class App {}
    `);

    // plugin-widget should now be discoverable
    const name = session.pull("custom-element:plugin-widget", "name");
    expect(name).toBe("plugin-widget");

    // plugin-widget is now visible in app's scope via data edge
    const vis = evaluateVisibility(session.result);
    const scope = vis.scopes.get("app");
    expect(scope).toBeDefined();
    expect(scope!.visible.has("plugin-widget")).toBe(true);
  });

  it("completeness edge: scope STILL incomplete (getPlugins still opaque)", () => {
    // Even after adding plugin-widget statically, the scope is still
    // incomplete because getPlugins() in main.ts is still opaque.
    // The data edge for plugin-widget is resolved, but the completeness
    // edge is independent — other unknown elements would still get
    // demoted diagnostics.
    session.editFile("/src/app.ts", `
      import { customElement } from 'aurelia';
      import { KnownWidget } from './known-widget';
      import { PluginWidget } from './plugin-widget';

      @customElement({
        name: 'app',
        template: '<known-widget></known-widget><plugin-widget></plugin-widget>',
        dependencies: [KnownWidget, PluginWidget]
      })
      export class App {}
    `);

    const vis = evaluateVisibility(session.result);
    // The scope is still incomplete because main.ts still has
    // opaque getPlugins() registration
    assertNotComplete(vis, "app");
  });
});
