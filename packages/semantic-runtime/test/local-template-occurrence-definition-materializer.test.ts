import { describe, expect, test } from 'vitest';

import { ResourceProductDetails } from '../src/resources/product-details.js';
import { LocalTemplateDefinitionMaterializer } from '../src/template/local-template-definition-materializer.js';
import {
  executeTemplateCompilerLocalExtraction,
  TemplateCompilerLocalExtractionState,
} from '../src/template/template-compiler-local-extraction.js';
import { TemplateCompilerExecutionSession } from '../src/template/template-compiler-execution.js';
import { TemplateCompilerOccurrenceForest } from '../src/template/template-compiler-occurrence.js';
import {
  TemplateCompilerHookBootstrapResult,
  TemplateCompilerHookBootstrapState,
} from '../src/template/template-compiler-hook-bootstrap.js';
import { BrowserEffectiveTemplateFixture } from './browser-effective-template-fixture.js';

describe('local-template occurrence definition reservations', () => {
  test('keeps parent/cohort handles distinct and refused partial extraction unpublished', () => {
    const fixture = new OccurrenceDefinitionFixture(
      'local-template-occurrence-definition-refused',
      [
        '<template as-custom-element="same"><bindable name="value"></bindable></template>',
        '<template as-custom-element="same"></template>',
        '<div></div>',
      ].join(''),
    );
    try {
      const definitions = fixture.definitions;
      const first = definitions.reserveOccurrenceDefinition('cohort:a:owner:local-template:nested');
      const reordered = definitions.reserveOccurrenceDefinition('cohort:a:owner:local-template:nested');
      const renamed = definitions.reserveOccurrenceDefinition('cohort:a:owner:local-template:renamed');
      const second = definitions.reserveOccurrenceDefinition('cohort:b:owner:local-template:nested');
      const otherParent = definitions.reserveOccurrenceDefinition('cohort:a:other-owner:local-template:nested');
      expect(reordered).toBe(first);
      expect(new Set([first.productHandle, renamed.productHandle, second.productHandle, otherParent.productHandle]).size)
        .toBe(4);
      expect(new Set([first.identityHandle, renamed.identityHandle, second.identityHandle, otherParent.identityHandle]).size)
        .toBe(4);
      const beforeExtraction = fixture.browser.run.readKernelCountSnapshot().totalRecords;
      const extraction = fixture.extract();

      expect(extraction.state).toBe(TemplateCompilerLocalExtractionState.Refused);
      expect(extraction.handoff).toBeNull();
      expect(extraction.completedExtractions).toHaveLength(1);
      expect(fixture.browser.run.readKernelCountSnapshot().totalRecords).toBe(beforeExtraction);
      expect(fixture.browser.run.readProductDetail(ResourceProductDetails.Definition, first.productHandle)).toBeNull();
    } finally {
      fixture.dispose();
    }
  });
});

class OccurrenceDefinitionFixture {
  readonly browser: BrowserEffectiveTemplateFixture;
  readonly forest: TemplateCompilerOccurrenceForest;
  readonly execution: TemplateCompilerExecutionSession;
  readonly lane;
  readonly definitions: LocalTemplateDefinitionMaterializer;

  constructor(localKey: string, markup: string) {
    this.browser = new BrowserEffectiveTemplateFixture(localKey);
    this.forest = TemplateCompilerOccurrenceForest.fromBrowserEffective(
      this.browser.materialize('root', markup).emission,
    );
    this.execution = TemplateCompilerExecutionSession.createForForest(`${localKey}:family`, this.forest);
    this.lane = this.execution.admitRootInvocation(`${localKey}:root`);
    this.definitions = new LocalTemplateDefinitionMaterializer(this.browser.run);
  }

  extract() {
    return executeTemplateCompilerLocalExtraction({
      execution: this.execution,
      lane: this.lane,
      hookBootstrap: new TemplateCompilerHookBootstrapResult(
        this.lane,
        TemplateCompilerHookBootstrapState.Exact,
        [],
        null,
        null,
      ),
      ownerName: 'owner-element',
      ownerCauseHandles: [this.browser.run.handles.product('owner-definition')],
      reserveDefinition: (invocationKey) => this.definitions.reserveOccurrenceDefinition(invocationKey),
    });
  }

  dispose(): void {
    this.browser.dispose();
  }
}
