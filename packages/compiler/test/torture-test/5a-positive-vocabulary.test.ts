/**
 * Tier 5A: Positive Vocabulary Claims (6 entries)
 *
 * Tests that specific BCs and APs ARE in the frozen vocabulary
 * registry with correct behavioral fields. The vocabulary is global
 * (root-level singleton), frozen before template analysis begins.
 *
 * Behavioral fields tested:
 * - ignoreAttr: whether the command owns the attribute (skips bindable/CA resolution)
 * - outputInstruction: the instruction type the command produces
 * - expressionEntry: which expression parser entry point to use
 *
 * Coverage strategy: one entry from each ignoreAttr partition
 * (true/false), one from each expressionEntry (IsProperty, IsFunction,
 * IsIterator, IsCustom), one core AP, one plugin AP.
 *
 * Authority: tier-5.md §5A, template-analysis.md §Vocabulary Closure,
 * f1-entity-catalog.md §Binding Commands, §Attribute Patterns.
 */

import { describe, it } from "vitest";
import {
  runInterpreter,
  evaluateProjectVocabulary,
  assertInVocabulary,
  assertPatternInVocabulary,
} from "./harness.js";

describe("5A: Positive Vocabulary Claims", () => {
  it("#5A.1 bind — ignoreAttr: false, IsProperty (baseline binding command)", () => {
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
          template: '<input value.bind="name">'
        })
        export class App {
          name = 'hello';
        }
      `,
    });

    const vocab = evaluateProjectVocabulary(result);

    // bind is in vocabulary with correct behavioral fields
    assertInVocabulary(vocab, "bind", {
      ignoreAttr: false,
      outputInstruction: "PropertyBinding",
      expressionEntry: "IsProperty",
    });
  });

  it("#5A.2 trigger — ignoreAttr: true, IsFunction (command owns the attribute)", () => {
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
          template: '<button click.trigger="handleClick()">Click</button>'
        })
        export class App {
          handleClick() { }
        }
      `,
    });

    const vocab = evaluateProjectVocabulary(result);

    // trigger owns the attribute — classifier stops at step 4
    assertInVocabulary(vocab, "trigger", {
      ignoreAttr: true,
      outputInstruction: "ListenerBinding",
      expressionEntry: "IsFunction",
    });
  });

  it("#5A.3 for — ignoreAttr: false, IsIterator (unique expression entry point)", () => {
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
          template: '<div repeat.for="item of items">\${item}</div>'
        })
        export class App {
          items = ['a', 'b', 'c'];
        }
      `,
    });

    const vocab = evaluateProjectVocabulary(result);

    // for uses IsIterator — "item of items" is iterator syntax, not property access
    assertInVocabulary(vocab, "for", {
      ignoreAttr: false,
      outputInstruction: "IteratorBinding",
      expressionEntry: "IsIterator",
    });
  });

  it("#5A.4 DotSeparated attribute pattern — the fundamental AP", () => {
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
          template: '<input value.bind="name" change.trigger="onChange()">'
        })
        export class App {
          name = '';
          onChange() { }
        }
      `,
    });

    const vocab = evaluateProjectVocabulary(result);

    // DotSeparated AP enables all dot-separated command syntax
    // Patterns: PART.PART (two-part) and PART.PART.PART (three-part defensive)
    assertPatternInVocabulary(vocab, "DotSeparated", ["PART.PART", "PART.PART.PART"]);
  });

  it("#5A.5 i18n t — plugin postulate, ignoreAttr: false, IsCustom", () => {
    const result = runInterpreter({
      "/src/main.ts": `
        import Aurelia from 'aurelia';
        import { I18nConfiguration } from '@aurelia/i18n';
        import { App } from './app';

        Aurelia.register(I18nConfiguration).app(App).start();
      `,
      "/src/app.ts": `
        import { customElement } from 'aurelia';

        @customElement({
          name: 'app',
          template: '<span t="greeting">fallback</span>'
        })
        export class App {}
      `,
    });

    const vocab = evaluateProjectVocabulary(result);

    // i18n t command — IsCustom means the value is passed opaquely (not parsed as expression)
    assertInVocabulary(vocab, "t", {
      ignoreAttr: false,
      outputInstruction: "TranslationBinding",
      expressionEntry: "IsCustom",
    });
  });

  it("#5A.6 TranslationAttributePattern — plugin AP postulate", () => {
    const result = runInterpreter({
      "/src/main.ts": `
        import Aurelia from 'aurelia';
        import { I18nConfiguration } from '@aurelia/i18n';
        import { App } from './app';

        Aurelia.register(I18nConfiguration).app(App).start();
      `,
      "/src/app.ts": `
        import { customElement } from 'aurelia';

        @customElement({
          name: 'app',
          template: '<span t="greeting">fallback</span>'
        })
        export class App {}
      `,
    });

    const vocab = evaluateProjectVocabulary(result);

    // TranslationAP matches bare "t" attribute → routes to t binding command
    // Without this AP, t="greeting" would fall through to plain attribute
    assertPatternInVocabulary(vocab, "TranslationAP", ["t"]);
  });
});
