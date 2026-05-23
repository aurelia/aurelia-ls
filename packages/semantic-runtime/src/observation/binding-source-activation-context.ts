import ts from 'typescript';

import type { Container } from '../di/container.js';
import { ContainerResolverSlot, ContainerSelfResolverSlot } from '../di/container-slot.js';
import { ContainerLookupKeyKind } from '../di/container-key.js';
import { ContainerLookupState } from '../di/container-lookup.js';
import type { ContainerReference } from '../di/container-reference.js';
import { InstanceProvider, InstanceProviderResolutionKind } from '../di/instance-provider.js';
import {
  isAureliaResolveExpression,
  isAureliaResolveWrapperExpression,
} from '../di/resolve-expression.js';
import { containerLookupKeyKindForExpression } from '../di/source-key-expression.js';
import {
  Resolver,
  ResolverResolutionKind,
} from '../di/resolver.js';
import type { ModuleEnvironmentRecord } from '../evaluation/environment.js';
import type { StaticEvaluationRuntimeHost } from '../evaluation/evaluator.js';
import type { StaticIntrinsicEvaluationHost } from '../evaluation/intrinsics.js';
import { normalizeModuleKey } from '../evaluation/module-graph.js';
import {
  isEvaluatedProjectSource,
  type EvaluatedProjectSource,
  type StaticProjectEvaluationResult,
} from '../evaluation/project-evaluation.js';
import { EvaluationOpenSeamKind } from '../evaluation/seams.js';
import { unwrapExpression } from '../evaluation/ts-syntax.js';
import {
  EvaluationValueKind,
  type EvaluationClassValue,
  type EvaluationValue,
} from '../evaluation/values.js';
import type { IdentityHandle } from '../kernel/handles.js';
import {
  ConstructableDiKeyIdentity,
  InterfaceDiKeyIdentity,
  StringDiKeyIdentity,
  TypeScriptDeclarationIdentity,
} from '../kernel/identity.js';
import type { KernelStore } from '../kernel/store.js';
import {
  RegistrationValueKind,
  type RegistrationValueReference,
} from '../registration/registration-reference.js';
import {
  firstSymbolDeclaration,
  symbolForExpression,
} from '../type-system/checker-node-helpers.js';
import type { TypeSystemProject } from '../type-system/project.js';

type RuntimeBindingSourceActiveContainerReader = () => Container | null;

type DiActivationKeySignature =
  | {
      readonly kind: 'interface';
      readonly name: string;
    }
  | {
      readonly kind: 'string';
      readonly value: string;
    }
  | {
      readonly kind: 'constructable';
      readonly moduleKey: string;
      readonly localName: string;
    };

interface DiActivationResolverMatch {
  readonly handler: Container;
  readonly slot: ContainerResolverSlot | ContainerSelfResolverSlot;
}

interface DiActivationResolvedValue {
  readonly value: EvaluationValue | null;
  readonly openReason: string | null;
}

interface DiActivationClassValue {
  readonly value: EvaluationClassValue;
  readonly moduleKey: string;
}

/**
 * Joins binding-source value reads with the DI container that would activate the current view model.
 *
 * The generic static evaluator intentionally does not know app-world container state. This context layers modeled DI
 * facts only when a source-value read is already inside an instance/member evaluation with an active runtime container.
 */
export class RuntimeBindingSourceActivationContext {
  private readonly sourcesByModuleKey = new Map<string, EvaluatedProjectSource>();
  private readonly sourcesByFileName = new Map<string, EvaluatedProjectSource>();

  constructor(
    private readonly store: KernelStore,
    private readonly evaluation: StaticProjectEvaluationResult,
    private readonly typeSystem: TypeSystemProject,
  ) {
    for (const source of evaluation.sources) {
      if (!isEvaluatedProjectSource(source)) {
        continue;
      }
      this.sourcesByModuleKey.set(normalizeModuleKey(source.moduleKey), source);
      this.sourcesByFileName.set(normalizeModuleKey(source.sourceFile.fileName), source);
    }
  }

