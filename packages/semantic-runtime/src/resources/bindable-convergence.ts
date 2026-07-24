import ts from 'typescript';
import { SourceSpanRole } from '../kernel/address.js';
import type {
  AddressHandle,
  IdentityHandle,
  ProvenanceHandle,
} from '../kernel/handles.js';
import type {
  KernelStore,
  KernelStoreRecord,
} from '../kernel/store.js';
import type { KernelPublicationContext } from '../kernel/publication.js';
import { OpenSeamReasonKind } from '../kernel/open-seam.js';
import {
  FieldProvenance,
  compactFieldProvenance,
} from '../kernel/provenance.js';
import type { SourceSpanEvidencePublication } from '../kernel/source-address.js';
import {
  authoredStringLiteralNode,
  EvaluationRead,
  readStaticStringValue,
} from '../evaluation/expression-reader.js';
import { readEvaluationEnumerableOwnEntries } from '../evaluation/enumerable-own-properties.js';
import {
  closedStaticValueMemberValue,
  readStaticOwnProperty,
  readStaticValueProperty,
  StaticValueMemberReadKind,
} from '../evaluation/property-access.js';
import {
  EvaluationObjectPropertyState,
  EvaluationValueKind,
  readEvaluationCallability,
  type EvaluationObjectValue,
  type EvaluationValue,
} from '../evaluation/values.js';
import { checkerPropertySymbol } from '../type-system/checker-node-helpers.js';
import { readOrProjectCheckerTypeMembersInProjection } from '../type-system/checker-type-member-surface.js';
import { CheckerTypeProjector } from '../type-system/checker-projector.js';
import { checkerTypeMemberSourceAddressHandle } from '../type-system/checker-type-member-source.js';
import { TypeSystemProductDetails } from '../type-system/product-details.js';
import { bindableAttributeNameForProperty } from './bindable-attribute.js';
import { ResourceTargetReference } from './resource-reference.js';
import {
  BindableBindingMode,
  BindableContributionKind,
  BindableDefinition,
  type BindableDefinitionField,
  BindableDefinitionContribution,
  BindableSetterDefinition,
  BindableSetterKind,
} from './bindable-definition.js';
import { ResourceFrameworkErrorCode } from './framework-error-code.js';
import {
  ResourceIssue,
  ResourceIssueKind,
  ResourceIssuePhase,
} from './resource-issue.js';
import { ResourceIssuePublisher } from './resource-issue-publication.js';
import type { ResourceRecognitionContext } from './resource-recognition-context.js';
import {
  decoratorCallNamed,
  decoratorIdentifierNamed,
  convergenceOpenForReadPressure,
  memberName,
  memberNameNode,
  nullableConvergenceOpenForNode,
  nullableConvergenceOpenForRead,
  convergenceReasonKindsForRead,
  convergenceSummaryForObjectUncertainties,
  readNearestStaticClassProperty,
  readObjectProperty,
  readObjectString,
  targetReferenceForFunction,
  ConvergenceOpen,
} from './resource-convergence-support.js';
import {
  sourceSpanEvidenceForNode,
  sourceSpanAddressForNode,
  templateCarrierExpression,
} from './resource-source-address.js';

export interface BindableRead {
  readonly bindables: readonly BindableDefinition[];
  readonly contributions: readonly BindableDefinitionContribution[];
  readonly open: readonly ConvergenceOpen[];
  readonly records: readonly KernelStoreRecord[];
  readonly issues: readonly ResourceIssue[];
}

interface BindableEntryRead {
  readonly bindable: BindableDefinition | null;
  readonly contribution: BindableDefinitionContribution | null;
  readonly open: ConvergenceOpen | null;
  readonly records: readonly KernelStoreRecord[];
  readonly issues: readonly ResourceIssue[];
}

class ClassBindableDecoratorFrame {
  constructor(
    private readonly store: KernelStore,
    private readonly context: ResourceRecognitionContext,
    private readonly local: string,
    private readonly decorator: ts.Decorator,
    private readonly ownerIdentityHandle: IdentityHandle | null,
    private readonly provenanceHandle: ProvenanceHandle,
    private readonly contributionKind: BindableContributionKind,
  ) {}

