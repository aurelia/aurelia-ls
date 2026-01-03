/**
 * Time Ago Component
 *
 * Displays relative time (e.g., "2 hours ago").
 *
 * Exercises:
 * - @bindable for Date input
 * - Computed property for relative time calculation
 * - Interpolation for display
 *
 * Note: In production, this would use i18n's relativeTime value converter.
 * For this demo, we implement simple relative time logic.
 */

export class TimeAgo {
  /** The date to display relative to now */
  date: Date | null = null;

  /** Optional prefix (e.g., "Created", "Updated") */
  prefix = "";

  /**
   * Calculate relative time string.
   * In production, use: ${date | relativeTime}
   */
  get relativeTime(): string {
    if (!this.date) return "";

    const now = new Date();
    const diffMs = now.getTime() - this.date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);
    const diffWeek = Math.floor(diffDay / 7);

    if (diffSec < 60) return "just now";
    if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? "" : "s"} ago`;
    if (diffHour < 24) return `${diffHour} hour${diffHour === 1 ? "" : "s"} ago`;
    if (diffDay < 7) return `${diffDay} day${diffDay === 1 ? "" : "s"} ago`;
    return `${diffWeek} week${diffWeek === 1 ? "" : "s"} ago`;
  }

  /** Full formatted date for tooltip */
  get fullDate(): string {
    return this.date?.toLocaleString() ?? "";
  }
}
