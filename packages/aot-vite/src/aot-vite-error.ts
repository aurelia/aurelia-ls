export type AotViteErrorCode =
  | "AOT_VITE_ARTIFACT_FAILED"
  | "AOT_VITE_INVALID_ARTIFACT"
  | "AOT_VITE_RESOLUTION_FAILED"
  | "AOT_VITE_SESSION_CONTRACT"
  | "AOT_VITE_SESSION_NOT_STARTED"
  | "AOT_VITE_SOURCE_AUTHORITY"
  | "AOT_VITE_UNSUPPORTED_BUILD";

export class AotViteError extends Error {
  public readonly code: AotViteErrorCode;
  public readonly sourcePath: string | undefined;

  public constructor(
    code: AotViteErrorCode,
    message: string,
    sourcePath?: string,
    cause?: unknown,
  ) {
    super(message, cause === undefined ? undefined : { cause });
    this.name = "AotViteError";
    this.code = code;
    this.sourcePath = sourcePath;
  }
}
