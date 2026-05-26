import {
  SourcePatternAdaptationGroup,
  SourcePatternAdaptationGroupKey,
  SourcePatternParameter,
  SourcePatternParameterApplicationPolicy,
  SourcePatternParameterKey,
  SourcePatternParameterKind,
  SourcePatternParameterValueShape,
} from './source-plan.js';

export interface RoutedListDetailSourcePatternModel {
  readonly detailRouteParameterName: string;
  readonly listRoutePath: string;
}

/** Shared list/detail route identity slots for routed app-builder and reference-instantiation source patterns. */
export function routedSourcePatternDetailRouteParameter(
  model: RoutedListDetailSourcePatternModel,
): SourcePatternParameter {
  return new SourcePatternParameter(
    SourcePatternParameterKey.DetailRouteParameter,
    SourcePatternParameterKind.RouteIdentity,
    SourcePatternParameterApplicationPolicy.SourceTextInput,
    SourcePatternParameterValueShape.RouteParameterName,
    'Detail route parameter',
    model.detailRouteParameterName,
    'Rename route path parameter, route-context access, and data-driven link construction together.',
  );
}

export function routedSourcePatternListRoutePath(
  model: RoutedListDetailSourcePatternModel,
): SourcePatternParameter {
  return new SourcePatternParameter(
    SourcePatternParameterKey.ListRoutePath,
    SourcePatternParameterKind.RouteIdentity,
    SourcePatternParameterApplicationPolicy.SourceTextInput,
    SourcePatternParameterValueShape.RoutePath,
    'List route path',
    model.listRoutePath,
    'Rename the list route path together with root navigation links and generated detail navigation defaults.',
  );
}

export function routedSourcePatternIdentityGroup(): SourcePatternAdaptationGroup {
  return new SourcePatternAdaptationGroup(
    SourcePatternAdaptationGroupKey.RouteIdentity,
    'Route identity',
    'List path and detail route parameter are source-applicable together because route config, route-context reads, and generated navigation links must stay aligned.',
    [SourcePatternParameterKey.DetailRouteParameter, SourcePatternParameterKey.ListRoutePath],
  );
}
