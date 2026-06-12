import { builtInResourceBindableAttribute } from '../resources/built-in-resource-bindables.js';
import {
  authoredTemplateElementSource,
  authoredTemplateElementSourceText,
  type AuthoredTemplateAttributeSource,
  type AuthoredTemplateChildSource,
  type AuthoredTemplateElementSource,
} from './authored-template-source.js';
import {
  builtInBindingCommandAttributeSource,
  BuiltInBindingCommandName,
} from './built-in-syntax.js';

/** Framework resource name for runtime-html `AuCompose`. */
export const AU_COMPOSE_RESOURCE_NAME = 'au-compose' as const;
/** Framework target class name for runtime-html `AuCompose`. */
export const AU_COMPOSE_TARGET_NAME = 'AuCompose' as const;

/** Bindable property names owned by runtime-html `AuCompose`. */
export enum AuComposeBindableName {
  /** Template string or template promise used for template-only composition. */
  Template = 'template',
  /** Component name, constructor, instance, or promise used for dynamic composition. */
  Component = 'component',
  /** Model passed to composed component activation/update hooks. */
  Model = 'model',
  /** Scope-inheritance behavior used by template-only composition. */
  ScopeBehavior = 'scopeBehavior',
  /** Exposed promise while composition work is pending. */
  Composing = 'composing',
  /** Exposed composition controller after composition completes. */
  Composition = 'composition',
  /** Host tag name for non-custom-element template composition. */
  Tag = 'tag',
  /** Synchronous or asynchronous composition flush mode. */
  FlushMode = 'flushMode',
}

/** Static literal values accepted by `AuCompose.scopeBehavior`. */
export enum AuComposeScopeBehavior {
  /** Inherit the parent scope for template-only composition. */
  Auto = 'auto',
  /** Use a new scoped binding context for template-only composition. */
  Scoped = 'scoped',
}

/** Stable value list for source validation of `AuCompose.scopeBehavior`. */
export const AU_COMPOSE_SCOPE_BEHAVIORS = [
  AuComposeScopeBehavior.Auto,
  AuComposeScopeBehavior.Scoped,
] as const;

/** Return true when a string is accepted by `AuCompose.scopeBehavior`. */
export function isAuComposeScopeBehavior(value: string): value is AuComposeScopeBehavior {
  return (AU_COMPOSE_SCOPE_BEHAVIORS as readonly string[]).includes(value);
}

/** Static literal values accepted by `AuCompose.flushMode`. */
export enum AuComposeFlushMode {
  /** Perform composition immediately in the current change turn. */
  Sync = 'sync',
  /** Queue composition across async change batching. */
  Async = 'async',
}

/** Stable value list for source validation of `AuCompose.flushMode`. */
export const AU_COMPOSE_FLUSH_MODES = [
  AuComposeFlushMode.Sync,
  AuComposeFlushMode.Async,
] as const;

/** Return true when a string is accepted by `AuCompose.flushMode`. */
export function isAuComposeFlushMode(value: string): value is AuComposeFlushMode {
  return (AU_COMPOSE_FLUSH_MODES as readonly string[]).includes(value);
}

/** Authored source request for an `au-compose` element. */
export interface AuComposeElementSourceRequest {
  /** Optional component expression lowered as `component.bind`. */
  readonly componentExpression?: string | null;
  /** Optional template expression lowered as `template.bind`. */
  readonly templateExpression?: string | null;
  /** Optional model expression lowered as `model.bind`. */
  readonly modelExpression?: string | null;
  /** Optional static `scope-behavior` literal. */
  readonly scopeBehavior?: AuComposeScopeBehavior | `${AuComposeScopeBehavior}` | null;
  /** Optional static `tag` value for template-only composition. */
  readonly hostTagName?: string | null;
  /** Optional static `flush-mode` literal. */
  readonly flushMode?: AuComposeFlushMode | `${AuComposeFlushMode}` | null;
  /** Direct child text for fallback/authored content, if any. */
  readonly childText?: string | null;
  /** Structured child nodes under the composed element. */
  readonly children?: readonly AuthoredTemplateChildSource[];
}

/** Serialize an `au-compose` element from framework-owned bindable source facts. */
export function auComposeElementSourceText(
  request: AuComposeElementSourceRequest,
): string {
  return authoredTemplateElementSourceText(auComposeElementSource(request));
}

/** Create structured source for an `au-compose` element from framework-owned bindable source facts. */
export function auComposeElementSource(
  request: AuComposeElementSourceRequest,
): AuthoredTemplateElementSource {
  return authoredTemplateElementSource(
    AU_COMPOSE_RESOURCE_NAME,
    auComposeElementAttributes(request),
    request.childText ?? '',
    request.children ?? [],
  );
}

function auComposeElementAttributes(
  request: AuComposeElementSourceRequest,
): readonly AuthoredTemplateAttributeSource[] {
  return [
    optionalBindableExpressionAttribute(AuComposeBindableName.Component, request.componentExpression),
    optionalBindableExpressionAttribute(AuComposeBindableName.Template, request.templateExpression),
    optionalBindableExpressionAttribute(AuComposeBindableName.Model, request.modelExpression),
    optionalStaticBindableAttribute(AuComposeBindableName.ScopeBehavior, request.scopeBehavior),
    optionalStaticBindableAttribute(AuComposeBindableName.Tag, request.hostTagName),
    optionalStaticBindableAttribute(AuComposeBindableName.FlushMode, request.flushMode),
  ].filter((attribute): attribute is AuthoredTemplateAttributeSource => attribute != null);
}

function optionalBindableExpressionAttribute(
  bindableName: AuComposeBindableName,
  rawValue: string | null | undefined,
): AuthoredTemplateAttributeSource | null {
  if (rawValue == null || rawValue.length === 0) {
    return null;
  }
  return builtInBindingCommandAttributeSource({
    commandName: BuiltInBindingCommandName.Bind,
    targetName: builtInResourceBindableAttribute(AU_COMPOSE_TARGET_NAME, bindableName),
    rawValue,
  });
}

function optionalStaticBindableAttribute(
  bindableName: AuComposeBindableName,
  rawValue: string | null | undefined,
): AuthoredTemplateAttributeSource | null {
  if (rawValue == null || rawValue.length === 0) {
    return null;
  }
  return {
    rawName: builtInResourceBindableAttribute(AU_COMPOSE_TARGET_NAME, bindableName),
    rawValue,
  };
}
