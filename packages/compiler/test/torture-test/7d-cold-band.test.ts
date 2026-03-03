/**
 * Tier 7D: Cold Band — Resource Identity (2 claims)
 *
 * Resource identity changes (add/remove) propagate through
 * scope-visibility. Wider blast radius than warm-band edits.
 */

import { describe, it, expect } from "vitest";
import {
  createMutableSession,
  assertCutoff,
  assertChanged,
  assertFresh,
} from "./harness.js";

// =============================================================================
// 7D-1: CE added → new observation, scope-visibility changes
// =============================================================================

describe("7D-1: CE added to project", () => {
  const session = createMutableSession({
    "/src/greeting.ts": `
      import { customElement, bindable } from 'aurelia';

      @customElement({
        name: 'greeting',
        template: '<p>Hello</p>'
      })
      export class Greeting {
        @bindable name: string = '';
      }
    `,
    "/src/app.ts": `
      import { customElement } from 'aurelia';
      import { Greeting } from './greeting';

      @customElement({
        name: 'app',
        template: '<greeting name.bind="user"></greeting>',
        dependencies: [Greeting]
      })
      export class App {
        user = 'World';
      }
    `,
  });

  it("adding new CE and registering it changes app's dependencies conclusion", () => {
    // Edit app.ts to add StatusBadge as a dependency + create the file
    session.editFile("/src/status-badge.ts", `
      import { customElement, bindable } from 'aurelia';

      @customElement({
        name: 'status-badge',
        template: '<span>badge</span>'
      })
      export class StatusBadge {
        @bindable level: string = '';
      }
    `);

    const trace = session.editFile("/src/app.ts", `
      import { customElement } from 'aurelia';
      import { Greeting } from './greeting';
      import { StatusBadge } from './status-badge';

      @customElement({
        name: 'app',
        template: '<greeting name.bind="user"></greeting><status-badge level="admin"></status-badge>',
        dependencies: [Greeting, StatusBadge]
      })
      export class App {
        user = 'World';
      }
    `);

    // The new CE should be discoverable
    const badgeName = session.pull("custom-element:status-badge", "name");
    expect(badgeName).toBe("status-badge");

    // App's dependencies changed
    session.pull("custom-element:app", "dependencies");
    assertChanged(trace, "conclusion:custom-element:app::dependencies");
  });

  it("greeting's observation unaffected by new CE", () => {
    const trace = session.editFile("/src/app.ts", `
      import { customElement } from 'aurelia';
      import { Greeting } from './greeting';

      @customElement({
        name: 'app',
        template: '<greeting name.bind="user"></greeting>',
        dependencies: [Greeting]
      })
      export class App {
        user = 'World2';
      }
    `);

    session.pull("custom-element:greeting", "name");

    // greeting.ts wasn't edited → its conclusion was never stale
    assertFresh(trace, "conclusion:custom-element:greeting::name");
  });
});

// =============================================================================
// 7D-2: CE removed → reference resolution changes
// =============================================================================

describe("7D-2: CE removed from dependencies", () => {
  const session = createMutableSession({
    "/src/badge.ts": `
      import { customElement, bindable } from 'aurelia';

      @customElement({
        name: 'badge',
        template: '<span>\${text}</span>'
      })
      export class Badge {
        @bindable text: string = '';
      }
    `,
    "/src/card.ts": `
      import { customElement } from 'aurelia';
      import { Badge } from './badge';

      @customElement({
        name: 'card',
        template: '<div><badge text.bind="label"></badge></div>',
        dependencies: [Badge]
      })
      export class Card {
        label = 'New';
      }
    `,
  });

  it("removing badge from dependencies changes card's dependencies conclusion", () => {
    const trace = session.editFile("/src/card.ts", `
      import { customElement } from 'aurelia';

      @customElement({
        name: 'card',
        template: '<div><badge text.bind="label"></badge></div>',
        dependencies: []
      })
      export class Card {
        label = 'New';
      }
    `);

    session.pull("custom-element:card", "dependencies");

    // Dependencies changed (Badge removed)
    assertChanged(trace, "conclusion:custom-element:card::dependencies");
  });

  it("removing badge → card name cutoff (name unchanged)", () => {
    const trace = session.editFile("/src/card.ts", `
      import { customElement } from 'aurelia';

      @customElement({
        name: 'card',
        template: '<div><badge text.bind="label"></badge></div>',
        dependencies: []
      })
      export class Card {
        label = 'Gone';
      }
    `);

    session.pull("custom-element:card", "name");

    // Name unchanged → cutoff
    assertCutoff(trace, "conclusion:custom-element:card::name");
  });

  it("badge's own observation stays fresh (badge.ts not edited)", () => {
    const trace = session.editFile("/src/card.ts", `
      import { customElement } from 'aurelia';

      @customElement({
        name: 'card',
        template: '<div>no badge</div>',
        dependencies: []
      })
      export class Card {
        label = 'None';
      }
    `);

    session.pull("custom-element:badge", "name");

    // badge.ts wasn't edited → its conclusion was never stale
    assertFresh(trace, "conclusion:custom-element:badge::name");
  });
});
