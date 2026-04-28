import { auLink } from '../kernel/au-link.js';
import type {
  AddressHandle,
  IdentityHandle,
  ProductHandle,
} from '../kernel/handles.js';
import type { FieldProvenance } from '../kernel/provenance.js';
import { AttributePatternDefinitionEntry } from '../resources/attribute-pattern-definition.js';
import { BindableBindingMode } from '../resources/bindable-definition.js';
import { AttributePatternExecutionKind } from './attribute-syntax.js';
import {
  BindingCommandBuildResult,
  BindingCommandExecutableReference,
  BindingCommandExecutionKind,
  type BindingCommandBuildContext,
  type BindingCommandBuildInfo,
} from './binding-command-execution.js';
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

function camelCase(value: string): string {
  return value.replace(/-([a-z])/g, (_match, char: string) => char.toUpperCase());
}

function bindingCommandReference(command: { readonly name: string; readonly key: string }): BindingCommandExecutableReference {
  return new BindingCommandExecutableReference(null, null, command.name, command.key);
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
    ? camelCase(info.syntax.target)
    : info.syntax.rawValue;
}

function targetForPropertyBinding(
  info: BindingCommandBuildInfo,
  context: BindingCommandBuildContext,
): string {
  return info.bindable == null
    ? context.mapAttribute(info.node, info.syntax.target) ?? camelCase(info.syntax.target)
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
  | 'group'
  | 'source';

export type BuiltInAttributePatternField =
  | 'targetName'
  | 'patterns'
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
    readonly fieldProvenance: readonly FieldProvenance<BuiltInAttributePatternField>[] = [],
  ) {}
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
    readonly fieldProvenance: readonly FieldProvenance<BuiltInAttributePatternField>[] = [],
  ) {}
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
    readonly fieldProvenance: readonly FieldProvenance<BuiltInAttributePatternField>[] = [],
  ) {}
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
    readonly fieldProvenance: readonly FieldProvenance<BuiltInAttributePatternField>[] = [],
  ) {}
}

@auLink('template-compiler:ColonPrefixedBindAttributePattern')
export class ColonPrefixedBindAttributePattern {
  readonly packageId = BuiltInSyntaxPackage.TemplateCompiler;
  readonly group = BuiltInSyntaxGroup.ShortHandBindingSyntax;
  readonly targetName = 'ColonPrefixedBindAttributePattern';
  readonly patterns = [new AttributePatternDefinitionEntry(':PART', ':')] as const;
  readonly executionKind = AttributePatternExecutionKind.BuiltIn;

  constructor(
    readonly fieldProvenance: readonly FieldProvenance<BuiltInAttributePatternField>[] = [],
  ) {}
}

@auLink('runtime-html:PromiseAttributePattern')
export class PromiseAttributePattern {
  readonly packageId = BuiltInSyntaxPackage.RuntimeHtml;
  readonly group = BuiltInSyntaxGroup.PromiseTemplateControllerSyntax;
  readonly targetName = 'PromiseAttributePattern';
  readonly patterns = [new AttributePatternDefinitionEntry('promise.resolve', '')] as const;
  readonly executionKind = AttributePatternExecutionKind.BuiltIn;

  constructor(
    readonly fieldProvenance: readonly FieldProvenance<BuiltInAttributePatternField>[] = [],
  ) {}
}

@auLink('runtime-html:FulfilledAttributePattern')
export class FulfilledAttributePattern {
  readonly packageId = BuiltInSyntaxPackage.RuntimeHtml;
  readonly group = BuiltInSyntaxGroup.PromiseTemplateControllerSyntax;
  readonly targetName = 'FulfilledAttributePattern';
  readonly patterns = [new AttributePatternDefinitionEntry('then', '')] as const;
  readonly executionKind = AttributePatternExecutionKind.BuiltIn;

  constructor(
    readonly fieldProvenance: readonly FieldProvenance<BuiltInAttributePatternField>[] = [],
  ) {}
}

