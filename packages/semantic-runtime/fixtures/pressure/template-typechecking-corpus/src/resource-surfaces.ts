import { type ICallerContext } from '@aurelia/runtime-html';
import { bindingBehavior, valueConverter } from 'aurelia';
import type { CorpusItem } from './model';

@valueConverter('itemLabel')
export class ItemLabelValueConverter {
  toView(item: CorpusItem, prefix: string): string {
    return `${prefix}${item.label}`;
  }
}

@valueConverter('contextualItemLabel')
export class ContextualItemLabelValueConverter {
  readonly withContext = true;

  toView(item: CorpusItem, context: ICallerContext, prefix: string): string {
    return `${context.binding == null ? '' : prefix}${item.label}`;
  }
}

@valueConverter('identityItem')
export class IdentityItemValueConverter {}

@bindingBehavior('auditValue')
export class AuditValueBindingBehavior {
  bind(): void {}
  unbind(): void {}
}
