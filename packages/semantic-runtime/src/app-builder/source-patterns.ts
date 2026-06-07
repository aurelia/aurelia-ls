import { SourcePatternModules } from '../source-plan/source-pattern-modules.js';
import {
  routedSourcePatternDetailRouteParameter,
  routedSourcePatternIdentityGroup,
  routedSourcePatternListRoutePath,
  type RoutedListDetailSourcePatternModel,
} from '../source-plan/route-source-pattern.js';
import {
  SourcePattern,
  SourcePatternCodeEconomyPolicy,
  SourcePatternDataPolicy,
  SourcePatternDomainModelPolicy,
  type SourcePatternModule,
  SourcePatternRole,
  SourcePatternStylePolicy,
} from '../source-plan/source-plan.js';
import { AppBuilderResourceCarrier } from './aurelia-lowering-option.js';

/** App-builder source-pattern key for generated SourcePlans that currently have live lowerers. */
export enum AppBuilderSourcePatternKey {
  /** Minimal app shell established through Aurelia conventions. */
  MinimalAppShellConvention = 'minimal-app-shell.convention',
  /** Minimal app shell established through explicit resource metadata. */
  MinimalAppShellDecorator = 'minimal-app-shell.decorator',
  /** Minimal app shell established through static `$au` metadata. */
  MinimalAppShellStaticAu = 'minimal-app-shell.static-au',
  /** Minimal app shell established through `CustomElement.define(...)`. */
  MinimalAppShellDefineCall = 'minimal-app-shell.define-call',
  /** Routed collection/detail source using DI state and route parameter lookup. */
  RoutedCollectionDetailConvention = 'routed-collection-detail.convention',
  /** Routed collection/detail source using explicit custom-element metadata. */
  RoutedCollectionDetailDecorator = 'routed-collection-detail.decorator',
  /** Routed collection/detail source using static `$au` custom-element metadata. */
  RoutedCollectionDetailStaticAu = 'routed-collection-detail.static-au',
  /** Routed collection/detail source using `CustomElement.define(...)`. */
  RoutedCollectionDetailDefineCall = 'routed-collection-detail.define-call',
  /** Multi-area routed app assembly using conventions. */
  ApplicationAssemblyConvention = 'application-assembly.convention',
  /** Multi-area routed app assembly using explicit custom-element metadata. */
  ApplicationAssemblyDecorator = 'application-assembly.decorator',
  /** Multi-area routed app assembly using static `$au` custom-element metadata. */
  ApplicationAssemblyStaticAu = 'application-assembly.static-au',
  /** Multi-area routed app assembly using `CustomElement.define(...)`. */
  ApplicationAssemblyDefineCall = 'application-assembly.define-call',
}

/** Routed collection/detail source-pattern metadata supplied by the source lowerer. */
export interface AppBuilderRoutedCollectionDetailSourcePatternModel extends RoutedListDetailSourcePatternModel {
  readonly includesServiceBoundary?: boolean;
  readonly includesServiceBackedSubmission?: boolean;
}

/** Source-pattern metadata for the minimal app-shell source lowerer. */
export function appBuilderMinimalAppShellSourcePattern(
  carrier: AppBuilderResourceCarrier,
): SourcePattern {
  return new SourcePattern(
    sourcePatternKeyForCarrier(carrier, {
      convention: AppBuilderSourcePatternKey.MinimalAppShellConvention,
      decorator: AppBuilderSourcePatternKey.MinimalAppShellDecorator,
      staticAu: AppBuilderSourcePatternKey.MinimalAppShellStaticAu,
      defineCall: AppBuilderSourcePatternKey.MinimalAppShellDefineCall,
    }),
    carrier === AppBuilderResourceCarrier.Convention
      ? 'Minimal convention app shell'
      : 'Minimal explicit-resource app shell',
    'Aurelia entrypoint plus root component/template with the smallest runnable source shape.',
    SourcePatternRole.RecommendableSourceStart,
    SourcePatternDomainModelPolicy.DomainNeutral,
    SourcePatternStylePolicy.None,
    SourcePatternDataPolicy.None,
    SourcePatternCodeEconomyPolicy.ProductionTerse,
    [
      'The source is intentionally domain-neutral and should be used as a runnable shell before feature/domain mechanics are added.',
      'The resource carrier is the only semantic variant in this source pattern.',
    ],
    [],
    [
      SourcePatternModules.AppShell,
      resourceCarrierSourcePatternModule(carrier),
    ],
  );
}

