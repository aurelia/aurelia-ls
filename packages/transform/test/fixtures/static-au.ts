/**
 * Fixture: Existing static $au (manual or previously compiled)
 *
 * Tests: Class already has static $au that needs updating
 */

export class StatusBadge {
  status = "pending";

  static $au = {
    type: "custom-element",
    name: "status-badge",
    template: "<span class=\"badge\">${status}</span>",
    instructions: [],
    needsCompile: false,
  };
}
