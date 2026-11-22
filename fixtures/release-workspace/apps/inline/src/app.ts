import { customElement } from 'aurelia';
import { ReleaseCard } from '@release/card-kit';

@customElement({
  name: 'inline-app',
  template: '<release-card></release-card><p>${message}</p>',
  dependencies: [ReleaseCard],
})
export class InlineApp {
  message = 'Inline owner';
}
