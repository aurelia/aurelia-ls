import ts from 'typescript';
import { normalizeModuleKey } from '../evaluation/module-graph.js';
import {
  readDeclarationLocalName,
  unwrapExpression,
} from '../evaluation/ts-syntax.js';
import type { TypeSystemProject } from '../type-system/project.js';
import {
  EvaluationValueKind,
  type EvaluationValue,
} from '../evaluation/values.js';
import type {
  IdentityHandle,
  ProductHandle,
} from '../kernel/handles.js';
import type { ResourceTargetReference } from './resource-reference.js';
import {
  ResourceDependencyReferenceKind,
  type ResourceDependencyReference,
} from './resource-reference.js';
import type { FullResourceDefinition } from './resource-definition.js';
import {
  ResourceCarrierKind,
  ResourceDefinitionKind,
  runtimeResourceKeyForKind,
} from './resource-kind.js';
import type { ResourceRecognitionProjectResult } from './resource-recognition-project-pass.js';
import { assignedExpressionVariableDeclaration } from './resource-convergence-support.js';

export class ResourceDefinitionIndexEntry {
  constructor(
    /** Module key that owns the declaration which produced the resource definition. */
    readonly moduleKey: string,
    /** Local declaration name in the owning module. */
    readonly localName: string | null,
    /** Resource carrier expression that produced this definition, when one exists in admitted source. */
    readonly sourceNode: ts.Node | null,
    /** Fully converged resource definition recognized for the declaration. */
    readonly definition: FullResourceDefinition,
  ) {}
}

/** Recognized resource-only return effect retained even when full definition convergence stays open. */
export class ResourceDefinitionEffectConstraint {
  constructor(
    /** Materialized definition-header product that proves this call result can only register a resource. */
    readonly productHandle: ProductHandle,
    readonly moduleKey: string,
    readonly localName: string | null,
    readonly sourceNode: ts.Node,
    readonly resourceKind: ResourceDefinitionKind,
    readonly resourceName: string | null,
    readonly runtimeLookupKeys: readonly string[],
  ) {}
}

/**
 * Lookup table that lets later materializers connect evaluated registration values back to converged resource definitions.
 */
export class ResourceDefinitionIndex {
  static fromProject(project: ResourceRecognitionProjectResult): ResourceDefinitionIndex {
    const entries: ResourceDefinitionIndexEntry[] = [];
    const aliasEntries: ResourceDefinitionIndexEntry[] = [];
    const effectConstraints: ResourceDefinitionEffectConstraint[] = [];
    const effectiveDefinitions = new Set(project.readDefinitions());
    const carriersByDefinition = new Map<FullResourceDefinition, ResourceDefinitionCarrier>();

    for (const source of project.sources) {
      const moduleKey = normalizeModuleKey(source.moduleKey);
      const observationByTargetAddress = new Map(
        source.emission.definitions.flatMap((header) => {
          const addressHandle = header.targetReference?.addressHandle ?? null;
          const observation = source.observations[header.observationIndex] ?? null;
          return addressHandle == null || observation == null
            ? []
            : [[addressHandle, observation] as const];
        }),
      );
      const headersBySourceAddress = new Map(
        source.emission.definitions.map((header) => [header.sourceAddressHandle, header] as const),
      );
      for (const header of source.emission.definitions) {
        const observation = source.observations[header.observationIndex] ?? null;
        if (observation == null) continue;
        effectConstraints.push(new ResourceDefinitionEffectConstraint(
          header.productHandle,
          moduleKey,
          resourceCarrierResultLocalName(observation.sourceNode)
            ?? header.targetReference?.localName
            ?? null,
          observation.sourceNode,
          header.resourceKind,
          header.primaryName,
          header.lookupNames.flatMap((name) => {
            const key = runtimeResourceKeyForKind(header.resourceKind, name);
            return key == null ? [] : [key];
          }),
        ));
      }
      for (const definition of source.convergence.definitions) {
        const header = definition.sourceAddressHandle == null
          ? null
          : headersBySourceAddress.get(definition.sourceAddressHandle) ?? null;
        const observation = header == null
          ? null
          : source.observations[header.observationIndex] ?? null;
        if (observation == null) continue;
        carriersByDefinition.set(definition, new ResourceDefinitionCarrier(
          moduleKey,
          observation.carrierKind,
          observation.sourceNode,
        ));
        if (!effectiveDefinitions.has(definition)) {
          continue;
        }
        const targetObservation = definition.target.addressHandle == null
          ? null
          : observationByTargetAddress.get(definition.target.addressHandle) ?? null;
        entries.push(new ResourceDefinitionIndexEntry(
          moduleKey,
          definition.target.localName,
          targetObservation?.sourceNode ?? null,
          definition,
        ));
      }
    }

    for (const selection of project.definitionSelections) {
      for (const candidate of [selection.definition, ...selection.supersededDefinitions]) {
        const candidateCarrier = carriersByDefinition.get(candidate) ?? null;
        const assigned = candidateCarrier == null
          ? null
          : assignedExpressionVariableDeclaration(candidateCarrier.sourceNode);
        if (
          candidateCarrier == null
          || assigned == null
          || !ts.isIdentifier(assigned.name)
          || candidateCarrier.carrierKind !== ResourceCarrierKind.DefineCall
        ) {
          continue;
        }
        aliasEntries.push(new ResourceDefinitionIndexEntry(
          candidateCarrier.moduleKey,
          assigned.name.text,
          candidateCarrier.sourceNode,
          selection.definition,
        ));
      }
    }

    return new ResourceDefinitionIndex(entries, effectConstraints, aliasEntries);
  }

