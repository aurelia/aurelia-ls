import { customElement } from 'aurelia';
import { ExpressionGallery } from './expression-gallery';
import { FunctionContextGallery } from './function-context-gallery';
import { InvalidExpressionGallery } from './invalid-expression-gallery';
import { ResourceCombinatorGallery } from './resource-combinator-gallery';
import { ScopePathGallery } from './scope-path-gallery';
import template from './expression-resource-combinators-app.html';

@customElement({
  name: 'expression-resource-combinators-app',
  template,
  dependencies: [
    ExpressionGallery,
    FunctionContextGallery,
    InvalidExpressionGallery,
    ResourceCombinatorGallery,
    ScopePathGallery,
  ],
})
export class ExpressionResourceCombinatorsApp {}
