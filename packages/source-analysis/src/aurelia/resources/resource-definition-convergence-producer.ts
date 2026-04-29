import ts from 'typescript';
import {
  AddressStability,
  SourceSpanAddress,
  SourceSpanRole,
} from '../kernel/address.js';
import { SemanticClaim } from '../kernel/claim.js';
import {
  DerivationPhase,
  OpenSeam,
  OpenSeamSeverity,
} from '../kernel/derivation.js';
import {
  EvidenceKind,
  EvidenceRecord,
  EvidenceRole,
} from '../kernel/evidence.js';
import type {
  AddressHandle,
  ClaimHandle,
  EvidenceHandle,
  OpenSeamHandle,
  ProductHandle,
  ProvenanceHandle,
} from '../kernel/handles.js';
import {
  AureliaResourceIdentity,
  IdentityStability,
} from '../kernel/identity.js';
import {
  MaterializationRecord,
  MaterializationState,
  MaterializedProduct,
} from '../kernel/materialization.js';
import {
  compactFieldProvenance,
  FieldProvenance,
  ProvenanceMode,
  ProvenanceRecord,
} from '../kernel/provenance.js';
import {
  KernelStoreBatch,
  type KernelStore,
  type KernelStoreRecord,
} from '../kernel/store.js';
import { KernelVocabulary } from '../kernel/vocabulary.js';
import {
  EvaluationRead,
  readStaticStringArrayValue,
  readStaticStringValue,
  type StaticEvaluationExpressionReader,
} from '../evaluation/expression-reader.js';
import { readPropertyName } from '../evaluation/ts-syntax.js';
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
import type {
  ResourceDefinitionHeaderEmission,
  ResourceRecognitionKernelEmission,
} from './resource-recognition-kernel-emitter.js';
import {
  ResourceAliasDefinition,
  ResourceTargetReference,
} from './resource-reference.js';
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
    readonly node: ts.Node | null,
  ) {}
}

class BindableRead {
  constructor(
    readonly bindables: readonly BindableDefinition[],
    readonly contributions: readonly BindableDefinitionContribution[],
    readonly open: readonly ConvergenceOpen[],
  ) {}
}

/** Turns recognized resource headers and source metadata into compiler-consumable definition products. */
export class ResourceDefinitionConvergenceProducer {
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
    const source = this.recordsForConvergenceSource(observation, header);
    const definitionProductHandle = this.store.handles.product(`resource-definition-converged:${header.localKey}`);
    if (this.store.readProduct(definitionProductHandle) != null) {
      return new ResourceDefinitionConvergenceProduct([], null);
    }

    const converged = this.convergeDefinition(context, observation, header, definitionProductHandle, source.provenanceHandle);
    if (converged == null) {
      return new ResourceDefinitionConvergenceProduct([], null);
    }
    const definition = converged.definition;

