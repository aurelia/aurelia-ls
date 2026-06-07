import {
  ExpectedSemanticEffect,
  ExpectedSemanticEffectCardinality,
  ExpectedSemanticEffectFilter,
  ExpectedSemanticEffectKind,
  ExpectedSemanticEffectScope,
  ExpectedSemanticEffectTopologyNodeKind,
  type ExpectedSemanticEffectFilterValue,
} from '../fixture-verification/expected-effect.js';
import { ExpectedSemanticEffectRouteProductKind } from '../fixture-verification/effect-observation.js';
import {
  routeConfigObjectLiteralEffect,
  routeConfigViewportEffect,
  routeContextParameterReadEffect,
  routeEndpointParameterEffect,
  routePatternParameterEffect,
  routeProductSignatureEffect,
  routerViewportNameEffect,
} from '../fixture-verification/route-expected-effects.js';
import {
  SourcePatternParameterKey,
  sourcePatternParameterSourceValue,
  type SourcePlan,
  SourcePlanFileRole,
} from '../source-plan/source-plan.js';

/** Baseline project tooling expectations shared by runnable app-builder SourcePlans. */
export function appBuilderProjectToolingExpectedEffects(
  appDescription: string,
): readonly ExpectedSemanticEffect[] {
  return [
    ExpectedSemanticEffect.fact(
      `${appDescription} has package manifest tooling.`,
      ExpectedSemanticEffectKind.ProjectTooling,
      ExpectedSemanticEffectScope.Project,
      ExpectedSemanticEffectTopologyNodeKind.PackageManifest,
      ExpectedSemanticEffectCardinality.Present,
      null,
      effectFilters(['role', 'package-manifest']),
    ),
    ExpectedSemanticEffect.fact(
      `${appDescription} has TypeScript project tooling.`,
      ExpectedSemanticEffectKind.ProjectTooling,
      ExpectedSemanticEffectScope.Project,
      ExpectedSemanticEffectTopologyNodeKind.BuildTool,
      ExpectedSemanticEffectCardinality.Present,
      null,
      effectFilters(['role', 'tooling-config']),
    ),
    ExpectedSemanticEffect.fact(
      `${appDescription} has local asset module declarations.`,
      ExpectedSemanticEffectKind.ProjectTooling,
      ExpectedSemanticEffectScope.Project,
      ExpectedSemanticEffectTopologyNodeKind.BuildTool,
      ExpectedSemanticEffectCardinality.Present,
      null,
      effectFilters(['role', 'declaration']),
    ),
  ];
}

/** Expected effects for the minimal runnable app-shell SourcePlan. */
export function appBuilderMinimalAppShellExpectedEffects(): readonly ExpectedSemanticEffect[] {
  return [
    ...appBuilderProjectToolingExpectedEffects('App-builder minimal app shell SourcePlan'),
    ExpectedSemanticEffect.fact(
      'Minimal app shell SourcePlan should reopen as an Aurelia app.',
      ExpectedSemanticEffectKind.ProjectShape,
    ),
    ExpectedSemanticEffect.fact(
      'Minimal app shell SourcePlan should expose a resource definition.',
      ExpectedSemanticEffectKind.ResourceDefinition,
    ),
    ExpectedSemanticEffect.fact(
      'Minimal app shell SourcePlan should compile its root template.',
      ExpectedSemanticEffectKind.TemplateCompilation,
      ExpectedSemanticEffectScope.Template,
      ExpectedSemanticEffectTopologyNodeKind.Template,
    ),
    ExpectedSemanticEffect.fact(
      'Minimal app shell SourcePlan should hydrate its root component.',
      ExpectedSemanticEffectKind.RuntimeController,
      ExpectedSemanticEffectScope.Template,
      ExpectedSemanticEffectTopologyNodeKind.Component,
    ),
    ExpectedSemanticEffect.absent(
      'Minimal app shell SourcePlan should have no open semantic seams.',
      ExpectedSemanticEffectKind.OpenSeamClosure,
    ),
  ];
}

