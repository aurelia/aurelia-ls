/** Framework configuration family admitted into an Aurelia application entrypoint. */
export enum AureliaConfigurationAdmissionKind {
  /** Router package registration through RouterConfiguration. */
  RouterConfiguration = 'router-configuration',
  /** State package registration through StateDefaultConfiguration. */
  StateDefaultConfiguration = 'state-default-configuration',
  /** I18n package registration through I18nConfiguration. */
  I18nConfiguration = 'i18n-configuration',
  /** Validation HTML package registration through ValidationHtmlConfiguration. */
  ValidationHtmlConfiguration = 'validation-html-configuration',
  /** UI virtualization package registration through DefaultVirtualizationConfiguration. */
  UiVirtualizationDefaultConfiguration = 'ui-virtualization-default-configuration',
}
