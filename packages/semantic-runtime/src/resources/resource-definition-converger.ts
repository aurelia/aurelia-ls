import {
  existsSync,
  readFileSync,
} from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import type { SourceFileAdmission } from '../boot/frames.js';
import {
  SourceSpanRole,
} from '../kernel/address.js';
import { SemanticClaim } from '../kernel/claim.js';
import {
  EvidenceKind,
  EvidenceRecord,
  EvidenceRole,
} from '../kernel/evidence.js';
import type {
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
import { readStaticStringValue } from '../evaluation/expression-reader.js';
import {
  hasStaticModifier,
  readDeclarationLocalName,
  readPropertyName,
  unwrapExpression,
} from '../evaluation/ts-syntax.js';
import {
  EvaluationValueKind,
  type EvaluationValue,
} from '../evaluation/values.js';
import {
  AttributePatternDefinition,
  AttributePatternDefinitionContribution,
  AttributePatternDefinitionEntry,
} from './attribute-pattern-definition.js';
import {
  readBindables,
  type BindableRead,
} from './bindable-convergence.js';
import {
  BindingBehaviorDefinition,
  BindingBehaviorDefinitionContribution,
} from './binding-behavior-definition.js';
import {
  BindingCommandDefinition,
  BindingCommandDefinitionContribution,
} from './binding-command-definition.js';
import {
  CustomAttributeContainerStrategy,
  CustomAttributeDefinition,
  CustomAttributeDefinitionContribution,
} from './custom-attribute-definition.js';
import {
  CustomElementCaptureDefinition,
  CustomElementCaptureKind,
  CustomElementDefinition,
  CustomElementDefinitionContribution,
  CustomElementTemplateDefinition,
  CustomElementTemplateKind,
  ShadowOptionsDefinition,
  ShadowRootMode,
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
  type ResourceRecognitionObservation,
  type ResourceTargetObservation,
} from './resource-observation.js';
import {
  ResourceCarrierKind,
  ResourceDefinitionKind,
  attributePatternContributionKindForCarrier,
  namedResourceContributionKindForCarrier,
  runtimeResourceKeyForKind,
} from './resource-kind.js';
import { toAureliaResourceIdentityKind } from './named-resource-kind.js';
import {
  readHtmlTemplateMetadata,
  type HtmlTemplateMetadataImport,
} from './html-template-metadata.js';
import {
  readAliasMetadataAnnotations,
  readCustomElementMetadataAnnotations,
} from './resource-metadata-annotations.js';
import type { ResourceDefinitionHeaderEmission } from './resource-definition-header-emission.js';
import type { ResourceRecognitionKernelEmission } from './resource-recognition-kernel-emitter.js';
import {
  ResourceAliasDefinition,
  ResourceDependencyReference,
  ResourceDependencyReferenceKind,
  ResourceRegistryDependencyKind,
  ResourceTargetReference,
} from './resource-reference.js';
import {
  AureliaStyleRegistryCallKind,
  aureliaStyleRegistryCallKind,
  aureliaStyleRegistryKeyName,
} from './style-registry-call.js';
import {
  externalTemplateSourceAddress,
  sourceFileAddressHandleForNode,
  sourceSpanAddressForNode,
  sourceSpanRangeForNode,
  templateCarrierExpression,
  templateMarkupSourceAddress,
} from './resource-source-address.js';
import {
  ConvergenceOpen,
  appendConvergenceOpen,
  convergenceOpenForNode,
  convergenceOpenForRead,
  decoratorCallNamed,
  decoratorIdentifierNamed,
  dependencyReferenceForFunction,
  memberName,
  memberNameNode,
  mergeAliases,
  nullableConvergenceOpenForNode,
  openIfPresent,
  readBooleanField,
  readFieldValue,
  readObjectProperty,
  readStaticStringArrayClassProperty,
  readStringField,
  targetReferenceForFunction,
} from './resource-convergence-support.js';
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
} from './value-converter-definition.js';
import {
  readWatches,
  WatchDefinitionObjectWatchesPolicy,
  type WatchRead,
} from './watch-convergence.js';

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

