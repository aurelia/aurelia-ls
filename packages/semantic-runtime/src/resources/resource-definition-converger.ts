import {
  existsSync,
  readFileSync,
} from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import {
  SourceSpanAddress,
  SourceSpanRole,
} from '../kernel/address.js';
import { SemanticClaim } from '../kernel/claim.js';
import {
  EvidenceKind,
  EvidenceRecord,
  EvidenceRole,
} from '../kernel/evidence.js';
import type {
  AddressHandle,
  ClaimHandle,
  EvidenceHandle,
  IdentityHandle,
  OpenSeamHandle,
  ProductHandle,
  ProvenanceHandle,
} from '../kernel/handles.js';
import {
  AureliaResourceIdentity,
} from '../kernel/identity.js';
import {
  MaterializationRecord,
  MaterializedProduct,
} from '../kernel/materialization.js';
import {
  compactFieldProvenance,
  FieldProvenance,
  ProvenanceRecord,
} from '../kernel/provenance.js';
import {
  KernelStoreBatch,
  type KernelStore,
  type KernelStoreRecord,
} from '../kernel/store.js';
import {
  recordsForSourceOpenSeam,
  SourceOpenSeamInput,
} from '../kernel/source-open-seam.js';
import { KernelVocabulary } from '../kernel/vocabulary.js';
import {
  EvaluationRead,
  readStaticStringArrayValue,
  readStaticStringValue,
  type StaticEvaluationExpressionReader,
} from '../evaluation/expression-reader.js';
import {
  readPropertyName,
  unwrapExpression,
} from '../evaluation/ts-syntax.js';
import {
  EvaluationValueKind,
  type EvaluationObjectValue,
  type EvaluationValue,
} from '../evaluation/values.js';
import {
  AttributePatternDefinition,
  AttributePatternDefinitionContribution,
  AttributePatternDefinitionContributionKind,
  AttributePatternDefinitionEntry,
  type AttributePatternDefinitionField,
} from './attribute-pattern-definition.js';
import {
  BindableBindingMode,
  BindableContributionKind,
  BindableDefinition,
  BindableDefinitionContribution,
  BindableSetterDefinition,
  BindableSetterKind,
  type BindableDefinitionField,
} from './bindable-definition.js';
import {
  BindingBehaviorDefinition,
  BindingBehaviorDefinitionContribution,
  BindingBehaviorDefinitionContributionKind,
  type BindingBehaviorDefinitionField,
} from './binding-behavior-definition.js';
import {
  BindingCommandDefinition,
  BindingCommandDefinitionContribution,
  BindingCommandDefinitionContributionKind,
  type BindingCommandDefinitionField,
} from './binding-command-definition.js';
import {
  CustomAttributeContainerStrategy,
  CustomAttributeDefinition,
  CustomAttributeDefinitionContribution,
  CustomAttributeDefinitionContributionKind,
  type CustomAttributeDefinitionField,
} from './custom-attribute-definition.js';
import {
  CustomElementCaptureDefinition,
  CustomElementCaptureKind,
  CustomElementDefinition,
  CustomElementDefinitionContribution,
  CustomElementDefinitionContributionKind,
  type CustomElementDefinitionField,
  CustomElementTemplateDefinition,
  CustomElementTemplateKind,
  ShadowOptionsDefinition,
  ShadowRootMode,
  TemplateSourceOffsetMap,
} from './custom-element-definition.js';
import {
  AttributePatternDefinitionHeader,
  BindingBehaviorDefinitionHeader,
  BindingCommandDefinitionHeader,
  CustomAttributeDefinitionHeader,
  CustomElementDefinitionHeader,
  type FullResourceDefinition,
  type NamedResourceDefinitionHeader,
  type ResourceDefinitionHeader,
  TemplateControllerDefinitionHeader,
  ValueConverterDefinitionHeader,
} from './resource-definition.js';
import type { ResourceRecognitionContext } from './resource-recognition-context.js';
import type {
  ResourceRecognitionObservation,
  ResourceTargetObservation,
} from './resource-observation.js';
import {
  ResourceDefinitionKind,
  runtimeResourceKeyForKind,
  toAureliaResourceIdentityKind,
} from './resource-kind.js';
import type { ResourceDefinitionHeaderEmission } from './resource-definition-header-emission.js';
import type { ResourceRecognitionKernelEmission } from './resource-recognition-kernel-emitter.js';
import {
  ResourceAliasDefinition,
  ResourceDependencyReference,
  ResourceTargetReference,
} from './resource-reference.js';
import { ResourceProductDetails } from './product-details.js';
import {
  ValueConverterDefinition,
  ValueConverterDefinitionContribution,
  ValueConverterDefinitionContributionKind,
  type ValueConverterDefinitionField,
} from './value-converter-definition.js';

export class ResourceDefinitionConvergenceEmission {
  constructor(
    /** Full resource definitions converged from recognized source headers. */
    readonly definitions: readonly FullResourceDefinition[],
    /** Kernel records committed by this convergence pass. */
    readonly records: readonly KernelStoreRecord[],
  ) {}
}

class ResourceDefinitionConvergenceProduct {
  constructor(
    readonly records: readonly KernelStoreRecord[],
    readonly definition: FullResourceDefinition | null,
  ) {}
}

class ConvergedResourceDefinition {
  constructor(
    readonly definition: FullResourceDefinition,
    readonly open: readonly ConvergenceOpen[],
    readonly records: readonly KernelStoreRecord[] = [],
  ) {}
}

class ConvergenceSourceSet {
  constructor(
    readonly records: readonly KernelStoreRecord[],
    readonly provenanceHandle: ProvenanceHandle,
  ) {}
}

class ConvergenceOpen {
  constructor(
    readonly summary: string,
    readonly node: ts.Node,
  ) {}
}

function convergenceOpenForNode(
  summary: string,
  node: ts.Node | null | undefined,
): readonly ConvergenceOpen[] {
  return node == null ? [] : [new ConvergenceOpen(summary, node)];
}

function nullableConvergenceOpenForNode(
  summary: string,
  node: ts.Node | null | undefined,
): ConvergenceOpen | null {
  return convergenceOpenForNode(summary, node)[0] ?? null;
}

function appendConvergenceOpen(
  opens: ConvergenceOpen[],
  summary: string,
  node: ts.Node | null | undefined,
): void {
  const open = nullableConvergenceOpenForNode(summary, node);
  if (open != null) {
    opens.push(open);
  }
}

function convergenceOpenForRead(
  summary: string,
  read: EvaluationRead<EvaluationValue> | null,
): readonly ConvergenceOpen[] {
  return convergenceOpenForNode(summary, read?.node ?? read?.value?.node);
}

function nullableConvergenceOpenForRead(
  summary: string,
  read: EvaluationRead<EvaluationValue> | null,
): ConvergenceOpen | null {
  return convergenceOpenForRead(summary, read)[0] ?? null;
}

class BindableRead {
  constructor(
    readonly bindables: readonly BindableDefinition[],
    readonly contributions: readonly BindableDefinitionContribution[],
    readonly open: readonly ConvergenceOpen[],
    readonly records: readonly KernelStoreRecord[] = [],
  ) {}
}

class TemplateDefinitionRead {
  constructor(
    readonly template: CustomElementTemplateDefinition,
    readonly records: readonly KernelStoreRecord[] = [],
  ) {}
}

class ResourceDependenciesRead {
  constructor(
    readonly dependencies: readonly ResourceDependencyReference[],
    readonly open: readonly ConvergenceOpen[],
  ) {}
}

class TemplateSourceAddressSet {
  constructor(
    readonly records: readonly KernelStoreRecord[],
    readonly addressHandle: AddressHandle,
    readonly sourceMap: TemplateSourceOffsetMap | null,
  ) {}
}

class SourceSpanAddressSet {
  constructor(
    readonly records: readonly KernelStoreRecord[],
    readonly addressHandle: AddressHandle,
  ) {}
}

class InlineTemplateMarkupSource {
  constructor(
    readonly contentStart: number,
    readonly contentEnd: number,
    readonly sourceMap: TemplateSourceOffsetMap | null,
  ) {}
}

class ResourceAliasClaimsEmission {
  constructor(
    readonly records: readonly KernelStoreRecord[],
    readonly claimHandles: readonly ClaimHandle[],
  ) {}
}

