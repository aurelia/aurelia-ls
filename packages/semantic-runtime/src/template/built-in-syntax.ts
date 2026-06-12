import { auLink } from '../kernel/au-link.js';
import type {
  AddressHandle,
  IdentityHandle,
  ProductHandle,
} from '../kernel/handles.js';
import type { ExpressionType } from '../expression/ast.js';
import type { FieldProvenance } from '../kernel/provenance.js';
import type { FrameworkRegistrationKind } from '../registration/registration-reference.js';
import { AttributePatternDefinitionEntry } from '../resources/attribute-pattern-definition.js';
import { BindableBindingMode } from '../resources/bindable-definition.js';
import {
  AttributePatternExecutionKind,
  AttributePatternExecutionResult,
  AttributePatternScore,
  AttributeSyntaxKind,
  compileAttributePatternDefinition,
  isBetterAttributePatternScore,
  matchAttributePatternTokens,
} from './attribute-syntax.js';
import {
  BindingCommandBuildResult,
  BindingCommandExecutionKind,
  type BindingCommandBuildContext,
  type BindingCommandBuildInfo,
} from './binding-command-execution.js';
import { camelCaseAttributeName } from './attribute-mapper.js';
import { BindingCommandExecutableReference } from './binding-command-reference.js';
import { TemplateCompilerFrameworkErrorCode } from './framework-error-code.js';
import { TemplateCompilerIssueKind } from './compiler-issue.js';
import {
  AttributeBindingInstruction,
  DispatchBindingInstruction,
  IteratorBindingInstruction,
  ListenerBindingInstruction,
  MultiAttrInstruction,
  PropertyBindingInstruction,
  RefBindingInstruction,
  SpreadValueBindingInstruction,
  StateBindingInstruction,
  TemplateBindingMode,
  TemplateInstructionKind,
  TemplateListenerStrategy,
  TranslationBindBindingInstruction,
  TranslationBindingInstruction,
  TranslationParametersBindingInstruction,
} from './instruction-ir.js';
import { authoredTemplateAttributeText } from './authored-template-source.js';

const bindingCommandKey = (name: string): string => `au:resource:binding-command:${name}`;

function bindingCommandReference(
  command: {
    readonly productHandle?: ProductHandle | null;
    readonly identityHandle?: IdentityHandle | null;
    readonly name: string;
    readonly key: string;
  },
): BindingCommandExecutableReference {
  return new BindingCommandExecutableReference(
    command.productHandle ?? null,
    command.identityHandle ?? null,
    command.name,
    command.key,
  );
}

function attributePatternResult(
  rawName: string,
  rawValue: string,
  target: string,
  command: string | null,
  parts: readonly string[] = [],
): AttributePatternExecutionResult {
  return AttributePatternExecutionResult.pattern(rawName, rawValue, target, command, parts);
}

function instructionSource(info: BindingCommandBuildInfo): AddressHandle | null {
  return info.sourceAddressHandle ?? info.syntax.sourceAddressHandle ?? info.attribute.addressHandle;
}

function allocateInstruction(
  context: BindingCommandBuildContext,
  info: BindingCommandBuildInfo,
  kind: TemplateInstructionKind,
  local: string,
) {
  return context.allocateInstruction(kind, info, local);
}

function expressionValueOrTargetCamelCase(info: BindingCommandBuildInfo): string {
  return info.syntax.rawValue === ''
    ? camelCaseAttributeName(info.syntax.target)
    : info.syntax.rawValue;
}

function targetForPropertyBinding(
  info: BindingCommandBuildInfo,
  context: BindingCommandBuildContext,
): string {
  return info.bindable == null
    ? context.mapAttribute(info.node, info.syntax.target) ?? camelCaseAttributeName(info.syntax.target)
    : info.bindable.name;
}

function targetForIteratorBinding(info: BindingCommandBuildInfo): string {
  return info.bindable == null
    ? camelCaseAttributeName(info.syntax.target)
    : info.bindable.name;
}

function modeFromBindable(mode: BindableBindingMode | null | undefined): TemplateBindingMode {
  switch (mode) {
    case BindableBindingMode.OneTime:
      return TemplateBindingMode.OneTime;
    case BindableBindingMode.FromView:
      return TemplateBindingMode.FromView;
    case BindableBindingMode.TwoWay:
      return TemplateBindingMode.TwoWay;
    case BindableBindingMode.ToView:
    case BindableBindingMode.Default:
    case null:
    case undefined:
      return TemplateBindingMode.ToView;
  }
}

function buildFixedPropertyBinding(
  command: { readonly name: string; readonly key: string },
  info: BindingCommandBuildInfo,
  context: BindingCommandBuildContext,
  mode: TemplateBindingMode,
): BindingCommandBuildResult {
  const expression = expressionValueOrTargetCamelCase(info);
  const target = targetForPropertyBinding(info, context);
  const allocation = allocateInstruction(context, info, TemplateInstructionKind.PropertyBinding, command.name);

  return BindingCommandBuildResult.complete([
    new PropertyBindingInstruction(
      allocation.productHandle,
      allocation.identityHandle,
      info.node,
      info.attribute,
      target,
      context.parsePropertyExpression(expression, info),
      mode,
      bindingCommandReference(command),
      instructionSource(info),
    ),
  ]);
}

function buildDefaultPropertyBinding(
  command: { readonly name: string; readonly key: string },
  info: BindingCommandBuildInfo,
  context: BindingCommandBuildContext,
): BindingCommandBuildResult {
  const expression = expressionValueOrTargetCamelCase(info);
  const plainMode = context.isTwoWay(info.node, info.syntax.target)
    ? TemplateBindingMode.TwoWay
    : TemplateBindingMode.ToView;
  const mode = info.bindable == null
    ? plainMode
    : modeFromBindable(info.bindable.mode);
  const target = targetForPropertyBinding(info, context);
  const allocation = allocateInstruction(context, info, TemplateInstructionKind.PropertyBinding, command.name);

  return BindingCommandBuildResult.complete([
    new PropertyBindingInstruction(
      allocation.productHandle,
      allocation.identityHandle,
      info.node,
      info.attribute,
      target,
      context.parsePropertyExpression(expression, info),
      mode,
      bindingCommandReference(command),
      instructionSource(info),
    ),
  ]);
}

function buildAttributeBinding(
  command: { readonly name: string; readonly key: string },
  info: BindingCommandBuildInfo,
  context: BindingCommandBuildContext,
  attr: string,
  target: string,
  expression: string,
): BindingCommandBuildResult {
  const allocation = allocateInstruction(context, info, TemplateInstructionKind.AttributeBinding, command.name);
  return BindingCommandBuildResult.complete([
    new AttributeBindingInstruction(
      allocation.productHandle,
      allocation.identityHandle,
      info.node,
      info.attribute,
      attr,
      target,
      context.parsePropertyExpression(expression, info),
      instructionSource(info),
    ),
  ]);
}

export const enum BuiltInSyntaxPackage {
  /** Core template-compiler package. */
  TemplateCompiler = 'template-compiler',
  /** Runtime HTML package. */
  RuntimeHtml = 'runtime-html',
  /** I18n plugin package. */
  I18n = 'i18n',
  /** State plugin package. */
  State = 'state',
}

export const enum BuiltInSyntaxGroup {
  /** RuntimeHtml DefaultBindingSyntax group. */
  DefaultBindingSyntax = 'default-binding-syntax',
  /** RuntimeHtml ShortHandBindingSyntax group. */
  ShortHandBindingSyntax = 'short-hand-binding-syntax',
  /** RuntimeHtml DefaultBindingLanguage group. */
  DefaultBindingLanguage = 'default-binding-language',
  /** RuntimeHtml promise template-controller syntax resources. */
  PromiseTemplateControllerSyntax = 'promise-template-controller-syntax',
  /** I18n plugin translation syntax resources. */
  I18nTranslationSyntax = 'i18n-translation-syntax',
  /** State plugin syntax resources. */
  StateSyntax = 'state-syntax',
}

/** Stable names of framework-owned binding commands known to semantic-runtime. */
export enum BuiltInBindingCommandName {
  /** Default property binding command (`target.bind`). */
  Bind = 'bind',
  /** One-time property binding command (`target.one-time`). */
  OneTime = 'one-time',
  /** From-view property binding command (`target.from-view`). */
  FromView = 'from-view',
  /** To-view property binding command (`target.to-view`). */
  ToView = 'to-view',
  /** Two-way property binding command (`target.two-way`). */
  TwoWay = 'two-way',
  /** Iterator binding command used by repeat-like template controllers (`target.for`). */
  For = 'for',
  /** Reference binding command (`ref` / `target.ref`). */
  Ref = 'ref',
  /** DOM event trigger command (`event.trigger`). */
  Trigger = 'trigger',
  /** DOM event capture command (`event.capture`). */
  Capture = 'capture',
  /** Class-token command (`token.class`). */
  Class = 'class',
  /** Style-property command (`property.style`). */
  Style = 'style',
  /** Attribute binding command (`attribute.attr`). */
  Attr = 'attr',
  /** Spread binding command (`...$bindables` / `...$element`). */
  Spread = 'spread',
  /** I18n translation command (`t`). */
  Translation = 't',
  /** I18n translation bind command (`t.bind`). */
  TranslationBind = 't.bind',
  /** I18n translation-parameters command (`t-params.bind`). */
  TranslationParametersBind = 't-params.bind',
  /** State plugin read command (`target.state`). */
  State = 'state',
  /** State plugin dispatch command (`event.dispatch`). */
  Dispatch = 'dispatch',
}