class ProcessContentRead {
  constructor(
    readonly target: ResourceTargetReference | null,
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

class CustomElementConvergenceFrame {
  private readonly targetClass: ts.ClassLikeDeclarationBase | null;
  private readonly definitionExpression: ts.Expression | null;
  private readonly annotations: ReturnType<typeof readCustomElementMetadataAnnotations>;
  private readonly localPrefix: string;

  constructor(
    private readonly store: KernelStore,
    private readonly context: ResourceRecognitionContext,
    private readonly definition: CustomElementDefinitionHeader,
    private readonly observation: ResourceRecognitionObservation,
    private readonly header: ResourceDefinitionHeaderEmission,
    private readonly provenanceHandle: ProvenanceHandle,
  ) {
    this.targetClass = classNodeForTarget(definition.target);
    this.definitionExpression = expressionNode(observation.definitionNode);
    this.annotations = readCustomElementMetadataAnnotations(context, this.targetClass);
    this.localPrefix = `resource-definition-converged:${header.localKey}`;
  }

  read(): CustomElementConvergenceFacts | null {
    const target = this.header.targetReference;
    const name = this.definition.name;
    const key = name == null ? null : runtimeResourceKeyForKind(this.definition.type, name);
    if (target == null || name == null || key == null) {
      return null;
    }

    const bindables = this.readBindables();
    const watches = this.readWatches();
    const aliases = mergeAliases(
      this.annotations.aliases,
      this.definition.aliases,
      readStaticStringArrayClassProperty(this.context, this.targetClass, 'aliases'),
    );
    const capture = this.annotations.capture
      ?? readCustomElementCapture(this.context, this.definitionExpression, this.targetClass);
    const template = this.readTemplate();
    const dependencies = this.readDependencies(template);
    const containerless = this.annotations.containerless
      ?? readBooleanField(this.context, this.definitionExpression, this.targetClass, 'containerless')
      ?? false;
    const shadowOptions = this.annotations.shadowOptions
      ?? readShadowOptions(this.context, this.definitionExpression, this.targetClass);
    const hasSlots = readBooleanField(this.context, this.definitionExpression, this.targetClass, 'hasSlots') ?? false;
    const controllerIssue = this.readControllerIssue(containerless, shadowOptions, hasSlots);
    const processContent = this.readProcessContent();
    const decoratorIssues = this.readDecoratorIssues();
    const aliasDefinitions = aliases.map((alias) =>
      new ResourceAliasDefinition(alias, this.header.sourceAddressHandle, this.provenanceHandle)
    );

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
      enhance: readBooleanField(this.context, this.definitionExpression, this.targetClass, 'enhance') ?? false,
      needsCompile: readBooleanField(this.context, this.definitionExpression, this.targetClass, 'needsCompile') ?? true,
      strict: readBooleanField(this.context, this.definitionExpression, this.targetClass, 'strict'),
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
      open: this.readOpen(bindables, watches, dependencies),
    };
  }

  private readBindables(): BindableRead {
    return readBindables(
      this.store,
      this.context,
      this.local('bindable'),
      this.definitionExpression,
      this.targetClass,
      this.header.primaryIdentityHandle,
      this.provenanceHandle,
    );
  }

  private readWatches(): WatchRead {
    return readWatches(
      this.store,
      this.context,
      this.local('watch'),
      this.definitionExpression,
      this.targetClass,
      this.header.primaryIdentityHandle,
      this.provenanceHandle,
      WatchDefinitionObjectWatchesPolicy.Include,
    );
  }

  private readTemplate(): TemplateDefinitionRead {
    return readCustomElementTemplate(
      this.store,
      this.context,
      this.definitionExpression,
      this.targetClass,
      this.observation,
      this.local('template'),
    );
  }

  private readDependencies(
    template: TemplateDefinitionRead,
  ): ResourceDependenciesRead {
    return mergeResourceDependencies(
      new ResourceDependenciesRead(this.annotations.dependencies, []),
      readResourceDependencies(this.context, this.definitionExpression, this.targetClass),
      template.dependencies,
    );
  }

  private readControllerIssue(
    containerless: boolean,
    shadowOptions: ShadowOptionsDefinition | null,
    hasSlots: boolean,
  ): ResourceIssuePublication | null {
    return readCustomElementControllerNoShadowOnContainerlessIssue(
      this.store,
      this.context,
      this.local('controller'),
      this.definitionExpression,
      this.targetClass,
      this.header.primaryIdentityHandle,
      this.provenanceHandle,
      containerless,
      shadowOptions,
      hasSlots,
      this.annotations.shadowOptionsSourceNode,
    );
  }

  private readProcessContent(): ProcessContentRead {
    const target = readTargetField(this.context, this.definitionExpression, this.targetClass, 'processContent');
    if (this.targetClass == null) {
      return new ProcessContentRead(target);
    }
    const classDecorators = this.readClassProcessContentDecorators(target);
    const memberDecorators = this.readMemberProcessContentDecorators(classDecorators.target);
    return new ProcessContentRead(
      memberDecorators.target,
      [...classDecorators.records, ...memberDecorators.records],
      [...classDecorators.issues, ...memberDecorators.issues],
    );
  }

  private readClassProcessContentDecorators(
    initialTarget: ResourceTargetReference | null,
  ): ProcessContentRead {
    if (this.targetClass == null) {
      return new ProcessContentRead(initialTarget);
    }
    const records: KernelStoreRecord[] = [];
    const issues: ResourceIssue[] = [];
    let target = initialTarget;
    for (const [index, decorator] of (ts.canHaveDecorators(this.targetClass) ? ts.getDecorators(this.targetClass) ?? [] : []).entries()) {
      const call = decoratorCallNamed(decorator, 'processContent');
      if (call == null) {
        continue;
      }
      const argument = call.arguments[0] ?? null;
      if (argument == null) {
        const issue = this.publishInvalidProcessContentHook(
          `class:${index}`,
          'Class-level @processContent must provide a static function hook.',
          decorator,
          SourceSpanRole.Name,
        );
        records.push(...issue.records);
        issues.push(issue.issue);
        continue;
      }
      const hook = readProcessContentHookArgument(
        this.store,
        this.context,
        this.local(`class:${index}:hook`),
        this.targetClass,
        argument,
      );
      if (hook.target != null) {
        target = hook.target;
        records.push(...hook.records);
        continue;
      }
      if (hook.issueNode != null) {
        const issue = this.publishInvalidProcessContentHook(
          `class:${index}`,
          'Class-level @processContent did not resolve to a static function hook.',
          hook.issueNode,
          SourceSpanRole.Value,
        );
        records.push(...issue.records);
        issues.push(issue.issue);
      }
    }
    return new ProcessContentRead(target, records, issues);
  }

  private readMemberProcessContentDecorators(
    initialTarget: ResourceTargetReference | null,
  ): ProcessContentRead {
    if (this.targetClass == null) {
      return new ProcessContentRead(initialTarget);
    }
    const records: KernelStoreRecord[] = [];
    const issues: ResourceIssue[] = [];
    let target = initialTarget;
    for (const [memberIndex, member] of this.targetClass.members.entries()) {
      if (!ts.canHaveDecorators(member)) {
        continue;
      }
      for (const [decoratorIndex, decorator] of (ts.getDecorators(member) ?? []).entries()) {
        const call = decoratorCallNamed(decorator, 'processContent');
        if (call == null) {
          continue;
        }
        const localKey = `member:${memberIndex}:${decoratorIndex}`;
        if (call.arguments.length === 0 && ts.isMethodDeclaration(member) && hasStaticModifier(member)) {
          const source = sourceSpanAddressForNode(
            this.store,
            this.context,
            memberNameNode(member) ?? member,
            `${this.local(localKey)}:source`,
            SourceSpanRole.Name,
          );
          records.push(...source?.records ?? []);
          target = new ResourceTargetReference(null, source?.addressHandle ?? null, memberName(member));
          continue;
        }
        const issue = this.publishInvalidProcessContentHook(
          localKey,
          '@processContent() must decorate a static method when used as a method decorator.',
          memberNameNode(member) ?? decorator,
          SourceSpanRole.Name,
        );
        records.push(...issue.records);
        issues.push(issue.issue);
      }
    }
    return new ProcessContentRead(target, records, issues);
  }

  private publishInvalidProcessContentHook(
    localSuffix: string,
    summary: string,
    node: ts.Node,
    sourceRole: SourceSpanRole,
  ): ResourceIssuePublication {
    return publishResourceIssue(
      this.store,
      this.context,
      this.local(localSuffix),
      ResourceIssuePhase.ProcessContentDecorator,
      ResourceIssueKind.InvalidProcessContentHook,
      summary,
      ResourceFrameworkErrorCode.InvalidProcessContentHook,
      node,
      sourceRole,
      this.header.primaryIdentityHandle,
      this.provenanceHandle,
    );
  }

  private readDecoratorIssues(): ResourceIssueRead {
    return readCustomElementDecoratorIssues(
      this.store,
      this.context,
      this.local('decorator'),
      this.targetClass,
      this.header.primaryIdentityHandle,
      this.provenanceHandle,
    );
  }

  private readOpen(
    bindables: BindableRead,
    watches: WatchRead,
    dependencies: ResourceDependenciesRead,
  ): readonly ConvergenceOpen[] {
    return [
      ...this.annotations.open,
      ...bindables.open,
      ...watches.open,
      ...dependencies.open,
      ...openIfPresent(this.context, this.definitionExpression, this.targetClass, 'instructions', 'Custom element instructions are present before template lowering is modeled.'),
      ...openIfPresent(this.context, this.definitionExpression, this.targetClass, 'surrogates', 'Custom element surrogates are present before surrogate lowering is modeled.'),
    ];
  }

  private local(segment: string): string {
    return `${this.localPrefix}:${segment}`;
  }
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
        return this.convergeThinNamedResource(context, definition, observation, header, productHandle, provenanceHandle);
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
    const facts = new CustomElementConvergenceFrame(
      this.store,
      context,
      definition,
      observation,
      header,
      provenanceHandle,
    ).read();
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
      namedResourceContributionKindForCarrier(observation.carrierKind),
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
    const annotations = readAliasMetadataAnnotations(context, targetClass);
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
      WatchDefinitionObjectWatchesPolicy.Ignore,
    );
    const aliases = mergeAliases(annotations.aliases, definition.aliases, readStaticStringArrayClassProperty(context, targetClass, 'aliases'));
    const isTemplateController = definition.type === ResourceDefinitionKind.TemplateController
      || readBooleanField(context, definitionExpression, targetClass, 'isTemplateController') === true;
    const noMultiBindings = readBooleanField(context, definitionExpression, targetClass, 'noMultiBindings') ?? false;
    const defaultProperty = readStringField(context, definitionExpression, targetClass, 'defaultProperty') ?? 'value';
    const containerStrategy = readContainerStrategy(context, definitionExpression, targetClass);
    const dependencies = readResourceDependencies(context, definitionExpression, targetClass);
    const open = [
      ...annotations.open,
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
            namedResourceContributionKindForCarrier(observation.carrierKind),
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
    context: ResourceRecognitionContext,
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

    const targetClass = classNodeForTarget(definition.target);
    const annotations = readAliasMetadataAnnotations(context, targetClass);
    const aliasNames = mergeAliases(annotations.aliases, definition.aliases, readStaticStringArrayClassProperty(context, targetClass, 'aliases'));
    const aliases = aliasNames.map((alias) => new ResourceAliasDefinition(alias, header.sourceAddressHandle, provenanceHandle));
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
            [new ValueConverterDefinitionContribution(namedResourceContributionKindForCarrier(observation.carrierKind), target, name, aliases, key)],
          ),
          annotations.open,
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
            [new BindingBehaviorDefinitionContribution(namedResourceContributionKindForCarrier(observation.carrierKind), target, name, aliases, key)],
          ),
          annotations.open,
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
            [new BindingCommandDefinitionContribution(namedResourceContributionKindForCarrier(observation.carrierKind), target, name, aliases, key)],
          ),
          annotations.open,
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
          attributePatternContributionKindForCarrier(observation.carrierKind),
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
    const sourceFileAddressHandle = sourceFileAddressHandleForNode(context, open.node);
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

