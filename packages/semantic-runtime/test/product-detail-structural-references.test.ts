import { describe, expect, test } from 'vitest';

import { ConfigurationProductDetails } from '../src/configuration/product-details.js';
import { ContainerReference } from '../src/di/container-reference.js';
import {
  BindingContext,
  BindingContextKind,
  BindingScope,
  BindingScopeCreator,
  BindingScopeCreatorKind,
  BindingScopeOwnerKind,
  OverrideContext,
} from '../src/configuration/scope.js';
import {
  FrameworkCapabilityAdmissionState,
  FrameworkCapabilityAvailabilityState,
  FrameworkCapabilityDemand,
  FrameworkCapabilityDemandKind,
  FrameworkCapabilityDemandSiteKind,
} from '../src/framework/capability-demand.js';
import { FrameworkProductDetails } from '../src/framework/product-details.js';
import {
  KernelHandleFactory,
  type KernelRecordHandle,
  type ProductHandle,
} from '../src/kernel/handles.js';
import { KernelPublicationSurface } from '../src/kernel/publication-surface.js';
import type { ProductDetailDescriptor } from '../src/kernel/detail-descriptors.js';
import {
  KernelProductDetailReference,
  kernelProductDetailReferences,
  type KernelDetailReference,
} from '../src/kernel/detail-references.js';
import { FieldProvenance } from '../src/kernel/provenance.js';
import {
  ComputedObservationDependencyMode,
} from '../src/observation/computed-observation.js';
import {
  ComputedObserverObservedDependency,
  ComputedObserverRuntimeKind,
  ComputedObserverSource,
  ComputedObserverSourceReference,
  ComputedObserverSourceTriggerKind,
} from '../src/observation/computed-observer-source.js';
import { ObservationProductDetails } from '../src/observation/product-details.js';
import { runtimeObservedDependencyOccurrence } from '../src/observation/observed-dependency-member-source.js';
import {
  RuntimeBindingDataFlow,
  RuntimeBindingDataFlowDirection,
  RuntimeBindingDataFlowSourceAssignmentKind,
  RuntimeBindingDataFlowSourceKind,
  RuntimeBindingObservedDependency,
  RuntimeBindingSourceEvaluationKind,
  RuntimeBindingValueChannelKind,
  RuntimeBindingValueChannelReference,
  RuntimeBindingValueChannelTargetMutationKind,
} from '../src/observation/runtime-binding-observation.js';
import {
  RuntimeObservedDependencyKind,
} from '../src/observation/runtime-observed-dependency.js';
import {
  RuntimeOperationReachability,
  RuntimeOperationRealization,
} from '../src/runtime-expression/runtime-operation.js';
import { RuntimeExpressionDetailDescriptors } from '../src/runtime-expression/detail-descriptors.js';
import { RuntimeWatcherObservedDependency } from '../src/observation/runtime-watcher-observation.js';
import {
  computedObserverSourceReferenceReferences,
  runtimeBindingValueChannelReferenceReferences,
  runtimeEffectReferenceReferences,
} from '../src/observation/structural-references.js';
import {
  RuntimeEffect,
  RuntimeEffectDependencyEvaluationKind,
  RuntimeEffectKind,
  RuntimeEffectObservedDependency,
  RuntimeEffectReference,
} from '../src/observation/runtime-effect.js';
import {
  StateGetterBinding,
  StateGetterBindingStoreResolutionKind,
  StateStoreConfiguration,
} from '../src/state/model.js';
import { StateProductDetails } from '../src/state/product-details.js';
import { FrameworkRegistrationCapability } from '../src/registration/framework-registration-manifest.js';
import { FrameworkRegistrationKind } from '../src/registration/registration-reference.js';
import { ResourceDetailDescriptors } from '../src/resources/detail-descriptors.js';
import {
  resourceDefinitionNameNavigationAddressHandle,
  resourceDefinitionNameSourceAddressHandle,
  type FullResourceDefinition,
} from '../src/resources/resource-definition.js';
import { ResourceDefinitionKind } from '../src/resources/resource-kind.js';
import { ResourceTargetReference } from '../src/resources/resource-reference.js';
import { resourceTargetReferenceKernelReferences } from '../src/resources/structural-references.js';
import {
  AttributeClassification,
  AttributeClassificationKind,
} from '../src/template/attribute-syntax.js';
import {
  TemplateResourceVisibilityKind,
  TemplateVisibleResource,
} from '../src/template/compiler-world-reference.js';
import { TemplateDetailDescriptors } from '../src/template/detail-descriptors.js';
import { HtmlIrNodeKind, HtmlNodeReference } from '../src/template/html-ir.js';
import { TemplateProductDetails } from '../src/template/product-details.js';
import {
  RuntimeBindingKind,
  RuntimeBindingReference,
  RuntimeBindingSourceOperationKind,
  RuntimeBindingSourceOperationReference,
  RuntimeBindingTargetAccessLookup,
  RuntimeBindingTargetAccessReference,
  RuntimeBindingTargetKind,
  RuntimeBindingTargetOperationKind,
  RuntimeBindingTargetOperationReference,
} from '../src/template/runtime-binding.js';
import {
  runtimeBindingReferenceReferences,
  runtimeBindingSourceOperationReferenceReferences,
  runtimeBindingTargetAccessReferenceReferences,
  runtimeBindingTargetOperationReferenceReferences,
  runtimeValueConverterApplicationReferenceReferences,
  runtimeWatcherReferenceReferences,
} from '../src/template/structural-references.js';
import { RuntimeValueConverterApplicationReference } from '../src/template/runtime-value-converter.js';
import { RuntimeWatcherKind, RuntimeWatcherReference } from '../src/template/runtime-watcher.js';
import { TypeSystemDetailDescriptors } from '../src/type-system/detail-descriptors.js';
import {
  CheckerTypeProjectionOrigin,
  CheckerTypeReference,
  CheckerTypeShapeKind,
} from '../src/type-system/type-shape.js';

