import {
  AppBuilderPackageCapability,
} from '../aurelia-lowering-option.js';
import {
  APP_BUILDER_DOMAIN_ACTION_KINDS,
  APP_BUILDER_DOMAIN_ACTION_SCOPES,
  APP_BUILDER_DOMAIN_RELATIONSHIP_KINDS,
  AppBuilderDomainActionKind,
  AppBuilderDomainActionScope,
  AppBuilderDomainRelationshipKind,
} from '../domain-model.js';
import {
  AppBuilderApplicationPatternId,
} from './application-pattern.js';
import {
  AppBuilderControlPatternId,
} from './control.js';
import {
  AppBuilderInputFacetId,
  type AppBuilderInputFacetRow,
} from './input.js';
import {
  AppBuilderPolicyAxisId,
} from './policy.js';
import {
  appBuilderOntologyRowRef,
  AppBuilderOntologyRowKind,
  type AppBuilderOntologyRowRef,
} from './relation.js';

/** Value axis inside a modeled input facet whose source-lowering support can differ by enum member. */
export enum AppBuilderInputFacetValueAxis {
  /** Domain relationship-kind values such as reference-one, owns-many, or nested-value-object. */
  DomainRelationshipKind = 'domain-relationship-kind',
  /** Domain action-kind values such as create, archive, assign, or refresh. */
  DomainActionKind = 'domain-action-kind',
  /** Domain action-scope values such as form, entity, navigation, or integration. */
  DomainActionScope = 'domain-action-scope',
  /** Optional Aurelia package/plugin capability ids such as state, validation-html, or fetch. */
  PackageCapability = 'package-capability',
}

/** Stable value list for app-builder input facet value axes. */
export const APP_BUILDER_INPUT_FACET_VALUE_AXES = [
  AppBuilderInputFacetValueAxis.DomainRelationshipKind,
  AppBuilderInputFacetValueAxis.DomainActionKind,
  AppBuilderInputFacetValueAxis.DomainActionScope,
  AppBuilderInputFacetValueAxis.PackageCapability,
] as const;

/** How current app-builder source-lowering can spend one modeled input-facet enum value. */
export enum AppBuilderInputFacetValueSourceLoweringSupportKind {
  /** The value is accepted by modeled input schemas, but no current source lowerer consumes it directly. */
  ModeledInputOnly = 'modeled-input-only',
  /** The value can be wired to native event/control source, but behavior remains caller/app owned. */
  NativeEventBinding = 'native-event-binding',
  /** The value can be emitted as caller-owned TypeScript method source after explicit body input. */
  CallerOwnedTypeScriptMethod = 'caller-owned-typescript-method',
  /** The value can derive a narrow local implementation from constrained domain/state input. */
  DerivedLocalTypeScriptMethod = 'derived-local-typescript-method',
  /** The value can be emitted as Aurelia router `load` navigation after explicit route/link input. */
  RouterLoadNavigation = 'router-load-navigation',
  /** The value can be emitted as a related-entity lookup and display label in a generated SourcePlan. */
  ReferenceLookup = 'reference-lookup',
  /** The value can be emitted as owned child/value source inside a generated local domain model. */
  OwnedValueSource = 'owned-value-source',
  /** The value is recognized as explicit policy input and emitted as a handoff, not generated plugin source. */
  DeferredCapabilityHandoff = 'deferred-capability-handoff',
}

/** Stable value list for input-facet value source-lowering support kinds. */
export const APP_BUILDER_INPUT_FACET_VALUE_SOURCE_LOWERING_SUPPORT_KINDS = [
  AppBuilderInputFacetValueSourceLoweringSupportKind.ModeledInputOnly,
  AppBuilderInputFacetValueSourceLoweringSupportKind.NativeEventBinding,
  AppBuilderInputFacetValueSourceLoweringSupportKind.CallerOwnedTypeScriptMethod,
  AppBuilderInputFacetValueSourceLoweringSupportKind.DerivedLocalTypeScriptMethod,
  AppBuilderInputFacetValueSourceLoweringSupportKind.RouterLoadNavigation,
  AppBuilderInputFacetValueSourceLoweringSupportKind.ReferenceLookup,
  AppBuilderInputFacetValueSourceLoweringSupportKind.OwnedValueSource,
  AppBuilderInputFacetValueSourceLoweringSupportKind.DeferredCapabilityHandoff,
] as const;

