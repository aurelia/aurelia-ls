import { customElement } from 'aurelia';
import { expressionGroups } from './model';
import template from './scope-path-gallery.html';

@customElement({ name: 'scope-path-gallery', template })
export class ScopePathGallery {
  readonly heading = 'Scope paths';
  readonly groups = expressionGroups;
  readonly $this = 'authored $this member';
  readonly $parent = 17;
}