export interface AppBuilderComponentPairAppShellExpectedEffectsOptions {
  readonly includesServiceCollection?: boolean;
  readonly domainBackedReadinessStates?: readonly AppBuilderDomainBackedReadinessExpectedEffectsOptions[];
}

export interface AppBuilderDomainBackedReadinessExpectedEffectsOptions {
  readonly className: string;
  readonly receiverMemberName: string;
  readonly readinessMemberName: string;
  readonly requiredFieldNames: readonly string[];
}

/** Expected effects for a runnable app-shell assembled from component-pair fragments. */
export function appBuilderComponentPairAppShellExpectedEffects(
  options: AppBuilderComponentPairAppShellExpectedEffectsOptions = {},
): readonly ExpectedSemanticEffect[] {
  return [
    ...appBuilderProjectToolingExpectedEffects('App-builder component-pair app shell SourcePlan'),
    ExpectedSemanticEffect.fact(
      'Component-pair app shell SourcePlan should reopen as an Aurelia app.',
      ExpectedSemanticEffectKind.ProjectShape,
    ),
    ExpectedSemanticEffect.fact(
      'Component-pair app shell SourcePlan should expose its root resource definition.',
      ExpectedSemanticEffectKind.ResourceDefinition,
    ),
    ExpectedSemanticEffect.fact(
      'Component-pair app shell SourcePlan should compile its root template.',
      ExpectedSemanticEffectKind.TemplateCompilation,
      ExpectedSemanticEffectScope.Template,
      ExpectedSemanticEffectTopologyNodeKind.Template,
    ),
    ExpectedSemanticEffect.fact(
      'Component-pair app shell SourcePlan should hydrate its root component.',
      ExpectedSemanticEffectKind.RuntimeController,
      ExpectedSemanticEffectScope.Template,
      ExpectedSemanticEffectTopologyNodeKind.Component,
    ),
    ExpectedSemanticEffect.absent(
      'Component-pair app shell SourcePlan should have no open semantic seams.',
      ExpectedSemanticEffectKind.OpenSeamClosure,
    ),
    ...(options.includesServiceCollection === true
      ? serviceBoundaryExpectedEffects('Component-pair service collection SourcePlan', { includeTemplateBinding: true })
      : []),
    ...(options.domainBackedReadinessStates ?? []).flatMap(domainBackedReadinessExpectedEffects),
  ];
}

function domainBackedReadinessExpectedEffects(
  options: AppBuilderDomainBackedReadinessExpectedEffectsOptions,
): readonly ExpectedSemanticEffect[] {
  const readinessExpression = `${options.receiverMemberName}.${options.readinessMemberName}`;
  return [
    ExpectedSemanticEffect.signatureFact(
      'Domain-backed submit form SourcePlan should expose a getter-backed readiness observer.',
      ExpectedSemanticEffectKind.ComputedObserverSource,
      ExpectedSemanticEffectScope.App,
      ExpectedSemanticEffectTopologyNodeKind.DomainModel,
      ExpectedSemanticEffectCardinality.Present,
      null,
      effectFilters(
        ['className', options.className],
        ['memberName', options.readinessMemberName],
        ['dependencyMode', 'proxy-auto-track'],
      ),
    ),
    ...options.requiredFieldNames.map((fieldName) => ExpectedSemanticEffect.signatureFact(
      `Domain-backed submit form SourcePlan should track '${fieldName}' as a readiness dependency.`,
      ExpectedSemanticEffectKind.ComputedObserverObservedDependency,
      ExpectedSemanticEffectScope.App,
      ExpectedSemanticEffectTopologyNodeKind.DomainModel,
      ExpectedSemanticEffectCardinality.Present,
      null,
      effectFilters(
        ['className', options.className],
        ['memberName', options.readinessMemberName],
        ['dependencyMemberName', fieldName],
      ),
    )),
    ExpectedSemanticEffect.signatureFact(
      'Domain-backed submit form SourcePlan should bind submit availability to the readiness getter.',
      ExpectedSemanticEffectKind.BindingObservedDependency,
      ExpectedSemanticEffectScope.Template,
      ExpectedSemanticEffectTopologyNodeKind.TemplateBinding,
      ExpectedSemanticEffectCardinality.Present,
      null,
      effectFilters(
        ['sourceName', readinessExpression],
        ['observedMemberKind', 'accessor'],
      ),
    ),
    ExpectedSemanticEffect.signatureFact(
      'Domain-backed submit form SourcePlan should use a boolean disabled channel for submit availability.',
      ExpectedSemanticEffectKind.BindingValueChannel,
      ExpectedSemanticEffectScope.Template,
      ExpectedSemanticEffectTopologyNodeKind.TemplateBinding,
      ExpectedSemanticEffectCardinality.Present,
      null,
      effectFilters(['targetProperty', 'disabled']),
    ),
  ];
}