  private readonly byModuleLocal = new Map<string, readonly ResourceDefinitionIndexEntry[]>();
  private readonly byProduct = new Map<ProductHandle, FullResourceDefinition>();
  private readonly byTargetIdentity = new Map<IdentityHandle, FullResourceDefinition>();
  private readonly byLocalName = new Map<string, readonly FullResourceDefinition[]>();
  private readonly byModule = new Map<string, readonly FullResourceDefinition[]>();
  private readonly byResourceName = new Map<string, readonly FullResourceDefinition[]>();
  private readonly bySourceNode = new WeakMap<ts.Node, FullResourceDefinition>();
  private readonly effectConstraintsByModuleLocal = new Map<string, readonly ResourceDefinitionEffectConstraint[]>();
  private readonly effectConstraintBySourceNode = new WeakMap<ts.Node, ResourceDefinitionEffectConstraint>();

  constructor(
    readonly entries: readonly ResourceDefinitionIndexEntry[],
    readonly effectConstraints: readonly ResourceDefinitionEffectConstraint[] = [],
    aliasEntries: readonly ResourceDefinitionIndexEntry[] = [],
  ) {
    for (const entry of entries) {
      if (entry.localName != null) {
        const moduleLocalKey = resourceDefinitionIndexKey(entry.moduleKey, entry.localName);
        this.byModuleLocal.set(moduleLocalKey, [
          ...(this.byModuleLocal.get(moduleLocalKey) ?? []),
          entry,
        ]);
        this.byLocalName.set(entry.localName, [
          ...(this.byLocalName.get(entry.localName) ?? []),
          entry.definition,
        ]);
      }
      if (entry.sourceNode != null) {
        this.bySourceNode.set(entry.sourceNode, entry.definition);
      }
      this.byModule.set(entry.moduleKey, [
        ...(this.byModule.get(entry.moduleKey) ?? []),
        entry.definition,
      ]);
      if (entry.definition.productHandle != null) {
        this.byProduct.set(entry.definition.productHandle, entry.definition);
      }
      if (entry.definition.target.identityHandle != null) {
        this.byTargetIdentity.set(entry.definition.target.identityHandle, entry.definition);
      }
      for (const resourceName of readResourceDefinitionNames(entry.definition)) {
        const nameKey = resourceName.toLowerCase();
        this.byResourceName.set(nameKey, [
          ...(this.byResourceName.get(nameKey) ?? []),
          entry.definition,
        ]);
      }
    }
    for (const entry of aliasEntries) {
      if (entry.localName != null) {
        const moduleLocalKey = resourceDefinitionIndexKey(entry.moduleKey, entry.localName);
        this.byModuleLocal.set(
          moduleLocalKey,
          appendUniqueEntry(this.byModuleLocal.get(moduleLocalKey) ?? [], entry),
        );
        this.byLocalName.set(
          entry.localName,
          appendUniqueDefinition(this.byLocalName.get(entry.localName) ?? [], entry.definition),
        );
      }
      if (entry.sourceNode != null) {
        this.bySourceNode.set(entry.sourceNode, entry.definition);
      }
    }
    for (const constraint of effectConstraints) {
      if (constraint.localName != null) {
        const key = resourceDefinitionIndexKey(constraint.moduleKey, constraint.localName);
        this.effectConstraintsByModuleLocal.set(key, [
          ...(this.effectConstraintsByModuleLocal.get(key) ?? []),
          constraint,
        ]);
      }
      this.effectConstraintBySourceNode.set(
        ts.isExpression(constraint.sourceNode) ? unwrapExpression(constraint.sourceNode) : constraint.sourceNode,
        constraint,
      );
    }
  }

