import { AppBuilderBindingBehaviorId } from './binding-behavior-catalog.js';
import { AppBuilderBindingPartId } from './binding-part-catalog.js';
import { AppBuilderComponentLifecycleId } from './component-lifecycle-catalog.js';
import {
  AppBuilderChoiceOptionBindingKind,
  AppBuilderControlId,
} from './control-catalog.js';
import {
  AppBuilderFrameworkApiId,
  appBuilderNamedResourceFrameworkApiIds,
  appBuilderNamedResourceNameSlotKind,
} from './framework-api-catalog.js';
import { AppBuilderFrameworkComponentId } from './framework-component-catalog.js';
import { AppBuilderFrameworkSyntaxId } from './framework-syntax-catalog.js';
import { AppBuilderResourceMetadataId } from './resource-metadata-catalog.js';
import {
  authoredTemplateAttributeText,
  type AuthoredTemplateChildSource,
  type AuthoredTemplateAttributeSource,
} from '../template/authored-template-source.js';
import {
  AppBuilderPartApplicationSiteKind,
  AppBuilderPartSlotKind,
} from './part-application.js';
import { AppBuilderPartKind } from './part-catalog.js';
import {
  AppBuilderPartSourceFragmentKind,
  type AppBuilderBindingExpressionPartSourceFragment,
  type AppBuilderPartSourceFragment,
  type AppBuilderTemplateAttributePartSourceFragment,
  type AppBuilderTextInterpolationPartSourceFragment,
  type AppBuilderTypeScriptDecoratorPartSourceFragment,
  type AppBuilderTypeScriptExpressionPartSourceFragment,
  type AppBuilderTypeScriptClassMemberPartSourceFragment,
  type AppBuilderTypeScriptObjectPropertyPartSourceFragment,
  type AppBuilderTemplateAttributeSource,
  type AppBuilderTemplateElementPartSourceFragment,
  type AppBuilderTemplateElementSource,
} from './part-source-invocation.js';
import {
  appendAppBuilderTemplateElementAttributes,
  appBuilderTemplateElementFromParts,
  lowerAppBuilderPartSourceFragment,
  lowerAppBuilderPartSourceText,
} from './part-source-lowering.js';
import { AppBuilderStructuralPartId } from './structural-part-catalog.js';
import {
  indentSourceLines,
  singleQuotedTypeScriptStringLiteralText,
} from '../source-plan/source-template.js';
import {
  kebabSourceName,
  lowerCamelSourceName,
  pascalSourceName,
  sourceNameWords,
} from '../source-plan/source-name.js';
import {
  type NamedResourceDefinitionKind,
} from '../resources/resource-kind.js';
import type { AppTaskSlot } from '../configuration/app-task.js';
import {
  routeContextParameterObjectTypeSourceText,
  type RouteContextParameterMergeStrategySource,
  type RouteContextParameterTypeMemberSource,
} from '../router/route-context-source.js';
import {
  routerRouteConfigurationObjectExpressionSourceText,
  type RouterRouteDecoratorSourceRequest,
} from '../router/route-configuration-source.js';
import type {
  AppBuilderSeedRecord,
  AppBuilderSeedRecordPrimitive,
  AppBuilderSeedRecordValue,
} from './seed-data.js';

/** Option-domain slots used when a choice control lowers from a domain field. */
export interface AppBuilderChoiceControlElementOptions {
  readonly optionDomainExpression: string;
  readonly optionLocalName?: string;
  readonly optionValueExpression?: string;
  readonly optionBindingKind?: AppBuilderChoiceOptionBindingKind;
  readonly optionLabelExpression?: string;
  readonly matcherExpression?: string;
}

/** Lower a native app-builder control part and keep its structured fragment. */
export function appBuilderControlElementFragment(
  controlId: AppBuilderControlId,
  bindingExpression: string,
): AppBuilderTemplateElementPartSourceFragment {
  return lowerAppBuilderPartSourceFragment({
    partKind: AppBuilderPartKind.Control,
    partId: controlId,
    applicationSite: AppBuilderPartApplicationSiteKind.TemplateElement,
    slotAssignments: [
      { slotKind: AppBuilderPartSlotKind.BindingExpression, value: bindingExpression },
    ],
  }, AppBuilderPartSourceFragmentKind.TemplateElement);
}

/** Lower a native app-builder control part and return its structured element source. */
export function appBuilderControlElementSource(
  controlId: AppBuilderControlId,
  bindingExpression: string,
): AppBuilderTemplateElementSource {
  return appBuilderControlElementFragment(controlId, bindingExpression).templateElement;
}

/** Lower a native app-builder control part to authored template text. */
export function appBuilderControlElement(
  controlId: AppBuilderControlId,
  bindingExpression: string,
): string {
  return appBuilderControlElementFragment(controlId, bindingExpression).text;
}

/** Format generated TypeScript class members while keeping simple field runs compact. */
export function appBuilderTypeScriptClassMemberFragmentsText(
  fragments: readonly { readonly text: string }[],
  indent = '  ',
): string {
  const texts = fragments
    .map((fragment) => fragment.text.trimEnd())
    .filter((text) => text.length > 0);
  if (texts.length === 0) {
    return '';
  }

  let body = indentSourceLines(texts[0]!, indent);
  for (let index = 1; index < texts.length; index++) {
    const previous = texts[index - 1]!;
    const current = texts[index]!;
    const separator = typeScriptClassMemberFragmentsCanShareLineGroup(previous, current) ? '\n' : '\n\n';
    body += `${separator}${indentSourceLines(current, indent)}`;
  }
  return body;
}

function typeScriptClassMemberFragmentsCanShareLineGroup(
  previous: string,
  current: string,
): boolean {
  return isSingleLineTypeScriptFieldDeclaration(previous)
    && isSingleLineTypeScriptFieldDeclaration(current);
}

function isSingleLineTypeScriptFieldDeclaration(text: string): boolean {
  const trimmed = text.trim();
  return trimmed.length > 0
    && !trimmed.includes('\n')
    && trimmed.endsWith(';')
    && /^(?:(?:public|private|protected|readonly|static)\s+)*[$A-Z_a-z][$\w]*(?:\?|!)?:\s/.test(trimmed);
}

/** Lower a choice control with its option-domain slots and keep its structured fragment. */
export function appBuilderChoiceControlElementFragment(
  controlId: AppBuilderControlId,
  bindingExpression: string,
  options: AppBuilderChoiceControlElementOptions,
): AppBuilderTemplateElementPartSourceFragment {
  return lowerAppBuilderPartSourceFragment({
    partKind: AppBuilderPartKind.Control,
    partId: controlId,
    applicationSite: AppBuilderPartApplicationSiteKind.TemplateElement,
    slotAssignments: appendOptionalPartSlots([
      { slotKind: AppBuilderPartSlotKind.BindingExpression, value: bindingExpression },
      { slotKind: AppBuilderPartSlotKind.ValueDomainExpression, value: options.optionDomainExpression },
    ], [
      [AppBuilderPartSlotKind.LocalName, options.optionLocalName],
      [AppBuilderPartSlotKind.OptionValueExpression, options.optionValueExpression],
      [AppBuilderPartSlotKind.OptionBindingKind, options.optionBindingKind],
      [AppBuilderPartSlotKind.OptionLabelExpression, options.optionLabelExpression],
      [AppBuilderPartSlotKind.MatcherExpression, options.matcherExpression],
    ]),
  }, AppBuilderPartSourceFragmentKind.TemplateElement);
}

/** Lower a choice control with its option-domain slots and return its structured element source. */
export function appBuilderChoiceControlElementSource(
  controlId: AppBuilderControlId,
  bindingExpression: string,
  options: AppBuilderChoiceControlElementOptions,
): AppBuilderTemplateElementSource {
  return appBuilderChoiceControlElementFragment(controlId, bindingExpression, options).templateElement;
}