class ResourceAliasClaimEmission {
  constructor(
    readonly records: readonly KernelStoreRecord[],
    readonly claimHandle: ClaimHandle,
  ) {}
}

type AliasableResourceDefinitionHeader =
  | CustomElementDefinitionHeader
  | CustomAttributeDefinitionHeader
  | TemplateControllerDefinitionHeader
  | ValueConverterDefinitionHeader
  | BindingBehaviorDefinitionHeader
  | BindingCommandDefinitionHeader;

function emptyResourceAliasClaims(): ResourceAliasClaimsEmission {
  return new ResourceAliasClaimsEmission([], []);
}

function aliasableResourceHeader(
  headerDefinition: ResourceDefinitionHeader,
): AliasableResourceDefinitionHeader | null {
  if (
    headerDefinition instanceof CustomElementDefinitionHeader
    || headerDefinition instanceof CustomAttributeDefinitionHeader
    || headerDefinition instanceof TemplateControllerDefinitionHeader
    || headerDefinition instanceof ValueConverterDefinitionHeader
    || headerDefinition instanceof BindingBehaviorDefinitionHeader
    || headerDefinition instanceof BindingCommandDefinitionHeader
  ) {
    return headerDefinition;
  }
  return null;
}

function aliasesForDefinition(
  definition: FullResourceDefinition,
): readonly ResourceAliasDefinition[] | null {
  return 'aliases' in definition ? definition.aliases : null;
}

function newAliasNames(
  headerAliases: readonly string[],
  aliases: readonly ResourceAliasDefinition[],
): readonly string[] {
  const seenHeaderAliases = new Set(headerAliases);
  return aliases
    .map((alias) => alias.name)
    .filter((alias) => !seenHeaderAliases.has(alias));
}

/** Turns recognized resource headers and source metadata into compiler-consumable definition products. */
export class ResourceDefinitionConverger {
  constructor(
    /** Hot analysis store that receives converged resource definition records. */
    readonly store: KernelStore,
  ) {}

  converge(
    context: ResourceRecognitionContext,
    observations: readonly ResourceRecognitionObservation[],
    headerEmission: ResourceRecognitionKernelEmission,
  ): ResourceDefinitionConvergenceEmission {
    const records: KernelStoreRecord[] = [];
    const definitions: FullResourceDefinition[] = [];

    for (const header of headerEmission.definitions) {
      const observation = observations[header.observationIndex] ?? null;
      if (observation?.definition == null) {
        continue;
      }
      const product = this.recordsForDefinition(context, observation, header);
      records.push(...product.records);
      if (product.definition != null) {
        definitions.push(product.definition);
      }
    }

    if (records.length > 0) {
      this.store.commit(new KernelStoreBatch(records, `resource-definition-convergence:${context.moduleKey}`));
    }
    for (const definition of definitions) {
      if (definition.productHandle != null) {
        this.store.productDetails.add(ResourceProductDetails.Definition, definition.productHandle, definition);
      }
    }

    return new ResourceDefinitionConvergenceEmission(definitions, records);
  }

  private recordsForDefinition(
    context: ResourceRecognitionContext,
    observation: ResourceRecognitionObservation,
    header: ResourceDefinitionHeaderEmission,
  ): ResourceDefinitionConvergenceProduct {
    if (observation.definition == null) {
      return new ResourceDefinitionConvergenceProduct([], null);
    }
    const definitionProductHandle = this.store.handles.product(`resource-definition-converged:${header.localKey}`);
    if (this.store.readProduct(definitionProductHandle) != null) {
      return new ResourceDefinitionConvergenceProduct([], null);
    }

    const source = this.recordsForConvergenceSource(observation, header);
    const converged = this.convergeDefinition(context, observation, header, definitionProductHandle, source.provenanceHandle);
    if (converged == null) {
      return new ResourceDefinitionConvergenceProduct([], null);
    }
    return this.convergenceProductForDefinition(context, observation.definition, header, source, converged);
  }

  private convergenceProductForDefinition(
    context: ResourceRecognitionContext,
    sourceDefinition: ResourceDefinitionHeader,
    header: ResourceDefinitionHeaderEmission,
    source: ConvergenceSourceSet,
    converged: ConvergedResourceDefinition,
  ): ResourceDefinitionConvergenceProduct {
    const definition = converged.definition;
    const aliasClaims = this.recordsForNewAliasClaims(sourceDefinition, definition, header, source.provenanceHandle);
    const convergenceClaim = this.convergenceClaimForDefinition(header, definition, source);
    const openSeams = this.recordsForOpenSeams(context, header, converged.open);
    const records = [
      ...source.records,
      ...converged.records,
      ...aliasClaims.records,
      convergenceClaim,
      ...openSeams.records,
      ...this.recordsForDefinitionEnvelope(header, definition, source, [
        convergenceClaim.handle,
        ...aliasClaims.claimHandles,
      ], openSeams.handles),
    ];
    return new ResourceDefinitionConvergenceProduct(records, definition);
  }

  private convergenceClaimForDefinition(
    header: ResourceDefinitionHeaderEmission,
    definition: FullResourceDefinition,
    source: ConvergenceSourceSet,
  ): SemanticClaim {
    return new SemanticClaim(
      this.store.handles.claim(`resource-definition-convergence:${header.localKey}:converges`),
      header.productHandle,
      KernelVocabulary.Resource.ConvergesToDefinition.key,
      definition.productHandle!,
      source.provenanceHandle,
    );
  }

  private recordsForDefinitionEnvelope(
    header: ResourceDefinitionHeaderEmission,
    definition: FullResourceDefinition,
    source: ConvergenceSourceSet,
    claimHandles: readonly ClaimHandle[],
    openSeamHandles: readonly OpenSeamHandle[],
  ): readonly KernelStoreRecord[] {
    return [
      new MaterializedProduct(
        definition.productHandle!,
        KernelVocabulary.Resource.Definition.key,
        header.primaryIdentityHandle,
        header.sourceAddressHandle,
        source.provenanceHandle,
      ),
      new MaterializationRecord(
        this.store.handles.materialization(`resource-definition-convergence:${header.localKey}`),
        header.primaryIdentityHandle ?? header.sourceAddressHandle,
        [definition.productHandle!],
        claimHandles,
        openSeamHandles,
      ),
    ];
  }

  private recordsForConvergenceSource(
    observation: ResourceRecognitionObservation,
    header: ResourceDefinitionHeaderEmission,
  ): ConvergenceSourceSet {
    const local = `resource-definition-convergence:${header.localKey}`;
    const evidenceHandle = this.store.handles.evidence(local);
    const provenanceHandle = this.store.handles.provenance(local);
    const records: KernelStoreRecord[] = [
      new EvidenceRecord(
        evidenceHandle,
        EvidenceKind.SemanticObservation,
        [EvidenceRole.Declaration, EvidenceRole.TransformInput],
        `Resource definition convergence for ${observation.definition?.type ?? 'unknown resource'}.`,
        header.sourceAddressHandle,
      ),
      new ProvenanceRecord(
        provenanceHandle,
        [evidenceHandle, ...this.evidenceHandlesForProvenance(header.provenanceHandle)],
      ),
    ];
    return new ConvergenceSourceSet(records, provenanceHandle);
  }

  private evidenceHandlesForProvenance(provenanceHandle: ProvenanceHandle): readonly EvidenceHandle[] {
    return this.store.readProvenance(provenanceHandle)?.evidenceHandles ?? [];
  }

  private convergeDefinition(
    context: ResourceRecognitionContext,
    observation: ResourceRecognitionObservation,
    header: ResourceDefinitionHeaderEmission,
    productHandle: ProductHandle,
    provenanceHandle: ProvenanceHandle,
  ): ConvergedResourceDefinition | null {
    const definition = observation.definition;
    if (definition == null) {
      return null;
    }
    switch (definition.type) {
      case ResourceDefinitionKind.CustomElement:
        return this.convergeCustomElement(context, definition, observation, header, productHandle, provenanceHandle);
      case ResourceDefinitionKind.CustomAttribute:
      case ResourceDefinitionKind.TemplateController:
        return this.convergeCustomAttribute(context, definition, observation, header, productHandle, provenanceHandle);
      case ResourceDefinitionKind.ValueConverter:
      case ResourceDefinitionKind.BindingBehavior:
      case ResourceDefinitionKind.BindingCommand:
        return this.convergeThinNamedResource(definition, header, productHandle, provenanceHandle);
      case ResourceDefinitionKind.AttributePattern:
        return this.convergeAttributePattern(definition, header, productHandle, provenanceHandle);
    }
  }

