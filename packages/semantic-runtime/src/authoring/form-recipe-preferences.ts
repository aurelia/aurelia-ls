import { AuthoringPreference } from './ontology.js';
import {
  standardRequestFormFieldUsesCheckedBinding,
  standardRequestFormFieldUsesNativeValue,
  standardRequestFormFieldUsesSelectBinding,
  type StandardRequestFormFieldSchema,
} from './standard-request-form-field-schema.js';

export function standardFormValueChannelPreferences(
  fieldSchema: StandardRequestFormFieldSchema | null,
): readonly AuthoringPreference[] {
  if (fieldSchema == null) {
    return [
      new AuthoringPreference('form-value-channel', 'native-control-value-binding'),
      new AuthoringPreference('form-value-channel', 'checked-model-binding'),
      new AuthoringPreference('form-value-channel', 'select-model-binding'),
      new AuthoringPreference('form-value-channel', 'custom-matcher-comparison'),
    ];
  }
  const preferences: AuthoringPreference[] = [];
  if (fieldSchema.fields.some(standardRequestFormFieldUsesNativeValue)) {
    preferences.push(new AuthoringPreference('form-value-channel', 'native-control-value-binding'));
  }
  if (fieldSchema.fields.some(standardRequestFormFieldUsesCheckedBinding)) {
    preferences.push(new AuthoringPreference('form-value-channel', 'checked-model-binding'));
  }
  if (fieldSchema.fields.some(standardRequestFormFieldUsesSelectBinding)) {
    preferences.push(new AuthoringPreference('form-value-channel', 'select-model-binding'));
  }
  return preferences;
}

export function standardFormTemplateBindingSummary(
  fieldSchema: StandardRequestFormFieldSchema | null,
  validationEnabled: boolean,
  tailParts: readonly string[],
): string {
  return [
    ...standardFormValueChannelSummaryParts(fieldSchema),
    ...(validationEnabled ? ['validation behavior'] : []),
    ...tailParts,
  ].join(', ');
}

function standardFormValueChannelSummaryParts(
  fieldSchema: StandardRequestFormFieldSchema | null,
): readonly string[] {
  if (fieldSchema == null) {
    return [
      'native value binding',
      'checked/model binding',
      'select model binding',
    ];
  }
  const parts: string[] = [];
  if (fieldSchema.fields.some(standardRequestFormFieldUsesNativeValue)) {
    parts.push('native value binding');
  }
  if (fieldSchema.fields.some(standardRequestFormFieldUsesCheckedBinding)) {
    parts.push('checked/model binding');
  }
  if (fieldSchema.fields.some(standardRequestFormFieldUsesSelectBinding)) {
    parts.push('select model binding');
  }
  return parts;
}