/** Lower a choice control with its option-domain slots to authored template text. */
export function appBuilderChoiceControlElement(
  controlId: AppBuilderControlId,
  bindingExpression: string,
  options: AppBuilderChoiceControlElementOptions,
): string {
  return appBuilderChoiceControlElementFragment(controlId, bindingExpression, options).text;
}

/** Lower a text input and append authored attributes without reparsing the generated element. */
export function appBuilderTextInputElementFragment(
  bindingExpression: string,
  extraAttributes: readonly AuthoredTemplateAttributeSource[] = [],
): AppBuilderTemplateElementPartSourceFragment {
  return appendAppBuilderTemplateElementAttributes(
    appBuilderControlElementFragment(AppBuilderControlId.TextInput, bindingExpression),
    extraAttributes,
  );
}

/** Lower a text input and append authored attributes without reparsing the generated element. */
export function appBuilderTextInputElement(
  bindingExpression: string,
  extraAttributes: readonly AuthoredTemplateAttributeSource[] = [],
): string {
  return appBuilderTextInputElementFragment(bindingExpression, extraAttributes).text;
}

/** Lower a text input and append authored attributes while preserving structured source. */
export function appBuilderTextInputElementSource(
  bindingExpression: string,
  extraAttributes: readonly AuthoredTemplateAttributeSource[] = [],
): AppBuilderTemplateElementSource {
  return appBuilderTextInputElementFragment(bindingExpression, extraAttributes).templateElement;
}

/** Compose an authored template element from source-lowering attributes without hand-writing start/end tags. */
export function appBuilderTemplateElementText(
  tagName: string,
  attributes: readonly AuthoredTemplateAttributeSource[] = [],
  childText: string | null = null,
  children: readonly AuthoredTemplateChildSource[] = [],
): string {
  return appBuilderTemplateElementFragment(
    tagName,
    attributes,
    childText,
    children,
  ).text;
}

/** Compose an authored template element fragment from source-lowering attributes. */
export function appBuilderTemplateElementFragment(
  tagName: string,
  attributes: readonly AuthoredTemplateAttributeSource[] = [],
  childText: string | null = null,
  children: readonly AuthoredTemplateChildSource[] = [],
): AppBuilderTemplateElementPartSourceFragment {
  return appBuilderTemplateElementFromParts(
    tagName,
    attributes.filter((attribute) => attribute.rawName.trim().length > 0).map((attribute) => ({
      rawName: attribute.rawName.trim(),
      rawValue: attribute.rawValue,
    })),
    childText,
    children,
  );
}

/** Compose an authored template element source from source-lowering attributes. */
export function appBuilderTemplateElementSource(
  tagName: string,
  attributes: readonly AuthoredTemplateAttributeSource[] = [],
  childText: string | null = null,
  children: readonly AuthoredTemplateChildSource[] = [],
): AppBuilderTemplateElementSource {
  return appBuilderTemplateElementFragment(tagName, attributes, childText, children).templateElement;
}

/** Lower an app-builder part invocation and read its structured template attribute source. */
export function lowerAppBuilderPartTemplateAttributeFragment(
  invocation: Parameters<typeof lowerAppBuilderPartSourceFragment>[0],
): AppBuilderTemplateAttributePartSourceFragment {
  return lowerAppBuilderPartSourceFragment(invocation, AppBuilderPartSourceFragmentKind.TemplateAttribute);
}

/** Lower an app-builder part invocation and read its structured template attribute source. */
export function lowerAppBuilderPartTemplateAttributeSource(
  invocation: Parameters<typeof lowerAppBuilderPartSourceFragment>[0],
): AppBuilderTemplateAttributeSource {
  return lowerAppBuilderPartTemplateAttributeFragment(invocation).templateAttribute;
}

/** Lower an `as-element` compiler-control attribute. */
export function appBuilderAsElementAttributeSource(
  customElementResourceName: string,
): AppBuilderTemplateAttributeSource {
  return appBuilderAsElementAttributeFragment(customElementResourceName).templateAttribute;
}

/** Lower an `as-element` compiler-control attribute. */
export function appBuilderAsElementAttributeFragment(
  customElementResourceName: string,
): AppBuilderTemplateAttributePartSourceFragment {
  return lowerAppBuilderPartTemplateAttributeFragment({
    partKind: AppBuilderPartKind.FrameworkSyntax,
    partId: AppBuilderFrameworkSyntaxId.AsElement,
    applicationSite: AppBuilderPartApplicationSiteKind.TemplateAttribute,
    slotAssignments: [
      { slotKind: AppBuilderPartSlotKind.CustomElementResourceName, value: customElementResourceName },
    ],
  });
}

/** Lower an `as-element` compiler-control attribute. */
export function appBuilderAsElementAttribute(
  customElementResourceName: string,
): string {
  return authoredTemplateAttributeText(appBuilderAsElementAttributeSource(customElementResourceName));
}

/** Lower a `containerless` compiler-control attribute. */
export function appBuilderContainerlessAttributeSource(): AppBuilderTemplateAttributeSource {
  return appBuilderContainerlessAttributeFragment().templateAttribute;
}

/** Lower a `containerless` compiler-control attribute. */
export function appBuilderContainerlessAttributeFragment(): AppBuilderTemplateAttributePartSourceFragment {
  return lowerAppBuilderPartTemplateAttributeFragment({
    partKind: AppBuilderPartKind.FrameworkSyntax,
    partId: AppBuilderFrameworkSyntaxId.Containerless,
    applicationSite: AppBuilderPartApplicationSiteKind.TemplateAttribute,
  });
}

/** Lower a `containerless` compiler-control attribute. */
export function appBuilderContainerlessAttribute(): string {
  return authoredTemplateAttributeText(appBuilderContainerlessAttributeSource());
}

/** Lower a resource definition `dependencies` object property. */
export function appBuilderResourceDependenciesProperty(
  dependencyExpressions: readonly string[],
): string {
  return appBuilderResourceDependenciesPropertyFragment(dependencyExpressions).text;
}

/** Lower a resource definition `dependencies` object property. */
export function appBuilderResourceDependenciesPropertyFragment(
  dependencyExpressions: readonly string[],
): AppBuilderTypeScriptObjectPropertyPartSourceFragment {
  return lowerAppBuilderPartSourceFragment({
    partKind: AppBuilderPartKind.ResourceMetadata,
    partId: AppBuilderResourceMetadataId.LocalDependencies,
    applicationSite: AppBuilderPartApplicationSiteKind.TypeScriptObjectProperty,
    slotAssignments: [
      {
        slotKind: AppBuilderPartSlotKind.ResourceDependencyExpressionList,
        value: dependencyExpressions.join(', '),
      },
    ],
  }, AppBuilderPartSourceFragmentKind.TypeScriptObjectProperty);
}

/** Lower a named Aurelia resource decorator through the app-builder part vocabulary. */
export function appBuilderNamedResourceDecoratorFragment(
  resourceKind: NamedResourceDefinitionKind,
  name: string,
  dependencyExpressions: readonly string[] = [],
): AppBuilderTypeScriptDecoratorPartSourceFragment {
  return lowerAppBuilderPartSourceFragment({
    partKind: AppBuilderPartKind.FrameworkApi,
    partId: appBuilderNamedResourceFrameworkApiIds(resourceKind).decorator,
    applicationSite: AppBuilderPartApplicationSiteKind.TypeScriptDecorator,
    slotAssignments: appendOptionalPartSlots([
      { slotKind: appBuilderNamedResourceNameSlotKind(resourceKind), value: name },
    ], [
      [AppBuilderPartSlotKind.ResourceDependencyExpressionList, dependencyExpressionList(dependencyExpressions)],
    ]),
  }, AppBuilderPartSourceFragmentKind.TypeScriptDecorator);
}