  private convergeCustomElement(
    context: ResourceRecognitionContext,
    definition: CustomElementDefinitionHeader,
    observation: ResourceRecognitionObservation,
    header: ResourceDefinitionHeaderEmission,
    productHandle: ProductHandle,
    provenanceHandle: ProvenanceHandle,
  ): ConvergedResourceDefinition | null {
    const target = header.targetReference;
    const name = definition.name;
    const key = name == null ? null : runtimeResourceKeyForKind(definition.type, name);
    if (target == null || name == null || key == null) {
      return null;
    }

    const targetClass = classNodeForTarget(definition.target);
    const definitionExpression = expressionNode(observation.definitionNode);
    const bindables = readBindables(
      this.store,
      context,
      `resource-definition-converged:${header.localKey}:bindable`,
      definitionExpression,
      targetClass,
      provenanceHandle,
    );
    const aliases = mergeAliases(definition.aliases, readStaticStringArrayClassProperty(context, targetClass, 'aliases'));
    const capture = readCustomElementCapture(context, definitionExpression, targetClass);
    const template = readCustomElementTemplate(
      this.store,
      context,
      definitionExpression,
      targetClass,
      `resource-definition-converged:${header.localKey}:template`,
    );
    const dependencies = readResourceDependencies(context, definitionExpression, targetClass);
    const containerless = readBooleanField(context, definitionExpression, targetClass, 'containerless') ?? false;
    const shadowOptions = readShadowOptions(context, definitionExpression, targetClass);
    const hasSlots = readBooleanField(context, definitionExpression, targetClass, 'hasSlots') ?? false;
    const enhance = readBooleanField(context, definitionExpression, targetClass, 'enhance') ?? false;
    const needsCompile = readBooleanField(context, definitionExpression, targetClass, 'needsCompile') ?? true;
    const strict = readBooleanField(context, definitionExpression, targetClass, 'strict');
    const processContent = readTargetField(context, definitionExpression, targetClass, 'processContent');
    const open = [
      ...bindables.open,
      ...dependencies.open,
      ...openIfPresent(context, definitionExpression, targetClass, 'instructions', 'Custom element instructions are present before template lowering is modeled.'),
      ...openIfPresent(context, definitionExpression, targetClass, 'surrogates', 'Custom element surrogates are present before surrogate lowering is modeled.'),
      ...openIfPresent(context, definitionExpression, targetClass, 'watches', 'Custom element watches are present but watch convergence is still deferred.'),
    ];
    const fieldProvenance = fieldProvenanceFor<CustomElementDefinitionField>(provenanceHandle, [
      'target',
      'name',
      'aliases',
      'key',
      'capture',
      'template',
      'instructions',
      'dependencies',
      'injectable',
      'needsCompile',
      'surrogates',
      'bindables',
      'containerless',
      'shadowOptions',
      'hasSlots',
      'enhance',
      'watches',
      'strict',
      'processContent',
    ]);

    const aliasDefinitions = aliases.map((alias) => new ResourceAliasDefinition(alias, header.sourceAddressHandle, provenanceHandle));
    return new ConvergedResourceDefinition(
      new CustomElementDefinition(
        productHandle,
        header.primaryIdentityHandle,
        header.sourceAddressHandle,
        target,
        name,
        aliasDefinitions,
        key,
        capture,
        template.template,
        [],
        dependencies.dependencies,
        null,
        needsCompile,
        [],
        bindables.bindables,
        containerless,
        shadowOptions,
        hasSlots,
        enhance,
        [],
        strict,
        processContent,
        [
          new CustomElementDefinitionContribution(
            CustomElementDefinitionContributionKind.Header,
            target,
            name,
            aliasDefinitions,
            key,
            capture,
            template.template,
            [],
            dependencies.dependencies,
            null,
            needsCompile,
            [],
            bindables.contributions,
            containerless,
            shadowOptions,
            hasSlots,
            enhance,
            [],
            strict,
            processContent,
            fieldProvenance,
          ),
        ],
        fieldProvenance,
      ),
      open,
      [
        ...template.records,
        ...bindables.records,
      ],
    );
  }

  private convergeCustomAttribute(
    context: ResourceRecognitionContext,
    definition: CustomAttributeDefinitionHeader | TemplateControllerDefinitionHeader,
    observation: ResourceRecognitionObservation,
    header: ResourceDefinitionHeaderEmission,
    productHandle: ProductHandle,
    provenanceHandle: ProvenanceHandle,
  ): ConvergedResourceDefinition | null {
    const target = header.targetReference;
    const name = definition.name;
    const key = name == null ? null : runtimeResourceKeyForKind(definition.type, name);
    if (target == null || name == null || key == null) {
      return null;
    }

    const targetClass = classNodeForTarget(definition.target);
    const definitionExpression = expressionNode(observation.definitionNode);
    const bindables = readBindables(
      this.store,
      context,
      `resource-definition-converged:${header.localKey}:bindable`,
      definitionExpression,
      targetClass,
      provenanceHandle,
    );
    const aliases = mergeAliases(definition.aliases, readStaticStringArrayClassProperty(context, targetClass, 'aliases'));
    const isTemplateController = definition.type === ResourceDefinitionKind.TemplateController
      || readBooleanField(context, definitionExpression, targetClass, 'isTemplateController') === true;
    const noMultiBindings = readBooleanField(context, definitionExpression, targetClass, 'noMultiBindings') ?? false;
    const defaultProperty = readStringField(context, definitionExpression, targetClass, 'defaultProperty') ?? 'value';
    const containerStrategy = readContainerStrategy(context, definitionExpression, targetClass);
    const dependencies = readResourceDependencies(context, definitionExpression, targetClass);
    const open = [
      ...bindables.open,
      ...dependencies.open,
      ...openIfPresent(context, definitionExpression, targetClass, 'watches', 'Custom attribute watches are present but watch convergence is still deferred.'),
    ];
    const fieldProvenance = fieldProvenanceFor<CustomAttributeDefinitionField>(provenanceHandle, [
      'target',
      'name',
      'aliases',
      'key',
      'isTemplateController',
      'bindables',
      'noMultiBindings',
      'watches',
      'dependencies',
      'containerStrategy',
      'defaultProperty',
    ]);

    const aliasDefinitions = aliases.map((alias) => new ResourceAliasDefinition(alias, header.sourceAddressHandle, provenanceHandle));
    return new ConvergedResourceDefinition(
      new CustomAttributeDefinition(
        productHandle,
        header.primaryIdentityHandle,
        header.sourceAddressHandle,
        target,
        name,
        aliasDefinitions,
        key,
        isTemplateController,
        bindables.bindables,
        noMultiBindings,
        [],
        dependencies.dependencies,
        containerStrategy,
        defaultProperty,
        [
          new CustomAttributeDefinitionContribution(
            CustomAttributeDefinitionContributionKind.Header,
            target,
            name,
            aliasDefinitions,
            key,
            isTemplateController,
            bindables.contributions,
            noMultiBindings,
            [],
            dependencies.dependencies,
            containerStrategy,
            defaultProperty,
            fieldProvenance,
          ),
        ],
        fieldProvenance,
      ),
      open,
      bindables.records,
    );
  }

