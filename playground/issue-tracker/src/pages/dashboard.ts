/**
 * Dashboard Page
 *
 * Overview of issue statistics and recent activity.
 *
 * Exercises:
 * - t with params: t="dashboard.welcome" t.params.bind="{name}"
 * - Interpolation: ${stats.open}
 * - repeat.for: Recent issues list
 * - if.bind: Empty states
 * - switch/case: Status indicators
 * - Value converters: numberFormat
 */

import { issues, currentUser, getIssuesByAssignee } from "../domain/data";
import { calculateStats, type IssueStats, type Issue } from "../domain/types";
import { StatusBadge } from "../components/status-badge";
import { PriorityIcon } from "../components/priority-icon";
import { UserAvatar } from "../components/user-avatar";

export class Dashboard {
  static dependencies = [StatusBadge, PriorityIcon, UserAvatar];

  // ==========================================================================
  // State
  // ==========================================================================

  /** Current user for welcome message */
  user = currentUser;

  /** Calculated statistics */
  stats: IssueStats = calculateStats(issues);

  /** Recent issues (last 5 updated) */
  recentIssues: Issue[] = [...issues]
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
    .slice(0, 5);

  /** Issues assigned to current user */
  myIssues: Issue[] = getIssuesByAssignee(currentUser.id);

  /** Critical issues (high or critical priority, not closed) */
  criticalIssues: Issue[] = issues.filter(
    (i) =>
      (i.priority === "high" || i.priority === "critical") &&
      i.status !== "closed"
  );

  // ==========================================================================
  // Computed
  // ==========================================================================

  /** Check if there are any issues to show */
  get hasRecentIssues(): boolean {
    return this.recentIssues.length > 0;
  }

  get hasMyIssues(): boolean {
    return this.myIssues.length > 0;
  }

  get hasCriticalIssues(): boolean {
    return this.criticalIssues.length > 0;
  }
}
