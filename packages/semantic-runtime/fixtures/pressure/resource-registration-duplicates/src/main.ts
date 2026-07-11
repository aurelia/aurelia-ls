import Aurelia from 'aurelia';
import { ResourceRegistrationDuplicatesApp } from './resource-registration-duplicates-app';
import {
  AliasAfterPrimary,
  AliasBeforePrimary,
  AliasOwnerOne,
  AliasOwnerTwo,
  AliasPrimary,
  DuplicateCommandOneBindingCommand,
  DuplicateCommandTwoBindingCommand,
  DuplicateCardOne,
  DuplicateCardTwo,
  DuplicateFlagOne,
  DuplicateFlagTwo,
  DuplicateFormatOneValueConverter,
  DuplicateFormatTwoValueConverter,
  DuplicatePatternOne,
  DuplicatePatternTwo,
  DuplicateTrackOneBindingBehavior,
  DuplicateTrackTwoBindingBehavior,
  PrimaryAfterAlias,
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
    DuplicateCommandOneBindingCommand,
    DuplicateCommandTwoBindingCommand,
    DuplicatePatternOne,
    DuplicatePatternTwo,
    AliasOwnerOne,
    AliasOwnerTwo,
    AliasPrimary,
    AliasAfterPrimary,
    AliasBeforePrimary,
    PrimaryAfterAlias,
  )
  .app(ResourceRegistrationDuplicatesApp)
  .start();
