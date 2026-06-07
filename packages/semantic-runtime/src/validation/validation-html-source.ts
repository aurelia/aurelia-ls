import { builtInResourceBindableAttribute } from '../resources/built-in-resource-bindables.js';
import {
  authoredTemplateAttributeText,
  authoredTemplateElementSource,
  authoredTemplateElementSourceText,
  type AuthoredTemplateAttributeSource,
  type AuthoredTemplateChildSource,
  type AuthoredTemplateElementSource,
} from '../template/authored-template-source.js';
import {
  builtInBindingCommandAttributeSource,
  BuiltInBindingCommandName,
} from '../template/built-in-syntax.js';
import {
  inlineMultiBindingValueSourceText,
  type InlineMultiBindingSourceSegment,
} from '../template/multi-binding-segments.js';

/** Framework resource name for validation-html `ValidationErrorsCustomAttribute`. */
export const VALIDATION_ERRORS_RESOURCE_NAME = 'validation-errors' as const;
/** Framework target class name for validation-html `ValidationErrorsCustomAttribute`. */
export const VALIDATION_ERRORS_TARGET_NAME = 'ValidationErrorsCustomAttribute' as const;
/** Framework resource name for validation-html `ValidationContainerCustomElement`. */
export const VALIDATION_CONTAINER_RESOURCE_NAME = 'validation-container' as const;
/** Framework target class name for validation-html `ValidationContainerCustomElement`. */
export const VALIDATION_CONTAINER_TARGET_NAME = 'ValidationContainerCustomElement' as const;

/** Bindable property names owned by validation-html error subscriber resources. */
export enum ValidationHtmlErrorsBindableName {
  /** Validation controller instance; omitted source falls back to the scoped controller. */
  Controller = 'controller',
  /** Validation error collection exposed from the subscriber resource. */
  Errors = 'errors',
}

/** Authored source request for validation-html `validation-errors`. */
export interface ValidationErrorsAttributeSourceRequest {
  /** Expression that receives the exposed validation errors. */
  readonly errorsExpression: string;
  /** Optional validation controller expression. */
  readonly controllerExpression?: string | null;
}

/** Authored source request for validation-html `validation-container`. */
export interface ValidationContainerElementSourceRequest {
  /** Optional expression that receives the exposed validation errors. */
  readonly errorsExpression?: string | null;
  /** Optional validation controller expression. */
  readonly controllerExpression?: string | null;
  /** Direct child text for authored container content, if any. */
  readonly childText?: string | null;
  /** Structured child nodes under the validation container. */
  readonly children?: readonly AuthoredTemplateChildSource[];
}

/** Serialize the validation-html `validation-errors` custom attribute. */
export function validationErrorsAttributeSource(
  request: ValidationErrorsAttributeSourceRequest,
): AuthoredTemplateAttributeSource {
  if (request.controllerExpression == null || request.controllerExpression.length === 0) {
    return builtInBindingCommandAttributeSource({
      commandName: BuiltInBindingCommandName.FromView,
      targetName: VALIDATION_ERRORS_RESOURCE_NAME,
      rawValue: request.errorsExpression,
    });
  }
  return {
    rawName: VALIDATION_ERRORS_RESOURCE_NAME,
    rawValue: inlineMultiBindingValueSourceText([
      validationErrorsMultiBindingSegment(
        VALIDATION_ERRORS_TARGET_NAME,
        ValidationHtmlErrorsBindableName.Errors,
        BuiltInBindingCommandName.FromView,
        request.errorsExpression,
      ),
      validationErrorsMultiBindingSegment(
        VALIDATION_ERRORS_TARGET_NAME,
        ValidationHtmlErrorsBindableName.Controller,
        BuiltInBindingCommandName.Bind,
        request.controllerExpression,
      ),
    ]),
  };
}

/** Serialize the validation-html `validation-errors` custom attribute. */
export function validationErrorsAttributeSourceText(
  request: ValidationErrorsAttributeSourceRequest,
): string {
  return authoredTemplateAttributeText(validationErrorsAttributeSource(request));
}

/** Serialize the validation-html `validation-container` custom element. */
export function validationContainerElementSourceText(
  request: ValidationContainerElementSourceRequest,
): string {
  return authoredTemplateElementSourceText(validationContainerElementSource(request));
}

/** Create structured source for the validation-html `validation-container` custom element. */
export function validationContainerElementSource(
  request: ValidationContainerElementSourceRequest,
): AuthoredTemplateElementSource {
  return authoredTemplateElementSource(
    VALIDATION_CONTAINER_RESOURCE_NAME,
    validationContainerElementAttributes(request),
    request.childText ?? '',
    request.children ?? [],
  );
}

function validationContainerElementAttributes(
  request: ValidationContainerElementSourceRequest,
): readonly AuthoredTemplateAttributeSource[] {
  return [
    optionalCommandedBindableAttribute(
      VALIDATION_CONTAINER_TARGET_NAME,
      ValidationHtmlErrorsBindableName.Errors,
      BuiltInBindingCommandName.FromView,
      request.errorsExpression,
    ),
    optionalCommandedBindableAttribute(
      VALIDATION_CONTAINER_TARGET_NAME,
      ValidationHtmlErrorsBindableName.Controller,
      BuiltInBindingCommandName.Bind,
      request.controllerExpression,
    ),
  ].filter((attribute): attribute is AuthoredTemplateAttributeSource => attribute != null);
}

function optionalCommandedBindableAttribute(
  targetName: string,
  bindableName: ValidationHtmlErrorsBindableName,
  commandName: BuiltInBindingCommandName,
  rawValue: string | null | undefined,
): AuthoredTemplateAttributeSource | null {
  if (rawValue == null || rawValue.length === 0) {
    return null;
  }
  return builtInBindingCommandAttributeSource({
    commandName,
    targetName: builtInResourceBindableAttribute(targetName, bindableName),
    rawValue,
  });
}

function validationErrorsMultiBindingSegment(
  targetName: string,
  bindableName: ValidationHtmlErrorsBindableName,
  commandName: BuiltInBindingCommandName,
  rawValue: string,
): InlineMultiBindingSourceSegment {
  return {
    rawName: `${builtInResourceBindableAttribute(targetName, bindableName)}.${commandName}`,
    rawValue,
  };
}
