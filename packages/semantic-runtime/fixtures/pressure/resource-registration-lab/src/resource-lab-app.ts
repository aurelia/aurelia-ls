import { customElement } from 'aurelia';
import template from './resource-lab-app.html';
import { ConventionPanel } from './convention-panel';
import {
  DecoratorCard,
  DecoratorTooltip,
  DefinedAccent,
  DefinedBadge,
  DefinedCodeValueConverter,
  DefinedMaskBindingBehavior,
  FormatNameValueConverter,
  StaticAuditBindingBehavior,
  StaticFlag,
  StaticPanel,
  StaticStatusValueConverter,
  SurfaceGate,
  TrackEditBindingBehavior,
} from './resources';

@customElement({
  name: 'resource-lab-app',
  template,
  dependencies: [
    ConventionPanel,
    DecoratorCard,
    DecoratorTooltip,
    DefinedAccent,
    DefinedBadge,
    DefinedCodeValueConverter,
    DefinedMaskBindingBehavior,
    FormatNameValueConverter,
    StaticAuditBindingBehavior,
    StaticFlag,
    StaticPanel,
    StaticStatusValueConverter,
    SurfaceGate,
    TrackEditBindingBehavior,
  ],
})
export class ResourceLabApp {
  title = 'Resource Lab';
  isActive = true;
  accentTone = 'warm';
  count = 2;
}