  lookupByModuleLocal(moduleKey: string, localName: string): FullResourceDefinition | null {
    const definitions = this.lookupAllByModuleLocal(moduleKey, localName);
    return definitions.length === 1 ? definitions[0]! : null;
  }

  lookupAllByModuleLocal(moduleKey: string, localName: string): readonly FullResourceDefinition[] {
    return (this.byModuleLocal.get(resourceDefinitionIndexKey(moduleKey, localName)) ?? [])
      .map((entry) => entry.definition);
  }

  /** Resolve an authored TS expression through its alias-normalized declaration identity. */
  lookupByTypeScriptExpression(
    typeSystem: TypeSystemProject,
    expression: ts.Expression,
  ): FullResourceDefinition | null {
    const symbol = typeSystem.readProgramAliasedSymbolAtLocation(unwrapExpression(expression));
    if (symbol == null) {
      return null;
    }
    const matching = new Set<FullResourceDefinition>();
    for (const declaration of symbol.declarations ?? []) {
      for (const definition of this.lookupAllByTypeScriptDeclaration(typeSystem, declaration)) {
        matching.add(definition);
      }
    }
    return matching.size === 1 ? matching.values().next().value ?? null : null;
  }

  /** Resolve an authored expression only when TypeScript proves that its value binding cannot be reassigned. */
  lookupByImmutableTypeScriptExpression(
    typeSystem: TypeSystemProject,
    expression: ts.Node,
  ): FullResourceDefinition | null {
    if (!ts.isExpression(expression)) {
      return null;
    }
    const symbol = typeSystem.readProgramAliasedSymbolAtLocation(unwrapExpression(expression));
    if (symbol == null) {
      return null;
    }
    const matching = new Set<FullResourceDefinition>();
    for (const declaration of symbol.declarations ?? []) {
      if (!isImmutableResourceAliasDeclaration(declaration)) {
        continue;
      }
      for (const definition of this.lookupAllByTypeScriptDeclaration(typeSystem, declaration)) {
        matching.add(definition);
      }
    }
    return matching.size === 1 ? matching.values().next().value ?? null : null;
  }

  /** Resolve a Program-owned declaration through the evaluator module identity shared by resource convergence. */
  lookupByTypeScriptDeclaration(
    typeSystem: TypeSystemProject,
    declaration: ts.Declaration,
  ): FullResourceDefinition | null {
    const definitions = this.lookupAllByTypeScriptDeclaration(typeSystem, declaration);
    return definitions.length === 1 ? definitions[0]! : null;
  }

  lookupAllByTypeScriptDeclaration(
    typeSystem: TypeSystemProject,
    declaration: ts.Declaration,
  ): readonly FullResourceDefinition[] {
    const localName = readDeclarationLocalName(declaration);
    if (localName == null) {
      return [];
    }
    const moduleKey = typeSystem.readModuleKeyForSourceFile(declaration.getSourceFile());
    return moduleKey == null ? [] : this.lookupAllByModuleLocal(moduleKey, localName);
  }

  lookupByProduct(productHandle: ProductHandle | null): FullResourceDefinition | null {
    return productHandle == null
      ? null
      : this.byProduct.get(productHandle) ?? null;
  }

