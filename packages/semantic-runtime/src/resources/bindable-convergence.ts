import ts from 'typescript';
import { SourceSpanRole } from '../kernel/address.js';
import type {
  IdentityHandle,
  ProvenanceHandle,
} from '../kernel/handles.js';
import type {
  KernelStore,
  KernelStoreRecord,
} from '../kernel/store.js';
import {
  EvaluationRead,
  readStaticStringValue,
} from '../evaluation/expression-reader.js';
import {
  EvaluationValueKind,
  type EvaluationObjectValue,
  type EvaluationValue,
} from '../evaluation/values.js';
import { bindableAttributeNameForProperty } from './bindable-attribute.js';
import {
  BindableBindingMode,
  BindableContributionKind,
  BindableDefinition,
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
  memberName,
  memberNameNode,
  nullableConvergenceOpenForNode,
  nullableConvergenceOpenForRead,
  readNearestStaticClassProperty,
  readObjectProperty,
  readObjectString,
  targetReferenceForFunction,
  ConvergenceOpen,
} from './resource-convergence-support.js';
import {
  sourceSpanAddressForNode,
  type SourceSpanAddressSet,
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
    const value = this.context.expressionReader.evaluateExpression(argument).value;
    const source = sourceSpanAddressForNode(this.store, this.context, argument, this.local, SourceSpanRole.Name);
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
      return bindableEntry(value.value, null, this.contributionKind, this.provenanceHandle, source);
    }
    if (value?.kind === EvaluationValueKind.Object) {
      return this.readObjectConfiguration(value, argument, source);
    }
    return {
      bindable: null,
      contribution: null,
      open: new ConvergenceOpen('Class-level @bindable did not close to a static property name.', argument),
      records: [],
      issues: [],
    };
  }

  private readObjectConfiguration(
    value: EvaluationObjectValue,
    argument: ts.Expression,
    source: SourceSpanAddressSet | null,
  ): BindableEntryRead {
    const nameProperty = value.properties.get('name') ?? null;
    const name = nameProperty == null ? null : readStaticStringValue(nameProperty.value);
    if (name != null && name.length > 0) {
      return bindableEntry(name, value, this.contributionKind, this.provenanceHandle, source);
    }
    if (nameProperty != null && nameProperty.value.kind !== EvaluationValueKind.String) {
      return this.publishInvalidConfiguration(
        ResourceIssueKind.InvalidBindableDecoratorUsageSymbol,
        'Class-level @bindable property names must be strings.',
        ResourceFrameworkErrorCode.InvalidBindableDecoratorUsageSymbol,
        nameProperty.node,
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
  return { bindables: [...byName.values()], contributions, open, records, issues };
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
  if (value?.kind === EvaluationValueKind.Object) {
    return bindableEntry(propertyName, value, contributionKind, provenanceHandle, source);
  }
  if (value != null && !memberBindableConfigurationMayHaveRuntimeProperties(value.kind)) {
    return bindableEntry(propertyName, null, contributionKind, provenanceHandle, source);
  }
  {
    const fallback = bindableEntry(
      propertyName,
      null,
      contributionKind,
      provenanceHandle,
      source,
      readCheckerBindableSetter(context, argument),
    );
    return {
      bindable: fallback.bindable,
      contribution: fallback.contribution,
      open: new ConvergenceOpen('@bindable(...) configuration did not close to a static object.', argument),
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
          ? bindableReadOpen('Bindable array entry did not expose a static name.', element.expression)
          : bindableEntry(name, element.value, contributionKind, provenanceHandle, source);
      }
      return bindableReadOpen('Bindable array entry did not close to a string or static object.', element.expression);
    });
    if (value.mayHaveUnknownElements || value.mayHaveUnknownOrder) {
      return [
        ...entries,
        bindableReadOpen('Bindable array includes open spread, hole, or unknown-order entries.', value.node),
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
      entries.push(bindableReadOpen(`Bindable '${property.name}' did not close to true or a static configuration object.`, property.node));
    }
    if (value.mayHaveUnknownProperties) {
      entries.push(bindableReadOpen('Bindable object includes open spread or computed property entries.', value.node));
    }
    return entries;
  }
  return [
    bindableReadOpen('Bindable list did not close to a static array or object.', read),
  ];
}

function bindableReadOpen(
  summary: string,
  source: ts.Node | EvaluationRead<EvaluationValue> | null,
): BindableEntryRead {
  const open = source instanceof EvaluationRead
    ? nullableConvergenceOpenForRead(summary, source)
    : nullableConvergenceOpenForNode(summary, source);
  return { bindable: null, contribution: null, open, records: [], issues: [] };
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
  return {
    bindable: new BindableDefinition(
      attribute,
      callback,
      mode,
      name,
      setter,
      source?.addressHandle ?? null,
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
    ),
    open: null,
    records: source?.records ?? [],
    issues: [],
  };
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
  );
  return {
    bindable: null,
    contribution: null,
    open: null,
    records: [...source?.records ?? [], ...publication.records],
    issues: [publication.issue],
  };
}
