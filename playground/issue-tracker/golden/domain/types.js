const STATUS_TRANSITIONS = {
  draft: ["open"],
  open: ["in_progress", "closed"],
  in_progress: ["review", "open"],
  review: ["closed", "in_progress"],
  closed: ["open"]
  // Reopen
};
function canTransition(from, to) {
  return STATUS_TRANSITIONS[from].includes(to);
}
function getNextStatuses(current) {
  return STATUS_TRANSITIONS[current];
}
let issueIdCounter = 100;
let commentIdCounter = 1e3;
function createIssue(partial) {
  const now = /* @__PURE__ */ new Date();
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
    comments: []
  };
}
function createComment(author, content) {
  return {
    id: `CMT-${++commentIdCounter}`,
    author,
    content,
    createdAt: /* @__PURE__ */ new Date()
  };
}
function calculateStats(issues) {
  const stats = {
    total: issues.length,
    open: 0,
    inProgress: 0,
    review: 0,
    closed: 0,
    byPriority: { low: 0, medium: 0, high: 0, critical: 0 },
    byType: { bug: 0, feature: 0, task: 0 }
  };
  for (const issue of issues) {
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
    stats.byPriority[issue.priority]++;
    stats.byType[issue.type]++;
  }
  return stats;
}
export {
  STATUS_TRANSITIONS,
  calculateStats,
  canTransition,
  createComment,
  createIssue,
  getNextStatuses
};
