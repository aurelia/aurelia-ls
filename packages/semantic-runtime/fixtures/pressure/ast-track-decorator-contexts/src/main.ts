import { astTrack } from '@aurelia/runtime';
import { Aurelia, StandardConfiguration, customElement } from '@aurelia/runtime-html';
import template from './ast-track-decorator-contexts-app.html';

@customElement({
  name: 'ast-track-decorator-contexts-app',
  template,
})
export class AstTrackDecoratorContextsApp {
  @astTrack
  total(): number {
    return this.count + 1;
  }

  @((astTrack as unknown) as PropertyDecorator)
  count = 1;
}

new Aurelia()
  .register(StandardConfiguration)
  .app({
    host: document.body,
    component: AstTrackDecoratorContextsApp,
  })
  .start();