/** Common authored target names used with framework-owned binding commands; arbitrary user targets remain strings. */
export enum BuiltInBindingCommandTargetName {
  /** Native value property used by value observers and select observers. */
  Value = 'value',
  /** Authored alias for the native `valueAsNumber` property. */
  ValueAsNumber = 'value-as-number',
  /** Authored alias for the native `valueAsDate` property. */
  ValueAsDate = 'value-as-date',
  /** Native checked property used by checkbox and radio observers. */
  Checked = 'checked',
  /** Special ref target whose authored form can collapse to bare `ref`. */
  Element = 'element',
  /** Full class attribute target for `class.bind`. */
  Class = 'class',
  /** Full style attribute target for `style.bind`. */
  Style = 'style',
  /** Option/input model target used for object-valued choice controls. */
  Model = 'model',
  /** Equality matcher target used by checked/select object comparison. */
  Matcher = 'matcher',
  /** Repeat template-controller target for `repeat.for` iterator bindings. */
  Repeat = 'repeat',
}

export type BuiltInSyntaxCatalogField =
  | 'attributePatterns'
  | 'bindingCommands'
  | 'package'
  | 'variant'
  | 'group'
  | 'source';

export type ConfiguredBuiltInSyntaxCatalogSelectionField =
  | 'registrationAdmission'
  | 'frameworkKind'
  | 'catalogs'
  | 'source';

export type BuiltInAttributePatternField =
  | 'targetName'
  | 'patterns'
  | 'aliases'
  | 'package'
  | 'group';

export type BuiltInBindingCommandField =
  | 'targetName'
  | 'name'
  | 'aliases'
  | 'key'
  | 'ignoreAttr'
  | 'produces'
  | 'producedInstructionTypeNames'
  | 'package'
  | 'group';

/** Expression-parser entry family used by a built-in binding command's primary authored value. */
export const enum BuiltInBindingCommandExpressionEntryFamily {
  /** The command does not parse its raw attribute value as an Aurelia expression. */
  None = 'none',
  /** The command parses its raw attribute value as a property-like binding expression. */
  Property = 'property',
  /** The command parses its raw attribute value as the framework's function/listener expression family. */
  Function = 'function',
  /** The command parses its raw attribute value as an iterator header. */
  Iterator = 'iterator',
}

/** Lookup identity for a built-in binding command syntax handler. */
export interface BuiltInBindingCommandLookupKey {
  /** Package that owns the binding command handler. */
  readonly packageId: BuiltInSyntaxPackage;
  /** Runtime binding-command name such as `bind`, `trigger`, `state`, or `dispatch`. */
  readonly name: BuiltInBindingCommandName;
}

/** Request to serialize one framework-owned binding-command attribute. */
export interface BuiltInBindingCommandAttributeSourceRequest {
  /** Runtime binding-command name such as `bind`, `trigger`, `state`, or `dispatch`. */
  readonly commandName: BuiltInBindingCommandName;
  /** Attribute target part before the command suffix, such as `value` in `value.bind`. */
  readonly targetName: string;
  /** Authored raw attribute value before HTML attribute escaping. */
  readonly rawValue: string;
  /** Optional secondary pattern part after `:`, such as a state store name. */
  readonly commandArgument?: string;
}

/** Serialized raw attribute parts for one framework-owned binding-command attribute. */
export interface BuiltInBindingCommandAttributeSource {
  /** Authored raw attribute name. */
  readonly rawName: string;
  /** Authored raw attribute value before HTML attribute escaping. */
  readonly rawValue: string;
}

/** Serialize the raw attribute name for a framework-owned binding command. */
export function builtInBindingCommandAttributeName(
  commandName: BuiltInBindingCommandName,
  targetName: string,
  commandArgument = '',
): string {
  if (commandName === BuiltInBindingCommandName.Ref && (targetName.length === 0 || targetName === BuiltInBindingCommandTargetName.Element)) {
    return BuiltInBindingCommandName.Ref;
  }
  if (
    commandName === BuiltInBindingCommandName.Translation
    || commandName === BuiltInBindingCommandName.TranslationBind
    || commandName === BuiltInBindingCommandName.TranslationParametersBind
  ) {
    return commandName;
  }
  const argumentSuffix = commandArgument.length === 0 ? '' : `:${commandArgument}`;
  return `${targetName}.${commandName}${argumentSuffix}`;
}

/** Serialize one framework-owned binding-command attribute as raw parts. */
export function builtInBindingCommandAttributeSource(
  request: BuiltInBindingCommandAttributeSourceRequest,
): BuiltInBindingCommandAttributeSource {
  return {
    rawName: builtInBindingCommandAttributeName(request.commandName, request.targetName, request.commandArgument ?? ''),
    rawValue: request.rawValue,
  };
}

/** Serialize one framework-owned binding-command attribute to authored template source. */
export function builtInBindingCommandAttributeText(
  request: BuiltInBindingCommandAttributeSourceRequest,
): string {
  return authoredTemplateAttributeText(builtInBindingCommandAttributeSource(request));
}

/** Escape a raw value for use inside a double-quoted template attribute. */
/** Pure parse result for a raw attribute name against the built-in attribute-pattern inventory. */
export interface BuiltInAttributeSyntaxParseResult {
  /** Runtime-shaped attribute parser execution result. */
  readonly execution: AttributePatternExecutionResult;
  /** Pattern definition selected by runtime pattern scoring, when any built-in pattern matched. */
  readonly pattern: AttributePatternDefinitionEntry | null;
  /** Built-in attribute-pattern handler that owns the selected definition. */
  readonly handler: BuiltInAttributePattern | null;
  /** Dynamic pattern parts extracted from the raw attribute name. */
  readonly parts: readonly string[];
}

@auLink('template-compiler:RefAttributePattern')
export class RefAttributePattern {
  readonly packageId = BuiltInSyntaxPackage.TemplateCompiler;
  readonly group = BuiltInSyntaxGroup.DefaultBindingSyntax;
  readonly targetName = 'RefAttributePattern';
  readonly patterns = [
    new AttributePatternDefinitionEntry('ref', ''),
    new AttributePatternDefinitionEntry('PART.ref', '.'),
  ] as const;
  readonly executionKind = AttributePatternExecutionKind.BuiltIn;

  constructor(
    readonly productHandle: ProductHandle | null = null,
    readonly identityHandle: IdentityHandle | null = null,
    readonly sourceAddressHandle: AddressHandle | null = null,
    readonly fieldProvenance: readonly FieldProvenance<BuiltInAttributePatternField>[] = [],
  ) {}

  'ref'(rawName: string, rawValue: string, _parts: readonly string[]): AttributePatternExecutionResult {
    return attributePatternResult(rawName, rawValue, 'element', 'ref');
  }

  'PART.ref'(rawName: string, rawValue: string, parts: readonly string[]): AttributePatternExecutionResult {
    const target = parts[0] === 'view-model' ? 'component' : parts[0] ?? '';
    return attributePatternResult(rawName, rawValue, target, 'ref');
  }
}

@auLink('template-compiler:DotSeparatedAttributePattern')
export class DotSeparatedAttributePattern {
  readonly packageId = BuiltInSyntaxPackage.TemplateCompiler;
  readonly group = BuiltInSyntaxGroup.DefaultBindingSyntax;
  readonly targetName = 'DotSeparatedAttributePattern';
  readonly patterns = [
    new AttributePatternDefinitionEntry('PART.PART', '.'),
    new AttributePatternDefinitionEntry('PART.PART.PART', '.'),
  ] as const;
  readonly executionKind = AttributePatternExecutionKind.BuiltIn;

  constructor(
    readonly productHandle: ProductHandle | null = null,
    readonly identityHandle: IdentityHandle | null = null,
    readonly sourceAddressHandle: AddressHandle | null = null,
    readonly fieldProvenance: readonly FieldProvenance<BuiltInAttributePatternField>[] = [],
  ) {}

  'PART.PART'(rawName: string, rawValue: string, parts: readonly string[]): AttributePatternExecutionResult {
    return attributePatternResult(rawName, rawValue, parts[0] ?? '', parts[1] ?? null);
  }

  'PART.PART.PART'(rawName: string, rawValue: string, parts: readonly string[]): AttributePatternExecutionResult {
    return attributePatternResult(rawName, rawValue, `${parts[0] ?? ''}.${parts[1] ?? ''}`, parts[2] ?? null);
  }
}