function serviceBoundaryExpectedEffects(
  appDescription: string,
  options: {
    readonly includeTemplateBinding?: boolean;
  } = {},
): readonly ExpectedSemanticEffect[] {
  return [
    ExpectedSemanticEffect.fact(
      `${appDescription} should expose the generated service class.`,
      ExpectedSemanticEffectKind.ServiceClass,
    ),
    ExpectedSemanticEffect.fact(
      `${appDescription} should expose a generated call into the service boundary.`,
      ExpectedSemanticEffectKind.ServiceInteraction,
    ),
    ...(options.includeTemplateBinding === true
      ? [ExpectedSemanticEffect.fact(
          `${appDescription} should bind template reads back to the service-backed member.`,
          ExpectedSemanticEffectKind.ServiceInteractionBinding,
        )]
      : []),
  ];
}

interface AppBuilderRoutedCollectionDetailExpectedEffectsOptions {
  readonly parameterName?: string | null;
  readonly includesServiceBoundary?: boolean;
}

interface AppBuilderRoutedCollectionDetailExpectedEffectFrame {
  readonly parameterName: string;
  readonly viewportName: string;
  readonly childViewportName: string;
}

/** Expected effects for a routed collection/detail SourcePlan using its recorded route parameter. */
export function appBuilderRoutedCollectionDetailSourcePlanExpectedEffects(
  sourcePlan: SourcePlan | null,
): readonly ExpectedSemanticEffect[] {
  if (sourcePlan == null) {
    return [];
  }
  return appBuilderRoutedCollectionDetailExpectedEffects({
    parameterName: sourcePatternParameterSourceValue(
      sourcePlan.pattern ?? null,
      SourcePatternParameterKey.DetailRouteParameter,
    ),
    includesServiceBoundary: sourcePlan.files.some((file) => file.role === SourcePlanFileRole.Service),
  });
}

/** Expected effects for a multi-area app-builder application assembly SourcePlan. */
export function appBuilderApplicationAssemblyExpectedEffects(
  sourcePlan: SourcePlan | null,
): readonly ExpectedSemanticEffect[] {
  if (sourcePlan == null) {
    return [];
  }
  return [
    ...appBuilderProjectToolingExpectedEffects('App-builder application assembly SourcePlan'),
    ExpectedSemanticEffect.fact(
      'Application assembly SourcePlan should reopen as an Aurelia app.',
      ExpectedSemanticEffectKind.ProjectShape,
    ),
    routeProductSignatureEffect(
      'Application assembly SourcePlan should register router options.',
      ExpectedSemanticEffectRouteProductKind.RouterOptions,
    ),
    routeConfigObjectLiteralEffect(
      'Application assembly SourcePlan should use route decorator object-literal configs.',
      'route-decorator',
    ),
    routeConfigObjectLiteralEffect(
      'Application assembly SourcePlan should use child route object-literal configs.',
      'child-routes-property',
    ),
    routeConfigViewportEffect(
      'Application assembly top-level route areas should target the main viewport.',
      'main',
    ),
    routeConfigViewportEffect(
      'Application assembly child detail routes should target nested detail viewports.',
      'detail',
    ),
    routerViewportNameEffect(
      'Application assembly root shell should declare the main au-viewport.',
      'main',
    ),
    routerViewportNameEffect(
      'Application assembly child route areas should declare nested detail au-viewports.',
      'detail',
    ),
    ExpectedSemanticEffect.fact(
      'Application assembly SourcePlan should compile root and route templates.',
      ExpectedSemanticEffectKind.TemplateCompilation,
    ),
    ExpectedSemanticEffect.fact(
      'Application assembly SourcePlan should hydrate runtime controllers.',
      ExpectedSemanticEffectKind.RuntimeController,
      ExpectedSemanticEffectScope.Template,
    ),
    ExpectedSemanticEffect.fact(
      'Application assembly SourcePlan should read through generated route state/domain bindings.',
      ExpectedSemanticEffectKind.ServiceInteractionBinding,
    ),
    ...(sourcePlan.files.some((file) => file.role === SourcePlanFileRole.Service)
      ? serviceBoundaryExpectedEffects('Application assembly service-backed route area SourcePlan')
      : []),
    ExpectedSemanticEffect.absent(
      'Application assembly SourcePlan should have no open semantic seams.',
      ExpectedSemanticEffectKind.OpenSeamClosure,
    ),
  ];
}

