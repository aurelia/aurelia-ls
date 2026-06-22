import type { AureliaPatternExample } from '../pattern-contract.js';
import type { DocsCorpus } from '../corpus/corpus-types.js';
import { routerActiveNavigationAdmission } from './admission-records.js';
import {
  analyzePatternEvidence,
  formatPatternEvidenceReport,
  type PatternDocumentEvidence,
  type PatternEvidenceCheck,
  type PatternEvidenceProfile,
  type PatternEvidenceReport,
  type PatternMetadataDraft
} from './evidence-review.js';

export type RouterActiveNavigationEvidenceReport = PatternEvidenceReport;
export type RouterActiveNavigationEvidenceCheck = PatternEvidenceCheck;
export type RouterActiveNavigationDocumentEvidence = PatternDocumentEvidence;
export type RouterActiveNavigationMetadataDraft = PatternMetadataDraft;

export const routerActiveNavigationEvidenceProfile: PatternEvidenceProfile = {
  admission: routerActiveNavigationAdmission,
  documents: [
    {
      relativePath: 'router/navigation-model.md',
      role: 'primary-grounding',
      curationNote: 'Grounds INavigationModel, INavigationRoute, route.isActive, navigationModel.resolve(), and nav:false route exclusion.'
    },
    {
      relativePath: 'router/router-configuration.md',
      role: 'supporting-grounding',
      curationNote: 'Grounds useNavigationModel, activeClass as a static-link companion option, and router defaults.'
    },
    {
      relativePath: 'router/navigating.md',
      role: 'supporting-grounding',
      curationNote: 'Grounds ordinary router-aware href/load links and the load.active companion option.'
    },
    {
      relativePath: 'router/configuring-routes.md',
      role: 'supporting-grounding',
      curationNote: 'Grounds route configuration metadata used by the navigation model.'
    },
    {
      relativePath: 'router/viewports.md',
      role: 'supporting-grounding',
      curationNote: 'Grounds the viewport that renders the active route selected from the shell navigation.'
    }
  ],
  requiredEvidence: [
    { key: 'navigation model state', signalNames: ['navigation-model'] },
    { key: 'active route styling', signalNames: ['active-class-binding', 'router-active-class'] },
    { key: 'router link and route table support', signalNames: ['route-link', 'route-config'] },
    { key: 'viewport support', signalNames: ['route-viewport'] },
    {
      key: 'deferred concerns detected before admission',
      signalNames: routerActiveNavigationAdmission.deferredSignals
    }
  ],
  metadataDraft: {
    summary:
      'Use the router navigation model when a shell should render route links and style the active item from router-owned state.',
    whenToUse: [
      'A shell or feature layout should build a menu from configured routes.',
      'Active styling should follow the router state instead of duplicated local selection state.',
      'Routes can opt into or out of the menu through route configuration.'
    ],
    whenNotToUse: [
      'The menu is a small static set of links that does not need route metadata.',
      'Navigation depends on a command result, guard decision, or async workflow.',
      'The UI needs route-critical data loading, auth redirects, or navigation error recovery at the same time.'
    ],
    assumptions: [
      'The router navigation model is enabled.',
      'Menu entries should come from route configuration.',
      'The active class is presentational.'
    ],
    handoffNotes: [
      'Keep route metadata close to routes.',
      'Resolve async route configuration before rendering dynamic menus.',
      'Keep active styling presentational.'
    ]
  }
};

export function analyzeRouterActiveNavigationEvidence(
  corpus: DocsCorpus,
  pattern?: AureliaPatternExample
): RouterActiveNavigationEvidenceReport {
  return analyzePatternEvidence(corpus, routerActiveNavigationEvidenceProfile, pattern);
}

export function formatRouterActiveNavigationEvidenceReport(
  report: RouterActiveNavigationEvidenceReport
): string {
  return formatPatternEvidenceReport(report);
}
