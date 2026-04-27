import type { AttributePatternDefinition } from './attribute-pattern-definition.js';
import type { BindingBehaviorDefinition } from './binding-behavior-definition.js';
import type { BindingCommandDefinition } from './binding-command-definition.js';
import type { CustomAttributeDefinition } from './custom-attribute-definition.js';
import type { CustomElementDefinition } from './custom-element-definition.js';
import type { TemplateControllerDefinition } from './template-controller-definition.js';
import type { ValueConverterDefinition } from './value-converter-definition.js';

export type ResourceDefinition =
  | AttributePatternDefinition
  | BindingBehaviorDefinition
  | BindingCommandDefinition
  | CustomAttributeDefinition
  | CustomElementDefinition
  | TemplateControllerDefinition
  | ValueConverterDefinition;
