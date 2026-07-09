import Aurelia from 'aurelia';
import { ResourceRegistrationDuplicatesApp } from './resource-registration-duplicates-app';
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

Aurelia
  .register(
    DuplicateCardOne,
    DuplicateCardTwo,
    DuplicateFlagOne,
    DuplicateFlagTwo,
    DuplicateFormatOneValueConverter,
    DuplicateFormatTwoValueConverter,
    DuplicateTrackOneBindingBehavior,
    DuplicateTrackTwoBindingBehavior,
  )
  .app(ResourceRegistrationDuplicatesApp)
  .start();