  runtimeHostFor(
    baseHost: StaticEvaluationRuntimeHost,
    readActiveContainer: RuntimeBindingSourceActiveContainerReader,
  ): StaticEvaluationRuntimeHost {
    return {
      resolveIdentifier: (identifier, environment, moduleKey) =>
        baseHost.resolveIdentifier?.(identifier, environment, moduleKey) ?? null,
      resolveCommonJsRequire: (moduleKey, moduleSpecifier, node) =>
        baseHost.resolveCommonJsRequire?.(moduleKey, moduleSpecifier, node) ?? null,
      resolveDynamicImport: (moduleKey, moduleSpecifier, node) =>
        baseHost.resolveDynamicImport?.(moduleKey, moduleSpecifier, node) ?? null,
      evaluateCallExpression: (call, environment, moduleKey, depth, host) =>
        this.evaluateResolveCall(call, environment, moduleKey, depth, host, readActiveContainer)
          ?? baseHost.evaluateCallExpression?.(call, environment, moduleKey, depth, host)
          ?? null,
      evaluateNewExpression: (expression, environment, moduleKey, depth, host) =>
        baseHost.evaluateNewExpression?.(expression, environment, moduleKey, depth, host) ?? null,
    };
  }

  private evaluateResolveCall(
    call: ts.CallExpression,
    environment: ModuleEnvironmentRecord,
    moduleKey: string,
    depth: number,
    host: StaticIntrinsicEvaluationHost,
    readActiveContainer: RuntimeBindingSourceActiveContainerReader,
  ): EvaluationValue | null {
    const expression = unwrapExpression(call.expression);
    if (!isAureliaResolveExpression(expression) || environment.readValue('this') == null) {
      return null;
    }
    const keyExpression = call.arguments[0] ?? null;
    if (keyExpression == null || ts.isSpreadElement(keyExpression)) {
      return null;
    }
    if (isAureliaResolveWrapperExpression(unwrapExpression(keyExpression))) {
      return null;
    }
    const key = this.keySignatureForExpression(keyExpression);
    if (key == null) {
      return null;
    }
    const container = readActiveContainer();
    if (container == null) {
      return key.kind === 'constructable'
        ? null
        : host.unknown(
            `Aurelia resolve(...) for '${keySignatureId(key)}' needs an active controller/container activation context.`,
            keyExpression,
            moduleKey,
            EvaluationOpenSeamKind.DynamicCall,
          );
    }
    const resolved = this.resolveKey(container, key, host, call, moduleKey, depth, new Set());
    if (resolved == null || resolved.value == null) {
      if (resolved?.openReason != null) {
        return host.unknown(resolved.openReason, keyExpression, moduleKey, EvaluationOpenSeamKind.DynamicCall);
      }
      return key.kind === 'constructable'
        ? null
        : host.unknown(
            `Aurelia resolve(...) for '${keySignatureId(key)}' did not match a modeled resolver in the active container ancestry.`,
            keyExpression,
            moduleKey,
            EvaluationOpenSeamKind.DynamicCall,
          );
    }
    return resolved.value;
  }

  private resolveKey(
    requestor: Container,
    key: DiActivationKeySignature,
    host: StaticIntrinsicEvaluationHost,
    call: ts.CallExpression,
    moduleKey: string,
    depth: number,
    activeKeys: Set<string>,
  ): DiActivationResolvedValue | null {
    const keyId = keySignatureId(key);
    if (activeKeys.has(keyId)) {
      return { value: null, openReason: `Aurelia resolve(...) for '${keyId}' recursively re-entered DI activation.` };
    }
    activeKeys.add(keyId);
    try {
      const match = this.findResolverSlot(requestor, key);
      return match == null
        ? null
        : this.resolveSlot(match, requestor, host, call, moduleKey, depth, activeKeys);
    } finally {
      activeKeys.delete(keyId);
    }
  }

