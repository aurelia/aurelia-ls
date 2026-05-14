export type FrameworkErrorEnumName = 'ErrorNames' | 'Events';
export type FrameworkErrorCodeLabel = `AUR${number}`;

/**
 * Preserve the intended Aurelia framework error-code owner while exposing the
 * plain AUR label that semantic-runtime diagnostics publish.
 */
export function frameworkErrorCode<TCodeLabel extends FrameworkErrorCodeLabel>(
  frameworkPackageId: string,
  frameworkEnumName: FrameworkErrorEnumName,
  frameworkCodeName: string,
  codeLabel: TCodeLabel,
): TCodeLabel {
  void frameworkPackageId;
  void frameworkEnumName;
  void frameworkCodeName;
  return codeLabel;
}