@auLink('template-compiler:EventAttributePattern')
export class EventAttributePattern {
  readonly packageId = BuiltInSyntaxPackage.TemplateCompiler;
  readonly group = BuiltInSyntaxGroup.DefaultBindingSyntax;
  readonly targetName = 'EventAttributePattern';
  readonly patterns = [
    new AttributePatternDefinitionEntry('PART.trigger:PART', '.:'),
    new AttributePatternDefinitionEntry('PART.capture:PART', '.:'),
  ] as const;
  readonly executionKind = AttributePatternExecutionKind.BuiltIn;

  constructor(
    readonly productHandle: ProductHandle | null = null,
    readonly identityHandle: IdentityHandle | null = null,
    readonly sourceAddressHandle: AddressHandle | null = null,
    readonly fieldProvenance: readonly FieldProvenance<BuiltInAttributePatternField>[] = [],
  ) {}

  'PART.trigger:PART'(rawName: string, rawValue: string, parts: readonly string[]): AttributePatternExecutionResult {
    return attributePatternResult(rawName, rawValue, parts[0] ?? '', 'trigger', parts);
  }

  'PART.capture:PART'(rawName: string, rawValue: string, parts: readonly string[]): AttributePatternExecutionResult {
    return attributePatternResult(rawName, rawValue, parts[0] ?? '', 'capture', parts);
  }
}

@auLink('template-compiler:AtPrefixedTriggerAttributePattern')
export class AtPrefixedTriggerAttributePattern {
  readonly packageId = BuiltInSyntaxPackage.TemplateCompiler;
  readonly group = BuiltInSyntaxGroup.ShortHandBindingSyntax;
  readonly targetName = 'AtPrefixedTriggerAttributePattern';
  readonly patterns = [
    new AttributePatternDefinitionEntry('@PART', '@'),
    new AttributePatternDefinitionEntry('@PART:PART', '@:'),
  ] as const;
  readonly executionKind = AttributePatternExecutionKind.BuiltIn;

  constructor(
    readonly productHandle: ProductHandle | null = null,
    readonly identityHandle: IdentityHandle | null = null,
    readonly sourceAddressHandle: AddressHandle | null = null,
    readonly fieldProvenance: readonly FieldProvenance<BuiltInAttributePatternField>[] = [],
  ) {}

  '@PART'(rawName: string, rawValue: string, parts: readonly string[]): AttributePatternExecutionResult {
    return attributePatternResult(rawName, rawValue, parts[0] ?? '', 'trigger');
  }

  '@PART:PART'(rawName: string, rawValue: string, parts: readonly string[]): AttributePatternExecutionResult {
    return attributePatternResult(rawName, rawValue, parts[0] ?? '', 'trigger', [
      parts[0] ?? '',
      'trigger',
      ...parts.slice(1),
    ]);
  }
}

@auLink('template-compiler:ColonPrefixedBindAttributePattern')
export class ColonPrefixedBindAttributePattern {
  readonly packageId = BuiltInSyntaxPackage.TemplateCompiler;
  readonly group = BuiltInSyntaxGroup.ShortHandBindingSyntax;
  readonly targetName = 'ColonPrefixedBindAttributePattern';
  readonly patterns = [new AttributePatternDefinitionEntry(':PART', ':')] as const;
  readonly executionKind = AttributePatternExecutionKind.BuiltIn;

  constructor(
    readonly productHandle: ProductHandle | null = null,
    readonly identityHandle: IdentityHandle | null = null,
    readonly sourceAddressHandle: AddressHandle | null = null,
    readonly fieldProvenance: readonly FieldProvenance<BuiltInAttributePatternField>[] = [],
  ) {}

  ':PART'(rawName: string, rawValue: string, parts: readonly string[]): AttributePatternExecutionResult {
    return attributePatternResult(rawName, rawValue, parts[0] ?? '', 'bind');
  }
}

@auLink('runtime-html:PromiseAttributePattern')
export class PromiseAttributePattern {
  readonly packageId = BuiltInSyntaxPackage.RuntimeHtml;
  readonly group = BuiltInSyntaxGroup.PromiseTemplateControllerSyntax;
  readonly targetName = 'PromiseAttributePattern';
  readonly patterns = [new AttributePatternDefinitionEntry('promise.resolve', '')] as const;
  readonly executionKind = AttributePatternExecutionKind.BuiltIn;

  constructor(
    readonly productHandle: ProductHandle | null = null,
    readonly identityHandle: IdentityHandle | null = null,
    readonly sourceAddressHandle: AddressHandle | null = null,
    readonly fieldProvenance: readonly FieldProvenance<BuiltInAttributePatternField>[] = [],
  ) {}

  'promise.resolve'(rawName: string, rawValue: string, _parts: readonly string[]): AttributePatternExecutionResult {
    return attributePatternResult(rawName, rawValue, 'promise', 'bind');
  }
}

@auLink('runtime-html:FulfilledAttributePattern')
export class FulfilledAttributePattern {
  readonly packageId = BuiltInSyntaxPackage.RuntimeHtml;
  readonly group = BuiltInSyntaxGroup.PromiseTemplateControllerSyntax;
  readonly targetName = 'FulfilledAttributePattern';
  readonly patterns = [new AttributePatternDefinitionEntry('then', '')] as const;
  readonly executionKind = AttributePatternExecutionKind.BuiltIn;

  constructor(
    readonly productHandle: ProductHandle | null = null,
    readonly identityHandle: IdentityHandle | null = null,
    readonly sourceAddressHandle: AddressHandle | null = null,
    readonly fieldProvenance: readonly FieldProvenance<BuiltInAttributePatternField>[] = [],
  ) {}

  'then'(rawName: string, rawValue: string, _parts: readonly string[]): AttributePatternExecutionResult {
    return attributePatternResult(rawName, rawValue, 'then', 'from-view');
  }
}

@auLink('runtime-html:RejectedAttributePattern')
export class RejectedAttributePattern {
  readonly packageId = BuiltInSyntaxPackage.RuntimeHtml;
  readonly group = BuiltInSyntaxGroup.PromiseTemplateControllerSyntax;
  readonly targetName = 'RejectedAttributePattern';
  readonly patterns = [new AttributePatternDefinitionEntry('catch', '')] as const;
  readonly executionKind = AttributePatternExecutionKind.BuiltIn;

  constructor(
    readonly productHandle: ProductHandle | null = null,
    readonly identityHandle: IdentityHandle | null = null,
    readonly sourceAddressHandle: AddressHandle | null = null,
    readonly fieldProvenance: readonly FieldProvenance<BuiltInAttributePatternField>[] = [],
  ) {}

  'catch'(rawName: string, rawValue: string, _parts: readonly string[]): AttributePatternExecutionResult {
    return attributePatternResult(rawName, rawValue, 'catch', 'from-view');
  }
}

/**
 * I18n creates this pattern class inside its configuration factory so aliases can be configured.
 * There is no stable top-level framework declaration to anchor with auLink.
 */
export class I18nTranslationAttributePattern {
  readonly packageId = BuiltInSyntaxPackage.I18n;
  readonly group = BuiltInSyntaxGroup.I18nTranslationSyntax;
  readonly targetName = 'TranslationAttributePattern';
  readonly patterns: readonly AttributePatternDefinitionEntry[];
  readonly executionKind = AttributePatternExecutionKind.BuiltIn;

  constructor(
    readonly productHandle: ProductHandle | null = null,
    readonly identityHandle: IdentityHandle | null = null,
    readonly sourceAddressHandle: AddressHandle | null = null,
    readonly fieldProvenance: readonly FieldProvenance<BuiltInAttributePatternField>[] = [],
    readonly aliases: readonly string[] = ['t'],
  ) {
    this.patterns = aliases.map((alias) => new AttributePatternDefinitionEntry(alias, ''));
  }

  't'(rawName: string, rawValue: string, _parts: readonly string[]): AttributePatternExecutionResult {
    return attributePatternResult(rawName, rawValue, '', 't');
  }

  execute(pattern: string, rawName: string, rawValue: string, _parts: readonly string[]): AttributePatternExecutionResult | null {
    return this.aliases.includes(pattern)
      ? attributePatternResult(rawName, rawValue, '', pattern)
      : null;
  }
}

/**
 * I18n creates this bind pattern class inside its configuration factory so aliases can be configured.
 * There is no stable top-level framework declaration to anchor with auLink.
 */
export class I18nTranslationBindAttributePattern {
  readonly packageId = BuiltInSyntaxPackage.I18n;
  readonly group = BuiltInSyntaxGroup.I18nTranslationSyntax;
  readonly targetName = 'TranslationBindAttributePattern';
  readonly patterns: readonly AttributePatternDefinitionEntry[];
  readonly executionKind = AttributePatternExecutionKind.BuiltIn;

  constructor(
    readonly productHandle: ProductHandle | null = null,
    readonly identityHandle: IdentityHandle | null = null,
    readonly sourceAddressHandle: AddressHandle | null = null,
    readonly fieldProvenance: readonly FieldProvenance<BuiltInAttributePatternField>[] = [],
    readonly aliases: readonly string[] = ['t'],
  ) {
    this.patterns = aliases.map((alias) => new AttributePatternDefinitionEntry(`${alias}.bind`, '.'));
  }

  't.bind'(rawName: string, rawValue: string, parts: readonly string[]): AttributePatternExecutionResult {
    return attributePatternResult(rawName, rawValue, parts[1] ?? '', 't.bind');
  }

