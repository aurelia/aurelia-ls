import {
  inlineMultiBindingValueSourceText,
  type InlineMultiBindingSourceSegment,
} from '../template/multi-binding-segments.js';
import { authoredTemplateAttributeText, type AuthoredTemplateAttributeSource } from '../template/authored-template-source.js';

/** Router custom attributes that lower authored navigation instructions. */
export enum RouterInstructionResourceName {
  /** Router `load` custom attribute. */
  Load = 'load',
  /** Router `href` custom attribute. */
  Href = 'href',
}

/** Bindable segment names owned by router `load`. */
export enum RouterLoadAttributeSegmentName {
  /** Primary navigation instruction segment. */
  Route = 'route',
  /** Parameter object segment. */
  Params = 'params',
  /** Context override segment. */
  Context = 'context',
  /** From-view active-state segment. */
  Active = 'active',
  /** Target attribute name segment. */
  Attribute = 'attribute',
}

/** Authored source request for the router `load` custom attribute. */
export interface RouterLoadAttributeSourceRequest {
  /** Navigation instruction or route expression value. */
  readonly route: string;
  /** Optional params expression lowered as `params.bind`. */
  readonly paramsExpression?: string;
  /** Optional context expression lowered as `context.bind`. */
  readonly contextExpression?: string;
  /** Optional active-state expression lowered as `active.bind`. */
  readonly activeExpression?: string;
  /** Optional target attribute name lowered as static `attribute`. */
  readonly targetAttributeName?: string;
}

/** Authored source request for the router `href` custom attribute. */
export interface RouterHrefAttributeSourceRequest {
  /** Navigation instruction, external URL, or route expression value. */
  readonly value: string;
}

/** Serialize the router `load` custom attribute, using inline multi-binding only when needed. */
export function routerLoadAttributeSource(
  request: RouterLoadAttributeSourceRequest,
): AuthoredTemplateAttributeSource {
  const segments = routerLoadAttributeSourceSegments(request);
  const value = segments.length === 1
    && segments[0]!.rawName === RouterLoadAttributeSegmentName.Route
    ? request.route
    : inlineMultiBindingValueSourceText(segments);
  return {
    rawName: RouterInstructionResourceName.Load,
    rawValue: value,
  };
}

/** Serialize the router `load` custom attribute, using inline multi-binding only when needed. */
export function routerLoadAttributeSourceText(
  request: RouterLoadAttributeSourceRequest,
): string {
  return authoredTemplateAttributeText(routerLoadAttributeSource(request));
}

/** Serialize the router `href` custom attribute. */
export function routerHrefAttributeSource(
  request: RouterHrefAttributeSourceRequest,
): AuthoredTemplateAttributeSource {
  return {
    rawName: RouterInstructionResourceName.Href,
    rawValue: request.value,
  };
}

/** Serialize the router `href` custom attribute. */
export function routerHrefAttributeSourceText(
  request: RouterHrefAttributeSourceRequest,
): string {
  return authoredTemplateAttributeText(routerHrefAttributeSource(request));
}

function routerLoadAttributeSourceSegments(
  request: RouterLoadAttributeSourceRequest,
): readonly InlineMultiBindingSourceSegment[] {
  const segments: InlineMultiBindingSourceSegment[] = [
    {
      rawName: RouterLoadAttributeSegmentName.Route,
      rawValue: request.route,
    },
  ];
  pushOptionalCommandedSegment(segments, RouterLoadAttributeSegmentName.Params, request.paramsExpression);
  pushOptionalCommandedSegment(segments, RouterLoadAttributeSegmentName.Context, request.contextExpression);
  pushOptionalCommandedSegment(segments, RouterLoadAttributeSegmentName.Active, request.activeExpression);
  if (request.targetAttributeName != null && request.targetAttributeName.length > 0) {
    segments.push({
      rawName: RouterLoadAttributeSegmentName.Attribute,
      rawValue: request.targetAttributeName,
    });
  }
  return segments;
}

function pushOptionalCommandedSegment(
  segments: InlineMultiBindingSourceSegment[],
  name: RouterLoadAttributeSegmentName,
  rawValue: string | undefined,
): void {
  if (rawValue == null || rawValue.length === 0) {
    return;
  }
  segments.push({
    rawName: `${name}.bind`,
    rawValue,
  });
}
