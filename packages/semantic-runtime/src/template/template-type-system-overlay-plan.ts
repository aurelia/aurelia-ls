import type { AddressHandle, ProductHandle } from '../kernel/handles.js';
import { BindingContextSlotAssignmentAccessKind } from '../configuration/scope.js';
import { isJavaScriptIdentifierName } from '../javascript/identifier.js';
import { TypeSystemOverlaySourceBuilder } from '../type-system/overlay.js';
import { LetBindingTargetContext } from './runtime-binding.js';

export interface TemplateTypeSystemOverlaySourceSlice {
  readonly text: string;
  readonly semanticProductHandle: ProductHandle | null;
  readonly sourceAddressHandle: AddressHandle | null;
  readonly sourceStart: number;
  readonly sourceEnd: number;
}

export type TemplateTypeSystemOverlayExpressionPart =
  | TemplateTypeSystemOverlayExpressionTextPart
  | TemplateTypeSystemOverlayExpressionSourcePart;

export interface TemplateTypeSystemOverlayExpressionTextPart {
  readonly kind: 'text';
  readonly text: string;
}

export interface TemplateTypeSystemOverlayExpressionSourcePart {
  readonly kind: 'source';
  readonly source: TemplateTypeSystemOverlaySourceSlice;
  readonly label: string;
}

export type TemplateTypeSystemOverlayScopeLayer =
  | TemplateTypeSystemOverlayRepeatLayer
  | TemplateTypeSystemOverlayBindingContextLayer
  | TemplateTypeSystemOverlayTypedBindingContextLayer
  | TemplateTypeSystemOverlayReusedBindingContextLayer
  | TemplateTypeSystemOverlayContextSlotLayer
  | TemplateTypeSystemOverlayLetLayer
  | TemplateTypeSystemOverlayConditionLayer
  | TemplateTypeSystemOverlaySwitchCaseLayer
  | TemplateTypeSystemOverlayEventLayer
  | TemplateTypeSystemOverlayRuntimeAssignmentLayer;

export interface TemplateTypeSystemOverlayRepeatLayer {
  readonly kind: 'repeat';
  readonly declaration: TemplateTypeSystemOverlaySourceSlice;
  readonly iterable: readonly TemplateTypeSystemOverlayExpressionPart[];
  readonly previousKind: 'element-or-undefined' | 'undefined' | 'unknown';
  readonly previousAssignmentAccessKind: BindingContextSlotAssignmentAccessKind | null;
  readonly currentAliasExpression: string | null;
  readonly parentAlias: TemplateTypeSystemOverlayScopeAlias | null;
}

export interface TemplateTypeSystemOverlayScopeAlias {
  /** Bare `$parent` / `AccessThis` reads expose only the runtime binding context. */
  readonly bindingContextExpression: string;
  /** Named ancestor lookup is override-context-first at the selected runtime Scope. */
  readonly namedLookupExpression: string;
  readonly parentBindingContextExpression: string | null;
  readonly parentNamedLookupExpression: string | null;
}

interface TemplateTypeSystemOverlayCapturedScopeAlias {
  readonly bindingContextLocal: string;
  readonly namedLookupLocal: string;
  readonly parentBindingContextLocal: string | null;
  readonly parentNamedLookupLocal: string | null;
}

/** Generated identifier used when authored `AccessScope` / `CallScope` selects an ancestor by name. */
export const TEMPLATE_TYPE_SYSTEM_OVERLAY_PARENT_NAMED_LOOKUP_ALIAS = '__au_parent_lookup';

export interface TemplateTypeSystemOverlayBindingContextLayer {
  readonly kind: 'binding-context';
  readonly expression: readonly TemplateTypeSystemOverlayExpressionPart[] | null;
  readonly nonNullishExpression: boolean;
  readonly locals: readonly string[];
  readonly parentAlias: TemplateTypeSystemOverlayScopeAlias | null;
}

export interface TemplateTypeSystemOverlayTypedBindingContextLayer {
  readonly kind: 'typed-binding-context';
  readonly locals: readonly TemplateTypeSystemOverlayRuntimeAssignmentLocal[];
  readonly parentAlias?: TemplateTypeSystemOverlayScopeAlias | null;
}

