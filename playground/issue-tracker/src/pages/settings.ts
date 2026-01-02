/**
 * Settings Page
 *
 * User preferences and profile settings.
 *
 * Exercises:
 * - value.bind for form inputs (text, select)
 * - Two-way binding for settings
 * - click.trigger for toggle switches
 * - if.bind for conditional sections
 * - Form validation patterns
 */

import { currentUser } from "../domain/data";
import type { User } from "../domain/types";

export class Settings {
  // ==========================================================================
  // State
  // ==========================================================================

  /** User profile (editable copy) */
  profile: Pick<User, "name" | "email"> = {
    name: currentUser.name,
    email: currentUser.email,
  };

  /** Theme preference */
  theme: "light" | "dark" | "system" = "system";

  /** Language preference */
  language = "en";

  /** Date format preference */
  dateFormat: "short" | "medium" | "long" = "medium";

  /** Notification settings */
  notifications = {
    email: true,
    browser: false,
    assigned: true,
    mentioned: true,
    statusChange: false,
  };

  /** Save confirmation message */
  showSavedMessage = false;

  // ==========================================================================
  // Options for dropdowns
  // ==========================================================================

  themeOptions = [
    { value: "light", label: "Light" },
    { value: "dark", label: "Dark" },
    { value: "system", label: "System" },
  ];

  languageOptions = [
    { value: "en", label: "English" },
    { value: "es", label: "Español" },
    { value: "fr", label: "Français" },
    { value: "de", label: "Deutsch" },
  ];

  dateFormatOptions = [
    { value: "short", label: "01/15/24" },
    { value: "medium", label: "Jan 15, 2024" },
    { value: "long", label: "January 15, 2024" },
  ];

  // ==========================================================================
  // Methods
  // ==========================================================================

  /** Toggle a notification setting */
  toggleNotification(key: keyof typeof this.notifications): void {
    this.notifications[key] = !this.notifications[key];
  }

  /** Save profile changes */
  saveProfile(): void {
    // In real app, this would call an API
    console.log("Saving profile:", this.profile);
    this.showSaveConfirmation();
  }

  /** Save preferences */
  savePreferences(): void {
    // In real app, this would persist to storage/API
    console.log("Saving preferences:", {
      theme: this.theme,
      language: this.language,
      dateFormat: this.dateFormat,
    });
    this.showSaveConfirmation();
  }

  /** Save notification settings */
  saveNotifications(): void {
    // In real app, this would persist to storage/API
    console.log("Saving notifications:", this.notifications);
    this.showSaveConfirmation();
  }

  /** Show save confirmation temporarily */
  private showSaveConfirmation(): void {
    this.showSavedMessage = true;
    setTimeout(() => {
      this.showSavedMessage = false;
    }, 3000);
  }

  // ==========================================================================
  // Computed
  // ==========================================================================

  /** Current user's role for display */
  get userRole(): string {
    return currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1);
  }
}