  execute(pattern: string, rawName: string, rawValue: string, parts: readonly string[]): AttributePatternExecutionResult | null {
    return this.patterns.some((entry) => entry.pattern === pattern)
      ? attributePatternResult(rawName, rawValue, parts[1] ?? '', pattern)
      : null;
  }
}

@auLink('i18n:TranslationParametersAttributePattern')
export class TranslationParametersAttributePattern {
  readonly packageId = BuiltInSyntaxPackage.I18n;
  readonly group = BuiltInSyntaxGroup.I18nTranslationSyntax;
  readonly targetName = 'TranslationParametersAttributePattern';
  readonly patterns = [new AttributePatternDefinitionEntry('t-params.bind', '')] as const;
  readonly executionKind = AttributePatternExecutionKind.BuiltIn;

  constructor(
    readonly productHandle: ProductHandle | null = null,
    readonly identityHandle: IdentityHandle | null = null,
    readonly sourceAddressHandle: AddressHandle | null = null,
    readonly fieldProvenance: readonly FieldProvenance<BuiltInAttributePatternField>[] = [],
  ) {}

  't-params.bind'(rawName: string, rawValue: string, _parts: readonly string[]): AttributePatternExecutionResult {
    return attributePatternResult(rawName, rawValue, '', 't-params.bind');
  }
}

@auLink('state:StateAttributePattern')
export class StateAttributePattern {
  readonly packageId = BuiltInSyntaxPackage.State;
  readonly group = BuiltInSyntaxGroup.StateSyntax;
  readonly targetName = 'StateAttributePattern';
  readonly patterns = [
    new AttributePatternDefinitionEntry('PART.state:PART', '.:'),
    new AttributePatternDefinitionEntry('PART.dispatch:PART', '.:'),
  ] as const;
  readonly executionKind = AttributePatternExecutionKind.BuiltIn;

  constructor(
    readonly productHandle: ProductHandle | null = null,
    readonly identityHandle: IdentityHandle | null = null,
    readonly sourceAddressHandle: AddressHandle | null = null,
    readonly fieldProvenance: readonly FieldProvenance<BuiltInAttributePatternField>[] = [],
  ) {}

  'PART.state:PART'(rawName: string, rawValue: string, parts: readonly string[]): AttributePatternExecutionResult {
    return attributePatternResult(rawName, rawValue, parts[0] ?? '', 'state', parts.slice(2));
  }

  'PART.dispatch:PART'(rawName: string, rawValue: string, parts: readonly string[]): AttributePatternExecutionResult {
    return attributePatternResult(rawName, rawValue, parts[0] ?? '', 'dispatch', parts.slice(2));
  }
}

@auLink('template-compiler:DefaultBindingCommand')
export class DefaultBindingCommand {
  readonly packageId = BuiltInSyntaxPackage.TemplateCompiler;
  readonly group = BuiltInSyntaxGroup.DefaultBindingLanguage;
  readonly targetName = 'DefaultBindingCommand';
  readonly name = BuiltInBindingCommandName.Bind;
  readonly aliases = [] as const;
  readonly key = bindingCommandKey(this.name);
  readonly ignoreAttr = false;
  readonly producedInstructionKinds = [TemplateInstructionKind.PropertyBinding] as const;
  readonly producedInstructionTypeNames = [] as const;
  readonly executionKind = BindingCommandExecutionKind.BuiltIn;

  constructor(
    readonly productHandle: ProductHandle | null = null,
    readonly identityHandle: IdentityHandle | null = null,
    readonly sourceAddressHandle: AddressHandle | null = null,
    readonly fieldProvenance: readonly FieldProvenance<BuiltInBindingCommandField>[] = [],
  ) {}

  build(info: BindingCommandBuildInfo, context: BindingCommandBuildContext): BindingCommandBuildResult {
    return buildDefaultPropertyBinding(this, info, context);
  }
}

@auLink('template-compiler:OneTimeBindingCommand')
export class OneTimeBindingCommand {
  readonly packageId = BuiltInSyntaxPackage.TemplateCompiler;
  readonly group = BuiltInSyntaxGroup.DefaultBindingLanguage;
  readonly targetName = 'OneTimeBindingCommand';
  readonly name = BuiltInBindingCommandName.OneTime;
  readonly aliases = [] as const;
  readonly key = bindingCommandKey(this.name);
  readonly ignoreAttr = false;
  readonly producedInstructionKinds = [TemplateInstructionKind.PropertyBinding] as const;
  readonly producedInstructionTypeNames = [] as const;
  readonly executionKind = BindingCommandExecutionKind.BuiltIn;

  constructor(
    readonly productHandle: ProductHandle | null = null,
    readonly identityHandle: IdentityHandle | null = null,
    readonly sourceAddressHandle: AddressHandle | null = null,
    readonly fieldProvenance: readonly FieldProvenance<BuiltInBindingCommandField>[] = [],
  ) {}

  build(info: BindingCommandBuildInfo, context: BindingCommandBuildContext): BindingCommandBuildResult {
    return buildFixedPropertyBinding(this, info, context, TemplateBindingMode.OneTime);
  }
}

@auLink('template-compiler:FromViewBindingCommand')
export class FromViewBindingCommand {
  readonly packageId = BuiltInSyntaxPackage.TemplateCompiler;
  readonly group = BuiltInSyntaxGroup.DefaultBindingLanguage;
  readonly targetName = 'FromViewBindingCommand';
  readonly name = BuiltInBindingCommandName.FromView;
  readonly aliases = [] as const;
  readonly key = bindingCommandKey(this.name);
  readonly ignoreAttr = false;
  readonly producedInstructionKinds = [TemplateInstructionKind.PropertyBinding] as const;
  readonly producedInstructionTypeNames = [] as const;
  readonly executionKind = BindingCommandExecutionKind.BuiltIn;

  constructor(
    readonly productHandle: ProductHandle | null = null,
    readonly identityHandle: IdentityHandle | null = null,
    readonly sourceAddressHandle: AddressHandle | null = null,
    readonly fieldProvenance: readonly FieldProvenance<BuiltInBindingCommandField>[] = [],
  ) {}

  build(info: BindingCommandBuildInfo, context: BindingCommandBuildContext): BindingCommandBuildResult {
    return buildFixedPropertyBinding(this, info, context, TemplateBindingMode.FromView);
  }
}

@auLink('template-compiler:ToViewBindingCommand')
export class ToViewBindingCommand {
  readonly packageId = BuiltInSyntaxPackage.TemplateCompiler;
  readonly group = BuiltInSyntaxGroup.DefaultBindingLanguage;
  readonly targetName = 'ToViewBindingCommand';
  readonly name = BuiltInBindingCommandName.ToView;
  readonly aliases = [] as const;
  readonly key = bindingCommandKey(this.name);
  readonly ignoreAttr = false;
  readonly producedInstructionKinds = [TemplateInstructionKind.PropertyBinding] as const;
  readonly producedInstructionTypeNames = [] as const;
  readonly executionKind = BindingCommandExecutionKind.BuiltIn;

  constructor(
    readonly productHandle: ProductHandle | null = null,
    readonly identityHandle: IdentityHandle | null = null,
    readonly sourceAddressHandle: AddressHandle | null = null,
    readonly fieldProvenance: readonly FieldProvenance<BuiltInBindingCommandField>[] = [],
  ) {}

  build(info: BindingCommandBuildInfo, context: BindingCommandBuildContext): BindingCommandBuildResult {
    return buildFixedPropertyBinding(this, info, context, TemplateBindingMode.ToView);
  }
}

@auLink('template-compiler:TwoWayBindingCommand')
export class TwoWayBindingCommand {
  readonly packageId = BuiltInSyntaxPackage.TemplateCompiler;
  readonly group = BuiltInSyntaxGroup.DefaultBindingLanguage;
  readonly targetName = 'TwoWayBindingCommand';
  readonly name = BuiltInBindingCommandName.TwoWay;
  readonly aliases = [] as const;
  readonly key = bindingCommandKey(this.name);
  readonly ignoreAttr = false;
  readonly producedInstructionKinds = [TemplateInstructionKind.PropertyBinding] as const;
  readonly producedInstructionTypeNames = [] as const;
  readonly executionKind = BindingCommandExecutionKind.BuiltIn;

  constructor(
    readonly productHandle: ProductHandle | null = null,
    readonly identityHandle: IdentityHandle | null = null,
    readonly sourceAddressHandle: AddressHandle | null = null,
    readonly fieldProvenance: readonly FieldProvenance<BuiltInBindingCommandField>[] = [],
  ) {}

  build(info: BindingCommandBuildInfo, context: BindingCommandBuildContext): BindingCommandBuildResult {
    return buildFixedPropertyBinding(this, info, context, TemplateBindingMode.TwoWay);
  }
}

