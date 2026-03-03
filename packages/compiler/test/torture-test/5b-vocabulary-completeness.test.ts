/**
 * Tier 5B: Vocabulary Completeness Claims (2 entries)
 *
 * Tests that the vocabulary is complete — all BCs and APs registered
 * in root are known. Vocabulary completeness grounds the claim that
 * templates parse correctly: every attribute's syntax can be classified.
 *
 * Parallel to tier 4B (scope completeness):
 * - Positive vocabulary claims (5A) don't need completeness.
 * - Correct classification of ALL template attributes needs completeness.
 *
 * Authority: tier-5.md §5B, template-analysis.md §Vocabulary Closure,
 * §Classification Determinism.
 */

import { describe, it } from "vitest";
import {
  runInterpreter,
  evaluateProjectVocabulary,
  assertInVocabulary,
  assertPatternInVocabulary,
  assertVocabularyComplete,
} from "./harness.js";

describe("5B: Vocabulary Completeness Claims", () => {
  it("#5B.1 core-only app — vocabulary complete from builtin postulates", () => {
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
          template: \`
            <input value.bind="name">
            <button click.trigger="save()">Save</button>
            <div repeat.for="item of items">\\\${item}</div>
            <div if.bind="show">conditional</div>
            <span ref="mySpan">ref target</span>
            <div class.bind="active ? 'on' : 'off'">styled</div>
          \`
        })
        export class App {
          name = '';
          items = ['a', 'b'];
          show = true;
          active = false;
          save() { }
        }
      `,
    });

    const vocab = evaluateProjectVocabulary(result);

    // Vocabulary complete from builtin postulates alone (13 BCs + 8 AP classes)
    assertVocabularyComplete(vocab);

    // Spot-check representative commands from each behavioral category
    assertInVocabulary(vocab, "bind", { ignoreAttr: false, expressionEntry: "IsProperty" });
    assertInVocabulary(vocab, "trigger", { ignoreAttr: true, expressionEntry: "IsFunction" });
    assertInVocabulary(vocab, "for", { ignoreAttr: false, expressionEntry: "IsIterator" });

    // Spot-check the remaining core BCs exist
    assertInVocabulary(vocab, "one-time");
    assertInVocabulary(vocab, "to-view");
    assertInVocabulary(vocab, "from-view");
    assertInVocabulary(vocab, "two-way");
    assertInVocabulary(vocab, "capture");
    assertInVocabulary(vocab, "attr");
    assertInVocabulary(vocab, "style");
    assertInVocabulary(vocab, "class");
    assertInVocabulary(vocab, "ref");
    assertInVocabulary(vocab, "spread");

    // Core AP classes
    assertPatternInVocabulary(vocab, "DotSeparated", ["PART.PART", "PART.PART.PART"]);
    assertPatternInVocabulary(vocab, "Ref");
    assertPatternInVocabulary(vocab, "Event");
    assertPatternInVocabulary(vocab, "ColonPrefixed");
    assertPatternInVocabulary(vocab, "AtPrefixed");
  });

  it("#5B.2 default plugin config (i18n, no customize) — vocabulary complete", () => {
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
          template: \`
            <span t="greeting">fallback</span>
            <input value.bind="name">
          \`
        })
        export class App {
          name = '';
        }
      `,
    });

    const vocab = evaluateProjectVocabulary(result);

    // Core builtins + i18n default postulates → vocabulary complete
    // No .customize() → no config callback → no gap
    assertVocabularyComplete(vocab);

    // i18n BCs present with correct behavioral fields
    assertInVocabulary(vocab, "t", {
      ignoreAttr: false,
      outputInstruction: "TranslationBinding",
      expressionEntry: "IsCustom",
    });
    assertInVocabulary(vocab, "t.bind", {
      ignoreAttr: false,
      expressionEntry: "IsProperty",
    });
    assertInVocabulary(vocab, "t-params.bind", {
      ignoreAttr: false,
      expressionEntry: "IsProperty",
    });

    // i18n AP classes present
    assertPatternInVocabulary(vocab, "TranslationAP", ["t"]);
    assertPatternInVocabulary(vocab, "TranslationBindAP", ["t.bind"]);
    assertPatternInVocabulary(vocab, "TranslationParametersAP", ["t-params.bind"]);

    // Core BCs still present alongside plugin BCs
    assertInVocabulary(vocab, "bind");
    assertInVocabulary(vocab, "trigger");
  });
});
