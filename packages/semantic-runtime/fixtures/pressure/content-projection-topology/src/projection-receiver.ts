import { bindable, bindingBehavior, customElement, valueConverter } from 'aurelia';
import template from './projection-receiver.html';
import { ReceivingComposeWidget } from './receiving-compose-widget';

export interface ProjectionHeadingExposure {
  readonly exposedLabel: string;
}

export interface AlternateProjectionHeadingExposure {
  readonly exposedLabel: string;
  readonly alternateOnly: boolean;
}

@valueConverter('fallbackLabel')
export class FallbackLabelValueConverter {
  toView(value: string): string {
    return `fallback:${value}`;
  }
}

@bindingBehavior('fallbackAudit')
export class FallbackAuditBindingBehavior {
  bind(_scope: unknown, _binding: unknown, _label: string): void {}
}

@customElement({
  name: 'projection-receiver',
  template,
  capture: true,
  dependencies: [FallbackLabelValueConverter, FallbackAuditBindingBehavior, ReceivingComposeWidget],
})
export class ProjectionReceiver {
  readonly receiverLabel = 'projection receiver';

  @bindable exposeHeading: ProjectionHeadingExposure = {
    exposedLabel: 'heading exposure',
  };

  @bindable alternateHeading: AlternateProjectionHeadingExposure = {
    exposedLabel: 'alternate heading exposure',
    alternateOnly: true,
  };
}
