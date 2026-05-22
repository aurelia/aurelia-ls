import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const fixtureWorkspaceRoot = path.resolve(packageRoot, '../semantic-runtime/fixtures/authoring/generated-minimal-app');
const stateBackedFixtureWorkspaceRoot = path.resolve(packageRoot, '../semantic-runtime/fixtures/authoring/generated-state-backed-form');
const searchableDataTableFixtureWorkspaceRoot = path.resolve(packageRoot, '../semantic-runtime/fixtures/authoring/generated-searchable-data-table');
const routedSearchableDataTableFixtureWorkspaceRoot = path.resolve(packageRoot, '../semantic-runtime/fixtures/authoring/generated-routed-searchable-data-table');
const dataFlowIssueFixtureWorkspaceRoot = path.resolve(packageRoot, '../semantic-runtime/fixtures/pressure/binding-data-flow-issue-rollups');
const forwardingAccessorFixtureWorkspaceRoot = path.resolve(packageRoot, '../semantic-runtime/fixtures/pressure/one-hop-forwarding-accessor');
const routerDynamicPatternFixtureWorkspaceRoot = path.resolve(packageRoot, '../semantic-runtime/fixtures/pressure/router-dynamic-pattern');
const transport = new StdioClientTransport({
  command: process.execPath,
  args: ['out/server.js'],
  cwd: packageRoot,
});
const client = new Client({ name: 'au-mcp-probe', version: '0.0.0' });

function hasSuggestedSourceParameterContract(recipePlanRow, key, valueShape, applicationPolicy) {
  return recipePlanRow?.suggestedSourceParameterContracts?.some((row) =>
    row.key === key
    && row.valueShape === valueShape
    && row.applicationPolicy === applicationPolicy
  ) === true;
}

