/**
 * English Translations for Issue Tracker
 *
 * Comprehensive i18n coverage exercising:
 * - Simple key lookups (t="key")
 * - Nested namespaces (t="namespace.key")
 * - Interpolation ({{variable}})
 * - Pluralization ({{count}} items)
 * - Context-aware translations
 */

export const en = {
  // Application chrome
  app: {
    title: "Issue Tracker",
    tagline: "Track bugs, features, and tasks",
    loading: "Loading...",
  },

  // Navigation
  nav: {
    dashboard: "Dashboard",
    issues: "Issues",
    settings: "Settings",
  },

  // Dashboard page
  dashboard: {
    title: "Dashboard",
    welcome: "Welcome back, {{name}}",
    stats: {
      total: "Total Issues",
      open: "Open",
      inProgress: "In Progress",
      review: "In Review",
      closed: "Closed",
    },
    sections: {
      recentActivity: "Recent Activity",
      myIssues: "My Issues",
      criticalIssues: "Critical Issues",
    },
    empty: {
      noActivity: "No recent activity",
      noAssigned: "No issues assigned to you",
    },
  },

  // Issue statuses
  status: {
    draft: "Draft",
    open: "Open",
    in_progress: "In Progress",
    review: "In Review",
    closed: "Closed",
  },

  // Issue priorities
  priority: {
    low: "Low",
    medium: "Medium",
    high: "High",
    critical: "Critical",
  },

  // Issue types
  type: {
    bug: "Bug",
    feature: "Feature",
    task: "Task",
  },

  // User roles
  role: {
    admin: "Admin",
    developer: "Developer",
    tester: "Tester",
    viewer: "Viewer",
  },

  // Issues list page
  issues: {
    title: "Issues",
    count: "{{count}} issues",
    filters: {
      all: "All",
      status: "Status",
      priority: "Priority",
      type: "Type",
      assignee: "Assignee",
      search: "Search issues...",
      clear: "Clear filters",
    },
    sort: {
      newest: "Newest first",
      oldest: "Oldest first",
      priority: "By priority",
      dueDate: "By due date",
    },
    columns: {
      id: "ID",
      title: "Title",
      status: "Status",
      priority: "Priority",
      assignee: "Assignee",
      updated: "Updated",
    },
    empty: {
      title: "No issues found",
      description: "Try adjusting your filters or create a new issue",
      create: "Create your first issue",
    },
  },

  // Issue detail page
  issue: {
    title: "Issue Details",
    meta: {
      reporter: "Reported by {{name}}",
      assignee: "Assigned to {{name}}",
      unassigned: "Unassigned",
      storyPoints: "{{points}} story points",
      noPoints: "No estimate",
    },
    time: {
      created: "Created {{time}}",
      updated: "Updated {{time}}",
      due: "Due {{date}}",
      overdue: "Overdue by {{days}} days",
      noDueDate: "No due date",
    },
    sections: {
      description: "Description",
      labels: "Labels",
      comments: "Comments",
      activity: "Activity",
    },
    comments: {
      empty: "No comments yet",
      placeholder: "Add a comment...",
      submit: "Comment",
    },
    actions: {
      edit: "Edit",
      assign: "Assign",
      changeStatus: "Change Status",
      addLabel: "Add Label",
      delete: "Delete",
    },
    transitions: {
      start: "Start Work",
      review: "Submit for Review",
      approve: "Approve",
      reject: "Request Changes",
      close: "Close",
      reopen: "Reopen",
    },
    notFound: {
      title: "Issue not found",
      description: "The issue you're looking for doesn't exist or has been deleted",
      back: "Back to issues",
    },
  },

  // Settings page
  settings: {
    title: "Settings",
    sections: {
      profile: "Profile",
      preferences: "Preferences",
      notifications: "Notifications",
    },
    profile: {
      name: "Display Name",
      email: "Email Address",
      avatar: "Avatar",
      role: "Role",
      save: "Save Changes",
    },
    preferences: {
      theme: "Theme",
      themeLight: "Light",
      themeDark: "Dark",
      themeSystem: "System",
      language: "Language",
      dateFormat: "Date Format",
      timezone: "Timezone",
    },
    notifications: {
      email: "Email Notifications",
      emailDesc: "Receive email notifications for assigned issues",
      browser: "Browser Notifications",
      browserDesc: "Show desktop notifications",
      assigned: "When assigned to an issue",
      mentioned: "When mentioned in a comment",
      statusChange: "When issue status changes",
    },
    saved: "Settings saved successfully",
  },

  // Actions (buttons, links)
  actions: {
    create: "Create",
    edit: "Edit",
    delete: "Delete",
    save: "Save",
    cancel: "Cancel",
    close: "Close",
    back: "Back",
    refresh: "Refresh",
    export: "Export",
    import: "Import",
    viewAll: "View All",
    loadMore: "Load More",
  },

  // Common / shared
  common: {
    yes: "Yes",
    no: "No",
    or: "or",
    and: "and",
    none: "None",
    all: "All",
    loading: "Loading...",
    error: "An error occurred",
    retry: "Try again",
    noResults: "No results",
    selected: "{{count}} selected",
  },

  // Validation messages
  validation: {
    required: "This field is required",
    minLength: "Must be at least {{min}} characters",
    maxLength: "Must be at most {{max}} characters",
    email: "Please enter a valid email",
    url: "Please enter a valid URL",
  },

  // Time / dates
  time: {
    now: "Just now",
    minutesAgo: "{{count}} minute ago",
    minutesAgo_plural: "{{count}} minutes ago",
    hoursAgo: "{{count}} hour ago",
    hoursAgo_plural: "{{count}} hours ago",
    daysAgo: "{{count}} day ago",
    daysAgo_plural: "{{count}} days ago",
    weeksAgo: "{{count}} week ago",
    weeksAgo_plural: "{{count}} weeks ago",
  },

  // Confirmations
  confirm: {
    delete: {
      title: "Delete Issue",
      message: "Are you sure you want to delete this issue? This action cannot be undone.",
      confirm: "Delete",
      cancel: "Cancel",
    },
    unsaved: {
      title: "Unsaved Changes",
      message: "You have unsaved changes. Are you sure you want to leave?",
      confirm: "Leave",
      cancel: "Stay",
    },
  },
};

/** Type for translation keys (enables autocomplete) */
export type TranslationKey = string; // Could be made more precise with template literal types
