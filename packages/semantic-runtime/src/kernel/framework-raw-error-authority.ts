export type FrameworkRawErrorUsageMechanism =
  | 'raw-new-error'
  | 'raw-error-factory-call';

export type FrameworkRawErrorUsageEffect =
  | 'throw'
  | 'warning'
  | 'return'
  | 'new-error'
  | 'call';

export interface FrameworkRawErrorAuthority {
  readonly key: string;
  readonly frameworkPackageId: string;
  readonly mechanism: FrameworkRawErrorUsageMechanism;
  readonly effect: FrameworkRawErrorUsageEffect;
  readonly frameworkSourceFilePath: string;
  readonly frameworkSourceStartLine: number;
  readonly expressionText: string;
}

/**
 * Preserve exact Aurelia raw Error authority for framework packages that do
 * not route a behavior through ErrorNames/Events.
 */
export function frameworkRawErrorAuthority(
  frameworkPackageId: string,
  mechanism: FrameworkRawErrorUsageMechanism,
  effect: FrameworkRawErrorUsageEffect,
  frameworkSourceFilePath: string,
  frameworkSourceStartLine: number,
  expressionText: string,
): FrameworkRawErrorAuthority {
  return {
    key: `${frameworkPackageId}:${frameworkSourceFilePath}:${frameworkSourceStartLine}:${mechanism}:${effect}`,
    frameworkPackageId,
    mechanism,
    effect,
    frameworkSourceFilePath,
    frameworkSourceStartLine,
    expressionText,
  };
}