  read(): BindableEntryRead | null {
    if (decoratorIdentifierNamed(this.decorator, 'bindable')) {
      return this.publishMissingPropertyNameConfiguration(this.decorator, SourceSpanRole.Name);
    }
    const call = decoratorCallNamed(this.decorator, 'bindable');
    if (call == null) {
      return null;
    }
    const argument = call.arguments[0] ?? null;
    if (argument == null) {
      return this.publishMissingPropertyNameConfiguration(this.decorator, SourceSpanRole.Name);
    }
    const read = this.context.expressionReader.evaluateExpression(argument);
    const value = read.value;
    const source = sourceSpanEvidenceForNode(this.store, this.context, argument, this.local, SourceSpanRole.Name);
    if (value?.kind === EvaluationValueKind.Null) {
      return this.publishInvalidConfiguration(
        ResourceIssueKind.InvalidBindableDecoratorUsageClassWithoutConfiguration,
        'Class-level @bindable cannot use a null configuration.',
        ResourceFrameworkErrorCode.InvalidBindableDecoratorUsageClassWithoutConfiguration,
        argument,
        SourceSpanRole.Value,
      );
    }
    if (value?.kind === EvaluationValueKind.Undefined) {
      return this.publishMissingPropertyNameConfiguration(argument, SourceSpanRole.Value);
    }
    if (value?.kind === EvaluationValueKind.String) {
      return bindableEntry(this.store, this.context, this.local, value.value, null, this.contributionKind, source);
    }
    if (value?.kind === EvaluationValueKind.Object) {
      return this.readObjectConfiguration(read, value, argument, source);
    }
    return {
      bindable: null,
      contribution: null,
      open: new ConvergenceOpen(
        'Class-level @bindable did not close to a static property name.',
        argument,
        convergenceReasonKindsForRead(read, [OpenSeamReasonKind.ResourceBindableConfigurationOpen]),
      ),
      records: [],
      issues: [],
    };
  }

  private readObjectConfiguration(
    read: EvaluationRead<EvaluationValue>,
    value: EvaluationObjectValue,
    argument: ts.Expression,
    source: SourceSpanEvidencePublication | null,
  ): BindableEntryRead {
    const nameProperty = readStaticOwnProperty(value, 'name');
    const nameRead = readStaticValueProperty(value, 'name', argument);
    const nameValue = closedStaticValueMemberValue(nameRead);
    if (nameValue == null) {
      return bindableReadOpen(
        nameRead.openSeams[0]?.summary
          ?? (nameRead.kind === StaticValueMemberReadKind.Open
            ? nameRead.reason
            : 'Class-level @bindable name getter requires runtime execution.'),
        argument,
      );
    }
    const name = readStaticStringValue(nameValue);
    if (name != null && name.length > 0) {
      const entry = bindableEntry(this.store, this.context, this.local, name, value, this.contributionKind, source);
      return value.mayHaveUnknownProperties
        ? {
          ...entry,
          open: new ConvergenceOpen(
            convergenceSummaryForObjectUncertainties(value, 'Class-level @bindable configuration included open object properties.'),
            argument,
            convergenceReasonKindsForRead(
              new EvaluationRead(value, argument, read.openSeams, read.abruptCompletion),
              [OpenSeamReasonKind.ResourceBindableConfigurationOpen],
            ),
          ),
        }
        : entry;
    }
    if (nameProperty != null && nameValue.kind !== EvaluationValueKind.String) {
      return this.publishInvalidConfiguration(
        ResourceIssueKind.InvalidBindableDecoratorUsageSymbol,
        'Class-level @bindable property names must be strings.',
        ResourceFrameworkErrorCode.InvalidBindableDecoratorUsageSymbol,
        nameProperty.node ?? argument,
        SourceSpanRole.Value,
      );
    }
    return this.publishMissingPropertyNameConfiguration(nameProperty?.node ?? argument, SourceSpanRole.Value);
  }

  private publishMissingPropertyNameConfiguration(
    sourceNode: ts.Node,
    sourceRole: SourceSpanRole,
  ): BindableEntryRead {
    return this.publishInvalidConfiguration(
      ResourceIssueKind.InvalidBindableDecoratorUsageClassWithoutPropertyNameConfiguration,
      'Class-level @bindable must provide a property name in its configuration.',
      ResourceFrameworkErrorCode.InvalidBindableDecoratorUsageClassWithoutPropertyNameConfiguration,
      sourceNode,
      sourceRole,
    );
  }