  private convergeThinNamedResource(
    definition: NamedResourceDefinitionHeader,
    header: ResourceDefinitionHeaderEmission,
    productHandle: ProductHandle,
    provenanceHandle: ProvenanceHandle,
  ): ConvergedResourceDefinition | null {
    if (
      !(definition instanceof ValueConverterDefinitionHeader)
      && !(definition instanceof BindingBehaviorDefinitionHeader)
      && !(definition instanceof BindingCommandDefinitionHeader)
    ) {
      return null;
    }

    const target = header.targetReference;
    const name = definition.name;
    const key = name == null ? null : runtimeResourceKeyForKind(definition.type, name);
    if (target == null || name == null || key == null) {
      return null;
    }

    const aliases = definition.aliases.map((alias) => new ResourceAliasDefinition(alias, header.sourceAddressHandle, provenanceHandle));
    switch (definition.type) {
      case ResourceDefinitionKind.ValueConverter: {
        const fieldProvenance = fieldProvenanceFor<ValueConverterDefinitionField>(provenanceHandle, ['target', 'name', 'aliases', 'key']);
        return new ConvergedResourceDefinition(
          new ValueConverterDefinition(
            productHandle,
            header.primaryIdentityHandle,
            header.sourceAddressHandle,
            target,
            name,
            aliases,
            key,
            [new ValueConverterDefinitionContribution(ValueConverterDefinitionContributionKind.Header, target, name, aliases, key, fieldProvenance)],
            fieldProvenance,
          ),
          [],
        );
      }
      case ResourceDefinitionKind.BindingBehavior: {
        const fieldProvenance = fieldProvenanceFor<BindingBehaviorDefinitionField>(provenanceHandle, ['target', 'name', 'aliases', 'key']);
        return new ConvergedResourceDefinition(
          new BindingBehaviorDefinition(
            productHandle,
            header.primaryIdentityHandle,
            header.sourceAddressHandle,
            target,
            name,
            aliases,
            key,
            [new BindingBehaviorDefinitionContribution(BindingBehaviorDefinitionContributionKind.Header, target, name, aliases, key, fieldProvenance)],
            fieldProvenance,
          ),
          [],
        );
      }
      case ResourceDefinitionKind.BindingCommand: {
        const fieldProvenance = fieldProvenanceFor<BindingCommandDefinitionField>(provenanceHandle, ['target', 'name', 'aliases', 'key']);
        return new ConvergedResourceDefinition(
          new BindingCommandDefinition(
            productHandle,
            header.primaryIdentityHandle,
            header.sourceAddressHandle,
            target,
            name,
            aliases,
            key,
            [new BindingCommandDefinitionContribution(BindingCommandDefinitionContributionKind.Header, target, name, aliases, key, fieldProvenance)],
            fieldProvenance,
          ),
          [],
        );
      }
      default:
        return null;
    }
  }

  private convergeAttributePattern(
    definition: AttributePatternDefinitionHeader,
    header: ResourceDefinitionHeaderEmission,
    productHandle: ProductHandle,
    provenanceHandle: ProvenanceHandle,
  ): ConvergedResourceDefinition | null {
    const target = header.targetReference;
    if (target == null) {
      return null;
    }

    const entries = definition.patterns.map((pattern) => new AttributePatternDefinitionEntry(
      pattern.pattern,
      pattern.symbols,
      header.sourceAddressHandle,
      provenanceHandle,
    ));
    const fieldProvenance = fieldProvenanceFor<AttributePatternDefinitionField>(provenanceHandle, ['target', 'patterns']);
    return new ConvergedResourceDefinition(
      new AttributePatternDefinition(
        productHandle,
        header.primaryIdentityHandle,
        header.sourceAddressHandle,
        target,
        entries,
        [new AttributePatternDefinitionContribution(
          AttributePatternDefinitionContributionKind.Header,
          target,
          entries,
          fieldProvenance,
        )],
        fieldProvenance,
      ),
      [],
    );
  }

  private recordsForNewAliasClaims(
    headerDefinition: ResourceDefinitionHeader,
    definition: FullResourceDefinition,
    header: ResourceDefinitionHeaderEmission,
    provenanceHandle: ProvenanceHandle,
  ): ResourceAliasClaimsEmission {
    const aliasHeader = aliasableResourceHeader(headerDefinition);
    const aliases = aliasesForDefinition(definition);
    const primaryIdentityHandle = header.primaryIdentityHandle;
    if (aliasHeader == null || aliases == null || primaryIdentityHandle == null) {
      return emptyResourceAliasClaims();
    }

    const emissions = newAliasNames(aliasHeader.aliases, aliases).map((alias, index) =>
      this.recordsForNewAliasClaim(alias, index, aliasHeader, header, primaryIdentityHandle, provenanceHandle)
    );
    return new ResourceAliasClaimsEmission(
      emissions.flatMap((emission) => emission.records),
      emissions.map((emission) => emission.claimHandle),
    );
  }

  private recordsForNewAliasClaim(
    alias: string,
    index: number,
    headerDefinition: AliasableResourceDefinitionHeader,
    header: ResourceDefinitionHeaderEmission,
    primaryIdentityHandle: IdentityHandle,
    provenanceHandle: ProvenanceHandle,
  ): ResourceAliasClaimEmission {
    const aliasIdentityHandle = this.store.handles.identity(`resource-definition-converged:${header.localKey}:alias:${alias}:${index}`);
    const aliasClaimHandle = this.store.handles.claim(`resource-definition-converged:${header.localKey}:alias:${index}`);
    return new ResourceAliasClaimEmission(
      [
        new AureliaResourceIdentity(
          aliasIdentityHandle,
          toAureliaResourceIdentityKind(headerDefinition.type),
          alias,
          header.targetReference?.identityHandle ?? null,
        ),
        new SemanticClaim(
          aliasClaimHandle,
          aliasIdentityHandle,
          KernelVocabulary.Resource.AliasOf.key,
          primaryIdentityHandle,
          provenanceHandle,
        ),
      ],
      aliasClaimHandle,
    );
  }

  private recordsForOpenSeams(
    context: ResourceRecognitionContext,
    header: ResourceDefinitionHeaderEmission,
    opens: readonly ConvergenceOpen[],
  ): {
    readonly records: readonly KernelStoreRecord[];
    readonly handles: readonly OpenSeamHandle[];
  } {
    const records: KernelStoreRecord[] = [];
    const handles: OpenSeamHandle[] = [];
    opens.forEach((open, index) => {
      const emission = this.recordsForOpenSeam(context, header, open, index);
      records.push(...emission.records);
      handles.push(emission.handle);
    });
    return { records, handles };
  }

  private recordsForOpenSeam(
    context: ResourceRecognitionContext,
    header: ResourceDefinitionHeaderEmission,
    open: ConvergenceOpen,
    index: number,
  ): {
    readonly records: readonly KernelStoreRecord[];
    readonly handle: OpenSeamHandle;
  } {
    const local = `resource-definition-converged:${header.localKey}:open:${index}`;
    return recordsForSourceOpenSeam(this.store, new SourceOpenSeamInput(
      local,
      KernelVocabulary.Resource.OpenDefinitionField.key,
      open.summary,
      context.sourceFileAddressHandle,
      open.node.getStart(context.sourceFile),
      open.node.end,
      [EvidenceRole.Diagnostic],
    ));
  }
}

function classNodeForTarget(
  target: ResourceTargetObservation | null,
): ts.ClassLikeDeclarationBase | null {
  if (target == null) {
    return null;
  }
  if (ts.isClassDeclaration(target.node) || ts.isClassExpression(target.node)) {
    return target.node;
  }
  const parent = target.node.parent;
  return ts.isClassDeclaration(parent) || ts.isClassExpression(parent) ? parent : null;
}

function expressionNode(node: ts.Node | null): ts.Expression | null {
  return node != null && ts.isExpression(node) ? node : null;
}

function readStaticClassProperty(
  classNode: ts.ClassLikeDeclarationBase | null,
  propertyName: string,
): ts.Expression | null {
  if (classNode == null) {
    return null;
  }
  for (const member of classNode.members) {
    if (!hasStaticModifier(member) || !ts.isPropertyDeclaration(member) || member.initializer == null) {
      continue;
    }
    if (readPropertyName(member.name) === propertyName) {
      return member.initializer;
    }
  }
  return null;
}

function readObjectProperty(
  reader: StaticEvaluationExpressionReader,
  expression: ts.Expression | null,
  propertyName: string,
): EvaluationRead<EvaluationValue> | null {
  if (expression == null) {
    return null;
  }
  const evaluated = reader.evaluateExpression(expression);
  if (evaluated.value?.kind !== EvaluationValueKind.Object) {
    return null;
  }
  const property = evaluated.value.properties.get(propertyName);
  return property == null
    ? null
    : new EvaluationRead(property.value, property.node, evaluated.openSeams);
}

function readFieldValue(
  context: ResourceRecognitionContext,
  definitionExpression: ts.Expression | null,
  targetClass: ts.ClassLikeDeclarationBase | null,
  fieldName: string,
): EvaluationRead<EvaluationValue> | null {
  return readObjectProperty(context.expressionReader, definitionExpression, fieldName)
    ?? readStaticClassPropertyValue(context, targetClass, fieldName);
}