/** Runtime Scope hop that retains the current binding context but introduces a fresh override context. */
export interface TemplateTypeSystemOverlayReusedBindingContextLayer {
  readonly kind: 'reused-binding-context';
  readonly locals: readonly TemplateTypeSystemOverlayContextSlotLocal[];
  readonly parentAlias: TemplateTypeSystemOverlayScopeAlias | null;
}

export interface TemplateTypeSystemOverlayLetLayer {
  readonly kind: 'let';
  readonly effects: readonly TemplateTypeSystemOverlayLetEffect[];
}

export interface TemplateTypeSystemOverlayContextSlotLayer {
  readonly kind: 'context-slots';
  readonly locals: readonly TemplateTypeSystemOverlayContextSlotLocal[];
}

export interface TemplateTypeSystemOverlayContextSlotLocal {
  readonly name: string;
  readonly valueKind: TemplateTypeSystemOverlayContextSlotValueKind;
  readonly typeExpression: string | null;
  readonly assignmentAccessKind: BindingContextSlotAssignmentAccessKind | null;
}

export type TemplateTypeSystemOverlayContextSlotValueKind =
  | 'boolean'
  | 'number'
  | 'dynamic';

export interface TemplateTypeSystemOverlayLetEffect {
  readonly target: string;
  readonly expression: readonly TemplateTypeSystemOverlayExpressionPart[];
  readonly targetContext: LetBindingTargetContext;
}

export interface TemplateTypeSystemOverlayConditionLayer {
  readonly kind: 'condition';
  readonly condition: readonly TemplateTypeSystemOverlayExpressionPart[];
  readonly negate: boolean;
}

export interface TemplateTypeSystemOverlaySwitchCaseLayer {
  readonly kind: 'switch-case';
  readonly switchExpression: readonly TemplateTypeSystemOverlayExpressionPart[];
  readonly caseExpressions: readonly (readonly TemplateTypeSystemOverlayExpressionPart[])[];
  readonly excludedCaseExpressions: readonly (readonly TemplateTypeSystemOverlayExpressionPart[])[];
  readonly defaultCaseExpressions: readonly (readonly TemplateTypeSystemOverlayExpressionPart[])[];
  readonly narrow: boolean;
}

export interface TemplateTypeSystemOverlayEventLayer {
  readonly kind: 'event';
  readonly eventName: string;
  readonly memberTypes: readonly TemplateTypeSystemOverlayEventMemberType[];
}

export interface TemplateTypeSystemOverlayEventMemberType {
  readonly name: string;
  readonly typeText: string;
}

export interface TemplateTypeSystemOverlayRuntimeAssignmentLayer {
  readonly kind: 'runtime-assignment';
  readonly locals: readonly TemplateTypeSystemOverlayRuntimeAssignmentLocal[];
  readonly bindingContextLocalNames: readonly string[];
}

export interface TemplateTypeSystemOverlayRuntimeAssignmentLocal {
  readonly name: string;
  readonly typeExpression: string | null;
}

export function appendTemplateTypeSystemOverlayScopeBlock(
  builder: TypeSystemOverlaySourceBuilder,
  layers: readonly TemplateTypeSystemOverlayScopeLayer[],
): { readonly indent: string; readonly closeCount: number } {
  return new TemplateTypeSystemOverlayScopeBlockWriter(builder).append(layers);
}

class TemplateTypeSystemOverlayScopeBlockWriter {
  private depth = 0;

  constructor(
    private readonly builder: TypeSystemOverlaySourceBuilder,
  ) {}

  append(
    layers: readonly TemplateTypeSystemOverlayScopeLayer[],
  ): { readonly indent: string; readonly closeCount: number } {
    this.builder.append('{\n');
    this.depth += 1;
    for (const layer of layers) {
      this.appendLayer(layer);
    }
    return {
      indent: this.indent,
      closeCount: this.depth,
    };
  }

  private get indent(): string {
    return '  '.repeat(this.depth);
  }

