import { builtInResourceBindableAttribute } from '../resources/built-in-resource-bindables.js';
import { authoredTemplateAttributeText, type AuthoredTemplateAttributeSource } from './authored-template-source.js';
import {
  inlineMultiBindingValueSourceText,
  type InlineMultiBindingSourceSegment,
} from './multi-binding-segments.js';
import { BuiltInTemplateControllerName } from './template-controller-semantics.js';

/** Framework resource name for runtime-html `Portal`. */
export const PORTAL_RESOURCE_NAME = BuiltInTemplateControllerName.Portal;
/** Framework target class name for runtime-html `Portal`. */
export const PORTAL_TARGET_NAME = 'Portal' as const;

/** Bindable property names owned by runtime-html `Portal`. */
export enum PortalBindableName {
  /** Target selector or element value where the view should be rendered. */
  Target = 'target',
  /** DOM insertion position relative to the resolved target. */
  Position = 'position',
  /** Callback invoked after the portal view activates. */
  Activated = 'activated',
  /** Callback invoked before the portal view activates. */
  Activating = 'activating',
  /** Callback `this` context for portal lifecycle callbacks. */
  CallbackContext = 'callbackContext',
  /** Query context used when resolving a string target. */
  RenderContext = 'renderContext',
  /** Whether missing/empty target resolution should surface framework errors. */
  Strict = 'strict',
  /** Callback invoked after the portal view deactivates. */
  Deactivated = 'deactivated',
  /** Callback invoked before the portal view deactivates. */
  Deactivating = 'deactivating',
}

/** Static literal values accepted by portal DOM insertion. */
export enum PortalInsertPosition {
  /** Insert as the last child of the target. */
  BeforeEnd = 'beforeend',
  /** Insert as the first child of the target. */
  AfterBegin = 'afterbegin',
  /** Insert immediately before the target itself. */
  BeforeBegin = 'beforebegin',
  /** Insert immediately after the target itself. */
  AfterEnd = 'afterend',
}

/** Stable value list for source validation of portal insertion positions. */
export const PORTAL_INSERT_POSITIONS = [
  PortalInsertPosition.BeforeEnd,
  PortalInsertPosition.AfterBegin,
  PortalInsertPosition.BeforeBegin,
  PortalInsertPosition.AfterEnd,
] as const;

/** Return true when a string is accepted by portal DOM insertion. */
export function isPortalInsertPosition(value: string): value is PortalInsertPosition {
  return (PORTAL_INSERT_POSITIONS as readonly string[]).includes(value);
}

/** Authored source request for the runtime-html `portal` template controller. */
export interface PortalAttributeSourceRequest {
  /** Optional target selector or target expression text. */
  readonly target?: string | null;
  /** Optional insertion position literal. */
  readonly position?: PortalInsertPosition | `${PortalInsertPosition}` | null;
  /** Optional render-context selector or expression text. */
  readonly renderContext?: string | null;
  /** Optional static strict flag literal. */
  readonly strict?: boolean | null;
}

/** Serialize a `portal` template-controller attribute from framework-owned bindable source facts. */
export function portalAttributeSource(
  request: PortalAttributeSourceRequest,
): AuthoredTemplateAttributeSource {
  const segments = portalAttributeSourceSegments(request);
  if (segments.length === 0) {
    return {
      rawName: PORTAL_RESOURCE_NAME,
    };
  }
  if (segments.length === 1 && segments[0]!.rawName === PortalBindableName.Target) {
    return {
      rawName: PORTAL_RESOURCE_NAME,
      rawValue: segments[0]!.rawValue,
    };
  }
  return {
    rawName: PORTAL_RESOURCE_NAME,
    rawValue: inlineMultiBindingValueSourceText(segments),
  };
}

/** Serialize a `portal` template-controller attribute from framework-owned bindable source facts. */
export function portalAttributeSourceText(
  request: PortalAttributeSourceRequest,
): string {
  return authoredTemplateAttributeText(portalAttributeSource(request));
}

function portalAttributeSourceSegments(
  request: PortalAttributeSourceRequest,
): readonly InlineMultiBindingSourceSegment[] {
  return [
    optionalPortalSegment(PortalBindableName.Target, request.target),
    optionalPortalSegment(PortalBindableName.Position, request.position),
    optionalPortalSegment(PortalBindableName.RenderContext, request.renderContext),
    request.strict == null
      ? null
      : {
          rawName: builtInResourceBindableAttribute(PORTAL_TARGET_NAME, PortalBindableName.Strict),
          rawValue: request.strict ? 'true' : 'false',
        },
  ].filter((segment): segment is InlineMultiBindingSourceSegment => segment != null);
}

function optionalPortalSegment(
  bindableName: PortalBindableName,
  rawValue: string | null | undefined,
): InlineMultiBindingSourceSegment | null {
  if (rawValue == null || rawValue.length === 0) {
    return null;
  }
  return {
    rawName: builtInResourceBindableAttribute(PORTAL_TARGET_NAME, bindableName),
    rawValue,
  };
}
