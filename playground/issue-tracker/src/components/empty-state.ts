/**
 * Empty State Component
 *
 * Displays a placeholder when no content is available.
 *
 * Exercises:
 * - @bindable for customizable content
 * - if.bind for optional elements
 * - Slot for custom action content
 */

export class EmptyState {
  /** Icon to display (emoji or icon class) */
  icon = "📋";

  /** Title text */
  title = "No items found";

  /** Description text */
  description = "";

  /** Action button text (optional) */
  actionText = "";

  /** Action callback */
  onAction: (() => void) | null = null;
}
