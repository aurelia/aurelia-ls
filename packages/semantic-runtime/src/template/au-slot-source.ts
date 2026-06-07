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

/** Framework resource name for runtime-html `AuSlot`. */
export const AU_SLOT_RESOURCE_NAME = 'au-slot' as const;
/** Framework target class name for runtime-html `AuSlot`. */
export const AU_SLOT_TARGET_NAME = 'AuSlot' as const;

/** Static attributes consumed by runtime-html `AuSlot.processContent`. */
export enum AuSlotStaticAttributeName {
  /** Projection slot name read before ordinary bindable hydration. */
  Name = 'name',
}

/** Bindable property names owned by runtime-html `AuSlot`. */
export enum AuSlotBindableName {
  /** Object exposed as `$host` binding context to projected content. */
  Expose = 'expose',
  /** Callback invoked when projected slot content changes. */
  SlotChange = 'slotchange',
}

/** Authored source request for an `au-slot` element. */
export interface AuSlotElementSourceRequest {
  /** Optional static slot name. */
  readonly name?: string | null;
  /** Optional expression for the exposed projection context. */
  readonly exposeExpression?: string | null;
  /** Optional expression for the slotchange callback. */
  readonly slotChangeExpression?: string | null;
  /** Direct child text for fallback content, if any. */
  readonly childText?: string | null;
  /** Structured fallback child nodes under the slot. */
  readonly children?: readonly AuthoredTemplateChildSource[];
}

/** Serialize an `au-slot` element from framework-owned source facts. */
export function auSlotElementSourceText(
  request: AuSlotElementSourceRequest,
): string {
  return authoredTemplateElementSourceText(auSlotElementSource(request));
}

/** Create structured source for an `au-slot` element from framework-owned source facts. */
export function auSlotElementSource(
  request: AuSlotElementSourceRequest,
): AuthoredTemplateElementSource {
  return authoredTemplateElementSource(
    AU_SLOT_RESOURCE_NAME,
    auSlotElementAttributes(request),
    request.childText ?? '',
    request.children ?? [],
  );
}

function auSlotElementAttributes(
  request: AuSlotElementSourceRequest,
): readonly AuthoredTemplateAttributeSource[] {
  return [
    optionalStaticNameAttribute(request.name),
    optionalBindableExpressionAttribute(AuSlotBindableName.Expose, request.exposeExpression),
    optionalBindableExpressionAttribute(AuSlotBindableName.SlotChange, request.slotChangeExpression),
  ].filter((attribute): attribute is AuthoredTemplateAttributeSource => attribute != null);
}

function optionalStaticNameAttribute(
  rawValue: string | null | undefined,
): AuthoredTemplateAttributeSource | null {
  if (rawValue == null || rawValue.length === 0) {
    return null;
  }
  return {
    rawName: AuSlotStaticAttributeName.Name,
    rawValue,
  };
}

function optionalBindableExpressionAttribute(
  bindableName: AuSlotBindableName,
  rawValue: string | null | undefined,
): AuthoredTemplateAttributeSource | null {
  if (rawValue == null || rawValue.length === 0) {
    return null;
  }
  return builtInBindingCommandAttributeSource({
    commandName: BuiltInBindingCommandName.Bind,
    targetName: builtInResourceBindableAttribute(AU_SLOT_TARGET_NAME, bindableName),
    rawValue,
  });
}
