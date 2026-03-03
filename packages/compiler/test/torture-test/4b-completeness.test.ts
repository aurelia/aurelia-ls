/**
 * Tier 4B: Completeness Claims (5 entries)
 *
 * Tests that the system correctly determines when a scope's resource
 * set is exhaustively known (complete) — enabling safe negative
 * assertions ("resource X is NOT in this scope").
 *
 * The positive/negative asymmetry:
 * - Positive claims (4A) need one registration. No completeness.
 * - Negative claims ("X is not here") need completeness — the system
 *   must know it has seen ALL registrations.
 *
 * Completeness is compositional: a scope's completeness depends on
 * both its local container AND root (two-level lookup). Root
 * incompleteness propagates to all scopes.
 *
 * Authority: tier-4.md §4B, scope-resolution.md §Gap Composition,
 * claim-model.md §Negative assertions require completeness.
 */

import { describe, it } from "vitest";
import {
  runInterpreter,
  evaluateVisibility,
  assertVisible,
  assertNotVisible,
  assertComplete,
  assertNotComplete,
} from "./harness.js";

describe("4B: Completeness Claims", () => {
  it("#4B.1 pure static project — all scopes complete", () => {
    const result = runInterpreter({
      "/src/main.ts": `
        import Aurelia from 'aurelia';
        import { GlobalNav } from './global-nav';
        import { App } from './app';

        Aurelia.register(GlobalNav).app(App).start();
      `,
      "/src/global-nav.ts": `
        import { customElement } from 'aurelia';

        @customElement({ name: 'global-nav', template: '<nav>nav</nav>' })
        export class GlobalNav {}
      `,
      "/src/app.ts": `
        import { customElement } from 'aurelia';
        import { PageHeader } from './page-header';

        @customElement({
          name: 'app',
          template: '<global-nav></global-nav><page-header></page-header>',
          dependencies: [PageHeader]
        })
        export class App {}
      `,
      "/src/page-header.ts": `
        import { customElement } from 'aurelia';

        @customElement({ name: 'page-header', template: '<h1>header</h1>' })
        export class PageHeader {}
      `,
    });

    const vis = evaluateVisibility(result);

    // All registrations are static and deterministic
    assertComplete(vis, "app");

    // Verify the positive visibility claims still work alongside completeness
    assertVisible(vis, "global-nav", "app", "root");
    assertVisible(vis, "page-header", "app", "local");
  });

  it("#4B.2 grounded negative assertion — complete scope + absent resource", () => {
    // Uses same project structure as 4B.1
    const result = runInterpreter({
      "/src/main.ts": `
        import Aurelia from 'aurelia';
        import { GlobalNav } from './global-nav';
        import { App } from './app';

        Aurelia.register(GlobalNav).app(App).start();
      `,
      "/src/global-nav.ts": `
        import { customElement } from 'aurelia';

        @customElement({ name: 'global-nav', template: '<nav>nav</nav>' })
        export class GlobalNav {}
      `,
      "/src/app.ts": `
        import { customElement } from 'aurelia';
        import { PageHeader } from './page-header';

        @customElement({
          name: 'app',
          template: '<global-nav></global-nav><page-header></page-header>',
          dependencies: [PageHeader]
        })
        export class App {}
      `,
      "/src/page-header.ts": `
        import { customElement } from 'aurelia';

        @customElement({ name: 'page-header', template: '<h1>header</h1>' })
        export class PageHeader {}
      `,
    });

    const vis = evaluateVisibility(result);

    // Scope is complete → negative assertion is grounded (safe for diagnostics)
    assertComplete(vis, "app");
    assertNotVisible(vis, "unknown-element", "app");

    // The asymmetry in one test:
    // - visible(global-nav) needs one registration (no completeness)
    // - not-visible(unknown-element) needs complete(app-scope)
    assertVisible(vis, "global-nav", "app", "root");
  });

  it("#4B.3 locally complete, root incomplete — gap inheritance", () => {
    const result = runInterpreter({
      "/src/main.ts": `
        import Aurelia from 'aurelia';
        import { KnownGlobal } from './known-global';
        import { App } from './app';

        function getPlugins() { return []; }

        Aurelia.register(KnownGlobal, ...getPlugins()).app(App).start();
      `,
      "/src/known-global.ts": `
        import { customElement } from 'aurelia';

        @customElement({ name: 'known-global', template: '<div>known</div>' })
        export class KnownGlobal {}
      `,
      "/src/app.ts": `
        import { customElement } from 'aurelia';
        import { LocalWidget } from './local-widget';

        @customElement({
          name: 'app',
          template: '<known-global></known-global><local-widget></local-widget>',
          dependencies: [LocalWidget]
        })
        export class App {}
      `,
      "/src/local-widget.ts": `
        import { customElement } from 'aurelia';

        @customElement({ name: 'local-widget', template: '<div>local</div>' })
        export class LocalWidget {}
      `,
    });

    const vis = evaluateVisibility(result);

    // Root has opaque getPlugins() spread → root incomplete
    assertNotComplete(vis, "app");

    // Positive claims still work despite incompleteness
    assertVisible(vis, "known-global", "app", "root");
    assertVisible(vis, "local-widget", "app", "local");

    // Negative assertion is ungrounded — mystery-element might come from getPlugins()
    // The system finds it not-visible, but the scope is incomplete →
    // this negative assertion is unsafe for diagnostics (demotion applies)
    assertNotVisible(vis, "mystery-element", "app");
  });

  it("#4B.4 cross-file registration indirection — deterministic multi-hop", () => {
    const result = runInterpreter({
      "/src/main.ts": `
        import Aurelia from 'aurelia';
        import { registerApp } from './app-registrations';
        import { App } from './app';

        registerApp(Aurelia).app(App).start();
      `,
      "/src/app-registrations.ts": `
        import { StatusBar } from './status-bar';
        import { MainLayout } from './main-layout';

        export const appRegistrations = [
          StatusBar,
          MainLayout,
        ];

        export function registerApp<T extends { register: (...r: unknown[]) => T }>(au: T): T {
          return au.register(...appRegistrations);
        }
      `,
      "/src/app.ts": `
        import { customElement } from 'aurelia';

        @customElement({
          name: 'app',
          template: '<main-layout></main-layout><status-bar></status-bar>'
        })
        export class App {}
      `,
      "/src/status-bar.ts": `
        import { customElement } from 'aurelia';

        @customElement({ name: 'status-bar', template: '<div>status</div>' })
        export class StatusBar {}
      `,
      "/src/main-layout.ts": `
        import { customElement } from 'aurelia';

        @customElement({ name: 'main-layout', template: '<div>layout</div>' })
        export class MainLayout {}
      `,
    });

    const vis = evaluateVisibility(result);

    // Multi-hop but deterministic: registerApp() → appRegistrations
    // (static exported array) → spread into .register()
    // The analyzer traces the chain → completeness holds
    assertComplete(vis, "app");
    assertVisible(vis, "status-bar", "app", "root");
    assertVisible(vis, "main-layout", "app", "root");
  });

  it("#4B.5 framework builtins via StandardConfiguration — product postulate completeness", () => {
    const result = runInterpreter({
      "/src/main.ts": `
        import Aurelia from 'aurelia';
        import { App } from './app';

        new Aurelia().app(App).start();
      `,
      "/src/app.ts": `
        import { customElement } from 'aurelia';

        @customElement({
          name: 'app',
          template: '<div if.bind="show">conditional</div><div repeat.for="x of items">\${x}</div>'
        })
        export class App {
          show = true;
          items = ['a', 'b'];
        }
      `,
    });

    const vis = evaluateVisibility(result);

    // Root completeness for builtins is grounded in product postulates
    // (L3 product.md §7.1), not registration tracing. The 51
    // StandardConfiguration builtins enter root as product knowledge.
    assertComplete(vis, "app");

    // Builtins visible via root lookup
    assertVisible(vis, "if", "app", "root");
    assertVisible(vis, "repeat", "app", "root");
  });
});
