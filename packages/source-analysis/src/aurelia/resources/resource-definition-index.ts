import ts from 'typescript';
import type { StaticEvaluationExpressionReader } from '../evaluation/expression-reader.js';
import { normalizeModuleKey } from '../evaluation/module-graph.js';
import { EvaluationValueKind } from '../evaluation/values.js';
import type { ProductHandle } from '../kernel/handles.js';
import type { FullResourceDefinition } from './resource-definition.js';
import type { ResourceRecognitionProjectResult } from './resource-recognition-project-pass.js';

export class ResourceDefinitionIndexEntry {
  constructor(
    /** Module key that owns the declaration which produced the resource definition. */
    readonly moduleKey: string,
    /** Local declaration name in the owning module. */
    readonly localName: string,
    /** Fully converged resource definition recognized for the declaration. */
    readonly definition: FullResourceDefinition,
  ) {}
}

/**
 * Lookup table that lets later producers connect evaluated registration values back to converged resource definitions.
 */
export class ResourceDefinitionIndex {
  static fromProject(project: ResourceRecognitionProjectResult): ResourceDefinitionIndex {
    const entries: ResourceDefinitionIndexEntry[] = [];

    for (const source of project.sources) {
      const moduleKey = normalizeModuleKey(source.admission.path);
      for (const definition of source.convergence.definitions) {
        if (definition.target.localName == null) {
          continue;
        }
        entries.push(new ResourceDefinitionIndexEntry(moduleKey, definition.target.localName, definition));
      }
    }

    return new ResourceDefinitionIndex(entries);
  }

  private readonly byModuleLocal = new Map<string, ResourceDefinitionIndexEntry>();
  private readonly byProduct = new Map<ProductHandle, FullResourceDefinition>();

  constructor(
    readonly entries: readonly ResourceDefinitionIndexEntry[],
  ) {
    for (const entry of entries) {
      this.byModuleLocal.set(resourceDefinitionIndexKey(entry.moduleKey, entry.localName), entry);
      if (entry.definition.productHandle != null) {
        this.byProduct.set(entry.definition.productHandle, entry.definition);
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

  lookupExpression(
    expression: ts.Expression,
    reader: StaticEvaluationExpressionReader,
  ): FullResourceDefinition | null {
    const read = reader.evaluateExpression(expression);
    const value = read.value;
    if (value == null) {
      return null;
    }
    if (value.kind !== EvaluationValueKind.Class && value.kind !== EvaluationValueKind.Function) {
      return null;
    }

    const localName = declarationLocalName(value.declaration);
    if (localName == null) {
      return null;
    }

    return this.lookupByModuleLocal(value.environment.moduleKey, localName);
  }
}

function resourceDefinitionIndexKey(moduleKey: string, localName: string): string {
  return `${normalizeModuleKey(moduleKey)}\0${localName}`;
}

function declarationLocalName(declaration: ts.ClassLikeDeclaration | ts.FunctionLikeDeclaration): string | null {
  return declaration.name != null && ts.isIdentifier(declaration.name)
    ? declaration.name.text
    : null;
}