/** Lower static `$au` metadata for a named Aurelia resource through the app-builder part vocabulary. */
export function appBuilderNamedResourceStaticAuFragment(
  resourceKind: NamedResourceDefinitionKind,
  name: string,
  dependencyExpressions: readonly string[] = [],
): AppBuilderTypeScriptClassMemberPartSourceFragment {
  return lowerAppBuilderPartSourceFragment({
    partKind: AppBuilderPartKind.FrameworkApi,
    partId: appBuilderNamedResourceFrameworkApiIds(resourceKind).staticAu,
    applicationSite: AppBuilderPartApplicationSiteKind.TypeScriptClassMember,
    slotAssignments: appendOptionalPartSlots([
      { slotKind: appBuilderNamedResourceNameSlotKind(resourceKind), value: name },
    ], [
      [AppBuilderPartSlotKind.ResourceDependencyExpressionList, dependencyExpressionList(dependencyExpressions)],
    ]),
  }, AppBuilderPartSourceFragmentKind.TypeScriptClassMember);
}

/** Lower a named Aurelia resource `.define(...)` call through the app-builder part vocabulary. */
export function appBuilderNamedResourceDefineCallExpressionFragment(
  resourceKind: NamedResourceDefinitionKind,
  name: string,
  typeExpression: string,
  dependencyExpressions: readonly string[] = [],
): AppBuilderTypeScriptExpressionPartSourceFragment {
  return lowerAppBuilderPartSourceFragment({
    partKind: AppBuilderPartKind.FrameworkApi,
    partId: appBuilderNamedResourceFrameworkApiIds(resourceKind).defineCall,
    applicationSite: AppBuilderPartApplicationSiteKind.TypeScriptExpression,
    slotAssignments: appendOptionalPartSlots([
      { slotKind: appBuilderNamedResourceNameSlotKind(resourceKind), value: name },
      { slotKind: AppBuilderPartSlotKind.ResourceTypeExpression, value: typeExpression },
    ], [
      [AppBuilderPartSlotKind.ResourceDependencyExpressionList, dependencyExpressionList(dependencyExpressions)],
    ]),
  }, AppBuilderPartSourceFragmentKind.TypeScriptExpression);
}

/** Lower an `AttributePattern.create(...)` expression through the app-builder part vocabulary. */
export function appBuilderAttributePatternCreateExpressionFragment(
  patternDefinitionExpressionList: string,
  typeExpression: string,
): AppBuilderTypeScriptExpressionPartSourceFragment {
  return lowerAppBuilderPartSourceFragment({
    partKind: AppBuilderPartKind.FrameworkApi,
    partId: AppBuilderFrameworkApiId.AttributePatternCreate,
    applicationSite: AppBuilderPartApplicationSiteKind.TypeScriptExpression,
    slotAssignments: [
      {
        slotKind: AppBuilderPartSlotKind.AttributePatternDefinitionExpressionList,
        value: patternDefinitionExpressionList,
      },
      {
        slotKind: AppBuilderPartSlotKind.ResourceTypeExpression,
        value: typeExpression,
      },
    ],
  }, AppBuilderPartSourceFragmentKind.TypeScriptExpression);
}

/** Lower Aurelia's `@customElement(...)` decorator through the app-builder part vocabulary. */
export function appBuilderCustomElementDecoratorFragment(
  name: string,
  templateExpression?: string | null,
  dependencyExpressions: readonly string[] = [],
): AppBuilderTypeScriptDecoratorPartSourceFragment {
  return lowerAppBuilderPartSourceFragment({
    partKind: AppBuilderPartKind.FrameworkApi,
    partId: AppBuilderFrameworkApiId.CustomElementDecorator,
    applicationSite: AppBuilderPartApplicationSiteKind.TypeScriptDecorator,
    slotAssignments: appendOptionalPartSlots([
      { slotKind: AppBuilderPartSlotKind.CustomElementResourceName, value: name },
    ], [
      [AppBuilderPartSlotKind.ResourceTemplateExpression, templateExpression ?? undefined],
      [AppBuilderPartSlotKind.ResourceDependencyExpressionList, dependencyExpressionList(dependencyExpressions)],
    ]),
  }, AppBuilderPartSourceFragmentKind.TypeScriptDecorator);
}

/** Lower Aurelia static `$au` custom-element metadata through the app-builder part vocabulary. */
export function appBuilderCustomElementStaticAuFragment(
  name: string,
  templateExpression?: string | null,
  dependencyExpressions: readonly string[] = [],
): AppBuilderTypeScriptClassMemberPartSourceFragment {
  return lowerAppBuilderPartSourceFragment({
    partKind: AppBuilderPartKind.FrameworkApi,
    partId: AppBuilderFrameworkApiId.CustomElementStaticAuDefinition,
    applicationSite: AppBuilderPartApplicationSiteKind.TypeScriptClassMember,
    slotAssignments: appendOptionalPartSlots([
      { slotKind: AppBuilderPartSlotKind.CustomElementResourceName, value: name },
    ], [
      [AppBuilderPartSlotKind.ResourceTemplateExpression, templateExpression ?? undefined],
      [AppBuilderPartSlotKind.ResourceDependencyExpressionList, dependencyExpressionList(dependencyExpressions)],
    ]),
  }, AppBuilderPartSourceFragmentKind.TypeScriptClassMember);
}

/** Lower Aurelia static `$au` custom-element metadata through the app-builder part vocabulary. */
export function appBuilderCustomElementStaticAu(
  name: string,
  templateExpression?: string | null,
  dependencyExpressions: readonly string[] = [],
): string {
  return appBuilderCustomElementStaticAuFragment(name, templateExpression, dependencyExpressions).text;
}

/** Lower Aurelia's `CustomElement.define(...)` through the app-builder part vocabulary. */
export function appBuilderCustomElementDefineCallExpressionFragment(
  name: string,
  typeExpression: string,
  templateExpression?: string | null,
  dependencyExpressions: readonly string[] = [],
): AppBuilderTypeScriptExpressionPartSourceFragment {
  return lowerAppBuilderPartSourceFragment({
    partKind: AppBuilderPartKind.FrameworkApi,
    partId: AppBuilderFrameworkApiId.CustomElementDefineCall,
    applicationSite: AppBuilderPartApplicationSiteKind.TypeScriptExpression,
    slotAssignments: appendOptionalPartSlots([
      { slotKind: AppBuilderPartSlotKind.CustomElementResourceName, value: name },
      { slotKind: AppBuilderPartSlotKind.ResourceTypeExpression, value: typeExpression },
    ], [
      [AppBuilderPartSlotKind.ResourceTemplateExpression, templateExpression ?? undefined],
      [AppBuilderPartSlotKind.ResourceDependencyExpressionList, dependencyExpressionList(dependencyExpressions)],
    ]),
  }, AppBuilderPartSourceFragmentKind.TypeScriptExpression);
}

/** Lower Aurelia's `CustomElement.define(...)` through the app-builder part vocabulary. */
export function appBuilderCustomElementDefineCallExpression(
  name: string,
  typeExpression: string,
  templateExpression?: string | null,
  dependencyExpressions: readonly string[] = [],
): string {
  return appBuilderCustomElementDefineCallExpressionFragment(
    name,
    typeExpression,
    templateExpression,
    dependencyExpressions,
  ).text;
}

/** Lower Aurelia's `@customElement(...)` decorator through the app-builder part vocabulary. */
export function appBuilderCustomElementDecorator(
  name: string,
  templateExpression?: string | null,
  dependencyExpressions: readonly string[] = [],
): string {
  return appBuilderCustomElementDecoratorFragment(name, templateExpression, dependencyExpressions).text;
}

/** Lower Aurelia's `@route(...)` decorator from structured route-config source models. */
export function appBuilderRouteDecoratorFragment(
  request: RouterRouteDecoratorSourceRequest,
): AppBuilderTypeScriptDecoratorPartSourceFragment {
  return appBuilderRouteDecoratorExpressionFragment(routerRouteConfigurationObjectExpressionSourceText(request));
}

/** Lower Aurelia's `@route(...)` decorator from a caller-owned route-config expression. */
export function appBuilderRouteDecorator(
  request: RouterRouteDecoratorSourceRequest,
): string {
  return appBuilderRouteDecoratorFragment(request).text;
}