function readStaticClassPropertyValue(
  context: ResourceRecognitionContext,
  targetClass: ts.ClassLikeDeclarationBase | null,
  propertyName: string,
): EvaluationRead<EvaluationValue> | null {
  const initializer = readStaticClassProperty(targetClass, propertyName);
  return initializer == null ? null : context.expressionReader.evaluateExpression(initializer);
}

function readBooleanField(
  context: ResourceRecognitionContext,
  definitionExpression: ts.Expression | null,
  targetClass: ts.ClassLikeDeclarationBase | null,
  fieldName: string,
): boolean | null {
  const value = readFieldValue(context, definitionExpression, targetClass, fieldName)?.value;
  return value?.kind === EvaluationValueKind.Boolean ? value.value : null;
}

function readStringField(
  context: ResourceRecognitionContext,
  definitionExpression: ts.Expression | null,
  targetClass: ts.ClassLikeDeclarationBase | null,
  fieldName: string,
): string | null {
  const value = readFieldValue(context, definitionExpression, targetClass, fieldName)?.value;
  return value == null ? null : readStaticStringValue(value);
}

function readStaticStringArrayClassProperty(
  context: ResourceRecognitionContext,
  targetClass: ts.ClassLikeDeclarationBase | null,
  fieldName: string,
): readonly string[] {
  const value = readStaticClassPropertyValue(context, targetClass, fieldName)?.value;
  if (value == null) {
    return [];
  }
  return readStaticStringArrayValue(value) ?? [];
}

function readCustomElementCapture(
  context: ResourceRecognitionContext,
  definitionExpression: ts.Expression | null,
  targetClass: ts.ClassLikeDeclarationBase | null,
): CustomElementCaptureDefinition {
  const read = readFieldValue(context, definitionExpression, targetClass, 'capture');
  const value = read?.value;
  if (value == null || (value.kind === EvaluationValueKind.Boolean && !value.value)) {
    return new CustomElementCaptureDefinition(CustomElementCaptureKind.None);
  }
  if (value.kind === EvaluationValueKind.Boolean && value.value) {
    return new CustomElementCaptureDefinition(CustomElementCaptureKind.All);
  }
  if (value.kind === EvaluationValueKind.Function) {
    return new CustomElementCaptureDefinition(
      CustomElementCaptureKind.Predicate,
      targetReferenceForFunction(value, null),
    );
  }
  return new CustomElementCaptureDefinition(CustomElementCaptureKind.Open);
}

function readCustomElementTemplate(
  store: KernelStore,
  context: ResourceRecognitionContext,
  definitionExpression: ts.Expression | null,
  targetClass: ts.ClassLikeDeclarationBase | null,
  local: string,
): TemplateDefinitionRead {
  const read = readFieldValue(context, definitionExpression, targetClass, 'template');
  const imported = read?.node == null
    ? null
    : readImportedHtmlTemplate(store, context, read.node, local);
  if (imported != null) {
    return imported;
  }

  const value = read?.value;
  if (value == null || value.kind === EvaluationValueKind.Null || value.kind === EvaluationValueKind.Undefined) {
    return new TemplateDefinitionRead(new CustomElementTemplateDefinition(CustomElementTemplateKind.None));
  }
  if (value.kind === EvaluationValueKind.String) {
    const source = read?.node == null
      ? null
      : templateMarkupSourceAddress(store, context, read.node, value.value, local);
    return new TemplateDefinitionRead(
      new CustomElementTemplateDefinition(
        CustomElementTemplateKind.Markup,
        value.value,
        source?.addressHandle ?? null,
        source?.sourceMap ?? null,
      ),
      source?.records ?? [],
    );
  }
  return new TemplateDefinitionRead(new CustomElementTemplateDefinition(CustomElementTemplateKind.Open));
}

function readImportedHtmlTemplate(
  store: KernelStore,
  context: ResourceRecognitionContext,
  node: ts.Node,
  local: string,
): TemplateDefinitionRead | null {
  const carrier = templateCarrierExpression(node);
  if (carrier == null) {
    return null;
  }
  const importSpecifier = htmlImportSpecifierForCarrier(context.sourceFile, carrier);
  if (importSpecifier == null) {
    return null;
  }
  const templatePath = htmlPathFromModuleSpecifier(importSpecifier);
  if (templatePath == null) {
    return null;
  }
  const projectPath = projectRelativeImportPath(context.moduleKey, templatePath);
  const admission = context.sourceFiles.find((source) => source.path === projectPath) ?? null;
  if (admission == null) {
    return null;
  }
  const absolutePath = path.resolve(path.dirname(context.sourceFile.fileName), templatePath);
  if (!existsSync(absolutePath)) {
    return null;
  }

  const markup = readFileSync(absolutePath, 'utf8');
  const source = externalTemplateSourceAddress(store, admission.addressHandle, markup, local);
  return new TemplateDefinitionRead(
    new CustomElementTemplateDefinition(
      CustomElementTemplateKind.Markup,
      markup,
      source.addressHandle,
      null,
    ),
    source.records,
  );
}

function templateCarrierExpression(node: ts.Node): ts.Expression | null {
  if (ts.isPropertyAssignment(node)) {
    return node.initializer;
  }
  if (ts.isShorthandPropertyAssignment(node)) {
    return node.name;
  }
  return ts.isExpression(node) ? node : null;
}

function htmlImportSpecifierForCarrier(
  sourceFile: ts.SourceFile,
  carrier: ts.Expression,
): string | null {
  const current = unwrapExpression(carrier);
  if (!ts.isIdentifier(current)) {
    return null;
  }
  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) {
      continue;
    }
    const clause = statement.importClause;
    if (clause == null) {
      continue;
    }
    if (clause.name?.text === current.text) {
      return statement.moduleSpecifier.text;
    }
    const named = clause.namedBindings;
    if (named == null || !ts.isNamedImports(named)) {
      continue;
    }
    for (const element of named.elements) {
      if (
        element.name.text === current.text
        && (element.propertyName?.text ?? element.name.text) === 'default'
      ) {
        return statement.moduleSpecifier.text;
      }
    }
  }
  return null;
}

