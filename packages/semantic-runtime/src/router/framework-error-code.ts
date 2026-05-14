import { frameworkErrorCode } from '../kernel/framework-error-code.js';

/** Aurelia router error-code labels that router semantic products can cite exactly. */
export const RouterFrameworkErrorCode = {
  /** `router Events.rtNoComponent`; a string routeable component could not resolve to a custom element definition in its RouteConfigContext. */
  RouteableComponentNotFound: frameworkErrorCode(
    'router',
    'Events',
    'rtNoComponent',
    'AUR3552',
  ),
  /** `router Events.rtInvalidConfigProperty`; router config validation rejected a property value. */
  InvalidRouteConfigProperty: frameworkErrorCode(
    'router',
    'Events',
    'rtInvalidConfigProperty',
    'AUR3554',
  ),
  /** `router Events.rtInvalidConfig`; router config validation received a nullish config object. */
  InvalidRouteConfig: frameworkErrorCode(
    'router',
    'Events',
    'rtInvalidConfig',
    'AUR3555',
  ),
  /** `router Events.rtUnknownConfigProperty`; route config validation rejected an unknown property. */
  UnknownRouteConfigProperty: frameworkErrorCode(
    'router',
    'Events',
    'rtUnknownConfigProperty',
    'AUR3556',
  ),
  /** `router Events.rtUnknownRedirectConfigProperty`; redirect route config validation rejected an unknown property. */
  UnknownRedirectRouteConfigProperty: frameworkErrorCode(
    'router',
    'Events',
    'rtUnknownRedirectConfigProperty',
    'AUR3557',
  ),
  /** `router Events.rcEagerPathGenerationFailed`; RouteConfigContext could not eagerly generate a path for an instruction. */
  EagerPathGenerationFailed: frameworkErrorCode(
    'router',
    'Events',
    'rcEagerPathGenerationFailed',
    'AUR3166',
  ),
  /** `router Events.rcNoPathLazyImport`; RouteConfigContext needs a path before a lazy child component resolves. */
  ChildRouteLazyImportMissingPath: frameworkErrorCode(
    'router',
    'Events',
    'rcNoPathLazyImport',
    'AUR3173',
  ),
  /** `router Events.rcNoAvailableVpa`; RouteContext could not resolve a matching available ViewportAgent. */
  NoAvailableViewportAgent: frameworkErrorCode(
    'router',
    'Events',
    'rcNoAvailableVpa',
    'AUR3174',
  ),
  /** `router Events.rcInvalidLazyImport`; RouteContext._resolveLazy could not derive a custom element from an import. */
  InvalidLazyImport: frameworkErrorCode(
    'router',
    'Events',
    'rcInvalidLazyImport',
    'AUR3175',
  ),
  /** `router Events.instrInvalid`; TypedNavigationInstruction.create rejected an instruction value. */
  InstructionInvalid: frameworkErrorCode(
    'router',
    'Events',
    'instrInvalid',
    'AUR3400',
  ),
  /** `router Events.instrNoFallback`; an unknown route string has no configured fallback. */
  InstructionNoFallback: frameworkErrorCode(
    'router',
    'Events',
    'instrNoFallback',
    'AUR3401',
  ),
  /** `router Events.instrUnknownRedirect`; a redirect target does not match a configured route. */
  InstructionUnknownRedirect: frameworkErrorCode(
    'router',
    'Events',
    'instrUnknownRedirect',
    'AUR3402',
  ),
  /** `router Events.exprUnexpectedSegment`; RouteExpression parser expected another segment token. */
  RouteExpressionUnexpectedSegment: frameworkErrorCode(
    'router',
    'Events',
    'exprUnexpectedSegment',
    'AUR3500',
  ),
  /** `router Events.exprNotDone`; RouteExpression parser had trailing input after parsing a route. */
  RouteExpressionNotDone: frameworkErrorCode(
    'router',
    'Events',
    'exprNotDone',
    'AUR3501',
  ),
  /** `router Events.exprUnexpectedKind`; RouteTree redirect migration saw a non-segment RouteExpression node. */
  UnexpectedRouteExpressionKind: frameworkErrorCode(
    'router',
    'Events',
    'exprUnexpectedKind',
    'AUR3502',
  ),
} as const;

export type RouterFrameworkErrorCode =
  typeof RouterFrameworkErrorCode[keyof typeof RouterFrameworkErrorCode];