  private appendLayer(layer: TemplateTypeSystemOverlayScopeLayer): void {
    switch (layer.kind) {
      case 'repeat':
        this.appendRepeatLayer(layer);
        return;
      case 'binding-context':
        this.appendBindingContextLayer(layer);
        return;
      case 'typed-binding-context':
        this.appendTypedBindingContextLayer(layer);
        return;
      case 'reused-binding-context':
        this.appendReusedBindingContextLayer(layer);
        return;
      case 'condition':
        this.appendConditionLayer(layer);
        return;
      case 'switch-case':
        this.appendSwitchCaseLayer(layer);
        return;
      case 'context-slots':
        this.appendContextSlotLayer(layer);
        return;
      case 'event':
        this.appendEventLayer(layer);
        return;
      case 'runtime-assignment':
        this.appendRuntimeAssignmentLayer(layer);
        return;
      case 'let':
        this.appendLetLayer(layer);
        return;
    }
  }

  private appendRepeatLayer(layer: TemplateTypeSystemOverlayRepeatLayer): void {
    const indent = this.indent;
    const capturedParent = this.captureParentAlias(layer.parentAlias, indent);
    const valuesLocal = `__au_repeat_values_${this.depth}`;
    this.builder.append(`${indent}const ${valuesLocal} = __au_repeat(`);
    appendTemplateTypeSystemOverlayExpressionParts(this.builder, layer.iterable, `repeat source for ${layer.declaration.text}`);
    this.builder.append(');\n');
    this.builder.append(`${indent}for (const ${layer.declaration.text} of ${valuesLocal}) {\n`);
    this.depth += 1;
    const nestedIndent = this.indent;
    this.appendCapturedParentAlias(capturedParent, nestedIndent);
    this.builder.appendLine(repeatPreviousDeclaration(
      layer.previousKind,
      layer.previousAssignmentAccessKind,
      valuesLocal,
      nestedIndent,
    ));
    if (layer.currentAliasExpression != null) {
      this.builder.appendLine(`${nestedIndent}const $this = ${layer.currentAliasExpression};`);
    }
  }

  private appendBindingContextLayer(layer: TemplateTypeSystemOverlayBindingContextLayer): void {
    const indent = this.indent;
    const capturedParent = this.captureParentAlias(layer.parentAlias, indent);
    this.builder.append(`${indent}{\n`);
    this.depth += 1;
    const nestedIndent = this.indent;
    const contextLocal = `__au_context_${this.depth}`;
    if (layer.expression == null) {
      this.builder.appendLine(`${nestedIndent}const ${contextLocal} = {};`);
    } else if (layer.nonNullishExpression) {
      const contextSourceLocal = `__au_context_source_${this.depth}`;
      this.builder.append(`${nestedIndent}const ${contextSourceLocal} = `);
      appendTemplateTypeSystemOverlayExpressionParts(this.builder, layer.expression, 'binding context source');
      this.builder.append(';\n');
      this.builder.appendLine(`${nestedIndent}const ${contextLocal} = ${contextSourceLocal} as NonNullable<typeof ${contextSourceLocal}>;`);
    } else {
      this.builder.append(`${nestedIndent}const ${contextLocal} = `);
      appendTemplateTypeSystemOverlayExpressionParts(this.builder, layer.expression, 'binding context source');
      this.builder.append(';\n');
    }
    this.appendCapturedParentAlias(capturedParent, nestedIndent);
    this.builder.appendLine(`${nestedIndent}const $this = ${contextLocal};`);
    for (const local of layer.locals) {
      this.builder.appendLine(`${nestedIndent}const ${local} = ${contextLocal}.${local};`);
    }
  }

  private captureParentAlias(
    alias: TemplateTypeSystemOverlayScopeAlias | null,
    indent: string,
  ): TemplateTypeSystemOverlayCapturedScopeAlias | null {
    if (alias == null) {
      return null;
    }
    const bindingContextLocal = `__au_parent_${this.depth}`;
    const namedLookupLocal = `__au_parent_lookup_${this.depth}`;
    const parentBindingContextLocal = alias.parentBindingContextExpression == null
      ? null
      : `__au_parent_${this.depth}_parent`;
    const parentNamedLookupLocal = alias.parentNamedLookupExpression == null
      ? null
      : `__au_parent_lookup_${this.depth}_parent`;
    this.builder.appendLine(`${indent}const ${bindingContextLocal} = ${alias.bindingContextExpression};`);
    this.builder.appendLine(`${indent}const ${namedLookupLocal} = ${alias.namedLookupExpression};`);
    if (parentBindingContextLocal != null && alias.parentBindingContextExpression != null) {
      this.builder.appendLine(`${indent}const ${parentBindingContextLocal} = ${alias.parentBindingContextExpression};`);
    }
    if (parentNamedLookupLocal != null && alias.parentNamedLookupExpression != null) {
      this.builder.appendLine(`${indent}const ${parentNamedLookupLocal} = ${alias.parentNamedLookupExpression};`);
    }
    return {
      bindingContextLocal,
      namedLookupLocal,
      parentBindingContextLocal,
      parentNamedLookupLocal,
    };
  }

