import Aurelia, { CustomElement } from 'aurelia';
import { EffectiveDefinitionsApp } from './effective-definitions-app';
import './resource-api-errors';
import {
  AliasCarrier,
  AnonymousCard,
  AttributeOverStatic,
  BehaviorOverStatic,
  CommandDefineOverDecorator,
  ConverterDefineOverDecorator,
  CreatedAttributePatternRegistration,
  DataAttributePattern,
  DeadBranchCard,
  DecoratorOverStatic,
  DefinedBindingCommand,
  DefineOverDecorator,
  InvokedHelperCard,
  ImportedTargetCardDefinition,
  SharedBindingBehavior,
  SharedBindingCommand,
  SharedControlAttribute,
  SharedCustomAttribute,
  SharedCustomElement,
  SharedTemplateController,
  SharedValueConverter,
  StaticBindingCommand,
  UninvokedHelperCard,
} from './resources';

Aurelia
  .register(
    CustomElement.define({
      name: 'inline-anonymous-card',
      template: '<template>inline anonymous</template>',
    }),
    AliasCarrier,
    DecoratorOverStatic,
    DefineOverDecorator,
    AttributeOverStatic,
    BehaviorOverStatic,
    ConverterDefineOverDecorator,
    CommandDefineOverDecorator,
    InvokedHelperCard,
    ImportedTargetCardDefinition,
    UninvokedHelperCard,
    DeadBranchCard,
    AnonymousCard,
    SharedCustomElement,
    SharedCustomAttribute,
    SharedValueConverter,
    SharedBindingBehavior,
    SharedBindingCommand,
    StaticBindingCommand,
    DefinedBindingCommand,
    SharedTemplateController,
    SharedControlAttribute,
    DataAttributePattern,
    CreatedAttributePatternRegistration,
  )
  .app(EffectiveDefinitionsApp)
  .start();