  private publishInvalidConfiguration(
    issueKind: ResourceIssueKind,
    message: string,
    frameworkErrorCode: string,
    sourceNode: ts.Node,
    sourceRole: SourceSpanRole,
  ): BindableEntryRead {
    return publishBindableIssueEntry(
      this.store,
      this.context,
      this.local,
      issueKind,
      message,
      frameworkErrorCode,
      sourceNode,
      sourceRole,
      this.ownerIdentityHandle,
      this.provenanceHandle,
    );
  }
}

export function readBindables(
  store: KernelStore,
  context: ResourceRecognitionContext,
  local: string,
  definitionExpression: ts.Expression | null,
  targetClass: ts.ClassLikeDeclarationBase | null,
  target: ResourceTargetReference,
  ownerIdentityHandle: IdentityHandle | null,
  provenanceHandle: ProvenanceHandle,
  publication: KernelPublicationContext,
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
  return {
    bindables: [...byName.values()].map((bindable) => bindableWithMemberTargets(store, publication, target, bindable)),
    contributions,
    open,
    records,
    issues,
  };
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
  return new ClassBindableDecoratorFrame(
    store,
    context,
    local,
    decorator,
    ownerIdentityHandle,
    provenanceHandle,
    contributionKind,
  ).read();
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
  const source = sourceSpanEvidenceForNode(store, context, memberNameNode(member) ?? member, local, SourceSpanRole.Name);
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
    return bindableEntry(store, context, local, propertyName, null, contributionKind, source);
  }
  const call = decoratorCallNamed(decorator, 'bindable');
  if (call == null) {
    return null;
  }
  const argument = call.arguments[0] ?? null;
  if (argument == null) {
    return bindableEntry(store, context, local, propertyName, null, contributionKind, source);
  }
  const read = context.expressionReader.evaluateExpression(argument);
  const value = read.value;
  if (value?.kind === EvaluationValueKind.Object) {
    const entry = bindableEntry(store, context, local, propertyName, value, contributionKind, source);
    return value.mayHaveUnknownProperties
      ? {
        ...entry,
        open: new ConvergenceOpen(
          convergenceSummaryForObjectUncertainties(value, '@bindable(...) configuration included open object properties.'),
          argument,
          convergenceReasonKindsForRead(read, [OpenSeamReasonKind.ResourceBindableConfigurationOpen]),
        ),
      }
      : entry;
  }
  if (value != null && !memberBindableConfigurationMayHaveRuntimeProperties(value.kind)) {
    return bindableEntry(store, context, local, propertyName, null, contributionKind, source);
  }
  {
    const fallback = bindableEntry(
      store,
      context,
      local,
      propertyName,
      null,
      contributionKind,
      source,
      readCheckerBindableSetter(context, argument),
    );
    return {
      bindable: fallback.bindable,
      contribution: fallback.contribution,
      open: new ConvergenceOpen(
        '@bindable(...) configuration did not close to a static object.',
        argument,
        convergenceReasonKindsForRead(read, [OpenSeamReasonKind.ResourceBindableConfigurationOpen]),
      ),
      records: fallback.records,
      issues: [],
    };
  }
}

function memberBindableConfigurationMayHaveRuntimeProperties(
  valueKind: EvaluationValueKind,
): boolean {
  switch (valueKind) {
    case EvaluationValueKind.Unknown:
    case EvaluationValueKind.BoundaryObject:
    case EvaluationValueKind.BoundaryValue:
    case EvaluationValueKind.Function:
    case EvaluationValueKind.Class:
    case EvaluationValueKind.Instance:
      return true;
    default:
      return false;
  }
}

