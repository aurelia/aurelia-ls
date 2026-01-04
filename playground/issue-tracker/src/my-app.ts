/**
 * MyApp - Application Shell
 *
 * Root component providing:
 * - Navigation header with links
 * - Router viewport for page content
 * - Global state (current user)
 *
 * Exercises:
 * - t attribute for i18n
 * - load attribute for routing
 * - Interpolation with user data
 * - class.bind for active states
 */

import { Dashboard } from "./pages/dashboard";
import { Issues } from "./pages/issues";
import { IssueDetail } from "./pages/issue-detail";
import { Settings } from "./pages/settings";
import { currentUser } from "./domain/data";

export class MyApp {
  // ==========================================================================
  // Dependencies - Register child components
  // ==========================================================================

  static dependencies = [Dashboard, Issues, IssueDetail, Settings];

  // ==========================================================================
  // Routes Configuration
  // ==========================================================================

  static routes = [
    {
      id: "dashboard",
      path: "",
      component: Dashboard,
      title: "Dashboard",
    },
    {
      id: "issues",
      path: "issues",
      component: Issues,
      title: "Issues",
    },
    {
      id: "issue",
      path: "issues/:id",
      component: IssueDetail,
      title: "Issue Details",
    },
    {
      id: "settings",
      path: "settings",
      component: Settings,
      title: "Settings",
    },
  ];

  // ==========================================================================
  // State
  // ==========================================================================

  /** Currently logged-in user */
  currentUser = currentUser;

  /** Search input ref for keyboard shortcut */
  searchInputRef: HTMLInputElement | null = null;

  /** Global search query */
  searchQuery = "";

  // ==========================================================================
  // Methods
  // ==========================================================================

  /** Focus search input (Cmd+K shortcut) */
  focusSearch(): void {
    this.searchInputRef?.focus();
  }

  /** Handle global search */
  onSearch(): void {
    // Could navigate to issues with search param
    console.log("Search:", this.searchQuery);
  }
}