@auLink('template-compiler:ForBindingCommand')
export class ForBindingCommand {
  readonly packageId = BuiltInSyntaxPackage.TemplateCompiler;
  readonly group = BuiltInSyntaxGroup.DefaultBindingLanguage;
  readonly targetName = 'ForBindingCommand';
  readonly name = BuiltInBindingCommandName.For;
  readonly aliases = [] as const;
  readonly key = bindingCommandKey(this.name);
  readonly ignoreAttr = false;
  readonly producedInstructionKinds = [TemplateInstructionKind.IteratorBinding, TemplateInstructionKind.MultiAttr] as const;
  readonly producedInstructionTypeNames = [] as const;
  readonly executionKind = BindingCommandExecutionKind.BuiltIn;

  constructor(
    readonly productHandle: ProductHandle | null = null,
    readonly identityHandle: IdentityHandle | null = null,
    readonly sourceAddressHandle: AddressHandle | null = null,
    readonly fieldProvenance: readonly FieldProvenance<BuiltInBindingCommandField>[] = [],
  ) {}

  build(info: BindingCommandBuildInfo, context: BindingCommandBuildContext): BindingCommandBuildResult {
    const iterator = context.parseIteratorExpression(info.syntax.rawValue, info);
    const instructions: (MultiAttrInstruction | IteratorBindingInstruction)[] = [];
    const tailInstructionProductHandles: ProductHandle[] = [];
    const rawTailText = iterator.rawTailText;

    if (rawTailText != null && rawTailText !== '') {
      const tailParts = rawTailText.split(';');
      for (let index = 0; index < tailParts.length; index += 1) {
        const tailPart = tailParts[index]!;
        const colonIndex = tailPart.indexOf(':');
        if (colonIndex < 0) {
          continue;
        }

        const rawName = tailPart.slice(0, colonIndex).trim();
        const rawValue = tailPart.slice(colonIndex + 1).trim();
        const tailSyntax = context.parseAttributeSyntax(rawName, rawValue, info);
        if (tailSyntax == null) {
          continue;
        }

        const allocation = allocateInstruction(context, info, TemplateInstructionKind.MultiAttr, `${this.name}:tail:${index}`);
        tailInstructionProductHandles.push(allocation.productHandle);
        instructions.push(new MultiAttrInstruction(
          allocation.productHandle,
          allocation.identityHandle,
          info.node,
          info.attribute,
          tailSyntax.target,
          tailSyntax.command,
          rawValue,
          null,
          instructionSource(info),
        ));
      }
    }

    const allocation = allocateInstruction(context, info, TemplateInstructionKind.IteratorBinding, this.name);
    instructions.push(new IteratorBindingInstruction(
      allocation.productHandle,
      allocation.identityHandle,
      info.node,
      info.attribute,
      targetForIteratorBinding(info),
      iterator.localNames,
      iterator.expressionProductHandle,
      tailInstructionProductHandles,
      instructionSource(info),
    ));

    return BindingCommandBuildResult.complete(instructions);
  }
}

@auLink('template-compiler:RefBindingCommand')
export class RefBindingCommand {
  readonly packageId = BuiltInSyntaxPackage.TemplateCompiler;
  readonly group = BuiltInSyntaxGroup.DefaultBindingLanguage;
  readonly targetName = 'RefBindingCommand';
  readonly name = BuiltInBindingCommandName.Ref;
  readonly aliases = [] as const;
  readonly key = bindingCommandKey(this.name);
  readonly ignoreAttr = true;
  readonly producedInstructionKinds = [TemplateInstructionKind.RefBinding] as const;
  readonly producedInstructionTypeNames = [] as const;
  readonly executionKind = BindingCommandExecutionKind.BuiltIn;

  constructor(
    readonly productHandle: ProductHandle | null = null,
    readonly identityHandle: IdentityHandle | null = null,
    readonly sourceAddressHandle: AddressHandle | null = null,
    readonly fieldProvenance: readonly FieldProvenance<BuiltInBindingCommandField>[] = [],
  ) {}

  build(info: BindingCommandBuildInfo, context: BindingCommandBuildContext): BindingCommandBuildResult {
    const allocation = allocateInstruction(context, info, TemplateInstructionKind.RefBinding, this.name);
    return BindingCommandBuildResult.complete([
      new RefBindingInstruction(
        allocation.productHandle,
        allocation.identityHandle,
        info.node,
        info.attribute,
        info.syntax.target,
        context.parsePropertyExpression(info.syntax.rawValue, info),
        instructionSource(info),
      ),
    ]);
  }
}

@auLink('template-compiler:TriggerBindingCommand')
export class TriggerBindingCommand {
  readonly packageId = BuiltInSyntaxPackage.TemplateCompiler;
  readonly group = BuiltInSyntaxGroup.DefaultBindingLanguage;
  readonly targetName = 'TriggerBindingCommand';
  readonly name = BuiltInBindingCommandName.Trigger;
  readonly aliases = [] as const;
  readonly key = bindingCommandKey(this.name);
  readonly ignoreAttr = true;
  readonly producedInstructionKinds = [TemplateInstructionKind.ListenerBinding] as const;
  readonly producedInstructionTypeNames = [] as const;
  readonly executionKind = BindingCommandExecutionKind.BuiltIn;

  constructor(
    readonly productHandle: ProductHandle | null = null,
    readonly identityHandle: IdentityHandle | null = null,
    readonly sourceAddressHandle: AddressHandle | null = null,
    readonly fieldProvenance: readonly FieldProvenance<BuiltInBindingCommandField>[] = [],
  ) {}

  build(info: BindingCommandBuildInfo, context: BindingCommandBuildContext): BindingCommandBuildResult {
    const allocation = allocateInstruction(context, info, TemplateInstructionKind.ListenerBinding, this.name);
    return BindingCommandBuildResult.complete([
      new ListenerBindingInstruction(
        allocation.productHandle,
        allocation.identityHandle,
        info.node,
        info.attribute,
        info.syntax.target,
        context.parseFunctionExpression(info.syntax.rawValue, info),
        TemplateListenerStrategy.Trigger,
        info.syntax.parts[2] ?? null,
        bindingCommandReference(this),
        instructionSource(info),
      ),
    ]);
  }
}

@auLink('template-compiler:CaptureBindingCommand')
export class CaptureBindingCommand {
  readonly packageId = BuiltInSyntaxPackage.TemplateCompiler;
  readonly group = BuiltInSyntaxGroup.DefaultBindingLanguage;
  readonly targetName = 'CaptureBindingCommand';
  readonly name = BuiltInBindingCommandName.Capture;
  readonly aliases = [] as const;
  readonly key = bindingCommandKey(this.name);
  readonly ignoreAttr = true;
  readonly producedInstructionKinds = [TemplateInstructionKind.ListenerBinding] as const;
  readonly producedInstructionTypeNames = [] as const;
  readonly executionKind = BindingCommandExecutionKind.BuiltIn;

  constructor(
    readonly productHandle: ProductHandle | null = null,
    readonly identityHandle: IdentityHandle | null = null,
    readonly sourceAddressHandle: AddressHandle | null = null,
    readonly fieldProvenance: readonly FieldProvenance<BuiltInBindingCommandField>[] = [],
  ) {}

  build(info: BindingCommandBuildInfo, context: BindingCommandBuildContext): BindingCommandBuildResult {
    const allocation = allocateInstruction(context, info, TemplateInstructionKind.ListenerBinding, this.name);
    return BindingCommandBuildResult.complete([
      new ListenerBindingInstruction(
        allocation.productHandle,
        allocation.identityHandle,
        info.node,
        info.attribute,
        info.syntax.target,
        context.parseFunctionExpression(info.syntax.rawValue, info),
        TemplateListenerStrategy.Capture,
        info.syntax.parts[2] ?? null,
        bindingCommandReference(this),
        instructionSource(info),
      ),
    ]);
  }
}

@auLink('template-compiler:ClassBindingCommand')
export class ClassBindingCommand {
  readonly packageId = BuiltInSyntaxPackage.TemplateCompiler;
  readonly group = BuiltInSyntaxGroup.DefaultBindingLanguage;
  readonly targetName = 'ClassBindingCommand';
  readonly name = BuiltInBindingCommandName.Class;
  readonly aliases = [] as const;
  readonly key = bindingCommandKey(this.name);
  readonly ignoreAttr = true;
  readonly producedInstructionKinds = [TemplateInstructionKind.AttributeBinding] as const;
  readonly producedInstructionTypeNames = [] as const;
  readonly executionKind = BindingCommandExecutionKind.BuiltIn;

  constructor(
    readonly productHandle: ProductHandle | null = null,
    readonly identityHandle: IdentityHandle | null = null,
    readonly sourceAddressHandle: AddressHandle | null = null,
    readonly fieldProvenance: readonly FieldProvenance<BuiltInBindingCommandField>[] = [],
  ) {}

  build(info: BindingCommandBuildInfo, context: BindingCommandBuildContext): BindingCommandBuildResult {
    let target = info.syntax.target;

    if (target.includes(',')) {
      const classes = target
        .split(',')
        .filter((value) => value.length > 0);

      if (classes.length === 0) {
        return BindingCommandBuildResult.invalid(
          'Invalid class binding syntax.',
          TemplateCompilerFrameworkErrorCode.CompilerInvalidClassBindingSyntax,
          TemplateCompilerIssueKind.InvalidClassBindingSyntax,
        );
      }

      target = classes.join(' ');
    }

    return buildAttributeBinding(this, info, context, BuiltInBindingCommandTargetName.Class, target, info.syntax.rawValue);
  }
}