function expressionNode(node: ts.Node | null): ts.Expression | null {
  return node != null && ts.isExpression(node) ? node : null;
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
  shadowOptionsSourceNode: ts.Node | null = null,
): ResourceIssuePublication | null {
  if (!containerless || (shadowOptions == null && !hasSlots)) {
    return null;
  }
  const sourceNode = shadowOptions != null
    ? shadowOptionsSourceNode ?? readFieldValue(context, definitionExpression, targetClass, 'shadowOptions')?.node ?? null
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
      const styleRegistryTarget = readStyleRegistryDependencyReference(element.expression);
      if (styleRegistryTarget != null) {
        dependencies.push(styleRegistryTarget);
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
  ...reads: readonly ResourceDependenciesRead[]
): ResourceDependenciesRead {
  const dependencies: ResourceDependencyReference[] = [];
  const seen = new Set<string>();
  const open: ConvergenceOpen[] = [];
  for (const read of reads) {
    open.push(...read.open);
    for (const dependency of read.dependencies) {
      const key = resourceDependencyReferenceKey(dependency);
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      dependencies.push(dependency);
    }
  }
  return new ResourceDependenciesRead(dependencies, open);
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
    reference.dependencyKind,
    reference.identityHandle ?? '',
    reference.keyName ?? '',
    reference.moduleKey ?? '',
    reference.localName ?? '',
    reference.registryKind ?? '',
  ].join('\0');
}

function readStyleRegistryDependencyReference(
  expression: ts.Expression | null,
): ResourceDependencyReference | null {
  if (expression == null || !ts.isCallExpression(expression)) {
    return null;
  }
  const callKind = aureliaStyleRegistryCallKind(expression.getSourceFile(), expression.expression);
  if (callKind == null) {
    return null;
  }
  const keyName = aureliaStyleRegistryKeyName(callKind);
  return new ResourceDependencyReference(
    null,
    keyName,
    null,
    keyName,
    ResourceDependencyReferenceKind.Registry,
    callKind === AureliaStyleRegistryCallKind.CssModules
      ? ResourceRegistryDependencyKind.CssModules
      : ResourceRegistryDependencyKind.ShadowCss,
  );
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

function isSlottedDecorator(decorator: ts.Decorator): boolean {
  return decoratorIdentifierNamed(decorator, 'slotted') || decoratorCallNamed(decorator, 'slotted') != null;
}