  private resolveSlot(
    match: DiActivationResolverMatch,
    requestor: Container,
    host: StaticIntrinsicEvaluationHost,
    call: ts.CallExpression,
    moduleKey: string,
    depth: number,
    activeKeys: Set<string>,
  ): DiActivationResolvedValue | null {
    if (match.slot instanceof ContainerSelfResolverSlot) {
      return {
        value: null,
        openReason: 'Aurelia resolve(...) reached a built-in self resolver whose runtime instance is not a source value.',
      };
    }
    const resolver = match.slot.resolver;
    if (resolver instanceof InstanceProvider) {
      const resolution = resolver.resolve();
      return resolution.resolutionKind === InstanceProviderResolutionKind.Instance
        ? this.valueForRegistrationReference(resolution.value, host, call, moduleKey, depth)
        : { value: null, openReason: 'Aurelia resolve(...) reached an InstanceProvider before a prepared instance value was visible.' };
    }
    if (!(resolver instanceof Resolver)) {
      return {
        value: null,
        openReason: 'Aurelia resolve(...) reached a resolver slot whose resolver value is not modeled enough for source-value evaluation.',
      };
    }

    const resolution = resolver.resolve(match.handler, requestor);
    switch (resolution.resolutionKind) {
      case ResolverResolutionKind.Instance:
      case ResolverResolutionKind.SingletonFactory:
      case ResolverResolutionKind.TransientFactory:
        return this.valueForRegistrationReference(resolution.value, host, call, moduleKey, depth);
      case ResolverResolutionKind.Alias: {
        const alias = this.keySignatureForRegistrationReference(resolution.value);
        return alias == null
          ? { value: null, openReason: 'Aurelia resolve(...) reached an alias resolver whose target key is not modeled enough.' }
          : this.resolveKey(requestor, alias, host, call, moduleKey, depth + 1, activeKeys);
      }
      case ResolverResolutionKind.Callback:
      case ResolverResolutionKind.CachedCallback:
        return {
          value: null,
          openReason: 'Aurelia resolve(...) reached a callback resolver; callback execution is not a source-value activation fact.',
        };
      case ResolverResolutionKind.Array:
        return {
          value: null,
          openReason: 'Aurelia resolve(...) reached an array resolver with multiple possible values.',
        };
      case ResolverResolutionKind.Open:
      case ResolverResolutionKind.Cyclic:
      case ResolverResolutionKind.InvalidStrategy:
        return {
          value: null,
          openReason: `Aurelia resolve(...) reached a ${resolution.resolutionKind} resolver branch.`,
        };
    }
  }

  private valueForRegistrationReference(
    reference: RegistrationValueReference | null,
    host: StaticIntrinsicEvaluationHost,
    call: ts.CallExpression,
    moduleKey: string,
    depth: number,
  ): DiActivationResolvedValue {
    if (reference == null) {
      return { value: null, openReason: 'Aurelia resolve(...) resolver did not retain a source-visible value reference.' };
    }
    if (!registrationValueKindCanActivateClass(reference.valueKind)) {
      return {
        value: null,
        openReason: `Aurelia resolve(...) resolver value kind '${reference.valueKind}' is not class-activation source value.`,
      };
    }
    const classValue = this.classValueForRegistrationReference(reference);
    if (classValue == null) {
      return {
        value: null,
        openReason: 'Aurelia resolve(...) resolver value did not map to an evaluator-local class declaration.',
      };
    }
    return {
      value: host.evaluateClassInstantiation(classValue.value, call, [], classValue.moduleKey, depth + 1),
      openReason: null,
    };
  }

