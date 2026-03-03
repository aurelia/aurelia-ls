/**
 * Tier 5C: Vocabulary Gap Claims (2 entries)
 *
 * Tests plugin configuration that prevents full vocabulary
 * determination. These are the vocabulary-level consequence of
 * registration gaps (tier 4C at scope level).
 *
 * The downstream consequence chain:
 * 1. Plugin with config callback (opaque)
 * 2. Default vocabulary items known (product postulates)
 * 3. Custom vocabulary items indeterminate (vocabulary gap)
 * 4. Template uses custom syntax → falls through to plain attribute
 * 5. No error — silent misclassification
 *
 * This failure mode is qualitatively worse than tier 4's ungrounded
 * negative assertions (which produce demoted diagnostics). Silent
 * misclassification produces NO signal.
 *
 * Authority: tier-5.md §5C, template-analysis.md §Vocabulary Closure,
 * NL-3 (blast radius). L3 product.md §7.3 (plugin gap analysis).
 */

import { describe, it } from "vitest";
import {
  runInterpreter,
  evaluateProjectVocabulary,
  assertInVocabulary,
  assertPatternInVocabulary,
  assertVocabularyNotComplete,
  assertVocabularyGap,
} from "./harness.js";

describe("5C: Vocabulary Gap Claims", () => {
  it("#5C.1 i18n .customize() — vocabulary gap on custom aliases", () => {
    const result = runInterpreter({
      "/src/main.ts": `
        import Aurelia from 'aurelia';
        import { I18nConfiguration } from '@aurelia/i18n';
        import { App } from './app';

        Aurelia
          .register(
            I18nConfiguration.customize((options) => {
              options.initOptions = {
                resources: { en: { translation: { greeting: 'Hello' } } },
                lng: 'en',
                fallbackLng: 'en',
              };
            })
          )
          .app(App)
          .start();
      `,
      "/src/app.ts": `
        import { customElement } from 'aurelia';

        @customElement({
          name: 'app',
          template: \`
            <span t="greeting">fallback</span>
            <span i18n="other_key">also fallback</span>
          \`
        })
        export class App {}
      `,
    });

    const vocab = evaluateProjectVocabulary(result);

    // Vocabulary is incomplete — .customize() callback may create
    // additional BCs/APs from custom translation aliases
    assertVocabularyNotComplete(vocab);
    assertVocabularyGap(vocab, { reason: "customize" });

    // Default i18n vocabulary items survive the gap (product postulates)
    assertInVocabulary(vocab, "t", {
      ignoreAttr: false,
      outputInstruction: "TranslationBinding",
      expressionEntry: "IsCustom",
    });
    assertPatternInVocabulary(vocab, "TranslationAP", ["t"]);

    // Core builtins also survive
    assertInVocabulary(vocab, "bind");
    assertInVocabulary(vocab, "trigger");
  });

  it("#5C.2 vocabulary gap structural properties — blast radius and no error signal", () => {
    // Same project config as 5C.1
    const result = runInterpreter({
      "/src/main.ts": `
        import Aurelia from 'aurelia';
        import { I18nConfiguration } from '@aurelia/i18n';
        import { App } from './app';

        Aurelia
          .register(
            I18nConfiguration.customize((options) => {
              options.initOptions = {
                resources: { en: { translation: { greeting: 'Hello' } } },
                lng: 'en',
              };
            })
          )
          .app(App)
          .start();
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

    // The gap exists — vocabulary incomplete
    assertVocabularyNotComplete(vocab);

    // Key structural property: known vocabulary items are unchanged
    // despite the gap. The gap affects COMPLETENESS, not CONTENTS.
    // All 13 core BCs + 3 i18n default BCs are still present.
    assertInVocabulary(vocab, "bind");
    assertInVocabulary(vocab, "trigger");
    assertInVocabulary(vocab, "for");
    assertInVocabulary(vocab, "t");

    // The gap's blast radius is syntax-wide: any template using an
    // unknown alias (e.g., i18n="...") would silently misclassify.
    // This is the silent misclassification pattern — no error signal,
    // the attribute falls through to plain attribute classification.
    // We can't test the classification behavior here (tier 6), but
    // we verify the vocabulary gap exists and carries the right metadata.
    assertVocabularyGap(vocab, { reason: "customize" });
  });
});
