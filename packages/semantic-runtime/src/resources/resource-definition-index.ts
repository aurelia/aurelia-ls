import ts from 'typescript';
import type { StaticExpressionEvaluationReader } from '../evaluation/expression-reader.js';
import { normalizeModuleKey } from '../evaluation/module-graph.js';
import {
  readDeclarationLocalName,
  unwrapExpression,
} from '../evaluation/ts-syntax.js';
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
import { ResourceDefinitionKind } from './resource-kind.js';
import type { ResourceRecognitionProjectResult } from './resource-recognition-project-pass.js';

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

/**
 * Lookup table that lets later materializers connect evaluated registration values back to converged resource definitions.
 */
export class ResourceDefinitionIndex {
  static fromProject(project: ResourceRecognitionProjectResult): ResourceDefinitionIndex {
    const entries: ResourceDefinitionIndexEntry[] = [];
    const effectiveDefinitions = new Set(project.readDefinitions());

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
      for (const definition of source.convergence.definitions) {
        if (!effectiveDefinitions.has(definition)) {
          continue;
        }
        const observation = definition.target.addressHandle == null
          ? null
          : observationByTargetAddress.get(definition.target.addressHandle) ?? null;
        entries.push(new ResourceDefinitionIndexEntry(
          moduleKey,
          definition.target.localName,
          observation?.sourceNode ?? null,
          definition,
        ));
      }
    }

    return new ResourceDefinitionIndex(entries);
  }

  private readonly byModuleLocal = new Map<string, ResourceDefinitionIndexEntry>();
  private readonly byProduct = new Map<ProductHandle, FullResourceDefinition>();
  private readonly byTargetIdentity = new Map<IdentityHandle, FullResourceDefinition>();
  private readonly byLocalName = new Map<string, readonly FullResourceDefinition[]>();
  private readonly byModule = new Map<string, readonly FullResourceDefinition[]>();
  private readonly byResourceName = new Map<string, readonly FullResourceDefinition[]>();
  private readonly bySourceNode = new WeakMap<ts.Node, FullResourceDefinition>();

  constructor(
    readonly entries: readonly ResourceDefinitionIndexEntry[],
  ) {
    for (const entry of entries) {
      if (entry.localName != null) {
        this.byModuleLocal.set(resourceDefinitionIndexKey(entry.moduleKey, entry.localName), entry);
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
  }

  lookupByModuleLocal(moduleKey: string, localName: string): FullResourceDefinition | null {
    return this.byModuleLocal.get(resourceDefinitionIndexKey(moduleKey, localName))?.definition ?? null;
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
    if (reference.localName == null) {
      return null;
    }
    return this.lookupByLocalName(reference.localName);
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

  lookupExpression(
    expression: ts.Expression,
    reader: StaticExpressionEvaluationReader,
  ): FullResourceDefinition | null {
    const read = reader.evaluateExpression(expression);
    return this.lookupValue(read.value)
      ?? this.lookupByCarrierNode(expression)
      ?? null;
  }
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