function appBuilderRoutedCollectionDetailExpectedEffects(
  options: AppBuilderRoutedCollectionDetailExpectedEffectsOptions = {},
): readonly ExpectedSemanticEffect[] {
  const frame = routedCollectionDetailExpectedEffectFrame(options);
  return [
    ...routedCollectionDetailAppExpectedEffects(options),
    ...routedCollectionDetailRoutingExpectedEffects(frame),
    ...routedCollectionDetailTemplateExpectedEffects(options),
    ...(options.includesServiceBoundary === true
      ? serviceBoundaryExpectedEffects('Routed collection/detail service-backed SourcePlan')
      : []),
  ];
}

/** Normalize routed collection/detail effect inputs before producing effect rows. */
function routedCollectionDetailExpectedEffectFrame(
  options: AppBuilderRoutedCollectionDetailExpectedEffectsOptions,
): AppBuilderRoutedCollectionDetailExpectedEffectFrame {
  return {
    parameterName: options.parameterName ?? 'taskId',
    viewportName: 'main',
    childViewportName: 'detail',
  };
}

/** Expected app/state effects for a routed collection/detail SourcePlan. */
function routedCollectionDetailAppExpectedEffects(
  options: AppBuilderRoutedCollectionDetailExpectedEffectsOptions,
): readonly ExpectedSemanticEffect[] {
  return [
    ...appBuilderProjectToolingExpectedEffects('App-builder routed collection/detail SourcePlan'),
    ExpectedSemanticEffect.fact(
      'Routed collection/detail SourcePlan should reopen as an Aurelia app.',
      ExpectedSemanticEffectKind.ProjectShape,
    ),
    ExpectedSemanticEffect.discriminatorFact(
      'Routed collection/detail SourcePlan should expose the injected state class in app topology.',
      ExpectedSemanticEffectKind.ServiceClass,
      ExpectedSemanticEffectScope.App,
      ExpectedSemanticEffectTopologyNodeKind.StateModel,
      ExpectedSemanticEffectCardinality.Present,
      null,
      effectFilters(['role', 'state-source']),
    ),
    ...(options.includesServiceBoundary === true
      ? []
      : [ExpectedSemanticEffect.signatureFact(
          'Routed collection/detail SourcePlan should expose composed domain entities owned by state.',
          ExpectedSemanticEffectKind.StateComposition,
          ExpectedSemanticEffectScope.App,
          ExpectedSemanticEffectTopologyNodeKind.DomainModel,
          ExpectedSemanticEffectCardinality.Present,
          null,
          effectFilters(['valueDeclarationRole', 'model-source']),
        )]),
  ];
}

/** Expected router effects for a routed collection/detail SourcePlan. */
function routedCollectionDetailRoutingExpectedEffects(
  frame: AppBuilderRoutedCollectionDetailExpectedEffectFrame,
): readonly ExpectedSemanticEffect[] {
  return [
    ...routedCollectionDetailRouteConfigurationExpectedEffects(frame),
    ...routedCollectionDetailRouteConsumptionExpectedEffects(frame),
  ];
}

