import type ts from 'typescript';

import type { AddressHandle } from '../kernel/handles.js';
import type {
  EvaluatedProjectSource,
  StaticProjectEvaluationResult,
  StaticProjectEvaluationSourceResult,
} from './project-evaluation.js';
import type {
  StaticInvocationIdentity,
  StaticInvocationOccurrence,
} from './invocation.js';
import { normalizeModuleKey } from './module-graph.js';

/**
 * One immutable lookup over the source identities admitted by a project-evaluation generation.
 * Domain materializers use it instead of rebuilding path-to-address maps with subtly different keys.
 */
export class StaticProjectEvaluationSourceIndex {
  private readonly sourcesByKey = new Map<string, StaticProjectEvaluationSourceResult>();
  private readonly executionOrdinalsByInvocation = new WeakMap<StaticInvocationIdentity, number>();

  constructor(readonly evaluation: StaticProjectEvaluationResult) {
    for (const source of evaluation.sources) {
      this.retain(source.moduleKey, source);
      this.retain(source.admission.path, source);
      if (source.sourceFile != null) {
        this.retain(source.sourceFile.fileName, source);
      }
    }
    let executionOrdinal = 0;
    for (const invocation of evaluation.executionOrderInvocations) {
      this.executionOrdinalsByInvocation.set(invocation.identity, executionOrdinal++);
    }
  }

  read(key: string): StaticProjectEvaluationSourceResult | null {
    return this.sourcesByKey.get(normalizeModuleKey(key)) ?? null;
  }

  readEvaluated(key: string): EvaluatedProjectSource | null {
    const source = this.read(key);
    return source?.sourceFile != null && source.evaluation != null
      ? source as EvaluatedProjectSource
      : null;
  }

  readForNode(node: ts.Node): StaticProjectEvaluationSourceResult | null {
    return this.read(node.getSourceFile().fileName);
  }

  readEvaluatedForNode(node: ts.Node): EvaluatedProjectSource | null {
    const source = this.readForNode(node);
    return source?.sourceFile != null && source.evaluation != null
      ? source as EvaluatedProjectSource
      : null;
  }

  addressHandleForNode(node: ts.Node): AddressHandle | null {
    return this.readForNode(node)?.admission.addressHandle ?? null;
  }

  /** Project-wide modeled execution order for one definitely reached invocation occurrence. */
  executionOrdinalForInvocation(invocation: StaticInvocationOccurrence): number | null {
    return this.executionOrdinalsByInvocation.get(invocation.identity) ?? null;
  }

  private retain(key: string, source: StaticProjectEvaluationSourceResult): void {
    this.sourcesByKey.set(normalizeModuleKey(key), source);
  }
}