  private classValueForRegistrationReference(
    reference: RegistrationValueReference,
  ): DiActivationClassValue | null {
    const identity = reference.identityHandle == null
      ? null
      : this.store.readIdentity(reference.identityHandle);
    if (!(identity instanceof TypeScriptDeclarationIdentity) || identity.moduleKey == null || identity.localName == null) {
      return null;
    }
    const source = this.sourcesByModuleKey.get(normalizeModuleKey(identity.moduleKey))
      ?? this.sourcesByFileName.get(normalizeModuleKey(identity.moduleKey))
      ?? null;
    const value = source?.evaluation.environment.readValue(identity.localName) ?? null;
    return value?.kind === EvaluationValueKind.Class
      ? { value, moduleKey: source!.moduleKey }
      : null;
  }

  private findResolverSlot(
    requestor: Container,
    key: DiActivationKeySignature,
  ): DiActivationResolverMatch | null {
    let current: Container | null = requestor;
    while (current != null) {
      const slots = current.readResolverSlots().filter((slot) => {
        const slotKey = this.keySignatureForIdentity(slot.keyIdentityHandle);
        return slotKey != null && keySignaturesEqual(slotKey, key);
      });
      if (slots.length === 1) {
        return { handler: current, slot: slots[0]! };
      }
      if (slots.length > 1) {
        return { handler: current, slot: slots[0]! };
      }
      current = current.parent;
    }
    return null;
  }

  private keySignatureForExpression(
    expression: ts.Expression,
  ): DiActivationKeySignature | null {
    const current = unwrapExpression(expression);
    if (ts.isStringLiteralLike(current)) {
      return { kind: 'string', value: current.text };
    }
    const programExpression = this.typeSystem.readProgramNode(current) ?? current;
    const keyKind = containerLookupKeyKindForExpression(this.typeSystem.checker, programExpression);
    switch (keyKind) {
      case ContainerLookupKeyKind.Interface:
        return interfaceKeySignatureForExpression(this.typeSystem.checker, programExpression);
      case ContainerLookupKeyKind.Constructable:
        return constructableKeySignatureForExpression(this.typeSystem, programExpression);
      case ContainerLookupKeyKind.String:
      case ContainerLookupKeyKind.Symbol:
      case ContainerLookupKeyKind.Resource:
      case ContainerLookupKeyKind.NativeFunction:
      case ContainerLookupKeyKind.IntrinsicConstructable:
      case ContainerLookupKeyKind.Registry:
      case ContainerLookupKeyKind.Resolver:
      case ContainerLookupKeyKind.Object:
      case ContainerLookupKeyKind.Primitive:
      case ContainerLookupKeyKind.Nullish:
      case ContainerLookupKeyKind.Unknown:
        return null;
    }
  }

  private keySignatureForRegistrationReference(
    reference: RegistrationValueReference | null,
  ): DiActivationKeySignature | null {
    if (reference == null) {
      return null;
    }
    if (reference.valueKind === RegistrationValueKind.AliasTarget && reference.localName != null) {
      return { kind: 'interface', name: reference.localName };
    }
    if (registrationValueKindCanActivateClass(reference.valueKind)) {
      const classValue = this.classValueForRegistrationReference(reference);
      return classValue == null
        ? null
        : { kind: 'constructable', moduleKey: normalizeModuleKey(classValue.moduleKey), localName: classValue.value.declaration.name?.text ?? reference.localName ?? '' };
    }
    return null;
  }

  private keySignatureForIdentity(
    identityHandle: IdentityHandle,
  ): DiActivationKeySignature | null {
    const identity = this.store.readIdentity(identityHandle);
    if (identity instanceof InterfaceDiKeyIdentity) {
      return { kind: 'interface', name: identity.interfaceName };
    }
    if (identity instanceof StringDiKeyIdentity) {
      return { kind: 'string', value: identity.value };
    }
    if (identity instanceof ConstructableDiKeyIdentity) {
      const declaration = this.store.readIdentity(identity.declarationHandle);
      return declaration instanceof TypeScriptDeclarationIdentity && declaration.moduleKey != null && declaration.localName != null
        ? { kind: 'constructable', moduleKey: normalizeModuleKey(declaration.moduleKey), localName: declaration.localName }
        : null;
    }
    return null;
  }
}