/** Expected route configuration/source-shape effects for a routed collection/detail SourcePlan. */
function routedCollectionDetailRouteConfigurationExpectedEffects(
  frame: AppBuilderRoutedCollectionDetailExpectedEffectFrame,
): readonly ExpectedSemanticEffect[] {
  return [
    routeProductSignatureEffect(
      'Routed collection/detail SourcePlan should register router options.',
      ExpectedSemanticEffectRouteProductKind.RouterOptions,
    ),
    routeConfigObjectLiteralEffect(
      'Routed collection/detail SourcePlan should use route decorator object-literal configs.',
      'route-decorator',
    ),
    routeConfigObjectLiteralEffect(
      'Routed collection/detail SourcePlan should use child route object-literal configs.',
      'child-routes-property',
    ),
    routeConfigViewportEffect(
      'Routed collection/detail list route config should target the main viewport.',
      frame.viewportName,
    ),
    routeConfigViewportEffect(
      'Routed collection/detail child route config should target the nested detail viewport.',
      frame.childViewportName,
    ),
  ];
}

/** Expected route consumption/runtime-read effects for a routed collection/detail SourcePlan. */
function routedCollectionDetailRouteConsumptionExpectedEffects(
  frame: AppBuilderRoutedCollectionDetailExpectedEffectFrame,
): readonly ExpectedSemanticEffect[] {
  return [
    routerViewportNameEffect(
      'Routed collection/detail shell should declare the main au-viewport.',
      frame.viewportName,
    ),
    routerViewportNameEffect(
      'Routed collection/detail list route should declare the nested detail au-viewport.',
      frame.childViewportName,
    ),
    routePatternParameterEffect(
      'Routed collection/detail route pattern should expose its route parameter.',
      frame.parameterName,
    ),
    routeEndpointParameterEffect(
      'Routed collection/detail route endpoint should expose its route parameter.',
      frame.parameterName,
    ),
    routeContextParameterReadEffect(
      'Routed collection/detail detail route should read the route parameter.',
      frame.parameterName,
    ),
  ];
}

/** Expected template/runtime effects for a routed collection/detail SourcePlan. */
function routedCollectionDetailTemplateExpectedEffects(
  options: AppBuilderRoutedCollectionDetailExpectedEffectsOptions,
): readonly ExpectedSemanticEffect[] {
  return [
    ...(options.includesServiceBoundary === true
      ? []
      : [ExpectedSemanticEffect.signatureFact(
          'Routed collection/detail list should read state collection through repeat iteration.',
          ExpectedSemanticEffectKind.BindingDataFlow,
          ExpectedSemanticEffectScope.Template,
          ExpectedSemanticEffectTopologyNodeKind.TemplateBinding,
          ExpectedSemanticEffectCardinality.Present,
          null,
          effectFilters(
            ['sourceRootName', 'state'],
            ['valueChannelKind', 'template-controller-iteration'],
          ),
        )]),
    ExpectedSemanticEffect.signatureAtLeast(
      'Routed collection/detail templates should read through DI state/domain objects.',
      ExpectedSemanticEffectKind.ServiceInteractionBinding,
      ExpectedSemanticEffectScope.Template,
      2,
      ExpectedSemanticEffectTopologyNodeKind.TemplateBinding,
      effectFilters(['interactionTargetRole', 'state-source']),
    ),
    ExpectedSemanticEffect.fact(
      'Routed collection/detail SourcePlan should compile route templates.',
      ExpectedSemanticEffectKind.TemplateCompilation,
    ),
    ExpectedSemanticEffect.fact(
      'Routed collection/detail SourcePlan should hydrate runtime controllers.',
      ExpectedSemanticEffectKind.RuntimeController,
      ExpectedSemanticEffectScope.Template,
    ),
    ExpectedSemanticEffect.absent(
      'Routed collection/detail SourcePlan should have no open semantic seams.',
      ExpectedSemanticEffectKind.OpenSeamClosure,
    ),
  ];
}

function effectFilters(
  ...entries: readonly (readonly [string, ExpectedSemanticEffectFilterValue])[]
): readonly ExpectedSemanticEffectFilter[] {
  return entries.map(([field, value]) => new ExpectedSemanticEffectFilter(field, value));
}