/** Lower Aurelia's `@route(...)` decorator from a caller-owned route-config expression. */
export function appBuilderRouteDecoratorExpressionFragment(
  routeConfigurationExpression: string,
): AppBuilderTypeScriptDecoratorPartSourceFragment {
  return lowerAppBuilderPartSourceFragment({
    partKind: AppBuilderPartKind.FrameworkApi,
    partId: AppBuilderFrameworkApiId.RouteDecorator,
    applicationSite: AppBuilderPartApplicationSiteKind.TypeScriptDecorator,
    slotAssignments: [
      {
        slotKind: AppBuilderPartSlotKind.RouteConfigurationExpression,
        value: routeConfigurationExpression,
      },
    ],
  }, AppBuilderPartSourceFragmentKind.TypeScriptDecorator);
}

/** Lower Aurelia's `@route(...)` decorator from a caller-owned route-config expression. */
export function appBuilderRouteDecoratorExpression(
  routeConfigurationExpression: string,
): string {
  return appBuilderRouteDecoratorExpressionFragment(routeConfigurationExpression).text;
}

/** Lower `IRouteContext.getRouteParameters(...)` through the app-builder part vocabulary. */
export function appBuilderRouteContextParameterReadExpressionFragment(
  parameterTypeSource: string,
  options: {
    readonly receiverExpression?: string;
    readonly mergeStrategy?: RouteContextParameterMergeStrategySource;
    readonly includeQueryParams?: boolean;
  } = {},
): AppBuilderTypeScriptExpressionPartSourceFragment {
  return lowerAppBuilderPartSourceFragment({
    partKind: AppBuilderPartKind.FrameworkApi,
    partId: AppBuilderFrameworkApiId.RouteContextParameterRead,
    applicationSite: AppBuilderPartApplicationSiteKind.TypeScriptExpression,
    slotAssignments: appendOptionalPartSlots([
      { slotKind: AppBuilderPartSlotKind.RouteParameterType, value: parameterTypeSource },
    ], [
      [AppBuilderPartSlotKind.RouteContextReceiverExpression, options.receiverExpression],
      [AppBuilderPartSlotKind.RouteParameterMergeStrategy, options.mergeStrategy],
      [AppBuilderPartSlotKind.RouteIncludeQueryParams, options.includeQueryParams == null ? undefined : String(options.includeQueryParams)],
    ]),
  }, AppBuilderPartSourceFragmentKind.TypeScriptExpression);
}

/** Lower `IRouteContext.getRouteParameters(...)` through the app-builder part vocabulary. */
export function appBuilderRouteContextParameterReadExpression(
  parameterTypeSource: string,
  options: {
    readonly receiverExpression?: string;
    readonly mergeStrategy?: RouteContextParameterMergeStrategySource;
    readonly includeQueryParams?: boolean;
  } = {},
): string {
  return appBuilderRouteContextParameterReadExpressionFragment(parameterTypeSource, options).text;
}

/** Lower `IRouteContext.getRouteParameters(...)` from structured route-parameter type members. */
export function appBuilderRouteContextParameterReadExpressionFragmentForMembers(
  members: readonly RouteContextParameterTypeMemberSource[],
  options: {
    readonly receiverExpression?: string;
    readonly mergeStrategy?: RouteContextParameterMergeStrategySource;
    readonly includeQueryParams?: boolean;
  } = {},
): AppBuilderTypeScriptExpressionPartSourceFragment {
  const parameterTypeSource = routeContextParameterObjectTypeSourceText(members);
  if (parameterTypeSource == null) {
    throw new Error('App-builder route-context parameter read needs at least one declared parameter member.');
  }
  return appBuilderRouteContextParameterReadExpressionFragment(parameterTypeSource, options);
}

/** Lower `IRouteContext.getRouteParameters(...)` from structured route-parameter type members. */
export function appBuilderRouteContextParameterReadExpressionForMembers(
  members: readonly RouteContextParameterTypeMemberSource[],
  options: {
    readonly receiverExpression?: string;
    readonly mergeStrategy?: RouteContextParameterMergeStrategySource;
    readonly includeQueryParams?: boolean;
  } = {},
): string {
  return appBuilderRouteContextParameterReadExpressionFragmentForMembers(members, options).text;
}

/** Lower `@fromState(...)` from the state plugin through the app-builder part vocabulary. */
export function appBuilderFromStateDecoratorFragment(
  selectorExpression: string,
  storeName?: string,
): AppBuilderTypeScriptDecoratorPartSourceFragment {
  return lowerAppBuilderPartSourceFragment({
    partKind: AppBuilderPartKind.FrameworkApi,
    partId: AppBuilderFrameworkApiId.FromStateDecorator,
    applicationSite: AppBuilderPartApplicationSiteKind.TypeScriptDecorator,
    slotAssignments: appendOptionalPartSlots([
      { slotKind: AppBuilderPartSlotKind.StateSelectorExpression, value: selectorExpression },
    ], [
      [AppBuilderPartSlotKind.StateStoreName, storeName],
    ]),
  }, AppBuilderPartSourceFragmentKind.TypeScriptDecorator);
}

/** Lower `@fromState(...)` from the state plugin through the app-builder part vocabulary. */
export function appBuilderFromStateDecorator(
  selectorExpression: string,
  storeName?: string,
): string {
  return appBuilderFromStateDecoratorFragment(selectorExpression, storeName).text;
}

/** Lower Aurelia's `@computed(...)` decorator. */
export function appBuilderComputedDecorator(
  argumentExpression: string,
): string {
  return appBuilderComputedDecoratorFragment(argumentExpression).text;
}

/** Lower Aurelia's `@computed(...)` decorator. */
export function appBuilderComputedDecoratorFragment(
  argumentExpression: string,
): AppBuilderTypeScriptDecoratorPartSourceFragment {
  return lowerAppBuilderPartSourceFragment({
    partKind: AppBuilderPartKind.FrameworkApi,
    partId: AppBuilderFrameworkApiId.ComputedDecorator,
    applicationSite: AppBuilderPartApplicationSiteKind.TypeScriptDecorator,
    slotAssignments: [
      { slotKind: AppBuilderPartSlotKind.ComputedDecoratorArgumentExpression, value: argumentExpression },
    ],
  }, AppBuilderPartSourceFragmentKind.TypeScriptDecorator);
}

/** Lower an Aurelia `AppTask.*(...)` registry expression. */
export function appBuilderAppTaskRegistrationExpression(
  slot: AppTaskSlot,
  callbackExpression: string,
  keyExpression?: string,
): string {
  return appBuilderAppTaskRegistrationExpressionFragment(slot, callbackExpression, keyExpression).text;
}

/** Lower an Aurelia `AppTask.*(...)` registry expression. */
export function appBuilderAppTaskRegistrationExpressionFragment(
  slot: AppTaskSlot,
  callbackExpression: string,
  keyExpression?: string,
): AppBuilderTypeScriptExpressionPartSourceFragment {
  return lowerAppBuilderPartSourceFragment({
    partKind: AppBuilderPartKind.FrameworkApi,
    partId: AppBuilderFrameworkApiId.AppTaskRegistration,
    applicationSite: AppBuilderPartApplicationSiteKind.TypeScriptExpression,
    slotAssignments: appendOptionalPartSlots([
      { slotKind: AppBuilderPartSlotKind.AppTaskSlotName, value: slot },
      { slotKind: AppBuilderPartSlotKind.AppTaskCallbackExpression, value: callbackExpression },
    ], [
      [AppBuilderPartSlotKind.AppTaskKeyExpression, keyExpression],
    ]),
  }, AppBuilderPartSourceFragmentKind.TypeScriptExpression);
}

/** Lower an Aurelia component lifecycle hook method. */
export function appBuilderComponentLifecycleHookMethod(
  lifecycleId: AppBuilderComponentLifecycleId,
  bodyStatements?: string,
): string {
  return appBuilderComponentLifecycleHookMethodFragment(lifecycleId, bodyStatements).text;
}

