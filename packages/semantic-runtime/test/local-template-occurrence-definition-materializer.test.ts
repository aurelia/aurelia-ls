import { describe, expect, test } from 'vitest';

import { ComputationCommitState } from '../src/kernel/computation-lifecycle.js';
import {
  CustomElementCaptureDefinition,
  CustomElementCaptureKind,
  CustomElementDefinition,
  CustomElementTemplateDefinition,
  CustomElementTemplateKind,
} from '../src/resources/custom-element-definition.js';
import { ResourceProductDetails } from '../src/resources/product-details.js';
import { ResourceDefinitionKind, runtimeResourceKeyForKind } from '../src/resources/resource-kind.js';
import { ResourceTargetReference } from '../src/resources/resource-reference.js';
import {
  LocalTemplateDefinitionMaterializer,
} from '../src/template/local-template-definition-materializer.js';
import {
  executeTemplateCompilerLocalExtraction,
  TemplateCompilerExtractedLocalTemplate,
  TemplateCompilerLocalExtractionHandoff,
  TemplateCompilerLocalExtractionState,
} from '../src/template/template-compiler-local-extraction.js';
import {
  TemplateCompilerExecutionSession,
} from '../src/template/template-compiler-execution.js';
import {
  TemplateCompilerElementOccurrence,
  TemplateCompilerOccurrenceEdgeKind,
  TemplateCompilerOccurrenceForest,
} from '../src/template/template-compiler-occurrence.js';
import {
  TemplateCompilerHookBootstrapResult,
  TemplateCompilerHookBootstrapState,
} from '../src/template/template-compiler-hook-bootstrap.js';
import { BrowserEffectiveTemplateFixture } from './browser-effective-template-fixture.js';

