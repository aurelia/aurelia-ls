import {
  alias,
  attributePattern,
  bindingBehavior,
  bindingCommand,
  CustomElement,
  customAttribute,
  customElement,
  templateController,
  ValueConverter,
  valueConverter,
} from 'aurelia';
import type {
  BindingBehaviorStaticAuDefinition,
  CustomAttributeStaticAuDefinition,
  CustomElementStaticAuDefinition,
} from '@aurelia/runtime-html';
import {
  AttributePattern,
  AttrSyntax,
  BindingCommand,
  type BindingCommandStaticAuDefinition,
  OneTimeBindingCommand,
} from '@aurelia/template-compiler';
import { ImportedTargetCard } from './imported-target-card';

@alias('annotation-alias')
@customElement({
  name: 'alias-carrier',
  aliases: ['object-alias'],
  bindables: ['value'],
  template: '<template>${value}</template>',
})
export class AliasCarrier {
  static readonly aliases = ['type-alias'];
  value = '';
}

@customElement('decorator-effective')
export class DecoratorOverStatic {
  static readonly $au: CustomElementStaticAuDefinition = {
    type: 'custom-element',
    name: 'static-shadowed',
    template: '<template>static</template>',
  };
}

@customElement('decorator-shadowed')
export class DefineOverDecorator {}

CustomElement.define({
  name: 'define-effective',
  template: '<template>define</template>',
}, DefineOverDecorator);

@customAttribute('decorator-attribute-effective')
export class AttributeOverStatic {
  static readonly $au: CustomAttributeStaticAuDefinition = {
    type: 'custom-attribute',
    name: 'static-attribute-shadowed',
  };
}

@bindingBehavior('decorator-behavior-effective')
export class BehaviorOverStatic {
  static readonly $au: BindingBehaviorStaticAuDefinition = {
    type: 'binding-behavior',
    name: 'static-behavior-shadowed',
  };

  bind(): void {}
  unbind(): void {}
}

@valueConverter('decorator-converter-shadowed')
export class ConverterDefineOverDecorator {
  toView(value: unknown): string {
    return String(value);
  }
}

ValueConverter.define('define-converter-effective', ConverterDefineOverDecorator);

@bindingCommand('decorator-command-shadowed')
export class CommandDefineOverDecorator {}

BindingCommand.define('define-command-effective', CommandDefineOverDecorator);

export class InvokedHelperCard {}

function defineInvokedHelperCard(): void {
  CustomElement.define('invoked-helper-card', InvokedHelperCard);
}

defineInvokedHelperCard();

export class UninvokedHelperCard {}

function defineUninvokedHelperCard(): void {
  CustomElement.define('uninvoked-helper-card', UninvokedHelperCard);
}

export class DeadBranchCard {}

if (false) {
  CustomElement.define('dead-branch-card', DeadBranchCard);
}

export const AnonymousCard = CustomElement.define({
  name: 'anonymous-card',
  template: '<template>anonymous</template>',
});

export const ImportedTargetCardDefinition = CustomElement.define({
  name: 'imported-target-card',
  template: '<template>${value}</template>',
}, ImportedTargetCard);

@customElement({
  name: 'shared',
  bindables: ['message'],
  template: '<template>${message}</template>',
})
export class SharedCustomElement {
  message = '';
}

@customAttribute({
  name: 'shared',
  bindables: ['message', 'detail', 'patterned'],
  defaultProperty: 'message',
})
export class SharedCustomAttribute {
  message = '';
  detail = '';
  patterned = '';
}

@valueConverter('shared')
export class SharedValueConverter {
  toView(value: unknown): string {
    return String(value);
  }
}

@bindingBehavior('shared')
export class SharedBindingBehavior {
  bind(): void {}
  unbind(): void {}
}

@bindingCommand('shared')
export class SharedBindingCommand {
  static readonly inject = [OneTimeBindingCommand];

  constructor(private readonly oneTime: OneTimeBindingCommand) {}

  build(...args: Parameters<OneTimeBindingCommand['build']>): ReturnType<OneTimeBindingCommand['build']> {
    return this.oneTime.build(...args);
  }
}

export class StaticBindingCommand {
  static readonly $au: BindingCommandStaticAuDefinition = {
    type: 'binding-command',
    name: 'static-command',
    aliases: ['static-cmd'],
  };
}

export class DefinedBindingCommand {}

BindingCommand.define({
  name: 'defined-command',
  aliases: ['defined-cmd'],
}, DefinedBindingCommand);

@templateController('shared-control')
export class SharedTemplateController {
  value = false;
}

@customAttribute('shared-control')
export class SharedControlAttribute {
  value = false;
}

@attributePattern({ pattern: 'PART.data', symbols: '.' })
export class DataAttributePattern {
  'PART.data'(rawName: string, rawValue: string, parts: readonly string[]): AttrSyntax {
    return new AttrSyntax(rawName, rawValue, parts[0] ?? rawName, 'bind');
  }
}

export class CreatedAttributePattern {
  'PART::created'(rawName: string, rawValue: string, parts: readonly string[]): AttrSyntax {
    return new AttrSyntax(rawName, rawValue, parts[0] ?? rawName, 'bind');
  }
}

export const CreatedAttributePatternRegistration = AttributePattern.create(
  [{ pattern: 'PART::created', symbols: ':' }],
  CreatedAttributePattern,
);
