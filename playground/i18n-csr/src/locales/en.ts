/**
 * English translations for i18n E2E tests
 *
 * Tests all translation binding patterns:
 * - Static keys: t="greeting.hello"
 * - Interpolated keys: t="priority.${level}"
 * - Bracket syntax: t="[title]tooltip.message"
 */

export const en = {
  // Static key tests
  greeting: {
    hello: "Hello World",
    welcome: "Welcome to the app",
  },

  // Priority levels for dynamic key tests
  priority: {
    low: "Low Priority",
    medium: "Medium Priority",
    high: "High Priority",
    critical: "Critical Priority",
  },

  // Status for bound expression tests
  status: {
    open: "Open",
    closed: "Closed",
    pending: "Pending",
  },

  // Tooltip messages for bracket syntax tests
  tooltip: {
    message: "This is a tooltip",
    save: "Save your changes",
    delete: "Delete this item",
    info: "More information",
    warning: "Warning message",
  },
};