  private appendCapturedParentAlias(
    captured: TemplateTypeSystemOverlayCapturedScopeAlias | null,
    indent: string,
  ): void {
    if (captured == null) {
      return;
    }
    this.builder.appendLine(captured.parentBindingContextLocal == null
      ? `${indent}const $parent = ${captured.bindingContextLocal};`
      : `${indent}const $parent = ${captured.bindingContextLocal} as typeof ${captured.bindingContextLocal} & { readonly $parent: typeof ${captured.parentBindingContextLocal} };`);
    this.builder.appendLine(captured.parentNamedLookupLocal == null
      ? `${indent}const ${TEMPLATE_TYPE_SYSTEM_OVERLAY_PARENT_NAMED_LOOKUP_ALIAS} = ${captured.namedLookupLocal};`
      : `${indent}const ${TEMPLATE_TYPE_SYSTEM_OVERLAY_PARENT_NAMED_LOOKUP_ALIAS} = ${captured.namedLookupLocal} as typeof ${captured.namedLookupLocal} & { readonly $parent: typeof ${captured.parentNamedLookupLocal} };`);
  }

  private appendTypedBindingContextLayer(layer: TemplateTypeSystemOverlayTypedBindingContextLayer): void {
    const indent = this.indent;
    const capturedParent = this.captureParentAlias(layer.parentAlias ?? null, indent);
    this.builder.append(`${indent}{\n`);
    this.depth += 1;
    const nestedIndent = this.indent;
    this.appendCapturedParentAlias(capturedParent, nestedIndent);
    for (const local of layer.locals) {
      this.builder.appendLine(local.typeExpression == null
        ? `${nestedIndent}const ${local.name} = undefined as unknown;`
        : `${nestedIndent}const ${local.name} = undefined as unknown as ${local.typeExpression};`);
    }
    this.builder.appendLine(layer.locals.length === 0
      ? `${nestedIndent}const $this = {};`
      : `${nestedIndent}const $this = { ${layer.locals.map((local) => local.name).join(', ')} };`);
  }

  private appendReusedBindingContextLayer(
    layer: TemplateTypeSystemOverlayReusedBindingContextLayer,
  ): void {
    const indent = this.indent;
    const capturedParent = this.captureParentAlias(layer.parentAlias, indent);
    this.builder.append(`${indent}{\n`);
    this.depth += 1;
    const nestedIndent = this.indent;
    this.appendCapturedParentAlias(capturedParent, nestedIndent);
    this.appendContextSlotDeclarations(layer.locals, nestedIndent);
  }

  private appendConditionLayer(layer: TemplateTypeSystemOverlayConditionLayer): void {
    this.builder.append(`${this.indent}if (`);
    if (layer.negate) {
      this.builder.append('!(');
    }
    appendTemplateTypeSystemOverlayExpressionParts(
      this.builder,
      layer.condition,
      layer.negate ? 'else condition source' : 'if condition source',
    );
    this.builder.append(layer.negate ? ')) {\n' : ') {\n');
    this.depth += 1;
  }

  private appendSwitchCaseLayer(layer: TemplateTypeSystemOverlaySwitchCaseLayer): void {
    const indent = this.indent;

    if (layer.narrow && layer.defaultCaseExpressions.length > 0) {
      this.appendSwitchCaseExcludedExpressions(layer, layer.defaultCaseExpressions, 'switch default excluded case');
      this.depth += 1;
      return;
    }

    if (layer.narrow && layer.caseExpressions.length > 0) {
      this.builder.append(`${indent}if (`);
      this.appendSwitchCaseExcludedExpressionClauses(layer, layer.excludedCaseExpressions, 'switch blocked case');
      if (layer.excludedCaseExpressions.length > 0) {
        this.builder.append(' && ');
      }
      if (layer.caseExpressions.length > 1) {
        this.builder.append('(');
      }
      this.appendSwitchCaseMatchedExpressionClauses(layer, layer.caseExpressions, 'switch case source');
      if (layer.caseExpressions.length > 1) {
        this.builder.append(')');
      }
      this.builder.append(') {\n');
      this.depth += 1;
      return;
    }

    this.builder.append(`${indent}{\n`);
    this.depth += 1;
  }

