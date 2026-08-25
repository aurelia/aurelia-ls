import { customElement } from 'aurelia';
import duplicateLocalBindableAttribute from './duplicate-local-bindable-attribute.html';
import duplicateLocalBindableProperty from './duplicate-local-bindable-property.html';
import duplicateLocalName from './duplicate-local-name.html';
import emptyLocalName from './empty-local-name.html';
import missingLocalBindableName from './missing-local-bindable-name.html';
import nestedLocalBindable from './nested-local-bindable.html';
import nestedLocalTemplate from './nested-local-template.html';
import onlyLocalTemplates from './only-local-templates.html';
import rootIsLocal from './root-is-local.html';
import localSurrogateInvalidAttribute from './local-surrogate-invalid-attribute.html';
import localSurrogateTemplateController from './local-surrogate-template-controller.html';

@customElement({ name: 'root-is-local-case', template: rootIsLocal })
export class RootIsLocalCase {}

@customElement({ name: 'only-local-templates-case', template: onlyLocalTemplates })
export class OnlyLocalTemplatesCase {}

@customElement({ name: 'nested-local-template-case', template: nestedLocalTemplate })
export class NestedLocalTemplateCase {}

@customElement({ name: 'empty-local-name-case', template: emptyLocalName })
export class EmptyLocalNameCase {}

@customElement({ name: 'duplicate-local-name-case', template: duplicateLocalName })
export class DuplicateLocalNameCase {}

@customElement({ name: 'nested-local-bindable-case', template: nestedLocalBindable })
export class NestedLocalBindableCase {}

@customElement({ name: 'missing-local-bindable-name-case', template: missingLocalBindableName })
export class MissingLocalBindableNameCase {}

@customElement({ name: 'duplicate-local-bindable-property-case', template: duplicateLocalBindableProperty })
export class DuplicateLocalBindablePropertyCase {}

@customElement({ name: 'duplicate-local-bindable-attribute-case', template: duplicateLocalBindableAttribute })
export class DuplicateLocalBindableAttributeCase {}

@customElement({ name: 'local-surrogate-invalid-attribute-case', template: localSurrogateInvalidAttribute })
export class LocalSurrogateInvalidAttributeCase {}

@customElement({ name: 'local-surrogate-template-controller-case', template: localSurrogateTemplateController })
export class LocalSurrogateTemplateControllerCase {}

export const invalidLocalTemplateComponents = [
  RootIsLocalCase,
  OnlyLocalTemplatesCase,
  NestedLocalTemplateCase,
  EmptyLocalNameCase,
  DuplicateLocalNameCase,
  NestedLocalBindableCase,
  MissingLocalBindableNameCase,
  DuplicateLocalBindablePropertyCase,
  DuplicateLocalBindableAttributeCase,
  LocalSurrogateInvalidAttributeCase,
  LocalSurrogateTemplateControllerCase,
] as const;
