import {
  cssModules,
  customElement,
  shadowCSS,
} from '@aurelia/runtime-html';
import classes from './component.module.css';
import shadowStyles from './shadow.css';
import './component-side-effect.css';

@customElement({
  name: 'style-resource-surfaces-app',
  template: '<template><article class="card"><h1 class="title">Style pressure</h1></article></template>',
  dependencies: [
    cssModules(classes, { title: 'mapped-title' }),
    shadowCSS(shadowStyles, ':host { display: block; }'),
  ],
  shadowOptions: { mode: 'open' },
})
export class StyleResourceSurfacesApp {}
