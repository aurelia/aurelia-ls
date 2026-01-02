/**
 * Issues Page
 *
 * Filterable list of all issues.
 *
 * Exercises:
 * - repeat.for with complex objects
 * - if/else for empty states
 * - value.bind for form inputs (search, filters)
 * - change.trigger for filter updates
 * - Computed properties for filtered list
 * - Multiple custom elements
 */

import { issues as allIssues, users, filterIssues } from "../domain/data";
import type { Issue, IssueStatus, Priority, IssueType } from "../domain/types";
import { StatusBadge } from "../components/status-badge";
import { PriorityIcon } from "../components/priority-icon";
import { UserAvatar } from "../components/user-avatar";
import { LabelList } from "../components/label-list";
import { EmptyState } from "../components/empty-state";

export class Issues {
  static dependencies = [StatusBadge, PriorityIcon, UserAvatar, LabelList, EmptyState];

  // ==========================================================================
  // State
  // ==========================================================================

  /** All available issues */
  allIssues = allIssues;

  /** Team members for assignee filter */
  teamMembers = users;

  /** Filter state */
  searchQuery = "";
  statusFilter: IssueStatus | "all" = "all";
  priorityFilter: Priority | "all" = "all";
  typeFilter: IssueType | "all" = "all";
  assigneeFilter = "all";

  /** Show/hide filter panel */
  showFilters = true;

  // ==========================================================================
  // Filter Options (for dropdowns)
  // ==========================================================================

  statusOptions: Array<{ value: IssueStatus | "all"; label: string }> = [
    { value: "all", label: "All Statuses" },
    { value: "draft", label: "Draft" },
    { value: "open", label: "Open" },
    { value: "in_progress", label: "In Progress" },
    { value: "review", label: "In Review" },
    { value: "closed", label: "Closed" },
  ];

  priorityOptions: Array<{ value: Priority | "all"; label: string }> = [
    { value: "all", label: "All Priorities" },
    { value: "critical", label: "Critical" },
    { value: "high", label: "High" },
    { value: "medium", label: "Medium" },
    { value: "low", label: "Low" },
  ];

  typeOptions: Array<{ value: IssueType | "all"; label: string }> = [
    { value: "all", label: "All Types" },
    { value: "bug", label: "Bug" },
    { value: "feature", label: "Feature" },
    { value: "task", label: "Task" },
  ];

  // ==========================================================================
  // Computed
  // ==========================================================================

  /** Filtered issues based on current filter state */
  get filteredIssues(): Issue[] {
    return filterIssues(this.allIssues, {
      status: this.statusFilter,
      priority: this.priorityFilter,
      type: this.typeFilter,
      assignee: this.assigneeFilter,
      search: this.searchQuery,
    });
  }

  /** Issue count for display */
  get issueCount(): number {
    return this.filteredIssues.length;
  }

  /** Check if any filters are active */
  get hasActiveFilters(): boolean {
    return (
      this.searchQuery !== "" ||
      this.statusFilter !== "all" ||
      this.priorityFilter !== "all" ||
      this.typeFilter !== "all" ||
      this.assigneeFilter !== "all"
    );
  }

  /** Check if filtered list is empty */
  get isEmpty(): boolean {
    return this.filteredIssues.length === 0;
  }

  // ==========================================================================
  // Methods
  // ==========================================================================

  /** Toggle filter panel visibility */
  toggleFilters(): void {
    this.showFilters = !this.showFilters;
  }

  /** Clear all filters */
  clearFilters(): void {
    this.searchQuery = "";
    this.statusFilter = "all";
    this.priorityFilter = "all";
    this.typeFilter = "all";
    this.assigneeFilter = "all";
  }
}
