import {
  ArrayBindingPattern,
  ArrayLiteralExpression,
  ObjectBindingPattern,
  ObjectLiteralExpression,
  TemplateExpression,
} from './ast.js';
import type {
  BindingPattern,
  IsAssign,
  ObjectBindingPatternProperty,
} from './ast.js';
import {
  ClosedSubtreeRef,
  type CompletedInputExpressionNode,
} from './parse-result-algebra.js';
import type { SourceSpan, TextSpan } from './source-span.js';

type SpanBearing = { span: TextSpan };

export interface CompletedInputPrefixRefHost {
  span(start: number, end: number): SourceSpan;
  localEnd(node: SpanBearing): number;
}

/**
 * Parser-local closed-subtree witnesses for companion recovery.
 *
 * Grammar corridors decide which partial subtree is worth preserving. This
 * builder owns the concrete witness nodes used to publish those prefixes,
 * keeping subtree publication separate from scanner cursor/failure state.
 */
export class CompletedInputPrefixRefBuilder {
  constructor(
    private readonly host: CompletedInputPrefixRefHost,
  ) {}

  optional(prefixRef: ClosedSubtreeRef | null): readonly ClosedSubtreeRef[] {
    return prefixRef ? [prefixRef] : [];
  }

  arrayLiteral(
    start: number,
    elements: readonly IsAssign[],
  ): ClosedSubtreeRef | null {
    if (elements.length === 0) {
      return null;
    }

    const prefix = new ArrayLiteralExpression(
      this.host.span(start, this.host.localEnd(elements[elements.length - 1]!)),
      [...elements],
    );
    return this.root(prefix);
  }

  arrayBindingPattern(
    start: number,
    elements: readonly BindingPattern[],
    rest: BindingPattern | null,
  ): ClosedSubtreeRef | null {
    if (elements.length === 0 && !rest) {
      return null;
    }

    const endNode = rest ?? elements[elements.length - 1] ?? null;
    if (!endNode) {
      return null;
    }

    const prefix = new ArrayBindingPattern(
      this.host.span(start, this.host.localEnd(endNode)),
      [...elements],
      rest,
    );
    return this.root(prefix);
  }

  objectLiteral(
    start: number,
    keys: readonly (number | string)[],
    values: readonly IsAssign[],
  ): ClosedSubtreeRef | null {
    if (values.length === 0) {
      return null;
    }

    const prefix = new ObjectLiteralExpression(
      this.host.span(start, this.host.localEnd(values[values.length - 1]!)),
      [...keys],
      [...values],
    );
    return this.root(prefix);
  }

  objectBindingPattern(
    start: number,
    properties: readonly ObjectBindingPatternProperty[],
    rest: BindingPattern | null,
  ): ClosedSubtreeRef | null {
    if (properties.length === 0 && !rest) {
      return null;
    }

    const endNode = rest ?? properties[properties.length - 1]?.value ?? null;
    if (!endNode) {
      return null;
    }

    const prefix = new ObjectBindingPattern(
      this.host.span(start, this.host.localEnd(endNode)),
      [...properties],
      rest,
    );
    return this.root(prefix);
  }

  template(
    start: number,
    cooked: readonly string[],
    expressions: readonly IsAssign[],
    end: number,
  ): ClosedSubtreeRef | null {
    if (cooked.length === 0 && expressions.length === 0) {
      return null;
    }

    if (cooked.length === 1 && cooked[0] === '' && expressions.length === 0) {
      return null;
    }

    const prefix = new TemplateExpression(
      this.host.span(start, end),
      [...cooked],
      [...expressions],
    );
    return this.root(prefix);
  }

  templateRefs(
    start: number,
    cooked: readonly string[],
    expressions: readonly IsAssign[],
    end: number,
  ): readonly ClosedSubtreeRef[] {
    return this.optional(
      this.template(start, cooked, expressions, end),
    );
  }

  root(node: CompletedInputExpressionNode): ClosedSubtreeRef {
    return new ClosedSubtreeRef('root-prefix', node, node.span);
  }

  child(node: CompletedInputExpressionNode): ClosedSubtreeRef {
    return new ClosedSubtreeRef('child', node, node.span);
  }

  sibling(node: CompletedInputExpressionNode): ClosedSubtreeRef {
    return new ClosedSubtreeRef('sibling', node, node.span);
  }
}
