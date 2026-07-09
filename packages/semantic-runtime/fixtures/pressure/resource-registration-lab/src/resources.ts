import {
  alias,
  BindingBehavior,
  bindingBehavior,
  CustomAttribute,
  customAttribute,
  CustomElement,
  customElement,
  templateController,
  ValueConverter,
  valueConverter,
} from 'aurelia';
import type {
  BindingBehaviorStaticAuDefinition,
  CustomAttributeStaticAuDefinition,
  CustomElementStaticAuDefinition,
  ValueConverterStaticAuDefinition,
} from '@aurelia/runtime-html';

@alias('decorator-card-annotation')
@customElement({
  name: 'decorator-card',
  aliases: ['decorator-card-alias'],
  bindables: ['label'],
  template: '<template><span>${label}</span></template>',
})
export class DecoratorCard {
  label = '';
}

export class StaticPanel {
  static readonly $au: CustomElementStaticAuDefinition = {
    type: 'custom-element',
    name: 'static-panel',
    aliases: ['static-panel-alias'],
    bindables: ['title'],
    template: '<template><span>${title}</span></template>',
  };

  title = '';
}

export class DefinedBadge {
  label = '';
}

CustomElement.define({
  name: 'defined-badge',
  aliases: ['defined-badge-alias'],
  bindables: ['label'],
  template: '<template><span>${label}</span></template>',
}, DefinedBadge);

@customAttribute({
  name: 'decorator-tooltip',
  aliases: ['decorator-tip'],
  bindables: ['message'],
  defaultProperty: 'message',
})
export class DecoratorTooltip {
  message = '';
}

export class StaticFlag {
  static readonly $au: CustomAttributeStaticAuDefinition = {
    type: 'custom-attribute',
    name: 'static-flag',
    aliases: ['flagged'],
    bindables: ['value'],
    defaultProperty: 'value',
  };

  value = false;
}

export class DefinedAccent {
  tone = '';
}

CustomAttribute.define({
  name: 'defined-accent',
  aliases: ['accented'],
  bindables: ['tone'],
  defaultProperty: 'tone',
}, DefinedAccent);

@templateController({
  name: 'surface-gate',
  aliases: ['surface-door'],
  bindables: ['value'],
  defaultProperty: 'value',
})
export class SurfaceGate {
  value = false;
}

@valueConverter({
  name: 'formatName',
  aliases: ['fmtName'],
})
export class FormatNameValueConverter {
  toView(value: string): string {
    return value.toUpperCase();
  }
}

export class StaticStatusValueConverter {
  static readonly $au: ValueConverterStaticAuDefinition = {
    type: 'value-converter',
    name: 'staticStatus',
    aliases: ['statusText'],
  };

  toView(value: unknown): string {
    return String(value);
  }
}

export class DefinedCodeValueConverter {
  toView(value: unknown): string {
    return String(value);
  }
}

ValueConverter.define({
  name: 'definedCode',
  aliases: ['codeText'],
}, DefinedCodeValueConverter);

@bindingBehavior({
  name: 'trackEdit',
  aliases: ['track'],
})
export class TrackEditBindingBehavior {
  bind(): void {}

  unbind(): void {}
}

export class StaticAuditBindingBehavior {
  static readonly $au: BindingBehaviorStaticAuDefinition = {
    type: 'binding-behavior',
    name: 'staticAudit',
    aliases: ['audit'],
  };

  bind(): void {}

  unbind(): void {}
}

export class DefinedMaskBindingBehavior {
  bind(): void {}

  unbind(): void {}
}

BindingBehavior.define({
  name: 'definedMask',
  aliases: ['mask'],
}, DefinedMaskBindingBehavior);