/** Review row for source-lowering support of one enum value inside a modeled input facet. */
export interface AppBuilderInputFacetValueSourceLoweringSupportRow {
  /** Input facet whose value axis is being described. */
  readonly inputFacetId: AppBuilderInputFacetId;
  /** Enum-like value axis inside the input facet. */
  readonly axis: AppBuilderInputFacetValueAxis;
  /** Concrete enum member value on that axis. */
  readonly value: string;
  /** Current source-lowering support posture for this value. */
  readonly supportKind: AppBuilderInputFacetValueSourceLoweringSupportKind;
  /** App-builder ontology targets that currently spend this support row. */
  readonly targetRefs: readonly AppBuilderOntologyRowRef[];
  /** Conditions that must hold before source lowering can honestly spend the value this way. */
  readonly requiredConditions: readonly string[];
  /** Compact explanation for AI callers and review tools. */
  readonly summary: string;
}

const DOMAIN_COMMAND_ACTION_REF = appBuilderOntologyRowRef(
  AppBuilderOntologyRowKind.ApplicationPattern,
  AppBuilderApplicationPatternId.DomainCommandAction,
);
const ROUTE_NAVIGATION_ACTION_REF = appBuilderOntologyRowRef(
  AppBuilderOntologyRowKind.ApplicationPattern,
  AppBuilderApplicationPatternId.RouteNavigationAction,
);
const ROUTER_BACKED_LIST_DETAIL_REF = appBuilderOntologyRowRef(
  AppBuilderOntologyRowKind.ApplicationPattern,
  AppBuilderApplicationPatternId.RouterBackedListDetail,
);
const LOCAL_VIEW_MODEL_STATE_REF = appBuilderOntologyRowRef(
  AppBuilderOntologyRowKind.ApplicationPattern,
  AppBuilderApplicationPatternId.LocalViewModelState,
);
const NATIVE_BUTTON_REF = appBuilderOntologyRowRef(
  AppBuilderOntologyRowKind.ControlPattern,
  AppBuilderControlPatternId.NativeButton,
);
const NATIVE_SUBMIT_FORM_REF = appBuilderOntologyRowRef(
  AppBuilderOntologyRowKind.ApplicationPattern,
  AppBuilderApplicationPatternId.NativeSubmitForm,
);
const PLUGIN_ADMISSION_REF = appBuilderOntologyRowRef(
  AppBuilderOntologyRowKind.PolicyAxis,
  AppBuilderPolicyAxisId.PluginAdmission,
);

const APP_BUILDER_PACKAGE_CAPABILITY_VALUES = [
  AppBuilderPackageCapability.ValidationHtml,
  AppBuilderPackageCapability.I18n,
  AppBuilderPackageCapability.State,
  AppBuilderPackageCapability.VirtualRepeat,
  AppBuilderPackageCapability.Fetch,
] as const;

/** Return source-lowering support rows for enum values inside a modeled input facet. */
export function appBuilderInputFacetValueSourceLoweringSupportRows(
  facet: AppBuilderInputFacetRow,
): readonly AppBuilderInputFacetValueSourceLoweringSupportRow[] {
  switch (facet.id) {
    case AppBuilderInputFacetId.DomainActions:
      return [
        ...domainActionKindSupportRows(),
        ...domainActionScopeSupportRows(),
      ];
    case AppBuilderInputFacetId.DomainRelationships:
      return domainRelationshipKindSupportRows();
    case AppBuilderInputFacetId.AureliaPluginPolicy:
      return packageCapabilitySupportRows();
    default:
      return [];
  }
}

function packageCapabilitySupportRows(): readonly AppBuilderInputFacetValueSourceLoweringSupportRow[] {
  return APP_BUILDER_PACKAGE_CAPABILITY_VALUES.map((value) => ({
    inputFacetId: AppBuilderInputFacetId.AureliaPluginPolicy,
    axis: AppBuilderInputFacetValueAxis.PackageCapability,
    value,
    supportKind: AppBuilderInputFacetValueSourceLoweringSupportKind.DeferredCapabilityHandoff,
    targetRefs: [PLUGIN_ADMISSION_REF],
    requiredConditions: [
      'The package capability is selected explicitly through AureliaPluginPolicy or derived from an equivalent explicit Aurelia policy input.',
      'The caller or existing app owns plugin-specific architecture until a dedicated source lowerer is implemented for that capability.',
    ],
    summary: packageCapabilitySupportSummary(value),
  }));
}

