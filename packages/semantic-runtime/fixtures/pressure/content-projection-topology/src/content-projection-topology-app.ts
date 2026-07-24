import { customElement } from 'aurelia';
import template from './content-projection-topology-app.html';
import { DeclaringComposeWidget } from './declaring-compose-widget';
import { OpaqueContentShell } from './opaque-content-shell';
import { ProjectionLabelValueConverter } from './projection-label-value-converter';

export interface ProjectionItem {
  readonly id: number;
  readonly label: string;
}

@customElement({
  name: 'content-projection-topology-app',
  template,
  dependencies: [ProjectionLabelValueConverter, DeclaringComposeWidget, OpaqueContentShell],
})
export class ContentProjectionTopologyApp {
  readonly heading = 'Projection topology';
  readonly message = 'declared by the outer app';
  readonly actions = ['save', 'cancel'];
  readonly items: readonly ProjectionItem[] = [
    { id: 1, label: 'one' },
    { id: 2, label: 'two' },
  ];
}
