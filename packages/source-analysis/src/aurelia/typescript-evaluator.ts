import type { Workspace } from './workspace.js';
import type { T_Ref } from './refs.js';
import { Registration } from './registration.js';

export const VALUE_VIEW_KINDS = [
  'symbolic',
  'structured',
  'opaque',
] as const;

export type ValueViewKind =
  typeof VALUE_VIEW_KINDS[number];

export const EVALUATION_BOUNDARY_KINDS = [
  'not-yet-materialized',
  'outside-ceiling',
  'dynamic-expression',
  'unsupported-ref-kind',
] as const;

export type EvaluationBoundaryKind =
  typeof EVALUATION_BOUNDARY_KINDS[number];

export class EvaluationBoundary {
  constructor(
    readonly kind: EvaluationBoundaryKind,
    readonly reason: string,
  ) {}
}

export class ValueView {
  constructor(
    readonly subject: T_Ref,
    readonly kind: ValueViewKind,
    readonly summary: string | null,
    readonly boundary: EvaluationBoundary | null = null,
    readonly children: readonly ValueView[] = [],
  ) {}

  get isOpen(): boolean {
    return this.boundary != null;
  }
}

export class TypeScriptEvaluator {
  constructor(
    readonly workspace: Workspace,
  ) {}

  evaluate(
    subject: T_Ref,
  ): ValueView {
    switch (subject.kind) {
      case 'program':
        return new ValueView(subject, 'structured', `program ${subject.id}`);
      case 'source-file':
        return new ValueView(subject, 'structured', subject.path);
      case 'source-node':
        return new ValueView(
          subject,
          'symbolic',
          subject.nodeKind,
          new EvaluationBoundary(
            'not-yet-materialized',
            'Source-node evaluation has not been implemented yet.',
          ),
        );
      case 'symbol':
        return new ValueView(subject, 'symbolic', subject.name);
      case 'key':
        return new ValueView(
          subject,
          'symbolic',
          subject.debugName,
          new EvaluationBoundary(
            'not-yet-materialized',
            'Key refs still need container or registration interpretation before value materialization.',
          ),
        );
      case 'registration':
        return this.evaluateRegistration(new Registration(subject));
      case 'template':
        return new ValueView(
          subject,
          'symbolic',
          subject.id,
          new EvaluationBoundary(
            'not-yet-materialized',
            'Template refs still need compilation before deeper evaluation.',
          ),
        );
      case 'template-node':
        return new ValueView(
          subject,
          'symbolic',
          subject.nodeKind,
          new EvaluationBoundary(
            'not-yet-materialized',
            'Template-node evaluation is not implemented yet.',
          ),
        );
      case 'resource-reference':
        return new ValueView(
          subject,
          'symbolic',
          subject.name,
          new EvaluationBoundary(
            'not-yet-materialized',
            'Resource references still require resource-family-specific evaluation.',
          ),
        );
      default:
        return new ValueView(
          subject,
          'opaque',
          subject.id,
          new EvaluationBoundary(
            'unsupported-ref-kind',
            `No evaluator branch exists yet for ref kind "${subject.kind}".`,
          ),
        );
    }
  }

  evaluateRegistration(
    registration: Registration,
  ): ValueView {
    return new ValueView(
      registration.ref,
      'structured',
      registration.key?.debugName ?? registration.id,
      registration.key == null
        ? new EvaluationBoundary(
            'outside-ceiling',
            'Registration has no closed key ref yet.',
          )
        : new EvaluationBoundary(
            'not-yet-materialized',
            'Registration materialization stops before resolver strategy and value-form recovery in this first evaluator scaffold.',
          ),
    );
  }
}
