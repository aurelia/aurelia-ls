import { Registration } from '@aurelia/kernel';
import { ITemplateCompiler } from '@aurelia/template-compiler';
import { Aurelia, customElement } from '@aurelia/runtime-html';

const compiler = {
  compile(definition: unknown): unknown {
    return definition;
  },
} as unknown as ITemplateCompiler;

@customElement({
  name: 'di-custom-template-compiler-app',
  template: '<template><p>${message}</p></template>',
})
export class DiCustomTemplateCompilerApp {
  message = 'Custom compiler provider';
}

new Aurelia()
  .register(Registration.instance(ITemplateCompiler, compiler))
  .app({
    host: document.body,
    component: DiCustomTemplateCompilerApp,
  })
  .start();
