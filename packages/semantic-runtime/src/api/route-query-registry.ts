import type { AureliaAppWorldProjectEmission } from '../configuration/app-world-project-pass.js';
import { ExpectedSemanticEffectRouteProductKind } from '../fixture-verification/effect-observation.js';
import type { KernelStore } from '../kernel/store.js';
import { SemanticAppQueryKind } from './contracts.js';
import type {
  SemanticComponentAgentsResult,
  SemanticRecognizedRoutesResult,
  SemanticRouterOptionsResult,
  SemanticRouteConfigsResult,
  SemanticRouteContextsResult,
  SemanticRouteContextParameterReadsResult,
  SemanticRouteEndpointsResult,
  SemanticRouteNodesResult,
  SemanticRoutePatternsResult,
  SemanticRouteRecognizerIssuesResult,
  SemanticRouteRecognizerStatesResult,
  SemanticRouterIssuesResult,
  SemanticRouteTreesResult,
  SemanticRouterViewportsResult,
  SemanticTypedNavigationInstructionsResult,
  SemanticViewportAgentsResult,
  SemanticViewportInstructionsResult,
  SemanticViewportInstructionTreesResult,
} from './contracts.js';
import {
  readComponentAgentRows,
  readRecognizedRouteRows,
  readRouteConfigRows,
  readRouteContextRows,
  readRouteContextParameterReadRows,
  readRouteEndpointRows,
  readRouteNodeRows,
  readRoutePatternRows,
  readRouteRecognizerIssueRows,
  readRouteRecognizerStateRows,
  readRouterIssueRows,
  readRouterOptionsRows,
  readRouterViewportRows,
  readRouteTreeRows,
  readTypedNavigationInstructionRows,
  readViewportAgentRows,
  readViewportInstructionRows,
  readViewportInstructionTreeRows,
} from './route-projections.js';

export interface SemanticRouteQueryRowsResult {
  readonly rows: readonly object[];
}

export interface SemanticRouteEffectQueryKind {
  readonly queryKind: SemanticAppQueryKind;
  readonly routeProductKind: ExpectedSemanticEffectRouteProductKind;
}

export interface SemanticRouteQueryDescriptor<
  TResult extends SemanticRouteQueryRowsResult = SemanticRouteQueryRowsResult,
> extends SemanticRouteEffectQueryKind {
  readonly answerRowLabel: string;
  readonly readRows: (
    emission: AureliaAppWorldProjectEmission,
    store: KernelStore,
    handles: boolean,
  ) => TResult['rows'];
}

export const routerOptionsRouteQuery = {
  queryKind: SemanticAppQueryKind.RouterOptions,
  routeProductKind: ExpectedSemanticEffectRouteProductKind.RouterOptions,
  answerRowLabel: 'router options row(s)',
  readRows: readRouterOptionsRows,
} satisfies SemanticRouteQueryDescriptor<SemanticRouterOptionsResult>;

export const routeConfigsRouteQuery = {
  queryKind: SemanticAppQueryKind.Routes,
  routeProductKind: ExpectedSemanticEffectRouteProductKind.RouteConfig,
  answerRowLabel: 'source-backed router route config row(s)',
  readRows: readRouteConfigRows,
} satisfies SemanticRouteQueryDescriptor<SemanticRouteConfigsResult>;

export const routeContextsRouteQuery = {
  queryKind: SemanticAppQueryKind.RouteContexts,
  routeProductKind: ExpectedSemanticEffectRouteProductKind.RouteContext,
  answerRowLabel: 'runtime RouteContext row(s)',
  readRows: readRouteContextRows,
} satisfies SemanticRouteQueryDescriptor<SemanticRouteContextsResult>;

export const routeContextParameterReadsRouteQuery = {
  queryKind: SemanticAppQueryKind.RouteContextParameterReads,
  routeProductKind: ExpectedSemanticEffectRouteProductKind.RouteContextParameterRead,
  answerRowLabel: 'RouteContext.getRouteParameters(...) read row(s)',
  readRows: readRouteContextParameterReadRows,
} satisfies SemanticRouteQueryDescriptor<SemanticRouteContextParameterReadsResult>;

export const routePatternsRouteQuery = {
  queryKind: SemanticAppQueryKind.RoutePatterns,
  routeProductKind: ExpectedSemanticEffectRouteProductKind.RoutePattern,
  answerRowLabel: 'route-recognizer configurable route pattern row(s)',
  readRows: readRoutePatternRows,
} satisfies SemanticRouteQueryDescriptor<SemanticRoutePatternsResult>;

export const routeEndpointsRouteQuery = {
  queryKind: SemanticAppQueryKind.RouteEndpoints,
  routeProductKind: ExpectedSemanticEffectRouteProductKind.RouteEndpoint,
  answerRowLabel: 'route-recognizer endpoint row(s)',
  readRows: readRouteEndpointRows,
} satisfies SemanticRouteQueryDescriptor<SemanticRouteEndpointsResult>;

export const routeRecognizerStatesRouteQuery = {
  queryKind: SemanticAppQueryKind.RouteRecognizerStates,
  routeProductKind: ExpectedSemanticEffectRouteProductKind.RouteRecognizerState,
  answerRowLabel: 'route-recognizer State row(s)',
  readRows: readRouteRecognizerStateRows,
} satisfies SemanticRouteQueryDescriptor<SemanticRouteRecognizerStatesResult>;

export const routeRecognizerIssuesRouteQuery = {
  queryKind: SemanticAppQueryKind.RouteRecognizerIssues,
  routeProductKind: ExpectedSemanticEffectRouteProductKind.RouteRecognizerIssue,
  answerRowLabel: 'route-recognizer issue row(s)',
  readRows: readRouteRecognizerIssueRows,
} satisfies SemanticRouteQueryDescriptor<SemanticRouteRecognizerIssuesResult>;

