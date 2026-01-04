/**
 * Issue Tracker Domain Types
 *
 * Clean DDD-style type definitions for the issue tracking domain.
 * These types model a realistic issue tracker like GitHub Issues or Jira.
 */

// =============================================================================
// Enums / Union Types
// =============================================================================

/** Issue workflow states - forms a state machine */
export type IssueStatus = "draft" | "open" | "in_progress" | "review" | "closed";

/** Issue priority levels */
export type Priority = "low" | "medium" | "high" | "critical";

/** Issue classification types */
export type IssueType = "bug" | "feature" | "task";

/** User roles for permission modeling */
export type UserRole = "admin" | "developer" | "tester" | "viewer";

// =============================================================================
// Entity Types
// =============================================================================

/** User entity - team members who can be assigned to issues */
export interface User {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly avatar: string; // Initials or URL
  readonly role: UserRole;
  online: boolean; // Mutable - presence status
}

/** Label entity - categorization tags for issues */
export interface Label {
  readonly id: string;
  readonly name: string;
  readonly color: string; // Hex color code
}

/** Comment entity - discussion on issues */
export interface Comment {
  readonly id: string;
  readonly author: User;
  readonly content: string;
  readonly createdAt: Date;
}

/** Issue entity - the core domain object */
export interface Issue {
  readonly id: string;
  title: string;
  description: string;
  status: IssueStatus;
  priority: Priority;
  type: IssueType;
  assignee: User | null;
  readonly reporter: User;
  labels: Label[];
  storyPoints: number;
  readonly createdAt: Date;
  updatedAt: Date;
  dueDate: Date | null;
  comments: Comment[];
}

// =============================================================================
// Computed / Derived Types
// =============================================================================

/** Statistics for dashboard display */
export interface IssueStats {
  total: number;
  open: number;
  inProgress: number;
  review: number;
  closed: number;
  byPriority: Record<Priority, number>;
  byType: Record<IssueType, number>;
}

/** Filter criteria for issue list */
export interface IssueFilters {
  status: IssueStatus | "all";
  priority: Priority | "all";
  type: IssueType | "all";
  assignee: string | "all"; // User ID or "all"
  search: string;
}

// =============================================================================
// State Machine Helpers
// =============================================================================

/** Valid status transitions (state machine edges) */
export const STATUS_TRANSITIONS: Record<IssueStatus, IssueStatus[]> = {
  draft: ["open"],
  open: ["in_progress", "closed"],
  in_progress: ["review", "open"],
  review: ["closed", "in_progress"],
  closed: ["open"], // Reopen
};

/** Check if a status transition is valid */
export function canTransition(from: IssueStatus, to: IssueStatus): boolean {
  return STATUS_TRANSITIONS[from].includes(to);
}

/** Get next valid statuses from current status */
export function getNextStatuses(current: IssueStatus): IssueStatus[] {
  return STATUS_TRANSITIONS[current];
}

// =============================================================================
// Factory Functions
// =============================================================================

let issueIdCounter = 100;
let commentIdCounter = 1000;

/** Create a new issue with defaults */
export function createIssue(
  partial: Pick<Issue, "title" | "description" | "type" | "reporter"> &
    Partial<Omit<Issue, "id" | "createdAt" | "updatedAt" | "comments">>
): Issue {
  const now = new Date();
  return {
    id: `ISS-${++issueIdCounter}`,
    title: partial.title,
    description: partial.description,
    status: partial.status ?? "draft",
    priority: partial.priority ?? "medium",
    type: partial.type,
    assignee: partial.assignee ?? null,
    reporter: partial.reporter,
    labels: partial.labels ?? [],
    storyPoints: partial.storyPoints ?? 0,
    createdAt: now,
    updatedAt: now,
    dueDate: partial.dueDate ?? null,
    comments: [],
  };
}

/** Create a new comment */
export function createComment(
  author: User,
  content: string
): Comment {
  return {
    id: `CMT-${++commentIdCounter}`,
    author,
    content,
    createdAt: new Date(),
  };
}

// =============================================================================
// Statistics Calculation
// =============================================================================

/** Calculate issue statistics from a list of issues */
export function calculateStats(issues: Issue[]): IssueStats {
  const stats: IssueStats = {
    total: issues.length,
    open: 0,
    inProgress: 0,
    review: 0,
    closed: 0,
    byPriority: { low: 0, medium: 0, high: 0, critical: 0 },
    byType: { bug: 0, feature: 0, task: 0 },
  };

  for (const issue of issues) {
    // By status
    switch (issue.status) {
      case "open":
      case "draft":
        stats.open++;
        break;
      case "in_progress":
        stats.inProgress++;
        break;
      case "review":
        stats.review++;
        break;
      case "closed":
        stats.closed++;
        break;
    }

    // By priority and type
    stats.byPriority[issue.priority]++;
    stats.byType[issue.type]++;
  }

  return stats;
}