    const aliasClaims = this.recordsForNewAliasClaims(observation.definition, definition, header, source.provenanceHandle);
    const convergenceClaim = new SemanticClaim(
      this.store.handles.claim(`resource-definition-convergence:${header.localKey}:converges`),
      header.productHandle,
      KernelVocabulary.Resource.ConvergesToDefinition.key,
      definitionProductHandle,
      source.provenanceHandle,
    );
    const openSeams = this.recordsForOpenSeams(context, header, converged.open);
    const claimHandles = [
      convergenceClaim.handle,
      ...aliasClaims.claimHandles,
    ];
    const records: KernelStoreRecord[] = [
      ...source.records,
      ...aliasClaims.records,
      convergenceClaim,
      ...openSeams.records,
      new MaterializedProduct(
        definitionProductHandle,
        KernelVocabulary.Resource.Definition.key,
        header.primaryIdentityHandle,
        header.sourceAddressHandle,
        source.provenanceHandle,
        claimHandles,
      ),
      new MaterializationRecord(
        this.store.handles.materialization(`resource-definition-convergence:${header.localKey}`),
        DerivationPhase.Materialization,
        header.primaryIdentityHandle ?? header.sourceAddressHandle,
        openSeams.handles.length === 0 ? MaterializationState.Complete : MaterializationState.Partial,
        [definitionProductHandle],
        claimHandles,
        [],
        openSeams.handles,
      ),
    ];
    return new ResourceDefinitionConvergenceProduct(records, definition);
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
        ProvenanceMode.Derived,
        [evidenceHandle, ...this.evidenceHandlesForProvenance(header.provenanceHandle)],
        [],
        'Resource definition convergence from recognized header and static metadata.',
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
    const bindables = readBindables(context, definitionExpression, targetClass, provenanceHandle);
    const aliases = mergeAliases(definition.aliases, readStaticStringArrayClassProperty(context, targetClass, 'aliases'));
    const capture = readCustomElementCapture(context, definitionExpression, targetClass);
    const template = readCustomElementTemplate(context, definitionExpression, targetClass);
    const containerless = readBooleanField(context, definitionExpression, targetClass, 'containerless') ?? false;
    const shadowOptions = readShadowOptions(context, definitionExpression, targetClass);
    const hasSlots = readBooleanField(context, definitionExpression, targetClass, 'hasSlots') ?? false;
    const enhance = readBooleanField(context, definitionExpression, targetClass, 'enhance') ?? false;
    const needsCompile = readBooleanField(context, definitionExpression, targetClass, 'needsCompile') ?? true;
    const strict = readBooleanField(context, definitionExpression, targetClass, 'strict');
    const processContent = readTargetField(context, definitionExpression, targetClass, 'processContent');
    const open = [
      ...bindables.open,
      ...openIfPresent(context, definitionExpression, targetClass, 'dependencies', 'Custom element dependencies are present but dependency references are not converged yet.'),
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
        template,
        [],
        [],
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
            template,
            [],
            [],
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
    const bindables = readBindables(context, definitionExpression, targetClass, provenanceHandle);
    const aliases = mergeAliases(definition.aliases, readStaticStringArrayClassProperty(context, targetClass, 'aliases'));
    const isTemplateController = definition.type === ResourceDefinitionKind.TemplateController
      || readBooleanField(context, definitionExpression, targetClass, 'isTemplateController') === true;
    const noMultiBindings = readBooleanField(context, definitionExpression, targetClass, 'noMultiBindings') ?? false;
    const defaultProperty = readStringField(context, definitionExpression, targetClass, 'defaultProperty') ?? 'value';
    const containerStrategy = readContainerStrategy(context, definitionExpression, targetClass);
    const open = [
      ...bindables.open,
      ...openIfPresent(context, definitionExpression, targetClass, 'dependencies', 'Custom attribute dependencies are present but dependency references are not converged yet.'),
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
        [],
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
            [],
            containerStrategy,
            defaultProperty,
            fieldProvenance,
          ),
        ],
        fieldProvenance,
      ),
      open,
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
  ): {
    readonly records: readonly KernelStoreRecord[];
    readonly claimHandles: readonly ClaimHandle[];
  } {
    if (
      !(headerDefinition instanceof CustomElementDefinitionHeader)
      && !(headerDefinition instanceof CustomAttributeDefinitionHeader)
      && !(headerDefinition instanceof TemplateControllerDefinitionHeader)
      && !(headerDefinition instanceof ValueConverterDefinitionHeader)
      && !(headerDefinition instanceof BindingBehaviorDefinitionHeader)
      && !(headerDefinition instanceof BindingCommandDefinitionHeader)
    ) {
      return { records: [], claimHandles: [] };
    }
    const primaryIdentityHandle = header.primaryIdentityHandle;
    if (primaryIdentityHandle == null || !('aliases' in definition)) {
      return { records: [], claimHandles: [] };
    }

    const headerAliases = new Set(headerDefinition.aliases);
    const newAliases = definition.aliases
      .map((alias) => alias.name)
      .filter((alias) => !headerAliases.has(alias));
    const records: KernelStoreRecord[] = [];
    const claimHandles: ClaimHandle[] = [];
    newAliases.forEach((alias, index) => {
      const aliasIdentityHandle = this.store.handles.identity(`resource-definition-converged:${header.localKey}:alias:${alias}:${index}`);
      const aliasClaimHandle = this.store.handles.claim(`resource-definition-converged:${header.localKey}:alias:${index}`);
      records.push(
        new AureliaResourceIdentity(
          aliasIdentityHandle,
          IdentityStability.SemanticStable,
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
      );
      claimHandles.push(aliasClaimHandle);
    });
    return { records, claimHandles };
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
      const local = `resource-definition-converged:${header.localKey}:open:${index}`;
      const addressHandle = open.node == null
        ? header.sourceAddressHandle
        : this.store.handles.address(`${local}:span`);
      const evidenceHandle = this.store.handles.evidence(local);
      const openSeamHandle = this.store.handles.openSeam(local);
      handles.push(openSeamHandle);
      if (open.node != null) {
        records.push(new SourceSpanAddress(
          addressHandle,
          AddressStability.SourceStable,
          context.sourceFileAddressHandle,
          open.node.getStart(context.sourceFile),
          open.node.end,
          SourceSpanRole.Range,
        ));
      }
      records.push(
        new EvidenceRecord(
          evidenceHandle,
          EvidenceKind.Open,
          [EvidenceRole.Diagnostic],
          open.summary,
          addressHandle,
        ),
        new OpenSeam(
          openSeamHandle,
          KernelVocabulary.Resource.OpenDefinitionField.key,
          OpenSeamSeverity.Warning,
          open.summary,
          addressHandle,
          evidenceHandle,
        ),
      );
    });
    return { records, handles };
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
  context: ResourceRecognitionContext,
  definitionExpression: ts.Expression | null,
  targetClass: ts.ClassLikeDeclarationBase | null,
): CustomElementTemplateDefinition {
  const read = readFieldValue(context, definitionExpression, targetClass, 'template');
  const value = read?.value;
  if (value == null || value.kind === EvaluationValueKind.Null || value.kind === EvaluationValueKind.Undefined) {
    return new CustomElementTemplateDefinition(CustomElementTemplateKind.None);
  }
  if (value.kind === EvaluationValueKind.String) {
    return new CustomElementTemplateDefinition(CustomElementTemplateKind.Markup, value.value);
  }
  return new CustomElementTemplateDefinition(CustomElementTemplateKind.Open);
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
  context: ResourceRecognitionContext,
  definitionExpression: ts.Expression | null,
  targetClass: ts.ClassLikeDeclarationBase | null,
  provenanceHandle: ProvenanceHandle,
): BindableRead {
  const reads = [
    ...readDecoratorBindables(context, targetClass, provenanceHandle),
    ...readBindableListExpression(context, readStaticClassProperty(targetClass, 'bindables'), provenanceHandle, BindableContributionKind.StaticBindables),
    ...readBindableListValue(readObjectProperty(context.expressionReader, definitionExpression, 'bindables'), provenanceHandle, BindableContributionKind.RuntimePartial),
  ];
  const byName = new Map<string, BindableDefinition>();
  const contributions: BindableDefinitionContribution[] = [];
  const open: ConvergenceOpen[] = [];
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
  }
  return new BindableRead([...byName.values()], contributions, open);
}

