import {
  Aurelia,
  customElement,
  StandardConfiguration,
  templateController,
} from '@aurelia/runtime-html';
import projectionLogicalHostTemplate from './projection-logical-host.html';
import projectionLogicalContainerlessHostTemplate from './projection-logical-containerless-host.html';
import projectionLogicalNativeTcSlotHostTemplate from './projection-logical-native-tc-slot-host.html';
import projectionLogicalShadowHostTemplate from './projection-logical-shadow-host.html';
import projectionLogicalTcHostTemplate from './projection-logical-tc-host.html';
import projectionLogicalTcOnlyHostTemplate from './projection-logical-tc-only-host.html';
import projectionLogicalWhitespaceHostTemplate from './projection-logical-whitespace-host.html';

@customElement({ name: 'projection-logical-leaf' })
class ProjectionLogicalLeaf {}

@customElement({ name: 'projection-logical-containerless-leaf', containerless: true })
class ProjectionLogicalContainerlessLeaf {}

@templateController('projection-logical-outer')
class ProjectionLogicalOuterTemplateController {}

@templateController('projection-logical-inner')
class ProjectionLogicalInnerTemplateController {}

@customElement({
  name: 'projection-logical-host',
  template: projectionLogicalHostTemplate,
  dependencies: [ProjectionLogicalLeaf],
})
class ProjectionLogicalHost {
  after = 'after';
}

@customElement({
  name: 'projection-logical-whitespace-host',
  template: projectionLogicalWhitespaceHostTemplate,
  dependencies: [ProjectionLogicalLeaf],
})
class ProjectionLogicalWhitespaceHost {
  after = 'after';
}

@customElement({
  name: 'projection-logical-containerless-host',
  template: projectionLogicalContainerlessHostTemplate,
  dependencies: [ProjectionLogicalContainerlessLeaf],
})
class ProjectionLogicalContainerlessHost {
  after = 'after';
}

@customElement({
  name: 'projection-logical-native-tc-slot-host',
  template: projectionLogicalNativeTcSlotHostTemplate,
  dependencies: [ProjectionLogicalOuterTemplateController],
})
class ProjectionLogicalNativeTcSlotHost {
  after = 'after';
}

@customElement({
  name: 'projection-logical-tc-host',
  template: projectionLogicalTcHostTemplate,
  dependencies: [
    ProjectionLogicalLeaf,
    ProjectionLogicalOuterTemplateController,
    ProjectionLogicalInnerTemplateController,
  ],
})
class ProjectionLogicalTcHost {
  value = 'value';
  named = 'named';
  after = 'after';
}

@customElement({
  name: 'projection-logical-tc-only-host',
  template: projectionLogicalTcOnlyHostTemplate,
  dependencies: [
    ProjectionLogicalOuterTemplateController,
    ProjectionLogicalInnerTemplateController,
  ],
})
class ProjectionLogicalTcOnlyHost {
  value = 'value';
  after = 'after';
}

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
  .register(
    StandardConfiguration,
    ProjectionLogicalHost,
    ProjectionLogicalWhitespaceHost,
    ProjectionLogicalContainerlessHost,
    ProjectionLogicalNativeTcSlotHost,
    ProjectionLogicalTcHost,
    ProjectionLogicalTcOnlyHost,
    ProjectionLogicalShadowHost,
  )
  .app({
    component: ProjectionLogicalHost,
    host: globalThis.document.querySelector('projection-root') ?? globalThis.document.body,
  })
  .start();
