import { singleQuotedTypeScriptStringLiteralText } from '../source-plan/source-template.js';
import {
  type NamedResourceDefinitionKind,
  ResourceDefinitionKind,
  runtimeResourceTypeNameForKind,
} from './resource-kind.js';

/** Resource-definition metadata property names that appear in authored TypeScript definition objects. */
export enum ResourceDefinitionMetadataPropertyName {
  /** Public custom-element resource name inside `@customElement({ ... })` metadata. */
  Name = 'name',
  /** Static resource type field inside class-side `$au` metadata. */
  Type = 'type',
  /** Template-controller flag inside custom-attribute metadata. */
  IsTemplateController = 'isTemplateController',
  /** Template expression inside custom-element metadata. */
  Template = 'template',
  /** Template-local resource dependencies registered into the component/controller container. */
  Dependencies = 'dependencies',
}

/** Static `$au.type` value used by Aurelia custom element definitions. */
export const CUSTOM_ELEMENT_STATIC_AU_TYPE = 'custom-element' as const;

/** Source request for a named Aurelia resource decorator. */
export interface NamedResourceDecoratorSourceRequest {
  /** Resource kind that selects the framework decorator function and metadata shape. */
  readonly resourceKind: NamedResourceDefinitionKind;
  /** Public resource name. */
  readonly name: string;
  /** Authored TypeScript expression that evaluates to template markup. */
  readonly templateExpression?: string | null;
  /** Authored TypeScript expressions inside the dependencies array, without surrounding brackets. */
  readonly dependencyExpressionList?: string | null;
  /** Additional complete metadata property fragments such as app-builder-generated `dependencies: [...]`. */
  readonly metadataPropertySourceTexts?: readonly string[];
}

/** Source request for a named Aurelia resource definition object. */
export interface NamedResourceDefinitionObjectSourceRequest {
  /** Resource kind that selects the framework definition metadata shape. */
  readonly resourceKind: NamedResourceDefinitionKind;
  /** Public resource name. */
  readonly name: string;
  /** Include class-side static `$au.type` when serializing a static `$au` object. */
  readonly includeStaticAuType?: boolean;
  /** Include `isTemplateController: true` when serializing custom-attribute-backed template-controller metadata. */
  readonly includeTemplateControllerFlag?: boolean;
  /** Authored TypeScript expression that evaluates to template markup. */
  readonly templateExpression?: string | null;
  /** Authored TypeScript expressions inside the dependencies array, without surrounding brackets. */
  readonly dependencyExpressionList?: string | null;
  /** Additional complete metadata property fragments such as app-builder-generated `dependencies: [...]`. */
  readonly metadataPropertySourceTexts?: readonly string[];
}

/** Serialize framework-shaped named-resource decorator metadata. */
export function namedResourceDecoratorSourceText(
  request: NamedResourceDecoratorSourceRequest,
): string {
  return `@${namedResourceDecoratorName(request.resourceKind)}({
${namedResourceDefinitionObjectPropertySourceTexts(request).map((property) => `  ${property},`).join('\n')}
})`;
}

/** Source request for class-side named resource `$au` metadata. */
export interface NamedResourceStaticAuPropertySourceRequest extends NamedResourceDefinitionObjectSourceRequest {
  /** Optional TypeScript type annotation for the static `$au` property. */
  readonly typeAnnotation?: string | null;
}

/** Serialize framework-shaped static `$au` named resource metadata as a class member. */
export function namedResourceStaticAuPropertySourceText(
  request: NamedResourceStaticAuPropertySourceRequest,
): string {
  const annotation = request.typeAnnotation == null || request.typeAnnotation.trim().length === 0
    ? ''
    : `: ${request.typeAnnotation.trim()}`;
  return `static readonly $au${annotation} = {
${namedResourceDefinitionObjectPropertySourceTexts({
    ...request,
    includeStaticAuType: true,
    includeTemplateControllerFlag: request.resourceKind === ResourceDefinitionKind.TemplateController
      ? true
      : request.includeTemplateControllerFlag,
  }).map((property) => `  ${property},`).join('\n')}
};`;
}

