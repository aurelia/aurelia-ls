import { auLink } from '../kernel/au-link.js';
import type {
  AddressHandle,
  IdentityHandle,
  ProductHandle,
} from '../kernel/handles.js';
import type { FieldProvenance } from '../kernel/provenance.js';
import type { FrameworkRegistrationKind } from '../registration/registration-reference.js';
import { AttributePatternDefinitionEntry } from '../resources/attribute-pattern-definition.js';
import { BindableBindingMode } from '../resources/bindable-definition.js';
import {
  AttributePatternExecutionKind,
  AttributePatternExecutionResult,
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
  readonly name = 'bind';
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
  readonly name = 'one-time';
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
  readonly name = 'from-view';
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
  readonly name = 'to-view';
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
  readonly name = 'two-way';
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
  readonly name = 'for';
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
  readonly name = 'ref';
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
  readonly name = 'trigger';
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
  readonly name = 'capture';
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
  readonly name = 'class';
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

    return buildAttributeBinding(this, info, context, 'class', target, info.syntax.rawValue);
  }
}

@auLink('template-compiler:StyleBindingCommand')
export class StyleBindingCommand {
  readonly packageId = BuiltInSyntaxPackage.TemplateCompiler;
  readonly group = BuiltInSyntaxGroup.DefaultBindingLanguage;
  readonly targetName = 'StyleBindingCommand';
  readonly name = 'style';
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
    return buildAttributeBinding(this, info, context, 'style', info.syntax.target, info.syntax.rawValue);
  }
}

@auLink('template-compiler:AttrBindingCommand')
export class AttrBindingCommand {
  readonly packageId = BuiltInSyntaxPackage.TemplateCompiler;
  readonly group = BuiltInSyntaxGroup.DefaultBindingLanguage;
  readonly targetName = 'AttrBindingCommand';
  readonly name = 'attr';
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
  readonly name = 'spread';
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
  readonly name = 't';
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
  readonly name = 't.bind';
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
  readonly name = 't-params.bind';
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
  readonly name = 'state';
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
  readonly name = 'dispatch';
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
