/**
 * Tier 4A: Positive Visibility Claims (6 entries)
 *
 * Tests that resources ARE visible in specific template scopes via
 * each registration mechanism. These are the foundational visibility
 * claims — if the system can't determine positive visibility,
 * completeness and gap claims (4B-4D) are meaningless.
 *
 * Registration mechanisms tested:
 * - Aurelia.register() → root → universal visibility
 * - dependencies: [...] → local container
 * - <import from="..."> → local container (build-time)
 * - as-custom-element → local container (compile-time)
 * - Plugin.register() → root (via indirection)
 * - Local + root same name → local takes precedence
 *
 * Authority: tier-4.md §4A, scope-resolution.md §Two-Level Lookup,
 * §Registration Mechanisms.
 */

import { describe, it } from "vitest";
import {
  runInterpreter,
  evaluateVisibility,
  assertVisible,
} from "./harness.js";

describe("4A: Positive Visibility Claims", () => {
  it("#4A.1 root registration → universal visibility", () => {
    const result = runInterpreter({
      "/src/main.ts": `
        import Aurelia from 'aurelia';
        import { SharedNav } from './shared-nav';
        import { App } from './app';

        Aurelia.register(SharedNav).app(App).start();
      `,
      "/src/shared-nav.ts": `
        import { customElement } from 'aurelia';

        @customElement({ name: 'shared-nav', template: '<nav>shared</nav>' })
        export class SharedNav {}
      `,
      "/src/app.ts": `
        import { customElement } from 'aurelia';

        @customElement({ name: 'app', template: '<shared-nav></shared-nav><child-page></child-page>' })
        export class App {}
      `,
      "/src/child-page.ts": `
        import { customElement } from 'aurelia';

        @customElement({ name: 'child-page', template: '<shared-nav></shared-nav>' })
        export class ChildPage {}
      `,
    });

    const vis = evaluateVisibility(result);

    // Root registration → visible in every template via root lookup
    assertVisible(vis, "shared-nav", "app", "root");
    assertVisible(vis, "shared-nav", "child-page", "root");
  });

  it("#4A.2 dependencies array → local visibility", () => {
    const result = runInterpreter({
      "/src/parent-el.ts": `
        import { customElement } from 'aurelia';
        import { LocalChild } from './local-child';

        @customElement({
          name: 'parent-el',
          template: '<local-child></local-child>',
          dependencies: [LocalChild]
        })
        export class ParentEl {}
      `,
      "/src/local-child.ts": `
        import { customElement } from 'aurelia';

        @customElement({ name: 'local-child', template: '<div>I am local</div>' })
        export class LocalChild {}
      `,
    });

    const vis = evaluateVisibility(result);

    // dependencies array → visible in parent-el's template via local lookup
    assertVisible(vis, "local-child", "parent-el", "local");
  });

  it("#4A.3 <import from> → local visibility", () => {
    const result = runInterpreter({
      "/src/importer-el.ts": `
        import { customElement } from 'aurelia';

        @customElement({
          name: 'importer-el',
          template: '<import from="./imported-child"></import><imported-child></imported-child>'
        })
        export class ImporterEl {}
      `,
      "/src/imported-child.ts": `
        import { customElement } from 'aurelia';

        @customElement({ name: 'imported-child', template: '<div>imported</div>' })
        export class ImportedChild {}
      `,
    });

    const vis = evaluateVisibility(result);

    // Build-time local registration via <import> element
    assertVisible(vis, "imported-child", "importer-el", "local");
  });

  it("#4A.4 as-custom-element → local visibility", () => {
    const result = runInterpreter({
      "/src/host-el.ts": `
        import { customElement } from 'aurelia';

        @customElement({
          name: 'host-el',
          template: \`
            <template as-custom-element="inline-widget">
              <bindable property="label"></bindable>
              <span>\\\${label}</span>
            </template>
            <inline-widget label="hello"></inline-widget>
          \`
        })
        export class HostEl {}
      `,
    });

    const vis = evaluateVisibility(result);

    // Compile-time local registration via as-custom-element
    assertVisible(vis, "inline-widget", "host-el", "local");
  });

  it("#4A.5 plugin registration → global visibility", () => {
    const result = runInterpreter({
      "/src/main.ts": `
        import Aurelia from 'aurelia';
        import { MyPlugin } from './my-plugin';
        import { App } from './app';

        Aurelia.register(MyPlugin).app(App).start();
      `,
      "/src/my-plugin.ts": `
        import { IRegistry } from 'aurelia';
        import { PluginWidget } from './plugin-widget';

        export const MyPlugin: IRegistry = {
          register(container) {
            container.register(PluginWidget);
          }
        };
      `,
      "/src/plugin-widget.ts": `
        import { customElement } from 'aurelia';

        @customElement({ name: 'plugin-widget', template: '<div>from plugin</div>' })
        export class PluginWidget {}
      `,
      "/src/some-page.ts": `
        import { customElement } from 'aurelia';

        @customElement({ name: 'some-page', template: '<plugin-widget></plugin-widget>' })
        export class SomePage {}
      `,
      "/src/app.ts": `
        import { customElement } from 'aurelia';

        @customElement({ name: 'app', template: '<some-page></some-page>' })
        export class App {}
      `,
    });

    const vis = evaluateVisibility(result);

    // Plugin registers on root → visible globally via root lookup
    assertVisible(vis, "plugin-widget", "some-page", "root");
  });

  it("#4A.6 local + root same resource → local takes precedence", () => {
    const result = runInterpreter({
      "/src/main.ts": `
        import Aurelia from 'aurelia';
        import { SharedEl } from './shared-el';
        import { App } from './app';

        Aurelia.register(SharedEl).app(App).start();
      `,
      "/src/shared-el.ts": `
        import { customElement } from 'aurelia';

        @customElement({ name: 'shared-el', template: '<div>root version</div>' })
        export class SharedEl {}
      `,
      "/src/overrider.ts": `
        import { customElement } from 'aurelia';
        import { LocalSharedEl } from './local-shared-el';

        @customElement({
          name: 'overrider',
          template: '<shared-el></shared-el>',
          dependencies: [LocalSharedEl]
        })
        export class Overrider {}
      `,
      "/src/local-shared-el.ts": `
        import { customElement } from 'aurelia';

        @customElement({ name: 'shared-el', template: '<div>local version</div>' })
        export class LocalSharedEl {}
      `,
      "/src/app.ts": `
        import { customElement } from 'aurelia';

        @customElement({ name: 'app', template: '<overrider></overrider>' })
        export class App {}
      `,
    });

    const vis = evaluateVisibility(result);

    // Local registration takes precedence over root (two-level lookup
    // checks local first — local hit → stop, root never consulted)
    assertVisible(vis, "shared-el", "overrider", "local");
  });
});