function isBindableDecorator(decorator: ts.Decorator): boolean {
  return decoratorIdentifierNamed(decorator, 'bindable') || decoratorCallNamed(decorator, 'bindable') != null;
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
  if (read == null) {
    return [];
  }
  if (value?.kind === EvaluationValueKind.Undefined) {
    return bindableReadPressure('Bindable list evaluation remained open.', read);
  }
  if (value == null) {
    return [bindableReadOpen('Bindable list evaluation did not produce a value.', read)];
  }
  if (value.kind === EvaluationValueKind.Array) {
    const entries = value.elements.map((element, index) => {
      const source = sourceSpanEvidenceForNode(store, context, element.expression, `${local}:array:${index}`, SourceSpanRole.Name);
      if (element.value.kind === EvaluationValueKind.String) {
        return bindableEntry(store, context, `${local}:array:${index}`, element.value.value, null, contributionKind, source);
      }
      if (element.value.kind === EvaluationValueKind.Object) {
        const name = readObjectString(element.value, 'name');
        const entry = name == null
          ? bindableReadOpen('Bindable array entry did not expose a static name.', element.expression)
          : bindableEntry(store, context, `${local}:array:${index}`, name, element.value, contributionKind, source);
        return name != null && element.value.mayHaveUnknownProperties
          ? {
            ...entry,
            open: nullableConvergenceOpenForRead(
              convergenceSummaryForObjectUncertainties(element.value, 'Bindable array entry included open object properties.'),
              new EvaluationRead(element.value, element.expression ?? element.value.node ?? read.node ?? value.node, read.openSeams),
              [OpenSeamReasonKind.ResourceBindableConfigurationOpen],
            ),
          }
          : entry;
      }
      return bindableReadOpen('Bindable array entry did not close to a string or static object.', element.expression);
    });
    if (value.mayHaveUnknownElements || value.mayHaveUnknownOrder) {
      return [
        ...entries,
        bindableReadOpen('Bindable array includes open spread, hole, or unknown-order entries.', read),
      ];
    }
    return [...entries, ...bindableReadPressure('Bindable array evaluation remained open.', read)];
  }
  if (value.kind === EvaluationValueKind.Object) {
    const entries: BindableEntryRead[] = [];
    const enumerable = readEvaluationEnumerableOwnEntries(value);
    if (enumerable == null) {
      return [bindableReadOpen('Bindable object properties could not be enumerated.', read)];
    }
    for (const entry of enumerable.entries) {
      if (entry.property?.state === EvaluationObjectPropertyState.Open) {
        continue;
      }
      const source = sourceSpanEvidenceForNode(store, context, entry.sourceNode, `${local}:object:${entry.name}`, SourceSpanRole.Name);
      if (entry.value.kind === EvaluationValueKind.Boolean && entry.value.value === true) {
        entries.push(bindableEntry(store, context, `${local}:object:${entry.name}`, entry.name, null, contributionKind, source));
        continue;
      }
      if (entry.value.kind === EvaluationValueKind.Object) {
        entries.push(bindableEntry(store, context, `${local}:object:${entry.name}`, entry.name, entry.value, contributionKind, source));
        if (entry.value.mayHaveUnknownProperties) {
          entries.push({
            bindable: null,
            contribution: null,
            open: nullableConvergenceOpenForRead(
              convergenceSummaryForObjectUncertainties(entry.value, `Bindable '${entry.name}' configuration included open object properties.`),
              new EvaluationRead(entry.value, entry.sourceNode ?? entry.value.node ?? read.node ?? value.node, read.openSeams),
              [OpenSeamReasonKind.ResourceBindableConfigurationOpen],
            ),
            records: [],
            issues: [],
          });
        }
        continue;
      }
      entries.push(bindableReadOpen(`Bindable '${entry.name}' did not close to true or a static configuration object.`, entry.sourceNode));
    }
    if (enumerable.mayHaveUnknownEntries || enumerable.mayHaveUnknownOrder) {
      entries.push(bindableReadOpen('Bindable object includes open spread or computed property entries.', read));
    } else {
      entries.push(...bindableReadPressure('Bindable object evaluation remained open.', read));
    }
    return entries;
  }
  return [
    bindableReadOpen('Bindable list did not close to a static array or object.', read),
  ];
}

function bindableReadPressure(
  summary: string,
  read: EvaluationRead<EvaluationValue>,
): readonly BindableEntryRead[] {
  const open = convergenceOpenForReadPressure(summary, read)[0] ?? null;
  return open == null
    ? []
    : [{ bindable: null, contribution: null, open, records: [], issues: [] }];
}

function bindableReadOpen(
  summary: string,
  source: ts.Node | EvaluationRead<EvaluationValue> | null,
): BindableEntryRead {
  const open = source instanceof EvaluationRead
    ? nullableConvergenceOpenForRead(summary, source, [OpenSeamReasonKind.ResourceBindableConfigurationOpen])
    : nullableConvergenceOpenForNode(summary, source, [OpenSeamReasonKind.ResourceBindableConfigurationOpen]);
  return { bindable: null, contribution: null, open, records: [], issues: [] };
}