function registrationValueKindCanActivateClass(
  valueKind: RegistrationValueKind,
): boolean {
  switch (valueKind) {
    case RegistrationValueKind.Constructable:
    case RegistrationValueKind.PlainClass:
    case RegistrationValueKind.StaticResourceType:
      return true;
    case RegistrationValueKind.Unknown:
    case RegistrationValueKind.Instance:
    case RegistrationValueKind.Callback:
    case RegistrationValueKind.CachedCallback:
    case RegistrationValueKind.AliasTarget:
    case RegistrationValueKind.Resolver:
    case RegistrationValueKind.Factory:
    case RegistrationValueKind.ResourceDefinition:
    case RegistrationValueKind.Registry:
    case RegistrationValueKind.ObjectMap:
    case RegistrationValueKind.FrameworkRegistration:
      return false;
  }
}

function interfaceKeySignatureForExpression(
  checker: ts.TypeChecker,
  expression: ts.Expression,
): DiActivationKeySignature | null {
  const symbol = symbolForExpression(checker, expression);
  const declaration = symbol == null ? null : firstSymbolDeclaration(symbol);
  const name = declarationName(declaration) ?? symbol?.getName() ?? expressionTextName(expression);
  return name == null ? null : { kind: 'interface', name };
}

function constructableKeySignatureForExpression(
  typeSystem: TypeSystemProject,
  expression: ts.Expression,
): DiActivationKeySignature | null {
  const symbol = symbolForExpression(typeSystem.checker, expression);
  const declaration = symbol == null ? null : firstSymbolDeclaration(symbol);
  const name = declarationName(declaration) ?? symbol?.getName() ?? expressionTextName(expression);
  if (declaration == null || name == null) {
    return null;
  }
  const sourceFile = declaration.getSourceFile();
  const source = typeSystem.evaluation.readEvaluatedSources().find((candidate) =>
    normalizeModuleKey(candidate.sourceFile.fileName) === normalizeModuleKey(sourceFile.fileName)
  ) ?? null;
  return source == null
    ? null
    : { kind: 'constructable', moduleKey: normalizeModuleKey(source.moduleKey), localName: name };
}

function declarationName(
  declaration: ts.Declaration | null,
): string | null {
  if (declaration == null) {
    return null;
  }
  const name = ts.getNameOfDeclaration(declaration);
  return name != null && ts.isIdentifier(name) ? name.text : null;
}

function expressionTextName(
  expression: ts.Expression,
): string | null {
  const current = unwrapExpression(expression);
  if (ts.isIdentifier(current)) {
    return current.text;
  }
  if (ts.isPropertyAccessExpression(current)) {
    return current.name.text;
  }
  return null;
}

function keySignaturesEqual(
  left: DiActivationKeySignature,
  right: DiActivationKeySignature,
): boolean {
  if (left.kind !== right.kind) {
    return false;
  }
  switch (left.kind) {
    case 'interface':
      return left.name === (right as Extract<DiActivationKeySignature, { kind: 'interface' }>).name;
    case 'string':
      return left.value === (right as Extract<DiActivationKeySignature, { kind: 'string' }>).value;
    case 'constructable': {
      const constructable = right as Extract<DiActivationKeySignature, { kind: 'constructable' }>;
      return left.moduleKey === constructable.moduleKey && left.localName === constructable.localName;
    }
  }
}

function keySignatureId(
  key: DiActivationKeySignature,
): string {
  switch (key.kind) {
    case 'interface':
      return `interface:${key.name}`;
    case 'string':
      return `string:${key.value}`;
    case 'constructable':
      return `constructable:${key.moduleKey}:${key.localName}`;
  }
}
