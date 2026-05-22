import { moduleSpecifier } from '../application/module-specifier.js';
import {
  type AuthoringSourceFileEdit,
  recipeSourceFile,
} from './source-plan.js';
import {
  fillSourceTemplate,
  sourceText,
} from './source-template.js';

export interface FormFieldShellSourcePlanModel {
  readonly fieldShellComponentPath: string;
  readonly fieldShellTemplatePath: string;
  readonly fieldShellClassName: string;
  readonly fieldShellElementName: string;
}

export function formFieldShellComponentFile(model: FormFieldShellSourcePlanModel): AuthoringSourceFileEdit {
  return recipeSourceFile(
    model.fieldShellComponentPath,
    'component',
    'typescript',
    'create-component',
    fillSourceTemplate(FIELD_SHELL_COMPONENT_SOURCE, {
      FIELD_SHELL_CLASS: model.fieldShellClassName,
      FIELD_SHELL_ELEMENT_NAME: model.fieldShellElementName,
      FIELD_SHELL_TEMPLATE_MODULE: moduleSpecifier(model.fieldShellComponentPath, model.fieldShellTemplatePath, true),
    }),
  );
}

export function formFieldShellTemplateFile(model: FormFieldShellSourcePlanModel): AuthoringSourceFileEdit {
  return recipeSourceFile(
    model.fieldShellTemplatePath,
    'template',
    'html',
    'create-external-template',
    FIELD_SHELL_TEMPLATE_SOURCE,
  );
}

const FIELD_SHELL_COMPONENT_SOURCE = sourceText(`import { bindable, customElement } from 'aurelia';
import template from '__FIELD_SHELL_TEMPLATE_MODULE__';

@customElement({
  name: '__FIELD_SHELL_ELEMENT_NAME__',
  template,
  capture: true,
})
export class __FIELD_SHELL_CLASS__ {
  @bindable inputId = '';
  @bindable label = '';
}
`);

const FIELD_SHELL_TEMPLATE_SOURCE = sourceText(`<label for.bind="inputId">\${label}</label>
<input id.bind="inputId" ...$attrs>
`);