function bindableEntry(
  store: KernelStore,
  context: ResourceRecognitionContext,
  local: string,
  propertyName: string,
  partial: EvaluationObjectValue | null,
  contributionKind: BindableContributionKind,
  source: SourceSpanEvidencePublication | null,
  setterOverride: BindableSetterDefinition | null = null,
): BindableEntryRead {
  const attribute = readObjectString(partial, 'attribute') ?? bindableAttributeNameForProperty(propertyName);
  const callback = readObjectString(partial, 'callback') ?? `${propertyName}Changed`;
  const modeRead = partial == null ? null : readStaticValueProperty(partial, 'mode', partial.node);
  const mode = readBindableMode(modeRead == null ? null : closedStaticValueMemberValue(modeRead))
    ?? defaultBindableMode(partial);
  const name = readObjectString(partial, 'name') ?? propertyName;
  const nameSource = readObjectStringFieldSource(store, context, `${local}:name`, partial, 'name') ?? source;
  const attributeSource = readObjectStringFieldSource(store, context, `${local}:attribute`, partial, 'attribute');
  const callbackSource = readObjectStringFieldSource(store, context, `${local}:callback`, partial, 'callback');
  const modeSource = readObjectFieldSource(store, context, `${local}:mode`, partial, 'mode');
  const setSource = readObjectFieldSource(store, context, `${local}:set`, partial, 'set');
  const typeSource = readObjectFieldSource(store, context, `${local}:type`, partial, 'type');
  const nullableSource = readObjectFieldSource(store, context, `${local}:nullable`, partial, 'nullable');
  const setter = setterOverride ?? readBindableSetter(
    partial,
    setSource?.addressHandle ?? null,
    typeSource?.addressHandle ?? null,
  );
  const fieldProvenance = bindableFieldProvenance(
    source,
    nameSource,
    attributeSource,
    callbackSource,
    modeSource,
    setSource,
    typeSource,
    nullableSource,
  );
  return {
    bindable: new BindableDefinition(
      attribute,
      callback,
      mode,
      name,
      setter,
      source?.addressHandle ?? null,
      fieldProvenance,
      nameSource?.addressHandle ?? null,
      attributeSource?.addressHandle ?? null,
      callbackSource?.addressHandle ?? null,
      modeSource?.addressHandle ?? null,
      setSource?.addressHandle ?? null,
      null,
      null,
      typeSource?.addressHandle ?? null,
      nullableSource?.addressHandle ?? null,
    ),
    contribution: new BindableDefinitionContribution(
      contributionKind,
      propertyName,
      attribute,
      callback,
      mode,
      name,
      setter,
      source?.addressHandle ?? null,
      fieldProvenance,
      nameSource?.addressHandle ?? null,
      attributeSource?.addressHandle ?? null,
      callbackSource?.addressHandle ?? null,
      modeSource?.addressHandle ?? null,
      setSource?.addressHandle ?? null,
      typeSource?.addressHandle ?? null,
      nullableSource?.addressHandle ?? null,
    ),
    open: null,
    records: bindableSourceRecords(
      source,
      nameSource,
      attributeSource,
      callbackSource,
      modeSource,
      setSource,
      typeSource,
      nullableSource,
    ),
    issues: [],
  };
}

function readObjectStringFieldSource(
  store: KernelStore,
  context: ResourceRecognitionContext,
  local: string,
  value: EvaluationObjectValue | null,
  propertyName: string,
): SourceSpanEvidencePublication | null {
  const property = value?.properties.get(propertyName) ?? null;
  if (property == null || property.value.kind !== EvaluationValueKind.String) {
    return null;
  }
  const sourceNode = authoredStringLiteralNode(property.value, property.value.node, property.node);
  return sourceNode == null
    ? null
    : sourceSpanEvidenceForNode(store, context, sourceNode, local, SourceSpanRole.Name);
}

function readObjectFieldSource(
  store: KernelStore,
  context: ResourceRecognitionContext,
  local: string,
  value: EvaluationObjectValue | null,
  propertyName: string,
): SourceSpanEvidencePublication | null {
  const property = value?.properties.get(propertyName) ?? null;
  const sourceNode = property?.node == null
    ? property?.value.node ?? null
    : templateCarrierExpression(property.node) ?? property.value.node;
  return sourceNode == null
    ? null
    : sourceSpanEvidenceForNode(store, context, sourceNode, local, SourceSpanRole.Value);
}