function packageCapabilitySupportSummary(
  value: AppBuilderPackageCapability,
): string {
  switch (value) {
    case AppBuilderPackageCapability.ValidationHtml:
      return 'validation-html is recognized as optional plugin policy; current source plans can report the selection but validation-rule source remains caller/plugin owned.';
    case AppBuilderPackageCapability.I18n:
      return 'i18n is recognized as optional plugin policy; current source plans can report the selection but localization keys, resources, and translation copy remain caller/plugin owned.';
    case AppBuilderPackageCapability.State:
      return '@aurelia/state is recognized as optional shared-state policy; current source plans can report the selection but do not generate store architecture.';
    case AppBuilderPackageCapability.VirtualRepeat:
      return 'virtual-repeat is recognized as optional large-collection rendering policy; current app-builder part lowerers can emit the structural part, while full app-level virtualization architecture remains caller/plugin owned.';
    case AppBuilderPackageCapability.Fetch:
      return 'fetch-client is recognized as optional HTTP service-boundary policy; current source plans can report the selection but server/API contract and client configuration remain caller/plugin owned.';
  }
}

function domainRelationshipKindSupportRows(): readonly AppBuilderInputFacetValueSourceLoweringSupportRow[] {
  return APP_BUILDER_DOMAIN_RELATIONSHIP_KINDS.map((value) => ({
    inputFacetId: AppBuilderInputFacetId.DomainRelationships,
    axis: AppBuilderInputFacetValueAxis.DomainRelationshipKind,
    value,
    supportKind: domainRelationshipKindSupportKind(value),
    targetRefs: domainRelationshipKindTargetRefs(value),
    requiredConditions: domainRelationshipKindRequiredConditions(value),
    summary: domainRelationshipKindSummary(value),
  }));
}

function domainRelationshipKindSupportKind(
  value: AppBuilderDomainRelationshipKind,
): AppBuilderInputFacetValueSourceLoweringSupportKind {
  switch (value) {
    case AppBuilderDomainRelationshipKind.ReferenceOne:
    case AppBuilderDomainRelationshipKind.ReferenceMany:
      return AppBuilderInputFacetValueSourceLoweringSupportKind.ReferenceLookup;
    case AppBuilderDomainRelationshipKind.OwnsOne:
    case AppBuilderDomainRelationshipKind.OwnsMany:
    case AppBuilderDomainRelationshipKind.NestedValueObject:
      return AppBuilderInputFacetValueSourceLoweringSupportKind.OwnedValueSource;
  }
}

function domainRelationshipKindTargetRefs(
  value: AppBuilderDomainRelationshipKind,
): readonly AppBuilderOntologyRowRef[] {
  switch (value) {
    case AppBuilderDomainRelationshipKind.ReferenceOne:
      return [ROUTER_BACKED_LIST_DETAIL_REF, LOCAL_VIEW_MODEL_STATE_REF];
    case AppBuilderDomainRelationshipKind.ReferenceMany:
      return [LOCAL_VIEW_MODEL_STATE_REF];
    case AppBuilderDomainRelationshipKind.OwnsOne:
    case AppBuilderDomainRelationshipKind.OwnsMany:
    case AppBuilderDomainRelationshipKind.NestedValueObject:
      return [LOCAL_VIEW_MODEL_STATE_REF];
  }
}

