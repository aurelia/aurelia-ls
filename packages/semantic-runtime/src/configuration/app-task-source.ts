import { AppTaskSlot } from './app-task.js';

/** Source request for an `AppTask.*(...)` registry expression. */
export interface AppTaskRegistrationSourceRequest {
  /** Lifecycle slot selected by the `AppTask` factory. */
  readonly slot: AppTaskSlot;
  /** Optional DI key expression resolved before the callback is invoked. */
  readonly keyExpression?: string | null;
  /** Callback expression invoked when the selected app-task slot runs. */
  readonly callbackExpression: string;
}

/** Serialize an Aurelia `AppTask.*(...)` registry expression. */
export function appTaskRegistrationSourceText(
  request: AppTaskRegistrationSourceRequest,
): string {
  const callbackExpression = request.callbackExpression.trim();
  const keyExpression = request.keyExpression?.trim();
  return keyExpression == null || keyExpression.length === 0
    ? `AppTask.${request.slot}(${callbackExpression})`
    : `AppTask.${request.slot}(${keyExpression}, ${callbackExpression})`;
}
