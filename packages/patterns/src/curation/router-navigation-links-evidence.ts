import type { AureliaPatternExample } from '../pattern-contract.js';
import type { DocsCorpus } from '../corpus/corpus-types.js';
import { routerNavigationLinksAdmission } from './admission-records.js';
import {
  analyzePatternEvidence,
  formatPatternEvidenceReport,
  type PatternDocumentEvidence,
  type PatternEvidenceCheck,
  type PatternEvidenceProfile,
  type PatternEvidenceReport,
  type PatternMetadataDraft
} from './evidence-review.js';

export type RouterNavigationLinksEvidenceReport = PatternEvidenceReport;
export type RouterNavigationLinksEvidenceCheck = PatternEvidenceCheck;
export type RouterNavigationLinksDocumentEvidence = PatternDocumentEvidence;
export type RouterNavigationLinksMetadataDraft = PatternMetadataDraft;

export const routerNavigationLinksEvidenceProfile: PatternEvidenceProfile = {
  admission: routerNavigationLinksAdmission,
  documents: [
    {
      relativePath: 'router/navigating.md',
      role: 'primary-grounding',
      curationNote: 'Grounds href/load custom attributes, route params binding, navigation options, and programmatic router.load as a separate command lane.'
    },
    {
      relativePath: 'router/route-expression-syntax.md',
      role: 'primary-grounding',
      curationNote: 'Grounds relative, child, sibling, parameter, and query route expression syntax for declarative links.'
    },
    {
      relativePath: 'router/configuring-routes.md',
      role: 'supporting-grounding',
      curationNote: 'Grounds route table declarations referenced by the link expressions.'
    },
    {
      relativePath: 'router/viewports.md',
      role: 'supporting-grounding',
      curationNote: 'Grounds the viewport target for routed content in the shell.'
    },
    {
      relativePath: 'router/router-events.md',
      role: 'companion-evidence',
      curationNote: 'Navigation progress is covered by the shell progress pattern, not by each link.'
    },
    {
      relativePath: 'router/troubleshooting.md',
      role: 'companion-evidence',
      curationNote: 'Grounds follow-up diagnostics for unresolved routes and route expression mistakes.'
    }
  ],
  requiredEvidence: [
    { key: 'declarative route links', signalNames: ['route-link'] },
    { key: 'route table support', signalNames: ['route-config'] },
    { key: 'viewport support', signalNames: ['route-viewport'] },
    {
      key: 'deferred concerns detected before admission',
      signalNames: routerNavigationLinksAdmission.deferredSignals
    }
  ],
  metadataDraft: {
    summary:
      'Use router-aware anchor links with route expressions for ordinary in-app navigation, keeping programmatic router.load calls for command flows.',
    whenToUse: [
      'A shell, sidebar, or routed page needs ordinary declarative links between known routes.',
      'Relative route expressions make the navigation easier to read than imperative router.load calls.',
      'The link should stay visible as platform anchor markup while Aurelia owns route resolution.'
    ],
    whenNotToUse: [
      'Navigation depends on a command result, confirmation, or async authorization decision.',
      'The route needs critical data loading, guards, or parameter aggregation beyond constructing the link.',
      'The problem is global navigation progress, route error recovery, or active-link styling policy.'
    ],
    assumptions: [
      'The route table is known at shell authoring time.',
      'The links are normal navigation affordances.',
      'The target routes own loading, guards, and parameter-reading policy.'
    ],
    handoffNotes: [
      'Keep ordinary navigation declarative.',
      'Use programmatic navigation only for command flows.',
      'Keep link expressions aligned with route ids and parameters.'
    ]
  }
};

export function analyzeRouterNavigationLinksEvidence(
  corpus: DocsCorpus,
  pattern?: AureliaPatternExample
): RouterNavigationLinksEvidenceReport {
  return analyzePatternEvidence(corpus, routerNavigationLinksEvidenceProfile, pattern);
}

export function formatRouterNavigationLinksEvidenceReport(
  report: RouterNavigationLinksEvidenceReport
): string {
  return formatPatternEvidenceReport(report);
}