function domainRelationshipKindRequiredConditions(
  value: AppBuilderDomainRelationshipKind,
): readonly string[] {
  switch (value) {
    case AppBuilderDomainRelationshipKind.ReferenceOne:
      return [
        'DomainEntities includes the primary entity and one related entity.',
        'DomainFields are scoped by entityName for multi-entity input.',
        'The relationship supplies fromEntityName, toEntityName, localFieldName, foreignFieldName, and displayFieldName.',
        'The related entity identity field is the relationship foreignFieldName.',
        'SeedRecordSet may be grouped by entityName when related records should initialize generated source.',
      ];
    case AppBuilderDomainRelationshipKind.ReferenceMany:
      return [
        'DomainEntities includes the primary entity and one related entity.',
        'DomainFields are scoped by entityName for multi-entity input.',
        'The relationship supplies fromEntityName, toEntityName, localFieldName, foreignFieldName, and displayFieldName.',
        'The local field is a choice-set field that stores string related identity values.',
        'The related entity identity field is a string identity and is named by foreignFieldName.',
        'SeedRecordSet may be grouped by entityName when related records should initialize generated source.',
      ];
    case AppBuilderDomainRelationshipKind.OwnsOne:
      return [
        'DomainEntities includes the primary entity and one owned child entity.',
        'DomainFields are scoped by entityName for multi-entity input.',
        'The relationship supplies fromEntityName, toEntityName, localFieldName, and displayFieldName.',
        'The localFieldName is not also declared as a scalar field on the primary entity.',
        'Primary SeedRecordSet rows may supply localFieldName as one child seed record, or null when the relationship is not required.',
        'Owned child seed records supply scalar identity values matching the owned child entity identity kind.',
      ];
    case AppBuilderDomainRelationshipKind.OwnsMany:
      return [
        'DomainEntities includes the primary entity and one owned child entity.',
        'DomainFields are scoped by entityName for multi-entity input.',
        'The relationship supplies fromEntityName, toEntityName, localFieldName, and displayFieldName.',
        'The localFieldName is not also declared as a scalar field on the primary entity.',
        'Primary SeedRecordSet rows may supply localFieldName as an array of child seed records.',
        'Owned child seed records supply scalar identity values matching the owned child entity identity kind.',
      ];
    case AppBuilderDomainRelationshipKind.NestedValueObject:
      return [
        'DomainEntities includes the primary entity.',
        'DomainFields includes value-object fields scoped by relationship toEntityName.',
        'The relationship supplies fromEntityName, toEntityName, localFieldName, and displayFieldName.',
        'The localFieldName is not also declared as a scalar field on the primary entity.',
        'The relationship omits foreignFieldName because nested value objects are not identity lookups.',
        'The displayFieldName currently names a text, number, or boolean value-object field.',
        'Primary SeedRecordSet rows may supply localFieldName as one nested value-object seed record, or null when the relationship is not required.',
      ];
  }
}

function domainRelationshipKindSummary(
  value: AppBuilderDomainRelationshipKind,
): string {
  switch (value) {
    case AppBuilderDomainRelationshipKind.ReferenceOne:
      return `Relationship kind '${value}' can be spent by router-backed list/detail or local view-model collection source as a related-entity lookup and label display when entity, field, relationship, and optional seed groups are explicit.`;
    case AppBuilderDomainRelationshipKind.ReferenceMany:
      return `Relationship kind '${value}' can be spent by local view-model collection source as a related-entity array lookup and joined label display when string identity arrays, entity, field, relationship, and optional seed groups are explicit.`;
    case AppBuilderDomainRelationshipKind.OwnsOne:
      return `Relationship kind '${value}' can be spent by local view-model collection source as a typed owned-child object on each parent entity and a label display when entity, field, relationship, and nested seed rows are explicit.`;
    case AppBuilderDomainRelationshipKind.OwnsMany:
      return `Relationship kind '${value}' can be spent by local view-model collection source as a typed owned-child array on each parent entity and a joined label display when entity, field, relationship, and nested seed rows are explicit.`;
    case AppBuilderDomainRelationshipKind.NestedValueObject:
      return `Relationship kind '${value}' can be spent by local view-model collection source as an identityless nested value object on each parent entity and a label display when primary entity, value-object fields, relationship, and nested seed rows are explicit.`;
  }
}

function domainActionKindSupportRows(): readonly AppBuilderInputFacetValueSourceLoweringSupportRow[] {
  return APP_BUILDER_DOMAIN_ACTION_KINDS.flatMap((value) => [
    domainActionNativeEventBindingRow(AppBuilderInputFacetValueAxis.DomainActionKind, value),
    domainActionCallerOwnedMethodRow(AppBuilderInputFacetValueAxis.DomainActionKind, value),
    ...domainActionDerivedMethodRows(value),
  ]);
}

function domainActionScopeSupportRows(): readonly AppBuilderInputFacetValueSourceLoweringSupportRow[] {
  return APP_BUILDER_DOMAIN_ACTION_SCOPES.flatMap((value) => [
    domainActionNativeEventBindingRow(AppBuilderInputFacetValueAxis.DomainActionScope, value),
    domainActionCallerOwnedMethodRow(AppBuilderInputFacetValueAxis.DomainActionScope, value),
    ...domainActionNavigationRows(value),
  ]);
}