  private appendSwitchCaseExcludedExpressions(
    layer: TemplateTypeSystemOverlaySwitchCaseLayer,
    expressions: readonly (readonly TemplateTypeSystemOverlayExpressionPart[])[],
    label: string,
  ): void {
    this.builder.append(`${this.indent}if (`);
    this.appendSwitchCaseExcludedExpressionClauses(layer, expressions, label);
    this.builder.append(') {\n');
  }

  private appendSwitchCaseExcludedExpressionClauses(
    layer: TemplateTypeSystemOverlaySwitchCaseLayer,
    expressions: readonly (readonly TemplateTypeSystemOverlayExpressionPart[])[],
    label: string,
  ): void {
    expressions.forEach((caseExpression, index) => {
      if (index > 0) {
        this.builder.append(' && ');
      }
      this.builder.append('!__au_switch_case(');
      appendTemplateTypeSystemOverlayExpressionParts(this.builder, layer.switchExpression, 'switch source');
      this.builder.append(', ');
      appendTemplateTypeSystemOverlayExpressionParts(this.builder, caseExpression, `${label} ${index + 1}`);
      this.builder.append(')');
    });
  }

  private appendSwitchCaseMatchedExpressionClauses(
    layer: TemplateTypeSystemOverlaySwitchCaseLayer,
    expressions: readonly (readonly TemplateTypeSystemOverlayExpressionPart[])[],
    label: string,
  ): void {
    expressions.forEach((caseExpression, index) => {
      if (index > 0) {
        this.builder.append(' || ');
      }
      this.builder.append('__au_switch_case(');
      appendTemplateTypeSystemOverlayExpressionParts(this.builder, layer.switchExpression, 'switch source');
      this.builder.append(', ');
      appendTemplateTypeSystemOverlayExpressionParts(this.builder, caseExpression, `${label} ${index + 1}`);
      this.builder.append(')');
    });
  }

  private appendContextSlotLayer(layer: TemplateTypeSystemOverlayContextSlotLayer): void {
    this.appendContextSlotDeclarations(layer.locals, this.indent);
  }

  private appendContextSlotDeclarations(
    locals: readonly TemplateTypeSystemOverlayContextSlotLocal[],
    indent: string,
  ): void {
    for (const local of locals) {
      const declarationKeyword = contextSlotDeclarationKeyword(local.assignmentAccessKind);
      this.builder.appendLine(local.typeExpression == null
        ? `${indent}${declarationKeyword} ${local.name} = ${contextSlotLocalInitializer(local.valueKind)};`
        : `${indent}${declarationKeyword} ${local.name} = undefined as unknown as ${local.typeExpression};`);
    }
  }

  private appendEventLayer(layer: TemplateTypeSystemOverlayEventLayer): void {
    this.builder.append(`${this.indent}const $event = undefined as unknown as __au_event<${templateTypeSystemOverlayQuotedStringLiteral(layer.eventName)}>`);
    if (layer.memberTypes.length > 0) {
      this.builder.append(' & { ');
      layer.memberTypes.forEach((member, index) => {
        this.builder.append(`${index === 0 ? '' : '; '}${member.name}: ${member.typeText}`);
      });
      this.builder.append(' }');
    }
    this.builder.append(';\n');
  }

