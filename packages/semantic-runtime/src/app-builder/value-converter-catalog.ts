import {
  BuiltInResourcePackage,
  BuiltInValueConverterName,
} from '../resources/built-in-resources.js';
import { ResourceDefinitionKind } from '../resources/resource-kind.js';
import {
  AppBuilderPartApplicationSiteKind,
  AppBuilderPartOperationKind,
  AppBuilderPartSlotKind,
} from './part-application.js';
import {
  appBuilderBuiltInResourceRef,
  type AppBuilderBuiltInResourceRef,
} from './part-resource.js';

/** Value converter parts grounded in the built-in resource registry. */

/** Stable identity of a value converter. */
export enum AppBuilderValueConverterId {
  /** `| sanitize` — strip unsafe markup from a string. */
  Sanitize = 'sanitize',
  /** `| t` — translate a key/value for the active locale (i18n). */
  Translate = 'translate',
  /** `| nf` — format a number for the active locale (i18n). */
  NumberFormat = 'number-format',
  /** `| df` — format a date for the active locale (i18n). */
  DateFormat = 'date-format',
  /** `| rt` — format a relative time for the active locale (i18n). */
  RelativeTime = 'relative-time',
}

/** One neutral value converter: the `| name` transform and what it does. */
export interface AppBuilderValueConverterDescriptor {
  readonly id: AppBuilderValueConverterId;
  readonly title: string;
  readonly summary: string;
  /** Built-in resource catalog entry that owns the registered converter name. */
  readonly resource: AppBuilderBuiltInResourceRef;
  /** Display-only syntax cue; lowering must use operation/slot metadata instead. */
  readonly syntaxCue: string;
  /** Source locus family where the converter can be applied. */
  readonly applicationSites: readonly AppBuilderPartApplicationSiteKind[];
  /** Source-lowering operation family for this value-converter part. */
  readonly operationKind: AppBuilderPartOperationKind;
  /** Slots required before this converter can lower into a binding expression. */
  readonly requiredSlotKinds: readonly AppBuilderPartSlotKind[];
  /** Optional slots this converter may accept when the caller supplies arguments. */
  readonly optionalSlotKinds: readonly AppBuilderPartSlotKind[];
}

export const APP_BUILDER_VALUE_CONVERTERS: readonly AppBuilderValueConverterDescriptor[] = [
  {
    id: AppBuilderValueConverterId.Sanitize,
    title: 'Sanitize',
    summary: 'Strip unsafe HTML from a string before display.',
    resource: appBuilderBuiltInResourceRef(BuiltInResourcePackage.RuntimeHtml, ResourceDefinitionKind.ValueConverter, BuiltInValueConverterName.Sanitize),
    syntaxCue: '| sanitize',
    applicationSites: [AppBuilderPartApplicationSiteKind.BindingExpressionModifier],
    operationKind: AppBuilderPartOperationKind.ApplyValueConverter,
    requiredSlotKinds: [AppBuilderPartSlotKind.BindingExpression],
    optionalSlotKinds: [],
  },
  {
    id: AppBuilderValueConverterId.Translate,
    title: 'Translate',
    summary: 'Translate a key or value for the active locale.',
    resource: appBuilderBuiltInResourceRef(BuiltInResourcePackage.I18n, ResourceDefinitionKind.ValueConverter, BuiltInValueConverterName.Translation),
    syntaxCue: '| t',
    applicationSites: [AppBuilderPartApplicationSiteKind.BindingExpressionModifier],
    operationKind: AppBuilderPartOperationKind.ApplyValueConverter,
    requiredSlotKinds: [AppBuilderPartSlotKind.BindingExpression],
    optionalSlotKinds: [AppBuilderPartSlotKind.ValueConverterArguments],
  },
  {
    id: AppBuilderValueConverterId.NumberFormat,
    title: 'Number Format',
    summary: 'Format a number for the active locale.',
    resource: appBuilderBuiltInResourceRef(BuiltInResourcePackage.I18n, ResourceDefinitionKind.ValueConverter, BuiltInValueConverterName.NumberFormat),
    syntaxCue: '| nf',
    applicationSites: [AppBuilderPartApplicationSiteKind.BindingExpressionModifier],
    operationKind: AppBuilderPartOperationKind.ApplyValueConverter,
    requiredSlotKinds: [AppBuilderPartSlotKind.BindingExpression],
    optionalSlotKinds: [AppBuilderPartSlotKind.ValueConverterArguments],
  },
  {
    id: AppBuilderValueConverterId.DateFormat,
    title: 'Date Format',
    summary: 'Format a date for the active locale.',
    resource: appBuilderBuiltInResourceRef(BuiltInResourcePackage.I18n, ResourceDefinitionKind.ValueConverter, BuiltInValueConverterName.DateFormat),
    syntaxCue: '| df',
    applicationSites: [AppBuilderPartApplicationSiteKind.BindingExpressionModifier],
    operationKind: AppBuilderPartOperationKind.ApplyValueConverter,
    requiredSlotKinds: [AppBuilderPartSlotKind.BindingExpression],
    optionalSlotKinds: [AppBuilderPartSlotKind.ValueConverterArguments],
  },
  {
    id: AppBuilderValueConverterId.RelativeTime,
    title: 'Relative Time',
    summary: 'Format a relative time (e.g. "3 hours ago") for the active locale.',
    resource: appBuilderBuiltInResourceRef(BuiltInResourcePackage.I18n, ResourceDefinitionKind.ValueConverter, BuiltInValueConverterName.RelativeTime),
    syntaxCue: '| rt',
    applicationSites: [AppBuilderPartApplicationSiteKind.BindingExpressionModifier],
    operationKind: AppBuilderPartOperationKind.ApplyValueConverter,
    requiredSlotKinds: [AppBuilderPartSlotKind.BindingExpression],
    optionalSlotKinds: [AppBuilderPartSlotKind.ValueConverterArguments],
  },
];

/** Look up a value-converter descriptor by id. */
export function appBuilderValueConverterDescriptor(id: AppBuilderValueConverterId): AppBuilderValueConverterDescriptor {
  const converter = APP_BUILDER_VALUE_CONVERTERS.find((candidate) => candidate.id === id);
  if (converter == null) {
    throw new Error(`Unknown app-builder value converter '${id}'.`);
  }
  return converter;
}
