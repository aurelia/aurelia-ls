import {
  Aurelia,
  BindingBehavior,
  CustomAttribute,
  CustomElement,
  CustomElementDefinition,
  StandardConfiguration,
  ValueConverter,
  customElement,
} from '@aurelia/runtime-html';

class PlainThing {}

CustomElementDefinition.create('name-only' as any);
CustomElement.getDefinition(PlainThing);
CustomAttribute.getDefinition(PlainThing);
ValueConverter.getDefinition(PlainThing);
BindingBehavior.getDefinition(PlainThing);

@customElement({
  name: 'resource-definition-api-errors-app',
  template: '<template>resource definition API pressure</template>',
})
export class ResourceDefinitionApiErrorsApp {}

new Aurelia()
  .register(StandardConfiguration)
  .app({
    host: document.querySelector('resource-definition-api-errors-app') ?? document.body,
    component: ResourceDefinitionApiErrorsApp,
  })
  .start();
