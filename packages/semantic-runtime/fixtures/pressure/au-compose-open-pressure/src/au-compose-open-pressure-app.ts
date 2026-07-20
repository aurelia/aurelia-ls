import { customElement } from '@aurelia/runtime-html';
import {
  externalFlushMode,
  externalModel,
  externalScopeBehavior,
  externalTag,
  externalTemplate,
  runtimeCompositionDefaults,
} from 'au-compose-pressure-inputs';
import { PressureWidget, type PressureWidgetModel } from './pressure-widget';
import template from './au-compose-open-pressure-app.html';

const pressuredComponentCarrier = {
  component: PressureWidget,
  ...runtimeCompositionDefaults,
};

@customElement({
  name: 'au-compose-open-pressure-app',
  template,
  dependencies: [PressureWidget],
})
export class AuComposeOpenPressureApp {
  readonly closedComponent = PressureWidget;
  readonly pressuredComponent = pressuredComponentCarrier.component;
  readonly closedModel: PressureWidgetModel = { message: 'closed model' };

  readonly externalTemplate = externalTemplate;
  readonly externalModel = externalModel;
  readonly externalScopeBehavior = externalScopeBehavior;
  readonly externalTag = externalTag;
  readonly externalFlushMode = externalFlushMode;
}
