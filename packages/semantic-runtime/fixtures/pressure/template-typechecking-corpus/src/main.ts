import Aurelia from 'aurelia';
import { TemplateTypecheckingCorpusApp } from './template-typechecking-corpus-app';

void Aurelia.app({
  host: document.querySelector('app-root')!,
  component: TemplateTypecheckingCorpusApp,
}).start();