/** Lower an Aurelia component lifecycle hook method. */
export function appBuilderComponentLifecycleHookMethodFragment(
  lifecycleId: AppBuilderComponentLifecycleId,
  bodyStatements?: string,
): AppBuilderTypeScriptClassMemberPartSourceFragment {
  return lowerAppBuilderPartSourceFragment({
    partKind: AppBuilderPartKind.ComponentLifecycle,
    partId: lifecycleId,
    applicationSite: AppBuilderPartApplicationSiteKind.TypeScriptClassMember,
    slotAssignments: appendOptionalPartSlots([], [
      [AppBuilderPartSlotKind.TypeScriptMethodBodyStatements, bodyStatements],
    ]),
  }, AppBuilderPartSourceFragmentKind.TypeScriptClassMember);
}

/** Lower an ordinary event listener binding-command attribute. */
export function appBuilderEventListenerAttributeSource(
  eventName: string,
  handlerExpression: string,
): AppBuilderTemplateAttributeSource {
  return appBuilderEventListenerAttributeFragment(eventName, handlerExpression).templateAttribute;
}

/** Lower an ordinary event listener binding-command attribute. */
export function appBuilderEventListenerAttributeFragment(
  eventName: string,
  handlerExpression: string,
): AppBuilderTemplateAttributePartSourceFragment {
  return lowerAppBuilderPartTemplateAttributeFragment({
    partKind: AppBuilderPartKind.BindingPart,
    partId: AppBuilderBindingPartId.EventListener,
    applicationSite: AppBuilderPartApplicationSiteKind.BindingCommandTarget,
    slotAssignments: [
      { slotKind: AppBuilderPartSlotKind.EventName, value: eventName },
      { slotKind: AppBuilderPartSlotKind.HandlerExpression, value: handlerExpression },
    ],
  });
}

/** Lower an ordinary event listener binding-command attribute. */
export function appBuilderEventListenerAttribute(
  eventName: string,
  handlerExpression: string,
): string {
  return authoredTemplateAttributeText(appBuilderEventListenerAttributeSource(eventName, handlerExpression));
}

/** Lower an event capture binding-command attribute. */
export function appBuilderEventCaptureListenerAttributeSource(
  eventName: string,
  handlerExpression: string,
): AppBuilderTemplateAttributeSource {
  return appBuilderEventCaptureListenerAttributeFragment(eventName, handlerExpression).templateAttribute;
}

/** Lower an event capture binding-command attribute. */
export function appBuilderEventCaptureListenerAttributeFragment(
  eventName: string,
  handlerExpression: string,
): AppBuilderTemplateAttributePartSourceFragment {
  return lowerAppBuilderPartTemplateAttributeFragment({
    partKind: AppBuilderPartKind.BindingPart,
    partId: AppBuilderBindingPartId.EventCaptureListener,
    applicationSite: AppBuilderPartApplicationSiteKind.BindingCommandTarget,
    slotAssignments: [
      { slotKind: AppBuilderPartSlotKind.EventName, value: eventName },
      { slotKind: AppBuilderPartSlotKind.HandlerExpression, value: handlerExpression },
    ],
  });
}

/** Lower an event capture binding-command attribute. */
export function appBuilderEventCaptureListenerAttribute(
  eventName: string,
  handlerExpression: string,
): string {
  return authoredTemplateAttributeText(appBuilderEventCaptureListenerAttributeSource(eventName, handlerExpression));
}

/** Lower an arbitrary `attribute.bind` binding-command attribute. */
export function appBuilderAttributeBindingAttributeSource(
  attributeName: string,
  bindingExpression: string,
): AppBuilderTemplateAttributeSource {
  return appBuilderAttributeBindingAttributeFragment(attributeName, bindingExpression).templateAttribute;
}

/** Lower an arbitrary `attribute.bind` binding-command attribute. */
export function appBuilderAttributeBindingAttributeFragment(
  attributeName: string,
  bindingExpression: string,
): AppBuilderTemplateAttributePartSourceFragment {
  return lowerAppBuilderPartTemplateAttributeFragment({
    partKind: AppBuilderPartKind.BindingPart,
    partId: AppBuilderBindingPartId.AttributeBinding,
    applicationSite: AppBuilderPartApplicationSiteKind.BindingCommandTarget,
    slotAssignments: [
      { slotKind: AppBuilderPartSlotKind.AttributeName, value: attributeName },
      { slotKind: AppBuilderPartSlotKind.BindingExpression, value: bindingExpression },
    ],
  });
}

/** Lower an arbitrary `attribute.bind` binding-command attribute. */
export function appBuilderAttributeBindingAttribute(
  attributeName: string,
  bindingExpression: string,
): string {
  return authoredTemplateAttributeText(appBuilderAttributeBindingAttributeSource(attributeName, bindingExpression));
}

/** Lower an arbitrary `attribute.to-view` binding-command attribute. */
export function appBuilderAttributeToViewBindingAttributeSource(
  attributeName: string,
  bindingExpression: string,
): AppBuilderTemplateAttributeSource {
  return appBuilderAttributeToViewBindingAttributeFragment(attributeName, bindingExpression).templateAttribute;
}

/** Lower an arbitrary `attribute.to-view` binding-command attribute. */
export function appBuilderAttributeToViewBindingAttributeFragment(
  attributeName: string,
  bindingExpression: string,
): AppBuilderTemplateAttributePartSourceFragment {
  return lowerAppBuilderPartTemplateAttributeFragment({
    partKind: AppBuilderPartKind.BindingPart,
    partId: AppBuilderBindingPartId.AttributeToViewBinding,
    applicationSite: AppBuilderPartApplicationSiteKind.BindingCommandTarget,
    slotAssignments: [
      { slotKind: AppBuilderPartSlotKind.AttributeName, value: attributeName },
      { slotKind: AppBuilderPartSlotKind.BindingExpression, value: bindingExpression },
    ],
  });
}

/** Lower an arbitrary `attribute.to-view` binding-command attribute. */
export function appBuilderAttributeToViewBindingAttribute(
  attributeName: string,
  bindingExpression: string,
): string {
  return authoredTemplateAttributeText(appBuilderAttributeToViewBindingAttributeSource(attributeName, bindingExpression));
}

/** Lower a single `token.class` class-toggle attribute. */
export function appBuilderClassTokenToggleAttributeSource(
  classToken: string,
  bindingExpression: string,
): AppBuilderTemplateAttributeSource {
  return appBuilderClassTokenToggleAttributeFragment(classToken, bindingExpression).templateAttribute;
}

/** Lower a single `token.class` class-toggle attribute. */
export function appBuilderClassTokenToggleAttributeFragment(
  classToken: string,
  bindingExpression: string,
): AppBuilderTemplateAttributePartSourceFragment {
  return lowerAppBuilderPartTemplateAttributeFragment({
    partKind: AppBuilderPartKind.BindingPart,
    partId: AppBuilderBindingPartId.ClassTokenToggle,
    applicationSite: AppBuilderPartApplicationSiteKind.BindingCommandTarget,
    slotAssignments: [
      { slotKind: AppBuilderPartSlotKind.ClassToken, value: classToken },
      { slotKind: AppBuilderPartSlotKind.BindingExpression, value: bindingExpression },
    ],
  });
}

/** Lower a single `token.class` class-toggle attribute. */
export function appBuilderClassTokenToggleAttribute(
  classToken: string,
  bindingExpression: string,
): string {
  return authoredTemplateAttributeText(appBuilderClassTokenToggleAttributeSource(classToken, bindingExpression));
}

/** Lower a text interpolation source fragment. */
export function appBuilderTextInterpolationFragment(
  bindingExpression: string,
): AppBuilderTextInterpolationPartSourceFragment {
  return lowerAppBuilderPartSourceFragment({
    partKind: AppBuilderPartKind.BindingPart,
    partId: AppBuilderBindingPartId.TextInterpolation,
    applicationSite: AppBuilderPartApplicationSiteKind.TextInterpolation,
    slotAssignments: [
      { slotKind: AppBuilderPartSlotKind.BindingExpression, value: bindingExpression },
    ],
  }, AppBuilderPartSourceFragmentKind.TextInterpolation);
}

