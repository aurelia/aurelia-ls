import { customElement, processContent } from 'aurelia';

@processContent('processContent')
@customElement({
  name: 'opaque-content-shell',
  template: '<template><au-slot></au-slot></template>',
})
export class OpaqueContentShell {
  static processContent(): false {
    return false;
  }
}