function bindableSourceRecords(
  ...sources: readonly (SourceSpanEvidencePublication | null)[]
): readonly KernelStoreRecord[] {
  const seen = new Set<string>();
  const records: KernelStoreRecord[] = [];
  for (const source of sources) {
    if (source == null || seen.has(source.addressHandle)) {
      continue;
    }
    seen.add(source.addressHandle);
    records.push(...source.records);
  }
  return records;
}

function bindableFieldProvenance(
  source: SourceSpanEvidencePublication | null,
  nameSource: SourceSpanEvidencePublication | null,
  attributeSource: SourceSpanEvidencePublication | null,
  callbackSource: SourceSpanEvidencePublication | null,
  modeSource: SourceSpanEvidencePublication | null,
  setSource: SourceSpanEvidencePublication | null,
  typeSource: SourceSpanEvidencePublication | null,
  nullableSource: SourceSpanEvidencePublication | null,
): readonly FieldProvenance<BindableDefinitionField>[] {
  return compactFieldProvenance<BindableDefinitionField>([
    nameSource == null || nameSource.provenanceHandle === source?.provenanceHandle
      ? null
      : new FieldProvenance('name', nameSource.provenanceHandle),
    attributeSource == null
      ? null
      : new FieldProvenance('attribute', attributeSource.provenanceHandle),
    callbackSource == null
      ? null
      : new FieldProvenance('callback', callbackSource.provenanceHandle),
    modeSource == null
      ? null
      : new FieldProvenance('mode', modeSource.provenanceHandle),
    setSource == null
      ? null
      : new FieldProvenance('set', setSource.provenanceHandle),
    typeSource == null
      ? null
      : new FieldProvenance('type', typeSource.provenanceHandle),
    nullableSource == null
      ? null
      : new FieldProvenance('nullable', nullableSource.provenanceHandle),
  ]);
}

function bindableWithMemberTargets(
  store: KernelStore,
  publication: KernelPublicationContext,
  ownerTarget: ResourceTargetReference,
  bindable: BindableDefinition,
): BindableDefinition {
  return new BindableDefinition(
    bindable.attribute,
    bindable.callback,
    bindable.mode,
    bindable.name,
    bindable.set,
    bindable.sourceAddressHandle,
    bindable.fieldProvenance,
    bindable.nameSourceAddressHandle,
    bindable.attributeSourceAddressHandle,
    bindable.callbackSourceAddressHandle,
    bindable.modeSourceAddressHandle,
    bindable.setSourceAddressHandle,
    bindableMemberTarget(store, publication, ownerTarget, bindable.name),
    bindableMemberTarget(store, publication, ownerTarget, bindable.callback),
    bindable.typeSourceAddressHandle,
    bindable.nullableSourceAddressHandle,
  );
}

function bindableMemberTarget(
  store: KernelStore,
  publication: KernelPublicationContext,
  ownerTarget: ResourceTargetReference,
  memberName: string,
): ResourceTargetReference | null {
  const targetTypeProductHandle = ownerTarget.targetType?.productHandle ?? null;
  const targetType = targetTypeProductHandle == null
    ? null
    : publication.readProductDetail(TypeSystemProductDetails.TypeShape, targetTypeProductHandle);
  const member = targetType == null
    ? null
    : readOrProjectCheckerTypeMembersInProjection(
        new CheckerTypeProjector(store, publication),
        targetType,
        targetType.productHandle,
      )
      .find((candidate) => candidate.name === memberName) ?? null;
  return member == null
    ? null
    : new ResourceTargetReference(
        member.declarationIdentityHandle,
        checkerTypeMemberSourceAddressHandle(publication, member),
        member.name,
        member.valueType,
      );
}

function defaultBindableMode(
  partial: EvaluationObjectValue | null,
): BindableBindingMode {
  return partial?.mayHaveUnknownProperties === true
    ? BindableBindingMode.Default
    : BindableBindingMode.ToView;
}