/** Lower a text interpolation source fragment. */
export function appBuilderTextInterpolation(
  bindingExpression: string,
): string {
  return appBuilderTextInterpolationFragment(bindingExpression).text;
}

/** Lower a template-controller attribute, inferring branch sites for companion controllers. */
export function appBuilderTemplateControllerAttributeSource(
  structuralPartId: AppBuilderStructuralPartId,
  slotValues: readonly (readonly [AppBuilderPartSlotKind, string])[],
): AppBuilderTemplateAttributeSource {
  return appBuilderTemplateControllerAttributeFragment(structuralPartId, slotValues).templateAttribute;
}

/** Lower a template-controller attribute, inferring branch sites for companion controllers. */
export function appBuilderTemplateControllerAttributeFragment(
  structuralPartId: AppBuilderStructuralPartId,
  slotValues: readonly (readonly [AppBuilderPartSlotKind, string])[],
): AppBuilderTemplateAttributePartSourceFragment {
  return lowerAppBuilderPartTemplateAttributeFragment({
    partKind: AppBuilderPartKind.StructuralPart,
    partId: structuralPartId,
    applicationSite: appBuilderStructuralPartApplicationSite(structuralPartId),
    slotAssignments: slotValues.map(([slotKind, value]) => ({ slotKind, value })),
  });
}

/** Lower a template-controller attribute, inferring branch sites for companion controllers. */
export function appBuilderTemplateControllerAttribute(
  structuralPartId: AppBuilderStructuralPartId,
  slotValues: readonly (readonly [AppBuilderPartSlotKind, string])[],
): string {
  return authoredTemplateAttributeText(appBuilderTemplateControllerAttributeSource(structuralPartId, slotValues));
}

/** Lower a repeat template-controller attribute. */
export function appBuilderRepeatAttributeSource(
  localName: string,
  iterableExpression: string,
): AppBuilderTemplateAttributeSource {
  return appBuilderRepeatAttributeFragment(localName, iterableExpression).templateAttribute;
}

/** Lower a repeat template-controller attribute. */
export function appBuilderRepeatAttributeFragment(
  localName: string,
  iterableExpression: string,
): AppBuilderTemplateAttributePartSourceFragment {
  return appBuilderTemplateControllerAttributeFragment(AppBuilderStructuralPartId.Repeat, [
    [AppBuilderPartSlotKind.LocalName, localName],
    [AppBuilderPartSlotKind.IterableExpression, iterableExpression],
  ]);
}

/** Lower a repeat template-controller attribute. */
export function appBuilderRepeatAttribute(
  localName: string,
  iterableExpression: string,
): string {
  return authoredTemplateAttributeText(appBuilderRepeatAttributeSource(localName, iterableExpression));
}

/** Lower a state-plugin `.state` binding-command attribute. */
export function appBuilderStateBindingAttributeSource(
  targetName: string,
  bindingExpression: string,
  storeName?: string,
): AppBuilderTemplateAttributeSource {
  return appBuilderStateBindingAttributeFragment(targetName, bindingExpression, storeName).templateAttribute;
}

/** Lower a state-plugin `.state` binding-command attribute. */
export function appBuilderStateBindingAttributeFragment(
  targetName: string,
  bindingExpression: string,
  storeName?: string,
): AppBuilderTemplateAttributePartSourceFragment {
  return lowerAppBuilderPartTemplateAttributeFragment({
    partKind: AppBuilderPartKind.BindingPart,
    partId: AppBuilderBindingPartId.StateBinding,
    applicationSite: AppBuilderPartApplicationSiteKind.BindingCommandTarget,
    slotAssignments: optionalStateStoreSlot(storeName, [
      { slotKind: AppBuilderPartSlotKind.BindingCommandTargetName, value: targetName },
      { slotKind: AppBuilderPartSlotKind.BindingExpression, value: bindingExpression },
    ]),
  });
}

/** Lower a state-plugin `.state` binding-command attribute. */
export function appBuilderStateBindingAttribute(
  targetName: string,
  bindingExpression: string,
  storeName?: string,
): string {
  return authoredTemplateAttributeText(appBuilderStateBindingAttributeSource(targetName, bindingExpression, storeName));
}

/** Lower a state-plugin `.dispatch` binding-command attribute. */
export function appBuilderStateDispatchAttributeSource(
  eventName: string,
  bindingExpression: string,
  storeName?: string,
): AppBuilderTemplateAttributeSource {
  return appBuilderStateDispatchAttributeFragment(eventName, bindingExpression, storeName).templateAttribute;
}

/** Lower a state-plugin `.dispatch` binding-command attribute. */
export function appBuilderStateDispatchAttributeFragment(
  eventName: string,
  bindingExpression: string,
  storeName?: string,
): AppBuilderTemplateAttributePartSourceFragment {
  return lowerAppBuilderPartTemplateAttributeFragment({
    partKind: AppBuilderPartKind.BindingPart,
    partId: AppBuilderBindingPartId.StateDispatch,
    applicationSite: AppBuilderPartApplicationSiteKind.BindingCommandTarget,
    slotAssignments: optionalStateStoreSlot(storeName, [
      { slotKind: AppBuilderPartSlotKind.EventName, value: eventName },
      { slotKind: AppBuilderPartSlotKind.BindingExpression, value: bindingExpression },
    ]),
  });
}

/** Lower a state-plugin `.dispatch` binding-command attribute. */
export function appBuilderStateDispatchAttribute(
  eventName: string,
  bindingExpression: string,
  storeName?: string,
): string {
  return authoredTemplateAttributeText(appBuilderStateDispatchAttributeSource(eventName, bindingExpression, storeName));
}

/** Lower a static i18n `t` translation-binding attribute. */
export function appBuilderI18nTranslationAttributeSource(
  translationKeyExpression: string,
): AppBuilderTemplateAttributeSource {
  return appBuilderI18nTranslationAttributeFragment(translationKeyExpression).templateAttribute;
}

/** Lower a static i18n `t` translation-binding attribute. */
export function appBuilderI18nTranslationAttributeFragment(
  translationKeyExpression: string,
): AppBuilderTemplateAttributePartSourceFragment {
  return lowerAppBuilderPartTemplateAttributeFragment({
    partKind: AppBuilderPartKind.BindingPart,
    partId: AppBuilderBindingPartId.Translation,
    applicationSite: AppBuilderPartApplicationSiteKind.TemplateAttribute,
    slotAssignments: [
      { slotKind: AppBuilderPartSlotKind.TranslationKeyExpression, value: translationKeyExpression },
    ],
  });
}

/** Lower a static i18n `t` translation-binding attribute. */
export function appBuilderI18nTranslationAttribute(
  translationKeyExpression: string,
): string {
  return authoredTemplateAttributeText(appBuilderI18nTranslationAttributeSource(translationKeyExpression));
}

/** Lower a dynamic i18n `t.bind` translation-binding attribute. */
export function appBuilderI18nDynamicTranslationAttributeSource(
  bindingExpression: string,
): AppBuilderTemplateAttributeSource {
  return appBuilderI18nDynamicTranslationAttributeFragment(bindingExpression).templateAttribute;
}

/** Lower a dynamic i18n `t.bind` translation-binding attribute. */
export function appBuilderI18nDynamicTranslationAttributeFragment(
  bindingExpression: string,
): AppBuilderTemplateAttributePartSourceFragment {
  return lowerAppBuilderPartTemplateAttributeFragment({
    partKind: AppBuilderPartKind.BindingPart,
    partId: AppBuilderBindingPartId.DynamicTranslation,
    applicationSite: AppBuilderPartApplicationSiteKind.TemplateAttribute,
    slotAssignments: [
      { slotKind: AppBuilderPartSlotKind.BindingExpression, value: bindingExpression },
    ],
  });
}

