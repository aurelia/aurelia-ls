import { routerRelativeContextNavigationAdmission } from './admission-records.js';
import type { PatternEvidenceProfile } from './evidence-review.js';

export const routerRelativeContextNavigationEvidenceProfile: PatternEvidenceProfile = {
  admission: routerRelativeContextNavigationAdmission,
  documents: [
    {
      relativePath: 'router/child-routing.md',
      role: 'primary-grounding',
      curationNote: 'Grounds nested route context and child-route navigation scenarios.'
    },
    {
      relativePath: 'router/navigating.md',
      role: 'primary-grounding',
      curationNote: 'Grounds router.load and navigation options including context.'
    },
    {
      relativePath: 'router/api-reference.md',
      role: 'supporting-grounding',
      curationNote: 'Grounds IRouter, IRouteContext, and navigation option shapes.'
    },
    {
      relativePath: 'router/route-parameters.md',
      role: 'supporting-grounding',
      curationNote: 'Supports the companion route-context parameter-read pattern without merging it into navigation.'
    }
  ],
  requiredEvidence: [
    { key: 'relative navigation context', signalNames: ['relative-route-navigation', 'route-context'] },
    { key: 'router load/navigation substrate', signalNames: ['router', 'route-link'] }
  ],
  metadataDraft: {
    summary: 'Use `router.load(..., { context })` when programmatic navigation should be resolved relative to the current route context.',
    whenToUse: [
      'A child route navigates relative to the current route context.',
      'Navigation collaborates with route parameters or loading.',
      'A command method is clearer than a template instruction.'
    ],
    whenNotToUse: [
      'A plain anchor route expression is enough.',
      'Navigation should be absolute.',
      'The route data should be read instead of navigating.'
    ],
    assumptions: [
      'The component is hosted by the route context.',
      'Programmatic navigation is clearer here.',
      'Parameter aggregation stays separate.'
    ],
    handoffNotes: [
      'Use anchors for ordinary navigation.',
      'Keep relative context explicit.',
      'Pair with route-context parameter reads when loading data.'
    ]
  }
};