/** Source request for an imperative named resource `.define(...)` expression. */
export interface NamedResourceDefineCallSourceRequest extends NamedResourceDefinitionObjectSourceRequest {
  /** Imported or otherwise in-scope framework resource API expression. */
  readonly resourceApiExpression?: string | null;
  /** Optional existing class/type expression supplied as the definition target. */
  readonly typeExpression?: string | null;
}

/** Serialize framework-shaped named resource `.define(...)` source. */
export function namedResourceDefineCallSourceText(
  request: NamedResourceDefineCallSourceRequest,
): string {
  const resourceApiExpression = request.resourceApiExpression?.trim() || namedResourceDefineApiName(request.resourceKind);
  const typeExpression = request.typeExpression?.trim();
  const args = [
    `{
${namedResourceDefinitionObjectPropertySourceTexts({
      ...request,
      includeTemplateControllerFlag: request.resourceKind === ResourceDefinitionKind.TemplateController
        ? true
        : request.includeTemplateControllerFlag,
    }).map((property) => `  ${property},`).join('\n')}
}`,
    ...(typeExpression == null || typeExpression.length === 0 ? [] : [typeExpression]),
  ];
  return `${resourceApiExpression}.define(${args.join(', ')})`;
}

/** Source request for a `@customElement({ ... })` decorator. */
export interface CustomElementDecoratorSourceRequest extends Omit<NamedResourceDecoratorSourceRequest, 'resourceKind'> {}

/** Serialize framework-shaped custom-element decorator metadata. */
export function customElementDecoratorSourceText(
  request: CustomElementDecoratorSourceRequest,
): string {
  return namedResourceDecoratorSourceText({
    ...request,
    resourceKind: ResourceDefinitionKind.CustomElement,
  });
}

/** Source request for custom element definition object metadata. */
export interface CustomElementDefinitionObjectSourceRequest extends Omit<NamedResourceDefinitionObjectSourceRequest, 'resourceKind'> {
  /** Include class-side static `$au.type` when serializing a static `$au` object. */
  readonly staticAuType?: typeof CUSTOM_ELEMENT_STATIC_AU_TYPE | null;
}

/** Source request for class-side custom element `$au` metadata. */
export interface CustomElementStaticAuPropertySourceRequest extends Omit<NamedResourceStaticAuPropertySourceRequest, 'resourceKind' | 'includeStaticAuType'> {}

/** Serialize framework-shaped static `$au` custom element metadata as a class member. */
export function customElementStaticAuPropertySourceText(
  request: CustomElementStaticAuPropertySourceRequest,
): string {
  return namedResourceStaticAuPropertySourceText({
    ...request,
    resourceKind: ResourceDefinitionKind.CustomElement,
  });
}

/** Source request for an imperative `CustomElement.define(...)` expression. */
export interface CustomElementDefineCallSourceRequest extends Omit<NamedResourceDefineCallSourceRequest, 'resourceKind' | 'resourceApiExpression'> {
  /** Imported or otherwise in-scope CustomElement API expression. */
  readonly customElementApiExpression?: string | null;
}

/** Serialize framework-shaped `CustomElement.define(...)` source. */
export function customElementDefineCallSourceText(
  request: CustomElementDefineCallSourceRequest,
): string {
  return namedResourceDefineCallSourceText({
    ...request,
    resourceKind: ResourceDefinitionKind.CustomElement,
    resourceApiExpression: request.customElementApiExpression,
  });
}

/** Source request for an `AttributePattern.create(...)` expression. */
export interface AttributePatternCreateCallSourceRequest {
  /** Imported or otherwise in-scope AttributePattern API expression. */
  readonly attributePatternApiExpression?: string | null;
  /** Authored TypeScript object expressions inside the first `AttributePattern.create([...])` argument. */
  readonly patternDefinitionExpressionList: string;
  /** Existing class/type expression supplied as the pattern handler target. */
  readonly typeExpression: string;
}

/** Serialize framework-shaped `AttributePattern.create(...)` source. */
export function attributePatternCreateCallSourceText(
  request: AttributePatternCreateCallSourceRequest,
): string {
  const apiExpression = request.attributePatternApiExpression?.trim() || 'AttributePattern';
  const patternDefinitionExpressionList = request.patternDefinitionExpressionList.trim();
  const typeExpression = request.typeExpression.trim();
  return `${apiExpression}.create([${patternDefinitionExpressionList}], ${typeExpression})`;
}

