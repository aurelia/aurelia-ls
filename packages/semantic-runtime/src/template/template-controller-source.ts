import {
  builtInBindingCommandAttributeSource,
  BuiltInBindingCommandName,
} from './built-in-syntax.js';
import {
  BuiltInTemplateControllerName,
  BuiltInTemplateControllerValueDomainKind,
  frameworkTemplateControllerSemanticsForName,
} from './template-controller-semantics.js';
import {
  authoredTemplateAttributeText,
  type AuthoredTemplateAttributeSource,
} from './authored-template-source.js';
import {
  iteratorBindingExpressionSourceText,
} from './binding-expression-source.js';

/** Authored source request for a value-backed built-in template-controller attribute. */
export interface TemplateControllerValueAttributeSourceRequest {
  /** Built-in template-controller name that receives the bound value. */
  readonly controllerName: BuiltInTemplateControllerName;
  /** Aurelia expression assigned to the controller's value bindable. */
  readonly expression: string;
}

/** Authored source request for an iterator-backed built-in template-controller attribute. */
export interface TemplateControllerIteratorAttributeSourceRequest {
  /** Built-in iterator template-controller name such as `repeat` or `virtual-repeat`. */
  readonly controllerName: BuiltInTemplateControllerName;
  /** Local binding-context name introduced for each iterated item. */
  readonly localName: string;
  /** Aurelia expression that produces the iterable source. */
  readonly iterableExpression: string;
}

/** Authored source request for a branch template-controller that may expose a local name. */
export interface TemplateControllerLocalAttributeSourceRequest {
  /** Built-in branch template-controller name such as `then` or `catch`. */
  readonly controllerName: BuiltInTemplateControllerName;
  /** Optional local binding-context name for the branch value. */
  readonly localName?: string | null;
}

/** Serialize a value-backed built-in template-controller attribute such as `if.bind`. */
export function templateControllerValueAttributeSource(
  request: TemplateControllerValueAttributeSourceRequest,
): AuthoredTemplateAttributeSource {
  assertValueTemplateController(request.controllerName);
  return builtInBindingCommandAttributeSource({
    commandName: BuiltInBindingCommandName.Bind,
    targetName: request.controllerName,
    rawValue: request.expression,
  });
}

/** Serialize a value-backed built-in template-controller attribute such as `if.bind`. */
export function templateControllerValueAttributeSourceText(
  request: TemplateControllerValueAttributeSourceRequest,
): string {
  return authoredTemplateAttributeText(templateControllerValueAttributeSource(request));
}

/** Serialize an iterator-backed built-in template-controller attribute such as `repeat.for`. */
export function templateControllerIteratorAttributeSource(
  request: TemplateControllerIteratorAttributeSourceRequest,
): AuthoredTemplateAttributeSource {
  assertIteratorTemplateController(request.controllerName);
  return builtInBindingCommandAttributeSource({
    commandName: BuiltInBindingCommandName.For,
    targetName: request.controllerName,
    rawValue: iteratorBindingExpressionSourceText({
      localName: request.localName,
      iterableExpression: request.iterableExpression,
    }),
  });
}

/** Serialize an iterator-backed built-in template-controller attribute such as `repeat.for`. */
export function templateControllerIteratorAttributeSourceText(
  request: TemplateControllerIteratorAttributeSourceRequest,
): string {
  return authoredTemplateAttributeText(templateControllerIteratorAttributeSource(request));
}

/** Create a built-in template-controller attribute that has no authored value. */
export function templateControllerBareAttributeSource(
  controllerName: BuiltInTemplateControllerName,
): AuthoredTemplateAttributeSource {
  return { rawName: controllerName };
}

/** Serialize a built-in template-controller attribute that has no authored value. */
export function templateControllerBareAttributeSourceText(
  controllerName: BuiltInTemplateControllerName,
): string {
  return authoredTemplateAttributeText(templateControllerBareAttributeSource(controllerName));
}

/** Create a branch template-controller attribute whose raw value is an optional local name. */
export function templateControllerLocalAttributeSource(
  request: TemplateControllerLocalAttributeSourceRequest,
): AuthoredTemplateAttributeSource {
  return request.localName == null || request.localName.length === 0
    ? templateControllerBareAttributeSource(request.controllerName)
    : {
        rawName: request.controllerName,
        rawValue: request.localName,
      };
}

/** Serialize a branch template-controller attribute whose raw value is an optional local name. */
export function templateControllerLocalAttributeSourceText(
  request: TemplateControllerLocalAttributeSourceRequest,
): string {
  return authoredTemplateAttributeText(templateControllerLocalAttributeSource(request));
}

function assertValueTemplateController(
  controllerName: BuiltInTemplateControllerName,
): void {
  const semantics = frameworkTemplateControllerSemanticsForName(controllerName);
  if (semantics?.valueDomainKind === BuiltInTemplateControllerValueDomainKind.Iterator) {
    throw new Error(`Template controller '${controllerName}' expects iterator source syntax.`);
  }
  if (semantics?.valueProperty == null) {
    throw new Error(`Template controller '${controllerName}' does not own a value bindable source.`);
  }
}

function assertIteratorTemplateController(
  controllerName: BuiltInTemplateControllerName,
): void {
  const semantics = frameworkTemplateControllerSemanticsForName(controllerName);
  if (semantics?.valueDomainKind !== BuiltInTemplateControllerValueDomainKind.Iterator) {
    throw new Error(`Template controller '${controllerName}' does not own iterator source syntax.`);
  }
}