@auLink('template-compiler:StyleBindingCommand')
export class StyleBindingCommand {
  readonly packageId = BuiltInSyntaxPackage.TemplateCompiler;
  readonly group = BuiltInSyntaxGroup.DefaultBindingLanguage;
  readonly targetName = 'StyleBindingCommand';
  readonly name = BuiltInBindingCommandName.Style;
  readonly aliases = [] as const;
  readonly key = bindingCommandKey(this.name);
  readonly ignoreAttr = true;
  readonly producedInstructionKinds = [TemplateInstructionKind.AttributeBinding] as const;
  readonly producedInstructionTypeNames = [] as const;
  readonly executionKind = BindingCommandExecutionKind.BuiltIn;

  constructor(
    readonly productHandle: ProductHandle | null = null,
    readonly identityHandle: IdentityHandle | null = null,
    readonly sourceAddressHandle: AddressHandle | null = null,
    readonly fieldProvenance: readonly FieldProvenance<BuiltInBindingCommandField>[] = [],
  ) {}

  build(info: BindingCommandBuildInfo, context: BindingCommandBuildContext): BindingCommandBuildResult {
    return buildAttributeBinding(this, info, context, BuiltInBindingCommandTargetName.Style, info.syntax.target, info.syntax.rawValue);
  }
}

@auLink('template-compiler:AttrBindingCommand')
export class AttrBindingCommand {
  readonly packageId = BuiltInSyntaxPackage.TemplateCompiler;
  readonly group = BuiltInSyntaxGroup.DefaultBindingLanguage;
  readonly targetName = 'AttrBindingCommand';
  readonly name = BuiltInBindingCommandName.Attr;
  readonly aliases = [] as const;
  readonly key = bindingCommandKey(this.name);
  readonly ignoreAttr = true;
  readonly producedInstructionKinds = [TemplateInstructionKind.AttributeBinding] as const;
  readonly producedInstructionTypeNames = [] as const;
  readonly executionKind = BindingCommandExecutionKind.BuiltIn;

  constructor(
    readonly productHandle: ProductHandle | null = null,
    readonly identityHandle: IdentityHandle | null = null,
    readonly sourceAddressHandle: AddressHandle | null = null,
    readonly fieldProvenance: readonly FieldProvenance<BuiltInBindingCommandField>[] = [],
  ) {}

  build(info: BindingCommandBuildInfo, context: BindingCommandBuildContext): BindingCommandBuildResult {
    const expression = expressionValueOrTargetCamelCase(info);
    return buildAttributeBinding(this, info, context, info.syntax.target, info.syntax.target, expression);
  }
}

@auLink('template-compiler:SpreadValueBindingCommand')
export class SpreadValueBindingCommand {
  readonly packageId = BuiltInSyntaxPackage.TemplateCompiler;
  readonly group = BuiltInSyntaxGroup.DefaultBindingLanguage;
  readonly targetName = 'SpreadValueBindingCommand';
  readonly name = BuiltInBindingCommandName.Spread;
  readonly aliases = [] as const;
  readonly key = bindingCommandKey(this.name);
  readonly ignoreAttr = false;
  readonly producedInstructionKinds = [TemplateInstructionKind.SpreadValueBinding] as const;
  readonly producedInstructionTypeNames = [] as const;
  readonly executionKind = BindingCommandExecutionKind.BuiltIn;

  constructor(
    readonly productHandle: ProductHandle | null = null,
    readonly identityHandle: IdentityHandle | null = null,
    readonly sourceAddressHandle: AddressHandle | null = null,
    readonly fieldProvenance: readonly FieldProvenance<BuiltInBindingCommandField>[] = [],
  ) {}

  build(info: BindingCommandBuildInfo, context: BindingCommandBuildContext): BindingCommandBuildResult {
    const allocation = allocateInstruction(context, info, TemplateInstructionKind.SpreadValueBinding, this.name);
    return BindingCommandBuildResult.complete([
      new SpreadValueBindingInstruction(
        allocation.productHandle,
        allocation.identityHandle,
        info.node,
        info.attribute,
        info.syntax.target as '$bindables' | '$element',
        info.syntax.rawValue,
        context.parsePropertyExpression(info.syntax.rawValue, info),
        instructionSource(info),
      ),
    ]);
  }
}

@auLink('i18n:TranslationBindingCommand')
export class TranslationBindingCommand {
  readonly packageId = BuiltInSyntaxPackage.I18n;
  readonly group = BuiltInSyntaxGroup.I18nTranslationSyntax;
  readonly targetName = 'TranslationBindingCommand';
  readonly name = BuiltInBindingCommandName.Translation;
  readonly key = bindingCommandKey(this.name);
  readonly ignoreAttr = false;
  readonly producedInstructionKinds = [TemplateInstructionKind.TranslationBinding] as const;
  readonly producedInstructionTypeNames = [] as const;
  readonly executionKind = BindingCommandExecutionKind.BuiltIn;

  constructor(
    readonly productHandle: ProductHandle | null = null,
    readonly identityHandle: IdentityHandle | null = null,
    readonly sourceAddressHandle: AddressHandle | null = null,
    readonly fieldProvenance: readonly FieldProvenance<BuiltInBindingCommandField>[] = [],
    readonly aliases: readonly string[] = [],
  ) {}

  build(info: BindingCommandBuildInfo, context: BindingCommandBuildContext): BindingCommandBuildResult {
    const allocation = allocateInstruction(context, info, TemplateInstructionKind.TranslationBinding, this.name);
    return BindingCommandBuildResult.complete([
      new TranslationBindingInstruction(
        allocation.productHandle,
        allocation.identityHandle,
        info.node,
        info.attribute,
        info.syntax.rawValue,
        targetForPropertyBinding(info, context),
        instructionSource(info),
      ),
    ]);
  }
}

@auLink('i18n:TranslationBindBindingCommand')
export class TranslationBindBindingCommand {
  readonly packageId = BuiltInSyntaxPackage.I18n;
  readonly group = BuiltInSyntaxGroup.I18nTranslationSyntax;
  readonly targetName = 'TranslationBindBindingCommand';
  readonly name = BuiltInBindingCommandName.TranslationBind;
  readonly key = bindingCommandKey(this.name);
  readonly ignoreAttr = false;
  readonly producedInstructionKinds = [TemplateInstructionKind.TranslationBindBinding] as const;
  readonly producedInstructionTypeNames = [] as const;
  readonly executionKind = BindingCommandExecutionKind.BuiltIn;

  constructor(
    readonly productHandle: ProductHandle | null = null,
    readonly identityHandle: IdentityHandle | null = null,
    readonly sourceAddressHandle: AddressHandle | null = null,
    readonly fieldProvenance: readonly FieldProvenance<BuiltInBindingCommandField>[] = [],
    readonly aliases: readonly string[] = [],
  ) {}

  build(info: BindingCommandBuildInfo, context: BindingCommandBuildContext): BindingCommandBuildResult {
    const allocation = allocateInstruction(context, info, TemplateInstructionKind.TranslationBindBinding, this.name);
    return BindingCommandBuildResult.complete([
      new TranslationBindBindingInstruction(
        allocation.productHandle,
        allocation.identityHandle,
        info.node,
        info.attribute,
        context.parsePropertyExpression(info.syntax.rawValue, info),
        targetForPropertyBinding(info, context),
        instructionSource(info),
      ),
    ]);
  }
}

@auLink('i18n:TranslationParametersBindingCommand')
export class TranslationParametersBindingCommand {
  readonly packageId = BuiltInSyntaxPackage.I18n;
  readonly group = BuiltInSyntaxGroup.I18nTranslationSyntax;
  readonly targetName = 'TranslationParametersBindingCommand';
  readonly name = BuiltInBindingCommandName.TranslationParametersBind;
  readonly aliases = [] as const;
  readonly key = bindingCommandKey(this.name);
  readonly ignoreAttr = false;
  readonly producedInstructionKinds = [TemplateInstructionKind.TranslationParametersBinding] as const;
  readonly producedInstructionTypeNames = [] as const;
  readonly executionKind = BindingCommandExecutionKind.BuiltIn;

  constructor(
    readonly productHandle: ProductHandle | null = null,
    readonly identityHandle: IdentityHandle | null = null,
    readonly sourceAddressHandle: AddressHandle | null = null,
    readonly fieldProvenance: readonly FieldProvenance<BuiltInBindingCommandField>[] = [],
  ) {}

  build(info: BindingCommandBuildInfo, context: BindingCommandBuildContext): BindingCommandBuildResult {
    const allocation = allocateInstruction(context, info, TemplateInstructionKind.TranslationParametersBinding, this.name);
    return BindingCommandBuildResult.complete([
      new TranslationParametersBindingInstruction(
        allocation.productHandle,
        allocation.identityHandle,
        info.node,
        info.attribute,
        context.parsePropertyExpression(info.syntax.rawValue, info),
        targetForPropertyBinding(info, context),
        instructionSource(info),
      ),
    ]);
  }
}