/** Source request for a resource definition `dependencies` metadata property. */
export interface ResourceDependenciesPropertySourceRequest {
  /** Authored TypeScript expressions inside the dependencies array, without the surrounding brackets. */
  readonly dependencyExpressionList: string;
}

/** Serialize the framework-shaped resource definition `dependencies` metadata property. */
export function resourceDependenciesPropertySourceText(
  request: ResourceDependenciesPropertySourceRequest,
): string {
  const dependencyExpressionList = request.dependencyExpressionList.trim();
  return `${ResourceDefinitionMetadataPropertyName.Dependencies}: [${dependencyExpressionList}]`;
}

function optionalMetadataExpressionProperty(
  propertyName: ResourceDefinitionMetadataPropertyName,
  expression: string | null | undefined,
): string | null {
  const trimmed = expression?.trim();
  if (trimmed == null || trimmed.length === 0) {
    return null;
  }
  return trimmed === propertyName
    ? propertyName
    : `${propertyName}: ${trimmed}`;
}

function optionalDependenciesProperty(
  dependencyExpressionList: string | null | undefined,
): string | null {
  const trimmed = dependencyExpressionList?.trim();
  return trimmed == null || trimmed.length === 0
    ? null
    : resourceDependenciesPropertySourceText({ dependencyExpressionList: trimmed });
}

function namedResourceDefinitionObjectPropertySourceTexts(
  request: NamedResourceDefinitionObjectSourceRequest,
): readonly string[] {
  return [
    optionalStaticAuTypeProperty(request.resourceKind, request.includeStaticAuType),
    `${ResourceDefinitionMetadataPropertyName.Name}: ${singleQuotedTypeScriptStringLiteralText(request.name)}`,
    optionalTemplateControllerProperty(request.includeTemplateControllerFlag),
    optionalMetadataExpressionProperty(ResourceDefinitionMetadataPropertyName.Template, request.templateExpression),
    optionalDependenciesProperty(request.dependencyExpressionList),
    ...(request.metadataPropertySourceTexts ?? []),
  ].filter((property): property is string => property != null);
}

function optionalStaticAuTypeProperty(
  resourceKind: NamedResourceDefinitionKind,
  includeStaticAuType: boolean | null | undefined,
): string | null {
  if (includeStaticAuType !== true) {
    return null;
  }
  const typeName = runtimeResourceTypeNameForKind(resourceKind);
  if (typeName == null) {
    throw new Error(`Named resource kind '${resourceKind}' does not have a runtime resource type name.`);
  }
  return `${ResourceDefinitionMetadataPropertyName.Type}: ${singleQuotedTypeScriptStringLiteralText(typeName)}`;
}

function optionalTemplateControllerProperty(
  includeTemplateControllerFlag: boolean | null | undefined,
): string | null {
  return includeTemplateControllerFlag === true
    ? `${ResourceDefinitionMetadataPropertyName.IsTemplateController}: true`
    : null;
}

function namedResourceDecoratorName(
  resourceKind: NamedResourceDefinitionKind,
): string {
  switch (resourceKind) {
    case ResourceDefinitionKind.CustomElement:
      return 'customElement';
    case ResourceDefinitionKind.CustomAttribute:
      return 'customAttribute';
    case ResourceDefinitionKind.TemplateController:
      return 'templateController';
    case ResourceDefinitionKind.ValueConverter:
      return 'valueConverter';
    case ResourceDefinitionKind.BindingBehavior:
      return 'bindingBehavior';
    case ResourceDefinitionKind.BindingCommand:
      return 'bindingCommand';
  }
}

function namedResourceDefineApiName(
  resourceKind: NamedResourceDefinitionKind,
): string {
  switch (resourceKind) {
    case ResourceDefinitionKind.CustomElement:
      return 'CustomElement';
    case ResourceDefinitionKind.CustomAttribute:
    case ResourceDefinitionKind.TemplateController:
      return 'CustomAttribute';
    case ResourceDefinitionKind.ValueConverter:
      return 'ValueConverter';
    case ResourceDefinitionKind.BindingBehavior:
      return 'BindingBehavior';
    case ResourceDefinitionKind.BindingCommand:
      return 'BindingCommand';
  }
}
