import { customElement } from 'aurelia';
import template from './resource-registration-duplicates-app.html';
import {
  DuplicateCardOne,
  DuplicateCardTwo,
  DuplicateFlagOne,
  DuplicateFlagTwo,
  DuplicateFormatOneValueConverter,
  DuplicateFormatTwoValueConverter,
  DuplicateTrackOneBindingBehavior,
  DuplicateTrackTwoBindingBehavior,
} from './resources';

@customElement({
  name: 'resource-registration-duplicates-app',
  template,
  dependencies: [
    DuplicateCardOne,
    DuplicateCardTwo,
    DuplicateFlagOne,
    DuplicateFlagTwo,
    DuplicateFormatOneValueConverter,
    DuplicateFormatTwoValueConverter,
    DuplicateTrackOneBindingBehavior,
    DuplicateTrackTwoBindingBehavior,
  ],
})
export class ResourceRegistrationDuplicatesApp {
  value = 'duplicate';
}