export const routerIssuesRouteQuery = {
  queryKind: SemanticAppQueryKind.RouterIssues,
  routeProductKind: ExpectedSemanticEffectRouteProductKind.RouterIssue,
  answerRowLabel: 'router issue row(s)',
  readRows: readRouterIssueRows,
} satisfies SemanticRouteQueryDescriptor<SemanticRouterIssuesResult>;

export const recognizedRoutesRouteQuery = {
  queryKind: SemanticAppQueryKind.RecognizedRoutes,
  routeProductKind: ExpectedSemanticEffectRouteProductKind.RecognizedRoute,
  answerRowLabel: 'route-recognizer RecognizedRoute row(s)',
  readRows: readRecognizedRouteRows,
} satisfies SemanticRouteQueryDescriptor<SemanticRecognizedRoutesResult>;

export const typedNavigationInstructionsRouteQuery = {
  queryKind: SemanticAppQueryKind.TypedNavigationInstructions,
  routeProductKind: ExpectedSemanticEffectRouteProductKind.TypedNavigationInstruction,
  answerRowLabel: 'TypedNavigationInstruction row(s)',
  readRows: readTypedNavigationInstructionRows,
} satisfies SemanticRouteQueryDescriptor<SemanticTypedNavigationInstructionsResult>;

export const viewportInstructionsRouteQuery = {
  queryKind: SemanticAppQueryKind.ViewportInstructions,
  routeProductKind: ExpectedSemanticEffectRouteProductKind.ViewportInstruction,
  answerRowLabel: 'ViewportInstruction row(s)',
  readRows: readViewportInstructionRows,
} satisfies SemanticRouteQueryDescriptor<SemanticViewportInstructionsResult>;

export const viewportInstructionTreesRouteQuery = {
  queryKind: SemanticAppQueryKind.ViewportInstructionTrees,
  routeProductKind: ExpectedSemanticEffectRouteProductKind.ViewportInstructionTree,
  answerRowLabel: 'ViewportInstructionTree row(s)',
  readRows: readViewportInstructionTreeRows,
} satisfies SemanticRouteQueryDescriptor<SemanticViewportInstructionTreesResult>;

export const routeTreesRouteQuery = {
  queryKind: SemanticAppQueryKind.RouteTrees,
  routeProductKind: ExpectedSemanticEffectRouteProductKind.RouteTree,
  answerRowLabel: 'RouteTree row(s)',
  readRows: readRouteTreeRows,
} satisfies SemanticRouteQueryDescriptor<SemanticRouteTreesResult>;

export const routeNodesRouteQuery = {
  queryKind: SemanticAppQueryKind.RouteNodes,
  routeProductKind: ExpectedSemanticEffectRouteProductKind.RouteNode,
  answerRowLabel: 'RouteNode row(s)',
  readRows: readRouteNodeRows,
} satisfies SemanticRouteQueryDescriptor<SemanticRouteNodesResult>;

export const routerViewportsRouteQuery = {
  queryKind: SemanticAppQueryKind.RouterViewports,
  routeProductKind: ExpectedSemanticEffectRouteProductKind.RouterViewport,
  answerRowLabel: 'router viewport row(s)',
  readRows: readRouterViewportRows,
} satisfies SemanticRouteQueryDescriptor<SemanticRouterViewportsResult>;

export const viewportAgentsRouteQuery = {
  queryKind: SemanticAppQueryKind.ViewportAgents,
  routeProductKind: ExpectedSemanticEffectRouteProductKind.ViewportAgent,
  answerRowLabel: 'ViewportAgent row(s)',
  readRows: readViewportAgentRows,
} satisfies SemanticRouteQueryDescriptor<SemanticViewportAgentsResult>;

export const componentAgentsRouteQuery = {
  queryKind: SemanticAppQueryKind.ComponentAgents,
  routeProductKind: ExpectedSemanticEffectRouteProductKind.ComponentAgent,
  answerRowLabel: 'ComponentAgent handoff row(s)',
  readRows: readComponentAgentRows,
} satisfies SemanticRouteQueryDescriptor<SemanticComponentAgentsResult>;

export const semanticRouteQueryDescriptors = [
  routerOptionsRouteQuery,
  routeConfigsRouteQuery,
  routeContextsRouteQuery,
  routeContextParameterReadsRouteQuery,
  routePatternsRouteQuery,
  routeEndpointsRouteQuery,
  routeRecognizerStatesRouteQuery,
  routeRecognizerIssuesRouteQuery,
  routerIssuesRouteQuery,
  recognizedRoutesRouteQuery,
  typedNavigationInstructionsRouteQuery,
  viewportInstructionsRouteQuery,
  viewportInstructionTreesRouteQuery,
  routeTreesRouteQuery,
  routeNodesRouteQuery,
  routerViewportsRouteQuery,
  viewportAgentsRouteQuery,
  componentAgentsRouteQuery,
] as const satisfies readonly SemanticRouteQueryDescriptor[];

const routeQueryDescriptorByKind = new Map<
  SemanticAppQueryKind | `${SemanticAppQueryKind}`,
  SemanticRouteQueryDescriptor
>(
  semanticRouteQueryDescriptors.map((descriptor) => [descriptor.queryKind, descriptor]),
);

export function semanticRouteQueryDescriptorFor(
  queryKind: SemanticAppQueryKind | `${SemanticAppQueryKind}`,
): SemanticRouteQueryDescriptor | null {
  return routeQueryDescriptorByKind.get(queryKind) ?? null;
}
