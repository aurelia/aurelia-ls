import { builtInResourceBindableAttribute } from '../resources/built-in-resource-bindables.js';
import {
  authoredTemplateElementSource,
  authoredTemplateElementSourceText,
  type AuthoredTemplateAttributeSource,
  type AuthoredTemplateChildSource,
  type AuthoredTemplateElementSource,
} from '../template/authored-template-source.js';

/** Framework resource name for router `ViewportCustomElement`. */
export const ROUTER_VIEWPORT_RESOURCE_NAME = 'au-viewport' as const;
/** Framework target class name for router `ViewportCustomElement`. */
export const ROUTER_VIEWPORT_TARGET_NAME = 'ViewportCustomElement' as const;

/** Bindable property names owned by router `ViewportCustomElement`. */
export enum RouterViewportBindableName {
  /** Router viewport name used by route instructions and route-tree resolution. */
  Name = 'name',
  /** Routeable component filter accepted by the viewport. */
  UsedBy = 'usedBy',
  /** Default route/instruction used when the viewport activates without an instruction. */
  Default = 'default',
  /** Fallback route/component used when route resolution cannot match. */
  Fallback = 'fallback',
}

/** Authored source request for the router `au-viewport` custom element. */
export interface RouterViewportElementSourceRequest {
  /** Optional static viewport name. */
  readonly name?: string | null;
  /** Optional static routeable component filter. */
  readonly usedBy?: string | null;
  /** Optional static default route/instruction. */
  readonly defaultRoute?: string | null;
  /** Optional static fallback route/component. */
  readonly fallback?: string | null;
  /** Direct child text for authored fallback content, if any. */
  readonly childText?: string | null;
  /** Structured child nodes under the viewport element. */
  readonly children?: readonly AuthoredTemplateChildSource[];
}

/** Serialize the router `au-viewport` custom element. */
export function routerViewportElementSourceText(
  request: RouterViewportElementSourceRequest,
): string {
  return authoredTemplateElementSourceText(routerViewportElementSource(request));
}

/** Create structured source for the router `au-viewport` custom element. */
export function routerViewportElementSource(
  request: RouterViewportElementSourceRequest,
): AuthoredTemplateElementSource {
  return authoredTemplateElementSource(
    ROUTER_VIEWPORT_RESOURCE_NAME,
    routerViewportElementAttributes(request),
    request.childText ?? '',
    request.children ?? [],
  );
}

function routerViewportElementAttributes(
  request: RouterViewportElementSourceRequest,
): readonly AuthoredTemplateAttributeSource[] {
  return [
    optionalStaticBindableAttribute(RouterViewportBindableName.Name, request.name),
    optionalStaticBindableAttribute(RouterViewportBindableName.UsedBy, request.usedBy),
    optionalStaticBindableAttribute(RouterViewportBindableName.Default, request.defaultRoute),
    optionalStaticBindableAttribute(RouterViewportBindableName.Fallback, request.fallback),
  ].filter((attribute): attribute is AuthoredTemplateAttributeSource => attribute != null);
}

function optionalStaticBindableAttribute(
  bindableName: RouterViewportBindableName,
  rawValue: string | null | undefined,
): AuthoredTemplateAttributeSource | null {
  if (rawValue == null || rawValue.length === 0) {
    return null;
  }
  return {
    rawName: builtInResourceBindableAttribute(ROUTER_VIEWPORT_TARGET_NAME, bindableName),
    rawValue,
  };
}
