import { BuiltInResourcePackage } from '../resources/built-in-resources.js';
import { ResourceDefinitionKind } from '../resources/resource-kind.js';
import {
  AU_COMPOSE_RESOURCE_NAME,
} from '../template/au-compose-source.js';
import {
  AU_SLOT_RESOURCE_NAME,
} from '../template/au-slot-source.js';
import {
  RouterInstructionResourceName,
} from '../router/route-instruction-source.js';
import {
  ROUTER_VIEWPORT_RESOURCE_NAME,
} from '../router/viewport-source.js';
import {
  VALIDATION_CONTAINER_RESOURCE_NAME,
  VALIDATION_ERRORS_RESOURCE_NAME,
} from '../validation/validation-html-source.js';
import {
  AppBuilderPartApplicationSiteKind,
  AppBuilderPartOperationKind,
  AppBuilderPartSlotKind,
} from './part-application.js';
import {
  appBuilderBuiltInResourceRef,
  type AppBuilderBuiltInResourceRef,
} from './part-resource.js';

/** Framework-provided custom elements and custom attributes available as app-builder parts. */

/** Stable identity of a framework-provided component. */
export enum AppBuilderFrameworkComponentId {
  /** `<au-compose>` dynamic component composition. */
  AuCompose = 'au-compose',
  /** `<au-slot>` named content projection slot. */
  AuSlot = 'au-slot',
  /** `focus` two-way element focus control. */
  Focus = 'focus',
  /** `show` visibility toggle (keeps the element in the DOM). */
  Show = 'show',
  /** `<au-viewport>` router viewport host (router plugin). */
  Viewport = 'viewport',
  /** `load` router navigation link attribute (router plugin). */
  Load = 'load',
  /** `href` router-managed href attribute (router plugin). */
  Href = 'href',
  /** `validation-errors` error-exposing attribute (validation-html plugin). */
  ValidationErrors = 'validation-errors',
  /** `<validation-container>` error-display wrapper (validation-html plugin). */
  ValidationContainer = 'validation-container',
}

/** One neutral framework component: the built-in custom element/attribute and its authoring form. */
export interface AppBuilderFrameworkComponentDescriptor {
  readonly id: AppBuilderFrameworkComponentId;
  readonly title: string;
  readonly summary: string;
  /** Built-in resource catalog entry that owns the element/attribute name. */
  readonly resource: AppBuilderBuiltInResourceRef;
  /** Display-only syntax cue; lowering must use operation/slot metadata instead. */
  readonly syntaxCue: string;
  /** Source locus families where this framework resource can be applied. */
  readonly applicationSites: readonly AppBuilderPartApplicationSiteKind[];
  /** Source-lowering operation family for this framework resource. */
  readonly operationKind: AppBuilderPartOperationKind;
  /** Slots required before this part can lower to template source. */
  readonly requiredSlotKinds: readonly AppBuilderPartSlotKind[];
  /** Optional slots this part may accept for richer source generation. */
  readonly optionalSlotKinds: readonly AppBuilderPartSlotKind[];
}