  lookupByTargetIdentity(identityHandle: IdentityHandle | null): FullResourceDefinition | null {
    return identityHandle == null
      ? null
      : this.byTargetIdentity.get(identityHandle) ?? null;
  }

  lookupByLocalName(localName: string | null): FullResourceDefinition | null {
    if (localName == null) {
      return null;
    }
    const matching = this.byLocalName.get(localName) ?? [];
    return matching.length === 1 ? matching[0]! : null;
  }

  lookupByResourceName(resourceName: string | null): FullResourceDefinition | null {
    if (resourceName == null) {
      return null;
    }
    const matching = this.byResourceName.get(resourceName.toLowerCase()) ?? [];
    return matching.length === 1 ? matching[0]! : null;
  }

  lookupCustomElementByResourceName(resourceName: string | null): FullResourceDefinition | null {
    if (resourceName == null) {
      return null;
    }
    const matching = (this.byResourceName.get(resourceName.toLowerCase()) ?? [])
      .filter(isCustomElementDefinition);
    return matching.length === 1 ? matching[0]! : null;
  }

  lookupCustomElementByResourceNameInDependencies(
    resourceName: string | null,
    dependencies: readonly ResourceDependencyReference[],
  ): FullResourceDefinition | null {
    if (resourceName == null || dependencies.length === 0) {
      return null;
    }
    const key = resourceName.toLowerCase();
    const matching: FullResourceDefinition[] = [];
    const seen = new Set<FullResourceDefinition>();
    for (const dependency of dependencies) {
      for (const definition of this.lookupAllByDependencyReference(dependency)) {
        if (!isCustomElementDefinition(definition) || !resourceDefinitionHasName(definition, key) || seen.has(definition)) {
          continue;
        }
        matching.push(definition);
        seen.add(definition);
      }
    }
    return matching.length === 1 ? matching[0]! : null;
  }

  lookupByModule(moduleKey: string | null): readonly FullResourceDefinition[] {
    return moduleKey == null
      ? []
      : this.byModule.get(normalizeModuleKey(moduleKey)) ?? [];
  }

  lookupByTargetReference(reference: ResourceTargetReference | null): FullResourceDefinition | null {
    if (reference == null) {
      return null;
    }
    const byIdentity = this.lookupByTargetIdentity(reference.identityHandle);
    if (byIdentity != null) {
      return byIdentity;
    }
    return null;
  }

  lookupByDependencyReference(reference: ResourceDependencyReference | null): FullResourceDefinition | null {
    const definitions = this.lookupAllByDependencyReference(reference);
    return definitions.length === 1 ? definitions[0]! : null;
  }

  lookupAllByDependencyReference(reference: ResourceDependencyReference | null): readonly FullResourceDefinition[] {
    if (reference == null) {
      return [];
    }
    if (reference.dependencyKind !== ResourceDependencyReferenceKind.Resource) {
      return [];
    }
    const byIdentity = this.lookupByTargetIdentity(reference.identityHandle);
    if (byIdentity != null) {
      return [byIdentity];
    }
    if (reference.moduleKey != null && reference.localName != null) {
      const byModuleLocal = this.lookupByModuleLocal(reference.moduleKey, reference.localName);
      if (byModuleLocal != null) {
        return [byModuleLocal];
      }
    }
    if (reference.moduleKey != null && reference.localName == null) {
      const moduleDefinitions = this.byModule.get(normalizeModuleKey(reference.moduleKey)) ?? [];
      if (moduleDefinitions.length > 0) {
        return moduleDefinitions;
      }
    }
    const byLocalName = this.lookupByLocalName(reference.keyName);
    if (byLocalName != null) {
      return [byLocalName];
    }
    const byResourceName = this.lookupByResourceName(reference.keyName);
    return byResourceName == null ? [] : [byResourceName];
  }

  lookupValue(value: EvaluationValue | null): FullResourceDefinition | null {
    if (value == null) {
      return null;
    }
    if (value.kind !== EvaluationValueKind.Class && value.kind !== EvaluationValueKind.Function) {
      return null;
    }
    const localName = readDeclarationLocalName(value.declaration);
    if (localName == null) {
      return null;
    }
    return this.lookupByModuleLocal(value.environment.moduleKey, localName);
  }