function htmlPathFromModuleSpecifier(moduleSpecifier: string): string | null {
  const pathOnly = moduleSpecifier.split(/[?#]/, 1)[0] ?? '';
  return path.extname(pathOnly).toLowerCase() === '.html' ? pathOnly : null;
}

function projectRelativeImportPath(
  fromModuleKey: string,
  moduleSpecifierPath: string,
): string {
  return path.posix.normalize(path.posix.join(path.posix.dirname(fromModuleKey), moduleSpecifierPath));
}

function externalTemplateSourceAddress(
  store: KernelStore,
  sourceFileAddressHandle: AddressHandle,
  markup: string,
  local: string,
): TemplateSourceAddressSet {
  const addressHandle = store.handles.address(`${local}:source`);
  const evidenceHandle = store.handles.evidence(local);
  const provenanceHandle = store.handles.provenance(local);
  const records: KernelStoreRecord[] = [
    new SourceSpanAddress(
      addressHandle,
      sourceFileAddressHandle,
      0,
      markup.length,
      SourceSpanRole.Value,
    ),
    new EvidenceRecord(
      evidenceHandle,
      EvidenceKind.SemanticObservation,
      [EvidenceRole.Declaration],
      'Custom element external template markup source.',
      addressHandle,
    ),
    new ProvenanceRecord(
      provenanceHandle,
      [evidenceHandle],
    ),
  ];
  return new TemplateSourceAddressSet(records, addressHandle, null);
}

function templateMarkupSourceAddress(
  store: KernelStore,
  context: ResourceRecognitionContext,
  node: ts.Node,
  markup: string,
  local: string,
): TemplateSourceAddressSet | null {
  const expression = inlineTemplateStringExpression(node);
  if (expression == null) {
    return null;
  }
  const source = inlineTemplateMarkupSource(context, expression, markup);
  if (source == null) {
    return null;
  }
  return inlineTemplateSourceAddressSet(store, context, local, source);
}

function inlineTemplateStringExpression(
  node: ts.Node,
): ts.StringLiteral | ts.NoSubstitutionTemplateLiteral | null {
  const carrier = templateCarrierExpression(node);
  if (carrier == null) {
    return null;
  }
  const expression = unwrapExpression(carrier);
  return ts.isStringLiteral(expression) || ts.isNoSubstitutionTemplateLiteral(expression)
    ? expression
    : null;
}

function inlineTemplateMarkupSource(
  context: ResourceRecognitionContext,
  expression: ts.StringLiteral | ts.NoSubstitutionTemplateLiteral,
  markup: string,
): InlineTemplateMarkupSource | null {
  const contentStart = expression.getStart(context.sourceFile) + 1;
  const contentEnd = expression.end - 1;
  const rawContent = context.sourceFile.text.slice(contentStart, contentEnd);
  const sourceMap = inlineTemplateSourceMap(rawContent, markup, contentStart);
  return sourceMap === undefined
    ? null
    : new InlineTemplateMarkupSource(contentStart, contentEnd, sourceMap);
}

function inlineTemplateSourceMap(
  rawContent: string,
  markup: string,
  contentStart: number,
): TemplateSourceOffsetMap | null | undefined {
  return rawContent.length === markup.length
    ? null
    : decodedStringSourceMap(rawContent, markup, contentStart) ?? undefined;
}

function inlineTemplateSourceAddressSet(
  store: KernelStore,
  context: ResourceRecognitionContext,
  local: string,
  source: InlineTemplateMarkupSource,
): TemplateSourceAddressSet {
  const addressHandle = store.handles.address(`${local}:source`);
  const evidenceHandle = store.handles.evidence(local);
  const provenanceHandle = store.handles.provenance(local);
  const records: KernelStoreRecord[] = [
    new SourceSpanAddress(
      addressHandle,
      context.sourceFileAddressHandle,
      source.contentStart,
      source.contentEnd,
      SourceSpanRole.Value,
    ),
    new EvidenceRecord(
      evidenceHandle,
      EvidenceKind.SemanticObservation,
      [EvidenceRole.Declaration],
      'Custom element inline template markup source.',
      addressHandle,
    ),
    new ProvenanceRecord(
      provenanceHandle,
      [evidenceHandle],
    ),
  ];
  return new TemplateSourceAddressSet(records, addressHandle, source.sourceMap);
}

function decodedStringSourceMap(
  rawContent: string,
  decoded: string,
  contentStart: number,
): TemplateSourceOffsetMap | null {
  const offsets: number[] = [];
  let decodedText = '';
  let rawIndex = 0;

  while (rawIndex < rawContent.length) {
    const sourceOffset = contentStart + rawIndex;
    const char = rawContent[rawIndex] ?? '';
    if (char !== '\\') {
      offsets.push(sourceOffset);
      decodedText += char;
      rawIndex++;
      continue;
    }

    const escape = readStringEscape(rawContent, rawIndex);
    if (escape == null) {
      return null;
    }
    for (let i = 0; i < escape.decoded.length; i++) {
      offsets.push(sourceOffset);
    }
    decodedText += escape.decoded;
    rawIndex += escape.rawLength;
  }

  offsets.push(contentStart + rawContent.length);
  if (decodedText !== decoded || offsets.length !== decoded.length + 1) {
    return null;
  }
  return new TemplateSourceOffsetMap(decoded.length, offsets);
}

function readStringEscape(
  rawContent: string,
  slashIndex: number,
): { readonly decoded: string; readonly rawLength: number } | null {
  const next = rawContent[slashIndex + 1] ?? '';
  switch (next) {
    case 'b':
      return { decoded: '\b', rawLength: 2 };
    case 'f':
      return { decoded: '\f', rawLength: 2 };
    case 'n':
      return { decoded: '\n', rawLength: 2 };
    case 'r':
      return { decoded: '\r', rawLength: 2 };
    case 't':
      return { decoded: '\t', rawLength: 2 };
    case 'v':
      return { decoded: '\v', rawLength: 2 };
    case '0':
      return { decoded: '\0', rawLength: 2 };
    case '\\':
    case '"':
    case "'":
    case '`':
    case '$':
      return { decoded: next, rawLength: 2 };
    case '\r': {
      const rawLength = rawContent[slashIndex + 2] === '\n' ? 3 : 2;
      return { decoded: '', rawLength };
    }
    case '\n':
      return { decoded: '', rawLength: 2 };
    case 'x': {
      const text = rawContent.slice(slashIndex + 2, slashIndex + 4);
      return /^[0-9a-fA-F]{2}$/.test(text)
        ? { decoded: String.fromCharCode(parseInt(text, 16)), rawLength: 4 }
        : null;
    }
    case 'u':
      return readUnicodeEscape(rawContent, slashIndex);
    default:
      return null;
  }
}

function readUnicodeEscape(
  rawContent: string,
  slashIndex: number,
): { readonly decoded: string; readonly rawLength: number } | null {
  if (rawContent[slashIndex + 2] === '{') {
    const close = rawContent.indexOf('}', slashIndex + 3);
    if (close < 0) {
      return null;
    }
    const text = rawContent.slice(slashIndex + 3, close);
    if (!/^[0-9a-fA-F]+$/.test(text)) {
      return null;
    }
    const value = parseInt(text, 16);
    if (value > 0x10FFFF) {
      return null;
    }
    return { decoded: String.fromCodePoint(value), rawLength: close - slashIndex + 1 };
  }

  const text = rawContent.slice(slashIndex + 2, slashIndex + 6);
  return /^[0-9a-fA-F]{4}$/.test(text)
    ? { decoded: String.fromCharCode(parseInt(text, 16)), rawLength: 6 }
    : null;
}

function sourceSpanAddressForNode(
  store: KernelStore,
  context: ResourceRecognitionContext,
  node: ts.Node | null,
  local: string,
  role: SourceSpanRole,
): SourceSpanAddressSet | null {
  if (node == null) {
    return null;
  }
  const sourceNode = sourceAddressNode(node);
  const sourceFile = context.sourceFile;
  let start = sourceNode.getStart(sourceFile);
  let end = sourceNode.end;
  if (ts.isStringLiteralLike(sourceNode) || ts.isNoSubstitutionTemplateLiteral(sourceNode)) {
    start += 1;
    end -= 1;
  }
  if (end < start) {
    return null;
  }
  const addressHandle = store.handles.address(`${local}:source`);
  return new SourceSpanAddressSet(
    [
      new SourceSpanAddress(
        addressHandle,
        context.sourceFileAddressHandle,
        start,
        end,
        role,
      ),
    ],
    addressHandle,
  );
}

function sourceAddressNode(node: ts.Node): ts.Node {
  if (
    (ts.isPropertyAssignment(node)
      || ts.isShorthandPropertyAssignment(node)
      || ts.isMethodDeclaration(node)
      || ts.isPropertyDeclaration(node)
      || ts.isGetAccessorDeclaration(node)
      || ts.isSetAccessorDeclaration(node))
    && node.name != null
  ) {
    return node.name;
  }
  return node;
}

function readShadowOptions(
  context: ResourceRecognitionContext,
  definitionExpression: ts.Expression | null,
  targetClass: ts.ClassLikeDeclarationBase | null,
): ShadowOptionsDefinition | null {
  const value = readFieldValue(context, definitionExpression, targetClass, 'shadowOptions')?.value;
  if (value?.kind !== EvaluationValueKind.Object) {
    return null;
  }
  const mode = value.properties.get('mode')?.value;
  const modeText = mode == null ? null : readStaticStringValue(mode);
  switch (modeText) {
    case 'open':
      return new ShadowOptionsDefinition(ShadowRootMode.Open);
    case 'closed':
      return new ShadowOptionsDefinition(ShadowRootMode.Closed);
    default:
      return null;
  }
}

function readTargetField(
  context: ResourceRecognitionContext,
  definitionExpression: ts.Expression | null,
  targetClass: ts.ClassLikeDeclarationBase | null,
  fieldName: string,
): ResourceTargetReference | null {
  const value = readFieldValue(context, definitionExpression, targetClass, fieldName)?.value;
  if (value?.kind !== EvaluationValueKind.Function && value?.kind !== EvaluationValueKind.Class) {
    return null;
  }
  return targetReferenceForFunction(value, null);
}

function readResourceDependencies(
  context: ResourceRecognitionContext,
  definitionExpression: ts.Expression | null,
  targetClass: ts.ClassLikeDeclarationBase | null,
): ResourceDependenciesRead {
  const read = readFieldValue(context, definitionExpression, targetClass, 'dependencies');
  if (read == null || read.value == null
    || read.value.kind === EvaluationValueKind.Undefined
    || read.value.kind === EvaluationValueKind.Null) {
    return new ResourceDependenciesRead([], []);
  }
  const value = read.value;
  if (value.kind !== EvaluationValueKind.Array) {
    return new ResourceDependenciesRead(
      [],
      convergenceOpenForRead('Resource dependencies did not close to a static array.', read),
    );
  }

  const dependencies: ResourceDependencyReference[] = [];
  const open: ConvergenceOpen[] = [];
  for (const element of value.elements) {
    if (
      element.value.kind !== EvaluationValueKind.Class
      && element.value.kind !== EvaluationValueKind.Function
    ) {
      appendConvergenceOpen(open, 'Resource dependency entry did not close to a static class or function.', element.expression);
      continue;
    }
    const target = targetReferenceForFunction(element.value, null);
    if (target.identityHandle == null && target.localName == null) {
      appendConvergenceOpen(open, 'Resource dependency entry did not expose a usable target name.', element.expression);
      continue;
    }
    dependencies.push(new ResourceDependencyReference(target.identityHandle, target.localName));
  }
  if (value.mayHaveUnknownElements) {
    appendConvergenceOpen(open, 'Resource dependencies include open spread or hole entries.', value.node);
  }
  return new ResourceDependenciesRead(dependencies, open);
}

function readContainerStrategy(
  context: ResourceRecognitionContext,
  definitionExpression: ts.Expression | null,
  targetClass: ts.ClassLikeDeclarationBase | null,
): CustomAttributeContainerStrategy {
  switch (readStringField(context, definitionExpression, targetClass, 'containerStrategy')) {
    case 'new':
      return CustomAttributeContainerStrategy.New;
    case 'reuse':
    default:
      return CustomAttributeContainerStrategy.Reuse;
  }
}

function readBindables(
  store: KernelStore,
  context: ResourceRecognitionContext,
  local: string,
  definitionExpression: ts.Expression | null,
  targetClass: ts.ClassLikeDeclarationBase | null,
  provenanceHandle: ProvenanceHandle,
): BindableRead {
  const reads = [
    ...readDecoratorBindables(store, context, `${local}:decorator`, targetClass, provenanceHandle),
    ...readBindableListExpression(store, context, `${local}:static`, readStaticClassProperty(targetClass, 'bindables'), provenanceHandle, BindableContributionKind.StaticBindables),
    ...readBindableListValue(store, context, `${local}:definition-object`, readObjectProperty(context.expressionReader, definitionExpression, 'bindables'), provenanceHandle, BindableContributionKind.RuntimePartial),
  ];
  const byName = new Map<string, BindableDefinition>();
  const contributions: BindableDefinitionContribution[] = [];
  const open: ConvergenceOpen[] = [];
  const records: KernelStoreRecord[] = [];
  for (const read of reads) {
    if (read.bindable != null) {
      byName.set(read.bindable.name, read.bindable);
    }
    if (read.contribution != null) {
      contributions.push(read.contribution);
    }
    if (read.open != null) {
      open.push(read.open);
    }
    records.push(...read.records);
  }
  return new BindableRead([...byName.values()], contributions, open, records);
}

class BindableEntryRead {
  constructor(
    readonly bindable: BindableDefinition | null,
    readonly contribution: BindableDefinitionContribution | null,
    readonly open: ConvergenceOpen | null,
    readonly records: readonly KernelStoreRecord[] = [],
  ) {}
}

function readDecoratorBindables(
  store: KernelStore,
  context: ResourceRecognitionContext,
  local: string,
  targetClass: ts.ClassLikeDeclarationBase | null,
  provenanceHandle: ProvenanceHandle,
): readonly BindableEntryRead[] {
  if (targetClass == null) {
    return [];
  }
  const entries: BindableEntryRead[] = [];
  for (const [index, decorator] of (ts.canHaveDecorators(targetClass) ? ts.getDecorators(targetClass) ?? [] : []).entries()) {
    const entry = readClassBindableDecorator(store, context, `${local}:class:${index}`, decorator, provenanceHandle);
    if (entry != null) {
      entries.push(entry);
    }
  }
  for (const member of targetClass.members) {
    const propertyName = memberName(member);
    if (propertyName == null || !ts.canHaveDecorators(member)) {
      continue;
    }
    for (const [index, decorator] of (ts.getDecorators(member) ?? []).entries()) {
      const entry = readMemberBindableDecorator(store, context, `${local}:member:${propertyName}:${index}`, decorator, member, propertyName, provenanceHandle);
      if (entry != null) {
        entries.push(entry);
      }
    }
  }
  return entries;
}

function readClassBindableDecorator(
  store: KernelStore,
  context: ResourceRecognitionContext,
  local: string,
  decorator: ts.Decorator,
  provenanceHandle: ProvenanceHandle,
): BindableEntryRead | null {
  const call = decoratorCallNamed(decorator, 'bindable');
  if (call == null) {
    return null;
  }
  const argument = call.arguments[0] ?? null;
  if (argument == null) {
    return new BindableEntryRead(
      null,
      null,
      new ConvergenceOpen('Class-level @bindable requires a static property name argument.', decorator),
    );
  }
  const value = context.expressionReader.evaluateExpression(argument).value;
  const source = sourceSpanAddressForNode(store, context, argument, local, SourceSpanRole.Name);
  if (value?.kind === EvaluationValueKind.String) {
    return bindableEntry(value.value, null, BindableContributionKind.Decorator, provenanceHandle, source);
  }
  if (value?.kind === EvaluationValueKind.Object) {
    const name = readObjectString(value, 'name');
    if (name != null) {
      return bindableEntry(name, value, BindableContributionKind.Decorator, provenanceHandle, source);
    }
  }
  return new BindableEntryRead(
    null,
    null,
    new ConvergenceOpen('Class-level @bindable did not close to a static property name.', argument),
  );
}

function readMemberBindableDecorator(
  store: KernelStore,
  context: ResourceRecognitionContext,
  local: string,
  decorator: ts.Decorator,
  member: ts.ClassElement,
  propertyName: string,
  provenanceHandle: ProvenanceHandle,
): BindableEntryRead | null {
  const source = sourceSpanAddressForNode(store, context, memberNameNode(member) ?? member, local, SourceSpanRole.Name);
  const expression = decorator.expression;
  if (ts.isIdentifier(expression) && expression.text === 'bindable') {
    return bindableEntry(propertyName, null, BindableContributionKind.Decorator, provenanceHandle, source);
  }
  const call = decoratorCallNamed(decorator, 'bindable');
  if (call == null) {
    return null;
  }
  const argument = call.arguments[0] ?? null;
  if (argument == null) {
    return bindableEntry(propertyName, null, BindableContributionKind.Decorator, provenanceHandle, source);
  }
  const value = context.expressionReader.evaluateExpression(argument).value;
  if (value == null || value.kind !== EvaluationValueKind.Object) {
    return new BindableEntryRead(
      null,
      null,
      new ConvergenceOpen('@bindable(...) configuration did not close to a static object.', argument),
    );
  }
  return bindableEntry(propertyName, value, BindableContributionKind.Decorator, provenanceHandle, source);
}

function readBindableListExpression(
  store: KernelStore,
  context: ResourceRecognitionContext,
  local: string,
  expression: ts.Expression | null,
  provenanceHandle: ProvenanceHandle,
  contributionKind: BindableContributionKind,
): readonly BindableEntryRead[] {
  return expression == null
    ? []
    : readBindableListValue(store, context, local, context.expressionReader.evaluateExpression(expression), provenanceHandle, contributionKind);
}

function readBindableListValue(
  store: KernelStore,
  context: ResourceRecognitionContext,
  local: string,
  read: EvaluationRead<EvaluationValue> | null,
  provenanceHandle: ProvenanceHandle,
  contributionKind: BindableContributionKind,
): readonly BindableEntryRead[] {
  const value = read?.value;
  if (value == null || value.kind === EvaluationValueKind.Undefined) {
    return [];
  }
  if (value.kind === EvaluationValueKind.Array) {
    const entries = value.elements.map((element, index) => {
      const source = sourceSpanAddressForNode(store, context, element.expression, `${local}:array:${index}`, SourceSpanRole.Name);
      if (element.value.kind === EvaluationValueKind.String) {
        return bindableEntry(element.value.value, null, contributionKind, provenanceHandle, source);
      }
      if (element.value.kind === EvaluationValueKind.Object) {
        const name = readObjectString(element.value, 'name');
        return name == null
          ? new BindableEntryRead(null, null, nullableConvergenceOpenForNode('Bindable array entry did not expose a static name.', element.expression))
          : bindableEntry(name, element.value, contributionKind, provenanceHandle, source);
      }
      return new BindableEntryRead(
        null,
        null,
        nullableConvergenceOpenForNode('Bindable array entry did not close to a string or static object.', element.expression),
      );
    });
    if (value.mayHaveUnknownElements) {
      return [
        ...entries,
        new BindableEntryRead(null, null, nullableConvergenceOpenForNode('Bindable array includes open spread or hole entries.', value.node)),
      ];
    }
    return entries;
  }
  if (value.kind === EvaluationValueKind.Object) {
    const entries: BindableEntryRead[] = [];
    for (const property of value.properties.values()) {
      const source = sourceSpanAddressForNode(store, context, property.node, `${local}:object:${property.name}`, SourceSpanRole.Name);
      if (property.value.kind === EvaluationValueKind.Boolean && property.value.value === true) {
        entries.push(bindableEntry(property.name, null, contributionKind, provenanceHandle, source));
        continue;
      }
      if (property.value.kind === EvaluationValueKind.Object) {
        entries.push(bindableEntry(property.name, property.value, contributionKind, provenanceHandle, source));
        continue;
      }
      entries.push(new BindableEntryRead(
        null,
        null,
        nullableConvergenceOpenForNode(`Bindable '${property.name}' did not close to true or a static configuration object.`, property.node),
      ));
    }
    if (value.mayHaveUnknownProperties) {
      entries.push(new BindableEntryRead(
        null,
        null,
        nullableConvergenceOpenForNode('Bindable object includes open spread or computed property entries.', value.node),
      ));
    }
    return entries;
  }
  return [
    new BindableEntryRead(null, null, nullableConvergenceOpenForRead('Bindable list did not close to a static array or object.', read)),
  ];
}

function bindableEntry(
  propertyName: string,
  partial: EvaluationObjectValue | null,
  contributionKind: BindableContributionKind,
  provenanceHandle: ProvenanceHandle,
  source: SourceSpanAddressSet | null,
): BindableEntryRead {
  const attribute = readObjectString(partial, 'attribute') ?? toBindableAttribute(propertyName);
  const callback = readObjectString(partial, 'callback') ?? `${propertyName}Changed`;
  const mode = readBindableMode(partial?.properties.get('mode')?.value) ?? BindableBindingMode.ToView;
  const name = readObjectString(partial, 'name') ?? propertyName;
  const setter = readBindableSetter(partial);
  const fieldProvenance = fieldProvenanceFor<BindableDefinitionField>(provenanceHandle, ['attribute', 'callback', 'mode', 'name', 'set', 'source']);
  return new BindableEntryRead(
    new BindableDefinition(
      attribute,
      callback,
      mode,
      name,
      setter,
      source?.addressHandle ?? null,
      fieldProvenance,
    ),
    new BindableDefinitionContribution(
      contributionKind,
      propertyName,
      attribute,
      callback,
      mode,
      name,
      setter,
      source?.addressHandle ?? null,
      fieldProvenance,
    ),
    null,
    source?.records ?? [],
  );
}

function readBindableSetter(partial: EvaluationObjectValue | null): BindableSetterDefinition {
  const set = partial?.properties.get('set')?.value ?? null;
  if (set?.kind === EvaluationValueKind.Function) {
    return new BindableSetterDefinition(BindableSetterKind.Function, targetReferenceForFunction(set, null));
  }
  if (set != null) {
    return new BindableSetterDefinition(BindableSetterKind.Open);
  }
  if (partial?.properties.has('type') === true) {
    return new BindableSetterDefinition(BindableSetterKind.TypeCoercion);
  }
  return new BindableSetterDefinition(BindableSetterKind.Default);
}

function readBindableMode(value: EvaluationValue | null | undefined): BindableBindingMode | null {
  if (value == null) {
    return null;
  }
  if (value.kind === EvaluationValueKind.String) {
    switch (value.value) {
      case 'default':
        return BindableBindingMode.Default;
      case 'oneTime':
        return BindableBindingMode.OneTime;
      case 'toView':
        return BindableBindingMode.ToView;
      case 'fromView':
        return BindableBindingMode.FromView;
      case 'twoWay':
        return BindableBindingMode.TwoWay;
      default:
        return null;
    }
  }
  if (value.kind === EvaluationValueKind.Number) {
    switch (value.value) {
      case 0:
        return BindableBindingMode.Default;
      case 1:
        return BindableBindingMode.OneTime;
      case 2:
        return BindableBindingMode.ToView;
      case 4:
        return BindableBindingMode.FromView;
      case 6:
        return BindableBindingMode.TwoWay;
      default:
        return null;
    }
  }
  return null;
}

function readObjectString(
  value: EvaluationObjectValue | null,
  propertyName: string,
): string | null {
  if (value == null) {
    return null;
  }
  const property = value.properties.get(propertyName);
  return property == null ? null : readStaticStringValue(property.value);
}

function targetReferenceForFunction(
  value: Extract<EvaluationValue, { readonly kind: EvaluationValueKind.Function | EvaluationValueKind.Class }>,
  addressHandle: AddressHandle | null,
): ResourceTargetReference {
  const localName = value.declaration.name != null && ts.isIdentifier(value.declaration.name)
    ? value.declaration.name.text
    : null;
  return new ResourceTargetReference(
    null,
    addressHandle,
    localName,
  );
}

function decoratorCallNamed(decorator: ts.Decorator, name: string): ts.CallExpression | null {
  const expression = decorator.expression;
  if (!ts.isCallExpression(expression)) {
    return null;
  }
  const callee = expression.expression;
  if (ts.isIdentifier(callee) && callee.text === name) {
    return expression;
  }
  if (ts.isPropertyAccessExpression(callee) && callee.name.text === name) {
    return expression;
  }
  return null;
}

function memberName(member: ts.ClassElement): string | null {
  if (
    ts.isPropertyDeclaration(member)
    || ts.isGetAccessorDeclaration(member)
    || ts.isSetAccessorDeclaration(member)
    || ts.isMethodDeclaration(member)
  ) {
    return readPropertyName(member.name);
  }
  return null;
}

function memberNameNode(member: ts.ClassElement): ts.PropertyName | null {
  if (
    ts.isPropertyDeclaration(member)
    || ts.isGetAccessorDeclaration(member)
    || ts.isSetAccessorDeclaration(member)
    || ts.isMethodDeclaration(member)
  ) {
    return member.name;
  }
  return null;
}

function openIfPresent(
  context: ResourceRecognitionContext,
  definitionExpression: ts.Expression | null,
  targetClass: ts.ClassLikeDeclarationBase | null,
  fieldName: string,
  summary: string,
): readonly ConvergenceOpen[] {
  const definitionRead = readObjectProperty(context.expressionReader, definitionExpression, fieldName);
  const staticExpression = readStaticClassProperty(targetClass, fieldName);
  if (definitionRead == null && staticExpression == null) {
    return [];
  }
  return convergenceOpenForNode(summary, definitionRead?.node ?? staticExpression);
}

function mergeAliases(
  first: readonly string[],
  second: readonly string[],
): readonly string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const alias of [...first, ...second]) {
    if (seen.has(alias)) {
      continue;
    }
    seen.add(alias);
    result.push(alias);
  }
  return result;
}

function fieldProvenanceFor<TField extends string>(
  provenanceHandle: ProvenanceHandle,
  fields: readonly TField[],
): readonly FieldProvenance<TField>[] {
  return compactFieldProvenance(fields.map((field) => new FieldProvenance(field, provenanceHandle)));
}

function hasStaticModifier(node: ts.Node): boolean {
  return ts.canHaveModifiers(node)
    ? ts.getModifiers(node)?.some((modifier) => modifier.kind === ts.SyntaxKind.StaticKeyword) === true
    : false;
}

function toBindableAttribute(name: string): string {
  return name.replace(/([A-Z])/g, (_match, char: string) => `-${char.toLowerCase()}`);
}
