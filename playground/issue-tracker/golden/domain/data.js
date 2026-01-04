const users = [
  {
    id: "user-1",
    name: "Alice Chen",
    email: "alice@example.com",
    avatar: "AC",
    role: "admin",
    online: true
  },
  {
    id: "user-2",
    name: "Bob Martinez",
    email: "bob@example.com",
    avatar: "BM",
    role: "developer",
    online: true
  },
  {
    id: "user-3",
    name: "Carol Smith",
    email: "carol@example.com",
    avatar: "CS",
    role: "developer",
    online: false
  },
  {
    id: "user-4",
    name: "David Kim",
    email: "david@example.com",
    avatar: "DK",
    role: "tester",
    online: true
  },
  {
    id: "user-5",
    name: "Eve Johnson",
    email: "eve@example.com",
    avatar: "EJ",
    role: "viewer",
    online: false
  }
];
function getUserById(id) {
  return users.find((u) => u.id === id);
}
const currentUser = users[0];
const labels = [
  { id: "label-1", name: "frontend", color: "#3b82f6" },
  { id: "label-2", name: "backend", color: "#10b981" },
  { id: "label-3", name: "database", color: "#f59e0b" },
  { id: "label-4", name: "security", color: "#ef4444" },
  { id: "label-5", name: "performance", color: "#8b5cf6" },
  { id: "label-6", name: "documentation", color: "#6b7280" },
  { id: "label-7", name: "ux", color: "#ec4899" },
  { id: "label-8", name: "api", color: "#06b6d4" }
];
function getLabelById(id) {
  return labels.find((l) => l.id === id);
}
function daysAgo(days) {
  const d = /* @__PURE__ */ new Date();
  d.setDate(d.getDate() - days);
  return d;
}
function daysFromNow(days) {
  const d = /* @__PURE__ */ new Date();
  d.setDate(d.getDate() + days);
  return d;
}
function hoursAgo(hours) {
  const d = /* @__PURE__ */ new Date();
  d.setHours(d.getHours() - hours);
  return d;
}
const commentsForAuth = [
  {
    id: "cmt-1",
    author: users[1],
    content: "I can take this one. Should we use JWT or session-based auth?",
    createdAt: daysAgo(6)
  },
  {
    id: "cmt-2",
    author: users[0],
    content: "Let's go with JWT for the API, but keep sessions for the web app.",
    createdAt: daysAgo(5)
  },
  {
    id: "cmt-3",
    author: users[3],
    content: "I'll prepare test cases once the implementation is ready.",
    createdAt: daysAgo(4)
  }
];
const commentsForPerf = [
  {
    id: "cmt-4",
    author: users[2],
    content: "Profiling shows the issue is in the N+1 query on the dashboard.",
    createdAt: hoursAgo(3)
  }
];
const issues = [
  // Draft issue - just created
  {
    id: "ISS-001",
    title: "Research GraphQL migration",
    description: "Evaluate the effort required to migrate our REST API to GraphQL. Consider tooling, learning curve, and performance implications.",
    status: "draft",
    priority: "low",
    type: "task",
    assignee: null,
    reporter: users[0],
    labels: [labels[1], labels[7]],
    storyPoints: 3,
    createdAt: hoursAgo(2),
    updatedAt: hoursAgo(2),
    dueDate: null,
    comments: []
  },
  // Open issues - ready to be worked on
  {
    id: "ISS-002",
    title: "Implement user authentication",
    description: "Add login, logout, and session management. Support OAuth providers (Google, GitHub) and email/password authentication.",
    status: "open",
    priority: "high",
    type: "feature",
    assignee: users[1],
    reporter: users[0],
    labels: [labels[0], labels[1], labels[3]],
    storyPoints: 8,
    createdAt: daysAgo(7),
    updatedAt: daysAgo(4),
    dueDate: daysFromNow(7),
    comments: commentsForAuth
  },
  {
    id: "ISS-003",
    title: "Fix pagination on issue list",
    description: "The pagination component shows incorrect page numbers when there are more than 100 issues. Off-by-one error suspected.",
    status: "open",
    priority: "medium",
    type: "bug",
    assignee: null,
    reporter: users[3],
    labels: [labels[0]],
    storyPoints: 2,
    createdAt: daysAgo(3),
    updatedAt: daysAgo(3),
    dueDate: daysFromNow(3),
    comments: []
  },
  // In Progress - actively being worked on
  {
    id: "ISS-004",
    title: "Add dark mode support",
    description: "Implement system-aware dark mode with manual toggle. Store preference in localStorage. Update all components to use CSS variables.",
    status: "in_progress",
    priority: "medium",
    type: "feature",
    assignee: users[2],
    reporter: users[4],
    labels: [labels[0], labels[6]],
    storyPoints: 5,
    createdAt: daysAgo(10),
    updatedAt: hoursAgo(1),
    dueDate: daysFromNow(2),
    comments: []
  },
  {
    id: "ISS-005",
    title: "Optimize dashboard query performance",
    description: "Dashboard load time has increased to 3+ seconds. Profile and optimize the aggregation queries. Consider caching frequently accessed data.",
    status: "in_progress",
    priority: "critical",
    type: "bug",
    assignee: users[1],
    reporter: users[0],
    labels: [labels[1], labels[2], labels[4]],
    storyPoints: 5,
    createdAt: daysAgo(2),
    updatedAt: hoursAgo(3),
    dueDate: daysFromNow(1),
    comments: commentsForPerf
  },
  // In Review - waiting for approval
  {
    id: "ISS-006",
    title: "Add export to CSV functionality",
    description: "Allow users to export filtered issue list to CSV format. Include all visible columns and respect current filters.",
    status: "review",
    priority: "low",
    type: "feature",
    assignee: users[2],
    reporter: users[4],
    labels: [labels[0]],
    storyPoints: 3,
    createdAt: daysAgo(14),
    updatedAt: daysAgo(1),
    dueDate: null,
    comments: []
  },
  {
    id: "ISS-007",
    title: "Update API documentation",
    description: "Document all new endpoints added in v2.0. Include request/response examples and authentication requirements.",
    status: "review",
    priority: "medium",
    type: "task",
    assignee: users[0],
    reporter: users[1],
    labels: [labels[5], labels[7]],
    storyPoints: 2,
    createdAt: daysAgo(5),
    updatedAt: daysAgo(1),
    dueDate: daysFromNow(5),
    comments: []
  },
  // Closed - completed issues
  {
    id: "ISS-008",
    title: "Set up CI/CD pipeline",
    description: "Configure GitHub Actions for automated testing and deployment. Include lint, test, build, and deploy stages.",
    status: "closed",
    priority: "high",
    type: "task",
    assignee: users[1],
    reporter: users[0],
    labels: [labels[1]],
    storyPoints: 5,
    createdAt: daysAgo(21),
    updatedAt: daysAgo(14),
    dueDate: null,
    comments: []
  },
  {
    id: "ISS-009",
    title: "Fix memory leak in WebSocket handler",
    description: "Memory usage grows unbounded when many clients connect/disconnect. Event listeners not being properly cleaned up.",
    status: "closed",
    priority: "critical",
    type: "bug",
    assignee: users[2],
    reporter: users[3],
    labels: [labels[1], labels[4]],
    storyPoints: 3,
    createdAt: daysAgo(30),
    updatedAt: daysAgo(25),
    dueDate: null,
    comments: []
  },
  {
    id: "ISS-010",
    title: "Add keyboard shortcuts",
    description: "Implement common keyboard shortcuts: Cmd+K for search, Cmd+N for new issue, arrow keys for navigation.",
    status: "closed",
    priority: "low",
    type: "feature",
    assignee: users[2],
    reporter: users[0],
    labels: [labels[0], labels[6]],
    storyPoints: 2,
    createdAt: daysAgo(45),
    updatedAt: daysAgo(40),
    dueDate: null,
    comments: []
  }
];
function getIssueById(id) {
  return issues.find((i) => i.id === id);
}
function getIssuesByStatus(status) {
  return issues.filter((i) => i.status === status);
}
function getIssuesByAssignee(userId) {
  return issues.filter((i) => i.assignee?.id === userId);
}
function filterIssues(allIssues, filters) {
  return allIssues.filter((issue) => {
    if (filters.status && filters.status !== "all" && issue.status !== filters.status) {
      return false;
    }
    if (filters.priority && filters.priority !== "all" && issue.priority !== filters.priority) {
      return false;
    }
    if (filters.type && filters.type !== "all" && issue.type !== filters.type) {
      return false;
    }
    if (filters.assignee && filters.assignee !== "all" && issue.assignee?.id !== filters.assignee) {
      return false;
    }
    if (filters.search) {
      const query = filters.search.toLowerCase();
      const matchesTitle = issue.title.toLowerCase().includes(query);
      const matchesDesc = issue.description.toLowerCase().includes(query);
      const matchesId = issue.id.toLowerCase().includes(query);
      if (!matchesTitle && !matchesDesc && !matchesId) {
        return false;
      }
    }
    return true;
  });
}
export {
  currentUser,
  filterIssues,
  getIssueById,
  getIssuesByAssignee,
  getIssuesByStatus,
  getLabelById,
  getUserById,
  issues,
  labels,
  users
};
