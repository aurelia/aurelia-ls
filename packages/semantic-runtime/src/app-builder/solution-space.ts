/** Canonical product/application space; broader than domain slots and less structural than scenarios or patterns. */
export enum AppBuilderSolutionSpaceId {
  /** Public or authenticated shopping/catalog experience with browsing, comparison, cart, pricing, or checkout pressure. */
  CommerceStorefront = 'commerce-storefront',
  /** Directory/catalog experience for browsing and comparing people, places, services, documents, media, or resources. */
  CatalogDirectory = 'catalog-directory',
  /** Internal operational/admin workspace with records, status, approvals, assignments, and actions. */
  OperationsBackoffice = 'operations-backoffice',
  /** Support, inbox, ticket, case, incident, or customer-response workspace. */
  SupportWorkspace = 'support-workspace',
  /** Content, document, knowledge-base, repository, or searchable library surface. */
  ContentKnowledgeBase = 'content-knowledge-base',
  /** Learning, course, curriculum, enrollment, or training portal. */
  LearningPortal = 'learning-portal',
  /** Metrics, reporting, monitoring, operational analytics, or executive overview surface. */
  ReportingAnalytics = 'reporting-analytics',
  /** User, tenant, account, preference, profile, or workspace settings surface. */
  AccountSettings = 'account-settings',
}

/** Solution-space descriptor used to bias menus without becoming a domain model or fixture. */
export interface AppBuilderSolutionSpaceDescriptor {
  readonly id: AppBuilderSolutionSpaceId;
  readonly title: string;
  readonly summary: string;
  readonly commonUserGoals: readonly string[];
}
