import type { VscodeApi } from "../vscode-api.js";
import type { ClientLogger } from "../log.js";

export interface ErrorReportOptions {
  notify?: boolean;
  showOutput?: boolean;
  context?: Record<string, unknown>;
}

export type CaptureResult<T> = { ok: true; value: T } | { ok: false };

/** Reports client failures without turning logging controls into a product subsystem. */
export class ErrorReporter {
  constructor(
    private readonly logger: ClientLogger,
    private readonly vscode: VscodeApi,
  ) {}

  report(error: unknown, label: string, options: ErrorReportOptions = {}): void {
    this.logger.error(label, options.context, error);
    if (options.notify !== false) {
      const message = error instanceof Error ? error.message : String(error);
      void this.vscode.window.showErrorMessage(`${label}: ${message}`);
    }
    if (options.showOutput === true) {
      this.logger.show(true);
    }
  }

  guard<T>(label: string, fn: () => T, options?: ErrorReportOptions): CaptureResult<T> {
    try {
      return { ok: true, value: fn() };
    } catch (error) {
      this.report(error, label, options);
      return { ok: false };
    }
  }

  async capture<T>(label: string, fn: () => Promise<T>, options?: ErrorReportOptions): Promise<CaptureResult<T>> {
    try {
      return { ok: true, value: await fn() };
    } catch (error) {
      this.report(error, label, options);
      return { ok: false };
    }
  }
}
