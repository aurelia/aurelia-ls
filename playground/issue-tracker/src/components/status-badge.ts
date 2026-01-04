/**
 * Status Badge Component
 *
 * Displays issue status with appropriate styling.
 *
 * Exercises:
 * - @bindable for input properties
 * - switch/case for status-specific rendering
 * - t="key" for translated labels
 * - class binding for dynamic styling
 */

import type { IssueStatus } from "../domain/types";

export class StatusBadge {
  /** The issue status to display */
  status: IssueStatus = "open";
}