export const APP_BUILDER_FRAMEWORK_COMPONENTS: readonly AppBuilderFrameworkComponentDescriptor[] = [
  {
    id: AppBuilderFrameworkComponentId.AuCompose,
    title: 'Au Compose',
    summary: 'Dynamically compose a component/view at runtime from a bound component, model, and template.',
    resource: appBuilderBuiltInResourceRef(BuiltInResourcePackage.RuntimeHtml, ResourceDefinitionKind.CustomElement, AU_COMPOSE_RESOURCE_NAME),
    syntaxCue: '<au-compose component.bind="...">',
    applicationSites: [AppBuilderPartApplicationSiteKind.TemplateElement],
    operationKind: AppBuilderPartOperationKind.ApplyFrameworkResource,
    requiredSlotKinds: [],
    optionalSlotKinds: [
      AppBuilderPartSlotKind.CompositionComponentExpression,
      AppBuilderPartSlotKind.CompositionTemplateExpression,
      AppBuilderPartSlotKind.CompositionModelExpression,
      AppBuilderPartSlotKind.CompositionScopeBehavior,
      AppBuilderPartSlotKind.CompositionTagName,
      AppBuilderPartSlotKind.CompositionFlushMode,
    ],
  },
  {
    id: AppBuilderFrameworkComponentId.AuSlot,
    title: 'Au Slot',
    summary: 'Declare a named content projection slot for composed/parent content.',
    resource: appBuilderBuiltInResourceRef(BuiltInResourcePackage.RuntimeHtml, ResourceDefinitionKind.CustomElement, AU_SLOT_RESOURCE_NAME),
    syntaxCue: '<au-slot name="...">',
    applicationSites: [AppBuilderPartApplicationSiteKind.TemplateElement],
    operationKind: AppBuilderPartOperationKind.ApplyFrameworkResource,
    requiredSlotKinds: [],
    optionalSlotKinds: [AppBuilderPartSlotKind.ProjectionSlotName],
  },
  {
    id: AppBuilderFrameworkComponentId.Focus,
    title: 'Focus',
    summary: 'Two-way control and observation of an element\'s focus state.',
    resource: appBuilderBuiltInResourceRef(BuiltInResourcePackage.RuntimeHtml, ResourceDefinitionKind.CustomAttribute, 'focus'),
    syntaxCue: 'focus.bind',
    applicationSites: [AppBuilderPartApplicationSiteKind.TemplateAttribute],
    operationKind: AppBuilderPartOperationKind.ApplyFrameworkResource,
    requiredSlotKinds: [AppBuilderPartSlotKind.BindingExpression],
    optionalSlotKinds: [],
  },
  {
    id: AppBuilderFrameworkComponentId.Show,
    title: 'Show',
    summary: 'Toggle element visibility (display) without removing it from the DOM; aliased as hide.',
    resource: appBuilderBuiltInResourceRef(BuiltInResourcePackage.RuntimeHtml, ResourceDefinitionKind.CustomAttribute, 'show'),
    syntaxCue: 'show.bind',
    applicationSites: [AppBuilderPartApplicationSiteKind.TemplateAttribute],
    operationKind: AppBuilderPartOperationKind.ApplyFrameworkResource,
    requiredSlotKinds: [AppBuilderPartSlotKind.BindingExpression],
    optionalSlotKinds: [],
  },
  {
    id: AppBuilderFrameworkComponentId.Viewport,
    title: 'Viewport',
    summary: 'Host element where the router renders the active routed component; supports name, used-by, default, and fallback bindables.',
    resource: appBuilderBuiltInResourceRef(BuiltInResourcePackage.Router, ResourceDefinitionKind.CustomElement, ROUTER_VIEWPORT_RESOURCE_NAME),
    syntaxCue: '<au-viewport name="main">',
    applicationSites: [AppBuilderPartApplicationSiteKind.TemplateElement],
    operationKind: AppBuilderPartOperationKind.ApplyFrameworkResource,
    requiredSlotKinds: [],
    optionalSlotKinds: [
      AppBuilderPartSlotKind.ViewportName,
      AppBuilderPartSlotKind.ViewportUsedBy,
      AppBuilderPartSlotKind.ViewportDefault,
      AppBuilderPartSlotKind.ViewportFallback,
    ],
  },
  {
    id: AppBuilderFrameworkComponentId.Load,
    title: 'Load',
    summary: 'Turn an element into a router navigation trigger for a route/instruction, optionally with params, context, active state, or target attribute.',
    resource: appBuilderBuiltInResourceRef(BuiltInResourcePackage.Router, ResourceDefinitionKind.CustomAttribute, RouterInstructionResourceName.Load),
    syntaxCue: 'load="ROUTE"',
    applicationSites: [AppBuilderPartApplicationSiteKind.TemplateAttribute],
    operationKind: AppBuilderPartOperationKind.ApplyFrameworkResource,
    requiredSlotKinds: [AppBuilderPartSlotKind.RouteInstruction],
    optionalSlotKinds: [
      AppBuilderPartSlotKind.RouteParamsExpression,
      AppBuilderPartSlotKind.RouteContextExpression,
      AppBuilderPartSlotKind.RouteActiveExpression,
      AppBuilderPartSlotKind.RouteTargetAttributeName,
    ],
  },
  {
    id: AppBuilderFrameworkComponentId.Href,
    title: 'Href',
    summary: 'Router-managed href that navigates within the app instead of a full page load.',
    resource: appBuilderBuiltInResourceRef(BuiltInResourcePackage.Router, ResourceDefinitionKind.CustomAttribute, RouterInstructionResourceName.Href),
    syntaxCue: 'href="ROUTE"',
    applicationSites: [AppBuilderPartApplicationSiteKind.TemplateAttribute],
    operationKind: AppBuilderPartOperationKind.ApplyFrameworkResource,
    requiredSlotKinds: [AppBuilderPartSlotKind.RouteInstruction],
    optionalSlotKinds: [],
  },
  {
    id: AppBuilderFrameworkComponentId.ValidationErrors,
    title: 'Validation Errors',
    summary: 'Expose the validation errors for a scope/binding so they can be displayed.',
    resource: appBuilderBuiltInResourceRef(BuiltInResourcePackage.ValidationHtml, ResourceDefinitionKind.CustomAttribute, VALIDATION_ERRORS_RESOURCE_NAME),
    syntaxCue: 'validation-errors.from-view="ERRORS"',
    applicationSites: [AppBuilderPartApplicationSiteKind.TemplateAttribute],
    operationKind: AppBuilderPartOperationKind.ApplyFrameworkResource,
    requiredSlotKinds: [AppBuilderPartSlotKind.ValidationErrorsExpression],
    optionalSlotKinds: [AppBuilderPartSlotKind.ValidationControllerExpression],
  },
  {
    id: AppBuilderFrameworkComponentId.ValidationContainer,
    title: 'Validation Container',
    summary: 'Wrap content with built-in validation error display for its bindings.',
    resource: appBuilderBuiltInResourceRef(BuiltInResourcePackage.ValidationHtml, ResourceDefinitionKind.CustomElement, VALIDATION_CONTAINER_RESOURCE_NAME),
    syntaxCue: '<validation-container>',
    applicationSites: [AppBuilderPartApplicationSiteKind.TemplateElement],
    operationKind: AppBuilderPartOperationKind.ApplyFrameworkResource,
    requiredSlotKinds: [],
    optionalSlotKinds: [
      AppBuilderPartSlotKind.ValidationErrorsExpression,
      AppBuilderPartSlotKind.ValidationControllerExpression,
    ],
  },
];

/** Look up a framework-component descriptor by id. */
export function appBuilderFrameworkComponentDescriptor(id: AppBuilderFrameworkComponentId): AppBuilderFrameworkComponentDescriptor {
  const component = APP_BUILDER_FRAMEWORK_COMPONENTS.find((candidate) => candidate.id === id);
  if (component == null) {
    throw new Error(`Unknown app-builder framework component '${id}'.`);
  }
  return component;
}