class BindableEntryRead {
  constructor(
    readonly bindable: BindableDefinition | null,
    readonly contribution: BindableDefinitionContribution | null,
    readonly open: ConvergenceOpen | null,
  ) {}
}

function readDecoratorBindables(
  context: ResourceRecognitionContext,
  targetClass: ts.ClassLikeDeclarationBase | null,
  provenanceHandle: ProvenanceHandle,
): readonly BindableEntryRead[] {
  if (targetClass == null) {
    return [];
  }
  const entries: BindableEntryRead[] = [];
  for (const decorator of ts.canHaveDecorators(targetClass) ? ts.getDecorators(targetClass) ?? [] : []) {
    const entry = readClassBindableDecorator(context, decorator, provenanceHandle);
    if (entry != null) {
      entries.push(entry);
    }
  }
  for (const member of targetClass.members) {
    const propertyName = memberName(member);
    if (propertyName == null || !ts.canHaveDecorators(member)) {
      continue;
    }
    for (const decorator of ts.getDecorators(member) ?? []) {
      const entry = readMemberBindableDecorator(context, decorator, propertyName, provenanceHandle);
      if (entry != null) {
        entries.push(entry);
      }
    }
  }
  return entries;
}

function readClassBindableDecorator(
  context: ResourceRecognitionContext,
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
  if (value?.kind === EvaluationValueKind.String) {
    return bindableEntry(value.value, null, BindableContributionKind.Decorator, provenanceHandle);
  }
  if (value?.kind === EvaluationValueKind.Object) {
    const name = readObjectString(value, 'name');
    if (name != null) {
      return bindableEntry(name, value, BindableContributionKind.Decorator, provenanceHandle);
    }
  }
  return new BindableEntryRead(
    null,
    null,
    new ConvergenceOpen('Class-level @bindable did not close to a static property name.', argument),
  );
}

