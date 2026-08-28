import {
  Aurelia,
  customElement,
  StandardConfiguration,
} from '@aurelia/runtime-html';
import projectionLogicalHostTemplate from './projection-logical-host.html';
import projectionLogicalShadowHostTemplate from './projection-logical-shadow-host.html';

@customElement({ name: 'projection-logical-leaf' })
class ProjectionLogicalLeaf {}

@customElement({
  name: 'projection-logical-host',
  template: projectionLogicalHostTemplate,
  dependencies: [ProjectionLogicalLeaf],
})
class ProjectionLogicalHost {}

@customElement({
  name: 'projection-logical-shadow-leaf',
  shadowOptions: { mode: 'open' },
})
class ProjectionLogicalShadowLeaf {}

@customElement({
  name: 'projection-logical-shadow-host',
  template: projectionLogicalShadowHostTemplate,
  dependencies: [ProjectionLogicalShadowLeaf],
})
class ProjectionLogicalShadowHost {}

void new Aurelia()
  .register(StandardConfiguration, ProjectionLogicalHost, ProjectionLogicalShadowHost)
  .app({
    component: ProjectionLogicalHost,
    host: globalThis.document.querySelector('projection-root') ?? globalThis.document.body,
  })
  .start();