  lookupByCarrierNode(node: ts.Node | null): FullResourceDefinition | null {
    const carrier = node != null && ts.isVariableDeclaration(node)
      ? node.initializer ?? null
      : node;
    return carrier != null && ts.isExpression(carrier)
      ? this.bySourceNode.get(unwrapExpression(carrier)) ?? null
      : null;
  }

  lookupEffectConstraintByModuleLocal(
    moduleKey: string,
    localName: string,
  ): ResourceDefinitionEffectConstraint | null {
    const matching = this.effectConstraintsByModuleLocal.get(resourceDefinitionIndexKey(moduleKey, localName)) ?? [];
    return matching.length === 1 ? matching[0]! : null;
  }

  lookupEffectConstraintByTypeScriptExpression(
    typeSystem: TypeSystemProject,
    expression: ts.Expression,
  ): ResourceDefinitionEffectConstraint | null {
    const symbol = typeSystem.readProgramAliasedSymbolAtLocation(unwrapExpression(expression));
    if (symbol == null) return null;
    const matching = new Set<ResourceDefinitionEffectConstraint>();
    for (const declaration of symbol.declarations ?? []) {
      const localName = readDeclarationLocalName(declaration);
      const moduleKey = typeSystem.readModuleKeyForSourceFile(declaration.getSourceFile());
      if (localName == null || moduleKey == null) continue;
      for (const constraint of this.effectConstraintsByModuleLocal.get(
        resourceDefinitionIndexKey(moduleKey, localName),
      ) ?? []) {
        matching.add(constraint);
      }
    }
    return matching.size === 1 ? matching.values().next().value ?? null : null;
  }

  lookupEffectConstraintByCarrierNode(node: ts.Node | null): ResourceDefinitionEffectConstraint | null {
    if (node == null || !ts.isExpression(node)) return null;
    return this.effectConstraintBySourceNode.get(unwrapExpression(node)) ?? null;
  }

}

class ResourceDefinitionCarrier {
  constructor(
    readonly moduleKey: string,
    readonly carrierKind: ResourceCarrierKind,
    readonly sourceNode: ts.Node,
  ) {}
}

function appendUniqueEntry(
  entries: readonly ResourceDefinitionIndexEntry[],
  entry: ResourceDefinitionIndexEntry,
): readonly ResourceDefinitionIndexEntry[] {
  return entries.some((candidate) => candidate.definition === entry.definition)
    ? entries
    : [...entries, entry];
}

function appendUniqueDefinition(
  definitions: readonly FullResourceDefinition[],
  definition: FullResourceDefinition,
): readonly FullResourceDefinition[] {
  return definitions.includes(definition)
    ? definitions
    : [...definitions, definition];
}

function isImmutableResourceAliasDeclaration(declaration: ts.Declaration): boolean {
  return ts.isVariableDeclaration(declaration)
    && ts.isVariableDeclarationList(declaration.parent)
    && (declaration.parent.flags & ts.NodeFlags.Const) !== 0;
}

function resourceCarrierResultLocalName(node: ts.Node): string | null {
  const declaration = assignedExpressionVariableDeclaration(node);
  return declaration != null && ts.isIdentifier(declaration.name)
    ? declaration.name.text
    : null;
}

function resourceDefinitionIndexKey(moduleKey: string, localName: string): string {
  return `${normalizeModuleKey(moduleKey)}\0${localName}`;
}

function readResourceDefinitionNames(definition: FullResourceDefinition): readonly string[] {
  if (!('name' in definition)) {
    return [];
  }
  const names = new Set<string>();
  names.add(definition.name);
  for (const alias of definition.aliases) {
    names.add(alias.name);
  }
  return [...names];
}

function isCustomElementDefinition(definition: FullResourceDefinition): boolean {
  return definition.type === ResourceDefinitionKind.CustomElement;
}

function resourceDefinitionHasName(definition: FullResourceDefinition, resourceNameKey: string): boolean {
  return readResourceDefinitionNames(definition)
    .some((name) => name.toLowerCase() === resourceNameKey);
}
