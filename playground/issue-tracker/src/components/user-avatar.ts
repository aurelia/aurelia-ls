/**
 * User Avatar Component
 *
 * Displays user avatar with initials and online indicator.
 *
 * Exercises:
 * - @bindable for complex object input
 * - with.bind pattern (user context)
 * - if.bind for online indicator
 * - class.bind for size variants
 */

import type { User } from "../domain/types";

export class UserAvatar {
  /** The user to display */
  user: User | null = null;

  /** Avatar size: small, medium, large */
  size: "small" | "medium" | "large" = "medium";

  /** Show online indicator */
  showOnline = true;
}