@auLink('state:StateBindingCommand')
export class StateBindingCommand {
  readonly packageId = BuiltInSyntaxPackage.State;
  readonly group = BuiltInSyntaxGroup.StateSyntax;
  readonly targetName = 'StateBindingCommand';
  readonly name = BuiltInBindingCommandName.State;
  readonly aliases = [] as const;
  readonly key = bindingCommandKey(this.name);
  readonly ignoreAttr = false;
  readonly producedInstructionKinds = [TemplateInstructionKind.StateBinding] as const;
  readonly producedInstructionTypeNames = [] as const;
  readonly executionKind = BindingCommandExecutionKind.BuiltIn;

  constructor(
    readonly productHandle: ProductHandle | null = null,
    readonly identityHandle: IdentityHandle | null = null,
    readonly sourceAddressHandle: AddressHandle | null = null,
    readonly fieldProvenance: readonly FieldProvenance<BuiltInBindingCommandField>[] = [],
  ) {}

  build(info: BindingCommandBuildInfo, context: BindingCommandBuildContext): BindingCommandBuildResult {
    const expression = expressionValueOrTargetCamelCase(info);
    const allocation = allocateInstruction(context, info, TemplateInstructionKind.StateBinding, this.name);
    return BindingCommandBuildResult.complete([
      new StateBindingInstruction(
        allocation.productHandle,
        allocation.identityHandle,
        info.node,
        info.attribute,
        expression,
        targetForPropertyBinding(info, context),
        info.syntax.parts[0] ?? null,
        context.parseFunctionExpression(expression, info),
        instructionSource(info),
      ),
    ]);
  }
}

@auLink('state:DispatchBindingCommand')
export class DispatchBindingCommand {
  readonly packageId = BuiltInSyntaxPackage.State;
  readonly group = BuiltInSyntaxGroup.StateSyntax;
  readonly targetName = 'DispatchBindingCommand';
  readonly name = BuiltInBindingCommandName.Dispatch;
  readonly aliases = [] as const;
  readonly key = bindingCommandKey(this.name);
  readonly ignoreAttr = true;
  readonly producedInstructionKinds = [TemplateInstructionKind.DispatchBinding] as const;
  readonly producedInstructionTypeNames = [] as const;
  readonly executionKind = BindingCommandExecutionKind.BuiltIn;

  constructor(
    readonly productHandle: ProductHandle | null = null,
    readonly identityHandle: IdentityHandle | null = null,
    readonly sourceAddressHandle: AddressHandle | null = null,
    readonly fieldProvenance: readonly FieldProvenance<BuiltInBindingCommandField>[] = [],
  ) {}

  build(info: BindingCommandBuildInfo, context: BindingCommandBuildContext): BindingCommandBuildResult {
    const allocation = allocateInstruction(context, info, TemplateInstructionKind.DispatchBinding, this.name);
    return BindingCommandBuildResult.complete([
      new DispatchBindingInstruction(
        allocation.productHandle,
        allocation.identityHandle,
        info.node,
        info.attribute,
        info.syntax.target,
        info.syntax.rawValue,
        info.syntax.parts[0] ?? null,
        context.parsePropertyExpression(info.syntax.rawValue, info),
        instructionSource(info),
      ),
    ]);
  }
}

export type BuiltInAttributePattern =
  | RefAttributePattern
  | DotSeparatedAttributePattern
  | EventAttributePattern
  | AtPrefixedTriggerAttributePattern
  | ColonPrefixedBindAttributePattern
  | PromiseAttributePattern
  | FulfilledAttributePattern
  | RejectedAttributePattern
  | I18nTranslationAttributePattern
  | I18nTranslationBindAttributePattern
  | TranslationParametersAttributePattern
  | StateAttributePattern;

export function executeBuiltInAttributePattern(
  handler: BuiltInAttributePattern,
  pattern: string,
  rawName: string,
  rawValue: string,
  parts: readonly string[],
): AttributePatternExecutionResult | null {
  switch (pattern) {
    case 'ref':
      return handler instanceof RefAttributePattern ? handler['ref'](rawName, rawValue, parts) : null;
    case 'PART.ref':
      return handler instanceof RefAttributePattern ? handler['PART.ref'](rawName, rawValue, parts) : null;
    case 'PART.PART':
      return handler instanceof DotSeparatedAttributePattern ? handler['PART.PART'](rawName, rawValue, parts) : null;
    case 'PART.PART.PART':
      return handler instanceof DotSeparatedAttributePattern ? handler['PART.PART.PART'](rawName, rawValue, parts) : null;
    case 'PART.trigger:PART':
      return handler instanceof EventAttributePattern ? handler['PART.trigger:PART'](rawName, rawValue, parts) : null;
    case 'PART.capture:PART':
      return handler instanceof EventAttributePattern ? handler['PART.capture:PART'](rawName, rawValue, parts) : null;
    case '@PART':
      return handler instanceof AtPrefixedTriggerAttributePattern ? handler['@PART'](rawName, rawValue, parts) : null;
    case '@PART:PART':
      return handler instanceof AtPrefixedTriggerAttributePattern ? handler['@PART:PART'](rawName, rawValue, parts) : null;
    case ':PART':
      return handler instanceof ColonPrefixedBindAttributePattern ? handler[':PART'](rawName, rawValue, parts) : null;
    case 'promise.resolve':
      return handler instanceof PromiseAttributePattern ? handler['promise.resolve'](rawName, rawValue, parts) : null;
    case 'then':
      return handler instanceof FulfilledAttributePattern ? handler['then'](rawName, rawValue, parts) : null;
    case 'catch':
      return handler instanceof RejectedAttributePattern ? handler['catch'](rawName, rawValue, parts) : null;
    case 't':
      return handler instanceof I18nTranslationAttributePattern ? handler['t'](rawName, rawValue, parts) : null;
    case 't.bind':
      return handler instanceof I18nTranslationBindAttributePattern ? handler['t.bind'](rawName, rawValue, parts) : null;
    case 't-params.bind':
      return handler instanceof TranslationParametersAttributePattern ? handler['t-params.bind'](rawName, rawValue, parts) : null;
    case 'PART.state:PART':
      return handler instanceof StateAttributePattern ? handler['PART.state:PART'](rawName, rawValue, parts) : null;
    case 'PART.dispatch:PART':
      return handler instanceof StateAttributePattern ? handler['PART.dispatch:PART'](rawName, rawValue, parts) : null;
    default:
      if (handler instanceof I18nTranslationAttributePattern) {
        return handler.execute(pattern, rawName, rawValue, parts);
      }
      if (handler instanceof I18nTranslationBindAttributePattern) {
        return handler.execute(pattern, rawName, rawValue, parts);
      }
      return null;
  }
}

/** All built-in attribute-pattern handlers known to semantic-runtime. */
export function allBuiltInAttributePatterns(): readonly BuiltInAttributePattern[] {
  return [
    ...RuntimeHtmlDefaultAttributePatterns,
    ...RuntimeHtmlShortHandAttributePatterns,
    ...RuntimeHtmlPromiseAttributePatterns,
    ...I18nDefaultAttributePatterns,
    ...StateDefaultAttributePatterns,
  ];
}

/** Parse a raw attribute through the same built-in pattern inventory used to build compiler worlds. */
export function parseBuiltInAttributeSyntax(
  rawName: string,
  rawValue: string,
): BuiltInAttributeSyntaxParseResult {
  let best: {
    readonly handler: BuiltInAttributePattern;
    readonly pattern: AttributePatternDefinitionEntry;
    readonly score: AttributePatternScore;
    readonly parts: readonly string[];
  } | null = null;

  for (const handler of allBuiltInAttributePatterns()) {
    for (const pattern of handler.patterns) {
      const compiled = compileAttributePatternDefinition(pattern);
      const parts = matchAttributePatternTokens(rawName, compiled.tokens, compiled.symbols);
      if (parts == null) {
        continue;
      }
      if (best == null || isBetterAttributePatternScore(compiled.score, best.score)) {
        best = {
          handler,
          pattern,
          score: compiled.score,
          parts,
        };
      }
    }
  }

  if (best == null) {
    return {
      execution: AttributePatternExecutionResult.plain(rawName, rawValue),
      pattern: null,
      handler: null,
      parts: [],
    };
  }

  return {
    execution: executeBuiltInAttributePattern(
      best.handler,
      best.pattern.pattern,
      rawName,
      rawValue,
      best.parts,
    ) ?? new AttributePatternExecutionResult(
      AttributeSyntaxKind.Open,
      rawName,
      rawValue,
      rawName,
      null,
      best.parts,
    ),
    pattern: best.pattern,
    handler: best.handler,
    parts: best.parts,
  };
}

export type BuiltInBindingCommand =
  | DefaultBindingCommand
  | OneTimeBindingCommand
  | FromViewBindingCommand
  | ToViewBindingCommand
  | TwoWayBindingCommand
  | ForBindingCommand
  | RefBindingCommand
  | TriggerBindingCommand
  | CaptureBindingCommand
  | ClassBindingCommand
  | StyleBindingCommand
  | AttrBindingCommand
  | SpreadValueBindingCommand
  | TranslationBindingCommand
  | TranslationBindBindingCommand
  | TranslationParametersBindingCommand
  | StateBindingCommand
  | DispatchBindingCommand;