try {
  await client.connect(transport);
  const tools = await client.listTools();
  const outputSchemaCount = tools.tools.filter((tool) => tool.outputSchema != null).length;
  const readOnlyToolCount = tools.tools.filter((tool) => tool.annotations?.readOnlyHint === true).length;
  const cacheTool = tools.tools.find((tool) => tool.name === 'aurelia_clear_analysis_cache');
  const catalog = await client.callTool({
    name: 'aurelia_authoring_catalog',
    arguments: { catalogView: 'overview' },
  });
  const appBuildingGuidance = await client.callTool({
    name: 'aurelia_app_building_guidance',
    arguments: { focus: 'app-building' },
  });
  const featureGoalGuidance = await client.callTool({
    name: 'aurelia_app_building_guidance',
    arguments: {
      focus: 'forms',
      featureGoal: 'Add a routed searchable support-request table with editable filters and translated validation messages',
    },
  });
  const routedSearchableGuidance = await client.callTool({
    name: 'aurelia_app_building_guidance',
    arguments: {
      focus: 'app-building',
      featureGoal: 'Build a routed user directory with search, filters, sorting, pagination, selection, and profile detail routes',
    },
  });
  const productListGuidance = await client.callTool({
    name: 'aurelia_app_building_guidance',
    arguments: {
      focus: 'app-building',
      featureGoal: 'Build a product list with product card components and selected product details',
    },
  });
  const customerCatalogGuidance = await client.callTool({
    name: 'aurelia_app_building_guidance',
    arguments: {
      focus: 'app-building',
      featureGoal: 'Build a customer catalog',
    },
  });
  const routedDashboardGuidance = await client.callTool({
    name: 'aurelia_app_building_guidance',
    arguments: {
      focus: 'app-building',
      featureGoal: 'Build a routed dashboard with analytics widgets',
    },
  });
  const bareRoutedDashboardGuidance = await client.callTool({
    name: 'aurelia_app_building_guidance',
    arguments: {
      focus: 'app-building',
      featureGoal: 'Build a routed dashboard',
    },
  });
  const routePluralShellGuidance = await client.callTool({
    name: 'aurelia_app_building_guidance',
    arguments: {
      focus: 'app-building',
      featureGoal: 'Build an app shell with two routes',
    },
  });
  const shellSectionsGuidance = await client.callTool({
    name: 'aurelia_app_building_guidance',
    arguments: {
      focus: 'app-building',
      featureGoal: 'Build an app shell with dashboard and settings routes',
    },
  });
  const featureGoalTokenGuidance = await client.callTool({
    name: 'aurelia_app_building_guidance',
    arguments: {
      focus: 'app-building',
      featureGoal: 'Create a specialist dashboard widget',
    },
  });
  const featureGoalChatMessagesGuidance = await client.callTool({
    name: 'aurelia_app_building_guidance',
    arguments: {
      focus: 'app-building',
      featureGoal: 'Add a chat messages table with unread filters',
    },
  });
  const featureGoalFieldLabelsGuidance = await client.callTool({
    name: 'aurelia_app_building_guidance',
    arguments: {
      focus: 'app-building',
      featureGoal: 'Add field labels to a profile form',
    },
  });
  const featureGoalValidatedFormGuidance = await client.callTool({
    name: 'aurelia_app_building_guidance',
    arguments: {
      focus: 'app-building',
      featureGoal: 'Build a profile form with validation messages',
    },
  });
  const featureGoalRoutedValidatedFormGuidance = await client.callTool({
    name: 'aurelia_app_building_guidance',
    arguments: {
      focus: 'app-building',
      featureGoal: 'Build a routed profile form with validation messages and saved summary',
    },
  });
  const featureGoalMultiStepFormGuidance = await client.callTool({
    name: 'aurelia_app_building_guidance',
    arguments: {
      focus: 'app-building',
      featureGoal: 'Build a multi step profile form with validation messages',
    },
  });
  const featureGoalOnboardingFlowGuidance = await client.callTool({
    name: 'aurelia_app_building_guidance',
    arguments: {
      focus: 'app-building',
      featureGoal: 'Build a customer onboarding flow with account details, role select, notification checkboxes, validation messages, and a review route',
    },
  });
  const featureGoalOnboardingFormGuidance = await client.callTool({
    name: 'aurelia_app_building_guidance',
    arguments: {
      focus: 'app-building',
      featureGoal: 'Build a customer onboarding form with account type select, newsletter checkbox, and API key field',
    },
  });
  const featureGoalApiBackedWizardGuidance = await client.callTool({
    name: 'aurelia_app_building_guidance',
    arguments: {
      focus: 'app-building',
      featureGoal: 'Build an API-backed customer onboarding wizard with account details, billing contact, notification preferences, validation, and a review route',
    },
  });
  const featureGoalPreferencesGuidance = await client.callTool({
    name: 'aurelia_app_building_guidance',
    arguments: {
      focus: 'app-building',
      featureGoal: 'Build a preferences screen with feature toggles and a save button',
    },
  });
  const featureGoalCheckoutGuidance = await client.callTool({
    name: 'aurelia_app_building_guidance',
    arguments: {
      focus: 'app-building',
      featureGoal: 'Build a shopping cart checkout flow with shipping address and payment options',
    },
  });
  const featureGoalRoutedCatalogCheckoutGuidance = await client.callTool({
    name: 'aurelia_app_building_guidance',
    arguments: {
      focus: 'app-building',
      featureGoal: 'Build a routed product catalog with search filters, cart summary, product detail routes, and checkout flow',
    },
  });
  const featureGoalContactSubmitGuidance = await client.callTool({
    name: 'aurelia_app_building_guidance',
    arguments: {
      focus: 'app-building',
      featureGoal: 'Build a contact form with name email message and submit button',
    },
  });
  const featureGoalContactMessageGuidance = await client.callTool({
    name: 'aurelia_app_building_guidance',
    arguments: {
      focus: 'app-building',
      featureGoal: 'Build a contact form with email and message',
    },
  });
  const featureGoalApiSignupGuidance = await client.callTool({
    name: 'aurelia_app_building_guidance',
    arguments: {
      focus: 'app-building',
      featureGoal: 'Build an API backed signup form with email password and terms checkbox',
    },
  });
  const featureGoalCustomerIntakeGuidance = await client.callTool({
    name: 'aurelia_app_building_guidance',
    arguments: {
      focus: 'app-building',
      featureGoal: 'Build an API-backed customer intake form with company name, contact email, plan select, and terms checkbox',
    },
  });
  const featureGoalCustomerServiceGuidance = await client.callTool({
    name: 'aurelia_app_building_guidance',
    arguments: {
      focus: 'app-building',
      featureGoal: 'Build a customer service request form with priority dropdown',
    },
  });
  const featureGoalApiServiceGuidance = await client.callTool({
    name: 'aurelia_app_building_guidance',
    arguments: {
      focus: 'app-building',
      featureGoal: 'Build a profile form that loads and saves data through an API service',
    },
  });
  const featureGoalDocumentAutosaveGuidance = await client.callTool({
    name: 'aurelia_app_building_guidance',
    arguments: {
      focus: 'app-building',
      featureGoal: 'Build a document workspace with searchable documents, tag filters, selected document preview, edit metadata form, and autosave service',
    },
  });
  const featureGoalInventoryEditGuidance = await client.callTool({
    name: 'aurelia_app_building_guidance',
    arguments: {
      focus: 'app-building',
      featureGoal: 'Build a routed inventory table with editable stock fields and validation',
    },
  });
  const featureGoalProductAdminTableGuidance = await client.callTool({
    name: 'aurelia_app_building_guidance',
    arguments: {
      focus: 'app-building',
      featureGoal: 'Build a routed inventory admin with searchable table, status filters, category select, and editable product details',
    },
  });
  const featureGoalSupportInboxGuidance = await client.callTool({
    name: 'aurelia_app_building_guidance',
    arguments: {
      focus: 'app-building',
      featureGoal: 'Build a routed support inbox with message filters, selected conversation route, reply form, validation errors, and translated labels',
    },
  });
  const featureGoalSupportWorkspaceGuidance = await client.callTool({
    name: 'aurelia_app_building_guidance',
    arguments: {
      focus: 'app-building',
      featureGoal: 'Build a routed customer support workspace with searchable tickets, priority filters, assignment select, SLA hours number, and editable ticket details',
    },
  });
  const featureGoalSupportTicketRouteGuidance = await client.callTool({
    name: 'aurelia_app_building_guidance',
    arguments: {
      focus: 'app-building',
      featureGoal: 'Build a support workspace with ticket search, priority filter, assignee select, SLA warning style, and ticket detail route',
    },
  });
  const featureGoalOrderManagementGuidance = await client.callTool({
    name: 'aurelia_app_building_guidance',
    arguments: {
      focus: 'app-building',
      featureGoal: 'Build a routed order management workspace with searchable orders, status select for draft, submitted, shipped, cancelled, editable shipping address, payment review, validation, and service-backed loading',
    },
  });
  const featureGoalApiKeysSettingsGuidance = await client.callTool({
    name: 'aurelia_app_building_guidance',
    arguments: {
      focus: 'app-building',
      featureGoal: 'Build a settings area with tabs for account, notifications, billing address, and API keys',
    },
  });
  const featureGoalSettingsTabsFieldsGuidance = await client.callTool({
    name: 'aurelia_app_building_guidance',
    arguments: {
      focus: 'app-building',
      featureGoal: 'Build settings tabs with API key field and notification toggles',
    },
  });
  const featureGoalSettingsTabsProfileFormGuidance = await client.callTool({
    name: 'aurelia_app_building_guidance',
    arguments: {
      focus: 'app-building',
      featureGoal: 'Build settings tabs for profile and notifications plus a profile form for display name and email',
    },
  });
  const featureGoalValidatedSettingsFieldsGuidance = await client.callTool({
    name: 'aurelia_app_building_guidance',
    arguments: {
      focus: 'app-building',
      featureGoal: 'Build a validated settings form for API keys and notifications',
    },
  });
  const featureGoalAccountSettingsControlsGuidance = await client.callTool({
    name: 'aurelia_app_building_guidance',
    arguments: {
      focus: 'app-building',
      featureGoal: 'Build account settings with notification toggles, preferred language select, API key field, and save button',
    },
  });
  const featureGoalCustomerOperationsSettingsGuidance = await client.callTool({
    name: 'aurelia_app_building_guidance',
    arguments: {
      focus: 'app-building',
      featureGoal: 'Build a routed customer operations workspace with searchable customer accounts, account detail route, notification preferences form, language select, API key settings, service-backed loading and save actions',
    },
  });
  const featureGoalCustomerSupportPortalGuidance = await client.callTool({
    name: 'aurelia_app_building_guidance',
    arguments: {
      focus: 'app-building',
      featureGoal: 'Build a routed customer support portal with dashboard, searchable tickets, ticket detail route, reply form, priority and assignment filters, notification settings, validation, localization, API-backed loading and save actions',
    },
  });
  const featureGoalOptionalStatePluginGuidance = await client.callTool({
    name: 'aurelia_app_building_guidance',
    arguments: {
      focus: 'app-building',
      featureGoal: 'Build an operations workspace with routed projects, task board, searchable task list, assignee filters, task detail route, comments editor, team member settings, API-backed save, and @aurelia/state only if it helps',
    },
  });
  const featureGoalCatalogCheckoutSettingsGuidance = await client.callTool({
    name: 'aurelia_app_building_guidance',
    arguments: {
      focus: 'app-building',
      featureGoal: 'Build a product catalog app with categories, product cards, comparison list, cart summary, checkout wizard, account preferences, and routes for catalog, cart, checkout, and settings',
    },
  });
  const featureGoalAccountSettingsOptionsGuidance = await client.callTool({
    name: 'aurelia_app_building_guidance',
    arguments: {
      focus: 'app-building',
      featureGoal: 'Build account settings with timezone select for UTC, CET, EST, email notifications toggle, preferred theme select for light, dark, system',
    },
  });
  const featureGoalTeamMemberEditorGuidance = await client.callTool({
    name: 'aurelia_app_building_guidance',
    arguments: {
      focus: 'app-building',
      featureGoal: 'Build a route-owned team member editor with role select, active toggle, start date, weekly hours number, and validation',
    },
  });
  const featureGoalTeamMemberOptionsGuidance = await client.callTool({
    name: 'aurelia_app_building_guidance',
    arguments: {
      focus: 'app-building',
      featureGoal: 'Build a route-owned team member editor with role select for owner, maintainer, viewer, permission checkboxes for read, write, administer, active toggle, start date, weekly hours number, and validation',
    },
  });
  const featureGoalTenantAdminApiSaveGuidance = await client.callTool({
    name: 'aurelia_app_building_guidance',
    arguments: {
      focus: 'app-building',
      featureGoal: 'Build a tenant admin with routed account list, account detail route, status filters, edit settings form, validation, and API-backed save',
    },
  });
  const featureGoalOrganizationAdminGuidance = await client.callTool({
    name: 'aurelia_app_building_guidance',
    arguments: {
      focus: 'app-building',
      featureGoal: 'Build a routed organization admin with teams list, member detail route, role select, permission checkboxes, audit log table, settings sections, validation, and API-backed save',
    },
  });
  const featureGoalProjectBoardGuidance = await client.callTool({
    name: 'aurelia_app_building_guidance',
    arguments: {
      focus: 'app-building',
      featureGoal: 'Build a project workspace with task board, assignee filters, selected task details, comments, and notification settings',
    },
  });
  const featureGoalProjectManagementWorkspaceGuidance = await client.callTool({
    name: 'aurelia_app_building_guidance',
    arguments: {
      focus: 'app-building',
      featureGoal: 'Build a routed project management workspace with task list filters, assignee select, due date filters, priority badges, editable task details, comments, and API-backed save',
    },
  });
  const featureGoalIssueTrackerApiSaveGuidance = await client.callTool({
    name: 'aurelia_app_building_guidance',
    arguments: {
      focus: 'app-building',
      featureGoal: 'Build an issue tracker with issue board, assignee filters, issue detail route, comments, validation, and API-backed status save',
    },
  });
  const featureGoalRepositoryBrowserSearchGuidance = await client.callTool({
    name: 'aurelia_app_building_guidance',
    arguments: {
      focus: 'app-building',
      featureGoal: 'Build a repository browser with branch select, file tree, searchable file list, code viewer route, and raw file download',
    },
  });
  const featureGoalRepositoryOwnerFiltersGuidance = await client.callTool({
    name: 'aurelia_app_building_guidance',
    arguments: {
      focus: 'app-building',
      featureGoal: 'Build a repository browser with search by owner, language select for TypeScript, JavaScript, C#, archived toggle, starred filter',
    },
  });
  const featureGoalProductCatalogCompareGuidance = await client.callTool({
    name: 'aurelia_app_building_guidance',
    arguments: {
      focus: 'app-building',
      featureGoal: 'Build a product catalog with category filters, product cards, detail routes, and a compare list',
    },
  });
  const featureGoalStatePluginTodoGuidance = await client.callTool({
    name: 'aurelia_app_building_guidance',
    arguments: {
      focus: 'app-building',
      featureGoal: 'Build an app that uses @aurelia/state for a todo list with filters',
    },
  });
  const featureGoalStatePluginProjectTaskGuidance = await client.callTool({
    name: 'aurelia_app_building_guidance',
    arguments: {
      focus: 'app-building',
      featureGoal: 'Build an Aurelia state store app for project tasks with status filters and add task dispatch',
    },
  });
  const featureGoalPlainTodoGuidance = await client.callTool({
    name: 'aurelia_app_building_guidance',
    arguments: {
      focus: 'app-building',
      featureGoal: 'Build a todo list with filters',
    },
  });
  const featureGoalCustomerAccountListGuidance = await client.callTool({
    name: 'aurelia_app_building_guidance',
    arguments: {
      focus: 'app-building',
      featureGoal: 'Build a searchable customer account list',
    },
  });
  const featureGoalProfileEditorGuidance = await client.callTool({
    name: 'aurelia_app_building_guidance',
    arguments: {
      focus: 'app-building',
      featureGoal: 'Build a user profile editor with avatar URL and preferred contact method',
    },
  });
  const featureGoalAccountEditorGuidance = await client.callTool({
    name: 'aurelia_app_building_guidance',
    arguments: {
      focus: 'app-building',
      featureGoal: 'Build an account editor with display name and timezone select',
    },
  });
  const featureGoalProfileFormGuidance = await client.callTool({
    name: 'aurelia_app_building_guidance',
    arguments: {
      focus: 'app-building',
      featureGoal: 'Build a profile form for name and email',
    },
  });
  const featureGoalRoutedOrderEditGuidance = await client.callTool({
    name: 'aurelia_app_building_guidance',
    arguments: {
      focus: 'app-building',
      featureGoal: 'Build a routed order editor with validation',
    },
  });
  const featureGoalProfileDetailsGuidance = await client.callTool({
    name: 'aurelia_app_building_guidance',
    arguments: {
      focus: 'app-building',
      featureGoal: 'Build a team member directory with profile cards, department filters, and selected profile details',
    },
  });
  const featureGoalRoutedSettingsGuidance = await client.callTool({
    name: 'aurelia_app_building_guidance',
    arguments: {
      focus: 'app-building',
      featureGoal: 'Build a route for editing account settings',
    },
  });
  const featureGoalRouteOnlySettingsGuidance = await client.callTool({
    name: 'aurelia_app_building_guidance',
    arguments: {
      focus: 'app-building',
      featureGoal: 'Build routes for a dashboard and settings screen',
    },
  });
  const featureGoalAdminSearchEditGuidance = await client.callTool({
    name: 'aurelia_app_building_guidance',
    arguments: {
      focus: 'app-building',
      featureGoal: 'Build an admin dashboard with user search, selected detail, and an edit form',
    },
  });
  const featureGoalAdminProjectTaskSearchGuidance = await client.callTool({
    name: 'aurelia_app_building_guidance',
    arguments: {
      focus: 'app-building',
      featureGoal: 'Build an admin search table for project tasks with status filters and editable detail pages',
    },
  });
  const featureGoalAdminProjectTaskSettingsGuidance = await client.callTool({
    name: 'aurelia_app_building_guidance',
    arguments: {
      focus: 'app-building',
      featureGoal: 'Build an admin workspace with a routed project task list, status filters, and a settings form for API keys and notifications',
    },
  });
  const featureGoalAdminProjectTaskApiSettingsGuidance = await client.callTool({
    name: 'aurelia_app_building_guidance',
    arguments: {
      focus: 'app-building',
      featureGoal: 'Build an admin workspace with a routed project task list, status filters, and an API-backed settings form for API keys and notifications',
    },
  });
  const featureGoalAuthenticatedAdminGuidance = await client.callTool({
    name: 'aurelia_app_building_guidance',
    arguments: {
      focus: 'app-building',
      featureGoal: 'Build an authenticated admin area with user roles, permission checkboxes, audit log table, localization, and a profile settings form',
    },
  });
  const featureGoalCrudFormsGuidance = await client.callTool({
    name: 'aurelia_app_building_guidance',
    arguments: {
      focus: 'app-building',
      featureGoal: 'Build a CRUD admin for orders with list, detail, create and edit forms',
    },
  });
  const featureGoalLoadingIndicatorGuidance = await client.callTool({
    name: 'aurelia_app_building_guidance',
    arguments: {
      focus: 'app-building',
      featureGoal: 'Add a loading indicator to the product table',
    },
  });
  const featureGoalLayoutGridGuidance = await client.callTool({
    name: 'aurelia_app_building_guidance',
    arguments: {
      focus: 'app-building',
      featureGoal: 'Build a responsive dashboard grid layout with cards',
    },
  });
  const featureGoalPricingProductTiersGuidance = await client.callTool({
    name: 'aurelia_app_building_guidance',
    arguments: {
      focus: 'app-building',
      featureGoal: 'Build a pricing page with product tiers',
    },
  });
  const featureGoalRepositoryBrowserGuidance = await client.callTool({
    name: 'aurelia_app_building_guidance',
    arguments: {
      focus: 'app-building',
      featureGoal: 'Build a repository browser with file tree',
    },
  });
  const stateBackedFormGuidance = await client.callTool({
    name: 'aurelia_app_building_guidance',
    arguments: { focus: 'forms', recipeKey: 'state-backed-form', decisionLimit: 4 },
  });
  const routingGuidance = await client.callTool({
    name: 'aurelia_app_building_guidance',
    arguments: { focus: 'routing' },
  });
  const routedCatalogGuidance = await client.callTool({
    name: 'aurelia_app_building_guidance',
    arguments: { recipeKey: 'routed-catalog-storefront' },
  });
  const stateStoreGuidance = await client.callTool({
    name: 'aurelia_app_building_guidance',
    arguments: { recipeKey: 'state-store-list' },
  });
  const routedServiceValidatedGuidance = await client.callTool({
    name: 'aurelia_app_building_guidance',
    arguments: { recipeKey: 'routed-service-validated-state-backed-form' },
  });
  const pluginGuidance = await client.callTool({
    name: 'aurelia_app_building_guidance',
    arguments: { focus: 'plugins' },
  });
  const appQueryCatalog = await client.callTool({
    name: 'aurelia_app_query_catalog',
    arguments: { group: 'router' },
  });
  const workspaceOverview = await client.callTool({
    name: 'aurelia_workspace_overview',
    arguments: { workspaceRoot: fixtureWorkspaceRoot, projectDiscovery: 'single-root' },
  });
  const workspaceOverviewWithProjectRows = await client.callTool({
    name: 'aurelia_workspace_overview',
    arguments: { workspaceRoot: fixtureWorkspaceRoot, projectDiscovery: 'single-root', projectPage: { size: 1 } },
  });
  const routedDataTableAppOverview = await client.callTool({
    name: 'aurelia_app_overview',
    arguments: { workspaceRoot: routedSearchableDataTableFixtureWorkspaceRoot, projectDiscovery: 'single-root' },
  });
  const routedDataTableRouterOverview = await client.callTool({
    name: 'aurelia_router_overview',
    arguments: { workspaceRoot: routedSearchableDataTableFixtureWorkspaceRoot, projectDiscovery: 'single-root' },
  });
  const templateCompletions = await client.callTool({
    name: 'aurelia_template_completions',
    arguments: {
      workspaceRoot: stateBackedFixtureWorkspaceRoot,
      projectDiscovery: 'single-root',
      cursor: { filePath: 'src/components/state-backed-form.html', line: 2, character: 43 },
      page: { size: 3 },
    },
  });
  const templateCursorInfo = await client.callTool({
    name: 'aurelia_template_cursor_info',
    arguments: {
      workspaceRoot: stateBackedFixtureWorkspaceRoot,
      projectDiscovery: 'single-root',
      cursor: { filePath: 'src/components/state-backed-form.html', line: 2, character: 43 },
    },
  });
  const templateDiagnostics = await client.callTool({
    name: 'aurelia_template_diagnostics',
    arguments: {
      workspaceRoot: stateBackedFixtureWorkspaceRoot,
      projectDiscovery: 'single-root',
      sourceFile: { filePath: 'src/components/state-backed-form.html' },
    },
  });
  const authoringOrientation = await client.callTool({
    name: 'aurelia_authoring_orientation',
    arguments: {
      workspaceRoot: stateBackedFixtureWorkspaceRoot,
      projectDiscovery: 'single-root',
      analysisDepth: 'binding-observation',
      page: { size: 3 },
    },
  });
  const dataTableOrientation = await client.callTool({
    name: 'aurelia_authoring_orientation',
    arguments: {
      workspaceRoot: searchableDataTableFixtureWorkspaceRoot,
      projectDiscovery: 'single-root',
      analysisDepth: 'binding-observation',
      page: { size: 3 },
    },
  });
  const forwardingAccessorOrientation = await client.callTool({
    name: 'aurelia_authoring_orientation',
    arguments: {
      workspaceRoot: forwardingAccessorFixtureWorkspaceRoot,
      projectDiscovery: 'single-root',
      analysisDepth: 'binding-observation',
      page: { size: 3 },
    },
  });
  const dataTableValueChannelSummary = await client.callTool({
    name: 'aurelia_app_query',
    arguments: {
      workspaceRoot: searchableDataTableFixtureWorkspaceRoot,
      projectDiscovery: 'single-root',
      analysisDepth: 'binding-observation',
      queryKind: 'binding-value-channel-summary',
      page: { size: 5 },
    },
  });
  const dataTableDataFlowSummary = await client.callTool({
    name: 'aurelia_app_query',
    arguments: {
      workspaceRoot: searchableDataTableFixtureWorkspaceRoot,
      projectDiscovery: 'single-root',
      analysisDepth: 'binding-observation',
      queryKind: 'binding-data-flow-summary',
      page: { size: 12 },
    },
  });
  const dataTableObservedDependencySummary = await client.callTool({
    name: 'aurelia_app_query',
    arguments: {
      workspaceRoot: searchableDataTableFixtureWorkspaceRoot,
      projectDiscovery: 'single-root',
      analysisDepth: 'binding-observation',
      queryKind: 'binding-observed-dependency-summary',
      page: { size: 8 },
    },
  });
  const dataFlowIssueSummary = await client.callTool({
    name: 'aurelia_app_query',
    arguments: {
      workspaceRoot: dataFlowIssueFixtureWorkspaceRoot,
      projectDiscovery: 'single-root',
      analysisDepth: 'binding-observation',
      queryKind: 'binding-data-flow-summary',
      page: { size: 0 },
    },
  });
  const dataFlowDiagnosticOverview = await client.callTool({
    name: 'aurelia_diagnostic_overview',
    arguments: {
      workspaceRoot: dataFlowIssueFixtureWorkspaceRoot,
      projectDiscovery: 'single-root',
      analysisDepth: 'binding-observation',
    },
  });
  const dataFlowAppDiagnostics = await client.callTool({
    name: 'aurelia_app_diagnostics',
    arguments: {
      workspaceRoot: dataFlowIssueFixtureWorkspaceRoot,
      projectDiscovery: 'single-root',
      analysisDepth: 'binding-observation',
      page: { size: 5 },
    },
  });
  const routerOpenSeamOverview = await client.callTool({
    name: 'aurelia_open_seam_overview',
    arguments: {
      workspaceRoot: routerDynamicPatternFixtureWorkspaceRoot,
      projectDiscovery: 'single-root',
      analysisDepth: 'binding-observation',
    },
  });
  const dataTableSummaryBatch = await client.callTool({
    name: 'aurelia_app_query_batch',
    arguments: {
      workspaceRoot: searchableDataTableFixtureWorkspaceRoot,
      projectDiscovery: 'single-root',
      analysisDepth: 'binding-observation',
      queries: [
        { kind: 'binding-data-flow-summary', page: { size: 0 } },
        { kind: 'binding-value-channel-summary', page: { size: 0 } },
        { kind: 'binding-observed-dependency-summary', page: { size: 0 } },
      ],
    },
  });
  const cacheOverview = await client.callTool({
    name: 'aurelia_analysis_cache_overview',
    arguments: {},
  });
  const recipePlan = await client.callTool({
    name: 'aurelia_authoring_recipe_plan',
    arguments: { recipeKey: 'state-backed-form' },
  });
  const selectedSourceRecipePlan = await client.callTool({
    name: 'aurelia_authoring_recipe_plan',
    arguments: {
      recipeKey: 'routed-catalog-storefront',
      rootDir: '.',
      sourceFilePaths: ['src/state/catalog-state.ts', 'package.json'],
    },
  });
  const patternReferenceRecipePlan = await client.callTool({
    name: 'aurelia_authoring_recipe_plan',
    arguments: {
      recipeKey: 'routed-localized-validated-state-backed-form',
      usage: 'pattern-reference',
    },
  });
  const sourceParameterizedRecipePlan = await client.callTool({
    name: 'aurelia_authoring_recipe_plan',
    arguments: {
      recipeKey: 'routed-searchable-data-table',
      sourceParameterValues: [
        { key: 'detail-route-parameter', value: 'accountId' },
        { key: 'list-route-path', value: 'accounts' },
        { key: 'list-route-title', value: 'Accounts' },
        { key: 'table-entity', value: 'Customer Account' },
        { key: 'table-collection', value: 'accounts' },
        { key: 'table-filter-fields', value: 'customer name, due date, status select, total amount number, paid toggle' },
        { key: 'table-options', value: 'status: Open, Overdue, Paid' },
      ],
      sourceFilePaths: [
        'src/models/customer-account.ts',
        'src/state/customer-account-table-state.ts',
        'src/components/customer-account-table.html',
        'src/routes/customer-account-detail-route.html',
      ],
    },
  });
  const domainOnlyTableRecipePlan = await client.callTool({
    name: 'aurelia_authoring_recipe_plan',
    arguments: {
      recipeKey: 'searchable-data-table',
      sourceParameterValues: [
        { key: 'table-entity', value: 'Customer Account' },
        { key: 'table-collection', value: 'customerAccounts' },
      ],
      sourceTextRequestHintKeys: ['state-domain-service', 'templates'],
    },
  });
  const hintSelectedTableRecipePlan = await client.callTool({
    name: 'aurelia_authoring_recipe_plan',
    arguments: {
      recipeKey: 'routed-searchable-data-table',
      sourceParameterValues: [
        { key: 'detail-route-parameter', value: 'invoiceId' },
        { key: 'list-route-path', value: 'invoices' },
        { key: 'list-route-title', value: 'Invoices' },
        { key: 'table-entity', value: 'Invoice' },
        { key: 'table-collection', value: 'invoices' },
        { key: 'table-filter-fields', value: 'name, due date, paid toggle, total amount number' },
      ],
      sourceTextRequestHintKeys: ['state-domain-service'],
    },
  });
  const catalogParameterizedRecipePlan = await client.callTool({
    name: 'aurelia_authoring_recipe_plan',
    arguments: {
      recipeKey: 'catalog-storefront',
      sourceParameterValues: [
        { key: 'catalog-entity', value: 'Item' },
        { key: 'catalog-collection', value: 'items' },
        { key: 'catalog-fields', value: 'title, description, tier select, monthly price number, available toggle' },
        { key: 'catalog-options', value: 'tier: Basic, Pro, Enterprise' },
      ],
      sourceFilePaths: [
        'src/models/item.ts',
        'src/services/item-catalog-service.ts',
        'src/state/catalog-state.ts',
        'src/components/item-list.html',
      ],
    },
  });
  const domainOnlyCatalogRecipePlan = await client.callTool({
    name: 'aurelia_authoring_recipe_plan',
    arguments: {
      recipeKey: 'catalog-storefront',
      sourceParameterValues: [
        { key: 'catalog-entity', value: 'Product Tier' },
        { key: 'catalog-collection', value: 'productTiers' },
      ],
      sourceTextRequestHintKeys: ['state-domain-service', 'templates'],
    },
  });
  const routedCatalogParameterizedRecipePlan = await client.callTool({
    name: 'aurelia_authoring_recipe_plan',
    arguments: {
      recipeKey: 'routed-catalog-storefront',
      sourceParameterValues: [
        { key: 'catalog-entity', value: 'ProductTier' },
        { key: 'catalog-collection', value: 'productTiers' },
        { key: 'catalog-fields', value: 'name, description, price number, category select, available toggle' },
      ],
      sourceFilePaths: [
        'src/app.ts',
        'src/app.html',
        'src/services/product-tier-catalog-service.ts',
        'src/routes/product-tier-detail-route.html',
      ],
    },
  });
  const requestFormParameterizedRecipePlan = await client.callTool({
    name: 'aurelia_authoring_recipe_plan',
    arguments: {
      recipeKey: 'state-backed-form',
      sourceParameterValues: [
        { key: 'request-entity', value: 'API Credential' },
        { key: 'request-selection-id', value: 'apiCredentialId' },
        { key: 'request-fields', value: 'notification toggles, preferred language select, seat count number, API key field' },
        { key: 'request-options', value: 'preferred language: English, Dutch' },
      ],
      sourceFilePaths: [
        'src/state/app-state.ts',
        'src/components/state-backed-form.ts',
        'src/components/state-backed-form.html',
      ],
    },
  });
  const draftRequestFormRecipePlan = await client.callTool({
    name: 'aurelia_authoring_recipe_plan',
    arguments: {
      recipeKey: 'state-backed-form',
      sourceParameterValues: [
        { key: 'request-entity', value: 'Contact' },
        { key: 'request-fields', value: 'email, message' },
      ],
      sourceTextRequestHintKeys: ['implementation-source'],
    },
  });
  const contactPhoneRequestFormRecipePlan = await client.callTool({
    name: 'aurelia_authoring_recipe_plan',
    arguments: {
      recipeKey: 'state-backed-form',
      sourceParameterValues: [
        { key: 'request-entity', value: 'Contact' },
        { key: 'request-fields', value: 'full name, email, phone number, message' },
      ],
      sourceTextRequestHintKeys: ['state-domain-service', 'templates'],
    },
  });
  const draftServiceBackedFormRecipePlan = await client.callTool({
    name: 'aurelia_authoring_recipe_plan',
    arguments: {
      recipeKey: 'service-backed-form',
      sourceParameterValues: [
        { key: 'request-entity', value: 'Signup' },
        { key: 'request-fields', value: 'email, password, terms toggle' },
      ],
      sourceTextRequestHintKeys: ['implementation-source'],
    },
  });
  const settingsDraftFormRecipePlan = await client.callTool({
    name: 'aurelia_authoring_recipe_plan',
    arguments: {
      recipeKey: 'state-backed-form',
      sourceParameterValues: [
        { key: 'request-entity', value: 'Settings' },
        { key: 'request-fields', value: 'api key, notification toggle' },
      ],
      sourceTextRequestHintKeys: ['implementation-source'],
    },
  });
  const domainOnlyRequestFormRecipePlan = await client.callTool({
    name: 'aurelia_authoring_recipe_plan',
    arguments: {
      recipeKey: 'state-backed-form',
      sourceParameterValues: [
        { key: 'request-entity', value: 'Order' },
        { key: 'request-selection-id', value: 'orderId' },
      ],
      sourceTextRequestHintKeys: ['state-domain-service', 'templates'],
    },
  });
  const routedDomainOnlyRequestFormRecipePlan = await client.callTool({
    name: 'aurelia_authoring_recipe_plan',
    arguments: {
      recipeKey: 'routed-state-backed-form',
      sourceParameterValues: [
        { key: 'request-entity', value: 'Order' },
        { key: 'request-selection-id', value: 'orderId' },
      ],
      sourceTextRequestHintKeys: ['implementation-source'],
    },
  });
  const checkedCollectionFormRecipePlan = await client.callTool({
    name: 'aurelia_authoring_recipe_plan',
    arguments: {
      recipeKey: 'state-backed-form',
      sourceParameterValues: [
        { key: 'request-entity', value: 'AccessProfile' },
        { key: 'request-selection-id', value: 'accessProfileId' },
        { key: 'request-fields', value: 'roles checkboxes, permission checkboxes, enabled toggle' },
        { key: 'request-options', value: 'roles: owner, maintainer, viewer; permissions: read, write, administer' },
      ],
      sourceTextRequestHintKeys: ['state-domain-service', 'templates'],
    },
  });
  const multiStepWizardParameterizedRecipePlan = await client.callTool({
    name: 'aurelia_authoring_recipe_plan',
    arguments: {
      recipeKey: 'multi-step-state-backed-form',
      sourceParameterValues: [
        { key: 'wizard-entity', value: 'Checkout' },
        { key: 'wizard-steps', value: 'cart, shipping, payment, confirmation' },
        { key: 'wizard-section-fields', value: 'shipping: shipping address; payment: payment method select' },
        { key: 'wizard-options', value: 'payment method: card, invoice, paypal' },
      ],
      sourceTextRequestHintKeys: ['implementation-source'],
    },
  });
  const stateStoreParameterizedRecipePlan = await client.callTool({
    name: 'aurelia_authoring_recipe_plan',
    arguments: {
      recipeKey: 'state-store-list',
      sourceParameterValues: [
        { key: 'store-item', value: 'Project Task' },
        { key: 'store-collection', value: 'projectTasks' },
      ],
      sourceTextRequestHintKeys: ['implementation-source'],
    },
  });
  const routedTeamMemberEditorRecipePlan = await client.callTool({
    name: 'aurelia_authoring_recipe_plan',
    arguments: {
      recipeKey: 'routed-state-backed-form',
      sourceParameterValues: [
        { key: 'request-route-parameter', value: 'teamMemberId' },
        { key: 'request-route-title', value: 'Team Member' },
        { key: 'request-entity', value: 'Team Member' },
        { key: 'request-selection-id', value: 'teamMemberId' },
        { key: 'request-fields', value: 'role select, active toggle, start date, weekly hours number' },
      ],
      sourceTextRequestHintKeys: ['state-domain-service', 'templates'],
    },
  });
  const sectionedRoutedAppShellRecipePlan = await client.callTool({
    name: 'aurelia_authoring_recipe_plan',
    arguments: {
      recipeKey: 'routed-app-shell',
      sourceParameterValues: [
        { key: 'section-routes', value: 'Dashboard, Settings' },
      ],
      sourceTextRequestHintKeys: ['implementation-source'],
    },
  });
  const recipePlanResourceLinks = recipePlan.content.filter((block) => block.type === 'resource_link').length;
  const recipePlanValue = recipePlan.structuredContent?.value?.value;
  const recipePlanDisplayText = recipePlanValue?.displayText;
  const recipePlanTextRequestHints = recipePlanValue?.sourcePlan?.textRequestHints ?? [];
  const selectedSourceRecipePlanDisplayText = selectedSourceRecipePlan.structuredContent?.value?.value?.displayText;
  const patternReferenceRecipePlanValue = patternReferenceRecipePlan.structuredContent?.value?.value;
  const patternReferenceRecipePlanDisplayText = patternReferenceRecipePlanValue?.displayText;
  const sourceParameterizedRecipePlanValue = sourceParameterizedRecipePlan.structuredContent?.value?.value;
  const sourceParameterizedRecipePlanDisplayText = sourceParameterizedRecipePlanValue?.displayText;
  const sourceParameterizedApplications = sourceParameterizedRecipePlanValue?.sourcePlan?.sourceParameterApplications ?? [];
  const sourceParameterizedSourceText = (sourceParameterizedRecipePlanValue?.sourcePlan?.files ?? [])
    .map((file) => file.text)
    .filter((text) => typeof text === 'string')
    .join('\n');
  const domainOnlyTableRecipePlanValue = domainOnlyTableRecipePlan.structuredContent?.value?.value;
  const domainOnlyTableRecipePlanDisplayText = domainOnlyTableRecipePlanValue?.displayText;
  const domainOnlyTableSourceText = (domainOnlyTableRecipePlanValue?.sourcePlan?.files ?? [])
    .map((file) => file.text)
    .filter((text) => typeof text === 'string')
    .join('\n');
  const hintSelectedTableRecipePlanValue = hintSelectedTableRecipePlan.structuredContent?.value?.value;
  const hintSelectedTableRecipePlanDisplayText = hintSelectedTableRecipePlanValue?.displayText;
  const hintSelectedTableTextSelection = hintSelectedTableRecipePlanValue?.sourcePlan?.textSelection;
  const hintSelectedTableSourceText = (hintSelectedTableRecipePlanValue?.sourcePlan?.files ?? [])
    .map((file) => file.text)
    .filter((text) => typeof text === 'string')
    .join('\n');
  const catalogParameterizedRecipePlanValue = catalogParameterizedRecipePlan.structuredContent?.value?.value;
  const catalogParameterizedRecipePlanDisplayText = catalogParameterizedRecipePlanValue?.displayText;
  const catalogParameterizedApplications = catalogParameterizedRecipePlanValue?.sourcePlan?.sourceParameterApplications ?? [];
  const catalogParameterizedSourceText = (catalogParameterizedRecipePlanValue?.sourcePlan?.files ?? [])
    .map((file) => file.text)
    .filter((text) => typeof text === 'string')
    .join('\n');
  const domainOnlyCatalogRecipePlanValue = domainOnlyCatalogRecipePlan.structuredContent?.value?.value;
  const domainOnlyCatalogRecipePlanDisplayText = domainOnlyCatalogRecipePlanValue?.displayText;
  const domainOnlyCatalogSourceFiles = domainOnlyCatalogRecipePlanValue?.sourcePlan?.files ?? [];
  const domainOnlyCatalogSourcePaths = domainOnlyCatalogSourceFiles.map((file) => file.path);
  const domainOnlyCatalogSourceText = (domainOnlyCatalogRecipePlanValue?.sourcePlan?.files ?? [])
    .map((file) => file.text)
    .filter((text) => typeof text === 'string')
    .join('\n');
  const routedCatalogParameterizedRecipePlanValue = routedCatalogParameterizedRecipePlan.structuredContent?.value?.value;
  const routedCatalogParameterizedRecipePlanDisplayText = routedCatalogParameterizedRecipePlanValue?.displayText;
  const routedCatalogParameterizedSourceText = (routedCatalogParameterizedRecipePlanValue?.sourcePlan?.files ?? [])
    .map((file) => file.text)
    .filter((text) => typeof text === 'string')
    .join('\n');
  const requestFormParameterizedRecipePlanValue = requestFormParameterizedRecipePlan.structuredContent?.value?.value;
  const requestFormParameterizedRecipePlanDisplayText = requestFormParameterizedRecipePlanValue?.displayText;
  const requestFormParameterizedApplications = requestFormParameterizedRecipePlanValue?.sourcePlan?.sourceParameterApplications ?? [];
  const requestFormParameterizedSourceText = (requestFormParameterizedRecipePlanValue?.sourcePlan?.files ?? [])
    .map((file) => file.text)
    .filter((text) => typeof text === 'string')
    .join('\n');
  const draftRequestFormRecipePlanValue = draftRequestFormRecipePlan.structuredContent?.value?.value;
  const draftRequestFormRecipePlanDisplayText = draftRequestFormRecipePlanValue?.displayText;
  const draftRequestFormApplications = draftRequestFormRecipePlanValue?.sourcePlan?.sourceParameterApplications ?? [];
  const draftRequestFormSourceText = (draftRequestFormRecipePlanValue?.sourcePlan?.files ?? [])
    .map((file) => file.text)
    .filter((text) => typeof text === 'string')
    .join('\n');
  const contactPhoneRequestFormRecipePlanValue = contactPhoneRequestFormRecipePlan.structuredContent?.value?.value;
  const contactPhoneRequestFormRecipePlanDisplayText = contactPhoneRequestFormRecipePlanValue?.displayText;
  const contactPhoneRequestFormApplications = contactPhoneRequestFormRecipePlanValue?.sourcePlan?.sourceParameterApplications ?? [];
  const contactPhoneRequestFormSourceText = (contactPhoneRequestFormRecipePlanValue?.sourcePlan?.files ?? [])
    .map((file) => file.text)
    .filter((text) => typeof text === 'string')
    .join('\n');
  const draftServiceBackedFormRecipePlanValue = draftServiceBackedFormRecipePlan.structuredContent?.value?.value;
  const draftServiceBackedFormRecipePlanDisplayText = draftServiceBackedFormRecipePlanValue?.displayText;
  const draftServiceBackedFormApplications = draftServiceBackedFormRecipePlanValue?.sourcePlan?.sourceParameterApplications ?? [];
  const draftServiceBackedFormSourceText = (draftServiceBackedFormRecipePlanValue?.sourcePlan?.files ?? [])
    .map((file) => file.text)
    .filter((text) => typeof text === 'string')
    .join('\n');
  const settingsDraftFormRecipePlanValue = settingsDraftFormRecipePlan.structuredContent?.value?.value;
  const settingsDraftFormRecipePlanDisplayText = settingsDraftFormRecipePlanValue?.displayText;
  const settingsDraftFormApplications = settingsDraftFormRecipePlanValue?.sourcePlan?.sourceParameterApplications ?? [];
  const settingsDraftFormSourceText = (settingsDraftFormRecipePlanValue?.sourcePlan?.files ?? [])
    .map((file) => file.text)
    .filter((text) => typeof text === 'string')
    .join('\n');
  const domainOnlyRequestFormRecipePlanValue = domainOnlyRequestFormRecipePlan.structuredContent?.value?.value;
  const domainOnlyRequestFormRecipePlanDisplayText = domainOnlyRequestFormRecipePlanValue?.displayText;
  const domainOnlyRequestFormSourceText = (domainOnlyRequestFormRecipePlanValue?.sourcePlan?.files ?? [])
    .map((file) => file.text)
    .filter((text) => typeof text === 'string')
    .join('\n');
  const routedDomainOnlyRequestFormRecipePlanValue = routedDomainOnlyRequestFormRecipePlan.structuredContent?.value?.value;
  const routedDomainOnlyRequestFormRecipePlanDisplayText = routedDomainOnlyRequestFormRecipePlanValue?.displayText;
  const routedDomainOnlyRequestFormSourceText = (routedDomainOnlyRequestFormRecipePlanValue?.sourcePlan?.files ?? [])
    .map((file) => file.text)
    .filter((text) => typeof text === 'string')
    .join('\n');
  const checkedCollectionFormRecipePlanValue = checkedCollectionFormRecipePlan.structuredContent?.value?.value;
  const checkedCollectionFormApplications = checkedCollectionFormRecipePlanValue?.sourcePlan?.sourceParameterApplications ?? [];
  const checkedCollectionFormSourceText = (checkedCollectionFormRecipePlanValue?.sourcePlan?.files ?? [])
    .map((file) => file.text)
    .filter((text) => typeof text === 'string')
    .join('\n');
  const multiStepWizardParameterizedRecipePlanValue = multiStepWizardParameterizedRecipePlan.structuredContent?.value?.value;
  const multiStepWizardParameterizedApplications = multiStepWizardParameterizedRecipePlanValue?.sourcePlan?.sourceParameterApplications ?? [];
  const multiStepWizardParameterizedSourceText = (multiStepWizardParameterizedRecipePlanValue?.sourcePlan?.files ?? [])
    .map((file) => file.text)
    .filter((text) => typeof text === 'string')
    .join('\n');
  const stateStoreParameterizedRecipePlanValue = stateStoreParameterizedRecipePlan.structuredContent?.value?.value;
  const stateStoreParameterizedApplications = stateStoreParameterizedRecipePlanValue?.sourcePlan?.sourceParameterApplications ?? [];
  const stateStoreParameterizedSourceText = (stateStoreParameterizedRecipePlanValue?.sourcePlan?.files ?? [])
    .map((file) => file.text)
    .filter((text) => typeof text === 'string')
    .join('\n');
  const routedTeamMemberEditorRecipePlanValue = routedTeamMemberEditorRecipePlan.structuredContent?.value?.value;
  const routedTeamMemberEditorRecipePlanDisplayText = routedTeamMemberEditorRecipePlanValue?.displayText;
  const routedTeamMemberEditorApplications = routedTeamMemberEditorRecipePlanValue?.sourcePlan?.sourceParameterApplications ?? [];
  const routedTeamMemberEditorSourceText = (routedTeamMemberEditorRecipePlanValue?.sourcePlan?.files ?? [])
    .map((file) => file.text)
    .filter((text) => typeof text === 'string')
    .join('\n');
  const sectionedRoutedAppShellRecipePlanValue = sectionedRoutedAppShellRecipePlan.structuredContent?.value?.value;
  const sectionedRoutedAppShellApplications = sectionedRoutedAppShellRecipePlanValue?.sourcePlan?.sourceParameterApplications ?? [];
  const sectionedRoutedAppShellSourceText = (sectionedRoutedAppShellRecipePlanValue?.sourcePlan?.files ?? [])
    .map((file) => file.text)
    .filter((text) => typeof text === 'string')
    .join('\n');
  const selectedSourceRecipeSourcePlan = selectedSourceRecipePlan.structuredContent?.value?.value?.sourcePlan;
  const selectedSourceRecipeTextSelection = selectedSourceRecipeSourcePlan?.textSelection;
  const selectedSourceRecipeTextPaths = [
    ...(selectedSourceRecipeSourcePlan?.files ?? []),
    ...(selectedSourceRecipeSourcePlan?.projectTooling?.files ?? []),
  ]
    .filter((file) => typeof file.text === 'string')
    .map((file) => file.path)
    .sort();
  const resources = await client.listResources();
  const appBuildingGuidanceResource = await client.readResource({ uri: 'aurelia://authoring/guidance' });
  const recipeResource = await client.readResource({ uri: 'aurelia://authoring/recipes' });
  const appQueryResource = await client.readResource({ uri: 'aurelia://semantic-runtime/app-queries' });
  const appBuildingGuidanceResourceText = appBuildingGuidanceResource.contents[0]?.text;
  const appBuildingGuidanceResourceValue = typeof appBuildingGuidanceResourceText === 'string'
    ? JSON.parse(appBuildingGuidanceResourceText)
    : null;
  const recipeResourceText = recipeResource.contents[0]?.text;
  const recipeResourceValue = typeof recipeResourceText === 'string'
    ? JSON.parse(recipeResourceText)
    : null;
  const recipeResourceRowsAreTerse =
    (recipeResourceValue?.value?.recipes ?? []).every((row) =>
      row.expectedEffects == null
      && row.preferences == null
      && row.preferenceCount >= 0
      && Array.isArray(row.tasteValueKeys)
    );
  const appQueryResourceText = appQueryResource.contents[0]?.text;
  const appQueryResourceValue = typeof appQueryResourceText === 'string'
    ? JSON.parse(appQueryResourceText)
    : null;
  const prompts = await client.listPrompts();
  const orientPrompt = await client.getPrompt({
    name: 'aurelia_orient_workspace',
    arguments: { workspaceRoot: '.' },
  });
  const buildFeaturePrompt = await client.getPrompt({
    name: 'aurelia_build_app_feature',
    arguments: {
      featureGoal: 'Add a routed catalog detail view',
      focus: 'routing',
      includeRouter: 'true',
    },
  });

  console.log('au-mcp stdio probe');
  console.log(`- tools: ${tools.tools.length}`);
  console.log(`- output schemas: ${outputSchemaCount}`);
  console.log(`- read-only tool annotations: ${readOnlyToolCount}`);
  console.log(`- cache tool idempotent: ${cacheTool?.annotations?.idempotentHint === true ? 'yes' : 'no'}`);
  console.log(`- catalog: ${catalog.structuredContent?.value?.summary ?? 'missing structured summary'}`);
  console.log(`- app-building guidance: ${appBuildingGuidance.structuredContent?.value?.summary ?? 'missing structured summary'}`);
  console.log(`- feature-goal guidance: ${featureGoalGuidance.structuredContent?.value?.summary ?? 'missing structured summary'}`);
  console.log(`- routed searchable guidance: ${routedSearchableGuidance.structuredContent?.value?.summary ?? 'missing structured summary'}`);
  console.log(`- customer catalog guidance: ${customerCatalogGuidance.structuredContent?.value?.summary ?? 'missing structured summary'}`);
  console.log(`- routed dashboard guidance: ${routedDashboardGuidance.structuredContent?.value?.summary ?? 'missing structured summary'}`);
  console.log(`- bare routed dashboard guidance: ${bareRoutedDashboardGuidance.structuredContent?.value?.summary ?? 'missing structured summary'}`);
  console.log(`- route plural shell guidance: ${routePluralShellGuidance.structuredContent?.value?.summary ?? 'missing structured summary'}`);
  console.log(`- shell sections guidance: ${shellSectionsGuidance.structuredContent?.value?.summary ?? 'missing structured summary'}`);
  console.log(`- preferences guidance: ${featureGoalPreferencesGuidance.structuredContent?.value?.summary ?? 'missing structured summary'}`);
  console.log(`- api-backed wizard guidance: ${featureGoalApiBackedWizardGuidance.structuredContent?.value?.summary ?? 'missing structured summary'}`);
  console.log(`- checkout guidance: ${featureGoalCheckoutGuidance.structuredContent?.value?.summary ?? 'missing structured summary'}`);
  console.log(`- routed catalog checkout guidance: ${featureGoalRoutedCatalogCheckoutGuidance.structuredContent?.value?.summary ?? 'missing structured summary'}`);
  console.log(`- contact submit guidance: ${featureGoalContactSubmitGuidance.structuredContent?.value?.summary ?? 'missing structured summary'}`);
  console.log(`- contact message guidance: ${featureGoalContactMessageGuidance.structuredContent?.value?.summary ?? 'missing structured summary'}`);
  console.log(`- api signup guidance: ${featureGoalApiSignupGuidance.structuredContent?.value?.summary ?? 'missing structured summary'}`);
  console.log(`- customer intake guidance: ${featureGoalCustomerIntakeGuidance.structuredContent?.value?.summary ?? 'missing structured summary'}`);
  console.log(`- customer service form guidance: ${featureGoalCustomerServiceGuidance.structuredContent?.value?.summary ?? 'missing structured summary'}`);
  console.log(`- api service form guidance: ${featureGoalApiServiceGuidance.structuredContent?.value?.summary ?? 'missing structured summary'}`);
  console.log(`- document autosave guidance: ${featureGoalDocumentAutosaveGuidance.structuredContent?.value?.summary ?? 'missing structured summary'}`);
  console.log(`- inventory edit guidance: ${featureGoalInventoryEditGuidance.structuredContent?.value?.summary ?? 'missing structured summary'}`);
  console.log(`- product admin table guidance: ${featureGoalProductAdminTableGuidance.structuredContent?.value?.summary ?? 'missing structured summary'}`);
  console.log(`- support inbox guidance: ${featureGoalSupportInboxGuidance.structuredContent?.value?.summary ?? 'missing structured summary'}`);
  console.log(`- support workspace guidance: ${featureGoalSupportWorkspaceGuidance.structuredContent?.value?.summary ?? 'missing structured summary'}`);
  console.log(`- support ticket route guidance: ${featureGoalSupportTicketRouteGuidance.structuredContent?.value?.summary ?? 'missing structured summary'}`);
  console.log(`- order management guidance: ${featureGoalOrderManagementGuidance.structuredContent?.value?.summary ?? 'missing structured summary'}`);
  console.log(`- api keys settings guidance: ${featureGoalApiKeysSettingsGuidance.structuredContent?.value?.summary ?? 'missing structured summary'}`);
  console.log(`- settings tabs fields guidance: ${featureGoalSettingsTabsFieldsGuidance.structuredContent?.value?.summary ?? 'missing structured summary'}`);
  console.log(`- settings tabs plus profile form guidance: ${featureGoalSettingsTabsProfileFormGuidance.structuredContent?.value?.summary ?? 'missing structured summary'}`);
  console.log(`- validated settings fields guidance: ${featureGoalValidatedSettingsFieldsGuidance.structuredContent?.value?.summary ?? 'missing structured summary'}`);
  console.log(`- customer operations settings guidance: ${featureGoalCustomerOperationsSettingsGuidance.structuredContent?.value?.summary ?? 'missing structured summary'}`);
  console.log(`- customer support portal guidance: ${featureGoalCustomerSupportPortalGuidance.structuredContent?.value?.summary ?? 'missing structured summary'}`);
  console.log(`- optional state plugin guidance: ${featureGoalOptionalStatePluginGuidance.structuredContent?.value?.summary ?? 'missing structured summary'}`);
  console.log(`- catalog checkout settings guidance: ${featureGoalCatalogCheckoutSettingsGuidance.structuredContent?.value?.summary ?? 'missing structured summary'}`);
  console.log(`- account settings option guidance: ${featureGoalAccountSettingsOptionsGuidance.structuredContent?.value?.summary ?? 'missing structured summary'}`);
  console.log(`- team member editor guidance: ${featureGoalTeamMemberEditorGuidance.structuredContent?.value?.summary ?? 'missing structured summary'}`);
  console.log(`- team member option editor guidance: ${featureGoalTeamMemberOptionsGuidance.structuredContent?.value?.summary ?? 'missing structured summary'}`);
  console.log(`- tenant admin api-save guidance: ${featureGoalTenantAdminApiSaveGuidance.structuredContent?.value?.summary ?? 'missing structured summary'}`);
  console.log(`- organization admin guidance: ${featureGoalOrganizationAdminGuidance.structuredContent?.value?.summary ?? 'missing structured summary'}`);
  console.log(`- project board guidance: ${featureGoalProjectBoardGuidance.structuredContent?.value?.summary ?? 'missing structured summary'}`);
  console.log(`- project management workspace guidance: ${featureGoalProjectManagementWorkspaceGuidance.structuredContent?.value?.summary ?? 'missing structured summary'}`);
  console.log(`- issue tracker api-save guidance: ${featureGoalIssueTrackerApiSaveGuidance.structuredContent?.value?.summary ?? 'missing structured summary'}`);
  console.log(`- repository browser search guidance: ${featureGoalRepositoryBrowserSearchGuidance.structuredContent?.value?.summary ?? 'missing structured summary'}`);
  console.log(`- repository owner filter guidance: ${featureGoalRepositoryOwnerFiltersGuidance.structuredContent?.value?.summary ?? 'missing structured summary'}`);
  console.log(`- product catalog compare guidance: ${featureGoalProductCatalogCompareGuidance.structuredContent?.value?.summary ?? 'missing structured summary'}`);
  console.log(`- state plugin todo guidance: ${featureGoalStatePluginTodoGuidance.structuredContent?.value?.summary ?? 'missing structured summary'}`);
  console.log(`- state plugin project task guidance: ${featureGoalStatePluginProjectTaskGuidance.structuredContent?.value?.summary ?? 'missing structured summary'}`);
  console.log(`- plain todo guidance: ${featureGoalPlainTodoGuidance.structuredContent?.value?.summary ?? 'missing structured summary'}`);
  console.log(`- customer account list guidance: ${featureGoalCustomerAccountListGuidance.structuredContent?.value?.summary ?? 'missing structured summary'}`);
  console.log(`- profile editor guidance: ${featureGoalProfileEditorGuidance.structuredContent?.value?.summary ?? 'missing structured summary'}`);
  console.log(`- account editor guidance: ${featureGoalAccountEditorGuidance.structuredContent?.value?.summary ?? 'missing structured summary'}`);
  console.log(`- profile form guidance: ${featureGoalProfileFormGuidance.structuredContent?.value?.summary ?? 'missing structured summary'}`);
  console.log(`- routed order edit guidance: ${featureGoalRoutedOrderEditGuidance.structuredContent?.value?.summary ?? 'missing structured summary'}`);
  console.log(`- routed settings guidance: ${featureGoalRoutedSettingsGuidance.structuredContent?.value?.summary ?? 'missing structured summary'}`);
  console.log(`- route-only settings guidance: ${featureGoalRouteOnlySettingsGuidance.structuredContent?.value?.summary ?? 'missing structured summary'}`);
  console.log(`- admin search edit guidance: ${featureGoalAdminSearchEditGuidance.structuredContent?.value?.summary ?? 'missing structured summary'}`);
  console.log(`- admin project task search guidance: ${featureGoalAdminProjectTaskSearchGuidance.structuredContent?.value?.summary ?? 'missing structured summary'}`);
  console.log(`- admin project task settings guidance: ${featureGoalAdminProjectTaskSettingsGuidance.structuredContent?.value?.summary ?? 'missing structured summary'}`);
  console.log(`- admin project task API settings guidance: ${featureGoalAdminProjectTaskApiSettingsGuidance.structuredContent?.value?.summary ?? 'missing structured summary'}`);
  console.log(`- authenticated admin guidance: ${featureGoalAuthenticatedAdminGuidance.structuredContent?.value?.summary ?? 'missing structured summary'}`);
  console.log(`- CRUD admin forms guidance: ${featureGoalCrudFormsGuidance.structuredContent?.value?.summary ?? 'missing structured summary'}`);
  console.log(`- layout grid guidance: ${featureGoalLayoutGridGuidance.structuredContent?.value?.summary ?? 'missing structured summary'}`);
  console.log(`- pricing product tiers guidance: ${featureGoalPricingProductTiersGuidance.structuredContent?.value?.summary ?? 'missing structured summary'}`);
  console.log(`- repository browser guidance: ${featureGoalRepositoryBrowserGuidance.structuredContent?.value?.summary ?? 'missing structured summary'}`);
  console.log(`- state-backed form guidance: ${stateBackedFormGuidance.structuredContent?.value?.summary ?? 'missing structured summary'}`);
  console.log(`- routing guidance: ${routingGuidance.structuredContent?.value?.summary ?? 'missing structured summary'}`);
  console.log(`- routed catalog guidance: ${routedCatalogGuidance.structuredContent?.value?.summary ?? 'missing structured summary'}`);
  console.log(`- state store guidance: ${stateStoreGuidance.structuredContent?.value?.summary ?? 'missing structured summary'}`);
  console.log(`- routed service validated guidance: ${routedServiceValidatedGuidance.structuredContent?.value?.summary ?? 'missing structured summary'}`);
  console.log(`- plugin guidance: ${pluginGuidance.structuredContent?.value?.summary ?? 'missing structured summary'}`);
  console.log(`- app query catalog: ${appQueryCatalog.structuredContent?.value?.summary ?? 'missing structured summary'}`);
  console.log(`- workspace overview: ${workspaceOverview.structuredContent?.value?.summary ?? 'missing structured summary'}`);
  console.log(`- workspace project rows: ${workspaceOverviewWithProjectRows.structuredContent?.value?.page?.returnedRows ?? 'missing row count'}`);
  console.log(`- routed data-table app overview: ${routedDataTableAppOverview.structuredContent?.value?.summary ?? 'missing structured summary'}`);
  console.log(`- routed data-table router overview: ${routedDataTableRouterOverview.structuredContent?.value?.summary ?? 'missing structured summary'}`);
  console.log(`- template completions: ${templateCompletions.structuredContent?.value?.summary ?? 'missing structured summary'}`);
  console.log(`- template cursor info: ${templateCursorInfo.structuredContent?.value?.summary ?? 'missing structured summary'}`);
  console.log(`- template diagnostics: ${templateDiagnostics.structuredContent?.value?.summary ?? 'missing structured summary'}`);
  console.log(`- authoring orientation: ${authoringOrientation.structuredContent?.value?.summary ?? 'missing structured summary'}`);
  console.log(`- data-table orientation: ${dataTableOrientation.structuredContent?.value?.summary ?? 'missing structured summary'}`);
  console.log(`- forwarding-accessor orientation: ${forwardingAccessorOrientation.structuredContent?.value?.summary ?? 'missing structured summary'}`);
  console.log(`- data-table value-channel summary: ${dataTableValueChannelSummary.structuredContent?.value?.summary ?? 'missing structured summary'}`);
  console.log(`- data-table data-flow summary: ${dataTableDataFlowSummary.structuredContent?.value?.summary ?? 'missing structured summary'}`);
  console.log(`- data-table observed-dependency summary: ${dataTableObservedDependencySummary.structuredContent?.value?.summary ?? 'missing structured summary'}`);
  console.log(`- issue-only data-flow summary: ${dataFlowIssueSummary.structuredContent?.value?.summary ?? 'missing structured summary'}`);
  console.log(`- data-flow diagnostic overview: ${dataFlowDiagnosticOverview.structuredContent?.value?.summary ?? 'missing structured summary'}`);
  console.log(`- data-flow app diagnostics: ${dataFlowAppDiagnostics.structuredContent?.value?.summary ?? 'missing structured summary'}`);
  console.log(`- router open seam overview: ${routerOpenSeamOverview.structuredContent?.value?.summary ?? 'missing structured summary'}`);
  console.log(`- data-table summary batch: ${dataTableSummaryBatch.structuredContent?.value?.summary ?? 'missing structured summary'}`);
  console.log(`- cache overview: ${cacheOverview.structuredContent?.value?.summary ?? 'missing structured summary'}`);
  console.log(`- recipe plan resource links: ${recipePlanResourceLinks}`);
  console.log(`- pattern reference recipe usage: ${patternReferenceRecipePlanValue?.usage ?? 'missing usage'}`);
  console.log(`- source parameterized recipe applications: ${sourceParameterizedApplications.map((row) => `${row.key}:${row.applicationState}`).join(', ')}`);
  console.log(`- domain-only table recipe effects: ${domainOnlyTableRecipePlanValue?.recipe?.expectedEffectCount ?? 'missing effects'}`);
  console.log(`- hint-selected table source paths: ${hintSelectedTableTextSelection?.includedPaths?.join(', ') ?? 'missing selection'}`);
  console.log(`- catalog parameterized recipe applications: ${catalogParameterizedApplications.map((row) => `${row.key}:${row.applicationState}`).join(', ')}`);
  console.log(`- domain-only catalog recipe effects: ${domainOnlyCatalogRecipePlanValue?.recipe?.expectedEffectCount ?? 'missing effects'}`);
  console.log(`- routed catalog parameterized route defaults: ${routedCatalogParameterizedRecipePlanValue?.sourcePlan?.pattern?.parameters?.filter((row) => row.kind === 'route-identity' || row.key === 'catalog-collection').map((row) => `${row.key}=${row.defaultValue}`).join(', ')}`);
  console.log(`- request form parameterized recipe applications: ${requestFormParameterizedApplications.map((row) => `${row.key}:${row.applicationState}`).join(', ')}`);
  console.log(`- draft request form recipe applications: ${draftRequestFormApplications.map((row) => `${row.key}:${row.applicationState}`).join(', ')}`);
  console.log(`- contact phone request form recipe applications: ${contactPhoneRequestFormApplications.map((row) => `${row.key}:${row.applicationState}`).join(', ')}`);
  console.log(`- domain-only request form source length: ${domainOnlyRequestFormSourceText.length}`);
  console.log(`- routed domain-only request form source length: ${routedDomainOnlyRequestFormSourceText.length}`);
  console.log(`- checked collection form recipe applications: ${checkedCollectionFormApplications.map((row) => `${row.key}:${row.applicationState}`).join(', ')}`);
  console.log(`- multi-step wizard parameterized recipe applications: ${multiStepWizardParameterizedApplications.map((row) => `${row.key}:${row.applicationState}`).join(', ')}`);
  console.log(`- state store parameterized recipe applications: ${stateStoreParameterizedApplications.map((row) => `${row.key}:${row.applicationState}`).join(', ')}`);
  console.log(`- routed team member editor recipe applications: ${routedTeamMemberEditorApplications.map((row) => `${row.key}:${row.applicationState}`).join(', ')}`);
  console.log(`- sectioned routed app shell recipe applications: ${sectionedRoutedAppShellApplications.map((row) => `${row.key}:${row.applicationState}`).join(', ')}`);
  console.log(`- selected recipe source text paths: ${selectedSourceRecipeTextPaths.join(', ')}`);
  console.log(`- resources: ${resources.resources.length}`);
  console.log(`- app-building guidance resource contents: ${appBuildingGuidanceResource.contents.length}`);
  console.log(`- app-building guidance resource summary: ${appBuildingGuidanceResourceValue?.summary ?? 'missing summary'}`);
  console.log(`- recipe resource contents: ${recipeResource.contents.length}`);
  console.log(`- recipe resource summary: ${recipeResourceValue?.summary ?? 'missing summary'}`);
  console.log(`- app query resource summary: ${appQueryResourceValue?.summary ?? 'missing summary'}`);
  console.log(`- prompts: ${prompts.prompts.length}`);
  console.log(`- orient prompt messages: ${orientPrompt.messages.length}`);
  console.log(`- build feature prompt messages: ${buildFeaturePrompt.messages.length}`);

  const buildFeaturePromptText = buildFeaturePrompt.messages
    .map((message) => message.content?.type === 'text' ? message.content.text : '')
    .join('\n');
  const orientPromptText = orientPrompt.messages
    .map((message) => message.content?.type === 'text' ? message.content.text : '')
    .join('\n');
  const catalogValue = catalog.structuredContent?.value?.value;
  const catalogDisplayText = catalogValue?.displayText;
  const catalogOverviewRowsAreTerse =
    (catalogValue?.recipes ?? []).every((row) =>
      row.operationKindCount >= 0
      && row.operationKinds == null
      && row.baseRecipeCount >= 0
      && row.baseRecipeKeys == null
      && row.lineageRecipeCount >= 0
      && row.lineageRecipeKeys == null
      && row.preferenceCount >= 0
      && row.tasteValueKeys == null
      && row.expectedEffectCount >= 0
      && row.expectedEffectKinds == null
      && row.sourceFileCount >= 0
      && row.projectToolingFileCount >= 0
      && row.sourcePlan == null
    );
  const appBuildingGuidanceValue = appBuildingGuidance.structuredContent?.value?.value;
  const appBuildingGuidanceDisplayText = appBuildingGuidanceValue?.displayText;
  const featureGoalGuidanceValue = featureGoalGuidance.structuredContent?.value?.value;
  const featureGoalGuidanceDisplayText = featureGoalGuidanceValue?.displayText;
  const routedSearchableGuidanceValue = routedSearchableGuidance.structuredContent?.value?.value;
  const routedSearchableGuidanceDisplayText = routedSearchableGuidanceValue?.displayText;
  const productListGuidanceValue = productListGuidance.structuredContent?.value?.value;
  const productListGuidanceDisplayText = productListGuidanceValue?.displayText;
  const customerCatalogGuidanceValue = customerCatalogGuidance.structuredContent?.value?.value;
  const customerCatalogGuidanceDisplayText = customerCatalogGuidanceValue?.displayText;
  const customerCatalogSignalKeys = customerCatalogGuidanceValue?.featureGoalSignals?.map((row) => row.key) ?? [];
  const routedDashboardGuidanceValue = routedDashboardGuidance.structuredContent?.value?.value;
  const routedDashboardGuidanceDisplayText = routedDashboardGuidanceValue?.displayText;
  const bareRoutedDashboardGuidanceValue = bareRoutedDashboardGuidance.structuredContent?.value?.value;
  const bareRoutedDashboardGuidanceDisplayText = bareRoutedDashboardGuidanceValue?.displayText;
  const routePluralShellGuidanceValue = routePluralShellGuidance.structuredContent?.value?.value;
  const routePluralShellGuidanceDisplayText = routePluralShellGuidanceValue?.displayText;
  const shellSectionsGuidanceValue = shellSectionsGuidance.structuredContent?.value?.value;
  const shellSectionsGuidanceDisplayText = shellSectionsGuidanceValue?.displayText;
  const featureGoalTokenSignalKeys = featureGoalTokenGuidance.structuredContent?.value?.value?.featureGoalSignals?.map((row) => row.key) ?? [];
  const featureGoalChatMessagesSignalKeys = featureGoalChatMessagesGuidance.structuredContent?.value?.value?.featureGoalSignals?.map((row) => row.key) ?? [];
  const featureGoalFieldLabelsDisplayText = featureGoalFieldLabelsGuidance.structuredContent?.value?.value?.displayText;
  const featureGoalFieldLabelsSignalKeys = featureGoalFieldLabelsGuidance.structuredContent?.value?.value?.featureGoalSignals?.map((row) => row.key) ?? [];
  const featureGoalValidatedFormValue = featureGoalValidatedFormGuidance.structuredContent?.value?.value;
  const featureGoalValidatedFormDisplayText = featureGoalValidatedFormValue?.displayText;
  const featureGoalRoutedValidatedFormValue = featureGoalRoutedValidatedFormGuidance.structuredContent?.value?.value;
  const featureGoalRoutedValidatedFormDisplayText = featureGoalRoutedValidatedFormValue?.displayText;
  const featureGoalMultiStepFormValue = featureGoalMultiStepFormGuidance.structuredContent?.value?.value;
  const featureGoalMultiStepFormDisplayText = featureGoalMultiStepFormValue?.displayText;
  const featureGoalOnboardingFlowValue = featureGoalOnboardingFlowGuidance.structuredContent?.value?.value;
  const featureGoalOnboardingFlowDisplayText = featureGoalOnboardingFlowValue?.displayText;
  const featureGoalOnboardingFormValue = featureGoalOnboardingFormGuidance.structuredContent?.value?.value;
  const featureGoalOnboardingFormDisplayText = featureGoalOnboardingFormValue?.displayText;
  const featureGoalApiBackedWizardValue = featureGoalApiBackedWizardGuidance.structuredContent?.value?.value;
  const featureGoalApiBackedWizardDisplayText = featureGoalApiBackedWizardValue?.displayText;
  const featureGoalPreferencesValue = featureGoalPreferencesGuidance.structuredContent?.value?.value;
  const featureGoalPreferencesDisplayText = featureGoalPreferencesValue?.displayText;
  const featureGoalCheckoutValue = featureGoalCheckoutGuidance.structuredContent?.value?.value;
  const featureGoalCheckoutDisplayText = featureGoalCheckoutValue?.displayText;
  const featureGoalRoutedCatalogCheckoutValue = featureGoalRoutedCatalogCheckoutGuidance.structuredContent?.value?.value;
  const featureGoalRoutedCatalogCheckoutDisplayText = featureGoalRoutedCatalogCheckoutValue?.displayText;
  const featureGoalContactSubmitValue = featureGoalContactSubmitGuidance.structuredContent?.value?.value;
  const featureGoalContactSubmitDisplayText = featureGoalContactSubmitValue?.displayText;
  const featureGoalContactMessageValue = featureGoalContactMessageGuidance.structuredContent?.value?.value;
  const featureGoalContactMessageDisplayText = featureGoalContactMessageValue?.displayText;
  const featureGoalApiSignupValue = featureGoalApiSignupGuidance.structuredContent?.value?.value;
  const featureGoalApiSignupDisplayText = featureGoalApiSignupValue?.displayText;
  const featureGoalCustomerIntakeValue = featureGoalCustomerIntakeGuidance.structuredContent?.value?.value;
  const featureGoalCustomerIntakeDisplayText = featureGoalCustomerIntakeValue?.displayText;
  const featureGoalCustomerServiceValue = featureGoalCustomerServiceGuidance.structuredContent?.value?.value;
  const featureGoalCustomerServiceDisplayText = featureGoalCustomerServiceValue?.displayText;
  const featureGoalApiServiceValue = featureGoalApiServiceGuidance.structuredContent?.value?.value;
  const featureGoalApiServiceDisplayText = featureGoalApiServiceValue?.displayText;
  const featureGoalDocumentAutosaveValue = featureGoalDocumentAutosaveGuidance.structuredContent?.value?.value;
  const featureGoalDocumentAutosaveDisplayText = featureGoalDocumentAutosaveValue?.displayText;
  const featureGoalInventoryEditValue = featureGoalInventoryEditGuidance.structuredContent?.value?.value;
  const featureGoalInventoryEditDisplayText = featureGoalInventoryEditValue?.displayText;
  const featureGoalProductAdminTableValue = featureGoalProductAdminTableGuidance.structuredContent?.value?.value;
  const featureGoalProductAdminTableDisplayText = featureGoalProductAdminTableValue?.displayText;
  const featureGoalSupportInboxValue = featureGoalSupportInboxGuidance.structuredContent?.value?.value;
  const featureGoalSupportInboxDisplayText = featureGoalSupportInboxValue?.displayText;
  const featureGoalSupportWorkspaceValue = featureGoalSupportWorkspaceGuidance.structuredContent?.value?.value;
  const featureGoalSupportWorkspaceDisplayText = featureGoalSupportWorkspaceValue?.displayText;
  const featureGoalSupportTicketRouteValue = featureGoalSupportTicketRouteGuidance.structuredContent?.value?.value;
  const featureGoalSupportTicketRouteDisplayText = featureGoalSupportTicketRouteValue?.displayText;
  const featureGoalOrderManagementValue = featureGoalOrderManagementGuidance.structuredContent?.value?.value;
  const featureGoalOrderManagementDisplayText = featureGoalOrderManagementValue?.displayText;
  const featureGoalApiKeysSettingsValue = featureGoalApiKeysSettingsGuidance.structuredContent?.value?.value;
  const featureGoalApiKeysSettingsDisplayText = featureGoalApiKeysSettingsValue?.displayText;
  const featureGoalSettingsTabsFieldsValue = featureGoalSettingsTabsFieldsGuidance.structuredContent?.value?.value;
  const featureGoalSettingsTabsFieldsDisplayText = featureGoalSettingsTabsFieldsValue?.displayText;
  const featureGoalSettingsTabsProfileFormValue = featureGoalSettingsTabsProfileFormGuidance.structuredContent?.value?.value;
  const featureGoalSettingsTabsProfileFormDisplayText = featureGoalSettingsTabsProfileFormValue?.displayText;
  const featureGoalValidatedSettingsFieldsValue = featureGoalValidatedSettingsFieldsGuidance.structuredContent?.value?.value;
  const featureGoalValidatedSettingsFieldsDisplayText = featureGoalValidatedSettingsFieldsValue?.displayText;
  const featureGoalAccountSettingsControlsValue = featureGoalAccountSettingsControlsGuidance.structuredContent?.value?.value;
  const featureGoalAccountSettingsControlsDisplayText = featureGoalAccountSettingsControlsValue?.displayText;
  const featureGoalCustomerOperationsSettingsValue = featureGoalCustomerOperationsSettingsGuidance.structuredContent?.value?.value;
  const featureGoalCustomerOperationsSettingsDisplayText = featureGoalCustomerOperationsSettingsValue?.displayText;
  const featureGoalCustomerSupportPortalValue = featureGoalCustomerSupportPortalGuidance.structuredContent?.value?.value;
  const featureGoalCustomerSupportPortalDisplayText = featureGoalCustomerSupportPortalValue?.displayText;
  const featureGoalOptionalStatePluginValue = featureGoalOptionalStatePluginGuidance.structuredContent?.value?.value;
  const featureGoalOptionalStatePluginDisplayText = featureGoalOptionalStatePluginValue?.displayText;
  const featureGoalOptionalStatePluginSignalKeys = featureGoalOptionalStatePluginValue?.featureGoalSignals?.map((row) => row.key) ?? [];
  const featureGoalCatalogCheckoutSettingsValue = featureGoalCatalogCheckoutSettingsGuidance.structuredContent?.value?.value;
  const featureGoalCatalogCheckoutSettingsDisplayText = featureGoalCatalogCheckoutSettingsValue?.displayText;
  const featureGoalAccountSettingsOptionsValue = featureGoalAccountSettingsOptionsGuidance.structuredContent?.value?.value;
  const featureGoalAccountSettingsOptionsDisplayText = featureGoalAccountSettingsOptionsValue?.displayText;
  const featureGoalTeamMemberEditorValue = featureGoalTeamMemberEditorGuidance.structuredContent?.value?.value;
  const featureGoalTeamMemberEditorDisplayText = featureGoalTeamMemberEditorValue?.displayText;
  const featureGoalTeamMemberOptionsValue = featureGoalTeamMemberOptionsGuidance.structuredContent?.value?.value;
  const featureGoalTeamMemberOptionsDisplayText = featureGoalTeamMemberOptionsValue?.displayText;
  const featureGoalTenantAdminApiSaveValue = featureGoalTenantAdminApiSaveGuidance.structuredContent?.value?.value;
  const featureGoalTenantAdminApiSaveDisplayText = featureGoalTenantAdminApiSaveValue?.displayText;
  const featureGoalOrganizationAdminValue = featureGoalOrganizationAdminGuidance.structuredContent?.value?.value;
  const featureGoalOrganizationAdminDisplayText = featureGoalOrganizationAdminValue?.displayText;
  const featureGoalProjectBoardValue = featureGoalProjectBoardGuidance.structuredContent?.value?.value;
  const featureGoalProjectBoardDisplayText = featureGoalProjectBoardValue?.displayText;
  const featureGoalProjectManagementWorkspaceValue = featureGoalProjectManagementWorkspaceGuidance.structuredContent?.value?.value;
  const featureGoalProjectManagementWorkspaceDisplayText = featureGoalProjectManagementWorkspaceValue?.displayText;
  const featureGoalIssueTrackerApiSaveValue = featureGoalIssueTrackerApiSaveGuidance.structuredContent?.value?.value;
  const featureGoalIssueTrackerApiSaveDisplayText = featureGoalIssueTrackerApiSaveValue?.displayText;
  const featureGoalRepositoryBrowserSearchValue = featureGoalRepositoryBrowserSearchGuidance.structuredContent?.value?.value;
  const featureGoalRepositoryBrowserSearchDisplayText = featureGoalRepositoryBrowserSearchValue?.displayText;
  const featureGoalRepositoryOwnerFiltersValue = featureGoalRepositoryOwnerFiltersGuidance.structuredContent?.value?.value;
  const featureGoalRepositoryOwnerFiltersDisplayText = featureGoalRepositoryOwnerFiltersValue?.displayText;
  const featureGoalProductCatalogCompareValue = featureGoalProductCatalogCompareGuidance.structuredContent?.value?.value;
  const featureGoalProductCatalogCompareDisplayText = featureGoalProductCatalogCompareValue?.displayText;
  const featureGoalStatePluginTodoValue = featureGoalStatePluginTodoGuidance.structuredContent?.value?.value;
  const featureGoalStatePluginTodoDisplayText = featureGoalStatePluginTodoValue?.displayText;
  const featureGoalStatePluginProjectTaskValue = featureGoalStatePluginProjectTaskGuidance.structuredContent?.value?.value;
  const featureGoalStatePluginProjectTaskDisplayText = featureGoalStatePluginProjectTaskValue?.displayText;
  const featureGoalPlainTodoValue = featureGoalPlainTodoGuidance.structuredContent?.value?.value;
  const featureGoalPlainTodoDisplayText = featureGoalPlainTodoValue?.displayText;
  const featureGoalCustomerAccountListValue = featureGoalCustomerAccountListGuidance.structuredContent?.value?.value;
  const featureGoalCustomerAccountListDisplayText = featureGoalCustomerAccountListValue?.displayText;
  const featureGoalProfileEditorValue = featureGoalProfileEditorGuidance.structuredContent?.value?.value;
  const featureGoalProfileEditorDisplayText = featureGoalProfileEditorValue?.displayText;
  const featureGoalAccountEditorValue = featureGoalAccountEditorGuidance.structuredContent?.value?.value;
  const featureGoalAccountEditorDisplayText = featureGoalAccountEditorValue?.displayText;
  const featureGoalProfileFormValue = featureGoalProfileFormGuidance.structuredContent?.value?.value;
  const featureGoalProfileFormDisplayText = featureGoalProfileFormValue?.displayText;
  const featureGoalRoutedOrderEditValue = featureGoalRoutedOrderEditGuidance.structuredContent?.value?.value;
  const featureGoalRoutedOrderEditDisplayText = featureGoalRoutedOrderEditValue?.displayText;
  const featureGoalProfileDetailsValue = featureGoalProfileDetailsGuidance.structuredContent?.value?.value;
  const featureGoalProfileDetailsDisplayText = featureGoalProfileDetailsValue?.displayText;
  const featureGoalRoutedSettingsValue = featureGoalRoutedSettingsGuidance.structuredContent?.value?.value;
  const featureGoalRoutedSettingsDisplayText = featureGoalRoutedSettingsValue?.displayText;
  const featureGoalRouteOnlySettingsValue = featureGoalRouteOnlySettingsGuidance.structuredContent?.value?.value;
  const featureGoalRouteOnlySettingsDisplayText = featureGoalRouteOnlySettingsValue?.displayText;
  const featureGoalAdminSearchEditValue = featureGoalAdminSearchEditGuidance.structuredContent?.value?.value;
  const featureGoalAdminSearchEditDisplayText = featureGoalAdminSearchEditValue?.displayText;
  const adminSearchSignal = featureGoalAdminSearchEditValue?.featureGoalSignals?.find((row) => row.key === 'searchable-list');
  const adminFormSignal = featureGoalAdminSearchEditValue?.featureGoalSignals?.find((row) => row.key === 'form-entry');
  const featureGoalAdminProjectTaskSearchValue = featureGoalAdminProjectTaskSearchGuidance.structuredContent?.value?.value;
  const featureGoalAdminProjectTaskSearchDisplayText = featureGoalAdminProjectTaskSearchValue?.displayText;
  const featureGoalAdminProjectTaskSettingsValue = featureGoalAdminProjectTaskSettingsGuidance.structuredContent?.value?.value;
  const featureGoalAdminProjectTaskSettingsDisplayText = featureGoalAdminProjectTaskSettingsValue?.displayText;
  const featureGoalAdminProjectTaskApiSettingsValue = featureGoalAdminProjectTaskApiSettingsGuidance.structuredContent?.value?.value;
  const featureGoalAdminProjectTaskApiSettingsDisplayText = featureGoalAdminProjectTaskApiSettingsValue?.displayText;
  const featureGoalAuthenticatedAdminValue = featureGoalAuthenticatedAdminGuidance.structuredContent?.value?.value;
  const featureGoalAuthenticatedAdminDisplayText = featureGoalAuthenticatedAdminValue?.displayText;
  const featureGoalCrudFormsValue = featureGoalCrudFormsGuidance.structuredContent?.value?.value;
  const featureGoalCrudFormsDisplayText = featureGoalCrudFormsValue?.displayText;
  const crudFormsSignal = featureGoalCrudFormsValue?.featureGoalSignals?.find((row) => row.key === 'form-entry');
  const featureGoalLoadingIndicatorSignalKeys = featureGoalLoadingIndicatorGuidance.structuredContent?.value?.value?.featureGoalSignals?.map((row) => row.key) ?? [];
  const featureGoalLayoutGridValue = featureGoalLayoutGridGuidance.structuredContent?.value?.value;
  const featureGoalLayoutGridDisplayText = featureGoalLayoutGridValue?.displayText;
  const featureGoalLayoutGridSignalKeys = featureGoalLayoutGridValue?.featureGoalSignals?.map((row) => row.key) ?? [];
  const featureGoalPricingProductTiersValue = featureGoalPricingProductTiersGuidance.structuredContent?.value?.value;
  const featureGoalPricingProductTiersDisplayText = featureGoalPricingProductTiersValue?.displayText;
  const featureGoalPricingProductTiersSignalKeys = featureGoalPricingProductTiersValue?.featureGoalSignals?.map((row) => row.key) ?? [];
  const featureGoalRepositoryBrowserValue = featureGoalRepositoryBrowserGuidance.structuredContent?.value?.value;
  const featureGoalRepositoryBrowserDisplayText = featureGoalRepositoryBrowserValue?.displayText;
  const featureGoalRepositoryBrowserSignalKeys = featureGoalRepositoryBrowserValue?.featureGoalSignals?.map((row) => row.key) ?? [];
  const appBuildingGuidanceFollowUpSurfaces = appBuildingGuidanceValue?.followUps?.map((row) => row.surface) ?? [];
  const compactGuidanceRowsAreTerse =
    (appBuildingGuidanceValue?.principles ?? []).every((row) => row.recipeKeys?.length === 0)
    && (appBuildingGuidanceValue?.decisions ?? []).every((row) => row.recipeKeys?.length === 0)
    && (appBuildingGuidanceValue?.recipes ?? []).every((row) =>
      row.operationKinds?.length === 0
      && row.expectedEffectKinds?.length === 0
      && row.sourceFileRoles?.length === 0
      && row.tasteValues?.length === 0
    );
  const stateBackedFormGuidanceDisplayText = stateBackedFormGuidance.structuredContent?.value?.value?.displayText;
  const stateBackedFormDecisionSurfaces = stateBackedFormGuidance.structuredContent?.value?.value?.decisions
    ?.find((row) => row.key === 'form-value-channel')
    ?.followUpSurfaces ?? [];
  const routingGuidanceDisplayText = routingGuidance.structuredContent?.value?.value?.displayText;
  const routingDecisionSurfaces = routingGuidance.structuredContent?.value?.value?.decisions
    ?.find((row) => row.key === 'route-selected-state')
    ?.followUpSurfaces ?? [];
  const routedCatalogGuidanceDisplayText = routedCatalogGuidance.structuredContent?.value?.value?.displayText;
  const stateStoreGuidanceDisplayText = stateStoreGuidance.structuredContent?.value?.value?.displayText;
  const routedServiceValidatedGuidanceDisplayText = routedServiceValidatedGuidance.structuredContent?.value?.value?.displayText;
  const pluginGuidanceDisplayText = pluginGuidance.structuredContent?.value?.value?.displayText;
  const appQueryCatalogDisplayText = appQueryCatalog.structuredContent?.value?.value?.displayText;
  const workspaceOverviewDisplayText = workspaceOverview.structuredContent?.value?.value?.displayText;
  const routedDataTableAppOverviewDisplayText = routedDataTableAppOverview.structuredContent?.value?.value?.displayText;
  const routedDataTableRouterOverviewDisplayText = routedDataTableRouterOverview.structuredContent?.value?.value?.displayText;
  const templateCompletionsDisplayText = templateCompletions.structuredContent?.value?.value?.displayText;
  const templateCursorInfoDisplayText = templateCursorInfo.structuredContent?.value?.value?.displayText;
  const templateDiagnosticsDisplayText = templateDiagnostics.structuredContent?.value?.value?.displayText;
  const authoringOrientationValue = authoringOrientation.structuredContent?.value?.value;
  const dataTableOrientationValue = dataTableOrientation.structuredContent?.value?.value;
  const forwardingAccessorOrientationDisplayText = forwardingAccessorOrientation.structuredContent?.value?.value?.displayText;
  const dataTableValueChannelSummaryValue = dataTableValueChannelSummary.structuredContent?.value?.value;
  const dataTableDataFlowSummaryValue = dataTableDataFlowSummary.structuredContent?.value?.value;
  const dataTableObservedDependencySummaryValue = dataTableObservedDependencySummary.structuredContent?.value?.value;
  const dataFlowIssueSummaryValue = dataFlowIssueSummary.structuredContent?.value?.value;
  const dataFlowDiagnosticOverviewDisplayText = dataFlowDiagnosticOverview.structuredContent?.value?.value?.displayText;
  const dataFlowAppDiagnosticsDisplayText = dataFlowAppDiagnostics.structuredContent?.value?.value?.displayText;
  const routerOpenSeamOverviewDisplayText = routerOpenSeamOverview.structuredContent?.value?.value?.displayText;
  const dataTableSummaryBatchValue = dataTableSummaryBatch.structuredContent?.value?.value;
  const dataTableSummaryBatchDisplayText = dataTableSummaryBatchValue?.displayText;
  const cacheOverviewDisplayText = cacheOverview.structuredContent?.value?.displayText;
  const dataTableHasCustomControlTaste = dataTableOrientationValue?.taste?.some((axis) =>
    axis.axisKey === 'form-value-channel'
    && axis.values?.some((value) => value.valueKey === 'custom-control-binding')
  ) === true;
  const dataTableValueChannelRows = dataTableValueChannelSummaryValue?.rows ?? [];
  const dataTableValueChannelFirstCoupling = dataTableValueChannelSummaryValue?.observerCouplings?.[0];
  const dataTableValueChannelCouplings = dataTableValueChannelSummaryValue?.observerCouplings?.map((row) => row.observerCoupling) ?? [];
  const dataTableDataFlowRows = dataTableDataFlowSummaryValue?.rows ?? [];
  const dataTableDataFlowIssueRows = dataTableDataFlowSummaryValue?.issueRows ?? [];
  const dataTableObservedDependencyRows = dataTableObservedDependencySummaryValue?.rows ?? [];
  const dataTableObservedDependencySourceStates = dataTableObservedDependencySummaryValue?.memberSourceStateRows?.map((row) => row.observedMemberSourceState) ?? [];
  const issueOnlyDataFlowRows = dataFlowIssueSummaryValue?.rows ?? [];
  const issueOnlyIssueKinds = dataFlowIssueSummaryValue?.issueRows?.map((row) => row.issueKind) ?? [];
  const dataTableDirectStateEventFlow = dataTableDataFlowRows.some((row) =>
    row.valueChannelKind === 'event-handler-invocation'
    && row.sourceRootNames?.includes('state')
    && row.sourceToTargetAssignable?.yes > 0
  );
  const probeFailures = [];
  function recordProbeFailure(label, condition) {
    if (condition) {
      probeFailures.push(label);
    }
  }
  recordProbeFailure('featureGoalGuidance', typeof featureGoalGuidanceDisplayText !== 'string'
    || !featureGoalGuidanceDisplayText.includes('Feature goal signals: routing (navigation-frame), searchable-list (feature-surface), localization (framework-capability), validation (framework-capability)')
    || !featureGoalGuidanceDisplayText.includes('Recipe path: start with routed-searchable-data-table for routing, searchable-list; then borrow routed-localized-validated-state-backed-form patterns for localization, validation.'));
  recordProbeFailure('featureGoalApiBackedWizard', typeof featureGoalApiBackedWizardDisplayText !== 'string'
    || !featureGoalApiBackedWizardDisplayText.includes('Recipe path: start with multi-step-state-backed-form for form-entry, multi-step-form, validation; then borrow routed-service-validated-state-backed-form patterns for routing, service-boundary.'));
  recordProbeFailure('featureGoalApiKeysSettings', typeof featureGoalApiKeysSettingsDisplayText !== 'string'
    || !featureGoalApiKeysSettingsDisplayText.includes('Feature goal signals: sectioned-navigation (navigation-frame).')
    || !featureGoalApiKeysSettingsDisplayText.includes('Recipe path: start with routed-app-shell for sectioned-navigation.')
    || !featureGoalApiKeysSettingsDisplayText.includes('section-routes=Account, Notifications, Billing Address, API Keys')
    || !featureGoalApiKeysSettingsDisplayText.includes('section-routes{route-section-list/source-text-input}')
    || featureGoalApiKeysSettingsDisplayText.includes('state-backed-form: request-entity')
    || featureGoalApiKeysSettingsDisplayText.includes('service-boundary')
    || featureGoalApiKeysSettingsValue?.recipePlanSequence?.[0]?.recipeKey !== 'routed-app-shell'
    || featureGoalApiKeysSettingsValue?.recipePlanSequence?.[1] != null
    || featureGoalApiKeysSettingsValue?.recipePlanSequence?.[0]?.suggestedSourceParameterValues?.some((row) => row.key === 'section-routes' && row.value === 'Account, Notifications, Billing Address, API Keys') !== true);
  recordProbeFailure('featureGoalSettingsTabsFields', typeof featureGoalSettingsTabsFieldsDisplayText !== 'string'
    || !featureGoalSettingsTabsFieldsDisplayText.includes('Feature goal signals: sectioned-navigation (navigation-frame), form-entry (feature-surface).')
    || !featureGoalSettingsTabsFieldsDisplayText.includes('state-backed-form: request-entity=Settings, request-fields=api key, notification toggle')
    || !featureGoalSettingsTabsFieldsDisplayText.includes('routed-app-shell: section-routes=API Key, Notification')
    || featureGoalSettingsTabsFieldsDisplayText.includes('request-selection-id=settingId')
    || featureGoalSettingsTabsFieldsValue?.recipePlanSequence?.[0]?.recipeKey !== 'state-backed-form'
    || featureGoalSettingsTabsFieldsValue?.recipePlanSequence?.[1]?.recipeKey !== 'routed-app-shell');
  recordProbeFailure('featureGoalSettingsTabsProfileForm', typeof featureGoalSettingsTabsProfileFormDisplayText !== 'string'
    || !featureGoalSettingsTabsProfileFormDisplayText.includes('Feature goal signals: sectioned-navigation (navigation-frame), form-entry (feature-surface).')
    || !featureGoalSettingsTabsProfileFormDisplayText.includes('state-backed-form: request-entity=Profile, request-fields=display name, email')
    || !featureGoalSettingsTabsProfileFormDisplayText.includes('routed-app-shell: section-routes=Profile, Notifications')
    || featureGoalSettingsTabsProfileFormDisplayText.includes('Notifications Plus Profile')
    || featureGoalSettingsTabsProfileFormDisplayText.includes('request-fields=notification toggle')
    || featureGoalSettingsTabsProfileFormDisplayText.includes('request-selection-id=profileId')
    || featureGoalSettingsTabsProfileFormValue?.recipePlanSequence?.[0]?.recipeKey !== 'state-backed-form'
    || featureGoalSettingsTabsProfileFormValue?.recipePlanSequence?.[1]?.recipeKey !== 'routed-app-shell');
  recordProbeFailure('featureGoalValidatedSettingsFields', typeof featureGoalValidatedSettingsFieldsDisplayText !== 'string'
    || !featureGoalValidatedSettingsFieldsDisplayText.includes('validated-state-backed-form: request-entity=Settings, request-fields=api key, notification toggle')
    || featureGoalValidatedSettingsFieldsValue?.recipePlanSequence?.[0]?.recipeKey !== 'validated-state-backed-form'
    || featureGoalValidatedSettingsFieldsValue?.recipePlanSequence?.[0]?.suggestedSourceParameterValues?.some((row) => row.key === 'request-fields' && row.value === 'api key, notification toggle') !== true);
  recordProbeFailure('featureGoalCustomerOperationsSettings', typeof featureGoalCustomerOperationsSettingsDisplayText !== 'string'
    || !featureGoalCustomerOperationsSettingsDisplayText.includes('Recipe path: start with routed-searchable-data-table for routing, searchable-list, service-boundary; then borrow routed-service-backed-form patterns for form-entry, service-write-boundary.')
    || !featureGoalCustomerOperationsSettingsDisplayText.includes('routed-searchable-data-table: detail-route-parameter=customerAccountId, list-route-path=customer-accounts, list-route-title=Customer Accounts, table-entity=Customer Account, table-collection=customerAccounts')
    || !featureGoalCustomerOperationsSettingsDisplayText.includes('routed-service-backed-form: request-entity=Notification Preference, request-selection-id=notificationPreferenceId, request-fields=language select, api key')
    || featureGoalCustomerOperationsSettingsDisplayText.includes('table-filter-fields=name')
    || featureGoalCustomerOperationsSettingsDisplayText.includes('table-filter-fields=name, language select')
    || featureGoalCustomerOperationsSettingsValue?.recipePlanSequence?.[0]?.recipeKey !== 'routed-searchable-data-table'
    || featureGoalCustomerOperationsSettingsValue?.recipePlanSequence?.[1]?.recipeKey !== 'routed-service-backed-form');
  recordProbeFailure('featureGoalCustomerSupportPortal', typeof featureGoalCustomerSupportPortalDisplayText !== 'string'
    || !featureGoalCustomerSupportPortalDisplayText.includes('routed-searchable-data-table: detail-route-parameter=ticketId, list-route-path=tickets, list-route-title=Tickets, table-entity=Ticket, table-collection=tickets, table-filter-fields=name, priority select, assignment select')
    || !featureGoalCustomerSupportPortalDisplayText.includes('routed-service-validated-state-backed-form: request-entity=Ticket, request-selection-id=ticketId')
    || !featureGoalCustomerSupportPortalDisplayText.includes('routed-localized-validated-state-backed-form: request-entity=Ticket, request-selection-id=ticketId')
    || featureGoalCustomerSupportPortalDisplayText.includes('Ticket Ticket')
    || featureGoalCustomerSupportPortalValue?.recipePlanSequence?.[0]?.recipeKey !== 'routed-searchable-data-table'
    || featureGoalCustomerSupportPortalValue?.recipePlanSequence?.[1]?.recipeKey !== 'routed-service-validated-state-backed-form'
    || featureGoalCustomerSupportPortalValue?.recipePlanSequence?.[2]?.recipeKey !== 'routed-localized-validated-state-backed-form');
  recordProbeFailure('featureGoalOptionalStatePlugin', typeof featureGoalOptionalStatePluginDisplayText !== 'string'
    || featureGoalOptionalStatePluginSignalKeys.includes('state-plugin')
    || featureGoalOptionalStatePluginDisplayText.includes('Recipe path: start with state-store-list')
    || featureGoalOptionalStatePluginDisplayText.includes('state-store-list:')
    || !featureGoalOptionalStatePluginDisplayText.includes('Recipe path: start with routed-searchable-data-table for routing, searchable-list, service-boundary; then borrow routed-service-backed-form patterns for service-write-boundary.')
    || featureGoalOptionalStatePluginValue?.recipePlanSequence?.[0]?.recipeKey !== 'routed-searchable-data-table'
    || featureGoalOptionalStatePluginValue?.recipePlanSequence?.[1]?.recipeKey !== 'routed-service-backed-form');
  recordProbeFailure('featureGoalCatalogCheckoutSettings', typeof featureGoalCatalogCheckoutSettingsDisplayText !== 'string'
    || !featureGoalCatalogCheckoutSettingsDisplayText.includes('Recipe path: start with routed-catalog-storefront for routing, searchable-list, catalog-product; then borrow multi-step-state-backed-form patterns for form-entry, multi-step-form.')
    || !featureGoalCatalogCheckoutSettingsDisplayText.includes('routed-catalog-storefront: detail-route-parameter=productId, list-route-path=products, list-route-title=Products, catalog-entity=Product, catalog-collection=products')
    || featureGoalCatalogCheckoutSettingsDisplayText.includes('catalog-entity=Checkout')
    || featureGoalCatalogCheckoutSettingsValue?.recipePlanSequence?.[0]?.recipeKey !== 'routed-catalog-storefront'
    || featureGoalCatalogCheckoutSettingsValue?.recipePlanSequence?.[1]?.recipeKey !== 'multi-step-state-backed-form');
  recordProbeFailure('featureGoalSupportWorkspace', typeof featureGoalSupportWorkspaceDisplayText !== 'string'
    || !featureGoalSupportWorkspaceDisplayText.includes('table-entity=Ticket, table-collection=tickets, table-filter-fields=name, priority select, assignment select, sla hours number')
    || !featureGoalSupportWorkspaceDisplayText.includes('routed-state-backed-form: request-entity=Ticket, request-selection-id=ticketId, request-fields=name, priority select, assignment select, sla hours number')
    || featureGoalSupportWorkspaceDisplayText.includes('tickets select')
    || featureGoalSupportWorkspaceValue?.recipePlanSequence?.[0]?.recipeKey !== 'routed-searchable-data-table'
    || featureGoalSupportWorkspaceValue?.recipePlanSequence?.[1]?.recipeKey !== 'routed-state-backed-form');
  recordProbeFailure('featureGoalSupportTicketRouteFieldSchema', typeof featureGoalSupportTicketRouteDisplayText !== 'string'
    || !featureGoalSupportTicketRouteDisplayText.includes('table-entity=Ticket, table-collection=tickets, table-filter-fields=name, priority select, assignee select')
    || featureGoalSupportTicketRouteDisplayText.includes('table-filter-fields=name, ticket')
    || featureGoalSupportTicketRouteValue?.recipePlanSequence?.[0]?.recipeKey !== 'routed-searchable-data-table');
  recordProbeFailure('featureGoalProjectManagementWorkspace', typeof featureGoalProjectManagementWorkspaceDisplayText !== 'string'
    || !featureGoalProjectManagementWorkspaceDisplayText.includes('service-boundary (integration-boundary), service-write-boundary (integration-boundary)')
    || !featureGoalProjectManagementWorkspaceDisplayText.includes('Recipe path: start with routed-searchable-data-table for routing, searchable-list, service-boundary; then borrow routed-service-backed-form patterns for form-entry, service-write-boundary.')
    || !featureGoalProjectManagementWorkspaceDisplayText.includes('table-filter-fields=name, assignee select, due date')
    || !featureGoalProjectManagementWorkspaceDisplayText.includes('request-fields=name, assignee select, due date, comments')
    || featureGoalProjectManagementWorkspaceDisplayText.includes('due date filters')
    || featureGoalProjectManagementWorkspaceValue?.recipePlanSequence?.[0]?.recipeKey !== 'routed-searchable-data-table'
    || featureGoalProjectManagementWorkspaceValue?.recipePlanSequence?.[1]?.recipeKey !== 'routed-service-backed-form');
  recordProbeFailure('featureGoalRepositoryBrowserSearch', typeof featureGoalRepositoryBrowserSearchDisplayText !== 'string'
    || featureGoalRepositoryBrowserSearchDisplayText.includes('form-entry')
    || !featureGoalRepositoryBrowserSearchDisplayText.includes('table-entity=File, table-collection=files')
    || featureGoalRepositoryBrowserSearchValue?.recipePlanSequence?.[0]?.suggestedSourceParameterValues?.some((row) => row.key === 'table-entity' && row.value === 'File') !== true);
  recordProbeFailure('featureGoalRoutedOrderEdit', typeof featureGoalRoutedOrderEditDisplayText !== 'string'
    || !featureGoalRoutedOrderEditDisplayText.includes('Feature goal signals: routing (navigation-frame), form-entry (feature-surface), validation (framework-capability).')
    || !featureGoalRoutedOrderEditDisplayText.includes('Recipe path: start with routed-validated-state-backed-form for routing, form-entry, validation.')
    || !featureGoalRoutedOrderEditDisplayText.includes('routed-validated-state-backed-form: request-route-parameter=orderId, request-route-title=Order, request-entity=Order, request-selection-id=orderId')
    || !hasSuggestedSourceParameterContract(featureGoalRoutedOrderEditValue?.recipePlanSequence?.[0], 'request-route-parameter', 'route-parameter-name', 'source-text-input')
    || !hasSuggestedSourceParameterContract(featureGoalRoutedOrderEditValue?.recipePlanSequence?.[0], 'request-entity', 'domain-title', 'source-text-input')
    || featureGoalRoutedOrderEditValue?.recipePlanSequence?.[0]?.recipeKey !== 'routed-validated-state-backed-form'
    || featureGoalRoutedOrderEditValue?.recipePlanSequence?.[0]?.suggestedSourceParameterValues?.some((row) => row.key === 'request-route-parameter' && row.value === 'orderId') !== true
    || featureGoalRoutedOrderEditValue?.recipePlanSequence?.[0]?.suggestedSourceParameterValues?.some((row) => row.key === 'request-entity' && row.value === 'Order') !== true);
  recordProbeFailure('featureGoalApiServiceWriteBoundary', typeof featureGoalApiServiceDisplayText !== 'string'
    || !featureGoalApiServiceDisplayText.includes('Feature goal signals: form-entry (feature-surface), service-boundary (integration-boundary), service-write-boundary (integration-boundary).')
    || featureGoalApiServiceValue?.recipePlanSequence?.[0]?.recipeKey !== 'service-backed-form');
  recordProbeFailure('featureGoalDocumentAutosave', typeof featureGoalDocumentAutosaveDisplayText !== 'string'
    || !featureGoalDocumentAutosaveDisplayText.includes('Feature goal signals: searchable-list (feature-surface), form-entry (feature-surface), service-boundary (integration-boundary), service-write-boundary (integration-boundary).')
    || !featureGoalDocumentAutosaveDisplayText.includes('Recipe path: start with searchable-data-table for searchable-list, service-boundary; then borrow service-backed-form patterns for form-entry, service-write-boundary.')
    || !featureGoalDocumentAutosaveDisplayText.includes('table-entity=Document, table-collection=documents, table-filter-fields=name, tag select')
    || featureGoalDocumentAutosaveValue?.recipePlanSequence?.[0]?.recipeKey !== 'searchable-data-table'
    || featureGoalDocumentAutosaveValue?.recipePlanSequence?.[1]?.recipeKey !== 'service-backed-form');
  recordProbeFailure('featureGoalOrganizationAdmin', typeof featureGoalOrganizationAdminDisplayText !== 'string'
    || !featureGoalOrganizationAdminDisplayText.includes('searchable-data-table[Audit Log]')
    || !featureGoalOrganizationAdminDisplayText.includes('searchable-data-table[Audit Log]: table-entity=Audit Log, table-collection=auditLogs')
    || !featureGoalOrganizationAdminDisplayText.includes('routed-searchable-data-table: detail-route-parameter=teamId, list-route-path=teams, list-route-title=Teams, table-entity=Team, table-collection=teams')
    || featureGoalOrganizationAdminValue?.recipePlanSequence?.some((row) => row.recipeKey === 'searchable-data-table' && row.instanceLabel === 'Audit Log' && row.suggestedSourceParameterValues?.some((value) => value.key === 'table-entity' && value.value === 'Audit Log')) !== true);
  recordProbeFailure('sourceParameterizedTableOptions', typeof sourceParameterizedRecipePlanDisplayText !== 'string'
    || !sourceParameterizedRecipePlanDisplayText.includes('Source parameters: applied detail-route-parameter=accountId, list-route-path=accounts, list-route-title=Accounts, table-entity=Customer Account, table-collection=accounts, table-filter-fields=customer name, due date, status select, total amount number, paid toggle, table-options=status: Open, Overdue, Paid.')
    || sourceParameterizedApplications.filter((row) => row.applicationState === 'applied-to-source-plan').length !== 7
    || !sourceParameterizedRecipePlanValue?.sourcePlan?.pattern?.parameters?.some((row) => row.key === 'table-options' && row.kind === 'domain-collection' && row.valueShape === 'option-schema-list' && row.applicationPolicy === 'source-text-input')
    || !sourceParameterizedSourceText.includes("export type Status = 'open' | 'overdue' | 'paid';")
    || sourceParameterizedSourceText.includes('status-one'));
  recordProbeFailure('applied-source-parameter-display', typeof routedTeamMemberEditorRecipePlanDisplayText !== 'string'
    || !routedTeamMemberEditorRecipePlanDisplayText.includes('role recommendable-recipe; use apply-as-source-start; domain policy caller-applied')
    || !routedTeamMemberEditorRecipePlanDisplayText.includes('Concrete source is a recommendable starting scaffold')
    || routedTeamMemberEditorRecipePlanDisplayText.includes('adapt its reference domain names'));
  recordProbeFailure('catalog-and-default-guidance', tools.tools.length === 0
    || outputSchemaCount !== tools.tools.length
    || readOnlyToolCount !== tools.tools.length - 1
    || cacheTool?.annotations?.readOnlyHint !== false
    || cacheTool.annotations?.idempotentHint !== true
    || cacheTool.annotations?.destructiveHint !== false
    || cacheTool.annotations?.openWorldHint !== false
    || typeof catalogDisplayText !== 'string'
    || !catalogDisplayText.includes('Catalog:')
    || !catalogDisplayText.includes('View: overview')
    || !catalogDisplayText.includes('routed-app-shell')
    || !catalogDisplayText.includes('routed-searchable-data-table')
    || !catalogDisplayText.includes('aurelia_app_building_guidance')
    || !catalogOverviewRowsAreTerse
    || typeof appBuildingGuidance.structuredContent?.value?.summary !== 'string'
    || typeof appBuildingGuidanceDisplayText !== 'string'
    || !appBuildingGuidanceDisplayText.includes('direct objects for local typed boundaries')
    || !appBuildingGuidanceDisplayText.includes('Recipe searchable-data-table')
    || !appBuildingGuidanceDisplayText.includes('Recipe routed-app-shell')
    || !appBuildingGuidanceDisplayText.includes('Decision state-boundary')
    || !appBuildingGuidanceDisplayText.includes('Decision source-pattern-use-policy')
    || !appBuildingGuidanceDisplayText.includes('Decision type-repair-routing')
    || !appBuildingGuidanceFollowUpSurfaces.includes('app-query-batch')
    || !compactGuidanceRowsAreTerse);
  recordProbeFailure('plugin-guidance', typeof pluginGuidanceDisplayText !== 'string'
    || !pluginGuidanceDisplayText.includes('Recipe state-store-list')
    || !pluginGuidanceDisplayText.includes('Returned 5 of 7 structured recipe candidates'));
  recordProbeFailure('state-store-parameterized-source', stateStoreParameterizedApplications.filter((row) => row.applicationState === 'applied-to-source-plan').length !== 2
    || !stateStoreParameterizedRecipePlanValue?.sourcePlan?.pattern?.parameters?.some((row) => row.key === 'store-item' && row.valueShape === 'domain-title' && row.applicationPolicy === 'source-text-input')
    || !stateStoreParameterizedRecipePlanValue?.sourcePlan?.pattern?.parameters?.some((row) => row.key === 'store-collection' && row.valueShape === 'source-member-name' && row.applicationPolicy === 'source-text-input')
    || !stateStoreParameterizedSourceText.includes('interface ProjectTaskItem')
    || !stateStoreParameterizedSourceText.includes('interface ProjectTaskState')
    || !stateStoreParameterizedSourceText.includes('readonly projectTasks: readonly ProjectTaskItem[]')
    || !stateStoreParameterizedSourceText.includes("readonly type: 'addProjectTask'")
    || !stateStoreParameterizedSourceText.includes('repeat.for="projectTask of projectTasks & state"')
    || stateStoreParameterizedSourceText.includes('TodoItem')
    || stateStoreParameterizedSourceText.includes('readonly todos'));
  recordProbeFailure('routed-service-validated-selected-guidance', typeof routedServiceValidatedGuidanceDisplayText !== 'string'
    || !routedServiceValidatedGuidanceDisplayText.includes('Principle: Public guidance should handle common route config')
    || !routedServiceValidatedGuidanceDisplayText.includes('Decision state-boundary')
    || !routedServiceValidatedGuidanceDisplayText.includes('Recipe routed-service-validated-state-backed-form'));
  recordProbeFailure('request-form-parameterized-source', typeof requestFormParameterizedRecipePlanDisplayText !== 'string'
    || !requestFormParameterizedRecipePlanDisplayText.includes('Source parameters: applied request-entity=API Credential, request-selection-id=apiCredentialId, request-fields=notification toggles, preferred language select, seat count number, API key field, request-options=preferred language: English, Dutch.')
    || !requestFormParameterizedRecipePlanDisplayText.includes('host-adapted slots sample-data:request-sample-data{sample-data-summary}')
    || requestFormParameterizedRecipePlanDisplayText.includes('presentation:form-presentation{presentation-summary}')
    || requestFormParameterizedApplications.filter((row) => row.applicationState === 'applied-to-source-plan').length !== 4
    || requestFormParameterizedApplications.filter((row) => row.applicationState === 'advisory-only').length !== 0
    || !requestFormParameterizedRecipePlanValue?.sourcePlan?.pattern?.parameters?.some((row) => row.key === 'request-fields' && row.kind === 'field-schema' && row.valueShape === 'field-schema-list')
    || !requestFormParameterizedRecipePlanValue?.sourcePlan?.pattern?.parameters?.some((row) => row.key === 'request-options' && row.kind === 'domain-collection' && row.valueShape === 'option-schema-list' && row.applicationPolicy === 'source-text-input')
    || !requestFormParameterizedSourceText.includes('class ApiCredential')
    || !requestFormParameterizedSourceText.includes("export type PreferredLanguage = 'english' | 'dutch';")
    || !requestFormParameterizedSourceText.includes("readonly preferredLanguageOptions: readonly PreferredLanguage[] = ['english', 'dutch'];")
    || !requestFormParameterizedSourceText.includes('readApiCredential(apiCredentialId')
    || !requestFormParameterizedSourceText.includes('@bindable apiCredentialId')
    || !requestFormParameterizedSourceText.includes('apiCredential.canSubmit')
    || !requestFormParameterizedSourceText.includes('apiCredential.notificationEnabled')
    || !requestFormParameterizedSourceText.includes('apiCredential.preferredLanguage')
    || !requestFormParameterizedSourceText.includes('apiCredential.seatCount')
    || !requestFormParameterizedSourceText.includes('value-as-number.bind="apiCredential.seatCount"')
    || !requestFormParameterizedSourceText.includes('apiCredential.apiKey')
    || requestFormParameterizedSourceText.includes('apiCredential.customerName')
    || requestFormParameterizedSourceText.includes('apiCredential.assignee')
    || requestFormParameterizedSourceText.includes('preferred-language-one')
    || requestFormParameterizedSourceText.includes('ServiceRequest'));
  recordProbeFailure('draft-request-form-source', typeof draftRequestFormRecipePlanDisplayText !== 'string'
    || !draftRequestFormRecipePlanDisplayText.includes('Source parameters: applied request-entity=Contact, request-fields=email, message.')
    || draftRequestFormApplications.filter((row) => row.applicationState === 'applied-to-source-plan').length !== 2
    || draftRequestFormRecipePlanValue?.sourcePlan?.pattern?.parameters?.some((row) => row.key === 'request-selection-id') === true
    || !draftRequestFormSourceText.includes('readonly contact = createContact')
    || !draftRequestFormSourceText.includes('submitContact(): void')
    || !draftRequestFormSourceText.includes('<state-backed-form></state-backed-form>')
    || !draftRequestFormSourceText.includes('<let contact.bind="state.contact"></let>')
    || !draftRequestFormSourceText.includes('<label for="email">Email</label>')
    || !draftRequestFormSourceText.includes('value.bind="contact.email"')
    || !draftRequestFormSourceText.includes('value.bind="contact.message"')
    || draftRequestFormSourceText.includes('field-shell')
    || draftRequestFormSourceText.includes('FieldShell')
    || draftRequestFormSourceText.includes('@bindable contactId')
    || draftRequestFormSourceText.includes('contactIds')
    || draftRequestFormSourceText.includes('selectedContactId')
    || draftRequestFormSourceText.includes('readContact(contactId'));
  recordProbeFailure('contact-phone-request-form-source', typeof contactPhoneRequestFormRecipePlanDisplayText !== 'string'
    || !contactPhoneRequestFormRecipePlanDisplayText.includes('Source parameters: applied request-entity=Contact, request-fields=full name, email, phone number, message.')
    || contactPhoneRequestFormApplications.filter((row) => row.applicationState === 'applied-to-source-plan').length !== 2
    || !contactPhoneRequestFormSourceText.includes('public phoneNumber: string')
    || !contactPhoneRequestFormSourceText.includes('type="tel"')
    || !contactPhoneRequestFormSourceText.includes('value.bind="contact.phoneNumber"')
    || contactPhoneRequestFormSourceText.includes('public phoneNumber: number')
    || contactPhoneRequestFormSourceText.includes('value-as-number.bind="contact.phoneNumber"')
    || contactPhoneRequestFormSourceText.includes('phoneNumberNumber'));
  recordProbeFailure('draft-service-backed-form-source', typeof draftServiceBackedFormRecipePlanDisplayText !== 'string'
    || !draftServiceBackedFormRecipePlanDisplayText.includes('Source parameters: applied request-entity=Signup, request-fields=email, password, terms toggle.')
    || draftServiceBackedFormApplications.filter((row) => row.applicationState === 'applied-to-source-plan').length !== 2
    || draftServiceBackedFormRecipePlanValue?.sourcePlan?.pattern?.parameters?.some((row) => row.key === 'request-selection-id') === true
    || draftServiceBackedFormRecipePlanValue?.sourcePlan?.pattern?.modules?.some((row) => row.key === 'service-backed-loading') === true
    || !draftServiceBackedFormSourceText.includes('readonly signup = createSignup')
    || !draftServiceBackedFormSourceText.includes('isSubmitting = false')
    || !draftServiceBackedFormSourceText.includes('async submitSignup(): Promise<void>')
    || !draftServiceBackedFormSourceText.includes('await this.signupService.submitSignup(this.signup)')
    || !draftServiceBackedFormSourceText.includes('<service-backed-form></service-backed-form>')
    || !draftServiceBackedFormSourceText.includes('<let signup.bind="state.signup"></let>')
    || !draftServiceBackedFormSourceText.includes('<label for="email">Email</label>')
    || !draftServiceBackedFormSourceText.includes('value.bind="signup.email"')
    || !draftServiceBackedFormSourceText.includes('type="password"')
    || !draftServiceBackedFormSourceText.includes('checked.bind="signup.termsEnabled"')
    || draftServiceBackedFormRecipePlanDisplayText.includes('option domains')
    || draftServiceBackedFormRecipePlanValue?.sourcePlan?.pattern?.parameters?.some((row) => row.key === 'request-options') === true
    || draftServiceBackedFormSourceText.includes('field-shell')
    || draftServiceBackedFormSourceText.includes('FieldShell')
    || draftServiceBackedFormSourceText.includes('@bindable signupId')
    || draftServiceBackedFormSourceText.includes('signupIds')
    || draftServiceBackedFormSourceText.includes('selectedSignupId')
    || draftServiceBackedFormSourceText.includes('readSignup(signupId)')
    || draftServiceBackedFormSourceText.includes('loadSignups'));
  recordProbeFailure('settings-draft-form-source', typeof settingsDraftFormRecipePlanDisplayText !== 'string'
    || !settingsDraftFormRecipePlanDisplayText.includes('Source parameters: applied request-entity=Settings, request-fields=api key, notification toggle.')
    || settingsDraftFormApplications.filter((row) => row.applicationState === 'applied-to-source-plan').length !== 2
    || settingsDraftFormRecipePlanValue?.sourcePlan?.pattern?.parameters?.some((row) => row.key === 'request-selection-id') === true
    || settingsDraftFormRecipePlanValue?.sourcePlan?.pattern?.parameters?.some((row) => row.key === 'request-options') === true
    || settingsDraftFormRecipePlanValue?.sourcePlan?.pattern?.parameters?.some((row) => row.key === 'request-sample-data'
      && row.title === 'Starter request data'
      && row.defaultValue === 'one starter settings draft') !== true
    || !settingsDraftFormSourceText.includes('readonly settings = createSettings')
    || !settingsDraftFormSourceText.includes('<let settings.bind="state.settings"></let>')
    || !settingsDraftFormSourceText.includes('settings.apiKey')
    || !settingsDraftFormSourceText.includes('checked.bind="settings.notificationEnabled"')
    || !settingsDraftFormSourceText.includes('settings.canSubmit')
    || !settingsDraftFormSourceText.includes('<p>Submissions: ${state.submittedCount}</p>')
    || settingsDraftFormSourceText.includes('@bindable settingsId')
    || settingsDraftFormSourceText.includes('settingsIds')
    || settingsDraftFormSourceText.includes('selectedSettingsId')
    || settingsDraftFormSourceText.includes('readSettings(settingsId)')
    || settingsDraftFormSourceText.includes('submitted settings(s)')
    || settingsDraftFormSourceText.includes('settings(s)'));
  recordProbeFailure('domain-only-request-form-source', typeof domainOnlyRequestFormRecipePlanDisplayText !== 'string'
    || !domainOnlyRequestFormRecipePlanDisplayText.includes('field-schema:name{field-schema-list}*')
    || !domainOnlyRequestFormRecipePlanDisplayText.includes('Generated form app plain order submit-readiness getter observes name.')
    || !domainOnlyRequestFormSourceText.includes('class Order')
    || !domainOnlyRequestFormSourceText.includes('public name: string')
    || !domainOnlyRequestFormSourceText.includes("return this.name !== '';")
    || !domainOnlyRequestFormSourceText.includes('order.name')
    || domainOnlyRequestFormSourceText.includes('customerName')
    || domainOnlyRequestFormSourceText.includes('ContactPreference')
    || domainOnlyRequestFormSourceText.includes('SupportAgent')
    || domainOnlyRequestFormSourceText.includes('order.assignee')
    || domainOnlyRequestFormSourceText.includes('ServiceRequest'));
  recordProbeFailure('routed-domain-only-request-form-source', typeof routedDomainOnlyRequestFormRecipePlanDisplayText !== 'string'
    || !routedDomainOnlyRequestFormRecipePlanDisplayText.includes('route-identity:orderId{route-parameter-name}*')
    || !routedDomainOnlyRequestFormRecipePlanDisplayText.includes('selection-identity:orderId{source-member-name}*')
    || !routedDomainOnlyRequestFormSourceText.includes("path: 'form/:orderId'")
    || !routedDomainOnlyRequestFormSourceText.includes('orderId: string;')
    || !routedDomainOnlyRequestFormSourceText.includes('routeParams.orderId')
    || !routedDomainOnlyRequestFormSourceText.includes('order-id.bind="routeParams.orderId"')
    || routedDomainOnlyRequestFormSourceText.includes('requestId: string;')
    || routedDomainOnlyRequestFormSourceText.includes('routeParams.requestId')
    || routedDomainOnlyRequestFormSourceText.includes("path: 'form/:requestId'"));
  recordProbeFailure('resources-and-prompts', appBuildingGuidanceResource.contents.length === 0
    || typeof appBuildingGuidanceResourceValue?.summary !== 'string'
    || typeof appBuildingGuidanceResourceValue?.value?.displayText !== 'string'
    || recipeResource.contents.length === 0
    || typeof recipeResourceValue?.summary !== 'string'
    || !recipeResourceRowsAreTerse
    || appQueryResource.contents.length === 0
    || typeof appQueryResourceValue?.summary !== 'string'
    || prompts.prompts.length === 0
    || orientPrompt.messages.length === 0
    || buildFeaturePrompt.messages.length === 0
    || !orientPromptText.includes('aurelia_authoring_orientation')
    || !orientPromptText.includes('analysisDepth=binding-observation')
    || !orientPromptText.includes('aurelia_app_query_batch')
    || !orientPromptText.includes('binding-value-channel-summary')
    || !orientPromptText.includes('binding-data-flow-summary')
    || !orientPromptText.includes('binding-observed-dependency-summary')
    || !orientPromptText.includes('includeAppProfile')
    || !buildFeaturePromptText.includes('decision keys')
    || !buildFeaturePromptText.includes('no feature-goal signals matched')
    || !buildFeaturePromptText.includes('fallback context')
    || !buildFeaturePromptText.includes('recipes array is comparison context')
    || !buildFeaturePromptText.includes('suggestedSourceParameterContracts')
    || !buildFeaturePromptText.includes('trust suggestedSourceParameterContracts over static compact recipe-row slots')
    || !buildFeaturePromptText.includes('sourcePlan.pattern.usePolicy')
    || !buildFeaturePromptText.includes('Source roles tell you where')
    || !buildFeaturePromptText.includes('adapt advisory-only field schema')
    || !buildFeaturePromptText.includes('valueShape')
    || !buildFeaturePromptText.includes('sourceTextRequestHintKeys')
    || !buildFeaturePromptText.includes('aurelia_authoring_orientation')
    || !buildFeaturePromptText.includes('analysisDepth=binding-observation')
    || !buildFeaturePromptText.includes('aurelia_app_query_batch')
    || !buildFeaturePromptText.includes('binding-value-channel-summary')
    || !buildFeaturePromptText.includes('binding-data-flow-summary')
    || !buildFeaturePromptText.includes('binding-observed-dependency-summary')
    || !buildFeaturePromptText.includes('profiling fields off'));

  recordProbeFailure('legacyGuidanceFallbacks', typeof featureGoalLayoutGridDisplayText !== 'string'
    || !featureGoalLayoutGridDisplayText.includes('Feature goal signals: none matched; using focus/default recipe order as broad fallback context, not as a scaffold recommendation.')
    || !featureGoalLayoutGridDisplayText.includes('Next: no confident recipe path was selected')
    || featureGoalLayoutGridSignalKeys.includes('searchable-list')
    || typeof featureGoalRepositoryBrowserDisplayText !== 'string'
    || !featureGoalRepositoryBrowserDisplayText.includes('Feature goal signals: none matched; using focus/default recipe order as broad fallback context, not as a scaffold recommendation.')
    || !featureGoalRepositoryBrowserDisplayText.includes('Next: no confident recipe path was selected')
    || featureGoalRepositoryBrowserSignalKeys.includes('service-boundary')
    || typeof customerCatalogGuidanceDisplayText !== 'string'
    || !customerCatalogGuidanceDisplayText.includes('Feature goal signals: none matched; using focus/default recipe order as broad fallback context, not as a scaffold recommendation.')
    || !customerCatalogGuidanceDisplayText.includes('Next: no confident recipe path was selected')
    || customerCatalogSignalKeys.includes('catalog-product'));
  recordProbeFailure('legacyCatalogGuidance', typeof featureGoalPricingProductTiersDisplayText !== 'string'
    || !featureGoalPricingProductTiersDisplayText.includes('Feature goal signals: catalog-product (feature-surface).')
    || !featureGoalPricingProductTiersDisplayText.includes('Recipe path: start with catalog-storefront for catalog-product.')
    || !featureGoalPricingProductTiersDisplayText.includes('catalog-entity=Product Tier, catalog-collection=productTiers')
    || !featureGoalPricingProductTiersDisplayText.includes('inline list-card markup')
    || featureGoalPricingProductTiersDisplayText.includes('state-owned selection/action methods')
    || featureGoalPricingProductTiersDisplayText.includes('direct search/checked/select filter bindings')
    || featureGoalPricingProductTiersValue?.recipePlanSequence?.[0]?.recipeKey !== 'catalog-storefront'
    || typeof productListGuidanceDisplayText !== 'string'
    || !productListGuidanceDisplayText.includes('Recipe path: start with catalog-storefront for searchable-list, catalog-product.')
    || productListGuidanceDisplayText.includes('Recipe path: start with routed-catalog-storefront for searchable-list, catalog-product.')
    || productListGuidanceValue?.recipePlanSequence?.[0]?.recipeKey !== 'catalog-storefront'
    || productListGuidanceValue?.recipePlanSequence?.[0]?.usage !== 'source-plan-start'
    || typeof featureGoalCheckoutDisplayText !== 'string'
    || !featureGoalCheckoutDisplayText.includes('Feature goal signals: form-entry (feature-surface), multi-step-form (feature-surface), catalog-product (feature-surface).')
    || !featureGoalCheckoutDisplayText.includes('Recipe path: start with multi-step-state-backed-form for form-entry, multi-step-form; then borrow catalog-storefront patterns for catalog-product.')
    || !featureGoalCheckoutDisplayText.includes('Suggested sourceParameterValues: multi-step-state-backed-form:')
    || !featureGoalCheckoutDisplayText.includes('wizard-steps=cart, shipping, payment')
    || !featureGoalCheckoutDisplayText.includes('wizard-section-fields=shipping: shipping address; payment: payment method select')
    || featureGoalCheckoutValue?.recipePlanSequence?.[0]?.recipeKey !== 'multi-step-state-backed-form'
    || featureGoalCheckoutValue?.recipePlanSequence?.[1]?.recipeKey !== 'catalog-storefront'
    || typeof featureGoalRoutedCatalogCheckoutDisplayText !== 'string'
    || !featureGoalRoutedCatalogCheckoutDisplayText.includes('Feature goal signals: routing (navigation-frame), searchable-list (feature-surface), multi-step-form (feature-surface), catalog-product (feature-surface).')
    || !featureGoalRoutedCatalogCheckoutDisplayText.includes('Recipe path: start with routed-catalog-storefront for routing, searchable-list, catalog-product; then borrow multi-step-state-backed-form patterns for multi-step-form.')
    || featureGoalRoutedCatalogCheckoutValue?.recipePlanSequence?.[0]?.recipeKey !== 'routed-catalog-storefront'
    || featureGoalRoutedCatalogCheckoutValue?.recipePlanSequence?.[1]?.recipeKey !== 'multi-step-state-backed-form'
    || typeof featureGoalProductCatalogCompareDisplayText !== 'string'
    || !featureGoalProductCatalogCompareDisplayText.includes('Suggested sourceParameterValues: routed-catalog-storefront: detail-route-parameter=productId, list-route-path=products, list-route-title=Products, catalog-entity=Product, catalog-collection=products, catalog-fields=name, description, category select')
    || !featureGoalProductCatalogCompareDisplayText.includes('Suggested sourceParameterValue contracts: routed-catalog-storefront: detail-route-parameter{route-parameter-name/source-text-input}, list-route-path{route-path/source-text-input}, list-route-title{route-title/source-text-input}, catalog-entity{domain-title/source-text-input}, catalog-collection{source-member-name/source-text-input}, catalog-fields{field-schema-list/source-text-input}.')
    || featureGoalProductCatalogCompareValue?.recipePlanSequence?.[0]?.recipeKey !== 'routed-catalog-storefront'
    || featureGoalProductCatalogCompareValue?.recipePlanSequence?.[0]?.suggestedSourceParameterValues?.some((row) => row.key === 'catalog-fields' && row.value === 'name, description, category select') !== true
    || !hasSuggestedSourceParameterContract(featureGoalProductCatalogCompareValue?.recipePlanSequence?.[0], 'detail-route-parameter', 'route-parameter-name', 'source-text-input')
    || !hasSuggestedSourceParameterContract(featureGoalProductCatalogCompareValue?.recipePlanSequence?.[0], 'list-route-path', 'route-path', 'source-text-input')
    || !hasSuggestedSourceParameterContract(featureGoalProductCatalogCompareValue?.recipePlanSequence?.[0], 'catalog-fields', 'field-schema-list', 'source-text-input'));
  recordProbeFailure('legacyCollectionGuidance', typeof featureGoalProjectBoardDisplayText !== 'string'
    || !featureGoalProjectBoardDisplayText.includes('Suggested sourceParameterValues: searchable-data-table: table-entity=Task, table-collection=tasks, table-filter-fields=name, assignee select')
    || !featureGoalProjectBoardDisplayText.includes('Suggested sourceParameterValue contracts: searchable-data-table: table-entity{domain-title/source-text-input}, table-collection{source-member-name/source-text-input}, table-filter-fields{field-schema-list/source-text-input}.')
    || featureGoalProjectBoardDisplayText.includes('Board Assignee')
    || featureGoalProjectBoardValue?.recipePlanSequence?.[0]?.suggestedSourceParameterValues?.some((row) => row.key === 'table-entity' && row.value === 'Task') !== true
    || !hasSuggestedSourceParameterContract(featureGoalProjectBoardValue?.recipePlanSequence?.[0], 'table-entity', 'domain-title', 'source-text-input')
    || !hasSuggestedSourceParameterContract(featureGoalProjectBoardValue?.recipePlanSequence?.[0], 'table-collection', 'source-member-name', 'source-text-input')
    || !hasSuggestedSourceParameterContract(featureGoalProjectBoardValue?.recipePlanSequence?.[0], 'table-filter-fields', 'field-schema-list', 'source-text-input')
    || typeof featureGoalProjectManagementWorkspaceDisplayText !== 'string'
    || !featureGoalProjectManagementWorkspaceDisplayText.includes('service-boundary (integration-boundary), service-write-boundary (integration-boundary)')
    || !featureGoalProjectManagementWorkspaceDisplayText.includes('Recipe path: start with routed-searchable-data-table for routing, searchable-list, service-boundary; then borrow routed-service-backed-form patterns for form-entry, service-write-boundary.')
    || !featureGoalProjectManagementWorkspaceDisplayText.includes('table-filter-fields=name, assignee select, due date')
    || !featureGoalProjectManagementWorkspaceDisplayText.includes('request-fields=name, assignee select, due date, comments')
    || featureGoalProjectManagementWorkspaceDisplayText.includes('due date filters')
    || featureGoalProjectManagementWorkspaceValue?.recipePlanSequence?.[0]?.recipeKey !== 'routed-searchable-data-table'
    || featureGoalProjectManagementWorkspaceValue?.recipePlanSequence?.[1]?.recipeKey !== 'routed-service-backed-form'
    || typeof featureGoalRepositoryOwnerFiltersDisplayText !== 'string'
    || !featureGoalRepositoryOwnerFiltersDisplayText.includes('table-entity=Repository, table-collection=repositories, table-filter-fields=name, owner, language select, archived toggle, starred toggle, table-options=language: typescript, javascript, c#')
    || !featureGoalRepositoryOwnerFiltersDisplayText.includes('table-options{option-schema-list/source-text-input}')
    || featureGoalRepositoryOwnerFiltersDisplayText.includes('table-entity=By Owner')
    || featureGoalRepositoryOwnerFiltersDisplayText.includes('language typescript select')
    || featureGoalRepositoryOwnerFiltersValue?.recipePlanSequence?.[0]?.recipeKey !== 'searchable-data-table'
    || !hasSuggestedSourceParameterContract(featureGoalRepositoryOwnerFiltersValue?.recipePlanSequence?.[0], 'table-options', 'option-schema-list', 'source-text-input')
    || typeof featureGoalStatePluginTodoDisplayText !== 'string'
    || !featureGoalStatePluginTodoDisplayText.includes('Feature goal signals: searchable-list (feature-surface), state-plugin (architecture-choice).')
    || !featureGoalStatePluginTodoDisplayText.includes('Recipe path: start with state-store-list for state-plugin; then borrow searchable-data-table patterns for searchable-list.')
    || featureGoalStatePluginTodoValue?.recipePlanSequence?.[0]?.recipeKey !== 'state-store-list'
    || featureGoalStatePluginTodoValue?.recipePlanSequence?.[1]?.recipeKey !== 'searchable-data-table'
    || featureGoalStatePluginTodoDisplayText.includes('filters select')
    || typeof featureGoalStatePluginProjectTaskDisplayText !== 'string'
    || !featureGoalStatePluginProjectTaskDisplayText.includes('state-store-list: store-item=Project Task, store-collection=projectTasks')
    || !featureGoalStatePluginProjectTaskDisplayText.includes('searchable-data-table: table-entity=Project Task, table-collection=projectTasks, table-filter-fields=name, status select')
    || featureGoalStatePluginProjectTaskDisplayText.includes('table-entity=Status')
    || featureGoalStatePluginProjectTaskValue?.recipePlanSequence?.[0]?.recipeKey !== 'state-store-list'
    || featureGoalStatePluginProjectTaskValue?.recipePlanSequence?.[1]?.recipeKey !== 'searchable-data-table'
    || typeof featureGoalPlainTodoDisplayText !== 'string'
    || !featureGoalPlainTodoDisplayText.includes('Feature goal signals: searchable-list (feature-surface).')
    || featureGoalPlainTodoDisplayText.includes('state-plugin')
    || featureGoalPlainTodoDisplayText.includes('filters select')
    || featureGoalPlainTodoValue?.recipePlanSequence?.[0]?.recipeKey !== 'searchable-data-table'
    || featureGoalPlainTodoValue?.recipePlanSequence?.[0]?.suggestedSourceParameterValues?.some((row) => row.key === 'table-filter-fields')
    || typeof featureGoalCustomerAccountListDisplayText !== 'string'
    || !featureGoalCustomerAccountListDisplayText.includes('Recipe searchable-data-table: Use for searchable list/table starters')
    || !featureGoalCustomerAccountListDisplayText.includes('a native search value channel with debounce')
    || featureGoalCustomerAccountListDisplayText.includes('native value/select/checked channels')
    || featureGoalCustomerAccountListDisplayText.includes('filter/sort/page projections')
    || featureGoalCustomerAccountListValue?.recipes?.[0]?.expectedEffectCount !== 41
    || featureGoalCustomerAccountListValue?.recipes?.[0]?.sourcePattern?.usePolicy !== 'apply-as-source-start'
    || featureGoalCustomerAccountListValue?.recipes?.[0]?.sourcePattern?.codeEconomyPolicy !== 'production-terse'
    || featureGoalCustomerAccountListValue?.recipes?.[0]?.tasteValueKeys?.includes('checked-model-binding') === true
    || featureGoalCustomerAccountListValue?.recipes?.[0]?.tasteValueKeys?.includes('select-model-binding') === true
    || featureGoalCustomerAccountListValue?.recipes?.[0]?.sourcePattern?.parameters?.some((row) => row.key === 'table-collection' && row.summary.includes('filter/sort/page state')) === true);
  recordProbeFailure('legacyFeatureGoalBasics', typeof featureGoalGuidance.structuredContent?.value?.summary !== 'string'
    || typeof featureGoalGuidanceDisplayText !== 'string'
    || !featureGoalGuidanceDisplayText.includes('Recipe routed-localized-validated-state-backed-form')
    || !featureGoalGuidanceDisplayText.includes('Recipe routed-searchable-data-table')
    || !featureGoalGuidanceDisplayText.includes('Decision route-selected-state')
    || !featureGoalGuidanceValue?.featureGoalSignals?.some((row) => row.key === 'localization')
    || featureGoalGuidanceValue?.returnedRecipeCount > 6
    || !featureGoalTokenSignalKeys.includes('composition')
    || featureGoalTokenSignalKeys.includes('searchable-list')
    || !featureGoalChatMessagesSignalKeys.includes('searchable-list')
    || featureGoalChatMessagesSignalKeys.includes('validation')
    || typeof featureGoalFieldLabelsDisplayText !== 'string'
    || !featureGoalFieldLabelsDisplayText.includes('Feature goal signals: form-entry (feature-surface)')
    || !featureGoalFieldLabelsSignalKeys.includes('form-entry')
    || featureGoalFieldLabelsSignalKeys.includes('localization')
    || typeof featureGoalValidatedFormDisplayText !== 'string'
    || !featureGoalValidatedFormDisplayText.includes('Recipe path: start with validated-state-backed-form for form-entry, validation.')
    || featureGoalValidatedFormDisplayText.includes('Recipe path: start with multi-step-state-backed-form for form-entry, validation.')
    || featureGoalValidatedFormValue?.recipePlanSequence?.[0]?.recipeKey !== 'validated-state-backed-form'
    || typeof featureGoalRoutedValidatedFormDisplayText !== 'string'
    || !featureGoalRoutedValidatedFormDisplayText.includes('Feature goal signals: routing (navigation-frame), form-entry (feature-surface), validation (framework-capability)')
    || !featureGoalRoutedValidatedFormDisplayText.includes('Recipe path: start with routed-validated-state-backed-form for routing, form-entry, validation.')
    || featureGoalRoutedValidatedFormDisplayText.includes('start with routed-localized-validated-state-backed-form')
    || featureGoalRoutedValidatedFormValue?.recipePlanSequence?.[0]?.recipeKey !== 'routed-validated-state-backed-form'
    || featureGoalRoutedValidatedFormValue?.recipePlanSequence?.length !== 1
    || typeof featureGoalMultiStepFormDisplayText !== 'string'
    || !featureGoalMultiStepFormDisplayText.includes('Feature goal signals: form-entry (feature-surface), multi-step-form (feature-surface), validation (framework-capability)')
    || !featureGoalMultiStepFormDisplayText.includes('Recipe path: start with multi-step-state-backed-form for form-entry, multi-step-form, validation.')
    || featureGoalMultiStepFormValue?.recipePlanSequence?.[0]?.recipeKey !== 'multi-step-state-backed-form'
    || typeof featureGoalOnboardingFlowDisplayText !== 'string'
    || !featureGoalOnboardingFlowDisplayText.includes('Feature goal signals: routing (navigation-frame), form-entry (feature-surface), multi-step-form (feature-surface), validation (framework-capability)')
    || !featureGoalOnboardingFlowDisplayText.includes('Recipe path: start with multi-step-state-backed-form for form-entry, multi-step-form, validation; then borrow routed-validated-state-backed-form patterns for routing.')
    || featureGoalOnboardingFlowValue?.recipePlanSequence?.[0]?.recipeKey !== 'multi-step-state-backed-form'
    || featureGoalOnboardingFlowValue?.recipePlanSequence?.[1]?.recipeKey !== 'routed-validated-state-backed-form'
    || !featureGoalLoadingIndicatorSignalKeys.includes('searchable-list')
    || !featureGoalLoadingIndicatorSignalKeys.includes('catalog-product')
    || featureGoalLoadingIndicatorSignalKeys.includes('service-boundary'));
  recordProbeFailure('legacyFeatureGoalRoutingForms', featureGoalGuidanceValue?.recipePlanSequence?.[0]?.recipeKey !== 'routed-searchable-data-table'
    || featureGoalGuidanceValue?.recipePlanSequence?.[0]?.usage !== 'source-plan-start'
    || featureGoalGuidanceValue?.recipePlanSequence?.[1]?.usage !== 'pattern-reference'
    || featureGoalGuidanceValue?.recipePlanSequence?.[1]?.newFeatureSignals?.join('|') !== 'localization|validation'
    || featureGoalGuidanceValue?.recipes?.[0]?.recipeKey !== 'routed-searchable-data-table'
    || typeof routedSearchableGuidanceDisplayText !== 'string'
    || !routedSearchableGuidanceDisplayText.includes('Recipe path: start with routed-searchable-data-table for routing, searchable-list.')
    || !routedSearchableGuidanceDisplayText.includes('table-entity=User, table-collection=users')
    || !routedSearchableGuidanceDisplayText.includes('Next: call aurelia_authoring_recipe_plan with recipeKey=routed-searchable-data-table and usage=source-plan-start')
    || routedSearchableGuidanceDisplayText.includes('Next: choose a recipeKey')
    || routedSearchableGuidanceValue?.recipePlanSequence?.length !== 1
    || routedSearchableGuidanceValue?.recipePlanSequence?.[0]?.recipeKey !== 'routed-searchable-data-table'
    || routedSearchableGuidanceValue?.recipePlanSequence?.[0]?.usage !== 'source-plan-start'
    || typeof routedDashboardGuidanceDisplayText !== 'string'
    || !routedDashboardGuidanceDisplayText.includes('Recipe path: start with composed-dashboard for composition; then borrow routed-app-shell patterns for routing.')
    || !routedDashboardGuidanceDisplayText.includes('Recipe routed-app-shell')
    || !routedDashboardGuidanceDisplayText.includes('Source pattern: adapt-before-emitting reference material')
    || routedDashboardGuidanceDisplayText.includes('Modules: app-shell:aurelia-app-shell')
    || routedDashboardGuidanceDisplayText.includes('Adaptation slots:')
    || routedDashboardGuidanceDisplayText.includes('borrow routed-searchable-data-table patterns for routing')
    || routedDashboardGuidanceValue?.recipePlanSequence?.[0]?.recipeKey !== 'composed-dashboard'
    || routedDashboardGuidanceValue?.recipePlanSequence?.[1]?.recipeKey !== 'routed-app-shell'
    || routedDashboardGuidanceValue?.recipePlanSequence?.[1]?.usage !== 'pattern-reference'
    || routedDashboardGuidanceValue?.returnedRecipeCount !== 2
    || routedDashboardGuidanceValue?.recipes?.some((row) => row.recipeKey === 'routed-catalog-storefront' || row.recipeKey === 'routed-searchable-data-table')
    || typeof bareRoutedDashboardGuidanceDisplayText !== 'string'
    || !bareRoutedDashboardGuidanceDisplayText.includes('Feature goal signals: routing (navigation-frame).')
    || !bareRoutedDashboardGuidanceDisplayText.includes('Recipe path: start with routed-app-shell for routing.')
    || bareRoutedDashboardGuidanceDisplayText.includes('Recipe path: start with composed-dashboard')
    || bareRoutedDashboardGuidanceValue?.recipePlanSequence?.[0]?.recipeKey !== 'routed-app-shell'
    || bareRoutedDashboardGuidanceValue?.returnedRecipeCount !== 1
    || bareRoutedDashboardGuidanceValue?.recipes?.[0]?.recipeKey !== 'routed-app-shell'
    || typeof routePluralShellGuidanceDisplayText !== 'string'
    || !routePluralShellGuidanceDisplayText.includes('Feature goal signals: routing (navigation-frame), app-shell (app-shell).')
    || routePluralShellGuidanceValue?.recipePlanSequence?.[0]?.recipeKey !== 'routed-app-shell'
    || typeof shellSectionsGuidanceDisplayText !== 'string'
    || !shellSectionsGuidanceDisplayText.includes('Suggested sourceParameterValues: routed-app-shell: section-routes=Dashboard, Settings')
    || !shellSectionsGuidanceDisplayText.includes('section-routes{route-section-list/source-text-input}')
    || shellSectionsGuidanceValue?.recipePlanSequence?.[0]?.suggestedSourceParameterValues?.some((row) => row.key === 'section-routes' && row.value === 'Dashboard, Settings') !== true
    || typeof featureGoalPreferencesDisplayText !== 'string'
    || !featureGoalPreferencesDisplayText.includes('Feature goal signals: form-entry (feature-surface).')
    || !featureGoalPreferencesDisplayText.includes('Recipe path: start with state-backed-form for form-entry.')
    || featureGoalPreferencesValue?.recipePlanSequence?.[0]?.recipeKey !== 'state-backed-form'
    || featureGoalPreferencesValue?.returnedRecipeCount !== 1
    || featureGoalPreferencesValue?.recipes?.[0]?.recipeKey !== 'state-backed-form'
    || typeof featureGoalContactSubmitDisplayText !== 'string'
    || !featureGoalContactSubmitDisplayText.includes('Feature goal signals: form-entry (feature-surface).')
    || !featureGoalContactSubmitDisplayText.includes('request-fields=name, email, message')
    || !featureGoalContactSubmitDisplayText.includes('no scalar ID component boundary')
    || featureGoalContactSubmitDisplayText.includes('request-selection-id=contactId')
    || featureGoalContactSubmitDisplayText.includes('service-boundary')
    || featureGoalContactSubmitValue?.recipePlanSequence?.[0]?.recipeKey !== 'state-backed-form'
    || featureGoalContactSubmitValue?.returnedRecipeCount !== 1
    || typeof featureGoalContactMessageDisplayText !== 'string'
    || !featureGoalContactMessageDisplayText.includes('Feature goal signals: form-entry (feature-surface).')
    || !featureGoalContactMessageDisplayText.includes('request-fields=email, message')
    || !featureGoalContactMessageDisplayText.includes('no scalar ID component boundary')
    || !featureGoalContactMessageDisplayText.includes('DI-owned draft domain object')
    || featureGoalContactMessageDisplayText.includes('request-fields=message')
    || featureGoalContactMessageDisplayText.includes('request-selection-id=contactId')
    || featureGoalContactMessageDisplayText.includes('adapt caller domain names')
    || featureGoalContactMessageValue?.recipePlanSequence?.[0]?.recipeKey !== 'state-backed-form'
    || typeof featureGoalApiSignupDisplayText !== 'string'
    || !featureGoalApiSignupDisplayText.includes('service-backed-form: request-entity=Signup, request-fields=email, password, terms toggle')
    || !featureGoalApiSignupDisplayText.includes('no scalar ID component boundary')
    || !featureGoalApiSignupDisplayText.includes('injected service submission boundary')
    || featureGoalApiSignupDisplayText.includes('request-selection-id=signupId')
    || featureGoalApiSignupDisplayText.includes('request-options')
    || featureGoalApiSignupDisplayText.includes('adapt-before-emitting')
    || featureGoalApiSignupValue?.recipePlanSequence?.[0]?.recipeKey !== 'service-backed-form'
    || typeof featureGoalCustomerIntakeDisplayText !== 'string'
    || !featureGoalCustomerIntakeDisplayText.includes('service-backed-form: request-entity=Customer Intake, request-fields=company name, contact email, plan select, terms toggle')
    || featureGoalCustomerIntakeDisplayText.includes('request-fields=company name, email')
    || featureGoalCustomerIntakeDisplayText.includes('request-selection-id=customerIntakeId')
    || featureGoalCustomerIntakeValue?.recipePlanSequence?.[0]?.recipeKey !== 'service-backed-form'
    || typeof featureGoalCustomerServiceDisplayText !== 'string'
    || !featureGoalCustomerServiceDisplayText.includes('Feature goal signals: form-entry (feature-surface).')
    || featureGoalCustomerServiceDisplayText.includes('service-boundary')
    || featureGoalCustomerServiceValue?.recipePlanSequence?.[0]?.recipeKey !== 'state-backed-form');
  recordProbeFailure('legacyFeatureGoalAdminAndControls', typeof featureGoalInventoryEditDisplayText !== 'string'
    || !featureGoalInventoryEditDisplayText.includes('Feature goal signals: routing (navigation-frame), searchable-list (feature-surface), form-entry (feature-surface), validation (framework-capability).')
    || featureGoalInventoryEditValue?.featureGoalSignals?.find((row) => row.key === 'form-entry')?.matchedTerms?.includes('editable+fields') !== true
    || !featureGoalInventoryEditDisplayText.includes('table-filter-fields=name, stock number')
    || !featureGoalInventoryEditDisplayText.includes('request-fields=stock number')
    || featureGoalInventoryEditValue?.recipePlanSequence?.[0]?.recipeKey !== 'routed-searchable-data-table'
    || featureGoalInventoryEditValue?.recipePlanSequence?.[1]?.recipeKey !== 'routed-validated-state-backed-form'
    || typeof featureGoalProductAdminTableDisplayText !== 'string'
    || !featureGoalProductAdminTableDisplayText.includes('Feature goal signals: routing (navigation-frame), searchable-list (feature-surface), form-entry (feature-surface).')
    || featureGoalProductAdminTableValue?.featureGoalSignals?.some((row) => row.key === 'catalog-product')
    || !featureGoalProductAdminTableDisplayText.includes('Recipe path: start with routed-searchable-data-table for routing, searchable-list; then borrow routed-state-backed-form patterns for form-entry.')
    || !featureGoalProductAdminTableDisplayText.includes('table-entity=Product, table-collection=products, table-filter-fields=name, status select, category select')
    || !featureGoalProductAdminTableDisplayText.includes('routed-state-backed-form: request-entity=Product, request-selection-id=productId, request-fields=name, status select, category select')
    || featureGoalProductAdminTableDisplayText.includes('table select')
    || featureGoalProductAdminTableValue?.recipePlanSequence?.[0]?.recipeKey !== 'routed-searchable-data-table'
    || featureGoalProductAdminTableValue?.recipePlanSequence?.[1]?.recipeKey !== 'routed-state-backed-form'
    || typeof featureGoalSupportInboxDisplayText !== 'string'
    || !featureGoalSupportInboxDisplayText.includes('Feature goal signals: routing (navigation-frame), searchable-list (feature-surface), form-entry (feature-surface), localization (framework-capability), validation (framework-capability).')
    || !featureGoalSupportInboxDisplayText.includes('Recipe path: start with routed-searchable-data-table for routing, searchable-list; then borrow routed-localized-validated-state-backed-form patterns for form-entry, localization, validation.')
    || !featureGoalSupportInboxDisplayText.includes('detail-route-parameter=conversationId')
    || featureGoalSupportInboxValue?.recipePlanSequence?.[0]?.recipeKey !== 'routed-searchable-data-table'
    || featureGoalSupportInboxValue?.recipePlanSequence?.[1]?.recipeKey !== 'routed-localized-validated-state-backed-form'
    || typeof featureGoalOrderManagementDisplayText !== 'string'
    || !featureGoalOrderManagementDisplayText.includes('table-options=status: draft, submitted, shipped, cancelled')
    || !featureGoalOrderManagementDisplayText.includes('request-options=status: draft, submitted, shipped, cancelled')
    || featureGoalOrderManagementDisplayText.includes('table-options=status: draft, submitted, shipped, cancelled, editable shipping address')
    || featureGoalOrderManagementValue?.recipePlanSequence?.[0]?.recipeKey !== 'routed-searchable-data-table'
    || featureGoalOrderManagementValue?.recipePlanSequence?.[1]?.recipeKey !== 'routed-service-validated-state-backed-form'
    || typeof featureGoalAccountSettingsControlsDisplayText !== 'string'
    || !featureGoalAccountSettingsControlsDisplayText.includes('request-entity=Account, request-selection-id=accountId, request-fields=notification toggle, preferred language select, api key')
    || featureGoalAccountSettingsControlsValue?.recipePlanSequence?.[0]?.suggestedSourceParameterValues?.some((row) => row.key === 'request-fields' && row.value === 'notification toggle, preferred language select, api key') !== true
    || featureGoalAccountSettingsControlsValue?.featureGoalSignals?.some((row) => row.key === 'service-write-boundary')
    || typeof featureGoalAccountSettingsOptionsDisplayText !== 'string'
    || !featureGoalAccountSettingsOptionsDisplayText.includes('request-entity=Account, request-selection-id=accountId, request-fields=timezone select, email notifications toggle, preferred theme select, request-options=timezone: utc, cet, est; preferred theme: light, dark, system')
    || !featureGoalAccountSettingsOptionsDisplayText.includes('request-options{option-schema-list/source-text-input}')
    || featureGoalAccountSettingsOptionsDisplayText.includes('timezone utc select')
    || featureGoalAccountSettingsOptionsDisplayText.includes('preferred theme light select')
    || featureGoalAccountSettingsOptionsValue?.recipePlanSequence?.[0]?.recipeKey !== 'state-backed-form'
    || !hasSuggestedSourceParameterContract(featureGoalAccountSettingsOptionsValue?.recipePlanSequence?.[0], 'request-options', 'option-schema-list', 'source-text-input')
    || typeof featureGoalTeamMemberEditorDisplayText !== 'string'
    || !featureGoalTeamMemberEditorDisplayText.includes('Feature goal signals: routing (navigation-frame), form-entry (feature-surface), validation (framework-capability).')
    || !featureGoalTeamMemberEditorDisplayText.includes('Recipe path: start with routed-validated-state-backed-form for routing, form-entry, validation.')
    || !featureGoalTeamMemberEditorDisplayText.includes('request-entity=Team Member, request-selection-id=teamMemberId, request-fields=role select, active toggle, start date, weekly hours number')
    || featureGoalTeamMemberEditorValue?.recipePlanSequence?.[0]?.recipeKey !== 'routed-validated-state-backed-form'
    || featureGoalTeamMemberEditorValue?.recipePlanSequence?.length !== 1
    || featureGoalTeamMemberEditorValue?.recipePlanSequence?.[0]?.suggestedSourceParameterValues?.some((row) => row.key === 'request-fields' && row.value === 'role select, active toggle, start date, weekly hours number') !== true
    || typeof featureGoalTeamMemberOptionsDisplayText !== 'string'
    || !featureGoalTeamMemberOptionsDisplayText.includes('request-entity=Team Member, request-selection-id=teamMemberId, request-fields=role select, permission checkboxes, active toggle, start date, weekly hours number, request-options=role: owner, maintainer, viewer; permission: read, write, administer')
    || !featureGoalTeamMemberOptionsDisplayText.includes('request-options{option-schema-list/source-text-input}')
    || featureGoalTeamMemberOptionsDisplayText.includes('request-options{domain-collection-summary/advisory-only}')
    || featureGoalTeamMemberOptionsValue?.recipePlanSequence?.[0]?.recipeKey !== 'routed-validated-state-backed-form'
    || !hasSuggestedSourceParameterContract(featureGoalTeamMemberOptionsValue?.recipePlanSequence?.[0], 'request-options', 'option-schema-list', 'source-text-input')
    || typeof featureGoalTenantAdminApiSaveDisplayText !== 'string'
    || !featureGoalTenantAdminApiSaveDisplayText.includes('Feature goal signals: routing (navigation-frame), searchable-list (feature-surface), form-entry (feature-surface), validation (framework-capability), service-boundary (integration-boundary), service-write-boundary (integration-boundary).')
    || !featureGoalTenantAdminApiSaveDisplayText.includes('Recipe path: start with routed-searchable-data-table for routing, searchable-list, service-boundary; then borrow routed-service-validated-state-backed-form patterns for form-entry, validation, service-write-boundary.')
    || !featureGoalTenantAdminApiSaveDisplayText.includes('routed-service-validated-state-backed-form: request-entity=Account, request-selection-id=accountId')
    || featureGoalTenantAdminApiSaveValue?.recipePlanSequence?.[0]?.recipeKey !== 'routed-searchable-data-table'
    || featureGoalTenantAdminApiSaveValue?.recipePlanSequence?.[1]?.recipeKey !== 'routed-service-validated-state-backed-form'
    || featureGoalTenantAdminApiSaveValue?.recipePlanSequence?.length !== 2
    || typeof featureGoalProfileEditorDisplayText !== 'string'
    || !featureGoalProfileEditorDisplayText.includes('Feature goal signals: form-entry (feature-surface).')
    || !featureGoalProfileEditorDisplayText.includes('request-fields=avatar url, preferred contact method select')
    || featureGoalProfileEditorDisplayText.includes('request-selection-id=userProfileId')
    || featureGoalProfileEditorValue?.recipePlanSequence?.[0]?.recipeKey !== 'state-backed-form'
    || typeof featureGoalAccountEditorDisplayText !== 'string'
    || !featureGoalAccountEditorDisplayText.includes('state-backed-form: request-entity=Account, request-fields=display name, timezone select')
    || featureGoalAccountEditorDisplayText.includes('request-selection-id=accountId')
    || featureGoalAccountEditorValue?.recipePlanSequence?.[0]?.recipeKey !== 'state-backed-form'
    || typeof featureGoalProfileFormDisplayText !== 'string'
    || !featureGoalProfileFormDisplayText.includes('state-backed-form: request-entity=Profile, request-fields=name, email')
    || featureGoalProfileFormDisplayText.includes('request-selection-id=profileId')
    || featureGoalProfileFormValue?.recipePlanSequence?.[0]?.recipeKey !== 'state-backed-form'
    || typeof featureGoalProfileDetailsDisplayText !== 'string'
    || !featureGoalProfileDetailsDisplayText.includes('Feature goal signals: searchable-list (feature-surface).')
    || !featureGoalProfileDetailsDisplayText.includes('table-filter-fields=name, department select')
    || featureGoalProfileDetailsDisplayText.includes('form-entry')
    || featureGoalProfileDetailsValue?.recipePlanSequence?.[0]?.recipeKey !== 'searchable-data-table'
    || featureGoalProfileDetailsValue?.recipePlanSequence?.length !== 1
    || typeof featureGoalRoutedSettingsDisplayText !== 'string'
    || !featureGoalRoutedSettingsDisplayText.includes('Feature goal signals: routing (navigation-frame), form-entry (feature-surface).')
    || !featureGoalRoutedSettingsDisplayText.includes('Recipe path: start with routed-state-backed-form for routing, form-entry.')
    || featureGoalRoutedSettingsValue?.recipePlanSequence?.[0]?.recipeKey !== 'routed-state-backed-form'
    || typeof featureGoalRouteOnlySettingsDisplayText !== 'string'
    || !featureGoalRouteOnlySettingsDisplayText.includes('Feature goal signals: routing (navigation-frame).')
    || !featureGoalRouteOnlySettingsDisplayText.includes('Recipe path: start with routed-app-shell for routing.')
    || !featureGoalRouteOnlySettingsDisplayText.includes('section-routes=Dashboard, Settings')
    || featureGoalRouteOnlySettingsValue?.featureGoalSignals?.some((row) => row.key === 'form-entry')
    || featureGoalRouteOnlySettingsValue?.recipePlanSequence?.[0]?.recipeKey !== 'routed-app-shell'
    || featureGoalRouteOnlySettingsValue?.recipePlanSequence?.[0]?.suggestedSourceParameterValues?.some((row) => row.key === 'section-routes' && row.value === 'Dashboard, Settings') !== true
    || typeof featureGoalAdminSearchEditDisplayText !== 'string'
    || !featureGoalAdminSearchEditDisplayText.includes('Feature goal signals: searchable-list (feature-surface), form-entry (feature-surface).')
    || !featureGoalAdminSearchEditDisplayText.includes('Recipe path: start with searchable-data-table for searchable-list; then borrow state-backed-form patterns for form-entry.')
    || featureGoalAdminSearchEditValue?.recipePlanSequence?.[0]?.recipeKey !== 'searchable-data-table'
    || featureGoalAdminSearchEditValue?.recipePlanSequence?.[1]?.recipeKey !== 'state-backed-form'
    || featureGoalAdminSearchEditValue?.returnedRecipeCount !== 2
    || featureGoalAdminSearchEditValue?.recipes?.some((row) => row.recipeKey === 'catalog-storefront')
    || typeof adminSearchSignal?.primaryWeight !== 'number'
    || typeof adminFormSignal?.primaryWeight !== 'number'
    || adminSearchSignal.primaryWeight <= adminFormSignal.primaryWeight
    || typeof featureGoalAuthenticatedAdminDisplayText !== 'string'
    || !featureGoalAuthenticatedAdminDisplayText.includes('Feature goal signals: searchable-list (feature-surface), form-entry (feature-surface), localization (framework-capability).')
    || !featureGoalAuthenticatedAdminDisplayText.includes('searchable-data-table: table-entity=Audit Log, table-collection=auditLogs')
    || !featureGoalAuthenticatedAdminDisplayText.includes('localized-state-backed-form: request-entity=Profile, request-selection-id=profileId, request-fields=permission checkboxes')
    || featureGoalAuthenticatedAdminDisplayText.includes('permission toggle')
    || featureGoalAuthenticatedAdminDisplayText.includes('table-entity=Localization')
    || featureGoalAuthenticatedAdminValue?.recipePlanSequence?.[0]?.recipeKey !== 'searchable-data-table'
    || featureGoalAuthenticatedAdminValue?.recipePlanSequence?.[1]?.recipeKey !== 'localized-state-backed-form'
    || typeof featureGoalCrudFormsDisplayText !== 'string'
    || !featureGoalCrudFormsDisplayText.includes('Feature goal signals: searchable-list (feature-surface), form-entry (feature-surface).')
    || !crudFormsSignal?.matchedTerms?.includes('edit+forms')
    || !crudFormsSignal?.matchedTerms?.includes('create+forms')
    || featureGoalCrudFormsValue?.recipePlanSequence?.[0]?.recipeKey !== 'searchable-data-table'
    || featureGoalCrudFormsValue?.recipePlanSequence?.[1]?.recipeKey !== 'state-backed-form'
    || !featureGoalCrudFormsDisplayText.includes('searchable-data-table: table-entity=Order, table-collection=orders')
    || !featureGoalCrudFormsDisplayText.includes('state-backed-form: request-entity=Order, request-selection-id=orderId')
    || featureGoalCrudFormsValue?.recipePlanSequence?.[0]?.suggestedSourceParameterValues?.some((row) => row.key === 'table-entity' && row.value === 'Order') !== true
    || featureGoalCrudFormsValue?.recipePlanSequence?.[1]?.suggestedSourceParameterValues?.some((row) => row.key === 'request-entity' && row.value === 'Order') !== true);
  recordProbeFailure('admin-inventory-edit', typeof featureGoalInventoryEditDisplayText !== 'string'
    || !featureGoalInventoryEditDisplayText.includes('Feature goal signals: routing (navigation-frame), searchable-list (feature-surface), form-entry (feature-surface), validation (framework-capability).')
    || featureGoalInventoryEditValue?.featureGoalSignals?.find((row) => row.key === 'form-entry')?.matchedTerms?.includes('editable+fields') !== true
    || !featureGoalInventoryEditDisplayText.includes('table-filter-fields=name, stock number')
    || !featureGoalInventoryEditDisplayText.includes('request-fields=stock number')
    || featureGoalInventoryEditValue?.recipePlanSequence?.[0]?.recipeKey !== 'routed-searchable-data-table'
    || featureGoalInventoryEditValue?.recipePlanSequence?.[1]?.recipeKey !== 'routed-validated-state-backed-form');
  recordProbeFailure('admin-product-table', typeof featureGoalProductAdminTableDisplayText !== 'string'
    || !featureGoalProductAdminTableDisplayText.includes('Feature goal signals: routing (navigation-frame), searchable-list (feature-surface), form-entry (feature-surface).')
    || featureGoalProductAdminTableValue?.featureGoalSignals?.some((row) => row.key === 'catalog-product')
    || !featureGoalProductAdminTableDisplayText.includes('Recipe path: start with routed-searchable-data-table for routing, searchable-list; then borrow routed-state-backed-form patterns for form-entry.')
    || !featureGoalProductAdminTableDisplayText.includes('table-entity=Product, table-collection=products, table-filter-fields=name, status select, category select')
    || !featureGoalProductAdminTableDisplayText.includes('routed-state-backed-form: request-entity=Product, request-selection-id=productId, request-fields=name, status select, category select')
    || featureGoalProductAdminTableDisplayText.includes('table select')
    || featureGoalProductAdminTableValue?.recipePlanSequence?.[0]?.recipeKey !== 'routed-searchable-data-table'
    || featureGoalProductAdminTableValue?.recipePlanSequence?.[1]?.recipeKey !== 'routed-state-backed-form');
  recordProbeFailure('admin-support-order', typeof featureGoalSupportInboxDisplayText !== 'string'
    || !featureGoalSupportInboxDisplayText.includes('Feature goal signals: routing (navigation-frame), searchable-list (feature-surface), form-entry (feature-surface), localization (framework-capability), validation (framework-capability).')
    || !featureGoalSupportInboxDisplayText.includes('Recipe path: start with routed-searchable-data-table for routing, searchable-list; then borrow routed-localized-validated-state-backed-form patterns for form-entry, localization, validation.')
    || !featureGoalSupportInboxDisplayText.includes('detail-route-parameter=conversationId')
    || featureGoalSupportInboxValue?.recipePlanSequence?.[0]?.recipeKey !== 'routed-searchable-data-table'
    || featureGoalSupportInboxValue?.recipePlanSequence?.[1]?.recipeKey !== 'routed-localized-validated-state-backed-form'
    || typeof featureGoalOrderManagementDisplayText !== 'string'
    || !featureGoalOrderManagementDisplayText.includes('table-options=status: draft, submitted, shipped, cancelled')
    || !featureGoalOrderManagementDisplayText.includes('request-options=status: draft, submitted, shipped, cancelled')
    || featureGoalOrderManagementDisplayText.includes('table-options=status: draft, submitted, shipped, cancelled, editable shipping address')
    || featureGoalOrderManagementValue?.recipePlanSequence?.[0]?.recipeKey !== 'routed-searchable-data-table'
    || featureGoalOrderManagementValue?.recipePlanSequence?.[1]?.recipeKey !== 'routed-service-validated-state-backed-form');
  recordProbeFailure('admin-account-settings', typeof featureGoalAccountSettingsControlsDisplayText !== 'string'
    || !featureGoalAccountSettingsControlsDisplayText.includes('request-entity=Account, request-selection-id=accountId, request-fields=notification toggle, preferred language select, api key')
    || featureGoalAccountSettingsControlsValue?.recipePlanSequence?.[0]?.suggestedSourceParameterValues?.some((row) => row.key === 'request-fields' && row.value === 'notification toggle, preferred language select, api key') !== true
    || featureGoalAccountSettingsControlsValue?.featureGoalSignals?.some((row) => row.key === 'service-write-boundary')
    || typeof featureGoalAccountSettingsOptionsDisplayText !== 'string'
    || !featureGoalAccountSettingsOptionsDisplayText.includes('request-entity=Account, request-selection-id=accountId, request-fields=timezone select, email notifications toggle, preferred theme select, request-options=timezone: utc, cet, est; preferred theme: light, dark, system')
    || !featureGoalAccountSettingsOptionsDisplayText.includes('request-options{option-schema-list/source-text-input}')
    || featureGoalAccountSettingsOptionsDisplayText.includes('timezone utc select')
    || featureGoalAccountSettingsOptionsDisplayText.includes('preferred theme light select')
    || featureGoalAccountSettingsOptionsValue?.recipePlanSequence?.[0]?.recipeKey !== 'state-backed-form'
    || !hasSuggestedSourceParameterContract(featureGoalAccountSettingsOptionsValue?.recipePlanSequence?.[0], 'request-options', 'option-schema-list', 'source-text-input'));
  recordProbeFailure('admin-team-member', typeof featureGoalTeamMemberEditorDisplayText !== 'string'
    || !featureGoalTeamMemberEditorDisplayText.includes('Feature goal signals: routing (navigation-frame), form-entry (feature-surface), validation (framework-capability).')
    || !featureGoalTeamMemberEditorDisplayText.includes('Recipe path: start with routed-validated-state-backed-form for routing, form-entry, validation.')
    || !featureGoalTeamMemberEditorDisplayText.includes('request-entity=Team Member, request-selection-id=teamMemberId, request-fields=role select, active toggle, start date, weekly hours number')
    || featureGoalTeamMemberEditorValue?.recipePlanSequence?.[0]?.recipeKey !== 'routed-validated-state-backed-form'
    || featureGoalTeamMemberEditorValue?.recipePlanSequence?.length !== 1
    || featureGoalTeamMemberEditorValue?.recipePlanSequence?.[0]?.suggestedSourceParameterValues?.some((row) => row.key === 'request-fields' && row.value === 'role select, active toggle, start date, weekly hours number') !== true
    || typeof featureGoalTeamMemberOptionsDisplayText !== 'string'
    || !featureGoalTeamMemberOptionsDisplayText.includes('request-entity=Team Member, request-selection-id=teamMemberId, request-fields=role select, permission checkboxes, active toggle, start date, weekly hours number, request-options=role: owner, maintainer, viewer; permission: read, write, administer')
    || !featureGoalTeamMemberOptionsDisplayText.includes('request-options{option-schema-list/source-text-input}')
    || featureGoalTeamMemberOptionsDisplayText.includes('request-options{domain-collection-summary/advisory-only}')
    || featureGoalTeamMemberOptionsValue?.recipePlanSequence?.[0]?.recipeKey !== 'routed-validated-state-backed-form'
    || !hasSuggestedSourceParameterContract(featureGoalTeamMemberOptionsValue?.recipePlanSequence?.[0], 'request-options', 'option-schema-list', 'source-text-input'));
  recordProbeFailure('admin-tenant-profile-routes', typeof featureGoalTenantAdminApiSaveDisplayText !== 'string'
    || !featureGoalTenantAdminApiSaveDisplayText.includes('Feature goal signals: routing (navigation-frame), searchable-list (feature-surface), form-entry (feature-surface), validation (framework-capability), service-boundary (integration-boundary), service-write-boundary (integration-boundary).')
    || !featureGoalTenantAdminApiSaveDisplayText.includes('Recipe path: start with routed-searchable-data-table for routing, searchable-list, service-boundary; then borrow routed-service-validated-state-backed-form patterns for form-entry, validation, service-write-boundary.')
    || !featureGoalTenantAdminApiSaveDisplayText.includes('routed-service-validated-state-backed-form: request-entity=Account, request-selection-id=accountId')
    || featureGoalTenantAdminApiSaveValue?.recipePlanSequence?.[0]?.recipeKey !== 'routed-searchable-data-table'
    || featureGoalTenantAdminApiSaveValue?.recipePlanSequence?.[1]?.recipeKey !== 'routed-service-validated-state-backed-form'
    || featureGoalTenantAdminApiSaveValue?.recipePlanSequence?.length !== 2
    || typeof featureGoalProfileEditorDisplayText !== 'string'
    || !featureGoalProfileEditorDisplayText.includes('Feature goal signals: form-entry (feature-surface).')
    || !featureGoalProfileEditorDisplayText.includes('request-fields=avatar url, preferred contact method select')
    || featureGoalProfileEditorDisplayText.includes('request-selection-id=userProfileId')
    || featureGoalProfileEditorValue?.recipePlanSequence?.[0]?.recipeKey !== 'state-backed-form'
    || typeof featureGoalAccountEditorDisplayText !== 'string'
    || !featureGoalAccountEditorDisplayText.includes('state-backed-form: request-entity=Account, request-fields=display name, timezone select')
    || featureGoalAccountEditorDisplayText.includes('request-selection-id=accountId')
    || featureGoalAccountEditorValue?.recipePlanSequence?.[0]?.recipeKey !== 'state-backed-form'
    || typeof featureGoalProfileDetailsDisplayText !== 'string'
    || !featureGoalProfileDetailsDisplayText.includes('Feature goal signals: searchable-list (feature-surface).')
    || !featureGoalProfileDetailsDisplayText.includes('table-filter-fields=name, department select')
    || featureGoalProfileDetailsDisplayText.includes('form-entry')
    || featureGoalProfileDetailsValue?.recipePlanSequence?.[0]?.recipeKey !== 'searchable-data-table'
    || featureGoalProfileDetailsValue?.recipePlanSequence?.length !== 1
    || typeof featureGoalRoutedSettingsDisplayText !== 'string'
    || !featureGoalRoutedSettingsDisplayText.includes('Feature goal signals: routing (navigation-frame), form-entry (feature-surface).')
    || !featureGoalRoutedSettingsDisplayText.includes('Recipe path: start with routed-state-backed-form for routing, form-entry.')
    || featureGoalRoutedSettingsValue?.recipePlanSequence?.[0]?.recipeKey !== 'routed-state-backed-form'
    || typeof featureGoalRouteOnlySettingsDisplayText !== 'string'
    || !featureGoalRouteOnlySettingsDisplayText.includes('Feature goal signals: routing (navigation-frame).')
    || !featureGoalRouteOnlySettingsDisplayText.includes('Recipe path: start with routed-app-shell for routing.')
    || !featureGoalRouteOnlySettingsDisplayText.includes('section-routes=Dashboard, Settings')
    || featureGoalRouteOnlySettingsValue?.featureGoalSignals?.some((row) => row.key === 'form-entry')
    || featureGoalRouteOnlySettingsValue?.recipePlanSequence?.[0]?.recipeKey !== 'routed-app-shell'
    || featureGoalRouteOnlySettingsValue?.recipePlanSequence?.[0]?.suggestedSourceParameterValues?.some((row) => row.key === 'section-routes' && row.value === 'Dashboard, Settings') !== true);
  recordProbeFailure('admin-search-auth-crud', typeof featureGoalAdminSearchEditDisplayText !== 'string'
    || !featureGoalAdminSearchEditDisplayText.includes('Feature goal signals: searchable-list (feature-surface), form-entry (feature-surface).')
    || !featureGoalAdminSearchEditDisplayText.includes('Recipe path: start with searchable-data-table for searchable-list; then borrow state-backed-form patterns for form-entry.')
    || featureGoalAdminSearchEditValue?.recipePlanSequence?.[0]?.recipeKey !== 'searchable-data-table'
    || featureGoalAdminSearchEditValue?.recipePlanSequence?.[1]?.recipeKey !== 'state-backed-form'
    || featureGoalAdminSearchEditValue?.returnedRecipeCount !== 2
    || featureGoalAdminSearchEditValue?.recipes?.some((row) => row.recipeKey === 'catalog-storefront')
    || typeof adminSearchSignal?.primaryWeight !== 'number'
    || typeof adminFormSignal?.primaryWeight !== 'number'
    || adminSearchSignal.primaryWeight <= adminFormSignal.primaryWeight
    || typeof featureGoalAuthenticatedAdminDisplayText !== 'string'
    || !featureGoalAuthenticatedAdminDisplayText.includes('Feature goal signals: searchable-list (feature-surface), form-entry (feature-surface), localization (framework-capability).')
    || !featureGoalAuthenticatedAdminDisplayText.includes('searchable-data-table: table-entity=Audit Log, table-collection=auditLogs')
    || !featureGoalAuthenticatedAdminDisplayText.includes('localized-state-backed-form: request-entity=Profile, request-selection-id=profileId, request-fields=permission checkboxes')
    || featureGoalAuthenticatedAdminDisplayText.includes('permission toggle')
    || featureGoalAuthenticatedAdminDisplayText.includes('table-entity=Localization')
    || featureGoalAuthenticatedAdminValue?.recipePlanSequence?.[0]?.recipeKey !== 'searchable-data-table'
    || featureGoalAuthenticatedAdminValue?.recipePlanSequence?.[1]?.recipeKey !== 'localized-state-backed-form'
    || typeof featureGoalCrudFormsDisplayText !== 'string'
    || !featureGoalCrudFormsDisplayText.includes('Feature goal signals: searchable-list (feature-surface), form-entry (feature-surface).')
    || !crudFormsSignal?.matchedTerms?.includes('edit+forms')
    || !crudFormsSignal?.matchedTerms?.includes('create+forms')
    || featureGoalCrudFormsValue?.recipePlanSequence?.[0]?.recipeKey !== 'searchable-data-table'
    || featureGoalCrudFormsValue?.recipePlanSequence?.[1]?.recipeKey !== 'state-backed-form'
    || !featureGoalCrudFormsDisplayText.includes('searchable-data-table: table-entity=Order, table-collection=orders')
    || !featureGoalCrudFormsDisplayText.includes('state-backed-form: request-entity=Order, request-selection-id=orderId')
    || featureGoalCrudFormsValue?.recipePlanSequence?.[0]?.suggestedSourceParameterValues?.some((row) => row.key === 'table-entity' && row.value === 'Order') !== true
    || featureGoalCrudFormsValue?.recipePlanSequence?.[1]?.suggestedSourceParameterValues?.some((row) => row.key === 'request-entity' && row.value === 'Order') !== true);
  recordProbeFailure('admin-project-task-domain', typeof featureGoalAdminProjectTaskSearchDisplayText !== 'string'
    || !featureGoalAdminProjectTaskSearchDisplayText.includes('searchable-data-table: table-entity=Project Task, table-collection=projectTasks, table-filter-fields=name, status select')
    || !featureGoalAdminProjectTaskSearchDisplayText.includes('state-backed-form: request-entity=Project Task, request-selection-id=projectTaskId, request-fields=name, status select')
    || featureGoalAdminProjectTaskSearchDisplayText.includes('table-entity=Admin')
    || featureGoalAdminProjectTaskSearchValue?.recipePlanSequence?.[0]?.suggestedSourceParameterValues?.some((row) => row.key === 'table-entity' && row.value === 'Project Task') !== true
    || featureGoalAdminProjectTaskSearchValue?.recipePlanSequence?.[1]?.suggestedSourceParameterValues?.some((row) => row.key === 'request-entity' && row.value === 'Project Task') !== true);
  recordProbeFailure('admin-project-task-settings-form-domain', typeof featureGoalAdminProjectTaskSettingsDisplayText !== 'string'
    || !featureGoalAdminProjectTaskSettingsDisplayText.includes('routed-searchable-data-table: detail-route-parameter=projectTaskId, list-route-path=project-tasks, list-route-title=Project Tasks, table-entity=Project Task, table-collection=projectTasks, table-filter-fields=name, status select')
    || !featureGoalAdminProjectTaskSettingsDisplayText.includes('state-backed-form: request-entity=Settings, request-fields=api key, notification toggle')
    || featureGoalAdminProjectTaskSettingsDisplayText.includes('routed-state-backed-form: request-entity=Project Task')
    || featureGoalAdminProjectTaskSettingsDisplayText.includes('request-selection-id=settingsId')
    || featureGoalAdminProjectTaskSettingsValue?.recipePlanSequence?.[1]?.suggestedSourceParameterValues?.some((row) => row.key === 'request-entity' && row.value === 'Settings') !== true
    || featureGoalAdminProjectTaskSettingsValue?.recipePlanSequence?.[1]?.suggestedSourceParameterValues?.some((row) => row.key === 'request-fields' && row.value === 'api key, notification toggle') !== true);
  recordProbeFailure('admin-project-task-api-settings-form-domain', typeof featureGoalAdminProjectTaskApiSettingsDisplayText !== 'string'
    || !featureGoalAdminProjectTaskApiSettingsDisplayText.includes('routed-searchable-data-table: detail-route-parameter=projectTaskId, list-route-path=project-tasks, list-route-title=Project Tasks, table-entity=Project Task, table-collection=projectTasks, table-filter-fields=name, status select')
    || !featureGoalAdminProjectTaskApiSettingsDisplayText.includes('service-backed-form: request-entity=Settings, request-fields=api key, notification toggle')
    || featureGoalAdminProjectTaskApiSettingsDisplayText.includes('routed-service-backed-form: request-entity=Settings')
    || featureGoalAdminProjectTaskApiSettingsDisplayText.includes('request-selection-id=settingsId')
    || featureGoalAdminProjectTaskApiSettingsValue?.recipePlanSequence?.[1]?.suggestedSourceParameterValues?.some((row) => row.key === 'request-entity' && row.value === 'Settings') !== true
    || featureGoalAdminProjectTaskApiSettingsValue?.recipePlanSequence?.[1]?.suggestedSourceParameterValues?.some((row) => row.key === 'request-fields' && row.value === 'api key, notification toggle') !== true);
  recordProbeFailure('selectedGuidanceAndAppQueries', typeof stateBackedFormGuidanceDisplayText !== 'string'
    || !stateBackedFormGuidanceDisplayText.includes('Decision form-value-channel')
    || !stateBackedFormGuidanceDisplayText.includes('DOM string-ish values')
    || !stateBackedFormGuidanceDisplayText.includes('model.bind` for app identity')
    || !stateBackedFormDecisionSurfaces.includes('app-query-batch')
    || stateBackedFormDecisionSurfaces.indexOf('app-query-batch') > stateBackedFormDecisionSurfaces.indexOf('binding-value-channel-summary')
    || appBuildingGuidance.structuredContent.value.value?.recipes?.length < 1
    || typeof routingGuidanceDisplayText !== 'string'
    || !routingGuidanceDisplayText.includes('Decision route-selected-state')
    || !routingGuidanceDisplayText.includes('Principle: Public guidance should handle common route config')
    || !routingDecisionSurfaces.includes('app-query-batch')
    || routingDecisionSurfaces.indexOf('app-query-batch') > routingDecisionSurfaces.indexOf('route-contexts')
    || typeof routedCatalogGuidanceDisplayText !== 'string'
    || !routedCatalogGuidanceDisplayText.includes('Decision route-selected-state')
    || !routedCatalogGuidanceDisplayText.includes('Decision state-boundary')
    || !routedCatalogGuidanceDisplayText.includes('Decision template-model-access')
    || typeof stateStoreGuidanceDisplayText !== 'string'
    || !stateStoreGuidanceDisplayText.includes('Principle: @aurelia/state is a deliberate plugin-backed architecture choice')
    || !stateStoreGuidanceDisplayText.includes('Decision state-store-plugin-boundary')
    || stateStoreGuidanceDisplayText.includes('Decision state-boundary')
    || typeof appQueryCatalog.structuredContent?.value?.summary !== 'string'
    || typeof appQueryCatalogDisplayText !== 'string'
    || !appQueryCatalogDisplayText.includes('Router: start with router-overview')
    || !appQueryCatalogDisplayText.includes('Next: use aurelia_app_query_batch')
    || typeof workspaceOverview.structuredContent?.value?.summary !== 'string'
    || typeof workspaceOverviewDisplayText !== 'string'
    || !workspaceOverviewDisplayText.includes('Default app:')
    || !workspaceOverviewDisplayText.includes('Project rows: omitted by default')
    || workspaceOverview.structuredContent.value.page?.returnedRows !== 0
    || workspaceOverviewWithProjectRows.structuredContent?.value?.page?.returnedRows !== 1
    || typeof routedDataTableAppOverview.structuredContent?.value?.summary !== 'string'
    || typeof routedDataTableAppOverviewDisplayText !== 'string'
    || !routedDataTableAppOverviewDisplayText.includes('App: generated-routed-searchable-data-table')
    || !routedDataTableAppOverviewDisplayText.includes('Next: use aurelia_app_query_batch')
    || typeof routedDataTableRouterOverview.structuredContent?.value?.summary !== 'string'
    || typeof routedDataTableRouterOverviewDisplayText !== 'string'
    || !routedDataTableRouterOverviewDisplayText.includes('Router:')
    || !routedDataTableRouterOverviewDisplayText.includes('Rows: omitted by default')
    || typeof templateCompletions.structuredContent?.value?.summary !== 'string'
    || typeof templateCompletions.structuredContent.value.outcome !== 'string'
    || typeof templateCompletionsDisplayText !== 'string'
    || !templateCompletionsDisplayText.includes('Template completions:')
    || !templateCompletionsDisplayText.includes('Candidates:')
    || typeof templateCursorInfo.structuredContent?.value?.summary !== 'string'
    || typeof templateCursorInfoDisplayText !== 'string'
    || !templateCursorInfoDisplayText.includes('Template cursor:')
    || !templateCursorInfoDisplayText.includes('Value site:')
    || typeof templateDiagnostics.structuredContent?.value?.summary !== 'string'
    || typeof templateDiagnosticsDisplayText !== 'string'
    || !templateDiagnosticsDisplayText.includes('Template diagnostics:')
    || typeof authoringOrientation.structuredContent?.value?.summary !== 'string'
    || authoringOrientation.structuredContent.value.page?.size !== 3
    || authoringOrientationValue?.operations?.length !== 0
    || authoringOrientationValue?.repairs?.length !== 0
    || authoringOrientationValue?.repairClusters?.length > 3
    || authoringOrientationValue?.recipes?.some((recipe) => recipe.currentFitState === 'not-applicable')
    || typeof dataTableOrientation.structuredContent?.value?.summary !== 'string'
    || dataTableHasCustomControlTaste
    || typeof forwardingAccessorOrientation.structuredContent?.value?.summary !== 'string'
    || typeof forwardingAccessorOrientationDisplayText !== 'string'
    || !forwardingAccessorOrientationDisplayText.includes('template-model-access=')
    || !forwardingAccessorOrientationDisplayText.includes('one-hop-forwarding-accessor-pressure')
    || !forwardingAccessorOrientationDisplayText.includes('source-backed-getter-observation')
    || typeof dataTableValueChannelSummary.structuredContent?.value?.summary !== 'string'
    || dataTableValueChannelSummaryValue?.totalRows < 1
    || !dataTableValueChannelRows.every((row) => row.definitionCount >= row.definitionNames.length)
    || dataTableValueChannelFirstCoupling?.definitionCount < dataTableValueChannelFirstCoupling?.definitionNames?.length
    || dataTableValueChannelFirstCoupling?.targetPropertyCount < dataTableValueChannelFirstCoupling?.targetProperties?.length
    || !dataTableValueChannelCouplings.includes('select-option-list-mutation-observer')
    || !dataTableValueChannelCouplings.includes('checked-collection-observer')
    || typeof dataTableDataFlowSummary.structuredContent?.value?.summary !== 'string'
    || dataTableDataFlowSummaryValue?.totalRows < 1
    || dataTableDataFlowIssueRows.length !== 0
    || !dataTableDirectStateEventFlow
    || typeof dataTableObservedDependencySummary.structuredContent?.value?.summary !== 'string'
    || dataTableObservedDependencySummaryValue?.totalRows <= 0
    || dataTableObservedDependencyRows.length === 0
    || !dataTableObservedDependencySourceStates.includes('source')
    || !dataTableObservedDependencyRows.some((row) =>
      row.dependencyKind === 'template-expression-read'
      && row.sourceRootNames?.includes('state')
      && row.sourceBackedCount > 0
    )
    || typeof dataFlowIssueSummary.structuredContent?.value?.summary !== 'string'
    || dataFlowIssueSummary.structuredContent.value.page?.size !== 0
    || issueOnlyDataFlowRows.length !== 0
    || !issueOnlyIssueKinds.includes('source-type-unresolved')
    || !issueOnlyIssueKinds.includes('source-nullish-to-required-target')
    || !issueOnlyIssueKinds.includes('target-nullish-to-required-source')
    || !issueOnlyIssueKinds.includes('target-empty-array-inferred')
    || typeof dataFlowDiagnosticOverview.structuredContent?.value?.summary !== 'string'
    || typeof dataFlowDiagnosticOverviewDisplayText !== 'string'
    || !dataFlowDiagnosticOverviewDisplayText.includes('Diagnostic clusters:')
    || !dataFlowDiagnosticOverviewDisplayText.includes('template/binding-source-assignment-strictness')
    || typeof dataFlowAppDiagnostics.structuredContent?.value?.summary !== 'string'
    || typeof dataFlowAppDiagnosticsDisplayText !== 'string'
    || !dataFlowAppDiagnosticsDisplayText.includes('Diagnostics:')
    || !dataFlowAppDiagnosticsDisplayText.includes('Domains: template=1')
    || typeof routerOpenSeamOverview.structuredContent?.value?.summary !== 'string'
    || typeof routerOpenSeamOverviewDisplayText !== 'string'
    || !routerOpenSeamOverviewDisplayText.includes('Open seam clusters:')
    || !routerOpenSeamOverviewDisplayText.includes('router.open-instruction')
    || typeof dataTableSummaryBatch.structuredContent?.value?.summary !== 'string'
    || typeof dataTableSummaryBatchDisplayText !== 'string'
    || !dataTableSummaryBatchDisplayText.includes('binding-value-channel-summary')
    || !dataTableSummaryBatchDisplayText.includes('Binding data-flow:')
    || !dataTableSummaryBatchDisplayText.includes('issues ')
    || !dataTableSummaryBatchDisplayText.includes('Binding value channels:')
    || !dataTableSummaryBatchDisplayText.includes('observer couplings ')
    || !dataTableSummaryBatchDisplayText.includes('Binding observed dependencies:')
    || !dataTableSummaryBatchDisplayText.includes('member source states ')
    || !dataTableSummaryBatchDisplayText.includes('Profiles: omitted')
    || dataTableSummaryBatchValue?.queryCount !== 3
    || dataTableSummaryBatchValue?.appWorldOpened !== true
    || dataTableSummaryBatchValue?.appProfile !== null
    || dataTableSummaryBatchValue?.appQueryClaimProfiles?.length !== 0
    || dataTableSummaryBatchValue?.rows?.some((row) => row.answer?.value?.rows?.length !== 0)
    || typeof cacheOverview.structuredContent?.value?.summary !== 'string'
    || typeof cacheOverviewDisplayText !== 'string'
    || !cacheOverviewDisplayText.includes('MCP analysis cache:')
    || !cacheOverviewDisplayText.includes('Runtime cache hints:')
    || typeof cacheOverview.structuredContent?.value?.totalSessions !== 'number'
    || cacheOverview.structuredContent.value.totalSessions < 1);
  recordProbeFailure('recipePlanSourceText', recipePlanResourceLinks === 0
    || typeof recipePlanDisplayText !== 'string'
    || !recipePlanDisplayText.includes('Plan:')
    || recipePlanDisplayText.includes('Authoring Recipe Probe')
    || !recipePlanDisplayText.includes('Create State-Backed Form')
    || !recipePlanDisplayText.includes('Usage: source-plan start')
    || !recipePlanDisplayText.includes('Form should expose app-authored matcher comparison for object-valued select options.')
    || !recipePlanDisplayText.includes('sourceFilePaths request hints implementation-source(')
    || !recipePlanTextRequestHints.some((row) => row.key === 'implementation-source' && row.sourceFilePaths.includes('src/app.ts') && row.sourceFilePaths.includes('src/components/state-backed-form.html') && !row.sourceFilePaths.includes('src/app.css'))
    || !recipePlanTextRequestHints.some((row) => row.key === 'state-domain-service' && row.sourceFilePaths.includes('src/state/app-state.ts'))
    || !recipePlanTextRequestHints.some((row) => row.key === 'templates' && row.sourceFilePaths.includes('src/components/state-backed-form.html'))
    || !recipePlanTextRequestHints.some((row) => row.key === 'project-tooling' && row.projectToolingPaths.includes('package.json'))
    || patternReferenceRecipePlanValue?.usage !== 'pattern-reference'
    || typeof patternReferenceRecipePlanDisplayText !== 'string'
    || !patternReferenceRecipePlanDisplayText.includes('Usage: pattern reference')
    || !patternReferenceRecipePlanDisplayText.includes('merge them into the primary app plan')
    || !patternReferenceRecipePlanDisplayText.includes('Requested usage is pattern-reference')
    || !patternReferenceRecipePlanDisplayText.includes('Pattern file shapes:')
    || !patternReferenceRecipePlanDisplayText.includes('merge selectively')
    || typeof hintSelectedTableRecipePlanDisplayText !== 'string'
    || !hintSelectedTableRecipePlanDisplayText.includes('requested 1 hint(s), matched 1, unmatched 0')
    || hintSelectedTableRecipePlanDisplayText.includes('requested 3 path(s), matched 3, unmatched 0')
    || hintSelectedTableTextSelection?.requestedHintKeys?.join('|') !== 'state-domain-service'
    || hintSelectedTableTextSelection?.matchedHintKeys?.join('|') !== 'state-domain-service'
    || hintSelectedTableTextSelection?.unmatchedHintKeys?.length !== 0
    || hintSelectedTableTextSelection?.includedPaths?.length !== 3
    || !hintSelectedTableTextSelection?.includedPaths?.includes('src/models/invoice.ts')
    || !hintSelectedTableTextSelection?.includedPaths?.includes('src/services/invoice-service.ts')
    || !hintSelectedTableTextSelection?.includedPaths?.includes('src/state/invoice-table-state.ts')
    || hintSelectedTableTextSelection?.includedPaths?.includes('src/app.css')
    || !hintSelectedTableSourceText.includes('dueDate')
    || !hintSelectedTableSourceText.includes('totalAmount')
    || hintSelectedTableSourceText.includes('dueDateDate')
    || hintSelectedTableSourceText.includes('totalAmountNumber')
    || typeof catalogParameterizedRecipePlanDisplayText !== 'string'
    || !catalogParameterizedRecipePlanDisplayText.includes('Source parameters: applied catalog-entity=Item, catalog-collection=items, catalog-fields=title, description, tier select, monthly price number, available toggle, catalog-options=tier: Basic, Pro, Enterprise.')
    || !catalogParameterizedRecipePlanDisplayText.includes('host-adapted slots domain-collection:selection-model{domain-collection-summary}, sample-data:catalog-sample-data{sample-data-summary}, presentation:catalog-presentation{presentation-summary}')
    || catalogParameterizedApplications.filter((row) => row.applicationState === 'applied-to-source-plan').length !== 4
    || catalogParameterizedApplications.filter((row) => row.applicationState === 'advisory-only').length !== 0
    || !catalogParameterizedRecipePlanValue?.sourcePlan?.pattern?.parameters?.some((row) => row.key === 'catalog-fields' && row.kind === 'field-schema' && row.valueShape === 'field-schema-list' && row.applicationPolicy === 'source-text-input')
    || !catalogParameterizedRecipePlanValue?.sourcePlan?.pattern?.parameters?.some((row) => row.key === 'catalog-options' && row.kind === 'domain-collection' && row.valueShape === 'option-schema-list' && row.applicationPolicy === 'source-text-input')
    || !catalogParameterizedSourceText.includes('class Item')
    || !catalogParameterizedSourceText.includes("export type Tier = 'basic' | 'pro' | 'enterprise';")
    || !catalogParameterizedSourceText.includes('readonly title: string')
    || !catalogParameterizedSourceText.includes('readonly tier: Tier')
    || !catalogParameterizedSourceText.includes('readonly monthlyPrice: number')
    || !catalogParameterizedSourceText.includes('readonly available: boolean')
    || !catalogParameterizedSourceText.includes("tier: 'pro'")
    || !catalogParameterizedSourceText.includes('state.items.visibleItems')
    || catalogParameterizedSourceText.includes('state.items.items')
    || catalogParameterizedSourceText.includes('hasProducts')
    || catalogParameterizedSourceText.includes('Task lamp')
    || typeof domainOnlyCatalogRecipePlanDisplayText !== 'string'
    || !domainOnlyCatalogRecipePlanDisplayText.includes('field-schema:name, summary{field-schema-list}*')
    || !domainOnlyCatalogRecipePlanDisplayText.includes('use apply-as-source-start')
    || !domainOnlyCatalogRecipePlanDisplayText.includes('code economy production-terse')
    || domainOnlyCatalogRecipePlanValue?.recipe?.expectedEffectCount !== 45
    || domainOnlyCatalogRecipePlanValue?.sourcePlan?.pattern?.usePolicy !== 'apply-as-source-start'
    || domainOnlyCatalogRecipePlanValue?.sourcePlan?.pattern?.domainModelPolicy !== 'caller-applied'
    || domainOnlyCatalogRecipePlanValue?.sourcePlan?.pattern?.dataPolicy !== 'starter-sample-data'
    || domainOnlyCatalogRecipePlanValue?.sourcePlan?.pattern?.codeEconomyPolicy !== 'production-terse'
    || domainOnlyCatalogSourceFiles.length !== 8
    || domainOnlyCatalogSourcePaths.includes('src/app.css')
    || domainOnlyCatalogSourcePaths.includes('src/components/product-tier-card.ts')
    || domainOnlyCatalogSourcePaths.includes('src/components/product-tier-card.html')
    || domainOnlyCatalogSourceFiles.some((file) => file.textAuthority === 'semantic-runtime-reference-instantiation')
    || domainOnlyCatalogRecipePlanDisplayText.includes('badge select option-list observer coupling')
    || domainOnlyCatalogRecipePlanDisplayText.includes('in-stock checked')
    || !domainOnlyCatalogSourceText.includes('class ProductTier')
    || !domainOnlyCatalogSourceText.includes('searchText')
    || !domainOnlyCatalogSourceText.includes('productTier.name')
    || !domainOnlyCatalogSourceText.includes('productTier.summary')
    || domainOnlyCatalogSourceText.includes('bindable')
    || domainOnlyCatalogSourceText.includes('ProductTierCard')
    || domainOnlyCatalogSourceText.includes('selectionProgressPercent')
    || domainOnlyCatalogSourceText.includes('selectedProductTierIds')
    || domainOnlyCatalogSourceText.includes('catalogStatus')
    || domainOnlyCatalogSourceText.includes("import './app.css'")
    || domainOnlyCatalogSourceText.includes('priceLabel')
    || domainOnlyCatalogSourceText.includes('stockLabel')
    || domainOnlyCatalogSourceText.includes('inStock')
    || domainOnlyCatalogSourceText.includes('badgeFilter')
    || domainOnlyCatalogSourceText.includes('onlyInStock')
    || domainOnlyCatalogSourceText.includes('switch.bind')
    || domainOnlyCatalogSourceText.includes('disabled.bind')
    || typeof routedCatalogParameterizedRecipePlanDisplayText !== 'string'
    || !routedCatalogParameterizedRecipePlanDisplayText.includes('route-identity:product-tiers{route-path}*')
    || !routedCatalogParameterizedRecipePlanDisplayText.includes('feature-copy:Product Tiers{route-title}*')
    || !routedCatalogParameterizedSourceText.includes("path: 'product-tiers'")
    || !routedCatalogParameterizedSourceText.includes("path: 'product-tiers/:productTierId'")
    || !routedCatalogParameterizedSourceText.includes("id: 'product-tier-1'")
    || !routedCatalogParameterizedSourceText.includes('product-tiers/product-tier-1')
    || routedCatalogParameterizedSourceText.includes("path: 'products'")
    || routedCatalogParameterizedSourceText.includes("id: 'item-1'")
    || routedCatalogParameterizedSourceText.includes('lamp-1')
    || !checkedCollectionFormApplications.every((row) => row.applicationState === 'applied-to-source-plan')
    || !checkedCollectionFormSourceText.includes("export type Role = 'owner' | 'maintainer' | 'viewer';")
    || !checkedCollectionFormSourceText.includes("export type Permission = 'read' | 'write' | 'administer';")
    || !checkedCollectionFormSourceText.includes('public roles: Role[]')
    || !checkedCollectionFormSourceText.includes('public permissions: Permission[]')
    || !checkedCollectionFormSourceText.includes("readonly roleOptions: readonly Role[] = ['owner', 'maintainer', 'viewer'];")
    || !checkedCollectionFormSourceText.includes("readonly permissionOptions: readonly Permission[] = ['read', 'write', 'administer'];")
    || !checkedCollectionFormSourceText.includes('model.bind="option" checked.bind="accessProfile.permissions"')
    || checkedCollectionFormSourceText.includes('permission-one')
    || !checkedCollectionFormRecipePlanValue?.expectedEffectHighlights?.some((row) => row.summary?.includes('checked collection membership'))
    || multiStepWizardParameterizedApplications.filter((row) => row.applicationState === 'applied-to-source-plan').length !== 4
    || multiStepWizardParameterizedApplications.filter((row) => row.applicationState === 'advisory-only').length !== 0
    || !multiStepWizardParameterizedRecipePlanValue?.sourcePlan?.pattern?.parameters?.some((row) => row.key === 'wizard-entity' && row.kind === 'domain-entity' && row.valueShape === 'domain-title' && row.applicationPolicy === 'source-text-input')
    || !multiStepWizardParameterizedRecipePlanValue?.sourcePlan?.pattern?.parameters?.some((row) => row.key === 'wizard-steps' && row.kind === 'domain-collection' && row.valueShape === 'workflow-step-list' && row.applicationPolicy === 'source-text-input')
    || !multiStepWizardParameterizedRecipePlanValue?.sourcePlan?.pattern?.parameters?.some((row) => row.key === 'wizard-section-fields' && row.kind === 'field-schema' && row.valueShape === 'workflow-section-field-schema-list' && row.applicationPolicy === 'source-text-input')
    || !multiStepWizardParameterizedRecipePlanValue?.sourcePlan?.pattern?.parameters?.some((row) => row.key === 'wizard-options' && row.kind === 'domain-collection' && row.valueShape === 'option-schema-list' && row.applicationPolicy === 'source-text-input')
    || !multiStepWizardParameterizedSourceText.includes('class Checkout')
    || !multiStepWizardParameterizedSourceText.includes("export type WizardStepId = 'cart' | 'shipping' | 'payment' | 'confirmation';")
    || !multiStepWizardParameterizedSourceText.includes("export type PaymentMethod = 'card' | 'invoice' | 'paypal';")
    || !multiStepWizardParameterizedSourceText.includes("new WizardStep('shipping', 'Shipping')")
    || !multiStepWizardParameterizedSourceText.includes("state.currentStep.id === 'payment'")
    || !multiStepWizardParameterizedSourceText.includes('Cart fields belong to the caller workflow')
    || !multiStepWizardParameterizedSourceText.includes('public shippingAddress: string')
    || !multiStepWizardParameterizedSourceText.includes('public paymentMethod: PaymentMethod | null')
    || !multiStepWizardParameterizedSourceText.includes("readonly paymentMethodOptions: readonly PaymentMethod[] = ['card', 'invoice', 'paypal'];")
    || !multiStepWizardParameterizedSourceText.includes('readonly checkout = createCheckout')
    || !multiStepWizardParameterizedSourceText.includes('completedCheckoutCount')
    || !multiStepWizardParameterizedSourceText.includes('.on(Checkout)')
    || !multiStepWizardParameterizedSourceText.includes("value.two-way=\"state.checkout.shippingAddress & validate:'blur'\"")
    || !multiStepWizardParameterizedSourceText.includes('value.bind="state.checkout.paymentMethod"')
    || !multiStepWizardParameterizedSourceText.includes('state.checkout.canSubmit')
    || multiStepWizardParameterizedSourceText.includes('state.profile')
    || multiStepWizardParameterizedSourceText.includes('OnboardingProfile')
    || multiStepWizardParameterizedSourceText.includes('contactSummary')
    || multiStepWizardParameterizedSourceText.includes('featureIds')
    || !multiStepWizardParameterizedRecipePlanValue?.expectedEffectHighlights?.some((row) => row.summary?.includes('Payment Method field writes'))
    || routedTeamMemberEditorApplications.filter((row) => row.applicationState === 'applied-to-source-plan').length !== 5
    || !routedTeamMemberEditorSourceText.includes('class TeamMember')
    || !routedTeamMemberEditorSourceText.includes('public role: Role | null')
    || !routedTeamMemberEditorSourceText.includes('public active: boolean')
    || !routedTeamMemberEditorSourceText.includes('public startDate: string')
    || !routedTeamMemberEditorSourceText.includes('public weeklyHours: number')
    || !routedTeamMemberEditorSourceText.includes('teamMember.canSubmit')
    || !routedTeamMemberEditorSourceText.includes('type="date"')
    || !routedTeamMemberEditorSourceText.includes('value.bind="teamMember.startDate"')
    || !routedTeamMemberEditorSourceText.includes('value-as-number.bind="teamMember.weeklyHours"')
    || !routedTeamMemberEditorSourceText.includes('team-member-id.bind="routeParams.teamMemberId"')
    || !routedTeamMemberEditorSourceText.includes('form/team-member-1+summary')
    || !routedTeamMemberEditorSourceText.includes('team-member-1')
    || routedTeamMemberEditorSourceText.includes('startDateDate')
    || routedTeamMemberEditorSourceText.includes('weeklyHoursNumber')
    || routedTeamMemberEditorSourceText.includes('ServiceRequest')
    || routedTeamMemberEditorSourceText.includes('request-1')
    || routedTeamMemberEditorSourceText.includes('submitted request')
    || sectionedRoutedAppShellApplications.filter((row) => row.applicationState === 'applied-to-source-plan').length !== 1
    || !sectionedRoutedAppShellRecipePlanValue?.sourcePlan?.pattern?.parameters?.some((row) => row.key === 'section-routes' && row.valueShape === 'route-section-list' && row.applicationPolicy === 'source-text-input')
    || !sectionedRoutedAppShellSourceText.includes('DashboardRoute')
    || !sectionedRoutedAppShellSourceText.includes('SettingsRoute')
    || !sectionedRoutedAppShellSourceText.includes('load="dashboard"')
    || !sectionedRoutedAppShellSourceText.includes('load="settings"')
    || sectionedRoutedAppShellSourceText.includes('This route is part of the static app shell navigation.')
    || sectionedRoutedAppShellSourceText.includes('IRouteContext')
    || sectionedRoutedAppShellSourceText.includes('itemId')
    || typeof selectedSourceRecipePlanDisplayText !== 'string'
    || !selectedSourceRecipePlanDisplayText.includes('source/project-tooling text included for 2')
    || !selectedSourceRecipePlanDisplayText.includes('generated source/tooling artifact(s)')
    || selectedSourceRecipeTextSelection?.requestedPaths?.length !== 2
    || selectedSourceRecipeTextSelection?.matchedPaths?.length !== 2
    || selectedSourceRecipeTextSelection?.unmatchedPaths?.length !== 0
    || selectedSourceRecipeTextSelection?.includedPaths?.length !== 2
    || !selectedSourceRecipeTextSelection.includedPaths.includes('package.json')
    || !selectedSourceRecipeTextSelection.includedPaths.includes('src/state/catalog-state.ts')
    || selectedSourceRecipeTextPaths.length !== 2
    || selectedSourceRecipeTextPaths[0] !== 'package.json'
    || selectedSourceRecipeTextPaths[1] !== 'src/state/catalog-state.ts');

  if (
    probeFailures.length > 0
    || tools.tools.length === 0
    || outputSchemaCount !== tools.tools.length
    || readOnlyToolCount !== tools.tools.length - 1
    || cacheTool?.annotations?.readOnlyHint !== false
    || cacheTool.annotations?.idempotentHint !== true
    || cacheTool.annotations?.destructiveHint !== false
    || cacheTool.annotations?.openWorldHint !== false
    || typeof catalogDisplayText !== 'string'
    || !catalogDisplayText.includes('Catalog:')
    || !catalogDisplayText.includes('View: overview')
    || !catalogDisplayText.includes('routed-app-shell')
    || !catalogDisplayText.includes('routed-searchable-data-table')
    || !catalogDisplayText.includes('aurelia_app_building_guidance')
    || !catalogOverviewRowsAreTerse
    || typeof appBuildingGuidance.structuredContent?.value?.summary !== 'string'
    || typeof appBuildingGuidanceDisplayText !== 'string'
    || !appBuildingGuidanceDisplayText.includes('direct objects for local typed boundaries')
    || !appBuildingGuidanceDisplayText.includes('Recipe searchable-data-table')
    || !appBuildingGuidanceDisplayText.includes('Recipe routed-app-shell')
    || !appBuildingGuidanceDisplayText.includes('Decision state-boundary')
    || !appBuildingGuidanceDisplayText.includes('Decision source-pattern-use-policy')
    || !appBuildingGuidanceDisplayText.includes('Decision type-repair-routing')
    || !appBuildingGuidanceFollowUpSurfaces.includes('app-query-batch')
    || !compactGuidanceRowsAreTerse
    || typeof featureGoalGuidance.structuredContent?.value?.summary !== 'string'
    || typeof featureGoalGuidanceDisplayText !== 'string'
    || !featureGoalGuidanceDisplayText.includes('Feature goal signals: routing (navigation-frame), searchable-list (feature-surface), localization (framework-capability), validation (framework-capability)')
    || !featureGoalGuidanceDisplayText.includes('Recipe path: start with routed-searchable-data-table for routing, searchable-list; then borrow routed-localized-validated-state-backed-form patterns for localization, validation.')
    || !featureGoalGuidanceDisplayText.includes('Recipe routed-localized-validated-state-backed-form')
    || !featureGoalGuidanceDisplayText.includes('Recipe routed-searchable-data-table')
    || !featureGoalGuidanceDisplayText.includes('Decision route-selected-state')
    || !featureGoalGuidanceValue?.featureGoalSignals?.some((row) => row.key === 'localization')
    || featureGoalGuidanceValue?.returnedRecipeCount > 6
    || !featureGoalTokenSignalKeys.includes('composition')
    || featureGoalTokenSignalKeys.includes('searchable-list')
    || !featureGoalChatMessagesSignalKeys.includes('searchable-list')
    || featureGoalChatMessagesSignalKeys.includes('validation')
    || typeof featureGoalFieldLabelsDisplayText !== 'string'
    || !featureGoalFieldLabelsDisplayText.includes('Feature goal signals: form-entry (feature-surface)')
    || !featureGoalFieldLabelsSignalKeys.includes('form-entry')
    || featureGoalFieldLabelsSignalKeys.includes('localization')
    || typeof featureGoalValidatedFormDisplayText !== 'string'
    || !featureGoalValidatedFormDisplayText.includes('Recipe path: start with validated-state-backed-form for form-entry, validation.')
    || featureGoalValidatedFormDisplayText.includes('Recipe path: start with multi-step-state-backed-form for form-entry, validation.')
    || featureGoalValidatedFormValue?.recipePlanSequence?.[0]?.recipeKey !== 'validated-state-backed-form'
    || typeof featureGoalRoutedValidatedFormDisplayText !== 'string'
    || !featureGoalRoutedValidatedFormDisplayText.includes('Feature goal signals: routing (navigation-frame), form-entry (feature-surface), validation (framework-capability)')
    || !featureGoalRoutedValidatedFormDisplayText.includes('Recipe path: start with routed-validated-state-backed-form for routing, form-entry, validation.')
    || featureGoalRoutedValidatedFormDisplayText.includes('start with routed-localized-validated-state-backed-form')
    || featureGoalRoutedValidatedFormValue?.recipePlanSequence?.[0]?.recipeKey !== 'routed-validated-state-backed-form'
    || featureGoalRoutedValidatedFormValue?.recipePlanSequence?.length !== 1
    || typeof featureGoalMultiStepFormDisplayText !== 'string'
    || !featureGoalMultiStepFormDisplayText.includes('Feature goal signals: form-entry (feature-surface), multi-step-form (feature-surface), validation (framework-capability)')
    || !featureGoalMultiStepFormDisplayText.includes('Recipe path: start with multi-step-state-backed-form for form-entry, multi-step-form, validation.')
    || featureGoalMultiStepFormValue?.recipePlanSequence?.[0]?.recipeKey !== 'multi-step-state-backed-form'
    || typeof featureGoalOnboardingFlowDisplayText !== 'string'
    || !featureGoalOnboardingFlowDisplayText.includes('Feature goal signals: routing (navigation-frame), form-entry (feature-surface), multi-step-form (feature-surface), validation (framework-capability)')
    || !featureGoalOnboardingFlowDisplayText.includes('Recipe path: start with multi-step-state-backed-form for form-entry, multi-step-form, validation; then borrow routed-validated-state-backed-form patterns for routing.')
    || featureGoalOnboardingFlowValue?.recipePlanSequence?.[0]?.recipeKey !== 'multi-step-state-backed-form'
    || featureGoalOnboardingFlowValue?.recipePlanSequence?.[1]?.recipeKey !== 'routed-validated-state-backed-form'
    || typeof featureGoalOnboardingFormDisplayText !== 'string'
    || !featureGoalOnboardingFormDisplayText.includes('Feature goal signals: form-entry (feature-surface).')
    || featureGoalOnboardingFormDisplayText.includes('multi-step-form')
    || !featureGoalOnboardingFormDisplayText.includes('Recipe path: start with state-backed-form for form-entry.')
    || !featureGoalOnboardingFormDisplayText.includes('request-entity=Customer Onboarding, request-fields=account type select, newsletter toggle, api key')
    || featureGoalOnboardingFormDisplayText.includes('request-selection-id=')
    || featureGoalOnboardingFormValue?.recipePlanSequence?.[0]?.recipeKey !== 'state-backed-form'
    || typeof featureGoalApiBackedWizardDisplayText !== 'string'
    || !featureGoalApiBackedWizardDisplayText.includes('Feature goal signals: routing (navigation-frame), form-entry (feature-surface), multi-step-form (feature-surface), validation (framework-capability), service-boundary (integration-boundary).')
    || !featureGoalApiBackedWizardDisplayText.includes('Recipe path: start with multi-step-state-backed-form for form-entry, multi-step-form, validation; then borrow routed-service-validated-state-backed-form patterns for routing, service-boundary.')
    || featureGoalApiBackedWizardValue?.recipePlanSequence?.[0]?.recipeKey !== 'multi-step-state-backed-form'
    || featureGoalApiBackedWizardValue?.recipePlanSequence?.[1]?.recipeKey !== 'routed-service-validated-state-backed-form'
    || !featureGoalLoadingIndicatorSignalKeys.includes('searchable-list')
    || !featureGoalLoadingIndicatorSignalKeys.includes('catalog-product')
    || featureGoalLoadingIndicatorSignalKeys.includes('service-boundary')
    || typeof featureGoalLayoutGridDisplayText !== 'string'
    || !featureGoalLayoutGridDisplayText.includes('Feature goal signals: none matched; using focus/default recipe order as broad fallback context, not as a scaffold recommendation.')
    || !featureGoalLayoutGridDisplayText.includes('Next: no confident recipe path was selected')
    || featureGoalLayoutGridSignalKeys.includes('searchable-list')
    || typeof featureGoalPricingProductTiersDisplayText !== 'string'
    || !featureGoalPricingProductTiersDisplayText.includes('Feature goal signals: catalog-product (feature-surface).')
    || !featureGoalPricingProductTiersDisplayText.includes('Recipe path: start with catalog-storefront for catalog-product.')
    || !featureGoalPricingProductTiersDisplayText.includes('catalog-entity=Product Tier, catalog-collection=productTiers')
    || featureGoalPricingProductTiersValue?.recipePlanSequence?.[0]?.recipeKey !== 'catalog-storefront'
    || typeof featureGoalRepositoryBrowserDisplayText !== 'string'
    || !featureGoalRepositoryBrowserDisplayText.includes('Feature goal signals: none matched; using focus/default recipe order as broad fallback context, not as a scaffold recommendation.')
    || !featureGoalRepositoryBrowserDisplayText.includes('Next: no confident recipe path was selected')
    || featureGoalRepositoryBrowserSignalKeys.includes('service-boundary')
    || typeof customerCatalogGuidanceDisplayText !== 'string'
    || !customerCatalogGuidanceDisplayText.includes('Feature goal signals: none matched; using focus/default recipe order as broad fallback context, not as a scaffold recommendation.')
    || !customerCatalogGuidanceDisplayText.includes('Next: no confident recipe path was selected')
    || customerCatalogSignalKeys.includes('catalog-product')
    || featureGoalGuidanceValue?.recipePlanSequence?.[0]?.recipeKey !== 'routed-searchable-data-table'
    || featureGoalGuidanceValue?.recipePlanSequence?.[0]?.usage !== 'source-plan-start'
    || featureGoalGuidanceValue?.recipePlanSequence?.[1]?.usage !== 'pattern-reference'
    || featureGoalGuidanceValue?.recipePlanSequence?.[1]?.newFeatureSignals?.join('|') !== 'localization|validation'
    || featureGoalGuidanceValue?.recipes?.[0]?.recipeKey !== 'routed-searchable-data-table'
    || typeof routedSearchableGuidanceDisplayText !== 'string'
    || !routedSearchableGuidanceDisplayText.includes('Recipe path: start with routed-searchable-data-table for routing, searchable-list.')
    || !routedSearchableGuidanceDisplayText.includes('table-entity=User, table-collection=users')
    || !routedSearchableGuidanceDisplayText.includes('Next: call aurelia_authoring_recipe_plan with recipeKey=routed-searchable-data-table and usage=source-plan-start')
    || routedSearchableGuidanceDisplayText.includes('Next: choose a recipeKey')
    || routedSearchableGuidanceValue?.recipePlanSequence?.length !== 1
    || routedSearchableGuidanceValue?.recipePlanSequence?.[0]?.recipeKey !== 'routed-searchable-data-table'
    || routedSearchableGuidanceValue?.recipePlanSequence?.[0]?.usage !== 'source-plan-start'
    || typeof productListGuidanceDisplayText !== 'string'
    || !productListGuidanceDisplayText.includes('Recipe path: start with catalog-storefront for searchable-list, catalog-product.')
    || productListGuidanceDisplayText.includes('Recipe path: start with routed-catalog-storefront for searchable-list, catalog-product.')
    || productListGuidanceValue?.recipePlanSequence?.[0]?.recipeKey !== 'catalog-storefront'
    || productListGuidanceValue?.recipePlanSequence?.[0]?.usage !== 'source-plan-start'
    || typeof routedDashboardGuidanceDisplayText !== 'string'
    || !routedDashboardGuidanceDisplayText.includes('Recipe path: start with composed-dashboard for composition; then borrow routed-app-shell patterns for routing.')
    || !routedDashboardGuidanceDisplayText.includes('Recipe routed-app-shell')
    || !routedDashboardGuidanceDisplayText.includes('Source pattern: adapt-before-emitting reference material')
    || routedDashboardGuidanceDisplayText.includes('Modules: app-shell:aurelia-app-shell')
    || routedDashboardGuidanceDisplayText.includes('Adaptation slots:')
    || routedDashboardGuidanceDisplayText.includes('borrow routed-searchable-data-table patterns for routing')
    || routedDashboardGuidanceValue?.recipePlanSequence?.[0]?.recipeKey !== 'composed-dashboard'
    || routedDashboardGuidanceValue?.recipePlanSequence?.[1]?.recipeKey !== 'routed-app-shell'
    || routedDashboardGuidanceValue?.recipePlanSequence?.[1]?.usage !== 'pattern-reference'
    || routedDashboardGuidanceValue?.returnedRecipeCount !== 2
    || routedDashboardGuidanceValue?.recipes?.some((row) => row.recipeKey === 'routed-catalog-storefront' || row.recipeKey === 'routed-searchable-data-table')
    || typeof bareRoutedDashboardGuidanceDisplayText !== 'string'
    || !bareRoutedDashboardGuidanceDisplayText.includes('Feature goal signals: routing (navigation-frame).')
    || !bareRoutedDashboardGuidanceDisplayText.includes('Recipe path: start with routed-app-shell for routing.')
    || bareRoutedDashboardGuidanceDisplayText.includes('Recipe path: start with composed-dashboard')
    || bareRoutedDashboardGuidanceValue?.recipePlanSequence?.[0]?.recipeKey !== 'routed-app-shell'
    || bareRoutedDashboardGuidanceValue?.returnedRecipeCount !== 1
    || bareRoutedDashboardGuidanceValue?.recipes?.[0]?.recipeKey !== 'routed-app-shell'
    || typeof routePluralShellGuidanceDisplayText !== 'string'
    || !routePluralShellGuidanceDisplayText.includes('Feature goal signals: routing (navigation-frame), app-shell (app-shell).')
    || routePluralShellGuidanceValue?.recipePlanSequence?.[0]?.recipeKey !== 'routed-app-shell'
    || typeof featureGoalPreferencesDisplayText !== 'string'
    || !featureGoalPreferencesDisplayText.includes('Feature goal signals: form-entry (feature-surface).')
    || !featureGoalPreferencesDisplayText.includes('Recipe path: start with state-backed-form for form-entry.')
    || featureGoalPreferencesValue?.recipePlanSequence?.[0]?.recipeKey !== 'state-backed-form'
    || featureGoalPreferencesValue?.returnedRecipeCount !== 1
    || featureGoalPreferencesValue?.recipes?.[0]?.recipeKey !== 'state-backed-form'
    || typeof featureGoalCheckoutDisplayText !== 'string'
    || !featureGoalCheckoutDisplayText.includes('Feature goal signals: form-entry (feature-surface), multi-step-form (feature-surface), catalog-product (feature-surface).')
    || !featureGoalCheckoutDisplayText.includes('Recipe path: start with multi-step-state-backed-form for form-entry, multi-step-form; then borrow catalog-storefront patterns for catalog-product.')
    || !featureGoalCheckoutDisplayText.includes('Suggested sourceParameterValues: multi-step-state-backed-form:')
    || !featureGoalCheckoutDisplayText.includes('wizard-steps=cart, shipping, payment')
    || !featureGoalCheckoutDisplayText.includes('wizard-section-fields=shipping: shipping address; payment: payment method select')
    || featureGoalCheckoutValue?.recipePlanSequence?.[0]?.recipeKey !== 'multi-step-state-backed-form'
    || featureGoalCheckoutValue?.recipePlanSequence?.[1]?.recipeKey !== 'catalog-storefront'
    || typeof featureGoalRoutedCatalogCheckoutDisplayText !== 'string'
    || !featureGoalRoutedCatalogCheckoutDisplayText.includes('Feature goal signals: routing (navigation-frame), searchable-list (feature-surface), multi-step-form (feature-surface), catalog-product (feature-surface).')
    || !featureGoalRoutedCatalogCheckoutDisplayText.includes('Recipe path: start with routed-catalog-storefront for routing, searchable-list, catalog-product; then borrow multi-step-state-backed-form patterns for multi-step-form.')
    || featureGoalRoutedCatalogCheckoutValue?.recipePlanSequence?.[0]?.recipeKey !== 'routed-catalog-storefront'
    || featureGoalRoutedCatalogCheckoutValue?.recipePlanSequence?.[1]?.recipeKey !== 'multi-step-state-backed-form'
    || typeof featureGoalContactSubmitDisplayText !== 'string'
    || !featureGoalContactSubmitDisplayText.includes('Feature goal signals: form-entry (feature-surface).')
    || featureGoalContactSubmitDisplayText.includes('service-boundary')
    || featureGoalContactSubmitValue?.recipePlanSequence?.[0]?.recipeKey !== 'state-backed-form'
    || featureGoalContactSubmitValue?.returnedRecipeCount !== 1
    || typeof featureGoalCustomerServiceDisplayText !== 'string'
    || !featureGoalCustomerServiceDisplayText.includes('Feature goal signals: form-entry (feature-surface).')
    || featureGoalCustomerServiceDisplayText.includes('service-boundary')
    || featureGoalCustomerServiceValue?.recipePlanSequence?.[0]?.recipeKey !== 'state-backed-form'
    || typeof featureGoalApiServiceDisplayText !== 'string'
    || !featureGoalApiServiceDisplayText.includes('Feature goal signals: form-entry (feature-surface), service-boundary (integration-boundary), service-write-boundary (integration-boundary).')
    || featureGoalApiServiceValue?.recipePlanSequence?.[0]?.recipeKey !== 'service-backed-form'
    || typeof featureGoalDocumentAutosaveDisplayText !== 'string'
    || !featureGoalDocumentAutosaveDisplayText.includes('Feature goal signals: searchable-list (feature-surface), form-entry (feature-surface), service-boundary (integration-boundary), service-write-boundary (integration-boundary).')
    || !featureGoalDocumentAutosaveDisplayText.includes('Recipe path: start with searchable-data-table for searchable-list, service-boundary; then borrow service-backed-form patterns for form-entry, service-write-boundary.')
    || !featureGoalDocumentAutosaveDisplayText.includes('table-entity=Document, table-collection=documents, table-filter-fields=name, tag select')
    || featureGoalDocumentAutosaveValue?.recipePlanSequence?.[0]?.recipeKey !== 'searchable-data-table'
    || featureGoalDocumentAutosaveValue?.recipePlanSequence?.[1]?.recipeKey !== 'service-backed-form'
    || typeof featureGoalInventoryEditDisplayText !== 'string'
    || !featureGoalInventoryEditDisplayText.includes('Feature goal signals: routing (navigation-frame), searchable-list (feature-surface), form-entry (feature-surface), validation (framework-capability).')
    || featureGoalInventoryEditValue?.featureGoalSignals?.find((row) => row.key === 'form-entry')?.matchedTerms?.includes('editable+fields') !== true
    || !featureGoalInventoryEditDisplayText.includes('table-filter-fields=name, stock number')
    || !featureGoalInventoryEditDisplayText.includes('request-fields=stock number')
    || featureGoalInventoryEditValue?.recipePlanSequence?.[0]?.recipeKey !== 'routed-searchable-data-table'
    || featureGoalInventoryEditValue?.recipePlanSequence?.[1]?.recipeKey !== 'routed-validated-state-backed-form'
    || typeof featureGoalProductAdminTableDisplayText !== 'string'
    || !featureGoalProductAdminTableDisplayText.includes('Feature goal signals: routing (navigation-frame), searchable-list (feature-surface), form-entry (feature-surface).')
    || featureGoalProductAdminTableValue?.featureGoalSignals?.some((row) => row.key === 'catalog-product')
    || !featureGoalProductAdminTableDisplayText.includes('Recipe path: start with routed-searchable-data-table for routing, searchable-list; then borrow routed-state-backed-form patterns for form-entry.')
    || !featureGoalProductAdminTableDisplayText.includes('table-entity=Product, table-collection=products, table-filter-fields=name, status select, category select')
    || !featureGoalProductAdminTableDisplayText.includes('routed-state-backed-form: request-entity=Product, request-selection-id=productId, request-fields=name, status select, category select')
    || featureGoalProductAdminTableDisplayText.includes('table select')
    || featureGoalProductAdminTableValue?.recipePlanSequence?.[0]?.recipeKey !== 'routed-searchable-data-table'
    || featureGoalProductAdminTableValue?.recipePlanSequence?.[1]?.recipeKey !== 'routed-state-backed-form'
    || typeof featureGoalSupportInboxDisplayText !== 'string'
    || !featureGoalSupportInboxDisplayText.includes('Feature goal signals: routing (navigation-frame), searchable-list (feature-surface), form-entry (feature-surface), localization (framework-capability), validation (framework-capability).')
    || !featureGoalSupportInboxDisplayText.includes('Recipe path: start with routed-searchable-data-table for routing, searchable-list; then borrow routed-localized-validated-state-backed-form patterns for form-entry, localization, validation.')
    || !featureGoalSupportInboxDisplayText.includes('detail-route-parameter=conversationId')
    || featureGoalSupportInboxValue?.recipePlanSequence?.[0]?.recipeKey !== 'routed-searchable-data-table'
    || featureGoalSupportInboxValue?.recipePlanSequence?.[1]?.recipeKey !== 'routed-localized-validated-state-backed-form'
    || typeof featureGoalSupportWorkspaceDisplayText !== 'string'
    || !featureGoalSupportWorkspaceDisplayText.includes('table-entity=Ticket, table-collection=tickets, table-filter-fields=name, priority select, assignment select, sla hours number')
    || !featureGoalSupportWorkspaceDisplayText.includes('routed-state-backed-form: request-entity=Ticket, request-selection-id=ticketId, request-fields=name, priority select, assignment select, sla hours number')
    || featureGoalSupportWorkspaceDisplayText.includes('tickets select')
    || featureGoalSupportWorkspaceValue?.recipePlanSequence?.[0]?.recipeKey !== 'routed-searchable-data-table'
    || featureGoalSupportWorkspaceValue?.recipePlanSequence?.[1]?.recipeKey !== 'routed-state-backed-form'
    || typeof featureGoalOrderManagementDisplayText !== 'string'
    || !featureGoalOrderManagementDisplayText.includes('table-options=status: draft, submitted, shipped, cancelled')
    || !featureGoalOrderManagementDisplayText.includes('request-options=status: draft, submitted, shipped, cancelled')
    || featureGoalOrderManagementDisplayText.includes('table-options=status: draft, submitted, shipped, cancelled, editable shipping address')
    || featureGoalOrderManagementValue?.recipePlanSequence?.[0]?.recipeKey !== 'routed-searchable-data-table'
    || featureGoalOrderManagementValue?.recipePlanSequence?.[1]?.recipeKey !== 'routed-service-validated-state-backed-form'
    || typeof featureGoalApiKeysSettingsDisplayText !== 'string'
    || !featureGoalApiKeysSettingsDisplayText.includes('Feature goal signals: sectioned-navigation (navigation-frame).')
    || !featureGoalApiKeysSettingsDisplayText.includes('Recipe path: start with routed-app-shell for sectioned-navigation.')
    || !featureGoalApiKeysSettingsDisplayText.includes('section-routes=Account, Notifications, Billing Address, API Keys')
    || !featureGoalApiKeysSettingsDisplayText.includes('section-routes{route-section-list/source-text-input}')
    || featureGoalApiKeysSettingsDisplayText.includes('state-backed-form: request-entity')
    || featureGoalApiKeysSettingsDisplayText.includes('service-boundary')
    || featureGoalApiKeysSettingsValue?.recipePlanSequence?.[0]?.recipeKey !== 'routed-app-shell'
    || featureGoalApiKeysSettingsValue?.recipePlanSequence?.[1] != null
    || featureGoalApiKeysSettingsValue?.recipePlanSequence?.[0]?.suggestedSourceParameterValues?.some((row) => row.key === 'section-routes' && row.value === 'Account, Notifications, Billing Address, API Keys') !== true
    || typeof featureGoalSettingsTabsFieldsDisplayText !== 'string'
    || !featureGoalSettingsTabsFieldsDisplayText.includes('Feature goal signals: sectioned-navigation (navigation-frame), form-entry (feature-surface).')
    || !featureGoalSettingsTabsFieldsDisplayText.includes('state-backed-form: request-entity=Settings, request-fields=api key, notification toggle')
    || !featureGoalSettingsTabsFieldsDisplayText.includes('routed-app-shell: section-routes=API Key, Notification')
    || featureGoalSettingsTabsFieldsDisplayText.includes('request-selection-id=settingId')
    || featureGoalSettingsTabsFieldsValue?.recipePlanSequence?.[0]?.recipeKey !== 'state-backed-form'
    || featureGoalSettingsTabsFieldsValue?.recipePlanSequence?.[1]?.recipeKey !== 'routed-app-shell'
    || typeof featureGoalAccountSettingsControlsDisplayText !== 'string'
    || !featureGoalAccountSettingsControlsDisplayText.includes('request-entity=Account, request-selection-id=accountId, request-fields=notification toggle, preferred language select, api key')
    || featureGoalAccountSettingsControlsValue?.recipePlanSequence?.[0]?.suggestedSourceParameterValues?.some((row) => row.key === 'request-fields' && row.value === 'notification toggle, preferred language select, api key') !== true
    || featureGoalAccountSettingsControlsValue?.featureGoalSignals?.some((row) => row.key === 'service-write-boundary')
    || typeof featureGoalAccountSettingsOptionsDisplayText !== 'string'
    || !featureGoalAccountSettingsOptionsDisplayText.includes('request-entity=Account, request-selection-id=accountId, request-fields=timezone select, email notifications toggle, preferred theme select, request-options=timezone: utc, cet, est; preferred theme: light, dark, system')
    || !featureGoalAccountSettingsOptionsDisplayText.includes('request-options{option-schema-list/source-text-input}')
    || featureGoalAccountSettingsOptionsDisplayText.includes('timezone utc select')
    || featureGoalAccountSettingsOptionsDisplayText.includes('preferred theme light select')
    || featureGoalAccountSettingsOptionsValue?.recipePlanSequence?.[0]?.recipeKey !== 'state-backed-form'
    || !hasSuggestedSourceParameterContract(featureGoalAccountSettingsOptionsValue?.recipePlanSequence?.[0], 'request-options', 'option-schema-list', 'source-text-input')
    || typeof featureGoalTeamMemberEditorDisplayText !== 'string'
    || !featureGoalTeamMemberEditorDisplayText.includes('Feature goal signals: routing (navigation-frame), form-entry (feature-surface), validation (framework-capability).')
    || !featureGoalTeamMemberEditorDisplayText.includes('Recipe path: start with routed-validated-state-backed-form for routing, form-entry, validation.')
    || !featureGoalTeamMemberEditorDisplayText.includes('request-entity=Team Member, request-selection-id=teamMemberId, request-fields=role select, active toggle, start date, weekly hours number')
    || featureGoalTeamMemberEditorValue?.recipePlanSequence?.[0]?.recipeKey !== 'routed-validated-state-backed-form'
    || featureGoalTeamMemberEditorValue?.recipePlanSequence?.length !== 1
    || featureGoalTeamMemberEditorValue?.recipePlanSequence?.[0]?.suggestedSourceParameterValues?.some((row) => row.key === 'request-fields' && row.value === 'role select, active toggle, start date, weekly hours number') !== true
    || typeof featureGoalTeamMemberOptionsDisplayText !== 'string'
    || !featureGoalTeamMemberOptionsDisplayText.includes('request-entity=Team Member, request-selection-id=teamMemberId, request-fields=role select, permission checkboxes, active toggle, start date, weekly hours number, request-options=role: owner, maintainer, viewer; permission: read, write, administer')
    || !featureGoalTeamMemberOptionsDisplayText.includes('request-options{option-schema-list/source-text-input}')
    || featureGoalTeamMemberOptionsDisplayText.includes('request-options{domain-collection-summary/advisory-only}')
    || featureGoalTeamMemberOptionsValue?.recipePlanSequence?.[0]?.recipeKey !== 'routed-validated-state-backed-form'
    || !hasSuggestedSourceParameterContract(featureGoalTeamMemberOptionsValue?.recipePlanSequence?.[0], 'request-options', 'option-schema-list', 'source-text-input')
    || typeof featureGoalTenantAdminApiSaveDisplayText !== 'string'
    || !featureGoalTenantAdminApiSaveDisplayText.includes('Feature goal signals: routing (navigation-frame), searchable-list (feature-surface), form-entry (feature-surface), validation (framework-capability), service-boundary (integration-boundary), service-write-boundary (integration-boundary).')
    || !featureGoalTenantAdminApiSaveDisplayText.includes('Recipe path: start with routed-searchable-data-table for routing, searchable-list, service-boundary; then borrow routed-service-validated-state-backed-form patterns for form-entry, validation, service-write-boundary.')
    || !featureGoalTenantAdminApiSaveDisplayText.includes('routed-service-validated-state-backed-form: request-entity=Account, request-selection-id=accountId')
    || featureGoalTenantAdminApiSaveValue?.recipePlanSequence?.[0]?.recipeKey !== 'routed-searchable-data-table'
    || featureGoalTenantAdminApiSaveValue?.recipePlanSequence?.[1]?.recipeKey !== 'routed-service-validated-state-backed-form'
    || featureGoalTenantAdminApiSaveValue?.recipePlanSequence?.length !== 2
    || typeof featureGoalOrganizationAdminDisplayText !== 'string'
    || !featureGoalOrganizationAdminDisplayText.includes('searchable-data-table[Audit Log]')
    || !featureGoalOrganizationAdminDisplayText.includes('searchable-data-table[Audit Log]: table-entity=Audit Log, table-collection=auditLogs')
    || !featureGoalOrganizationAdminDisplayText.includes('routed-searchable-data-table: detail-route-parameter=teamId, list-route-path=teams, list-route-title=Teams, table-entity=Team, table-collection=teams')
    || featureGoalOrganizationAdminValue?.recipePlanSequence?.some((row) => row.recipeKey === 'searchable-data-table' && row.instanceLabel === 'Audit Log' && row.suggestedSourceParameterValues?.some((value) => value.key === 'table-entity' && value.value === 'Audit Log')) !== true
    || typeof featureGoalProjectBoardDisplayText !== 'string'
    || !featureGoalProjectBoardDisplayText.includes('Suggested sourceParameterValues: searchable-data-table: table-entity=Task, table-collection=tasks, table-filter-fields=name, assignee select')
    || !featureGoalProjectBoardDisplayText.includes('Suggested sourceParameterValue contracts: searchable-data-table: table-entity{domain-title/source-text-input}, table-collection{source-member-name/source-text-input}, table-filter-fields{field-schema-list/source-text-input}.')
    || featureGoalProjectBoardDisplayText.includes('Board Assignee')
    || featureGoalProjectBoardValue?.recipePlanSequence?.[0]?.suggestedSourceParameterValues?.some((row) => row.key === 'table-entity' && row.value === 'Task') !== true
    || !hasSuggestedSourceParameterContract(featureGoalProjectBoardValue?.recipePlanSequence?.[0], 'table-entity', 'domain-title', 'source-text-input')
    || !hasSuggestedSourceParameterContract(featureGoalProjectBoardValue?.recipePlanSequence?.[0], 'table-collection', 'source-member-name', 'source-text-input')
    || !hasSuggestedSourceParameterContract(featureGoalProjectBoardValue?.recipePlanSequence?.[0], 'table-filter-fields', 'field-schema-list', 'source-text-input')
    || typeof featureGoalProjectManagementWorkspaceDisplayText !== 'string'
    || !featureGoalProjectManagementWorkspaceDisplayText.includes('service-boundary (integration-boundary), service-write-boundary (integration-boundary)')
    || !featureGoalProjectManagementWorkspaceDisplayText.includes('Recipe path: start with routed-searchable-data-table for routing, searchable-list, service-boundary; then borrow routed-service-backed-form patterns for form-entry, service-write-boundary.')
    || !featureGoalProjectManagementWorkspaceDisplayText.includes('table-filter-fields=name, assignee select, due date')
    || !featureGoalProjectManagementWorkspaceDisplayText.includes('request-fields=name, assignee select, due date, comments')
    || featureGoalProjectManagementWorkspaceDisplayText.includes('due date filters')
    || featureGoalProjectManagementWorkspaceValue?.recipePlanSequence?.[0]?.recipeKey !== 'routed-searchable-data-table'
    || featureGoalProjectManagementWorkspaceValue?.recipePlanSequence?.[1]?.recipeKey !== 'routed-service-backed-form'
    || typeof featureGoalIssueTrackerApiSaveDisplayText !== 'string'
    || !featureGoalIssueTrackerApiSaveDisplayText.includes('service-write-boundary (integration-boundary)')
    || !featureGoalIssueTrackerApiSaveDisplayText.includes('borrow routed-service-validated-state-backed-form patterns for validation, service-write-boundary')
    || featureGoalIssueTrackerApiSaveValue?.recipePlanSequence?.some((row) => row.recipeKey === 'routed-service-validated-state-backed-form') !== true
    || typeof featureGoalRepositoryBrowserSearchDisplayText !== 'string'
    || featureGoalRepositoryBrowserSearchDisplayText.includes('form-entry')
    || !featureGoalRepositoryBrowserSearchDisplayText.includes('table-entity=File, table-collection=files')
    || featureGoalRepositoryBrowserSearchValue?.recipePlanSequence?.[0]?.suggestedSourceParameterValues?.some((row) => row.key === 'table-entity' && row.value === 'File') !== true
    || !hasSuggestedSourceParameterContract(featureGoalRepositoryBrowserSearchValue?.recipePlanSequence?.[0], 'table-entity', 'domain-title', 'source-text-input')
    || !hasSuggestedSourceParameterContract(featureGoalRepositoryBrowserSearchValue?.recipePlanSequence?.[0], 'table-collection', 'source-member-name', 'source-text-input')
    || typeof featureGoalRepositoryOwnerFiltersDisplayText !== 'string'
    || !featureGoalRepositoryOwnerFiltersDisplayText.includes('table-entity=Repository, table-collection=repositories, table-filter-fields=name, owner, language select, archived toggle, starred toggle, table-options=language: typescript, javascript, c#')
    || !featureGoalRepositoryOwnerFiltersDisplayText.includes('table-options{option-schema-list/source-text-input}')
    || featureGoalRepositoryOwnerFiltersDisplayText.includes('table-entity=By Owner')
    || featureGoalRepositoryOwnerFiltersDisplayText.includes('language typescript select')
    || featureGoalRepositoryOwnerFiltersValue?.recipePlanSequence?.[0]?.recipeKey !== 'searchable-data-table'
    || !hasSuggestedSourceParameterContract(featureGoalRepositoryOwnerFiltersValue?.recipePlanSequence?.[0], 'table-options', 'option-schema-list', 'source-text-input')
    || typeof featureGoalProductCatalogCompareDisplayText !== 'string'
    || !featureGoalProductCatalogCompareDisplayText.includes('Suggested sourceParameterValues: routed-catalog-storefront: detail-route-parameter=productId, list-route-path=products, list-route-title=Products, catalog-entity=Product, catalog-collection=products, catalog-fields=name, description, category select')
    || !featureGoalProductCatalogCompareDisplayText.includes('Suggested sourceParameterValue contracts: routed-catalog-storefront: detail-route-parameter{route-parameter-name/source-text-input}, list-route-path{route-path/source-text-input}, list-route-title{route-title/source-text-input}, catalog-entity{domain-title/source-text-input}, catalog-collection{source-member-name/source-text-input}, catalog-fields{field-schema-list/source-text-input}.')
    || featureGoalProductCatalogCompareValue?.recipePlanSequence?.[0]?.recipeKey !== 'routed-catalog-storefront'
    || featureGoalProductCatalogCompareValue?.recipePlanSequence?.[0]?.suggestedSourceParameterValues?.some((row) => row.key === 'catalog-fields' && row.value === 'name, description, category select') !== true
    || !hasSuggestedSourceParameterContract(featureGoalProductCatalogCompareValue?.recipePlanSequence?.[0], 'detail-route-parameter', 'route-parameter-name', 'source-text-input')
    || !hasSuggestedSourceParameterContract(featureGoalProductCatalogCompareValue?.recipePlanSequence?.[0], 'list-route-path', 'route-path', 'source-text-input')
    || !hasSuggestedSourceParameterContract(featureGoalProductCatalogCompareValue?.recipePlanSequence?.[0], 'catalog-fields', 'field-schema-list', 'source-text-input')
    || typeof featureGoalStatePluginTodoDisplayText !== 'string'
    || !featureGoalStatePluginTodoDisplayText.includes('Feature goal signals: searchable-list (feature-surface), state-plugin (architecture-choice).')
    || !featureGoalStatePluginTodoDisplayText.includes('Recipe path: start with state-store-list for state-plugin; then borrow searchable-data-table patterns for searchable-list.')
    || featureGoalStatePluginTodoValue?.recipePlanSequence?.[0]?.recipeKey !== 'state-store-list'
    || featureGoalStatePluginTodoValue?.recipePlanSequence?.[1]?.recipeKey !== 'searchable-data-table'
    || featureGoalStatePluginTodoDisplayText.includes('filters select')
    || typeof featureGoalStatePluginProjectTaskDisplayText !== 'string'
    || !featureGoalStatePluginProjectTaskDisplayText.includes('state-store-list: store-item=Project Task, store-collection=projectTasks')
    || !featureGoalStatePluginProjectTaskDisplayText.includes('searchable-data-table: table-entity=Project Task, table-collection=projectTasks, table-filter-fields=name, status select')
    || featureGoalStatePluginProjectTaskDisplayText.includes('table-entity=Status')
    || featureGoalStatePluginProjectTaskValue?.recipePlanSequence?.[0]?.recipeKey !== 'state-store-list'
    || featureGoalStatePluginProjectTaskValue?.recipePlanSequence?.[1]?.recipeKey !== 'searchable-data-table'
    || typeof featureGoalPlainTodoDisplayText !== 'string'
    || !featureGoalPlainTodoDisplayText.includes('Feature goal signals: searchable-list (feature-surface).')
    || featureGoalPlainTodoDisplayText.includes('state-plugin')
    || featureGoalPlainTodoDisplayText.includes('filters select')
    || featureGoalPlainTodoValue?.recipePlanSequence?.[0]?.recipeKey !== 'searchable-data-table'
    || featureGoalPlainTodoValue?.recipePlanSequence?.[0]?.suggestedSourceParameterValues?.some((row) => row.key === 'table-filter-fields')
    || typeof featureGoalProfileEditorDisplayText !== 'string'
    || !featureGoalProfileEditorDisplayText.includes('Feature goal signals: form-entry (feature-surface).')
    || !featureGoalProfileEditorDisplayText.includes('request-fields=avatar url, preferred contact method select')
    || featureGoalProfileEditorDisplayText.includes('request-selection-id=userProfileId')
    || featureGoalProfileEditorValue?.recipePlanSequence?.[0]?.recipeKey !== 'state-backed-form'
    || typeof featureGoalAccountEditorDisplayText !== 'string'
    || !featureGoalAccountEditorDisplayText.includes('state-backed-form: request-entity=Account, request-fields=display name, timezone select')
    || featureGoalAccountEditorDisplayText.includes('request-selection-id=accountId')
    || featureGoalAccountEditorValue?.recipePlanSequence?.[0]?.recipeKey !== 'state-backed-form'
    || typeof featureGoalProfileDetailsDisplayText !== 'string'
    || !featureGoalProfileDetailsDisplayText.includes('Feature goal signals: searchable-list (feature-surface).')
    || !featureGoalProfileDetailsDisplayText.includes('table-filter-fields=name, department select')
    || featureGoalProfileDetailsDisplayText.includes('form-entry')
    || featureGoalProfileDetailsValue?.recipePlanSequence?.[0]?.recipeKey !== 'searchable-data-table'
    || featureGoalProfileDetailsValue?.recipePlanSequence?.length !== 1
    || typeof featureGoalRoutedSettingsDisplayText !== 'string'
    || !featureGoalRoutedSettingsDisplayText.includes('Feature goal signals: routing (navigation-frame), form-entry (feature-surface).')
    || !featureGoalRoutedSettingsDisplayText.includes('Recipe path: start with routed-state-backed-form for routing, form-entry.')
    || featureGoalRoutedSettingsValue?.recipePlanSequence?.[0]?.recipeKey !== 'routed-state-backed-form'
    || typeof featureGoalRouteOnlySettingsDisplayText !== 'string'
    || !featureGoalRouteOnlySettingsDisplayText.includes('Feature goal signals: routing (navigation-frame).')
    || !featureGoalRouteOnlySettingsDisplayText.includes('Recipe path: start with routed-app-shell for routing.')
    || !featureGoalRouteOnlySettingsDisplayText.includes('section-routes=Dashboard, Settings')
    || featureGoalRouteOnlySettingsValue?.featureGoalSignals?.some((row) => row.key === 'form-entry')
    || featureGoalRouteOnlySettingsValue?.recipePlanSequence?.[0]?.recipeKey !== 'routed-app-shell'
    || featureGoalRouteOnlySettingsValue?.recipePlanSequence?.[0]?.suggestedSourceParameterValues?.some((row) => row.key === 'section-routes' && row.value === 'Dashboard, Settings') !== true
    || typeof featureGoalAdminSearchEditDisplayText !== 'string'
    || !featureGoalAdminSearchEditDisplayText.includes('Feature goal signals: searchable-list (feature-surface), form-entry (feature-surface).')
    || !featureGoalAdminSearchEditDisplayText.includes('Recipe path: start with searchable-data-table for searchable-list; then borrow state-backed-form patterns for form-entry.')
    || featureGoalAdminSearchEditValue?.recipePlanSequence?.[0]?.recipeKey !== 'searchable-data-table'
    || featureGoalAdminSearchEditValue?.recipePlanSequence?.[1]?.recipeKey !== 'state-backed-form'
    || featureGoalAdminSearchEditValue?.returnedRecipeCount !== 2
    || featureGoalAdminSearchEditValue?.recipes?.some((row) => row.recipeKey === 'catalog-storefront')
    || typeof adminSearchSignal?.primaryWeight !== 'number'
    || typeof adminFormSignal?.primaryWeight !== 'number'
    || adminSearchSignal.primaryWeight <= adminFormSignal.primaryWeight
    || typeof featureGoalAuthenticatedAdminDisplayText !== 'string'
    || !featureGoalAuthenticatedAdminDisplayText.includes('Feature goal signals: searchable-list (feature-surface), form-entry (feature-surface), localization (framework-capability).')
    || !featureGoalAuthenticatedAdminDisplayText.includes('searchable-data-table: table-entity=Audit Log, table-collection=auditLogs')
    || !featureGoalAuthenticatedAdminDisplayText.includes('localized-state-backed-form: request-entity=Profile, request-selection-id=profileId, request-fields=permission checkboxes')
    || featureGoalAuthenticatedAdminDisplayText.includes('permission toggle')
    || featureGoalAuthenticatedAdminDisplayText.includes('table-entity=Localization')
    || featureGoalAuthenticatedAdminValue?.recipePlanSequence?.[0]?.recipeKey !== 'searchable-data-table'
    || featureGoalAuthenticatedAdminValue?.recipePlanSequence?.[1]?.recipeKey !== 'localized-state-backed-form'
    || typeof featureGoalCrudFormsDisplayText !== 'string'
    || !featureGoalCrudFormsDisplayText.includes('Feature goal signals: searchable-list (feature-surface), form-entry (feature-surface).')
    || !crudFormsSignal?.matchedTerms?.includes('edit+forms')
    || !crudFormsSignal?.matchedTerms?.includes('create+forms')
    || featureGoalCrudFormsValue?.recipePlanSequence?.[0]?.recipeKey !== 'searchable-data-table'
    || featureGoalCrudFormsValue?.recipePlanSequence?.[1]?.recipeKey !== 'state-backed-form'
    || typeof stateBackedFormGuidanceDisplayText !== 'string'
    || !stateBackedFormGuidanceDisplayText.includes('Decision form-value-channel')
    || !stateBackedFormGuidanceDisplayText.includes('DOM string-ish values')
    || !stateBackedFormGuidanceDisplayText.includes('model.bind` for app identity')
    || !stateBackedFormDecisionSurfaces.includes('app-query-batch')
    || stateBackedFormDecisionSurfaces.indexOf('app-query-batch') > stateBackedFormDecisionSurfaces.indexOf('binding-value-channel-summary')
    || appBuildingGuidance.structuredContent.value.value?.recipes?.length < 1
    || typeof routingGuidanceDisplayText !== 'string'
    || !routingGuidanceDisplayText.includes('Decision route-selected-state')
    || !routingGuidanceDisplayText.includes('Principle: Public guidance should handle common route config')
    || !routingDecisionSurfaces.includes('app-query-batch')
    || routingDecisionSurfaces.indexOf('app-query-batch') > routingDecisionSurfaces.indexOf('route-contexts')
    || typeof routedCatalogGuidanceDisplayText !== 'string'
    || !routedCatalogGuidanceDisplayText.includes('Decision route-selected-state')
    || !routedCatalogGuidanceDisplayText.includes('Decision state-boundary')
    || !routedCatalogGuidanceDisplayText.includes('Decision template-model-access')
    || typeof stateStoreGuidanceDisplayText !== 'string'
    || !stateStoreGuidanceDisplayText.includes('Principle: @aurelia/state is a deliberate plugin-backed architecture choice')
    || !stateStoreGuidanceDisplayText.includes('Decision state-store-plugin-boundary')
    || stateStoreGuidanceDisplayText.includes('Decision state-boundary')
    || typeof pluginGuidanceDisplayText !== 'string'
    || !pluginGuidanceDisplayText.includes('Recipe state-store-list')
    || !pluginGuidanceDisplayText.includes('Returned 5 of 7 structured recipe candidates')
    || typeof appQueryCatalog.structuredContent?.value?.summary !== 'string'
    || typeof appQueryCatalogDisplayText !== 'string'
    || !appQueryCatalogDisplayText.includes('Router: start with router-overview')
    || !appQueryCatalogDisplayText.includes('Next: use aurelia_app_query_batch')
    || typeof workspaceOverview.structuredContent?.value?.summary !== 'string'
    || typeof workspaceOverviewDisplayText !== 'string'
    || !workspaceOverviewDisplayText.includes('Default app:')
    || !workspaceOverviewDisplayText.includes('Project rows: omitted by default')
    || workspaceOverview.structuredContent.value.page?.returnedRows !== 0
    || workspaceOverviewWithProjectRows.structuredContent?.value?.page?.returnedRows !== 1
    || typeof routedDataTableAppOverview.structuredContent?.value?.summary !== 'string'
    || typeof routedDataTableAppOverviewDisplayText !== 'string'
    || !routedDataTableAppOverviewDisplayText.includes('App: generated-routed-searchable-data-table')
    || !routedDataTableAppOverviewDisplayText.includes('Next: use aurelia_app_query_batch')
    || typeof routedDataTableRouterOverview.structuredContent?.value?.summary !== 'string'
    || typeof routedDataTableRouterOverviewDisplayText !== 'string'
    || !routedDataTableRouterOverviewDisplayText.includes('Router:')
    || !routedDataTableRouterOverviewDisplayText.includes('Rows: omitted by default')
    || typeof templateCompletions.structuredContent?.value?.summary !== 'string'
    || typeof templateCompletions.structuredContent.value.outcome !== 'string'
    || typeof templateCompletionsDisplayText !== 'string'
    || !templateCompletionsDisplayText.includes('Template completions:')
    || !templateCompletionsDisplayText.includes('Candidates:')
    || typeof templateCursorInfo.structuredContent?.value?.summary !== 'string'
    || typeof templateCursorInfoDisplayText !== 'string'
    || !templateCursorInfoDisplayText.includes('Template cursor:')
    || !templateCursorInfoDisplayText.includes('Value site:')
    || typeof templateDiagnostics.structuredContent?.value?.summary !== 'string'
    || typeof templateDiagnosticsDisplayText !== 'string'
    || !templateDiagnosticsDisplayText.includes('Template diagnostics:')
    || typeof authoringOrientation.structuredContent?.value?.summary !== 'string'
    || authoringOrientation.structuredContent.value.page?.size !== 3
    || authoringOrientationValue?.operations?.length !== 0
    || authoringOrientationValue?.repairs?.length !== 0
    || authoringOrientationValue?.repairClusters?.length > 3
    || authoringOrientationValue?.recipes?.some((recipe) => recipe.currentFitState === 'not-applicable')
    || typeof dataTableOrientation.structuredContent?.value?.summary !== 'string'
    || dataTableHasCustomControlTaste
    || typeof forwardingAccessorOrientation.structuredContent?.value?.summary !== 'string'
    || typeof forwardingAccessorOrientationDisplayText !== 'string'
    || !forwardingAccessorOrientationDisplayText.includes('template-model-access=')
    || !forwardingAccessorOrientationDisplayText.includes('one-hop-forwarding-accessor-pressure')
    || !forwardingAccessorOrientationDisplayText.includes('source-backed-getter-observation')
    || typeof dataTableValueChannelSummary.structuredContent?.value?.summary !== 'string'
    || dataTableValueChannelSummaryValue?.totalRows < 1
    || !dataTableValueChannelRows.every((row) => row.definitionCount >= row.definitionNames.length)
    || dataTableValueChannelFirstCoupling?.definitionCount < dataTableValueChannelFirstCoupling?.definitionNames?.length
    || dataTableValueChannelFirstCoupling?.targetPropertyCount < dataTableValueChannelFirstCoupling?.targetProperties?.length
    || !dataTableValueChannelCouplings.includes('select-option-list-mutation-observer')
    || !dataTableValueChannelCouplings.includes('checked-collection-observer')
    || typeof dataTableDataFlowSummary.structuredContent?.value?.summary !== 'string'
    || dataTableDataFlowSummaryValue?.totalRows < 1
    || dataTableDataFlowIssueRows.length !== 0
    || !dataTableDirectStateEventFlow
    || typeof dataTableObservedDependencySummary.structuredContent?.value?.summary !== 'string'
    || dataTableObservedDependencySummaryValue?.totalRows <= 0
    || dataTableObservedDependencyRows.length === 0
    || !dataTableObservedDependencySourceStates.includes('source')
    || !dataTableObservedDependencyRows.some((row) =>
      row.dependencyKind === 'template-expression-read'
      && row.sourceRootNames?.includes('state')
      && row.sourceBackedCount > 0
    )
    || typeof dataFlowIssueSummary.structuredContent?.value?.summary !== 'string'
    || dataFlowIssueSummary.structuredContent.value.page?.size !== 0
    || issueOnlyDataFlowRows.length !== 0
    || !issueOnlyIssueKinds.includes('source-type-unresolved')
    || !issueOnlyIssueKinds.includes('source-nullish-to-required-target')
    || !issueOnlyIssueKinds.includes('target-nullish-to-required-source')
    || !issueOnlyIssueKinds.includes('target-empty-array-inferred')
    || typeof dataFlowDiagnosticOverview.structuredContent?.value?.summary !== 'string'
    || typeof dataFlowDiagnosticOverviewDisplayText !== 'string'
    || !dataFlowDiagnosticOverviewDisplayText.includes('Diagnostic clusters:')
    || !dataFlowDiagnosticOverviewDisplayText.includes('template/binding-source-assignment-strictness')
    || typeof dataFlowAppDiagnostics.structuredContent?.value?.summary !== 'string'
    || typeof dataFlowAppDiagnosticsDisplayText !== 'string'
    || !dataFlowAppDiagnosticsDisplayText.includes('Diagnostics:')
    || !dataFlowAppDiagnosticsDisplayText.includes('Domains: template=1')
    || typeof routerOpenSeamOverview.structuredContent?.value?.summary !== 'string'
    || typeof routerOpenSeamOverviewDisplayText !== 'string'
    || !routerOpenSeamOverviewDisplayText.includes('Open seam clusters:')
    || !routerOpenSeamOverviewDisplayText.includes('router.open-instruction')
    || typeof dataTableSummaryBatch.structuredContent?.value?.summary !== 'string'
    || typeof dataTableSummaryBatchDisplayText !== 'string'
    || !dataTableSummaryBatchDisplayText.includes('binding-value-channel-summary')
    || !dataTableSummaryBatchDisplayText.includes('Binding data-flow:')
    || !dataTableSummaryBatchDisplayText.includes('issues ')
    || !dataTableSummaryBatchDisplayText.includes('Binding value channels:')
    || !dataTableSummaryBatchDisplayText.includes('observer couplings ')
    || !dataTableSummaryBatchDisplayText.includes('Binding observed dependencies:')
    || !dataTableSummaryBatchDisplayText.includes('member source states ')
    || !dataTableSummaryBatchDisplayText.includes('Profiles: omitted')
    || dataTableSummaryBatchValue?.queryCount !== 3
    || dataTableSummaryBatchValue?.appWorldOpened !== true
    || dataTableSummaryBatchValue?.appProfile !== null
    || dataTableSummaryBatchValue?.appQueryClaimProfiles?.length !== 0
    || dataTableSummaryBatchValue?.rows?.some((row) => row.answer?.value?.rows?.length !== 0)
    || typeof cacheOverview.structuredContent?.value?.summary !== 'string'
    || typeof cacheOverviewDisplayText !== 'string'
    || !cacheOverviewDisplayText.includes('MCP analysis cache:')
    || !cacheOverviewDisplayText.includes('Runtime cache hints:')
    || typeof cacheOverview.structuredContent?.value?.totalSessions !== 'number'
    || cacheOverview.structuredContent.value.totalSessions < 1
    || recipePlanResourceLinks === 0
    || typeof recipePlanDisplayText !== 'string'
    || !recipePlanDisplayText.includes('Plan:')
    || recipePlanDisplayText.includes('Authoring Recipe Probe')
    || !recipePlanDisplayText.includes('Create State-Backed Form')
    || !recipePlanDisplayText.includes('Usage: source-plan start')
    || !recipePlanDisplayText.includes('Form should expose app-authored matcher comparison for object-valued select options.')
    || !recipePlanDisplayText.includes('sourceFilePaths request hints implementation-source(')
    || !recipePlanTextRequestHints.some((row) => row.key === 'implementation-source' && row.sourceFilePaths.includes('src/app.ts') && row.sourceFilePaths.includes('src/components/state-backed-form.html') && !row.sourceFilePaths.includes('src/app.css'))
    || !recipePlanTextRequestHints.some((row) => row.key === 'state-domain-service' && row.sourceFilePaths.includes('src/state/app-state.ts'))
    || !recipePlanTextRequestHints.some((row) => row.key === 'templates' && row.sourceFilePaths.includes('src/components/state-backed-form.html'))
    || !recipePlanTextRequestHints.some((row) => row.key === 'project-tooling' && row.projectToolingPaths.includes('package.json'))
    || patternReferenceRecipePlanValue?.usage !== 'pattern-reference'
    || typeof patternReferenceRecipePlanDisplayText !== 'string'
    || !patternReferenceRecipePlanDisplayText.includes('Usage: pattern reference')
    || !patternReferenceRecipePlanDisplayText.includes('merge them into the primary app plan')
    || !patternReferenceRecipePlanDisplayText.includes('Pattern file shapes:')
    || !patternReferenceRecipePlanDisplayText.includes('merge selectively')
    || typeof sourceParameterizedRecipePlanDisplayText !== 'string'
    || !sourceParameterizedRecipePlanDisplayText.includes('Source parameters: applied detail-route-parameter=accountId, list-route-path=accounts, list-route-title=Accounts, table-entity=Customer Account, table-collection=accounts, table-filter-fields=customer name, due date, status select, total amount number, paid toggle, table-options=status: Open, Overdue, Paid.')
    || !sourceParameterizedRecipePlanDisplayText.includes('host-adapted slots sample-data:table-sample-data{sample-data-summary}')
    || sourceParameterizedRecipePlanDisplayText.includes('presentation:table-presentation{presentation-summary}')
    || sourceParameterizedApplications.filter((row) => row.applicationState === 'applied-to-source-plan').length !== 7
    || sourceParameterizedApplications.filter((row) => row.applicationState === 'advisory-only').length !== 0
    || !sourceParameterizedRecipePlanValue?.sourcePlan?.pattern?.parameters?.some((row) => row.key === 'table-filter-fields' && row.kind === 'field-schema' && row.valueShape === 'field-schema-list' && row.applicationPolicy === 'source-text-input')
    || !sourceParameterizedRecipePlanValue?.sourcePlan?.pattern?.parameters?.some((row) => row.key === 'table-options' && row.kind === 'domain-collection' && row.valueShape === 'option-schema-list' && row.applicationPolicy === 'source-text-input')
    || !sourceParameterizedSourceText.includes('class CustomerAccount')
    || !sourceParameterizedSourceText.includes("export type Status = 'open' | 'overdue' | 'paid';")
    || !sourceParameterizedSourceText.includes("readonly statusOptions: readonly { readonly value: StatusFilter; readonly label: string }[]")
    || !sourceParameterizedSourceText.includes('customerName')
    || !sourceParameterizedSourceText.includes('selectedStatus')
    || !sourceParameterizedSourceText.includes('totalAmount')
    || !sourceParameterizedSourceText.includes('onlyPaid')
    || sourceParameterizedSourceText.includes('status-one')
    || sourceParameterizedSourceText.includes('DirectoryUser')
    || sourceParameterizedSourceText.includes('totalAmountNumber')
    || sourceParameterizedSourceText.includes('dueDateDate')
    || sourceParameterizedSourceText.includes('tasksCompleted')
    || typeof domainOnlyTableRecipePlanDisplayText !== 'string'
    || !domainOnlyTableRecipePlanDisplayText.includes('field-schema:name{field-schema-list}*')
    || !domainOnlyTableRecipePlanDisplayText.includes('and search filtering.')
    || !domainOnlyTableRecipePlanDisplayText.includes('use apply-as-source-start')
    || !domainOnlyTableRecipePlanDisplayText.includes('code economy production-terse')
    || domainOnlyTableRecipePlanDisplayText.includes('checked collection mutation')
    || domainOnlyTableRecipePlanDisplayText.includes('selection controls')
    || domainOnlyTableRecipePlanDisplayText.includes('pagination controls')
    || domainOnlyTableRecipePlanValue?.recipe?.expectedEffectCount !== 41
    || !domainOnlyTableSourceText.includes('class CustomerAccount')
    || !domainOnlyTableSourceText.includes('searchQuery')
    || !domainOnlyTableSourceText.includes('customerAccount.nameLabel')
    || !domainOnlyTableSourceText.includes('state.filteredCustomerAccounts')
    || domainOnlyTableSourceText.includes('state.pageCustomerAccounts')
    || domainOnlyTableSourceText.includes("import './app.css'")
    || domainOnlyTableRecipePlanValue?.sourcePlan?.files?.some((file) => file.path === 'src/app.css') === true
    || domainOnlyTableRecipePlanValue?.sourcePlan?.files?.some((file) => file.textAuthority === 'semantic-runtime-reference-instantiation') === true
    || domainOnlyTableSourceText.includes('selectedCustomerAccountIds')
    || domainOnlyTableSourceText.includes('clearSelection')
    || domainOnlyTableSourceText.includes('togglePageSelection')
    || domainOnlyTableSourceText.includes('pageSizes')
    || domainOnlyTableSourceText.includes('sortBy(column')
    || typeof hintSelectedTableRecipePlanDisplayText !== 'string'
    || !hintSelectedTableRecipePlanDisplayText.includes('requested 1 hint(s), matched 1, unmatched 0')
    || hintSelectedTableRecipePlanDisplayText.includes('requested 3 path(s), matched 3, unmatched 0')
    || hintSelectedTableTextSelection?.requestedHintKeys?.join('|') !== 'state-domain-service'
    || hintSelectedTableTextSelection?.matchedHintKeys?.join('|') !== 'state-domain-service'
    || hintSelectedTableTextSelection?.unmatchedHintKeys?.length !== 0
    || hintSelectedTableTextSelection?.includedPaths?.length !== 3
    || !hintSelectedTableTextSelection?.includedPaths?.includes('src/models/invoice.ts')
    || !hintSelectedTableTextSelection?.includedPaths?.includes('src/services/invoice-service.ts')
    || !hintSelectedTableTextSelection?.includedPaths?.includes('src/state/invoice-table-state.ts')
    || hintSelectedTableTextSelection?.includedPaths?.includes('src/app.css')
    || !hintSelectedTableSourceText.includes('dueDate')
    || !hintSelectedTableSourceText.includes('totalAmount')
    || hintSelectedTableSourceText.includes('dueDateDate')
    || hintSelectedTableSourceText.includes('totalAmountNumber')
    || typeof catalogParameterizedRecipePlanDisplayText !== 'string'
    || !catalogParameterizedRecipePlanDisplayText.includes('Source parameters: applied catalog-entity=Item, catalog-collection=items, catalog-fields=title, description, tier select, monthly price number, available toggle, catalog-options=tier: Basic, Pro, Enterprise.')
    || !catalogParameterizedRecipePlanDisplayText.includes('host-adapted slots domain-collection:selection-model{domain-collection-summary}, sample-data:catalog-sample-data{sample-data-summary}, presentation:catalog-presentation{presentation-summary}')
    || catalogParameterizedApplications.filter((row) => row.applicationState === 'applied-to-source-plan').length !== 4
    || catalogParameterizedApplications.filter((row) => row.applicationState === 'advisory-only').length !== 0
    || !catalogParameterizedRecipePlanValue?.sourcePlan?.pattern?.parameters?.some((row) => row.key === 'catalog-fields' && row.kind === 'field-schema' && row.valueShape === 'field-schema-list' && row.applicationPolicy === 'source-text-input')
    || !catalogParameterizedRecipePlanValue?.sourcePlan?.pattern?.parameters?.some((row) => row.key === 'catalog-options' && row.kind === 'domain-collection' && row.valueShape === 'option-schema-list' && row.applicationPolicy === 'source-text-input')
    || !catalogParameterizedSourceText.includes('class Item')
    || !catalogParameterizedSourceText.includes("export type Tier = 'basic' | 'pro' | 'enterprise';")
    || !catalogParameterizedSourceText.includes('readonly title: string')
    || !catalogParameterizedSourceText.includes('readonly tier: Tier')
    || !catalogParameterizedSourceText.includes('readonly monthlyPrice: number')
    || !catalogParameterizedSourceText.includes('readonly available: boolean')
    || !catalogParameterizedSourceText.includes("tier: 'pro'")
    || !catalogParameterizedSourceText.includes('state.items.visibleItems')
    || catalogParameterizedSourceText.includes('state.items.items')
    || catalogParameterizedSourceText.includes('hasProducts')
    || catalogParameterizedSourceText.includes('Task lamp')
    || typeof routedCatalogParameterizedRecipePlanDisplayText !== 'string'
    || !routedCatalogParameterizedRecipePlanDisplayText.includes('route-identity:product-tiers{route-path}*')
    || !routedCatalogParameterizedRecipePlanDisplayText.includes('feature-copy:Product Tiers{route-title}*')
    || !routedCatalogParameterizedSourceText.includes("path: 'product-tiers'")
    || !routedCatalogParameterizedSourceText.includes("path: 'product-tiers/:productTierId'")
    || !routedCatalogParameterizedSourceText.includes("id: 'product-tier-1'")
    || !routedCatalogParameterizedSourceText.includes('product-tiers/product-tier-1')
    || routedCatalogParameterizedSourceText.includes("path: 'products'")
    || routedCatalogParameterizedSourceText.includes("id: 'item-1'")
    || routedCatalogParameterizedSourceText.includes('lamp-1')
    || typeof requestFormParameterizedRecipePlanDisplayText !== 'string'
    || !requestFormParameterizedRecipePlanDisplayText.includes('Source parameters: applied request-entity=API Credential, request-selection-id=apiCredentialId, request-fields=notification toggles, preferred language select, seat count number, API key field, request-options=preferred language: English, Dutch.')
    || !requestFormParameterizedRecipePlanDisplayText.includes('host-adapted slots sample-data:request-sample-data{sample-data-summary}')
    || requestFormParameterizedRecipePlanDisplayText.includes('presentation:form-presentation{presentation-summary}')
    || requestFormParameterizedApplications.filter((row) => row.applicationState === 'applied-to-source-plan').length !== 4
    || requestFormParameterizedApplications.filter((row) => row.applicationState === 'advisory-only').length !== 0
    || !requestFormParameterizedRecipePlanValue?.sourcePlan?.pattern?.parameters?.some((row) => row.key === 'request-fields' && row.kind === 'field-schema' && row.valueShape === 'field-schema-list')
    || !requestFormParameterizedRecipePlanValue?.sourcePlan?.pattern?.parameters?.some((row) => row.key === 'request-options' && row.kind === 'domain-collection' && row.valueShape === 'option-schema-list' && row.applicationPolicy === 'source-text-input')
    || !requestFormParameterizedSourceText.includes('class ApiCredential')
    || !requestFormParameterizedSourceText.includes("export type PreferredLanguage = 'english' | 'dutch';")
    || !requestFormParameterizedSourceText.includes("readonly preferredLanguageOptions: readonly PreferredLanguage[] = ['english', 'dutch'];")
    || !requestFormParameterizedSourceText.includes('readApiCredential(apiCredentialId')
    || !requestFormParameterizedSourceText.includes('@bindable apiCredentialId')
    || !requestFormParameterizedSourceText.includes('apiCredential.canSubmit')
    || !requestFormParameterizedSourceText.includes('apiCredential.notificationEnabled')
    || !requestFormParameterizedSourceText.includes('apiCredential.preferredLanguage')
    || !requestFormParameterizedSourceText.includes('apiCredential.seatCount')
    || !requestFormParameterizedSourceText.includes('value-as-number.bind="apiCredential.seatCount"')
    || !requestFormParameterizedSourceText.includes('apiCredential.apiKey')
    || requestFormParameterizedSourceText.includes('apiCredential.customerName')
    || requestFormParameterizedSourceText.includes('apiCredential.assignee')
    || requestFormParameterizedSourceText.includes('preferred-language-one')
    || requestFormParameterizedSourceText.includes('ServiceRequest')
    || typeof domainOnlyRequestFormRecipePlanDisplayText !== 'string'
    || !domainOnlyRequestFormRecipePlanDisplayText.includes('field-schema:name{field-schema-list}*')
    || !domainOnlyRequestFormRecipePlanDisplayText.includes('Generated form app plain order submit-readiness getter observes name.')
    || !domainOnlyRequestFormSourceText.includes('class Order')
    || !domainOnlyRequestFormSourceText.includes('public name: string')
    || !domainOnlyRequestFormSourceText.includes("return this.name !== '';")
    || !domainOnlyRequestFormSourceText.includes('order.name')
    || domainOnlyRequestFormSourceText.includes('customerName')
    || domainOnlyRequestFormSourceText.includes('ContactPreference')
    || domainOnlyRequestFormSourceText.includes('SupportAgent')
    || domainOnlyRequestFormSourceText.includes('order.assignee')
    || domainOnlyRequestFormSourceText.includes('ServiceRequest')
    || typeof routedDomainOnlyRequestFormRecipePlanDisplayText !== 'string'
    || !routedDomainOnlyRequestFormRecipePlanDisplayText.includes('route-identity:orderId{route-parameter-name}*')
    || !routedDomainOnlyRequestFormRecipePlanDisplayText.includes('selection-identity:orderId{source-member-name}*')
    || !routedDomainOnlyRequestFormSourceText.includes("path: 'form/:orderId'")
    || !routedDomainOnlyRequestFormSourceText.includes('orderId: string;')
    || !routedDomainOnlyRequestFormSourceText.includes('routeParams.orderId')
    || !routedDomainOnlyRequestFormSourceText.includes('order-id.bind="routeParams.orderId"')
    || routedDomainOnlyRequestFormSourceText.includes('requestId: string;')
    || routedDomainOnlyRequestFormSourceText.includes('routeParams.requestId')
    || routedDomainOnlyRequestFormSourceText.includes("path: 'form/:requestId'")
    || !checkedCollectionFormApplications.every((row) => row.applicationState === 'applied-to-source-plan')
    || !checkedCollectionFormSourceText.includes("export type Role = 'owner' | 'maintainer' | 'viewer';")
    || !checkedCollectionFormSourceText.includes("export type Permission = 'read' | 'write' | 'administer';")
    || !checkedCollectionFormSourceText.includes('public roles: Role[]')
    || !checkedCollectionFormSourceText.includes('public permissions: Permission[]')
    || !checkedCollectionFormSourceText.includes("readonly roleOptions: readonly Role[] = ['owner', 'maintainer', 'viewer'];")
    || !checkedCollectionFormSourceText.includes("readonly permissionOptions: readonly Permission[] = ['read', 'write', 'administer'];")
    || !checkedCollectionFormSourceText.includes('model.bind="option" checked.bind="accessProfile.permissions"')
    || checkedCollectionFormSourceText.includes('permission-one')
    || !checkedCollectionFormRecipePlanValue?.expectedEffectHighlights?.some((row) => row.summary?.includes('checked collection membership'))
    || multiStepWizardParameterizedApplications.filter((row) => row.applicationState === 'applied-to-source-plan').length !== 4
    || multiStepWizardParameterizedApplications.filter((row) => row.applicationState === 'advisory-only').length !== 0
    || !multiStepWizardParameterizedRecipePlanValue?.sourcePlan?.pattern?.parameters?.some((row) => row.key === 'wizard-entity' && row.kind === 'domain-entity' && row.valueShape === 'domain-title' && row.applicationPolicy === 'source-text-input')
    || !multiStepWizardParameterizedRecipePlanValue?.sourcePlan?.pattern?.parameters?.some((row) => row.key === 'wizard-steps' && row.kind === 'domain-collection' && row.valueShape === 'workflow-step-list' && row.applicationPolicy === 'source-text-input')
    || !multiStepWizardParameterizedRecipePlanValue?.sourcePlan?.pattern?.parameters?.some((row) => row.key === 'wizard-section-fields' && row.kind === 'field-schema' && row.valueShape === 'workflow-section-field-schema-list' && row.applicationPolicy === 'source-text-input')
    || !multiStepWizardParameterizedRecipePlanValue?.sourcePlan?.pattern?.parameters?.some((row) => row.key === 'wizard-options' && row.kind === 'domain-collection' && row.valueShape === 'option-schema-list' && row.applicationPolicy === 'source-text-input')
    || !multiStepWizardParameterizedSourceText.includes('class Checkout')
    || !multiStepWizardParameterizedSourceText.includes("export type WizardStepId = 'cart' | 'shipping' | 'payment' | 'confirmation';")
    || !multiStepWizardParameterizedSourceText.includes("export type PaymentMethod = 'card' | 'invoice' | 'paypal';")
    || !multiStepWizardParameterizedSourceText.includes("new WizardStep('shipping', 'Shipping')")
    || !multiStepWizardParameterizedSourceText.includes("state.currentStep.id === 'payment'")
    || !multiStepWizardParameterizedSourceText.includes('Cart fields belong to the caller workflow')
    || !multiStepWizardParameterizedSourceText.includes('public shippingAddress: string')
    || !multiStepWizardParameterizedSourceText.includes('public paymentMethod: PaymentMethod | null')
    || !multiStepWizardParameterizedSourceText.includes("readonly paymentMethodOptions: readonly PaymentMethod[] = ['card', 'invoice', 'paypal'];")
    || !multiStepWizardParameterizedSourceText.includes('readonly checkout = createCheckout')
    || !multiStepWizardParameterizedSourceText.includes('completedCheckoutCount')
    || !multiStepWizardParameterizedSourceText.includes('.on(Checkout)')
    || !multiStepWizardParameterizedSourceText.includes("value.two-way=\"state.checkout.shippingAddress & validate:'blur'\"")
    || !multiStepWizardParameterizedSourceText.includes('value.bind="state.checkout.paymentMethod"')
    || !multiStepWizardParameterizedSourceText.includes('state.checkout.canSubmit')
    || multiStepWizardParameterizedSourceText.includes('state.profile')
    || multiStepWizardParameterizedSourceText.includes('OnboardingProfile')
    || multiStepWizardParameterizedSourceText.includes('contactSummary')
    || multiStepWizardParameterizedSourceText.includes('featureIds')
    || !multiStepWizardParameterizedRecipePlanValue?.expectedEffectHighlights?.some((row) => row.summary?.includes('Payment Method field writes'))
    || routedTeamMemberEditorApplications.filter((row) => row.applicationState === 'applied-to-source-plan').length !== 5
    || !routedTeamMemberEditorSourceText.includes('class TeamMember')
    || !routedTeamMemberEditorSourceText.includes('public role: Role | null')
    || !routedTeamMemberEditorSourceText.includes('public active: boolean')
    || !routedTeamMemberEditorSourceText.includes('public startDate: string')
    || !routedTeamMemberEditorSourceText.includes('public weeklyHours: number')
    || !routedTeamMemberEditorSourceText.includes('teamMember.canSubmit')
    || !routedTeamMemberEditorSourceText.includes('type="date"')
    || !routedTeamMemberEditorSourceText.includes('value.bind="teamMember.startDate"')
    || !routedTeamMemberEditorSourceText.includes('value-as-number.bind="teamMember.weeklyHours"')
    || !routedTeamMemberEditorSourceText.includes('team-member-id.bind="routeParams.teamMemberId"')
    || !routedTeamMemberEditorSourceText.includes('form/team-member-1+summary')
    || !routedTeamMemberEditorSourceText.includes('team-member-1')
    || routedTeamMemberEditorSourceText.includes('startDateDate')
    || routedTeamMemberEditorSourceText.includes('weeklyHoursNumber')
    || routedTeamMemberEditorSourceText.includes('ServiceRequest')
    || routedTeamMemberEditorSourceText.includes('request-1')
    || routedTeamMemberEditorSourceText.includes('submitted request')
    || sectionedRoutedAppShellApplications.filter((row) => row.applicationState === 'applied-to-source-plan').length !== 1
    || !sectionedRoutedAppShellRecipePlanValue?.sourcePlan?.pattern?.parameters?.some((row) => row.key === 'section-routes' && row.valueShape === 'route-section-list' && row.applicationPolicy === 'source-text-input')
    || !sectionedRoutedAppShellSourceText.includes('DashboardRoute')
    || !sectionedRoutedAppShellSourceText.includes('SettingsRoute')
    || !sectionedRoutedAppShellSourceText.includes('load="dashboard"')
    || !sectionedRoutedAppShellSourceText.includes('load="settings"')
    || sectionedRoutedAppShellSourceText.includes('This route is part of the static app shell navigation.')
    || sectionedRoutedAppShellSourceText.includes('IRouteContext')
    || sectionedRoutedAppShellSourceText.includes('itemId')
    || typeof selectedSourceRecipePlanDisplayText !== 'string'
    || !selectedSourceRecipePlanDisplayText.includes('source/project-tooling text included for 2')
    || !selectedSourceRecipePlanDisplayText.includes('generated source/tooling artifact(s)')
    || selectedSourceRecipeTextSelection?.requestedPaths?.length !== 2
    || selectedSourceRecipeTextSelection?.matchedPaths?.length !== 2
    || selectedSourceRecipeTextSelection?.unmatchedPaths?.length !== 0
    || selectedSourceRecipeTextSelection?.includedPaths?.length !== 2
    || !selectedSourceRecipeTextSelection.includedPaths.includes('package.json')
    || !selectedSourceRecipeTextSelection.includedPaths.includes('src/state/catalog-state.ts')
    || selectedSourceRecipeTextPaths.length !== 2
    || selectedSourceRecipeTextPaths[0] !== 'package.json'
    || selectedSourceRecipeTextPaths[1] !== 'src/state/catalog-state.ts'
    || appBuildingGuidanceResource.contents.length === 0
    || typeof appBuildingGuidanceResourceValue?.summary !== 'string'
    || typeof appBuildingGuidanceResourceValue?.value?.displayText !== 'string'
    || recipeResource.contents.length === 0
    || typeof recipeResourceValue?.summary !== 'string'
    || !recipeResourceRowsAreTerse
    || appQueryResource.contents.length === 0
    || typeof appQueryResourceValue?.summary !== 'string'
    || prompts.prompts.length === 0
    || orientPrompt.messages.length === 0
    || buildFeaturePrompt.messages.length === 0
    || !orientPromptText.includes('aurelia_authoring_orientation')
    || !orientPromptText.includes('analysisDepth=binding-observation')
    || !orientPromptText.includes('aurelia_app_query_batch')
    || !orientPromptText.includes('binding-value-channel-summary')
    || !orientPromptText.includes('binding-data-flow-summary')
    || !orientPromptText.includes('binding-observed-dependency-summary')
    || !orientPromptText.includes('includeAppProfile')
    || !buildFeaturePromptText.includes('decision keys')
    || !buildFeaturePromptText.includes('no feature-goal signals matched')
    || !buildFeaturePromptText.includes('fallback context')
    || !buildFeaturePromptText.includes('recipes array is comparison context')
    || !buildFeaturePromptText.includes('suggestedSourceParameterContracts')
    || !buildFeaturePromptText.includes('trust suggestedSourceParameterContracts over static compact recipe-row slots')
    || !buildFeaturePromptText.includes('sourcePlan.pattern.usePolicy')
    || !buildFeaturePromptText.includes('Source roles tell you where')
    || !buildFeaturePromptText.includes('adapt advisory-only field schema')
    || !buildFeaturePromptText.includes('valueShape')
    || !buildFeaturePromptText.includes('sourceTextRequestHintKeys')
    || !buildFeaturePromptText.includes('aurelia_authoring_orientation')
    || !buildFeaturePromptText.includes('analysisDepth=binding-observation')
    || !buildFeaturePromptText.includes('aurelia_app_query_batch')
    || !buildFeaturePromptText.includes('binding-value-channel-summary')
    || !buildFeaturePromptText.includes('binding-data-flow-summary')
    || !buildFeaturePromptText.includes('binding-observed-dependency-summary')
    || !buildFeaturePromptText.includes('profiling fields off')
  ) {
    if (probeFailures.length > 0) {
      console.error(`Probe guidance assertion failures: ${probeFailures.join(', ')}`);
    } else {
      console.error('Probe assertion failure outside labeled guidance canaries.');
    }
    process.exitCode = 1;
  }
} finally {
  await client.close();
}