describe('product-detail structural references', () => {
  test('centralizes product-detail, resource-target, and definition-name derivations without losing witnesses', () => {
    const handles = new KernelHandleFactory('owned-structural-reference-helpers');
    const detailProduct = handles.product('detail');
    const detailReferences = kernelProductDetailReferences(
      ResourceDetailDescriptors.Definition,
      detailProduct,
      null,
    );
    expectRecordReference(detailReferences, detailProduct);
    expectExactProductDetailReferences(detailReferences, [[ResourceDetailDescriptors.Definition, detailProduct]]);

    const targetIdentity = handles.identity('target');
    const targetAddress = handles.address('target');
    const declarationAddress = handles.address('target-declaration');
    const typeProduct = handles.product('target-type');
    const typeSource = handles.address('target-type-source');
    const target = new ResourceTargetReference(
      targetIdentity,
      targetAddress,
      'Target',
      new CheckerTypeReference(
        typeProduct,
        handles.identity('target-type'),
        'target-type',
        'Target',
        CheckerTypeShapeKind.Class,
        CheckerTypeProjectionOrigin.TypeChecker,
        typeSource,
      ),
      'src/target',
      declarationAddress,
    );
    const targetReferences = resourceTargetReferenceKernelReferences(target);
    for (const handle of [targetIdentity, targetAddress, declarationAddress, typeSource]) {
      expectRecordReference(targetReferences, handle);
    }
    expectExactProductDetailReferences(targetReferences, [[TypeSystemDetailDescriptors.TypeShape, typeProduct]]);
    expect(resourceTargetReferenceKernelReferences(null)).toEqual([]);

    const nameAddress = handles.address('resource-name');
    const definitionAddress = handles.address('resource-definition');
    const namedTargetAddress = handles.address('resource-target');
    const named = {
      nameSourceAddressHandle: nameAddress,
      target: { addressHandle: namedTargetAddress },
      sourceAddressHandle: definitionAddress,
    } as unknown as FullResourceDefinition;
    expect(resourceDefinitionNameSourceAddressHandle(named)).toBe(nameAddress);
    expect(resourceDefinitionNameNavigationAddressHandle(named)).toBe(nameAddress);

    const namedWithoutExactSource = {
      nameSourceAddressHandle: null,
      target: { addressHandle: namedTargetAddress },
      sourceAddressHandle: definitionAddress,
    } as unknown as FullResourceDefinition;
    expect(resourceDefinitionNameSourceAddressHandle(namedWithoutExactSource)).toBeNull();
    expect(resourceDefinitionNameNavigationAddressHandle(namedWithoutExactSource)).toBe(namedTargetAddress);

    const syntaxDefinition = {
      target: { addressHandle: namedTargetAddress },
      sourceAddressHandle: definitionAddress,
    } as unknown as FullResourceDefinition;
    expect(resourceDefinitionNameSourceAddressHandle(syntaxDefinition)).toBeNull();
    expect(resourceDefinitionNameNavigationAddressHandle(syntaxDefinition)).toBe(definitionAddress);
  });

  test('projects every compact runtime reference to its exact rich-detail occupancy', () => {
    const handles = new KernelHandleFactory('compact-runtime-structural-references');
    const address = handles.address('source');
    const binding = handles.product('binding');
    const targetAccess = handles.product('target-access');
    const targetOperation = handles.product('target-operation');
    const sourceOperation = handles.product('source-operation');
    const valueChannel = handles.product('value-channel');
    const valueConverter = handles.product('value-converter');
    const watcher = handles.product('watcher');
    const computedObserver = handles.product('computed-observer');
    const effect = handles.product('effect');

    const cases = [
      {
        descriptor: TemplateDetailDescriptors.RuntimeBinding,
        handle: binding,
        references: runtimeBindingReferenceReferences(new RuntimeBindingReference(
          RuntimeBindingKind.Property,
          binding,
          handles.identity('binding'),
          address,
        )),
      },
      {
        descriptor: TemplateDetailDescriptors.RuntimeBindingTargetAccess,
        handle: targetAccess,
        references: runtimeBindingTargetAccessReferenceReferences(new RuntimeBindingTargetAccessReference(
          RuntimeBindingTargetAccessLookup.Observer,
          RuntimeBindingTargetKind.Node,
          'value',
          targetAccess,
          handles.identity('target-access'),
          address,
        )),
      },
      {
        descriptor: TemplateDetailDescriptors.RuntimeBindingTargetOperation,
        handle: targetOperation,
        references: runtimeBindingTargetOperationReferenceReferences(new RuntimeBindingTargetOperationReference(
          RuntimeBindingTargetOperationKind.PropertySet,
          RuntimeBindingTargetKind.Node,
          'value',
          'value',
          targetOperation,
          handles.identity('target-operation'),
          address,
        )),
      },
      {
        descriptor: TemplateDetailDescriptors.RuntimeBindingSourceOperation,
        handle: sourceOperation,
        references: runtimeBindingSourceOperationReferenceReferences(new RuntimeBindingSourceOperationReference(
          RuntimeBindingSourceOperationKind.RefAssignTarget,
          RuntimeBindingTargetKind.BindingContext,
          'element',
          sourceOperation,
          handles.identity('source-operation'),
          address,
        )),
      },
      {
        descriptor: ObservationProductDetails.RuntimeBindingValueChannel.descriptor,
        handle: valueChannel,
        references: runtimeBindingValueChannelReferenceReferences(new RuntimeBindingValueChannelReference(
          RuntimeBindingValueChannelKind.RawProperty,
          valueChannel,
          handles.identity('value-channel'),
          address,
        )),
      },
      {
        descriptor: TemplateDetailDescriptors.RuntimeValueConverterApplication,
        handle: valueConverter,
        references: runtimeValueConverterApplicationReferenceReferences(
          new RuntimeValueConverterApplicationReference(
            'identity',
            null,
            valueConverter,
            handles.identity('value-converter'),
            address,
          ),
        ),
      },
      {
        descriptor: TemplateDetailDescriptors.RuntimeWatcher,
        handle: watcher,
        references: runtimeWatcherReferenceReferences(new RuntimeWatcherReference(
          RuntimeWatcherKind.Expression,
          watcher,
          handles.identity('watcher'),
          address,
        )),
      },
      {
        descriptor: ObservationProductDetails.ComputedObserverSource.descriptor,
        handle: computedObserver,
        references: computedObserverSourceReferenceReferences(new ComputedObserverSourceReference(
          ComputedObserverRuntimeKind.ComputedObserver,
          computedObserver,
          handles.identity('computed-observer'),
          address,
        )),
      },
      {
        descriptor: ObservationProductDetails.RuntimeEffect.descriptor,
        handle: effect,
        references: runtimeEffectReferenceReferences(new RuntimeEffectReference(
          RuntimeEffectKind.Run,
          RuntimeEffectDependencyEvaluationKind.ConnectableRun,
          effect,
          handles.identity('effect'),
          address,
        )),
      },
    ] as const;

    for (const entry of cases) {
      expectExactProductDetailReferences(entry.references, [[entry.descriptor, entry.handle]]);
    }

    expect([
      runtimeBindingReferenceReferences(null),
      runtimeBindingTargetAccessReferenceReferences(null),
      runtimeBindingTargetOperationReferenceReferences(null),
      runtimeBindingSourceOperationReferenceReferences(null),
      runtimeBindingValueChannelReferenceReferences(null),
      runtimeValueConverterApplicationReferenceReferences(null),
      runtimeWatcherReferenceReferences(null),
      computedObserverSourceReferenceReferences(null),
      runtimeEffectReferenceReferences(null),
    ]).toEqual([[], [], [], [], [], [], [], [], []]);
  });

  test('retains exact rich-detail occupancy across embedded observation and state products', () => {
    const handles = new KernelHandleFactory('product-detail-structural-references');
    const sourceAddress = handles.address('source');

    const runtimeBindingProduct = handles.product('binding');
    const bindingDataFlowProduct = handles.product('binding-data-flow');
    const bindingAccessUseProduct = handles.product('binding-access-use');
    const expressionParseProduct = handles.product('expression-parse');
    const bindingDependency = new RuntimeBindingObservedDependency(
      handles.product('binding-dependency'),
      handles.identity('binding-dependency'),
      new RuntimeBindingReference(
        RuntimeBindingKind.Property,
        runtimeBindingProduct,
        handles.identity('binding'),
        sourceAddress,
      ),
      bindingDataFlowProduct,
      expressionParseProduct,
      null,
      RuntimeOperationRealization.Direct,
      runtimeObservedDependencyOccurrence({
        dependency: {
          accessUseProductHandle: bindingAccessUseProduct,
          accessUseSourceAddressHandle: sourceAddress,
          dependencyKind: RuntimeObservedDependencyKind.TemplateExpressionRead,
          expressionKind: 'AccessMember',
          sourceName: 'value',
          sourceRootName: 'value',
          memberName: 'member',
          keyExpression: null,
          methodName: null,
          spanStart: 0,
          spanEnd: 6,
          memberNameSpanStart: 0,
          memberNameSpanEnd: 6,
        },
        scope: null,
      }),
    );
    expectExactProductDetailReferences(
      ObservationProductDetails.RuntimeBindingObservedDependency.referencesFor(bindingDependency),
      [
        [TemplateDetailDescriptors.RuntimeBinding, runtimeBindingProduct],
        [ObservationProductDetails.RuntimeBindingDataFlow.descriptor, bindingDataFlowProduct],
        [RuntimeExpressionDetailDescriptors.AccessUse, bindingAccessUseProduct],
        [TemplateDetailDescriptors.ExpressionParse, expressionParseProduct],
      ],
    );

    const watcherProduct = handles.product('watcher');
    const watcherAccessUseProduct = handles.product('watcher-access-use');
    const watcherDependency = new RuntimeWatcherObservedDependency(
      handles.product('watcher-dependency'),
      handles.identity('watcher-dependency'),
      new RuntimeWatcherReference(
        RuntimeWatcherKind.Expression,
        watcherProduct,
        handles.identity('watcher'),
        sourceAddress,
      ),
      expressionParseProduct,
      runtimeObservedDependencyOccurrence({
        dependency: {
          accessUseProductHandle: watcherAccessUseProduct,
          accessUseSourceAddressHandle: sourceAddress,
          dependencyKind: RuntimeObservedDependencyKind.TemplateExpressionRead,
          expressionKind: 'AccessMember',
          sourceName: 'value',
          sourceRootName: 'value',
          memberName: 'member',
          keyExpression: null,
          methodName: null,
          spanStart: 0,
          spanEnd: 6,
        },
        scope: null,
      }),
    );
    expectExactProductDetailReferences(
      ObservationProductDetails.RuntimeWatcherObservedDependency.referencesFor(watcherDependency),
      [
        [TemplateDetailDescriptors.RuntimeWatcher, watcherProduct],
        [RuntimeExpressionDetailDescriptors.AccessUse, watcherAccessUseProduct],
        [TemplateDetailDescriptors.ExpressionParse, expressionParseProduct],
      ],
    );

    const dataFlow = new RuntimeBindingDataFlow(
      bindingDataFlowProduct,
      handles.identity('binding-data-flow'),
      bindingDependency.binding,
      [bindingAccessUseProduct],
      null,
      null,
      null,
      null,
      expressionParseProduct,
      null,
      RuntimeBindingDataFlowDirection.SourceToTarget,
      RuntimeOperationRealization.Direct,
      RuntimeBindingSourceEvaluationKind.ConnectableRead,
      RuntimeOperationReachability.Reached,
      RuntimeBindingValueChannelTargetMutationKind.WritesTarget,
      true,
      RuntimeBindingDataFlowSourceKind.Member,
      'value',
      'value',
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      [],
      true,
      RuntimeBindingDataFlowSourceAssignmentKind.RuntimeAssignable,
      null,
      [],
      true,
      false,
      [],
      [],
      null,
      null,
      sourceAddress,
    );
    expectExactProductDetailReferences(
      ObservationProductDetails.RuntimeBindingDataFlow.referencesFor(dataFlow),
      [
        [TemplateDetailDescriptors.RuntimeBinding, runtimeBindingProduct],
        [RuntimeExpressionDetailDescriptors.AccessUse, bindingAccessUseProduct],
        [TemplateDetailDescriptors.ExpressionParse, expressionParseProduct],
      ],
    );

    const computedObserverProduct = handles.product('computed-observer');
    const computedDependencyProduct = handles.product('computed-dependency');
    const computedObserverReference = new ComputedObserverSourceReference(
      ComputedObserverRuntimeKind.ComputedObserver,
      computedObserverProduct,
      handles.identity('computed-observer'),
      sourceAddress,
    );
    const computedDependency = new ComputedObserverObservedDependency(
      computedDependencyProduct,
      handles.identity('computed-dependency'),
      computedObserverReference,
      runtimeObservedDependencyOccurrence({
        dependency: {
          accessUseProductHandle: handles.product('computed-access-use'),
          accessUseSourceAddressHandle: sourceAddress,
          dependencyKind: RuntimeObservedDependencyKind.ProxyPropertyRead,
          expressionKind: 'AccessMember',
          sourceName: 'state',
          sourceRootName: 'state',
          memberName: 'value',
          keyExpression: null,
          methodName: null,
          spanStart: 0,
          spanEnd: 5,
        },
        scope: null,
      }),
    );
    const computedObserver = new ComputedObserverSource(
      computedObserverProduct,
      computedObserverReference.identityHandle!,
      'project',
      ComputedObserverRuntimeKind.ComputedObserver,
      ComputedObserverSourceTriggerKind.AccessorDescriptor,
      'ViewModel',
      'value',
      handles.identity('computed-member-declaration'),
      ComputedObservationDependencyMode.ProxyAutoTrack,
      [],
      0,
      'sync',
      null,
      [],
      [computedDependency],
      sourceAddress,
    );
    expectProductDetailReference(
      ObservationProductDetails.ComputedObserverSource.referencesFor(computedObserver),
      ObservationProductDetails.ComputedObserverObservedDependency.descriptor,
      computedDependencyProduct,
    );
    expectProductDetailReference(
      ObservationProductDetails.ComputedObserverObservedDependency.referencesFor(computedDependency),
      ObservationProductDetails.ComputedObserverSource.descriptor,
      computedObserverProduct,
    );

    const effectProduct = handles.product('runtime-effect');
    const effectDependencyProduct = handles.product('runtime-effect-dependency');
    const effectAccessUseProduct = handles.product('runtime-effect-access-use');
    const effectReference = new RuntimeEffectReference(
      RuntimeEffectKind.Run,
      RuntimeEffectDependencyEvaluationKind.ConnectableRun,
      effectProduct,
      handles.identity('runtime-effect'),
      sourceAddress,
    );
    const effectDependency = new RuntimeEffectObservedDependency(
      effectDependencyProduct,
      handles.identity('runtime-effect-dependency'),
      effectReference,
      runtimeObservedDependencyOccurrence({
        dependency: {
          accessUseProductHandle: effectAccessUseProduct,
          accessUseSourceAddressHandle: sourceAddress,
          dependencyKind: RuntimeObservedDependencyKind.ProxyPropertyRead,
          expressionKind: 'AccessMember',
          sourceName: 'state',
          sourceRootName: 'state',
          memberName: 'value',
          keyExpression: null,
          methodName: null,
          spanStart: 0,
          spanEnd: 5,
        },
        scope: null,
      }),
    );
    const effect = new RuntimeEffect(
      RuntimeEffectKind.Run,
      RuntimeEffectDependencyEvaluationKind.ConnectableRun,
      effectProduct,
      effectReference.identityHandle,
      true,
      [],
      [effectDependency],
      sourceAddress,
    );
    expectProductDetailReference(
      ObservationProductDetails.RuntimeEffect.referencesFor(effect),
      ObservationProductDetails.RuntimeEffectObservedDependency.descriptor,
      effectDependencyProduct,
    );
    expectProductDetailReference(
      ObservationProductDetails.RuntimeEffectObservedDependency.referencesFor(effectDependency),
      ObservationProductDetails.RuntimeEffect.descriptor,
      effectProduct,
    );
    expectProductDetailReference(
      ObservationProductDetails.RuntimeEffectObservedDependency.referencesFor(effectDependency),
      RuntimeExpressionDetailDescriptors.AccessUse,
      effectAccessUseProduct,
    );

    const storeProduct = handles.product('state-store');
    const getterBinding = new StateGetterBinding(
      handles.product('state-getter-binding'),
      handles.identity('state-getter-binding'),
      sourceAddress,
      sourceAddress,
      sourceAddress,
      'field',
      'items',
      null,
      StateGetterBindingStoreResolutionKind.DefaultStore,
      storeProduct,
      handles.identity('state-store'),
      '(state) => state.items',
      null,
      null,
      null,
    );
    expectProductDetailReference(
      StateProductDetails.GetterBinding.referencesFor(getterBinding),
      StateProductDetails.StoreConfiguration.descriptor,
      storeProduct,
    );

    const containerProduct = handles.product('state-store-container');
    const containerIdentity = handles.identity('state-store-container');
    const registrationProduct = handles.product('state-store-registration');
    const registrationAdmissionProduct = handles.product('state-store-registration-admission');
    const registrationSource = handles.address('state-store-registration');
    const configurationStepProduct = handles.product('state-store-configuration-step');
    const configurationStepIdentity = handles.identity('state-store-configuration-step');
    const configurationValueSource = handles.address('state-store-configuration-value');
    const fieldProvenance = handles.provenance('state-store-container-field');
    const storeConfiguration = new StateStoreConfiguration(
      storeProduct,
      handles.identity('state-store'),
      new ContainerReference(containerIdentity, containerProduct, sourceAddress, 'root'),
      registrationProduct,
      registrationAdmissionProduct,
      registrationSource,
      configurationStepProduct,
      configurationStepIdentity,
      configurationValueSource,
      null,
      true,
      null,
      'absent',
      0,
      sourceAddress,
      null,
      null,
      null,
      null,
      [],
      [new FieldProvenance('container', fieldProvenance)],
    );
    const storeReferences = StateProductDetails.StoreConfiguration.referencesFor(storeConfiguration);
    for (const handle of [
      containerProduct,
      containerIdentity,
      sourceAddress,
      registrationProduct,
      registrationAdmissionProduct,
      registrationSource,
      configurationStepProduct,
      configurationStepIdentity,
      configurationValueSource,
      fieldProvenance,
    ]) {
      expectRecordReference(storeReferences, handle);
    }
  });

  test('preserves exact producer occupancies across scope, framework, and resource carriers', () => {
    const handles = new KernelHandleFactory('production-product-detail-structural-references');
    const sourceAddress = handles.address('source');
    const assignmentInstructionProduct = handles.product('assignment-instruction');
    const scopeProduct = handles.product('scope');
    const bindingContextProduct = handles.product('binding-context');
    const overrideContextProduct = handles.product('override-context');
    const bindingContext = new BindingContext(
      bindingContextProduct,
      handles.identity('binding-context'),
      BindingContextKind.ViewModel,
      null,
      null,
      [],
      sourceAddress,
    );
    const overrideContext = new OverrideContext(
      overrideContextProduct,
      handles.identity('override-context'),
      scopeProduct,
      null,
      [],
      sourceAddress,
    );
    const scope = new BindingScope(
      scopeProduct,
      handles.identity('scope'),
      null,
      bindingContext,
      overrideContext,
      false,
      BindingScopeOwnerKind.SyntheticView,
      sourceAddress,
      [],
      [new BindingScopeCreator(
        BindingScopeCreatorKind.RuntimeAssignment,
        assignmentInstructionProduct,
        sourceAddress,
      )],
    );
    expectExactProductDetailReferences(
      ConfigurationProductDetails.BindingScope.referencesFor(scope),
      [
        [ConfigurationProductDetails.BindingContext.descriptor, bindingContextProduct],
        [ConfigurationProductDetails.OverrideContext.descriptor, overrideContextProduct],
        [TemplateDetailDescriptors.Instruction, assignmentInstructionProduct],
      ],
    );

    const definitionProduct = handles.product('resource-definition');
    const analysisContextProduct = handles.product('template-analysis-context');
    const demand = new FrameworkCapabilityDemand(
      handles.product('capability-demand'),
      handles.identity('capability-demand'),
      'project',
      FrameworkCapabilityDemandSiteKind.TemplateElement,
      FrameworkCapabilityDemandKind.RuntimeHtmlDefaultResources,
      FrameworkRegistrationCapability.RuntimeHtmlDefaultResources,
      [FrameworkRegistrationKind.StandardConfiguration],
      ['@aurelia/runtime-html'],
      FrameworkCapabilityAdmissionState.Admitted,
      [],
      FrameworkCapabilityAvailabilityState.EvidenceFound,
      [],
      '@aurelia/runtime-html',
      'if',
      sourceAddress,
      null,
      sourceAddress,
      definitionProduct,
      analysisContextProduct,
    );
    expectExactProductDetailReferences(
      FrameworkProductDetails.CapabilityDemand.referencesFor(demand),
      [
        [ResourceDetailDescriptors.Definition, definitionProduct],
        [TemplateDetailDescriptors.World, analysisContextProduct],
      ],
    );

    const headerProduct = handles.product('built-in-resource-header');
    const classification = new AttributeClassification(
      handles.product('attribute-syntax'),
      new HtmlNodeReference(HtmlIrNodeKind.Element, null, null, sourceAddress),
      AttributeClassificationKind.CustomAttribute,
      ResourceDefinitionKind.CustomElement,
      new TemplateVisibleResource(
        ResourceDefinitionKind.CustomElement,
        'built-in-element',
        [],
        headerProduct,
        handles.identity('built-in-resource-header'),
        definitionProduct,
        TemplateResourceVisibilityKind.Configured,
        sourceAddress,
      ),
      null,
      null,
    );
    expectExactProductDetailReferences(
      TemplateProductDetails.AttributeClassification.referencesFor(classification),
      [
        [TemplateDetailDescriptors.AttributeSyntax, classification.syntaxProductHandle],
        [ResourceDetailDescriptors.DefinitionHeader, headerProduct],
        [ResourceDetailDescriptors.Definition, definitionProduct],
      ],
    );
  });
});

function expectExactProductDetailReferences(
  references: readonly KernelDetailReference[],
  expected: readonly (readonly [ProductDetailDescriptor<unknown>, ProductHandle])[],
): void {
  expect(references.filter((reference) => reference.surface === KernelPublicationSurface.ProductDetail)).toEqual(
    expected
      .map(([descriptor, handle]) => new KernelProductDetailReference(handle, descriptor.detailKind))
      .sort((left, right) => left.key.localeCompare(right.key)),
  );
}

function expectProductDetailReference(
  references: readonly KernelDetailReference[],
  descriptor: ProductDetailDescriptor<unknown>,
  handle: ProductHandle,
): void {
  expect(references).toContainEqual(expect.objectContaining({
    surface: KernelPublicationSurface.ProductDetail,
    handle,
    detailKind: descriptor.detailKind,
  }));
}

function expectRecordReference(
  references: readonly KernelDetailReference[],
  handle: KernelRecordHandle,
): void {
  expect(references).toContainEqual(expect.objectContaining({
    surface: KernelPublicationSurface.Record,
    handle,
    detailKind: null,
  }));
}