/** Read the expression-parser entry family a built-in command uses during framework-shaped lowering or renderer handoff. */
export function builtInBindingCommandExpressionEntryFamily(
  command: BuiltInBindingCommand,
): BuiltInBindingCommandExpressionEntryFamily {
  if (command instanceof TranslationBindingCommand) {
    return BuiltInBindingCommandExpressionEntryFamily.None;
  }
  if (command instanceof TriggerBindingCommand || command instanceof CaptureBindingCommand || command instanceof StateBindingCommand) {
    return BuiltInBindingCommandExpressionEntryFamily.Function;
  }
  if (command instanceof ForBindingCommand) {
    return BuiltInBindingCommandExpressionEntryFamily.Iterator;
  }
  return BuiltInBindingCommandExpressionEntryFamily.Property;
}

/** Convert a built-in command expression family into the parser facade's entry-family value. */
export function builtInBindingCommandExpressionType(
  command: BuiltInBindingCommand,
): ExpressionType | null {
  switch (builtInBindingCommandExpressionEntryFamily(command)) {
    case BuiltInBindingCommandExpressionEntryFamily.None:
      return null;
    case BuiltInBindingCommandExpressionEntryFamily.Property:
      return 'IsProperty';
    case BuiltInBindingCommandExpressionEntryFamily.Function:
      return 'IsFunction';
    case BuiltInBindingCommandExpressionEntryFamily.Iterator:
      return 'IsIterator';
  }
}

/** Product model for one package/configuration group's built-in syntax resources. */
export class BuiltInSyntaxCatalog {
  constructor(
    /** Product handle for the materialized-product envelope that represents this catalog. */
    readonly productHandle: ProductHandle,
    /** Identity for this catalog model. */
    readonly identityHandle: IdentityHandle,
    /** Package that owns this catalog. */
    readonly packageId: BuiltInSyntaxPackage,
    /** Configuration-specific catalog variant, when runtime options changed the admitted syntax. */
    readonly variantKey: string | null,
    /** Configuration group that admits the catalog. */
    readonly group: BuiltInSyntaxGroup,
    /** Built-in attribute-pattern handlers contributed by this group. */
    readonly attributePatterns: readonly BuiltInAttributePattern[],
    /** Built-in binding-command handlers contributed by this group. */
    readonly bindingCommands: readonly BuiltInBindingCommand[],
    /** Source address for the configuration group, when materialized from source. */
    readonly sourceAddressHandle: AddressHandle | null,
    /** Field-level provenance for source facts that matter to explanation or ambiguity. */
    readonly fieldProvenance: readonly FieldProvenance<BuiltInSyntaxCatalogField>[] = [],
  ) {}
}

/** Syntax catalog selection admitted by a known framework registration. */
export class ConfiguredBuiltInSyntaxCatalogSelection {
  constructor(
    /** Product handle for the materialized-product envelope that represents this selection. */
    readonly productHandle: ProductHandle,
    /** Identity for this configured syntax-catalog selection. */
    readonly identityHandle: IdentityHandle,
    /** Registration admission product that admitted these catalogs. */
    readonly registrationAdmissionProductHandle: ProductHandle,
    /** Known framework registration effect package that caused the selection. */
    readonly frameworkKind: FrameworkRegistrationKind,
    /** Built-in syntax catalog products made available by this registration. */
    readonly catalogProductHandles: readonly ProductHandle[],
    /** Source address for the registration admission or configuration expression. */
    readonly sourceAddressHandle: AddressHandle | null,
    /** Field-level provenance for source facts that matter to explanation or ambiguity. */
    readonly fieldProvenance: readonly FieldProvenance<ConfiguredBuiltInSyntaxCatalogSelectionField>[] = [],
  ) {}
}

export const RuntimeHtmlDefaultAttributePatterns = [
  new RefAttributePattern(),
  new DotSeparatedAttributePattern(),
  new EventAttributePattern(),
] as const;

export const RuntimeHtmlShortHandAttributePatterns = [
  new AtPrefixedTriggerAttributePattern(),
  new ColonPrefixedBindAttributePattern(),
] as const;

export const RuntimeHtmlPromiseAttributePatterns = [
  new PromiseAttributePattern(),
  new FulfilledAttributePattern(),
  new RejectedAttributePattern(),
] as const;

export const RuntimeHtmlDefaultBindingCommands = [
  new DefaultBindingCommand(),
  new OneTimeBindingCommand(),
  new FromViewBindingCommand(),
  new ToViewBindingCommand(),
  new TwoWayBindingCommand(),
  new ForBindingCommand(),
  new RefBindingCommand(),
  new TriggerBindingCommand(),
  new CaptureBindingCommand(),
  new ClassBindingCommand(),
  new StyleBindingCommand(),
  new AttrBindingCommand(),
  new SpreadValueBindingCommand(),
] as const;

export const I18nDefaultAttributePatterns = [
  new I18nTranslationAttributePattern(),
  new I18nTranslationBindAttributePattern(),
  new TranslationParametersAttributePattern(),
] as const;

export const I18nDefaultBindingCommands = [
  new TranslationBindingCommand(),
  new TranslationBindBindingCommand(),
  new TranslationParametersBindingCommand(),
] as const;

export const StateDefaultAttributePatterns = [
  new StateAttributePattern(),
] as const;

export const StateDefaultBindingCommands = [
  new StateBindingCommand(),
  new DispatchBindingCommand(),
] as const;

export const RuntimeHtmlBuiltInSyntaxCatalogs = {
  DefaultBindingSyntax: {
    packageId: BuiltInSyntaxPackage.RuntimeHtml,
    group: BuiltInSyntaxGroup.DefaultBindingSyntax,
    attributePatterns: RuntimeHtmlDefaultAttributePatterns,
    bindingCommands: [],
  },
  ShortHandBindingSyntax: {
    packageId: BuiltInSyntaxPackage.RuntimeHtml,
    group: BuiltInSyntaxGroup.ShortHandBindingSyntax,
    attributePatterns: RuntimeHtmlShortHandAttributePatterns,
    bindingCommands: [],
  },
  PromiseTemplateControllerSyntax: {
    packageId: BuiltInSyntaxPackage.RuntimeHtml,
    group: BuiltInSyntaxGroup.PromiseTemplateControllerSyntax,
    attributePatterns: RuntimeHtmlPromiseAttributePatterns,
    bindingCommands: [],
  },
  DefaultBindingLanguage: {
    packageId: BuiltInSyntaxPackage.RuntimeHtml,
    group: BuiltInSyntaxGroup.DefaultBindingLanguage,
    attributePatterns: [],
    bindingCommands: RuntimeHtmlDefaultBindingCommands,
  },
} as const;

export const ExtensionBuiltInSyntaxCatalogs = {
  I18nTranslationSyntax: {
    packageId: BuiltInSyntaxPackage.I18n,
    group: BuiltInSyntaxGroup.I18nTranslationSyntax,
    attributePatterns: I18nDefaultAttributePatterns,
    bindingCommands: I18nDefaultBindingCommands,
  },
  StateSyntax: {
    packageId: BuiltInSyntaxPackage.State,
    group: BuiltInSyntaxGroup.StateSyntax,
    attributePatterns: StateDefaultAttributePatterns,
    bindingCommands: StateDefaultBindingCommands,
  },
} as const;

/** Public package module that owns a built-in syntax package. */
export function builtInSyntaxPackageModuleSpecifier(
  packageId: BuiltInSyntaxPackage,
): string {
  switch (packageId) {
    case BuiltInSyntaxPackage.TemplateCompiler:
      return '@aurelia/template-compiler';
    case BuiltInSyntaxPackage.RuntimeHtml:
      return '@aurelia/runtime-html';
    case BuiltInSyntaxPackage.I18n:
      return '@aurelia/i18n';
    case BuiltInSyntaxPackage.State:
      return '@aurelia/state';
  }
}

/** All built-in binding-command handlers known to semantic-runtime. */
export function allBuiltInBindingCommands(): readonly BuiltInBindingCommand[] {
  return [
    ...RuntimeHtmlDefaultBindingCommands,
    ...I18nDefaultBindingCommands,
    ...StateDefaultBindingCommands,
  ];
}

/** Find a built-in binding-command handler by package/name identity. */
export function findBuiltInBindingCommand(
  key: BuiltInBindingCommandLookupKey,
): BuiltInBindingCommand | null {
  return allBuiltInBindingCommands().find((command) =>
    command.packageId === key.packageId
    && command.name === key.name
  ) ?? null;
}

/** Find a built-in binding command by command name when generated source has no package-bearing catalog row. */
export function findUniqueBuiltInBindingCommandByName(
  name: string,
): BuiltInBindingCommand | null {
  const matches = allBuiltInBindingCommands().filter((command) => command.name === name);
  return matches.length === 1 ? matches[0]! : null;
}
