import { frameworkErrorCode } from '../kernel/framework-error-code.js';

/**
 * Aurelia dialog error-code labels that source analysis can cite when it
 * models the same DialogConfiguration or DialogService branch.
 */
export const DialogFrameworkErrorCode = {
  /** `dialog ErrorNames.dialog_settings_invalid`; DialogService.open(...) settings provide neither component nor template. */
  SettingsInvalid: frameworkErrorCode('dialog', 'ErrorNames', 'dialog_settings_invalid', 'AUR0903'),
  /** `dialog ErrorNames.dialog_no_empty_default_configuration`; the bare DialogConfiguration registry was admitted. */
  NoEmptyDefaultConfiguration: frameworkErrorCode('dialog', 'ErrorNames', 'dialog_no_empty_default_configuration', 'AUR0904'),
  /** `dialog ErrorNames.dialog_child_settings_not_found`; a dialog child resolver key has no matching withChild(...) registration. */
  ChildSettingsNotFound: frameworkErrorCode('dialog', 'ErrorNames', 'dialog_child_settings_not_found', 'AUR0910'),
} as const;

export type DialogFrameworkErrorCode =
  typeof DialogFrameworkErrorCode[keyof typeof DialogFrameworkErrorCode];
