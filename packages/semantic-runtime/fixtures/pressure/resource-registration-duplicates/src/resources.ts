import {
  alias,
  attributePattern,
  bindingBehavior,
  bindingCommand,
  customAttribute,
  customElement,
  valueConverter,
} from 'aurelia';
import { AttrSyntax } from '@aurelia/template-compiler';

@customElement({
  name: 'duplicate-card',
  template: '<template><span>one</span></template>',
})
export class DuplicateCardOne {}

@customElement({
  name: 'duplicate-card',
  template: '<template><span>two</span></template>',
})
export class DuplicateCardTwo {}

@customAttribute('duplicate-flag')
export class DuplicateFlagOne {
  value = '';
}

@customAttribute('duplicate-flag')
export class DuplicateFlagTwo {
  value = '';
}

@valueConverter('duplicateFormat')
export class DuplicateFormatOneValueConverter {
  toView(value: unknown): string {
    return String(value);
  }
}

@valueConverter('duplicateFormat')
export class DuplicateFormatTwoValueConverter {
  toView(value: unknown): string {
    return String(value);
  }
}

@bindingBehavior('duplicateTrack')
export class DuplicateTrackOneBindingBehavior {
  bind(): void {}

  unbind(): void {}
}

@bindingBehavior('duplicateTrack')
export class DuplicateTrackTwoBindingBehavior {
  bind(): void {}

  unbind(): void {}
}

@bindingCommand('duplicate-command')
export class DuplicateCommandOneBindingCommand {}

@bindingCommand('duplicate-command')
export class DuplicateCommandTwoBindingCommand {}

@attributePattern({ pattern: 'PART::duplicate', symbols: ':' })
export class DuplicatePatternOne {
  'PART::duplicate'(rawName: string, rawValue: string, parts: readonly string[]): AttrSyntax {
    return new AttrSyntax(rawName, rawValue, parts[0] ?? rawName, 'bind');
  }
}

@attributePattern({ pattern: 'PART::duplicate', symbols: ':' })
export class DuplicatePatternTwo {
  'PART::duplicate'(rawName: string, rawValue: string, parts: readonly string[]): AttrSyntax {
    return new AttrSyntax(rawName, rawValue, parts[0] ?? rawName, 'bind');
  }
}

@alias('shared-card-alias')
@customElement({ name: 'alias-owner-one', template: '<template>one</template>' })
export class AliasOwnerOne {}

@alias('shared-card-alias')
@customElement({ name: 'alias-owner-two', template: '<template>two</template>' })
export class AliasOwnerTwo {}

@customElement({ name: 'alias-primary', template: '<template>primary</template>' })
export class AliasPrimary {}

@alias('alias-primary')
@customElement({ name: 'alias-after-primary', template: '<template>alias</template>' })
export class AliasAfterPrimary {}

@alias('primary-after-alias')
@customElement({ name: 'alias-before-primary', template: '<template>alias first</template>' })
export class AliasBeforePrimary {}

@customElement({ name: 'primary-after-alias', template: '<template>primary second</template>' })
export class PrimaryAfterAlias {}

// CustomElementDefinition.register returns after a primary collision, so the declared alias below must not be spent.
// The contender remains inventory-visible and retains exact canonical-key exclusion evidence only.
@alias('canonical-loser')
@customElement({ name: 'canonical-winner', template: '<template>canonical winner</template>' })
export class CanonicalWinner {}

@alias('surviving-alias')
@customElement({ name: 'canonical-loser', template: '<template>canonical loser</template>' })
export class CanonicalLoserWithSkippedAlias {}
