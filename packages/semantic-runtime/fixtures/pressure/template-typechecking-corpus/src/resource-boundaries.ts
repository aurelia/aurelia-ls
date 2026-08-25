import { customElement } from 'aurelia';
import { corpusItems } from './model';
import {
  AuditValueBindingBehavior,
  ContextualItemLabelValueConverter,
  IdentityItemValueConverter,
  ItemLabelValueConverter,
} from './resource-surfaces';
import { TypeTarget } from './type-target';
import template from './resource-boundaries.html';

@customElement({
  name: 'resource-boundaries',
  template,
  dependencies: [
    AuditValueBindingBehavior,
    ContextualItemLabelValueConverter,
    IdentityItemValueConverter,
    ItemLabelValueConverter,
    TypeTarget,
  ],
})
export class ResourceBoundaries {
  readonly items = corpusItems;
  readonly item = corpusItems[0]!;
  readonly prefix = 'Item: ';
  readonly count = 2;
}