/** Source-pattern metadata for the routed DI-state collection/detail source lowerer. */
export function appBuilderRoutedCollectionDetailSourcePattern(
  carrier: AppBuilderResourceCarrier,
  model?: AppBuilderRoutedCollectionDetailSourcePatternModel,
): SourcePattern {
  const serviceModules = model?.includesServiceBoundary === true
    ? [
        SourcePatternModules.StateOwnedServiceBoundary,
        SourcePatternModules.ServiceBackedLoading,
        ...(model.includesServiceBackedSubmission === true
          ? [SourcePatternModules.ServiceBackedSubmission]
          : []),
      ]
    : [];
  return new SourcePattern(
    sourcePatternKeyForCarrier(carrier, {
      convention: AppBuilderSourcePatternKey.RoutedCollectionDetailConvention,
      decorator: AppBuilderSourcePatternKey.RoutedCollectionDetailDecorator,
      staticAu: AppBuilderSourcePatternKey.RoutedCollectionDetailStaticAu,
      defineCall: AppBuilderSourcePatternKey.RoutedCollectionDetailDefineCall,
    }),
    'Routed collection detail',
    'Router shell, list route, nested detail route, DI-owned state, route-parameter ID lookup, and direct domain template reads.',
    SourcePatternRole.RecommendableSourceStart,
    SourcePatternDomainModelPolicy.CallerApplied,
    SourcePatternStylePolicy.None,
    SourcePatternDataPolicy.CallerSupplied,
    SourcePatternCodeEconomyPolicy.ProductionTerse,
    [
      'Domain nouns and seed records come from supplied input; the reusable mechanics are routed list/detail ownership, DI state, and ID-to-object lookup.',
      'The route parameter is a scalar boundary so the detail route can render before data lookup completes in later service-backed variants.',
      'Nested viewport layout is a consequence of the routed detail area, not an app-global style policy.',
    ],
    model == null
      ? []
      : [
          routedSourcePatternDetailRouteParameter(model),
          routedSourcePatternListRoutePath(model),
        ],
    [
      SourcePatternModules.AppShell,
      resourceCarrierSourcePatternModule(carrier),
      SourcePatternModules.RouterShell,
      SourcePatternModules.RouteLinkNavigation,
      SourcePatternModules.NestedViewportLayout,
      SourcePatternModules.RouteContextSelection,
      SourcePatternModules.RouteParameterSelection,
      SourcePatternModules.DiStateBoundary,
      SourcePatternModules.StateComposition,
      ...serviceModules,
      SourcePatternModules.DomainClassModel,
      SourcePatternModules.ListRendering,
      SourcePatternModules.TemplateControllerFlow,
    ],
    model == null ? [] : [routedSourcePatternIdentityGroup()],
  );
}

/** Source-pattern metadata for a single app shell assembled from multiple routed app areas. */
export function appBuilderApplicationAssemblySourcePattern(
  carrier: AppBuilderResourceCarrier,
): SourcePattern {
  return new SourcePattern(
    sourcePatternKeyForCarrier(carrier, {
      convention: AppBuilderSourcePatternKey.ApplicationAssemblyConvention,
      decorator: AppBuilderSourcePatternKey.ApplicationAssemblyDecorator,
      staticAu: AppBuilderSourcePatternKey.ApplicationAssemblyStaticAu,
      defineCall: AppBuilderSourcePatternKey.ApplicationAssemblyDefineCall,
    }),
    'Application assembly',
    'One Aurelia entrypoint and root route shell coordinating several generated routed app areas.',
    SourcePatternRole.RecommendableSourceStart,
    SourcePatternDomainModelPolicy.CallerApplied,
    SourcePatternStylePolicy.None,
    SourcePatternDataPolicy.CallerSupplied,
    SourcePatternCodeEconomyPolicy.ProductionTerse,
    [
      'The root app shell owns startup, router admission, top-level navigation, and shared viewport placement.',
      'Child route areas own their domain state, route components, nested detail viewports, and service boundaries.',
      'This pattern is the first app-builder rung where multiple app areas must compose without duplicating root tooling.',
    ],
    [],
    [
      SourcePatternModules.AppShell,
      resourceCarrierSourcePatternModule(carrier),
      SourcePatternModules.RouterShell,
      SourcePatternModules.RouteLinkNavigation,
      SourcePatternModules.NestedViewportLayout,
      SourcePatternModules.DiStateBoundary,
      SourcePatternModules.DomainClassModel,
      SourcePatternModules.ListRendering,
      SourcePatternModules.TemplateControllerFlow,
    ],
  );
}

interface SourcePatternKeysByCarrier {
  readonly convention: AppBuilderSourcePatternKey;
  readonly decorator: AppBuilderSourcePatternKey;
  readonly staticAu: AppBuilderSourcePatternKey;
  readonly defineCall: AppBuilderSourcePatternKey;
}

export function sourcePatternKeyForCarrier(
  carrier: AppBuilderResourceCarrier,
  keys: SourcePatternKeysByCarrier,
): AppBuilderSourcePatternKey {
  switch (carrier) {
    case AppBuilderResourceCarrier.Convention:
      return keys.convention;
    case AppBuilderResourceCarrier.Decorator:
      return keys.decorator;
    case AppBuilderResourceCarrier.StaticAu:
      return keys.staticAu;
    case AppBuilderResourceCarrier.DefineCall:
      return keys.defineCall;
    case AppBuilderResourceCarrier.AttributePatternCreate:
      throw new Error('AttributePattern.create is not a custom-element source-pattern carrier.');
  }
}

function resourceCarrierSourcePatternModule(
  carrier: AppBuilderResourceCarrier,
): SourcePatternModule {
  switch (carrier) {
    case AppBuilderResourceCarrier.Convention:
      return SourcePatternModules.ConventionResource;
    case AppBuilderResourceCarrier.Decorator:
    case AppBuilderResourceCarrier.StaticAu:
    case AppBuilderResourceCarrier.DefineCall:
    case AppBuilderResourceCarrier.AttributePatternCreate:
      return SourcePatternModules.ExplicitResourceDefinition;
  }
}
