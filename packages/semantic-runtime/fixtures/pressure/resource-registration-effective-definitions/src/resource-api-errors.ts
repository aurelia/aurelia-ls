import {
  BindingBehavior,
  CustomAttribute,
  CustomElement,
  CustomElementDefinition,
  ValueConverter,
} from '@aurelia/runtime-html';

class PlainType {}

export function exerciseInvalidResourceApis(): void {
  CustomElementDefinition.create('only-name' as never);
  CustomElement.getDefinition(PlainType);
  CustomAttribute.getDefinition(PlainType);
  ValueConverter.getDefinition(PlainType);
  BindingBehavior.getDefinition(PlainType);
}
