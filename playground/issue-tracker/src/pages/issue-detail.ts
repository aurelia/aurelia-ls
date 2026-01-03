/**
 * Issue Detail Page
 *
 * Single issue view with full details and comments.
 *
 * Exercises:
 * - Route parameter: :id
 * - with.bind for nested context
 * - if/else for loading/error states
 * - switch/case for status display
 * - repeat.for for comments
 * - click.trigger for status transitions
 * - promise.bind for async loading (simulated)
 */

import { resolve } from "@aurelia/kernel";
import { IRouter, IRouteableComponent, type Params } from "@aurelia/router";
import { getIssueById, users } from "../domain/data";
import {
  type Issue,
  type Comment,
  getNextStatuses,
  canTransition,
  createComment,
  type IssueStatus,
} from "../domain/types";
import { StatusBadge } from "../components/status-badge";
import { PriorityIcon } from "../components/priority-icon";
import { UserAvatar } from "../components/user-avatar";
import { LabelList } from "../components/label-list";
import { TimeAgo } from "../components/time-ago";
import { EmptyState } from "../components/empty-state";

export class IssueDetail implements IRouteableComponent {
  static dependencies = [StatusBadge, PriorityIcon, UserAvatar, LabelList, TimeAgo, EmptyState];

  // ==========================================================================
  // Router
  // ==========================================================================

  private router = resolve(IRouter);

  // ==========================================================================
  // State
  // ==========================================================================

  /** The issue being displayed */
  issue: Issue | null = null;

  /** Loading state */
  isLoading = true;

  /** Error state */
  notFound = false;

  /** New comment input */
  newComment = "";

  /** Available next statuses */
  availableTransitions: IssueStatus[] = [];

  // ==========================================================================
  // Lifecycle
  // ==========================================================================

  /**
   * Load issue when route params change.
   * Called by router when entering this route.
   */
  loading(params: Params): void {
    const id = params.id as string;
    this.loadIssue(id);
  }

  // ==========================================================================
  // Data Loading
  // ==========================================================================

  private loadIssue(id: string): void {
    this.isLoading = true;
    this.notFound = false;

    // Simulate async loading (in real app, this would be an API call)
    setTimeout(() => {
      const issue = getIssueById(id);

      if (issue) {
        this.issue = issue;
        this.availableTransitions = getNextStatuses(issue.status);
      } else {
        this.notFound = true;
      }

      this.isLoading = false;
    }, 100);
  }

  // ==========================================================================
  // Actions
  // ==========================================================================

  /** Change issue status */
  changeStatus(newStatus: IssueStatus): void {
    if (!this.issue) return;

    if (canTransition(this.issue.status, newStatus)) {
      this.issue.status = newStatus;
      this.issue.updatedAt = new Date();
      this.availableTransitions = getNextStatuses(newStatus);
    }
  }

  /** Add a comment */
  addComment(): void {
    if (!this.issue || !this.newComment.trim()) return;

    const comment = createComment(users[0]!, this.newComment.trim());
    this.issue.comments.push(comment);
    this.issue.updatedAt = new Date();
    this.newComment = "";
  }

  /** Navigate back to issues list */
  goBack(): void {
    this.router.load("issues");
  }

  // ==========================================================================
  // Computed
  // ==========================================================================

  get hasComments(): boolean {
    return (this.issue?.comments.length ?? 0) > 0;
  }

  get hasLabels(): boolean {
    return (this.issue?.labels.length ?? 0) > 0;
  }

  get hasDueDate(): boolean {
    return this.issue?.dueDate !== null;
  }

  get isOverdue(): boolean {
    if (!this.issue?.dueDate) return false;
    return this.issue.dueDate < new Date() && this.issue.status !== "closed";
  }
}