function readBindableSetter(
  partial: EvaluationObjectValue | null,
  setSourceAddressHandle: AddressHandle | null,
  typeSourceAddressHandle: AddressHandle | null,
): BindableSetterDefinition {
  if (partial == null) {
    return new BindableSetterDefinition(BindableSetterKind.Default);
  }
  const setRead = readStaticValueProperty(partial, 'set', partial.node);
  const setValue = closedStaticValueMemberValue(setRead);
  if (setValue == null) {
    return new BindableSetterDefinition(BindableSetterKind.Open);
  }
  const set = setValue.kind === EvaluationValueKind.Undefined ? null : setValue;
  if (set != null && readEvaluationCallability(set) === true) {
    return new BindableSetterDefinition(
      BindableSetterKind.Function,
      bindablePolicyTarget(set, setSourceAddressHandle),
    );
  }
  if (set != null) {
    return new BindableSetterDefinition(BindableSetterKind.Open);
  }
  const typeRead = readStaticValueProperty(partial, 'type', partial.node);
  const typeValue = closedStaticValueMemberValue(typeRead);
  if (typeValue == null) {
    return new BindableSetterDefinition(BindableSetterKind.Open);
  }
  if (typeValue.kind !== EvaluationValueKind.Undefined) {
    const nullableValue = closedStaticValueMemberValue(
      readStaticValueProperty(partial, 'nullable', partial.node),
    );
    if (nullableValue == null) {
      return new BindableSetterDefinition(BindableSetterKind.Open);
    }
    const nullable = nullableValue.kind === EvaluationValueKind.Boolean
      ? nullableValue.value
      : nullableValue.kind === EvaluationValueKind.Undefined || nullableValue.kind === EvaluationValueKind.Null
        ? null
        : undefined;
    return nullable === undefined
      ? new BindableSetterDefinition(BindableSetterKind.Open)
      : new BindableSetterDefinition(
          BindableSetterKind.TypeCoercion,
          bindablePolicyTarget(typeValue, typeSourceAddressHandle),
          nullable,
        );
  }
  if (partial.mayHaveUnknownProperties) {
    return new BindableSetterDefinition(BindableSetterKind.Open);
  }
  return new BindableSetterDefinition(BindableSetterKind.Default);
}

function bindablePolicyTarget(
  value: EvaluationValue,
  addressHandle: AddressHandle | null,
): ResourceTargetReference | null {
  switch (value.kind) {
    case EvaluationValueKind.Function:
    case EvaluationValueKind.Class:
      return targetReferenceForFunction(value, addressHandle);
    case EvaluationValueKind.BoundaryObject:
      return new ResourceTargetReference(null, addressHandle, value.path);
    default:
      return addressHandle == null
        ? null
        : new ResourceTargetReference(null, addressHandle, null);
  }
}

function readCheckerBindableSetter(
  context: ResourceRecognitionContext,
  expression: ts.Expression,
): BindableSetterDefinition | null {
  if (context.typeSystem == null) {
    return null;
  }
  const type = context.typeSystem.readProgramTypeAtLocation(expression);
  if (type == null) {
    return null;
  }
  return checkerPropertySymbol(context.typeSystem.checker, type, 'set') == null
    ? null
    : new BindableSetterDefinition(BindableSetterKind.Open);
}

function readBindableMode(value: EvaluationValue | null | undefined): BindableBindingMode | null {
  if (value == null) {
    return null;
  }
  if (value.kind === EvaluationValueKind.String) {
    switch (value.value) {
      case BindableBindingMode.Default:
        return BindableBindingMode.Default;
      case BindableBindingMode.OneTime:
        return BindableBindingMode.OneTime;
      case BindableBindingMode.ToView:
        return BindableBindingMode.ToView;
      case BindableBindingMode.FromView:
        return BindableBindingMode.FromView;
      case BindableBindingMode.TwoWay:
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
  const source = sourceSpanAddressForNode(store, context, sourceNode, `${local}:source`, sourceRole);
  const publisher = new ResourceIssuePublisher(store);
  const publication = publisher.publish(
    `${local}:issue`,
    context.projectKey,
    ownerIdentityHandle,
    provenanceHandle,
    ResourceIssuePhase.BindableDecorator,
    issueKind,
    message,
    frameworkErrorCode,
    source?.addressHandle ?? null,
    [],
  );
  return {
    bindable: null,
    contribution: null,
    open: null,
    records: [...source?.records ?? [], ...publication.records],
    issues: [publication.issue],
  };
}
