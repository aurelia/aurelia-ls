/**
 * Priority Icon Component
 *
 * Displays priority with icon and color.
 *
 * Exercises:
 * - @bindable for input properties
 * - switch/case for priority-specific icons
 * - t="key" for translated labels (tooltip)
 */

import type { Priority } from "../domain/types";

export class PriorityIcon {
  /** The priority level to display */
  priority: Priority = "medium";

  /** Whether to show the label text */
  showLabel = false;
}
