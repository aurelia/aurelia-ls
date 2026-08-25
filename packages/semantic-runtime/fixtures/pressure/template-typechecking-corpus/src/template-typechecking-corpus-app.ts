import { customElement } from 'aurelia';
import { ReadExpressions } from './read-expressions';
import { ResourceBoundaries } from './resource-boundaries';
import { ScopeProjections } from './scope-projections';
import template from './template-typechecking-corpus-app.html';
import { WriteBindings } from './write-bindings';

@customElement({
  name: 'template-typechecking-corpus-app',
  template,
  dependencies: [ReadExpressions, ResourceBoundaries, ScopeProjections, WriteBindings],
})
export class TemplateTypecheckingCorpusApp {}