function readMemberBindableDecorator(
  context: ResourceRecognitionContext,
  decorator: ts.Decorator,
  propertyName: string,
  provenanceHandle: ProvenanceHandle,
): BindableEntryRead | null {
  const expression = decorator.expression;
  if (ts.isIdentifier(expression) && expression.text === 'bindable') {
    return bindableEntry(propertyName, null, BindableContributionKind.Decorator, provenanceHandle);
  }
  const call = decoratorCallNamed(decorator, 'bindable');
  if (call == null) {
    return null;
  }
  const argument = call.arguments[0] ?? null;
  if (argument == null) {
    return bindableEntry(propertyName, null, BindableContributionKind.Decorator, provenanceHandle);
  }
  const value = context.expressionReader.evaluateExpression(argument).value;
  if (value == null || value.kind !== EvaluationValueKind.Object) {
    return new BindableEntryRead(
      null,
      null,
      new ConvergenceOpen('@bindable(...) configuration did not close to a static object.', argument),
    );
  }
  return bindableEntry(propertyName, value, BindableContributionKind.Decorator, provenanceHandle);
}

function readBindableListExpression(
  context: ResourceRecognitionContext,
  expression: ts.Expression | null,
  provenanceHandle: ProvenanceHandle,
  contributionKind: BindableContributionKind,
): readonly BindableEntryRead[] {
  return expression == null
    ? []
    : readBindableListValue(context.expressionReader.evaluateExpression(expression), provenanceHandle, contributionKind);
}

function readBindableListValue(
  read: EvaluationRead<EvaluationValue> | null,
  provenanceHandle: ProvenanceHandle,
  contributionKind: BindableContributionKind,
): readonly BindableEntryRead[] {
  const value = read?.value;
  if (value == null || value.kind === EvaluationValueKind.Undefined) {
    return [];
  }
  if (value.kind === EvaluationValueKind.Array) {
    const entries = value.elements.map((element) => {
      if (element.value.kind === EvaluationValueKind.String) {
        return bindableEntry(element.value.value, null, contributionKind, provenanceHandle);
      }
      if (element.value.kind === EvaluationValueKind.Object) {
        const name = readObjectString(element.value, 'name');
        return name == null
          ? new BindableEntryRead(null, null, new ConvergenceOpen('Bindable array entry did not expose a static name.', element.expression))
          : bindableEntry(name, element.value, contributionKind, provenanceHandle);
      }
      return new BindableEntryRead(null, null, new ConvergenceOpen('Bindable array entry did not close to a string or static object.', element.expression));
    });
    if (value.mayHaveUnknownElements) {
      return [
        ...entries,
        new BindableEntryRead(null, null, new ConvergenceOpen('Bindable array includes open spread or hole entries.', value.node)),
      ];
    }
    return entries;
  }
  if (value.kind === EvaluationValueKind.Object) {
    const entries: BindableEntryRead[] = [];
    for (const property of value.properties.values()) {
      if (property.value.kind === EvaluationValueKind.Boolean && property.value.value === true) {
        entries.push(bindableEntry(property.name, null, contributionKind, provenanceHandle));
        continue;
      }
      if (property.value.kind === EvaluationValueKind.Object) {
        entries.push(bindableEntry(property.name, property.value, contributionKind, provenanceHandle));
        continue;
      }
      entries.push(new BindableEntryRead(
        null,
        null,
        new ConvergenceOpen(`Bindable '${property.name}' did not close to true or a static configuration object.`, property.node),
      ));
    }
    if (value.mayHaveUnknownProperties) {
      entries.push(new BindableEntryRead(
        null,
        null,
        new ConvergenceOpen('Bindable object includes open spread or computed property entries.', value.node),
      ));
    }
    return entries;
  }
  return [
    new BindableEntryRead(null, null, new ConvergenceOpen('Bindable list did not close to a static array or object.', read?.node ?? null)),
  ];
}

function bindableEntry(
  propertyName: string,
  partial: EvaluationObjectValue | null,
  contributionKind: BindableContributionKind,
  provenanceHandle: ProvenanceHandle,
): BindableEntryRead {
  const attribute = readObjectString(partial, 'attribute') ?? toBindableAttribute(propertyName);
  const callback = readObjectString(partial, 'callback') ?? `${propertyName}Changed`;
  const mode = readBindableMode(partial?.properties.get('mode')?.value) ?? BindableBindingMode.ToView;
  const name = readObjectString(partial, 'name') ?? propertyName;
  const setter = readBindableSetter(partial);
  const fieldProvenance = fieldProvenanceFor<BindableDefinitionField>(provenanceHandle, ['attribute', 'callback', 'mode', 'name', 'set']);
  return new BindableEntryRead(
    new BindableDefinition(
      attribute,
      callback,
      mode,
      name,
      setter,
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
      fieldProvenance,
    ),
    null,
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
  return [new ConvergenceOpen(summary, definitionRead?.node ?? staticExpression)];
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
