import {
  type AuthoringSourcePatternAdaptationGroup,
  type AuthoringSourcePatternParameter,
  sourcePatternAdaptationGroup,
  sourcePatternParameter,
} from './source-plan.js';

export interface RoutedListDetailSourcePatternModel {
  readonly detailRouteParameterName: string;
  readonly listRoutePath: string;
}

/** Shared list/detail route identity slots for routed recipe and reference-instantiation source patterns. */
export function routedSourcePatternDetailRouteParameter(
  model: RoutedListDetailSourcePatternModel,
): AuthoringSourcePatternParameter {
  return sourcePatternParameter(
    'detail-route-parameter',
    'route-identity',
    'Detail route parameter',
    model.detailRouteParameterName,
    'Rename route path parameter, route-context access, and data-driven link construction together.',
    'source-text-input',
    'route-parameter-name',
  );
}

export function routedSourcePatternListRoutePath(
  model: RoutedListDetailSourcePatternModel,
): AuthoringSourcePatternParameter {
  return sourcePatternParameter(
    'list-route-path',
    'route-identity',
    'List route path',
    model.listRoutePath,
    'Rename the list route path together with root navigation links and generated detail navigation defaults.',
    'source-text-input',
    'route-path',
  );
}

export function routedSourcePatternIdentityGroup(): AuthoringSourcePatternAdaptationGroup {
  return sourcePatternAdaptationGroup(
    'route-identity',
    'Route identity',
    'List path, route title, and detail route parameter are source-applicable together because route config, route-context reads, and generated navigation links must stay aligned.',
    ['detail-route-parameter', 'list-route-path', 'list-route-title'],
  );
}
