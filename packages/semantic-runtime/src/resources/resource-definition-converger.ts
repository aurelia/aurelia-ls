import {
  existsSync,
  readFileSync,
} from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import type { SourceFileAdmission } from '../boot/frames.js';
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
  ProvenanceRecord,
} from '../kernel/provenance.js';
import {
  KernelStoreBatch,
  type KernelStore,
  type KernelStoreRecord,
} from '../kernel/store.js';
import {
  recordsForSourceOpenSeam,
} from '../kernel/source-open-seam.js';
import { KernelVocabulary } from '../kernel/vocabulary.js';
import {
  EvaluationRead,
  readStaticStringArrayValue,
  readStaticStringValue,
  type StaticEvaluationExpressionReader,
} from '../evaluation/expression-reader.js';
import {
  hasStaticModifier,
  readDeclarationLocalName,
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
} from './attribute-pattern-definition.js';
import {
  BindableBindingMode,
  BindableContributionKind,
  BindableDefinition,
  BindableDefinitionContribution,
  BindableSetterDefinition,
  BindableSetterKind,
} from './bindable-definition.js';
import { bindableAttributeNameForProperty } from './bindable-attribute.js';
import {
  BindingBehaviorDefinition,
  BindingBehaviorDefinitionContribution,
  BindingBehaviorDefinitionContributionKind,
} from './binding-behavior-definition.js';
import {
  BindingCommandDefinition,
  BindingCommandDefinitionContribution,
  BindingCommandDefinitionContributionKind,
} from './binding-command-definition.js';
import {
  CustomAttributeContainerStrategy,
  CustomAttributeDefinition,
  CustomAttributeDefinitionContribution,
  CustomAttributeDefinitionContributionKind,
} from './custom-attribute-definition.js';
import {
  CustomElementCaptureDefinition,
  CustomElementCaptureKind,
  CustomElementDefinition,
  CustomElementDefinitionContribution,
  CustomElementDefinitionContributionKind,
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
import {
  conventionalResourceNameForFilePath,
  readConventionalTemplateAdmission,
} from './resource-convention.js';
import {
  ResourceCarrierKind,
  type ResourceRecognitionObservation,
  type ResourceTargetObservation,
} from './resource-observation.js';
import {
  ResourceDefinitionKind,
  runtimeResourceKeyForKind,
  toAureliaResourceIdentityKind,
} from './resource-kind.js';
import {
  readHtmlTemplateMetadata,
  type HtmlTemplateMetadataImport,
} from './html-template-metadata.js';
import type { ResourceDefinitionHeaderEmission } from './resource-definition-header-emission.js';
import type { ResourceRecognitionKernelEmission } from './resource-recognition-kernel-emitter.js';
import {
  ResourceAliasDefinition,
  ResourceDependencyReference,
  ResourceTargetReference,
} from './resource-reference.js';
import { ResourceFrameworkErrorCode } from './framework-error-code.js';
import {
  ResourceIssue,
  ResourceIssueKind,
  ResourceIssuePhase,
} from './resource-issue.js';
import {
  ResourceIssuePublication,
  ResourceIssuePublisher,
} from './resource-issue-publication.js';
import { ResourceProductDetails } from './product-details.js';
import {
  ValueConverterDefinition,
  ValueConverterDefinitionContribution,
  ValueConverterDefinitionContributionKind,
} from './value-converter-definition.js';
import {
  WatchCallbackDefinition,
  WatchCallbackKind,
  WatchContributionKind,
  WatchDefinition,
  WatchDefinitionContribution,
  WatchExpressionDefinition,
  WatchExpressionKind,
  WatchFlushMode,
  WatchPropertyKeyDefinition,
  WatchPropertyKeyKind,
} from './watch-definition.js';

export class ResourceDefinitionConvergenceEmission {
  constructor(
    /** Full resource definitions converged from recognized source headers. */
    readonly definitions: readonly FullResourceDefinition[],
    /** Source-backed resource metadata issues produced by this convergence pass. */
    readonly issues: readonly ResourceIssue[],
    /** Kernel records committed by this convergence pass. */
    readonly records: readonly KernelStoreRecord[],
  ) {}
}

class ResourceDefinitionConvergenceProduct {
  constructor(
    readonly records: readonly KernelStoreRecord[],
    readonly definition: FullResourceDefinition | null,
    readonly issues: readonly ResourceIssue[] = [],
  ) {}
}

class ConvergedResourceDefinition {
  constructor(
    readonly definition: FullResourceDefinition,
    readonly open: readonly ConvergenceOpen[],
    readonly records: readonly KernelStoreRecord[] = [],
    readonly issues: readonly ResourceIssue[] = [],
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
    readonly issues: readonly ResourceIssue[] = [],
  ) {}
}

class ProcessContentRead {
  constructor(
    readonly target: ResourceTargetReference | null,
    readonly records: readonly KernelStoreRecord[] = [],
    readonly issues: readonly ResourceIssue[] = [],
  ) {}
}

class WatchRead {
  constructor(
    readonly watches: readonly WatchDefinition[],
    readonly contributions: readonly WatchDefinitionContribution[],
    readonly open: readonly ConvergenceOpen[],
    readonly records: readonly KernelStoreRecord[] = [],
    readonly issues: readonly ResourceIssue[] = [],
  ) {}
}

class ResourceIssueRead {
  constructor(
    readonly records: readonly KernelStoreRecord[] = [],
    readonly issues: readonly ResourceIssue[] = [],
  ) {}
}

class TemplateDefinitionRead {
  constructor(
    readonly template: CustomElementTemplateDefinition,
    readonly records: readonly KernelStoreRecord[] = [],
    readonly dependencies: ResourceDependenciesRead = new ResourceDependenciesRead([], []),
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

interface CustomElementConvergenceFacts {
  readonly target: ResourceTargetReference;
  readonly name: string;
  readonly aliasDefinitions: readonly ResourceAliasDefinition[];
  readonly key: string;
  readonly capture: CustomElementCaptureDefinition;
  readonly template: TemplateDefinitionRead;
  readonly dependencies: ResourceDependenciesRead;
  readonly bindables: BindableRead;
  readonly watches: WatchRead;
  readonly containerless: boolean;
  readonly shadowOptions: ShadowOptionsDefinition | null;
  readonly hasSlots: boolean;
  readonly enhance: boolean;
  readonly needsCompile: boolean;
  readonly strict: boolean | null;
  readonly processContent: ResourceTargetReference | null;
  readonly issueRecords: readonly KernelStoreRecord[];
  readonly issues: readonly ResourceIssue[];
  readonly open: readonly ConvergenceOpen[];
}

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
    const issues: ResourceIssue[] = [];

    for (const header of headerEmission.definitions) {
      const observation = observations[header.observationIndex] ?? null;
      if (observation?.definition == null) {
        continue;
      }
      const product = this.recordsForDefinition(context, observation, header);
      records.push(...product.records);
      issues.push(...product.issues);
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
    for (const issue of issues) {
      this.store.productDetails.add(ResourceProductDetails.Issue, issue.productHandle, issue);
    }

    return new ResourceDefinitionConvergenceEmission(definitions, issues, records);
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
    return new ResourceDefinitionConvergenceProduct(records, definition, converged.issues);
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
        return this.convergeThinNamedResource(definition, observation, header, productHandle, provenanceHandle);
      case ResourceDefinitionKind.AttributePattern:
        return this.convergeAttributePattern(definition, observation, header, productHandle, provenanceHandle);
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
    const facts = this.readCustomElementFacts(context, definition, observation, header, provenanceHandle);
    if (facts == null) {
      return null;
    }

    return new ConvergedResourceDefinition(
      this.createCustomElementDefinition(productHandle, header, observation, facts),
      facts.open,
      [
        ...facts.template.records,
        ...facts.bindables.records,
        ...facts.watches.records,
        ...facts.issueRecords,
      ],
      facts.issues,
    );
  }

  private readCustomElementFacts(
    context: ResourceRecognitionContext,
    definition: CustomElementDefinitionHeader,
    observation: ResourceRecognitionObservation,
    header: ResourceDefinitionHeaderEmission,
    provenanceHandle: ProvenanceHandle,
  ): CustomElementConvergenceFacts | null {
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
      header.primaryIdentityHandle,
      provenanceHandle,
    );
    const watches = readWatches(
      this.store,
      context,
      `resource-definition-converged:${header.localKey}:watch`,
      definitionExpression,
      targetClass,
      header.primaryIdentityHandle,
      provenanceHandle,
    );
    const aliases = mergeAliases(definition.aliases, readStaticStringArrayClassProperty(context, targetClass, 'aliases'));
    const capture = readCustomElementCapture(context, definitionExpression, targetClass);
    const template = readCustomElementTemplate(
      this.store,
      context,
      definitionExpression,
      targetClass,
      observation,
      `resource-definition-converged:${header.localKey}:template`,
    );
    const dependencies = mergeResourceDependencies(
      readResourceDependencies(context, definitionExpression, targetClass),
      template.dependencies,
    );
    const containerless = readBooleanField(context, definitionExpression, targetClass, 'containerless') ?? false;
    const shadowOptions = readShadowOptions(context, definitionExpression, targetClass);
    const hasSlots = readBooleanField(context, definitionExpression, targetClass, 'hasSlots') ?? false;
    const controllerIssue = readCustomElementControllerNoShadowOnContainerlessIssue(
      this.store,
      context,
      `resource-definition-converged:${header.localKey}:controller`,
      definitionExpression,
      targetClass,
      header.primaryIdentityHandle,
      provenanceHandle,
      containerless,
      shadowOptions,
      hasSlots,
    );
    const enhance = readBooleanField(context, definitionExpression, targetClass, 'enhance') ?? false;
    const needsCompile = readBooleanField(context, definitionExpression, targetClass, 'needsCompile') ?? true;
    const strict = readBooleanField(context, definitionExpression, targetClass, 'strict');
    const processContent = readCustomElementProcessContent(
      this.store,
      context,
      `resource-definition-converged:${header.localKey}:process-content`,
      definitionExpression,
      targetClass,
      header.primaryIdentityHandle,
      provenanceHandle,
    );
    const decoratorIssues = readCustomElementDecoratorIssues(
      this.store,
      context,
      `resource-definition-converged:${header.localKey}:decorator`,
      targetClass,
      header.primaryIdentityHandle,
      provenanceHandle,
    );
    const open = [
      ...bindables.open,
      ...watches.open,
      ...dependencies.open,
      ...openIfPresent(context, definitionExpression, targetClass, 'instructions', 'Custom element instructions are present before template lowering is modeled.'),
      ...openIfPresent(context, definitionExpression, targetClass, 'surrogates', 'Custom element surrogates are present before surrogate lowering is modeled.'),
    ];

    const aliasDefinitions = aliases.map((alias) => new ResourceAliasDefinition(alias, header.sourceAddressHandle, provenanceHandle));
    return {
      target,
      name,
      aliasDefinitions,
      key,
      capture,
      template,
      dependencies,
      bindables,
      watches,
      containerless,
      shadowOptions,
      hasSlots,
      enhance,
      needsCompile,
      strict,
      processContent: processContent.target,
      issueRecords: [
        ...(controllerIssue?.records ?? []),
        ...processContent.records,
        ...decoratorIssues.records,
      ],
      issues: [
        ...bindables.issues,
        ...watches.issues,
        ...processContent.issues,
        ...decoratorIssues.issues,
        ...(controllerIssue == null ? [] : [controllerIssue.issue]),
      ],
      open,
    };
  }

  private createCustomElementDefinition(
    productHandle: ProductHandle,
    header: ResourceDefinitionHeaderEmission,
    observation: ResourceRecognitionObservation,
    facts: CustomElementConvergenceFacts,
  ): CustomElementDefinition {
    return new CustomElementDefinition(
      productHandle,
      header.primaryIdentityHandle,
      header.sourceAddressHandle,
      facts.target,
      facts.name,
      facts.aliasDefinitions,
      facts.key,
      facts.capture,
      facts.template.template,
      [],
      facts.dependencies.dependencies,
      null,
      facts.needsCompile,
      [],
      facts.bindables.bindables,
      facts.containerless,
      facts.shadowOptions,
      facts.hasSlots,
      facts.enhance,
      facts.watches.watches,
      facts.strict,
      facts.processContent,
      [this.customElementContribution(observation, facts)],
    );
  }

  private customElementContribution(
    observation: ResourceRecognitionObservation,
    facts: CustomElementConvergenceFacts,
  ): CustomElementDefinitionContribution {
    return new CustomElementDefinitionContribution(
      customElementContributionKind(observation),
      facts.target,
      facts.name,
      facts.aliasDefinitions,
      facts.key,
      facts.capture,
      facts.template.template,
      [],
      facts.dependencies.dependencies,
      null,
      facts.needsCompile,
      [],
      facts.bindables.contributions,
      facts.containerless,
      facts.shadowOptions,
      facts.hasSlots,
      facts.enhance,
      facts.watches.contributions,
      facts.strict,
      facts.processContent,
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
      header.primaryIdentityHandle,
      provenanceHandle,
    );
    const watches = readWatches(
      this.store,
      context,
      `resource-definition-converged:${header.localKey}:watch`,
      definitionExpression,
      targetClass,
      header.primaryIdentityHandle,
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
      ...watches.open,
      ...dependencies.open,
    ];
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
        watches.watches,
        dependencies.dependencies,
        containerStrategy,
        defaultProperty,
        [
          new CustomAttributeDefinitionContribution(
            customAttributeContributionKind(observation),
            target,
            name,
            aliasDefinitions,
            key,
            isTemplateController,
            bindables.contributions,
            noMultiBindings,
            watches.contributions,
            dependencies.dependencies,
            containerStrategy,
            defaultProperty,
          ),
        ],
      ),
      open,
      [...bindables.records, ...watches.records],
      [...bindables.issues, ...watches.issues],
    );
  }

  private convergeThinNamedResource(
    definition: NamedResourceDefinitionHeader,
    observation: ResourceRecognitionObservation,
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
        return new ConvergedResourceDefinition(
          new ValueConverterDefinition(
            productHandle,
            header.primaryIdentityHandle,
            header.sourceAddressHandle,
            target,
            name,
            aliases,
            key,
            [new ValueConverterDefinitionContribution(valueConverterContributionKind(observation), target, name, aliases, key)],
          ),
          [],
        );
      }
      case ResourceDefinitionKind.BindingBehavior: {
        return new ConvergedResourceDefinition(
          new BindingBehaviorDefinition(
            productHandle,
            header.primaryIdentityHandle,
            header.sourceAddressHandle,
            target,
            name,
            aliases,
            key,
            [new BindingBehaviorDefinitionContribution(bindingBehaviorContributionKind(observation), target, name, aliases, key)],
          ),
          [],
        );
      }
      case ResourceDefinitionKind.BindingCommand: {
        return new ConvergedResourceDefinition(
          new BindingCommandDefinition(
            productHandle,
            header.primaryIdentityHandle,
            header.sourceAddressHandle,
            target,
            name,
            aliases,
            key,
            [new BindingCommandDefinitionContribution(bindingCommandContributionKind(observation), target, name, aliases, key)],
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
    observation: ResourceRecognitionObservation,
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
    return new ConvergedResourceDefinition(
      new AttributePatternDefinition(
        productHandle,
        header.primaryIdentityHandle,
        header.sourceAddressHandle,
        target,
        entries,
        [new AttributePatternDefinitionContribution(
          attributePatternContributionKind(observation),
          target,
          entries,
        )],
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
      if (emission == null) {
        return;
      }
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
  } | null {
    const sourceFileAddressHandle = sourceFileAddressHandleForNode(this.store, context, open.node);
    const sourceFile = open.node.getSourceFile();
    const span = sourceFileAddressHandle == null
      ? null
      : sourceSpanRangeForNode(sourceFile, open.node);
    if (sourceFileAddressHandle == null || span == null) {
      return null;
    }
    const local = `resource-definition-converged:${header.localKey}:open:${index}`;
    return recordsForSourceOpenSeam(this.store, {
      localKey: local,
      openKind: KernelVocabulary.Resource.OpenDefinitionField.key,
      summary: open.summary,
      sourceFileAddressHandle,
      start: span.start,
      end: span.end,
      evidenceRoles: [EvidenceRole.Diagnostic],
    });
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

function attributePatternContributionKind(
  observation: ResourceRecognitionObservation,
): AttributePatternDefinitionContributionKind {
  switch (observation.carrierKind) {
    case ResourceCarrierKind.AttributePatternCreate:
      return AttributePatternDefinitionContributionKind.CreateCall;
    case ResourceCarrierKind.Convention:
      return AttributePatternDefinitionContributionKind.Convention;
    case ResourceCarrierKind.Decorator:
    case ResourceCarrierKind.StaticAu:
    case ResourceCarrierKind.DefineCall:
      return AttributePatternDefinitionContributionKind.Header;
  }
}

function customElementContributionKind(
  observation: ResourceRecognitionObservation,
): CustomElementDefinitionContributionKind {
  switch (observation.carrierKind) {
    case ResourceCarrierKind.Decorator:
      return CustomElementDefinitionContributionKind.Annotation;
    case ResourceCarrierKind.StaticAu:
      return CustomElementDefinitionContributionKind.TypeStaticProperty;
    case ResourceCarrierKind.DefineCall:
      return CustomElementDefinitionContributionKind.DefinitionObject;
    case ResourceCarrierKind.AttributePatternCreate:
      return CustomElementDefinitionContributionKind.Header;
    case ResourceCarrierKind.Convention:
      return CustomElementDefinitionContributionKind.Convention;
  }
}

function customAttributeContributionKind(
  observation: ResourceRecognitionObservation,
): CustomAttributeDefinitionContributionKind {
  switch (observation.carrierKind) {
    case ResourceCarrierKind.Decorator:
      return CustomAttributeDefinitionContributionKind.Annotation;
    case ResourceCarrierKind.StaticAu:
      return CustomAttributeDefinitionContributionKind.TypeStaticProperty;
    case ResourceCarrierKind.DefineCall:
      return CustomAttributeDefinitionContributionKind.DefinitionObject;
    case ResourceCarrierKind.AttributePatternCreate:
      return CustomAttributeDefinitionContributionKind.Header;
    case ResourceCarrierKind.Convention:
      return CustomAttributeDefinitionContributionKind.Convention;
  }
}

function valueConverterContributionKind(
  observation: ResourceRecognitionObservation,
): ValueConverterDefinitionContributionKind {
  switch (observation.carrierKind) {
    case ResourceCarrierKind.Decorator:
      return ValueConverterDefinitionContributionKind.Annotation;
    case ResourceCarrierKind.StaticAu:
      return ValueConverterDefinitionContributionKind.TypeStaticProperty;
    case ResourceCarrierKind.DefineCall:
      return ValueConverterDefinitionContributionKind.DefinitionObject;
    case ResourceCarrierKind.AttributePatternCreate:
      return ValueConverterDefinitionContributionKind.Header;
    case ResourceCarrierKind.Convention:
      return ValueConverterDefinitionContributionKind.Convention;
  }
}

function bindingBehaviorContributionKind(
  observation: ResourceRecognitionObservation,
): BindingBehaviorDefinitionContributionKind {
  switch (observation.carrierKind) {
    case ResourceCarrierKind.Decorator:
      return BindingBehaviorDefinitionContributionKind.Annotation;
    case ResourceCarrierKind.StaticAu:
      return BindingBehaviorDefinitionContributionKind.TypeStaticProperty;
    case ResourceCarrierKind.DefineCall:
      return BindingBehaviorDefinitionContributionKind.DefinitionObject;
    case ResourceCarrierKind.AttributePatternCreate:
      return BindingBehaviorDefinitionContributionKind.Header;
    case ResourceCarrierKind.Convention:
      return BindingBehaviorDefinitionContributionKind.Convention;
  }
}

function bindingCommandContributionKind(
  observation: ResourceRecognitionObservation,
): BindingCommandDefinitionContributionKind {
  switch (observation.carrierKind) {
    case ResourceCarrierKind.Decorator:
      return BindingCommandDefinitionContributionKind.Annotation;
    case ResourceCarrierKind.StaticAu:
      return BindingCommandDefinitionContributionKind.TypeStaticProperty;
    case ResourceCarrierKind.DefineCall:
      return BindingCommandDefinitionContributionKind.DefinitionObject;
    case ResourceCarrierKind.AttributePatternCreate:
      return BindingCommandDefinitionContributionKind.Header;
    case ResourceCarrierKind.Convention:
      return BindingCommandDefinitionContributionKind.Convention;
  }
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

function readNearestStaticClassProperty(
  classPrototypeChain: readonly ts.ClassLikeDeclarationBase[],
  propertyName: string,
): ts.Expression | null {
  for (const classNode of classPrototypeChain) {
    const expression = readStaticClassProperty(classNode, propertyName);
    if (expression != null) {
      return expression;
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
  observation: ResourceRecognitionObservation,
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
    const conventional = readConventionalHtmlTemplate(store, context, targetClass, observation, local);
    if (conventional != null) {
      return conventional;
    }
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

function readConventionalHtmlTemplate(
  store: KernelStore,
  context: ResourceRecognitionContext,
  targetClass: ts.ClassLikeDeclarationBase | null,
  observation: ResourceRecognitionObservation,
  local: string,
): TemplateDefinitionRead | null {
  if (
    targetClass == null
    || (
      observation.carrierKind !== ResourceCarrierKind.Convention
      && observation.carrierKind !== ResourceCarrierKind.Decorator
      && observation.carrierKind !== ResourceCarrierKind.StaticAu
    )
  ) {
    return null;
  }
  const admission = readConventionalTemplateAdmission(context, targetClass);
  if (admission == null) {
    return null;
  }
  const absolutePath = path.resolve(context.projectRootDir ?? path.dirname(context.sourceFile.fileName), admission.path);
  if (!existsSync(absolutePath)) {
    return null;
  }

  const rawMarkup = readFileSync(absolutePath, 'utf8');
  const metadata = readHtmlTemplateMetadata(rawMarkup);
  const source = externalTemplateSourceAddress(store, admission.addressHandle, rawMarkup.length, local, metadata.sourceMap);
  return new TemplateDefinitionRead(
    new CustomElementTemplateDefinition(
      CustomElementTemplateKind.Markup,
      metadata.markup,
      source.addressHandle,
      source.sourceMap,
    ),
    source.records,
    readHtmlTemplateDependencies(context, admission.path, metadata.imports),
  );
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
  const absolutePath = path.resolve(path.dirname(context.sourceFile.fileName), templatePath);
  const admission = findTemplateAdmissionForAbsolutePath(context, absolutePath);
  if (admission == null) {
    return null;
  }
  if (!existsSync(absolutePath)) {
    return null;
  }

  const rawMarkup = readFileSync(absolutePath, 'utf8');
  const metadata = readHtmlTemplateMetadata(rawMarkup);
  const source = externalTemplateSourceAddress(store, admission.addressHandle, rawMarkup.length, local, metadata.sourceMap);
  return new TemplateDefinitionRead(
    new CustomElementTemplateDefinition(
      CustomElementTemplateKind.Markup,
      metadata.markup,
      source.addressHandle,
      source.sourceMap,
    ),
    source.records,
    readHtmlTemplateDependencies(context, admission.path, metadata.imports),
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

function externalTemplateSourceAddress(
  store: KernelStore,
  sourceFileAddressHandle: AddressHandle,
  markupLength: number,
  local: string,
  sourceMap: TemplateSourceOffsetMap | null = null,
): TemplateSourceAddressSet {
  const addressHandle = store.handles.address(`${local}:source`);
  const evidenceHandle = store.handles.evidence(local);
  const provenanceHandle = store.handles.provenance(local);
  const records: KernelStoreRecord[] = [
    new SourceSpanAddress(
      addressHandle,
      sourceFileAddressHandle,
      0,
      markupLength,
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
  return new TemplateSourceAddressSet(records, addressHandle, sourceMap);
}

function findTemplateAdmissionForAbsolutePath(
  context: ResourceRecognitionContext,
  absolutePath: string,
): SourceFileAdmission | null {
  const normalized = normalizeAbsolutePath(absolutePath);
  const projectRootDir = context.projectRootDir ?? path.dirname(context.sourceFile.fileName);
  return context.sourceFiles.find((source) =>
    normalizeAbsolutePath(path.resolve(projectRootDir, source.path)) === normalized
  ) ?? null;
}

function normalizeAbsolutePath(value: string): string {
  const normalized = path.resolve(value);
  return process.platform === 'win32' ? normalized.toLowerCase() : normalized;
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
  const sourceFile = node.getSourceFile();
  const sourceFileAddressHandle = sourceFileAddressHandleForNode(store, context, node);
  if (sourceFileAddressHandle == null) {
    return null;
  }
  const span = sourceSpanRangeForNode(sourceFile, node);
  if (span == null) {
    return null;
  }
  const addressHandle = store.handles.address(`${local}:source`);
  return new SourceSpanAddressSet(
    [
      new SourceSpanAddress(
        addressHandle,
        sourceFileAddressHandle,
        span.start,
        span.end,
        role,
      ),
    ],
    addressHandle,
  );
}

function sourceFileAddressHandleForNode(
  store: KernelStore,
  context: ResourceRecognitionContext,
  node: ts.Node,
): AddressHandle | null {
  const sourceFile = node.getSourceFile();
  return sourceFile === context.sourceFile
    ? context.sourceFileAddressHandle
    : store.readBestSourceFileAddressForFileName(sourceFile.fileName)?.handle ?? null;
}

interface SourceSpanRange {
  readonly start: number;
  readonly end: number;
}

function sourceSpanRangeForNode(
  sourceFile: ts.SourceFile,
  node: ts.Node | null,
): SourceSpanRange | null {
  if (node == null) {
    return null;
  }
  const sourceNode = sourceAddressNode(node);
  let start = sourceNode.getStart(sourceFile);
  let end = sourceNode.end;
  if (ts.isStringLiteralLike(sourceNode) || ts.isNoSubstitutionTemplateLiteral(sourceNode)) {
    start += 1;
    end -= 1;
  }
  if (end < start) {
    return null;
  }
  return { start, end };
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

function readCustomElementControllerNoShadowOnContainerlessIssue(
  store: KernelStore,
  context: ResourceRecognitionContext,
  local: string,
  definitionExpression: ts.Expression | null,
  targetClass: ts.ClassLikeDeclarationBase | null,
  ownerIdentityHandle: IdentityHandle | null,
  provenanceHandle: ProvenanceHandle,
  containerless: boolean,
  shadowOptions: ShadowOptionsDefinition | null,
  hasSlots: boolean,
): ResourceIssuePublication | null {
  if (!containerless || (shadowOptions == null && !hasSlots)) {
    return null;
  }
  const sourceNode = shadowOptions != null
    ? readFieldValue(context, definitionExpression, targetClass, 'shadowOptions')?.node ?? null
    : readFieldValue(context, definitionExpression, targetClass, 'hasSlots')?.node ?? null;
  const source = sourceSpanAddressForNode(
    store,
    context,
    sourceNode ?? definitionExpression ?? targetClass,
    `${local}:source`,
    SourceSpanRole.Value,
  );
  const publisher = new ResourceIssuePublisher(store);
  const publication = publisher.publish(
    `${local}:issue`,
    context.projectKey,
    ownerIdentityHandle,
    provenanceHandle,
    ResourceIssuePhase.CustomElementDefinition,
    ResourceIssueKind.ControllerNoShadowOnContainerless,
    'Containerless custom elements cannot request Shadow DOM or slot projection.',
    ResourceFrameworkErrorCode.ControllerNoShadowOnContainerless,
    source?.addressHandle ?? null,
  );
  return new ResourceIssuePublication(
    publication.issue,
    [...source?.records ?? [], ...publication.records],
  );
}

function readCustomElementProcessContent(
  store: KernelStore,
  context: ResourceRecognitionContext,
  local: string,
  definitionExpression: ts.Expression | null,
  targetClass: ts.ClassLikeDeclarationBase | null,
  ownerIdentityHandle: IdentityHandle | null,
  provenanceHandle: ProvenanceHandle,
): ProcessContentRead {
  const records: KernelStoreRecord[] = [];
  const issues: ResourceIssue[] = [];
  let target = readTargetField(context, definitionExpression, targetClass, 'processContent');
  if (targetClass == null) {
    return new ProcessContentRead(target);
  }

  for (const [index, decorator] of (ts.canHaveDecorators(targetClass) ? ts.getDecorators(targetClass) ?? [] : []).entries()) {
    const call = decoratorCallNamed(decorator, 'processContent');
    if (call == null) {
      continue;
    }
    const argument = call.arguments[0] ?? null;
    if (argument == null) {
      const issue = publishResourceIssue(
        store,
        context,
        `${local}:class:${index}`,
        ResourceIssuePhase.ProcessContentDecorator,
        ResourceIssueKind.InvalidProcessContentHook,
        'Class-level @processContent must provide a static function hook.',
        ResourceFrameworkErrorCode.InvalidProcessContentHook,
        decorator,
        SourceSpanRole.Name,
        ownerIdentityHandle,
        provenanceHandle,
      );
      records.push(...issue.records);
      issues.push(issue.issue);
      continue;
    }
    const hook = readProcessContentHookArgument(store, context, `${local}:class:${index}:hook`, targetClass, argument);
    if (hook.target != null) {
      target = hook.target;
      records.push(...hook.records);
      continue;
    }
    if (hook.issueNode != null) {
      const issue = publishResourceIssue(
        store,
        context,
        `${local}:class:${index}`,
        ResourceIssuePhase.ProcessContentDecorator,
        ResourceIssueKind.InvalidProcessContentHook,
        'Class-level @processContent did not resolve to a static function hook.',
        ResourceFrameworkErrorCode.InvalidProcessContentHook,
        hook.issueNode,
        SourceSpanRole.Value,
        ownerIdentityHandle,
        provenanceHandle,
      );
      records.push(...issue.records);
      issues.push(issue.issue);
    }
  }

  for (const [memberIndex, member] of targetClass.members.entries()) {
    if (!ts.canHaveDecorators(member)) {
      continue;
    }
    for (const [decoratorIndex, decorator] of (ts.getDecorators(member) ?? []).entries()) {
      const call = decoratorCallNamed(decorator, 'processContent');
      if (call == null) {
        continue;
      }
      const localKey = `${local}:member:${memberIndex}:${decoratorIndex}`;
      if (call.arguments.length === 0 && ts.isMethodDeclaration(member) && hasStaticModifier(member)) {
        const source = sourceSpanAddressForNode(store, context, memberNameNode(member) ?? member, `${localKey}:source`, SourceSpanRole.Name);
        records.push(...source?.records ?? []);
        target = new ResourceTargetReference(null, source?.addressHandle ?? null, memberName(member));
        continue;
      }
      const issue = publishResourceIssue(
        store,
        context,
        localKey,
        ResourceIssuePhase.ProcessContentDecorator,
        ResourceIssueKind.InvalidProcessContentHook,
        '@processContent() must decorate a static method when used as a method decorator.',
        ResourceFrameworkErrorCode.InvalidProcessContentHook,
        memberNameNode(member) ?? decorator,
        SourceSpanRole.Name,
        ownerIdentityHandle,
        provenanceHandle,
      );
      records.push(...issue.records);
      issues.push(issue.issue);
    }
  }

  return new ProcessContentRead(target, records, issues);
}

function readCustomElementDecoratorIssues(
  store: KernelStore,
  context: ResourceRecognitionContext,
  local: string,
  targetClass: ts.ClassLikeDeclarationBase | null,
  ownerIdentityHandle: IdentityHandle | null,
  provenanceHandle: ProvenanceHandle,
): ResourceIssueRead {
  if (targetClass == null) {
    return new ResourceIssueRead();
  }
  const records: KernelStoreRecord[] = [];
  const issues: ResourceIssue[] = [];

  for (const [decoratorIndex, decorator] of (ts.canHaveDecorators(targetClass) ? ts.getDecorators(targetClass) ?? [] : []).entries()) {
    if (!isSlottedDecorator(decorator)) {
      continue;
    }
    const publication = publishResourceIssue(
      store,
      context,
      `${local}:class-slotted:${decoratorIndex}`,
      ResourceIssuePhase.SlottedDecorator,
      ResourceIssueKind.SlottedDecoratorInvalidUsage,
      '@slotted can only decorate a class field.',
      ResourceFrameworkErrorCode.SlottedDecoratorInvalidUsage,
      decorator,
      SourceSpanRole.Name,
      ownerIdentityHandle,
      provenanceHandle,
    );
    records.push(...publication.records);
    issues.push(publication.issue);
  }

  for (const [memberIndex, member] of targetClass.members.entries()) {
    const decorators = ts.canHaveDecorators(member) ? ts.getDecorators(member) ?? [] : [];
    for (const [decoratorIndex, decorator] of decorators.entries()) {
      const childrenQuery = readChildrenDecoratorQuery(context, decorator);
      if (childrenQuery != null && /[\s>]/.test(childrenQuery.query)) {
        const publication = publishResourceIssue(
          store,
          context,
          `${local}:children:${memberIndex}:${decoratorIndex}`,
          ResourceIssuePhase.ChildrenDecorator,
          ResourceIssueKind.ChildrenInvalidQuery,
          `@children query '${childrenQuery.query}' is rejected by Aurelia because it contains whitespace or '>'.`,
          ResourceFrameworkErrorCode.ChildrenInvalidQuery,
          childrenQuery.sourceNode,
          SourceSpanRole.Value,
          ownerIdentityHandle,
          provenanceHandle,
        );
        records.push(...publication.records);
        issues.push(publication.issue);
      }

      if (isSlottedDecorator(decorator) && !ts.isPropertyDeclaration(member)) {
        const publication = publishResourceIssue(
          store,
          context,
          `${local}:slotted:${memberIndex}:${decoratorIndex}`,
          ResourceIssuePhase.SlottedDecorator,
          ResourceIssueKind.SlottedDecoratorInvalidUsage,
          '@slotted can only decorate a class field.',
          ResourceFrameworkErrorCode.SlottedDecoratorInvalidUsage,
          decorator,
          SourceSpanRole.Name,
          ownerIdentityHandle,
          provenanceHandle,
        );
        records.push(...publication.records);
        issues.push(publication.issue);
      }
    }
  }

  return new ResourceIssueRead(records, issues);
}

function readChildrenDecoratorQuery(
  context: ResourceRecognitionContext,
  decorator: ts.Decorator,
): { readonly query: string; readonly sourceNode: ts.Node } | null {
  const call = decoratorCallNamed(decorator, 'children');
  if (call == null) {
    return null;
  }
  const argument = call.arguments[0] ?? null;
  if (argument == null) {
    return null;
  }
  const queryRead = readObjectProperty(context.expressionReader, argument, 'query')
    ?? context.expressionReader.evaluateExpression(argument);
  const query = queryRead.value == null ? null : readStaticStringValue(queryRead.value);
  return query == null
    ? null
    : { query, sourceNode: queryRead.node ?? argument };
}

function readProcessContentHookArgument(
  store: KernelStore,
  context: ResourceRecognitionContext,
  local: string,
  targetClass: ts.ClassLikeDeclarationBase,
  argument: ts.Expression,
): { readonly target: ResourceTargetReference | null; readonly records: readonly KernelStoreRecord[]; readonly issueNode: ts.Node | null } {
  const read = context.expressionReader.evaluateExpression(argument);
  const value = read.value;
  if (value?.kind === EvaluationValueKind.Function) {
    const source = sourceSpanAddressForNode(store, context, argument, `${local}:source`, SourceSpanRole.Value);
    return { target: targetReferenceForFunction(value, source?.addressHandle ?? null), records: source?.records ?? [], issueNode: null };
  }
  if (value?.kind === EvaluationValueKind.String) {
    const member = readStaticMethod(targetClass, value.value);
    if (member == null) {
      return { target: null, records: [], issueNode: argument };
    }
    const source = sourceSpanAddressForNode(store, context, memberNameNode(member) ?? member, `${local}:source`, SourceSpanRole.Name);
    return { target: new ResourceTargetReference(null, source?.addressHandle ?? null, value.value), records: source?.records ?? [], issueNode: null };
  }
  if (value == null || value.kind === EvaluationValueKind.Unknown || value.kind === EvaluationValueKind.BoundaryValue) {
    return { target: null, records: [], issueNode: null };
  }
  return { target: null, records: [], issueNode: argument };
}

function readStaticMethod(
  targetClass: ts.ClassLikeDeclarationBase,
  propertyName: string,
): ts.MethodDeclaration | null {
  for (const member of targetClass.members) {
    if (ts.isMethodDeclaration(member) && hasStaticModifier(member) && readPropertyName(member.name) === propertyName) {
      return member;
    }
  }
  return null;
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
      const checkerTarget = readCheckerDependencyReference(context, element.expression);
      if (checkerTarget != null) {
        dependencies.push(checkerTarget);
        continue;
      }
      appendConvergenceOpen(open, 'Resource dependency entry did not close to a static class or function.', element.expression);
      continue;
    }
    const target = dependencyReferenceForFunction(element.value);
    if (target.identityHandle == null && target.localName == null) {
      appendConvergenceOpen(open, 'Resource dependency entry did not expose a usable target name.', element.expression);
      continue;
    }
    dependencies.push(target);
  }
  if (value.mayHaveUnknownElements || value.mayHaveUnknownOrder) {
    appendConvergenceOpen(open, 'Resource dependencies include open spread, hole, or unknown-order entries.', value.node);
  }
  return new ResourceDependenciesRead(dependencies, open);
}

function mergeResourceDependencies(
  left: ResourceDependenciesRead,
  right: ResourceDependenciesRead,
): ResourceDependenciesRead {
  const dependencies: ResourceDependencyReference[] = [];
  const seen = new Set<string>();
  for (const dependency of [...left.dependencies, ...right.dependencies]) {
    const key = resourceDependencyReferenceKey(dependency);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    dependencies.push(dependency);
  }
  return new ResourceDependenciesRead(
    dependencies,
    [...left.open, ...right.open],
  );
}

function readHtmlTemplateDependencies(
  context: ResourceRecognitionContext,
  templatePath: string,
  imports: readonly HtmlTemplateMetadataImport[],
): ResourceDependenciesRead {
  return new ResourceDependenciesRead(
    imports.map((htmlImport) => {
      const moduleKey = resolveTemplateImportModuleKey(context, templatePath, htmlImport.specifier);
      return new ResourceDependencyReference(
        null,
        templateImportDependencyKeyName(htmlImport.specifier, moduleKey),
        moduleKey,
        null,
      );
    }),
    [],
  );
}

function resolveTemplateImportModuleKey(
  context: ResourceRecognitionContext,
  templatePath: string,
  specifier: string,
): string | null {
  const pathOnly = specifier.split(/[?#]/, 1)[0] ?? '';
  if (!pathOnly.startsWith('.')) {
    return null;
  }

  const importerDir = path.posix.dirname(normalizeProjectModulePath(templatePath));
  const resolved = normalizeProjectModulePath(path.posix.normalize(path.posix.join(importerDir, pathOnly)));
  const candidates = templateImportModuleKeyCandidates(resolved);
  return context.sourceFiles.find((source) => candidates.has(normalizeProjectModulePath(source.path)))?.path ?? null;
}

function templateImportModuleKeyCandidates(
  resolved: string,
): ReadonlySet<string> {
  const extension = path.posix.extname(resolved);
  if (extension.length > 0) {
    return new Set([resolved]);
  }
  return new Set([
    `${resolved}.ts`,
    `${resolved}.tsx`,
    `${resolved}.js`,
    `${resolved}.jsx`,
    `${resolved}.mjs`,
    `${resolved}.cjs`,
    path.posix.join(resolved, 'index.ts'),
    path.posix.join(resolved, 'index.tsx'),
    path.posix.join(resolved, 'index.js'),
    path.posix.join(resolved, 'index.jsx'),
  ]);
}

function templateImportDependencyKeyName(
  specifier: string,
  moduleKey: string | null,
): string | null {
  return moduleKey == null
    ? conventionalResourceNameForFilePath(specifier)
    : conventionalResourceNameForFilePath(moduleKey);
}

function normalizeProjectModulePath(value: string): string {
  return value.replace(/\\/g, '/').replace(/^\.\//, '');
}

function resourceDependencyReferenceKey(
  reference: ResourceDependencyReference,
): string {
  return [
    reference.identityHandle ?? '',
    reference.keyName ?? '',
    reference.moduleKey ?? '',
    reference.localName ?? '',
  ].join('\0');
}

function readCheckerDependencyReference(
  context: ResourceRecognitionContext,
  expression: ts.Expression | null,
): ResourceDependencyReference | null {
  if (expression == null || context.typeSystem == null) {
    return null;
  }
  const checker = context.typeSystem.checker;
  const symbol = readAliasedValueSymbol(checker, expression);
  const declaration = symbol?.valueDeclaration ?? symbol?.declarations?.[0] ?? null;
  const type = checker.getTypeAtLocation(expression);
  const moduleKey = declaration == null
    ? null
    : context.typeSystem.readModuleKeyForSourceFile(declaration.getSourceFile());
  if (
    moduleKey == null
    && !isCheckerConstructableOrCallable(type)
    && !isClassOrFunctionDeclaration(declaration)
  ) {
    return null;
  }
  const localName = readDeclarationLocalName(declaration) ?? symbol?.getName() ?? null;
  return localName == null ? null : new ResourceDependencyReference(null, localName, moduleKey, localName);
}

function readAliasedValueSymbol(
  checker: ts.TypeChecker,
  expression: ts.Expression,
): ts.Symbol | null {
  const symbol = checker.getSymbolAtLocation(expression) ?? null;
  if (symbol == null) {
    return null;
  }
  return (symbol.flags & ts.SymbolFlags.Alias) !== 0
    ? checker.getAliasedSymbol(symbol)
    : symbol;
}

function isCheckerConstructableOrCallable(type: ts.Type): boolean {
  return type.getConstructSignatures().length > 0 || type.getCallSignatures().length > 0;
}

function isClassOrFunctionDeclaration(
  declaration: ts.Declaration | null,
): boolean {
  return declaration != null
    && (
      ts.isClassDeclaration(declaration)
      || ts.isClassExpression(declaration)
      || ts.isFunctionDeclaration(declaration)
      || ts.isFunctionExpression(declaration)
      || ts.isArrowFunction(declaration)
    );
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
  ownerIdentityHandle: IdentityHandle | null,
  provenanceHandle: ProvenanceHandle,
): BindableRead {
  const classPrototypeChain = readClassPrototypeChain(context, targetClass);
  const bindableMetadataChain = [...classPrototypeChain].reverse();
  const staticBindables = readNearestStaticClassProperty(classPrototypeChain, 'bindables');
  const reads = [
    ...bindableMetadataChain.flatMap((classNode, index) => {
      const classContext = context.readNodeContext(classNode);
      return readDecoratorBindables(
        store,
        classContext,
        `${local}:decorator:${index}`,
        classNode,
        ownerIdentityHandle,
        provenanceHandle,
        classNode === targetClass ? BindableContributionKind.Decorator : BindableContributionKind.InheritedMetadata,
      );
    }),
    ...readBindableListExpression(
      store,
      context.readNodeContext(staticBindables),
      `${local}:static`,
      staticBindables,
      provenanceHandle,
      BindableContributionKind.StaticBindables,
    ),
    ...readBindableListValue(store, context, `${local}:definition-object`, readObjectProperty(context.expressionReader, definitionExpression, 'bindables'), provenanceHandle, BindableContributionKind.RuntimePartial),
  ];
  const byName = new Map<string, BindableDefinition>();
  const contributions: BindableDefinitionContribution[] = [];
  const open: ConvergenceOpen[] = [];
  const records: KernelStoreRecord[] = [];
  const issues: ResourceIssue[] = [];
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
    issues.push(...read.issues);
  }
  return new BindableRead([...byName.values()], contributions, open, records, issues);
}

function readClassPrototypeChain(
  context: ResourceRecognitionContext,
  targetClass: ts.ClassLikeDeclarationBase | null,
): readonly ts.ClassLikeDeclarationBase[] {
  if (targetClass == null) {
    return [];
  }
  return context.typeSystem?.readClassPrototypeChain(targetClass) ?? [targetClass];
}

class BindableEntryRead {
  constructor(
    readonly bindable: BindableDefinition | null,
    readonly contribution: BindableDefinitionContribution | null,
    readonly open: ConvergenceOpen | null,
    readonly records: readonly KernelStoreRecord[] = [],
    readonly issues: readonly ResourceIssue[] = [],
  ) {}
}

function readDecoratorBindables(
  store: KernelStore,
  context: ResourceRecognitionContext,
  local: string,
  targetClass: ts.ClassLikeDeclarationBase | null,
  ownerIdentityHandle: IdentityHandle | null,
  provenanceHandle: ProvenanceHandle,
  contributionKind: BindableContributionKind,
): readonly BindableEntryRead[] {
  if (targetClass == null) {
    return [];
  }
  const entries: BindableEntryRead[] = [];
  for (const [index, decorator] of (ts.canHaveDecorators(targetClass) ? ts.getDecorators(targetClass) ?? [] : []).entries()) {
    const entry = readClassBindableDecorator(store, context, `${local}:class:${index}`, decorator, ownerIdentityHandle, provenanceHandle, contributionKind);
    if (entry != null) {
      entries.push(entry);
    }
  }
  for (const member of targetClass.members) {
    const propertyName = memberName(member);
    if (!ts.canHaveDecorators(member)) {
      continue;
    }
    for (const [index, decorator] of (ts.getDecorators(member) ?? []).entries()) {
      const entry = readMemberBindableDecorator(store, context, `${local}:member:${propertyName ?? 'computed'}:${index}`, decorator, member, propertyName, ownerIdentityHandle, provenanceHandle, contributionKind);
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
  ownerIdentityHandle: IdentityHandle | null,
  provenanceHandle: ProvenanceHandle,
  contributionKind: BindableContributionKind,
): BindableEntryRead | null {
  if (decoratorIdentifierNamed(decorator, 'bindable')) {
    return publishBindableIssueEntry(
      store,
      context,
      local,
      ResourceIssueKind.InvalidBindableDecoratorUsageClassWithoutPropertyNameConfiguration,
      'Class-level @bindable must provide a property name in its configuration.',
      ResourceFrameworkErrorCode.InvalidBindableDecoratorUsageClassWithoutPropertyNameConfiguration,
      decorator,
      SourceSpanRole.Name,
      ownerIdentityHandle,
      provenanceHandle,
    );
  }
  const call = decoratorCallNamed(decorator, 'bindable');
  if (call == null) {
    return null;
  }
  const argument = call.arguments[0] ?? null;
  if (argument == null) {
    return publishBindableIssueEntry(
      store,
      context,
      local,
      ResourceIssueKind.InvalidBindableDecoratorUsageClassWithoutPropertyNameConfiguration,
      'Class-level @bindable must provide a property name in its configuration.',
      ResourceFrameworkErrorCode.InvalidBindableDecoratorUsageClassWithoutPropertyNameConfiguration,
      decorator,
      SourceSpanRole.Name,
      ownerIdentityHandle,
      provenanceHandle,
    );
  }
  const value = context.expressionReader.evaluateExpression(argument).value;
  const source = sourceSpanAddressForNode(store, context, argument, local, SourceSpanRole.Name);
  if (value?.kind === EvaluationValueKind.Null) {
    return publishBindableIssueEntry(
      store,
      context,
      local,
      ResourceIssueKind.InvalidBindableDecoratorUsageClassWithoutConfiguration,
      'Class-level @bindable cannot use a null configuration.',
      ResourceFrameworkErrorCode.InvalidBindableDecoratorUsageClassWithoutConfiguration,
      argument,
      SourceSpanRole.Value,
      ownerIdentityHandle,
      provenanceHandle,
    );
  }
  if (value?.kind === EvaluationValueKind.String) {
    return bindableEntry(value.value, null, contributionKind, provenanceHandle, source);
  }
  if (value?.kind === EvaluationValueKind.Object) {
    const nameProperty = value.properties.get('name') ?? null;
    const name = nameProperty == null ? null : readStaticStringValue(nameProperty.value);
    if (name != null && name.length > 0) {
      return bindableEntry(name, value, contributionKind, provenanceHandle, source);
    }
    if (nameProperty != null && nameProperty.value.kind !== EvaluationValueKind.String) {
      return publishBindableIssueEntry(
        store,
        context,
        local,
        ResourceIssueKind.InvalidBindableDecoratorUsageSymbol,
        'Class-level @bindable property names must be strings.',
        ResourceFrameworkErrorCode.InvalidBindableDecoratorUsageSymbol,
        nameProperty.node,
        SourceSpanRole.Value,
        ownerIdentityHandle,
        provenanceHandle,
      );
    }
    return publishBindableIssueEntry(
      store,
      context,
      local,
      ResourceIssueKind.InvalidBindableDecoratorUsageClassWithoutPropertyNameConfiguration,
      'Class-level @bindable must provide a property name in its configuration.',
      ResourceFrameworkErrorCode.InvalidBindableDecoratorUsageClassWithoutPropertyNameConfiguration,
      nameProperty?.node ?? argument,
      SourceSpanRole.Value,
      ownerIdentityHandle,
      provenanceHandle,
    );
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
  propertyName: string | null,
  ownerIdentityHandle: IdentityHandle | null,
  provenanceHandle: ProvenanceHandle,
  contributionKind: BindableContributionKind,
): BindableEntryRead | null {
  const source = sourceSpanAddressForNode(store, context, memberNameNode(member) ?? member, local, SourceSpanRole.Name);
  const expression = decorator.expression;
  if (propertyName == null && isBindableDecorator(decorator)) {
    return publishBindableIssueEntry(
      store,
      context,
      local,
      ResourceIssueKind.InvalidBindableDecoratorUsageSymbol,
      '@bindable cannot target a symbol or computed property name.',
      ResourceFrameworkErrorCode.InvalidBindableDecoratorUsageSymbol,
      memberNameNode(member) ?? member,
      SourceSpanRole.Name,
      ownerIdentityHandle,
      provenanceHandle,
    );
  }
  if (propertyName == null) {
    return null;
  }
  if (ts.isIdentifier(expression) && expression.text === 'bindable') {
    return bindableEntry(propertyName, null, contributionKind, provenanceHandle, source);
  }
  const call = decoratorCallNamed(decorator, 'bindable');
  if (call == null) {
    return null;
  }
  const argument = call.arguments[0] ?? null;
  if (argument == null) {
    return bindableEntry(propertyName, null, contributionKind, provenanceHandle, source);
  }
  const value = context.expressionReader.evaluateExpression(argument).value;
  if (value == null || value.kind !== EvaluationValueKind.Object) {
    const fallback = bindableEntry(
      propertyName,
      null,
      contributionKind,
      provenanceHandle,
      source,
      readCheckerBindableSetter(context, argument),
    );
    return new BindableEntryRead(
      fallback.bindable,
      fallback.contribution,
      new ConvergenceOpen('@bindable(...) configuration did not close to a static object.', argument),
      fallback.records,
    );
  }
  return bindableEntry(propertyName, value, contributionKind, provenanceHandle, source);
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
    if (value.mayHaveUnknownElements || value.mayHaveUnknownOrder) {
      return [
        ...entries,
        new BindableEntryRead(null, null, nullableConvergenceOpenForNode('Bindable array includes open spread, hole, or unknown-order entries.', value.node)),
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
  setterOverride: BindableSetterDefinition | null = null,
): BindableEntryRead {
  const attribute = readObjectString(partial, 'attribute') ?? bindableAttributeNameForProperty(propertyName);
  const callback = readObjectString(partial, 'callback') ?? `${propertyName}Changed`;
  const mode = readBindableMode(partial?.properties.get('mode')?.value) ?? BindableBindingMode.ToView;
  const name = readObjectString(partial, 'name') ?? propertyName;
  const setter = setterOverride ?? readBindableSetter(partial);
  return new BindableEntryRead(
    new BindableDefinition(
      attribute,
      callback,
      mode,
      name,
      setter,
      source?.addressHandle ?? null,
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

function readCheckerBindableSetter(
  context: ResourceRecognitionContext,
  expression: ts.Expression,
): BindableSetterDefinition | null {
  if (context.typeSystem == null) {
    return null;
  }
  const type = context.typeSystem.checker.getTypeAtLocation(expression);
  return context.typeSystem.checker.getPropertyOfType(type, 'set') == null
    ? null
    : new BindableSetterDefinition(BindableSetterKind.Open);
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

class WatchEntryRead {
  constructor(
    readonly watch: WatchDefinition | null,
    readonly contribution: WatchDefinitionContribution | null,
    readonly open: ConvergenceOpen | null,
    readonly records: readonly KernelStoreRecord[] = [],
    readonly issues: readonly ResourceIssue[] = [],
  ) {}
}

function readWatches(
  store: KernelStore,
  context: ResourceRecognitionContext,
  local: string,
  definitionExpression: ts.Expression | null,
  targetClass: ts.ClassLikeDeclarationBase | null,
  ownerIdentityHandle: IdentityHandle | null,
  provenanceHandle: ProvenanceHandle,
): WatchRead {
  const publisher = new ResourceIssuePublisher(store);
  const reads = [
    ...readDecoratorWatches(store, context, publisher, `${local}:decorator`, targetClass, ownerIdentityHandle, provenanceHandle),
    ...readWatchListExpression(store, context, publisher, `${local}:static`, readStaticClassProperty(targetClass, 'watches'), targetClass, ownerIdentityHandle, provenanceHandle, WatchContributionKind.StaticWatches),
    ...readWatchListValue(store, context, publisher, `${local}:definition-object`, readObjectProperty(context.expressionReader, definitionExpression, 'watches'), targetClass, ownerIdentityHandle, provenanceHandle, WatchContributionKind.DefinitionObject),
  ];
  return watchReadFromEntries(reads);
}

function watchReadFromEntries(reads: readonly WatchEntryRead[]): WatchRead {
  const watches: WatchDefinition[] = [];
  const contributions: WatchDefinitionContribution[] = [];
  const open: ConvergenceOpen[] = [];
  const records: KernelStoreRecord[] = [];
  const issues: ResourceIssue[] = [];
  for (const read of reads) {
    if (read.watch != null) {
      watches.push(read.watch);
    }
    if (read.contribution != null) {
      contributions.push(read.contribution);
    }
    if (read.open != null) {
      open.push(read.open);
    }
    records.push(...read.records);
    issues.push(...read.issues);
  }
  return new WatchRead(watches, contributions, open, records, issues);
}

function readDecoratorWatches(
  store: KernelStore,
  context: ResourceRecognitionContext,
  publisher: ResourceIssuePublisher,
  local: string,
  targetClass: ts.ClassLikeDeclarationBase | null,
  ownerIdentityHandle: IdentityHandle | null,
  provenanceHandle: ProvenanceHandle,
): readonly WatchEntryRead[] {
  if (targetClass == null) {
    return [];
  }
  return [
    ...readClassWatchDecorators(store, context, publisher, `${local}:class`, targetClass, ownerIdentityHandle, provenanceHandle),
    ...targetClass.members.flatMap((member) =>
      readMemberWatchDecorators(store, context, publisher, `${local}:member`, member, targetClass, ownerIdentityHandle, provenanceHandle)
    ),
  ];
}

function readClassWatchDecorators(
  store: KernelStore,
  context: ResourceRecognitionContext,
  publisher: ResourceIssuePublisher,
  local: string,
  targetClass: ts.ClassLikeDeclarationBase,
  ownerIdentityHandle: IdentityHandle | null,
  provenanceHandle: ProvenanceHandle,
): readonly WatchEntryRead[] {
  const decorators = ts.canHaveDecorators(targetClass) ? ts.getDecorators(targetClass) ?? [] : [];
  return decorators
    .map((decorator, index) => readClassWatchDecorator(store, context, publisher, `${local}:${index}`, decorator, targetClass, ownerIdentityHandle, provenanceHandle))
    .filter((entry): entry is WatchEntryRead => entry != null);
}

function readMemberWatchDecorators(
  store: KernelStore,
  context: ResourceRecognitionContext,
  publisher: ResourceIssuePublisher,
  local: string,
  member: ts.ClassElement,
  targetClass: ts.ClassLikeDeclarationBase,
  ownerIdentityHandle: IdentityHandle | null,
  provenanceHandle: ProvenanceHandle,
): readonly WatchEntryRead[] {
  const name = memberName(member);
  if (name == null || !ts.canHaveDecorators(member)) {
    return [];
  }
  return (ts.getDecorators(member) ?? [])
    .map((decorator, index) => readMethodWatchDecorator(store, context, publisher, `${local}:${name}:${index}`, decorator, member, targetClass, name, ownerIdentityHandle, provenanceHandle))
    .filter((entry): entry is WatchEntryRead => entry != null);
}

function readClassWatchDecorator(
  store: KernelStore,
  context: ResourceRecognitionContext,
  publisher: ResourceIssuePublisher,
  local: string,
  decorator: ts.Decorator,
  targetClass: ts.ClassLikeDeclarationBase,
  ownerIdentityHandle: IdentityHandle | null,
  provenanceHandle: ProvenanceHandle,
): WatchEntryRead | null {
  const call = decoratorCallNamed(decorator, 'watch');
  if (call == null) {
    return null;
  }
  const expressionIssue = readWatchNullConfigIssue(
    store,
    context,
    publisher,
    `${local}:expression`,
    call.arguments[0] ?? null,
    call,
    ownerIdentityHandle,
    provenanceHandle,
  );
  if (expressionIssue != null) {
    return expressionIssue;
  }
  const callbackIssue = readClassWatchInvalidChangeHandlerIssue(
    store,
    context,
    publisher,
    `${local}:callback`,
    call.arguments[1] ?? null,
    call,
    targetClass,
    ownerIdentityHandle,
    provenanceHandle,
  );
  if (callbackIssue != null) {
    return callbackIssue;
  }
  return readWatchCall(
    store,
    context,
    publisher,
    local,
    call.arguments[0] ?? null,
    call.arguments[1] ?? null,
    call.arguments[2] ?? null,
    call,
    targetClass,
    WatchContributionKind.Decorator,
    ownerIdentityHandle,
    provenanceHandle,
  );
}

function readMethodWatchDecorator(
  store: KernelStore,
  context: ResourceRecognitionContext,
  publisher: ResourceIssuePublisher,
  local: string,
  decorator: ts.Decorator,
  member: ts.ClassElement,
  targetClass: ts.ClassLikeDeclarationBase,
  methodName: string,
  ownerIdentityHandle: IdentityHandle | null,
  provenanceHandle: ProvenanceHandle,
): WatchEntryRead | null {
  const call = decoratorCallNamed(decorator, 'watch');
  if (call == null) {
    return null;
  }
  if (!ts.isMethodDeclaration(member) || hasStaticModifier(member)) {
    return publishWatchIssueEntry(
      store,
      context,
      publisher,
      local,
      ResourceIssuePhase.WatchDecorator,
      ResourceIssueKind.WatchNonMethodDecoratorUsage,
      'The @watch decorator can only be used on instance methods.',
      ResourceFrameworkErrorCode.WatchNonMethodDecoratorUsage,
      memberNameNode(member) ?? member,
      SourceSpanRole.Name,
      ownerIdentityHandle,
      provenanceHandle,
    );
  }
  const expressionIssue = readWatchNullConfigIssue(
    store,
    context,
    publisher,
    `${local}:expression`,
    call.arguments[0] ?? null,
    call,
    ownerIdentityHandle,
    provenanceHandle,
  );
  if (expressionIssue != null) {
    return expressionIssue;
  }
  const callbackSource = sourceSpanAddressForNode(store, context, memberNameNode(member) ?? member, `${local}:callback`, SourceSpanRole.Name);
  return readWatchCall(
    store,
    context,
    publisher,
    local,
    call.arguments[0] ?? null,
    watchMethodNameExpression(methodName, callbackSource?.addressHandle ?? null),
    call.arguments[1] ?? null,
    call,
    targetClass,
    WatchContributionKind.Decorator,
    ownerIdentityHandle,
    provenanceHandle,
    callbackSource?.records ?? [],
  );
}

function readWatchCall(
  store: KernelStore,
  context: ResourceRecognitionContext,
  publisher: ResourceIssuePublisher,
  local: string,
  expressionNode: ts.Expression | null,
  callbackNode: ts.Expression | WatchCallbackDefinition | null,
  optionsNode: ts.Expression | null,
  carrierNode: ts.Node,
  targetClass: ts.ClassLikeDeclarationBase | null,
  contributionKind: WatchContributionKind,
  ownerIdentityHandle: IdentityHandle | null,
  provenanceHandle: ProvenanceHandle,
  extraRecords: readonly KernelStoreRecord[] = [],
): WatchEntryRead {
  if (expressionNode == null || callbackNode == null) {
    return new WatchEntryRead(null, null, new ConvergenceOpen('@watch requires static expression and callback metadata.', expressionNode ?? optionsNode ?? carrierNode));
  }
  const expressionSource = sourceSpanAddressForNode(store, context, expressionNode, `${local}:expression`, SourceSpanRole.Value);
  const callbackSource = callbackNode instanceof WatchCallbackDefinition
    ? null
    : sourceSpanAddressForNode(store, context, callbackNode, `${local}:callback`, SourceSpanRole.Value);
  const expression = readWatchExpression(context.expressionReader.evaluateExpression(expressionNode).value, expressionSource?.addressHandle ?? null);
  const callback = callbackNode instanceof WatchCallbackDefinition
    ? callbackNode
    : readWatchCallback(context.expressionReader.evaluateExpression(callbackNode).value, callbackSource?.addressHandle ?? null);
  const flush = readWatchFlush(context, optionsNode);
  if (expression == null || callback == null || flush == null) {
    return new WatchEntryRead(null, null, nullableConvergenceOpenForNode('Watch metadata did not close to a static expression, callback, and flush mode.', expressionNode));
  }
  return watchEntry(
    store,
    context,
    publisher,
    local,
    expression,
    callback,
    flush,
    contributionKind,
    targetClass,
    ownerIdentityHandle,
    provenanceHandle,
    [...extraRecords, ...expressionSource?.records ?? [], ...callbackSource?.records ?? []],
  );
}

function readWatchNullConfigIssue(
  store: KernelStore,
  context: ResourceRecognitionContext,
  publisher: ResourceIssuePublisher,
  local: string,
  expressionNode: ts.Expression | null,
  carrierNode: ts.Node,
  ownerIdentityHandle: IdentityHandle | null,
  provenanceHandle: ProvenanceHandle,
): WatchEntryRead | null {
  if (expressionNode != null) {
    const value = context.expressionReader.evaluateExpression(expressionNode).value;
    if (value?.kind !== EvaluationValueKind.Null && value?.kind !== EvaluationValueKind.Undefined) {
      return null;
    }
  }
  return publishWatchIssueEntry(
    store,
    context,
    publisher,
    local,
    ResourceIssuePhase.WatchDecorator,
    ResourceIssueKind.WatchNullConfig,
    '@watch requires a non-null expression or property key.',
    ResourceFrameworkErrorCode.WatchNullConfig,
    expressionNode ?? carrierNode,
    SourceSpanRole.Value,
    ownerIdentityHandle,
    provenanceHandle,
  );
}

function readClassWatchInvalidChangeHandlerIssue(
  store: KernelStore,
  context: ResourceRecognitionContext,
  publisher: ResourceIssuePublisher,
  local: string,
  callbackNode: ts.Expression | null,
  carrierNode: ts.Node,
  targetClass: ts.ClassLikeDeclarationBase,
  ownerIdentityHandle: IdentityHandle | null,
  provenanceHandle: ProvenanceHandle,
): WatchEntryRead | null {
  if (callbackNode == null) {
    return publishWatchIssueEntry(
      store,
      context,
      publisher,
      local,
      ResourceIssuePhase.WatchDecorator,
      ResourceIssueKind.WatchInvalidChangeHandler,
      'Class @watch requires a callable callback or a method name present on the prototype.',
      ResourceFrameworkErrorCode.WatchInvalidChangeHandler,
      carrierNode,
      SourceSpanRole.Value,
      ownerIdentityHandle,
      provenanceHandle,
    );
  }
  const callback = readWatchCallback(
    context.expressionReader.evaluateExpression(callbackNode).value,
    null,
  );
  if (callback == null) {
    return publishWatchIssueEntry(
      store,
      context,
      publisher,
      local,
      ResourceIssuePhase.WatchDecorator,
      ResourceIssueKind.WatchInvalidChangeHandler,
      'Class @watch callback metadata did not close to a function or prototype method name.',
      ResourceFrameworkErrorCode.WatchInvalidChangeHandler,
      callbackNode,
      SourceSpanRole.Value,
      ownerIdentityHandle,
      provenanceHandle,
    );
  }
  if (callback.kind === WatchCallbackKind.Function) {
    return null;
  }
  const propertyName = watchPropertyKeyText(callback.methodName);
  if (propertyName == null) {
    return publishWatchIssueEntry(
      store,
      context,
      publisher,
      local,
      ResourceIssuePhase.WatchDecorator,
      ResourceIssueKind.WatchInvalidChangeHandler,
      'Class @watch callback method name could not be reduced to a prototype property key.',
      ResourceFrameworkErrorCode.WatchInvalidChangeHandler,
      callbackNode,
      SourceSpanRole.Value,
      ownerIdentityHandle,
      provenanceHandle,
    );
  }
  return readPrototypeCallbackState(context, targetClass, propertyName) === WatchCallbackResolution.Missing
    ? publishWatchIssueEntry(
      store,
      context,
      publisher,
      local,
      ResourceIssuePhase.WatchDecorator,
      ResourceIssueKind.WatchInvalidChangeHandler,
      `Class @watch callback '${propertyName}' is not present on the resource prototype.`,
      ResourceFrameworkErrorCode.WatchInvalidChangeHandler,
      callbackNode,
      SourceSpanRole.Value,
      ownerIdentityHandle,
      provenanceHandle,
    )
    : null;
}

function readControllerWatchInvalidCallbackIssue(
  store: KernelStore,
  context: ResourceRecognitionContext,
  publisher: ResourceIssuePublisher,
  local: string,
  callback: WatchCallbackDefinition,
  targetClass: ts.ClassLikeDeclarationBase | null,
  ownerIdentityHandle: IdentityHandle | null,
  provenanceHandle: ProvenanceHandle,
): ResourceIssuePublication | null {
  if (targetClass == null || callback.kind !== WatchCallbackKind.MethodName) {
    return null;
  }
  const propertyName = watchPropertyKeyText(callback.methodName);
  if (propertyName == null) {
    return null;
  }
  const state = readInstanceCallbackState(context, targetClass, propertyName);
  if (state !== WatchCallbackResolution.Missing && state !== WatchCallbackResolution.NonCallable) {
    return null;
  }
  return publisher.publish(
    `${local}:issue`,
    context.projectKey,
    ownerIdentityHandle,
    provenanceHandle,
    ResourceIssuePhase.WatchMetadata,
    ResourceIssueKind.ControllerWatchInvalidCallback,
    state === WatchCallbackResolution.Missing
      ? `Watch callback '${propertyName}' is not declared on the resource instance.`
      : `Watch callback '${propertyName}' is not callable on the resource instance.`,
    ResourceFrameworkErrorCode.ControllerWatchInvalidCallback,
    callback.methodName?.target?.addressHandle ?? null,
  );
}

function publishWatchIssueEntry(
  store: KernelStore,
  context: ResourceRecognitionContext,
  publisher: ResourceIssuePublisher,
  local: string,
  phase: ResourceIssuePhase,
  issueKind: ResourceIssueKind,
  message: string,
  frameworkErrorCode: string,
  sourceNode: ts.Node,
  sourceRole: SourceSpanRole,
  ownerIdentityHandle: IdentityHandle | null,
  provenanceHandle: ProvenanceHandle,
): WatchEntryRead {
  const source = sourceSpanAddressForNode(store, context, sourceNode, `${local}:source`, sourceRole);
  const publication = publisher.publish(
    `${local}:issue`,
    context.projectKey,
    ownerIdentityHandle,
    provenanceHandle,
    phase,
    issueKind,
    message,
    frameworkErrorCode,
    source?.addressHandle ?? null,
  );
  return new WatchEntryRead(
    null,
    null,
    null,
    [...source?.records ?? [], ...publication.records],
    [publication.issue],
  );
}

function publishBindableIssueEntry(
  store: KernelStore,
  context: ResourceRecognitionContext,
  local: string,
  issueKind: ResourceIssueKind,
  message: string,
  frameworkErrorCode: string,
  sourceNode: ts.Node,
  sourceRole: SourceSpanRole,
  ownerIdentityHandle: IdentityHandle | null,
  provenanceHandle: ProvenanceHandle,
): BindableEntryRead {
  const publication = publishResourceIssue(
    store,
    context,
    local,
    ResourceIssuePhase.BindableDecorator,
    issueKind,
    message,
    frameworkErrorCode,
    sourceNode,
    sourceRole,
    ownerIdentityHandle,
    provenanceHandle,
  );
  return new BindableEntryRead(
    null,
    null,
    null,
    publication.records,
    [publication.issue],
  );
}

function publishResourceIssue(
  store: KernelStore,
  context: ResourceRecognitionContext,
  local: string,
  phase: ResourceIssuePhase,
  issueKind: ResourceIssueKind,
  message: string,
  frameworkErrorCode: string,
  sourceNode: ts.Node,
  sourceRole: SourceSpanRole,
  ownerIdentityHandle: IdentityHandle | null,
  provenanceHandle: ProvenanceHandle,
): ResourceIssuePublication {
  const source = sourceSpanAddressForNode(store, context, sourceNode, `${local}:source`, sourceRole);
  const publisher = new ResourceIssuePublisher(store);
  const publication = publisher.publish(
    `${local}:issue`,
    context.projectKey,
    ownerIdentityHandle,
    provenanceHandle,
    phase,
    issueKind,
    message,
    frameworkErrorCode,
    source?.addressHandle ?? null,
  );
  return new ResourceIssuePublication(
    publication.issue,
    [...source?.records ?? [], ...publication.records],
  );
}

const enum WatchCallbackResolution {
  Callable = 'callable',
  NonCallable = 'non-callable',
  Missing = 'missing',
  Unknown = 'unknown',
}

function readPrototypeCallbackState(
  context: ResourceRecognitionContext,
  targetClass: ts.ClassLikeDeclarationBase,
  propertyName: string,
): WatchCallbackResolution {
  if (context.typeSystem == null) {
    return WatchCallbackResolution.Unknown;
  }
  const symbol = readInstanceMemberSymbol(context, targetClass, propertyName);
  if (symbol == null) {
    return WatchCallbackResolution.Missing;
  }
  return hasPrototypeMemberDeclaration(symbol)
    ? readMemberCallableState(context, targetClass, symbol)
    : WatchCallbackResolution.Missing;
}

function readInstanceCallbackState(
  context: ResourceRecognitionContext,
  targetClass: ts.ClassLikeDeclarationBase,
  propertyName: string,
): WatchCallbackResolution {
  if (context.typeSystem == null) {
    return WatchCallbackResolution.Unknown;
  }
  const symbol = readInstanceMemberSymbol(context, targetClass, propertyName);
  return symbol == null
    ? WatchCallbackResolution.Missing
    : readMemberCallableState(context, targetClass, symbol);
}

function readInstanceMemberSymbol(
  context: ResourceRecognitionContext,
  targetClass: ts.ClassLikeDeclarationBase,
  propertyName: string,
): ts.Symbol | null {
  if (context.typeSystem == null) {
    return null;
  }
  const checker = context.typeSystem.checker;
  const classSymbol = targetClass.name == null ? null : checker.getSymbolAtLocation(targetClass.name) ?? null;
  const instanceType = classSymbol == null
    ? checker.getTypeAtLocation(targetClass)
    : checker.getDeclaredTypeOfSymbol(classSymbol);
  return checker.getPropertyOfType(instanceType, propertyName) ?? null;
}

function hasPrototypeMemberDeclaration(symbol: ts.Symbol): boolean {
  return (symbol.declarations ?? []).some((declaration) =>
    ts.isMethodDeclaration(declaration)
    || ts.isGetAccessorDeclaration(declaration)
    || ts.isSetAccessorDeclaration(declaration)
    || ts.isMethodSignature(declaration)
  );
}

function readMemberCallableState(
  context: ResourceRecognitionContext,
  targetClass: ts.ClassLikeDeclarationBase,
  symbol: ts.Symbol,
): WatchCallbackResolution {
  if (context.typeSystem == null) {
    return WatchCallbackResolution.Unknown;
  }
  const type = context.typeSystem.checker.getTypeOfSymbolAtLocation(symbol, targetClass);
  if ((type.flags & (ts.TypeFlags.Any | ts.TypeFlags.Unknown)) !== 0) {
    return WatchCallbackResolution.Unknown;
  }
  return type.getCallSignatures().length > 0
    ? WatchCallbackResolution.Callable
    : WatchCallbackResolution.NonCallable;
}

function watchPropertyKeyText(propertyKey: WatchPropertyKeyDefinition | null): string | null {
  return propertyKey?.text ?? null;
}

function watchMethodNameExpression(methodName: string, addressHandle: AddressHandle | null): WatchCallbackDefinition {
  return new WatchCallbackDefinition(
    WatchCallbackKind.MethodName,
    new WatchPropertyKeyDefinition(WatchPropertyKeyKind.String, methodName, null, new ResourceTargetReference(null, addressHandle, methodName)),
  );
}

function readWatchListExpression(
  store: KernelStore,
  context: ResourceRecognitionContext,
  publisher: ResourceIssuePublisher,
  local: string,
  expression: ts.Expression | null,
  targetClass: ts.ClassLikeDeclarationBase | null,
  ownerIdentityHandle: IdentityHandle | null,
  provenanceHandle: ProvenanceHandle,
  contributionKind: WatchContributionKind,
): readonly WatchEntryRead[] {
  return expression == null
    ? []
    : readWatchListValue(store, context, publisher, local, context.expressionReader.evaluateExpression(expression), targetClass, ownerIdentityHandle, provenanceHandle, contributionKind);
}

function readWatchListValue(
  store: KernelStore,
  context: ResourceRecognitionContext,
  publisher: ResourceIssuePublisher,
  local: string,
  read: EvaluationRead<EvaluationValue> | null,
  targetClass: ts.ClassLikeDeclarationBase | null,
  ownerIdentityHandle: IdentityHandle | null,
  provenanceHandle: ProvenanceHandle,
  contributionKind: WatchContributionKind,
): readonly WatchEntryRead[] {
  const value = read?.value;
  if (value == null || value.kind === EvaluationValueKind.Undefined) {
    return [];
  }
  if (value.kind !== EvaluationValueKind.Array) {
    return [new WatchEntryRead(null, null, nullableConvergenceOpenForRead('Watch list did not close to a static array.', read))];
  }
  const entries = value.elements.map((element, index) =>
    readWatchListEntry(store, context, publisher, `${local}:array:${index}`, element.value, element.expression, targetClass, ownerIdentityHandle, provenanceHandle, contributionKind)
  );
  return value.mayHaveUnknownElements || value.mayHaveUnknownOrder
    ? [...entries, new WatchEntryRead(null, null, nullableConvergenceOpenForNode('Watch array includes open spread, hole, or unknown-order entries.', value.node))]
    : entries;
}

function readWatchListEntry(
  store: KernelStore,
  context: ResourceRecognitionContext,
  publisher: ResourceIssuePublisher,
  local: string,
  value: EvaluationValue,
  node: ts.Expression | null,
  targetClass: ts.ClassLikeDeclarationBase | null,
  ownerIdentityHandle: IdentityHandle | null,
  provenanceHandle: ProvenanceHandle,
  contributionKind: WatchContributionKind,
): WatchEntryRead {
  if (value.kind !== EvaluationValueKind.Object) {
    return new WatchEntryRead(null, null, nullableConvergenceOpenForNode('Watch array entry did not close to a static object.', node));
  }
  const source = node == null ? null : sourceSpanAddressForNode(store, context, node, local, SourceSpanRole.Value);
  const expression = readWatchExpression(value.properties.get('expression')?.value ?? null, source?.addressHandle ?? null);
  const callback = readWatchCallback(value.properties.get('callback')?.value ?? null, source?.addressHandle ?? null);
  const flush = readWatchFlushValue(value.properties.get('flush')?.value ?? null);
  return expression == null || callback == null || flush == null
    ? new WatchEntryRead(null, null, nullableConvergenceOpenForNode('Watch entry did not expose static expression, callback, and flush fields.', node))
    : watchEntry(
      store,
      context,
      publisher,
      local,
      expression,
      callback,
      flush,
      contributionKind,
      targetClass,
      ownerIdentityHandle,
      provenanceHandle,
      source?.records ?? [],
    );
}

function watchEntry(
  store: KernelStore,
  context: ResourceRecognitionContext,
  publisher: ResourceIssuePublisher,
  local: string,
  expression: WatchExpressionDefinition,
  callback: WatchCallbackDefinition,
  flush: WatchFlushMode,
  contributionKind: WatchContributionKind,
  targetClass: ts.ClassLikeDeclarationBase | null,
  ownerIdentityHandle: IdentityHandle | null,
  provenanceHandle: ProvenanceHandle,
  records: readonly KernelStoreRecord[],
): WatchEntryRead {
  const callbackIssue = readControllerWatchInvalidCallbackIssue(
    store,
    context,
    publisher,
    `${local}:callback`,
    callback,
    targetClass,
    ownerIdentityHandle,
    provenanceHandle,
  );
  return new WatchEntryRead(
    new WatchDefinition(expression, callback, flush),
    new WatchDefinitionContribution(contributionKind, expression, callback, flush),
    null,
    [...records, ...callbackIssue?.records ?? []],
    callbackIssue == null ? [] : [callbackIssue.issue],
  );
}

function readWatchExpression(
  value: EvaluationValue | null,
  addressHandle: AddressHandle | null,
): WatchExpressionDefinition | null {
  const propertyKey = readWatchPropertyKey(value, addressHandle);
  if (propertyKey != null) {
    return new WatchExpressionDefinition(WatchExpressionKind.PropertyKey, propertyKey);
  }
  return value?.kind === EvaluationValueKind.Function
    ? new WatchExpressionDefinition(WatchExpressionKind.DependencyCollectionFunction, null, targetReferenceForFunction(value, addressHandle))
    : null;
}

function readWatchCallback(
  value: EvaluationValue | null,
  addressHandle: AddressHandle | null,
): WatchCallbackDefinition | null {
  const propertyKey = readWatchPropertyKey(value, addressHandle);
  if (propertyKey != null) {
    return new WatchCallbackDefinition(WatchCallbackKind.MethodName, propertyKey);
  }
  return value?.kind === EvaluationValueKind.Function
    ? new WatchCallbackDefinition(WatchCallbackKind.Function, null, targetReferenceForFunction(value, addressHandle))
    : null;
}

function readWatchPropertyKey(
  value: EvaluationValue | null,
  addressHandle: AddressHandle | null,
): WatchPropertyKeyDefinition | null {
  if (value?.kind === EvaluationValueKind.String) {
    return new WatchPropertyKeyDefinition(WatchPropertyKeyKind.String, value.value, null, new ResourceTargetReference(null, addressHandle, value.value));
  }
  return value?.kind === EvaluationValueKind.Number
    ? new WatchPropertyKeyDefinition(WatchPropertyKeyKind.Number, String(value.value), value.value)
    : null;
}

function readWatchFlush(
  context: ResourceRecognitionContext,
  optionsNode: ts.Expression | null,
): WatchFlushMode | null {
  if (optionsNode == null) {
    return WatchFlushMode.Async;
  }
  const value = context.expressionReader.evaluateExpression(optionsNode).value;
  if (value == null || value.kind === EvaluationValueKind.Undefined) {
    return WatchFlushMode.Async;
  }
  return value.kind === EvaluationValueKind.Object
    ? readWatchFlushValue(value.properties.get('flush')?.value ?? null)
    : null;
}

function readWatchFlushValue(value: EvaluationValue | null): WatchFlushMode | null {
  if (value == null || value.kind === EvaluationValueKind.Undefined) {
    return WatchFlushMode.Async;
  }
  if (value.kind === EvaluationValueKind.String && value.value === 'sync') {
    return WatchFlushMode.Sync;
  }
  if (value.kind === EvaluationValueKind.String && value.value === 'async') {
    return WatchFlushMode.Async;
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

function dependencyReferenceForFunction(
  value: Extract<EvaluationValue, { readonly kind: EvaluationValueKind.Function | EvaluationValueKind.Class }>,
): ResourceDependencyReference {
  const localName = value.declaration.name != null && ts.isIdentifier(value.declaration.name)
    ? value.declaration.name.text
    : null;
  return new ResourceDependencyReference(
    null,
    localName,
    value.environment.moduleKey,
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

function decoratorIdentifierNamed(decorator: ts.Decorator, name: string): boolean {
  const expression = decorator.expression;
  if (ts.isIdentifier(expression)) {
    return expression.text === name;
  }
  return ts.isPropertyAccessExpression(expression) && expression.name.text === name;
}

function isBindableDecorator(decorator: ts.Decorator): boolean {
  return decoratorIdentifierNamed(decorator, 'bindable') || decoratorCallNamed(decorator, 'bindable') != null;
}

function isSlottedDecorator(decorator: ts.Decorator): boolean {
  return decoratorIdentifierNamed(decorator, 'slotted') || decoratorCallNamed(decorator, 'slotted') != null;
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
