import { customElement } from 'aurelia';
import { expressionItems } from './model';
import {
  IdentityValueConverter,
  InnerAuditBindingBehavior,
  NumberTextValueConverter,
  OuterAuditBindingBehavior,
  TextLengthValueConverter,
  TypedAuditBindingBehavior,
} from './expression-resources';
import { NumericTarget } from './numeric-target';
import template from './resource-combinator-gallery.html';

@customElement({
  name: 'resource-combinator-gallery',
  template,
  dependencies: [
    IdentityValueConverter,
    InnerAuditBindingBehavior,
    NumberTextValueConverter,
    NumericTarget,
    OuterAuditBindingBehavior,
    TextLengthValueConverter,
    TypedAuditBindingBehavior,
  ],
})
export class ResourceCombinatorGallery {
  readonly item = expressionItems[0]!;
  readonly prefix = 'Count: ';
  readonly limit = 4;
  count = 2;
}