  private appendRuntimeAssignmentLayer(layer: TemplateTypeSystemOverlayRuntimeAssignmentLayer): void {
    const outerIndent = this.indent;
    const previousContextLocal = layer.bindingContextLocalNames.length === 0
      ? null
      : `__au_assignment_context_${this.depth}`;
    if (previousContextLocal != null) {
      this.builder.appendLine(`${outerIndent}const ${previousContextLocal} = $this;`);
    }
    this.builder.append(`${outerIndent}{\n`);
    this.depth += 1;
    const indent = this.indent;
    for (const local of layer.locals) {
      this.builder.appendLine(local.typeExpression == null
        ? `${indent}let ${local.name} = undefined as unknown;`
        : `${indent}let ${local.name} = undefined as unknown as ${local.typeExpression};`);
    }
    if (previousContextLocal != null) {
      const additionType = `{ ${layer.bindingContextLocalNames
        .map((name) => `readonly ${name}: typeof ${name}`)
        .join('; ')} }`;
      this.builder.appendLine(
        `${indent}const $this = ${previousContextLocal} as unknown as Omit<typeof ${previousContextLocal}, keyof ${additionType}> & ${additionType};`,
      );
    }
  }

  private appendLetLayer(layer: TemplateTypeSystemOverlayLetLayer): void {
    for (const effect of layer.effects) {
      const indent = this.indent;
      const valueLocal = `__au_let_value_${this.depth}`;
      const previousContextLocal = effect.targetContext === LetBindingTargetContext.BindingContext
        ? `__au_let_context_${this.depth}`
        : null;
      this.builder.append(`${indent}const ${valueLocal} = `);
      appendTemplateTypeSystemOverlayExpressionParts(this.builder, effect.expression, `let source for ${effect.target}`);
      this.builder.append(';\n');
      if (previousContextLocal != null) {
        this.builder.appendLine(`${indent}const ${previousContextLocal} = $this;`);
      }
      this.builder.append(`${indent}{\n`);
      this.depth += 1;
      const nestedIndent = this.indent;
      this.builder.appendLine(`${nestedIndent}const ${effect.target} = ${valueLocal};`);
      if (previousContextLocal != null) {
        const additionType = `{ readonly ${effect.target}: typeof ${effect.target} }`;
        this.builder.appendLine(
          `${nestedIndent}const $this = ${previousContextLocal} as unknown as Omit<typeof ${previousContextLocal}, keyof ${additionType}> & ${additionType};`,
        );
      }
    }
  }
}

export function appendTemplateTypeSystemOverlayExpressionParts(
  builder: TypeSystemOverlaySourceBuilder,
  parts: readonly TemplateTypeSystemOverlayExpressionPart[],
  label: string,
): void {
  for (const part of parts) {
    if (part.kind === 'text') {
      builder.append(part.text);
      continue;
    }
    builder.appendSegment(part.source.text, {
      role: 'semantic-surface',
      semanticProductHandle: part.source.semanticProductHandle,
      sourceAddressHandle: part.source.sourceAddressHandle,
      sourceStart: part.source.sourceStart,
      sourceEnd: part.source.sourceEnd,
      label: part.label.length === 0 ? label : part.label,
    });
  }
}

export function templateTypeSystemOverlayIdentifierName(value: string): boolean {
  return isJavaScriptIdentifierName(value);
}

export function templateTypeSystemOverlayQuotedStringLiteral(value: string): string {
  return JSON.stringify(value);
}

function contextSlotLocalInitializer(valueKind: TemplateTypeSystemOverlayContextSlotValueKind): string {
  switch (valueKind) {
    case 'boolean':
      return 'false';
    case 'number':
      return '0';
    case 'dynamic':
      return 'undefined as unknown';
  }
}

function repeatPreviousDeclaration(
  kind: TemplateTypeSystemOverlayRepeatLayer['previousKind'],
  assignmentAccessKind: BindingContextSlotAssignmentAccessKind | null,
  valuesLocal: string,
  indent: string,
): string {
  const declarationKeyword = contextSlotDeclarationKeyword(assignmentAccessKind);
  switch (kind) {
    case 'element-or-undefined':
      return `${indent}${declarationKeyword} $previous = undefined as (typeof ${valuesLocal} extends Iterable<infer T> ? T : never) | undefined;`;
    case 'undefined':
      return `${indent}${declarationKeyword} $previous = undefined;`;
    case 'unknown':
      return `${indent}${declarationKeyword} $previous = undefined as unknown;`;
  }
}

function contextSlotDeclarationKeyword(
  assignmentAccessKind: BindingContextSlotAssignmentAccessKind | null,
): 'const' | 'let' {
  return assignmentAccessKind === BindingContextSlotAssignmentAccessKind.FrameworkManagedReadOnly
    ? 'const'
    : 'let';
}