/** Lower a dynamic i18n `t.bind` translation-binding attribute. */
export function appBuilderI18nDynamicTranslationAttribute(
  bindingExpression: string,
): string {
  return authoredTemplateAttributeText(appBuilderI18nDynamicTranslationAttributeSource(bindingExpression));
}

/** Lower an i18n `t-params.bind` parameter-binding attribute. */
export function appBuilderI18nTranslationParametersAttributeSource(
  parametersExpression: string,
): AppBuilderTemplateAttributeSource {
  return appBuilderI18nTranslationParametersAttributeFragment(parametersExpression).templateAttribute;
}

/** Lower an i18n `t-params.bind` parameter-binding attribute. */
export function appBuilderI18nTranslationParametersAttributeFragment(
  parametersExpression: string,
): AppBuilderTemplateAttributePartSourceFragment {
  return lowerAppBuilderPartTemplateAttributeFragment({
    partKind: AppBuilderPartKind.BindingPart,
    partId: AppBuilderBindingPartId.TranslationParameters,
    applicationSite: AppBuilderPartApplicationSiteKind.TemplateAttribute,
    slotAssignments: [
      { slotKind: AppBuilderPartSlotKind.TranslationParametersExpression, value: parametersExpression },
    ],
  });
}

/** Lower an i18n `t-params.bind` parameter-binding attribute. */
export function appBuilderI18nTranslationParametersAttribute(
  parametersExpression: string,
): string {
  return authoredTemplateAttributeText(appBuilderI18nTranslationParametersAttributeSource(parametersExpression));
}

/** Lower a state-plugin `& state` binding expression. */
export function appBuilderStateExpression(
  bindingExpression: string,
  argumentExpression?: string,
): string {
  return appBuilderStateExpressionFragment(bindingExpression, argumentExpression).text;
}

/** Lower a state-plugin `& state` binding expression. */
export function appBuilderStateExpressionFragment(
  bindingExpression: string,
  argumentExpression?: string,
): AppBuilderBindingExpressionPartSourceFragment {
  return appBuilderBindingBehaviorExpressionFragment(AppBuilderBindingBehaviorId.State, bindingExpression, argumentExpression);
}

/** Lower a binding behavior source fragment around an existing binding expression. */
export function appBuilderBindingBehaviorExpression(
  behaviorId: AppBuilderBindingBehaviorId,
  bindingExpression: string,
  argumentExpression?: string,
): string {
  return appBuilderBindingBehaviorExpressionFragment(behaviorId, bindingExpression, argumentExpression).text;
}

/** Lower a binding behavior source fragment around an existing binding expression. */
export function appBuilderBindingBehaviorExpressionFragment(
  behaviorId: AppBuilderBindingBehaviorId,
  bindingExpression: string,
  argumentExpression?: string,
): AppBuilderBindingExpressionPartSourceFragment {
  return lowerAppBuilderPartSourceFragment({
    partKind: AppBuilderPartKind.BindingBehavior,
    partId: behaviorId,
    applicationSite: AppBuilderPartApplicationSiteKind.BindingExpressionModifier,
    slotAssignments: optionalBindingBehaviorArguments(argumentExpression, [
      { slotKind: AppBuilderPartSlotKind.BindingExpression, value: bindingExpression },
    ]),
  }, AppBuilderPartSourceFragmentKind.BindingExpression);
}

/** Lower a router `load` custom-attribute source fragment. */
export function appBuilderRouterLoadAttributeSource(
  routeInstruction: string,
  options: {
    readonly paramsExpression?: string;
    readonly contextExpression?: string;
    readonly activeExpression?: string;
    readonly targetAttributeName?: string;
  } = {},
): AppBuilderTemplateAttributeSource {
  return appBuilderRouterLoadAttributeFragment(routeInstruction, options).templateAttribute;
}

/** Lower a router `load` custom-attribute source fragment. */
export function appBuilderRouterLoadAttributeFragment(
  routeInstruction: string,
  options: {
    readonly paramsExpression?: string;
    readonly contextExpression?: string;
    readonly activeExpression?: string;
    readonly targetAttributeName?: string;
  } = {},
): AppBuilderTemplateAttributePartSourceFragment {
  return lowerAppBuilderPartTemplateAttributeFragment({
    partKind: AppBuilderPartKind.FrameworkComponent,
    partId: AppBuilderFrameworkComponentId.Load,
    applicationSite: AppBuilderPartApplicationSiteKind.TemplateAttribute,
    slotAssignments: optionalRouterLoadSlots(options, [
      { slotKind: AppBuilderPartSlotKind.RouteInstruction, value: routeInstruction },
    ]),
  });
}

/** Lower a router `load` custom-attribute source fragment. */
export function appBuilderRouterLoadAttribute(
  routeInstruction: string,
  options: {
    readonly paramsExpression?: string;
    readonly contextExpression?: string;
    readonly activeExpression?: string;
    readonly targetAttributeName?: string;
  } = {},
): string {
  return authoredTemplateAttributeText(appBuilderRouterLoadAttributeSource(routeInstruction, options));
}

/** Lower a router-managed `href` custom-attribute source fragment. */
export function appBuilderRouterHrefAttributeSource(
  routeInstruction: string,
): AppBuilderTemplateAttributeSource {
  return appBuilderRouterHrefAttributeFragment(routeInstruction).templateAttribute;
}

/** Lower a router-managed `href` custom-attribute source fragment. */
export function appBuilderRouterHrefAttributeFragment(
  routeInstruction: string,
): AppBuilderTemplateAttributePartSourceFragment {
  return lowerAppBuilderPartTemplateAttributeFragment({
    partKind: AppBuilderPartKind.FrameworkComponent,
    partId: AppBuilderFrameworkComponentId.Href,
    applicationSite: AppBuilderPartApplicationSiteKind.TemplateAttribute,
    slotAssignments: [
      { slotKind: AppBuilderPartSlotKind.RouteInstruction, value: routeInstruction },
    ],
  });
}

/** Lower a router-managed `href` custom-attribute source fragment. */
export function appBuilderRouterHrefAttribute(
  routeInstruction: string,
): string {
  return authoredTemplateAttributeText(appBuilderRouterHrefAttributeSource(routeInstruction));
}

/** Lower an `au-viewport` framework component while preserving structured source. */
export function appBuilderViewportElementSource(
  options: {
    readonly name?: string;
    readonly usedBy?: string;
    readonly defaultRoute?: string;
    readonly fallback?: string;
  } = {},
): AppBuilderTemplateElementSource {
  return appBuilderViewportElementFragment(options).templateElement;
}

/** Lower an `au-viewport` framework component while preserving source-fragment provenance. */
export function appBuilderViewportElementFragment(
  options: {
    readonly name?: string;
    readonly usedBy?: string;
    readonly defaultRoute?: string;
    readonly fallback?: string;
  } = {},
): AppBuilderTemplateElementPartSourceFragment {
  return lowerAppBuilderPartSourceFragment({
    partKind: AppBuilderPartKind.FrameworkComponent,
    partId: AppBuilderFrameworkComponentId.Viewport,
    applicationSite: AppBuilderPartApplicationSiteKind.TemplateElement,
    slotAssignments: optionalViewportSlots(options, []),
  }, AppBuilderPartSourceFragmentKind.TemplateElement);
}

/** Lower a validation-html `validation-errors.from-view` custom-attribute source fragment. */
export function appBuilderValidationErrorsAttributeSource(
  errorsExpression: string,
  controllerExpression?: string,
): AppBuilderTemplateAttributeSource {
  return appBuilderValidationErrorsAttributeFragment(errorsExpression, controllerExpression).templateAttribute;
}

/** Lower a validation-html `validation-errors.from-view` custom-attribute source fragment. */
export function appBuilderValidationErrorsAttributeFragment(
  errorsExpression: string,
  controllerExpression?: string,
): AppBuilderTemplateAttributePartSourceFragment {
  return lowerAppBuilderPartTemplateAttributeFragment({
    partKind: AppBuilderPartKind.FrameworkComponent,
    partId: AppBuilderFrameworkComponentId.ValidationErrors,
    applicationSite: AppBuilderPartApplicationSiteKind.TemplateAttribute,
    slotAssignments: appendOptionalPartSlots([
      { slotKind: AppBuilderPartSlotKind.ValidationErrorsExpression, value: errorsExpression },
    ], [
      [AppBuilderPartSlotKind.ValidationControllerExpression, controllerExpression],
    ]),
  });
}