@auLink('runtime-html:RejectedAttributePattern')
export class RejectedAttributePattern {
  readonly packageId = BuiltInSyntaxPackage.RuntimeHtml;
  readonly group = BuiltInSyntaxGroup.PromiseTemplateControllerSyntax;
  readonly targetName = 'RejectedAttributePattern';
  readonly patterns = [new AttributePatternDefinitionEntry('catch', '')] as const;
  readonly executionKind = AttributePatternExecutionKind.BuiltIn;

  constructor(
    readonly fieldProvenance: readonly FieldProvenance<BuiltInAttributePatternField>[] = [],
  ) {}
}

/**
 * I18n creates this pattern class inside its configuration factory so aliases can be configured.
 * There is no stable top-level framework declaration to anchor with auLink.
 */
export class I18nTranslationAttributePattern {
  readonly packageId = BuiltInSyntaxPackage.I18n;
  readonly group = BuiltInSyntaxGroup.I18nTranslationSyntax;
  readonly targetName = 'TranslationAttributePattern';
  readonly patterns = [new AttributePatternDefinitionEntry('t', '')] as const;
  readonly executionKind = AttributePatternExecutionKind.BuiltIn;

  constructor(
    readonly fieldProvenance: readonly FieldProvenance<BuiltInAttributePatternField>[] = [],
  ) {}
}

/**
 * I18n creates this bind pattern class inside its configuration factory so aliases can be configured.
 * There is no stable top-level framework declaration to anchor with auLink.
 */
export class I18nTranslationBindAttributePattern {
  readonly packageId = BuiltInSyntaxPackage.I18n;
  readonly group = BuiltInSyntaxGroup.I18nTranslationSyntax;
  readonly targetName = 'TranslationBindAttributePattern';
  readonly patterns = [new AttributePatternDefinitionEntry('t.bind', '.')] as const;
  readonly executionKind = AttributePatternExecutionKind.BuiltIn;

  constructor(
    readonly fieldProvenance: readonly FieldProvenance<BuiltInAttributePatternField>[] = [],
  ) {}
}

@auLink('i18n:TranslationParametersAttributePattern')
export class TranslationParametersAttributePattern {
  readonly packageId = BuiltInSyntaxPackage.I18n;
  readonly group = BuiltInSyntaxGroup.I18nTranslationSyntax;
  readonly targetName = 'TranslationParametersAttributePattern';
  readonly patterns = [new AttributePatternDefinitionEntry('t-params.bind', '')] as const;
  readonly executionKind = AttributePatternExecutionKind.BuiltIn;

  constructor(
    readonly fieldProvenance: readonly FieldProvenance<BuiltInAttributePatternField>[] = [],
  ) {}
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
    readonly fieldProvenance: readonly FieldProvenance<BuiltInAttributePatternField>[] = [],
  ) {}
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
    readonly fieldProvenance: readonly FieldProvenance<BuiltInBindingCommandField>[] = [],
  ) {}

  build(info: BindingCommandBuildInfo, context: BindingCommandBuildContext): BindingCommandBuildResult {
    let target = info.syntax.target;

    if (target.includes(',')) {
      const classes = target
        .split(',')
        .filter((value) => value.length > 0);

      if (classes.length === 0) {
        return BindingCommandBuildResult.invalid('Invalid class binding syntax.');
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
        null,
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
  readonly aliases = [] as const;
  readonly key = bindingCommandKey(this.name);
  readonly ignoreAttr = false;
  readonly producedInstructionKinds = [TemplateInstructionKind.TranslationBinding] as const;
  readonly producedInstructionTypeNames = [] as const;
  readonly executionKind = BindingCommandExecutionKind.BuiltIn;

  constructor(
    readonly fieldProvenance: readonly FieldProvenance<BuiltInBindingCommandField>[] = [],
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
  readonly aliases = [] as const;
  readonly key = bindingCommandKey(this.name);
  readonly ignoreAttr = false;
  readonly producedInstructionKinds = [TemplateInstructionKind.TranslationBindBinding] as const;
  readonly producedInstructionTypeNames = [] as const;
  readonly executionKind = BindingCommandExecutionKind.BuiltIn;

  constructor(
    readonly fieldProvenance: readonly FieldProvenance<BuiltInBindingCommandField>[] = [],
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