describe('local-template occurrence definition materializer', () => {
  test('publishes one DomNode batch with exact sources and retained generated-dependency authority', () => {
    const fixture = new OccurrenceDefinitionFixture(
      'local-template-occurrence-definition-success',
      [
        '<template as-custom-element="local-card">',
        '  <bindable name="fooBar" attribute="public-foo" mode="twoWay"></bindable>',
        '  <slot></slot>',
        '</template>',
        '<div></div>',
      ].join(''),
    );
    let finished = false;
    try {
      const extraction = fixture.extract();
      if (extraction.handoff == null) throw new Error('Expected successful local extraction handoff.');
      const definitions = fixture.definitions;
      const beforePreparation = fixture.browser.run.readKernelCountSnapshot().totalRecords;
      const reserved = definitions.reserveOccurrenceDefinition(extraction.handoff.entries[0]!.invocationKey);
      expect(definitions.reserveOccurrenceDefinition(reserved.invocationKey)).toBe(reserved);
      const ownerDefinition = fixture.ownerDefinition();
      const preparation = definitions.prepareOccurrenceHandoff(
        ownerDefinition,
        fixture.forest,
        extraction.handoff,
      );

      expect(fixture.browser.run.readKernelCountSnapshot().totalRecords).toBe(beforePreparation);
      expect(preparation.entries).toHaveLength(1);
      const entry = preparation.entries[0]!;
      const definition = entry.definition;
      expect(definition.productHandle).toBe(reserved.productHandle);
      expect(definition.identityHandle).toBe(reserved.identityHandle);
      expect(preparation.ownerDefinition).toBe(ownerDefinition);
      expect(definition).toMatchObject({
        name: 'local-card',
        needsCompile: true,
        hasSlots: false,
        template: {
          kind: CustomElementTemplateKind.DomNode,
          markup: null,
          sourceMap: null,
          authoredSourceRevision: 'test:owner-source:v1',
        },
        dependencies: [],
        bindables: [{
          name: 'fooBar',
          attribute: 'public-foo',
          mode: 'twoWay',
        }],
      });
      expect(definition.sourceAddressHandle).not.toBeNull();
      expect(definition.nameSourceAddressHandle).not.toBeNull();
      expect(definition.template?.addressHandle).toBe(definition.sourceAddressHandle);
      expect(definition.bindables[0]).toMatchObject({
        sourceAddressHandle: expect.stringMatching(/^kernel:/u),
        nameSourceAddressHandle: expect.stringMatching(/^kernel:/u),
        attributeSourceAddressHandle: expect.stringMatching(/^kernel:/u),
        modeSourceAddressHandle: expect.stringMatching(/^kernel:/u),
      });
      expect(entry.extracted.carrier.parentEdgeKind).toBe(TemplateCompilerOccurrenceEdgeKind.Detached);

      const published = definitions.publishOccurrenceHandoff(preparation);
      expect(published.ownerDefinition).toBe(ownerDefinition);
      expect(published.definitions).toEqual([definition]);
      expect(fixture.browser.run.readProductDetail(
        ResourceProductDetails.Definition,
        definition.productHandle!,
      )).toBe(definition);
      expect(() => definitions.publishOccurrenceHandoff(preparation)).toThrow(/already published/);
      const commit = fixture.browser.run.commit();
      finished = true;
      expect(commit.state).toBe(ComputationCommitState.Committed);
      expect(fixture.browser.store.readProductDetail(
        ResourceProductDetails.Definition,
        definition.productHandle!,
      )).toBe(definition);
    } finally {
      if (!finished) fixture.dispose();
    }
  });

  test('retains carrier provenance without attributing an effect-rewritten public name to authored text', () => {
    const fixture = new OccurrenceDefinitionFixture(
      'local-template-occurrence-definition-rewrite',
      '<template as-custom-element="authored-name"><bindable name="authoredProp"></bindable></template><p></p>',
    );
    try {
      const carrier = localCarrier(fixture.forest);
      const declaration = carrier.readAttributes().find((attribute) => attribute.name === 'as-custom-element');
      const bindable = carrier.templateContent?.readChildren().find((node): node is TemplateCompilerElementOccurrence =>
        node instanceof TemplateCompilerElementOccurrence && node.tagName === 'bindable'
      );
      const bindableName = bindable?.readAttributes().find((attribute) => attribute.name === 'name');
      if (declaration == null || bindableName == null) throw new Error('Expected rewrite inputs.');
      fixture.forest.rewriteAttributeValue(declaration, 'effective-name');
      fixture.forest.rewriteAttributeValue(bindableName, 'effectiveProp');
      const extraction = fixture.extract();
      if (extraction.handoff == null) throw new Error('Expected rewritten local extraction handoff.');
      const definitions = fixture.definitions;
      const preparation = definitions.prepareOccurrenceHandoff(
        fixture.ownerDefinition(),
        fixture.forest,
        extraction.handoff,
      );
      const definition = preparation.entries[0]!.definition;

      expect(definition.name).toBe('effective-name');
      expect(definition.sourceAddressHandle).not.toBeNull();
      expect(definition.nameSourceAddressHandle).toBeNull();
      expect(definition.bindables[0]).toMatchObject({
        name: 'effectiveProp',
        sourceAddressHandle: expect.stringMatching(/^kernel:/u),
        nameSourceAddressHandle: null,
      });
    } finally {
      fixture.dispose();
    }
  });

  test('reserves cohort- and parent-scoped handles without publishing refused partial extraction', () => {
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

  test('rejects foreign and superseded publication while leaving preparation candidate-local', () => {
    const fixture = new OccurrenceDefinitionFixture(
      'local-template-occurrence-definition-currentness',
      '<template as-custom-element="local"><span></span></template><p></p>',
    );
    const extraction = fixture.extract();
    if (extraction.handoff == null) throw new Error('Expected currentness extraction handoff.');
    const extracted = extraction.handoff.entries[0]!;
    const counterfeit = new TemplateCompilerExtractedLocalTemplate(
      extracted.declarationOrdinal,
      extracted.invocationKey,
      {
        invocationKey: extracted.definitionReservation.invocationKey,
        productHandle: extracted.definitionReservation.productHandle,
        identityHandle: extracted.definitionReservation.identityHandle,
      },
      extracted.name,
      extracted.carrier,
      extracted.content,
      extracted.declarationAttribute,
      extracted.bindables,
      extracted.carrierDetachmentOperation,
      extracted.invocationLane,
    );
    expect(() => fixture.definitions.prepareOccurrenceHandoff(
      fixture.ownerDefinition(),
      fixture.forest,
      new TemplateCompilerLocalExtractionHandoff(extraction.handoff.ownerLane, [counterfeit]),
    )).toThrow(/reservation/);
    const preparation = fixture.definitions.prepareOccurrenceHandoff(
      fixture.ownerDefinition(),
      fixture.forest,
      extraction.handoff,
    );
    const foreign = new LocalTemplateDefinitionMaterializer(fixture.browser.run);
    expect(() => foreign.publishOccurrenceHandoff(preparation)).toThrow(/another materializer/);
    const replacement = fixture.browser.lifecycle.begin(fixture.browser.run.locus);

    expect(() => fixture.definitions.publishOccurrenceHandoff(preparation)).toThrow(/superseded/);
    fixture.browser.run.abort();
    replacement.abort();
    expect(fixture.browser.store.readAllRecords()).toEqual([]);
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

  ownerDefinition(): CustomElementDefinition {
    const target = new ResourceTargetReference(null, null, null, null);
    return new CustomElementDefinition(
      this.browser.run.handles.product('owner-definition'),
      this.browser.run.handles.identity('owner-definition'),
      null,
      target,
      'owner-element',
      [],
      runtimeResourceKeyForKind(ResourceDefinitionKind.CustomElement, 'owner-element')!,
      new CustomElementCaptureDefinition(CustomElementCaptureKind.None),
      new CustomElementTemplateDefinition(
        CustomElementTemplateKind.Markup,
        '<owner-source></owner-source>',
        null,
        null,
        'test:owner-source:v1',
      ),
      [],
      [],
      null,
      true,
      [],
      [],
      false,
      null,
      false,
      false,
      [],
      null,
      null,
    );
  }

  dispose(): void {
    this.browser.dispose();
  }
}

function localCarrier(forest: TemplateCompilerOccurrenceForest): TemplateCompilerElementOccurrence {
  const carrier = forest.readNodes().find((node): node is TemplateCompilerElementOccurrence =>
    node instanceof TemplateCompilerElementOccurrence
    && node !== forest.compilerCarrier
    && node.tagName === 'template'
    && node.readAttributes().some((attribute) => attribute.name === 'as-custom-element')
  );
  if (carrier == null) throw new Error('Expected local template carrier.');
  return carrier;
}