/** Lower a validation-html `validation-errors.from-view` custom-attribute source fragment. */
export function appBuilderValidationErrorsAttribute(
  errorsExpression: string,
  controllerExpression?: string,
): string {
  return authoredTemplateAttributeText(appBuilderValidationErrorsAttributeSource(errorsExpression, controllerExpression));
}

/** Lower a validation-html `validation-container` framework element while preserving structured source. */
export function appBuilderValidationContainerElementSource(
  options: {
    readonly errorsExpression?: string;
    readonly controllerExpression?: string;
  } = {},
): AppBuilderTemplateElementSource {
  return appBuilderValidationContainerElementFragment(options).templateElement;
}

/** Lower a validation-html `validation-container` framework element while preserving source-fragment provenance. */
export function appBuilderValidationContainerElementFragment(
  options: {
    readonly errorsExpression?: string;
    readonly controllerExpression?: string;
  } = {},
): AppBuilderTemplateElementPartSourceFragment {
  return lowerAppBuilderPartSourceFragment({
    partKind: AppBuilderPartKind.FrameworkComponent,
    partId: AppBuilderFrameworkComponentId.ValidationContainer,
    applicationSite: AppBuilderPartApplicationSiteKind.TemplateElement,
    slotAssignments: appendOptionalPartSlots([], [
      [AppBuilderPartSlotKind.ValidationErrorsExpression, options.errorsExpression],
      [AppBuilderPartSlotKind.ValidationControllerExpression, options.controllerExpression],
    ]),
  }, AppBuilderPartSourceFragmentKind.TemplateElement);
}

/** Compute the next numeric identity value after a public seed data set. */
export function appBuilderNextNumericId(
  records: readonly AppBuilderSeedRecord[],
  identityMemberName: string,
): number {
  let max = 0;
  for (const record of records) {
    const value = record[identityMemberName];
    if (typeof value === 'number' && value > max) {
      max = value;
    }
  }
  return max + 1;
}

/** Emit a TypeScript literal for the current public seed-record primitive set. */
export function appBuilderSeedRecordLiteral(
  value: AppBuilderSeedRecordValue | undefined,
): string {
  if (value === undefined) {
    return 'undefined';
  }
  if (value === null) {
    return 'null';
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => appBuilderSeedRecordLiteral(item)).join(', ')}]`;
  }
  if (typeof value === 'string') {
    return singleQuotedTypeScriptStringLiteralText(value);
  }
  return JSON.stringify(value);
}

/** Convert a PascalCase type name into a lower-camel local name. */
export function appBuilderLowerCamelCase(
  value: string,
): string {
  return lowerCamelSourceName(sourceNameWords(value));
}

/** Convert a human/name phrase into a TypeScript-friendly PascalCase segment. */
export function appBuilderPascalCase(
  value: string,
): string {
  return pascalSourceName(sourceNameWords(value));
}

/** Convert a type/name phrase into a file-system-friendly kebab segment. */
export function appBuilderKebabCase(
  value: string,
): string {
  return kebabSourceName(sourceNameWords(value));
}

/** Return whether a string is a plain TypeScript identifier usable as a generated member name. */
export function appBuilderIsTypeScriptIdentifier(
  value: string,
): boolean {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(value);
}

/** Return the source-lowering application site for a structural part id. */
export function appBuilderStructuralPartApplicationSite(
  structuralPartId: AppBuilderStructuralPartId,
): AppBuilderPartApplicationSiteKind.TemplateController | AppBuilderPartApplicationSiteKind.TemplateControllerBranch {
  switch (structuralPartId) {
    case AppBuilderStructuralPartId.ConditionalElse:
    case AppBuilderStructuralPartId.SwitchCase:
    case AppBuilderStructuralPartId.SwitchDefault:
    case AppBuilderStructuralPartId.PromisePending:
    case AppBuilderStructuralPartId.PromiseFulfilled:
    case AppBuilderStructuralPartId.PromiseRejected:
      return AppBuilderPartApplicationSiteKind.TemplateControllerBranch;
    case AppBuilderStructuralPartId.Conditional:
    case AppBuilderStructuralPartId.Repeat:
    case AppBuilderStructuralPartId.VirtualRepeat:
    case AppBuilderStructuralPartId.Switch:
    case AppBuilderStructuralPartId.Promise:
    case AppBuilderStructuralPartId.ValueScope:
    case AppBuilderStructuralPartId.Portal:
      return AppBuilderPartApplicationSiteKind.TemplateController;
  }
}

function dependencyExpressionList(
  dependencyExpressions: readonly string[],
): string | undefined {
  return dependencyExpressions.length === 0 ? undefined : dependencyExpressions.join(', ');
}

function optionalStateStoreSlot(
  storeName: string | undefined,
  slots: readonly { readonly slotKind: AppBuilderPartSlotKind; readonly value: string }[],
): readonly { readonly slotKind: AppBuilderPartSlotKind; readonly value: string }[] {
  return storeName === undefined || storeName.length === 0
    ? slots
    : [...slots, { slotKind: AppBuilderPartSlotKind.StateStoreName, value: storeName }];
}

function optionalBindingBehaviorArguments(
  argumentExpression: string | undefined,
  slots: readonly { readonly slotKind: AppBuilderPartSlotKind; readonly value: string }[],
): readonly { readonly slotKind: AppBuilderPartSlotKind; readonly value: string }[] {
  return argumentExpression === undefined || argumentExpression.length === 0
    ? slots
    : [...slots, { slotKind: AppBuilderPartSlotKind.BindingBehaviorArguments, value: argumentExpression }];
}

function optionalRouterLoadSlots(
  options: {
    readonly paramsExpression?: string;
    readonly contextExpression?: string;
    readonly activeExpression?: string;
    readonly targetAttributeName?: string;
  },
  slots: readonly { readonly slotKind: AppBuilderPartSlotKind; readonly value: string }[],
): readonly { readonly slotKind: AppBuilderPartSlotKind; readonly value: string }[] {
  return appendOptionalPartSlots(slots, [
    [AppBuilderPartSlotKind.RouteParamsExpression, options.paramsExpression],
    [AppBuilderPartSlotKind.RouteContextExpression, options.contextExpression],
    [AppBuilderPartSlotKind.RouteActiveExpression, options.activeExpression],
    [AppBuilderPartSlotKind.RouteTargetAttributeName, options.targetAttributeName],
  ]);
}

function optionalViewportSlots(
  options: {
    readonly name?: string;
    readonly usedBy?: string;
    readonly defaultRoute?: string;
    readonly fallback?: string;
  },
  slots: readonly { readonly slotKind: AppBuilderPartSlotKind; readonly value: string }[],
): readonly { readonly slotKind: AppBuilderPartSlotKind; readonly value: string }[] {
  return appendOptionalPartSlots(slots, [
    [AppBuilderPartSlotKind.ViewportName, options.name],
    [AppBuilderPartSlotKind.ViewportUsedBy, options.usedBy],
    [AppBuilderPartSlotKind.ViewportDefault, options.defaultRoute],
    [AppBuilderPartSlotKind.ViewportFallback, options.fallback],
  ]);
}

function appendOptionalPartSlots(
  slots: readonly { readonly slotKind: AppBuilderPartSlotKind; readonly value: string }[],
  entries: readonly (readonly [AppBuilderPartSlotKind, string | undefined])[],
): readonly { readonly slotKind: AppBuilderPartSlotKind; readonly value: string }[] {
  let next = slots;
  for (const [slotKind, value] of entries) {
    if (value == null || value.length === 0) {
      continue;
    }
    next = [...next, { slotKind, value }];
  }
  return next;
}
