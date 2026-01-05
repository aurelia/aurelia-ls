/**
 * i18n Test Component
 *
 * View-model for testing translation binding patterns.
 * Uses convention naming (MyAppCustomElement + my-app.html).
 */
export class MyAppCustomElement {
  /** Current priority level for interpolated key test */
  level = "medium";

  /** Current status key for bound expression test */
  statusKey = "status.pending";

  /** Current tooltip type for bracket interpolation test */
  tooltipType = "info";
}