function domainActionNativeEventBindingRow(
  axis: AppBuilderInputFacetValueAxis,
  value: string,
): AppBuilderInputFacetValueSourceLoweringSupportRow {
  return {
    inputFacetId: AppBuilderInputFacetId.DomainActions,
    axis,
    value,
    supportKind: AppBuilderInputFacetValueSourceLoweringSupportKind.NativeEventBinding,
    targetRefs: [NATIVE_BUTTON_REF, NATIVE_SUBMIT_FORM_REF],
    requiredConditions: [
      'A selected domain action is present in DomainActions.',
      'The request supplies actionName when multiple actions are present.',
      'The selected action name is TypeScript-safe or handlerExpression is supplied explicitly.',
      'Button or form accessibility text is supplied by request or ControlAccessibility input.',
    ],
    summary: `Domain action ${axis} '${value}' can be wired to native button or submit event source; app-builder does not infer the underlying business, service, or route behavior.`,
  };
}

function domainActionCallerOwnedMethodRow(
  axis: AppBuilderInputFacetValueAxis,
  value: string,
): AppBuilderInputFacetValueSourceLoweringSupportRow {
  return {
    inputFacetId: AppBuilderInputFacetId.DomainActions,
    axis,
    value,
    supportKind: AppBuilderInputFacetValueSourceLoweringSupportKind.CallerOwnedTypeScriptMethod,
    targetRefs: [DOMAIN_COMMAND_ACTION_REF],
    requiredConditions: [
      'The request selects one explicit actionName from DomainActions.',
      'The selected action name is TypeScript-safe.',
      'methodBodyStatements is supplied explicitly unless a derived local method row also applies.',
    ],
    summary: `Domain action ${axis} '${value}' can be emitted as a TypeScript class-member method when the caller owns the method body.`,
  };
}

function domainActionDerivedMethodRows(
  value: string,
): readonly AppBuilderInputFacetValueSourceLoweringSupportRow[] {
  switch (value) {
    case AppBuilderDomainActionKind.Create:
      return [{
        inputFacetId: AppBuilderInputFacetId.DomainActions,
        axis: AppBuilderInputFacetValueAxis.DomainActionKind,
        value,
        supportKind: AppBuilderInputFacetValueSourceLoweringSupportKind.DerivedLocalTypeScriptMethod,
        targetRefs: [DOMAIN_COMMAND_ACTION_REF],
        requiredConditions: [
          'The action scope is omitted, form, or collection.',
          'Local view-model collection state is selected.',
          'Exactly one domain entity has numeric identity and a collection member name.',
          'No explicit method parameters are supplied.',
          'inputFieldNames are omitted or all name known domain fields.',
        ],
        summary: 'Create actions can derive a narrow local collection push method for small first-ring generated apps.',
      }];
    case AppBuilderDomainActionKind.Complete:
      return [{
        inputFacetId: AppBuilderInputFacetId.DomainActions,
        axis: AppBuilderInputFacetValueAxis.DomainActionKind,
        value,
        supportKind: AppBuilderInputFacetValueSourceLoweringSupportKind.DerivedLocalTypeScriptMethod,
        targetRefs: [DOMAIN_COMMAND_ACTION_REF],
        requiredConditions: [
          'The action scope is entity.',
          'mutatesState is true.',
          'Local view-model collection state is selected.',
          'Exactly one method parameter is supplied with the selected entity type.',
          'Exactly one compatible boolean field is selected or available.',
        ],
        summary: 'Complete actions can derive a narrow local entity boolean mutation method for row-level first-ring generated apps.',
      }];
    default:
      return [];
  }
}

function domainActionNavigationRows(
  value: string,
): readonly AppBuilderInputFacetValueSourceLoweringSupportRow[] {
  if (value !== AppBuilderDomainActionScope.Navigation) {
    return [];
  }
  return [{
    inputFacetId: AppBuilderInputFacetId.DomainActions,
    axis: AppBuilderInputFacetValueAxis.DomainActionScope,
    value,
    supportKind: AppBuilderInputFacetValueSourceLoweringSupportKind.RouterLoadNavigation,
    targetRefs: [ROUTE_NAVIGATION_ACTION_REF],
    requiredConditions: [
      'The request selects one explicit navigation-scoped actionName from DomainActions.',
      'linkText is supplied explicitly so app-builder does not invent visible copy.',
      'Router-backed list/detail derives the route instruction and route params from its route topology; standalone route-navigation invocations still need explicit route fields.',
    ],
    summary: 'Navigation-scoped domain actions can be emitted as Aurelia router load links when route and visible text inputs are explicit.',
  }];
}
