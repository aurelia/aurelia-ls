import { routerErrorFallbackAdmission } from './admission-records.js';
import type { PatternEvidenceProfile } from './evidence-review.js';

export const routerErrorFallbackEvidenceProfile: PatternEvidenceProfile = {
  admission: routerErrorFallbackAdmission,
  documents: [
    {
      relativePath: 'router/configuring-routes.md',
      role: 'primary-grounding',
      curationNote: 'Grounds route fallback configuration for unknown paths.'
    },
    {
      relativePath: 'router/error-handling.md',
      role: 'primary-grounding',
      curationNote: 'Grounds fallback as a route-level error-recovery affordance.'
    },
    {
      relativePath: 'router/viewports.md',
      role: 'supporting-grounding',
      curationNote: 'Supports viewport fallback variants while keeping the public pattern on route config fallback.'
    },
    {
      relativePath: 'router/troubleshooting.md',
      role: 'supporting-grounding',
      curationNote: 'Supports operational checks around fallback routes.'
    }
  ],
  requiredEvidence: [
    { key: 'fallback route configuration', signalNames: ['route-fallback', 'route-config'] },
    { key: 'route recovery navigation', signalNames: ['route-link', 'route-viewport'] }
  ],
  metadataDraft: {
    summary: 'Configure a router fallback so unknown paths resolve to a deliberate route instead of leaving navigation undefined.',
    whenToUse: [
      'A route tree needs a known destination for unknown paths.',
      'The fallback component offers recovery links.',
      'The fallback belongs to route configuration.'
    ],
    whenNotToUse: [
      'A guard should redirect a known denied route.',
      'A data request failed after route load.',
      'Server-side rewrites are the main issue.'
    ],
    assumptions: [
      'The route tree owns the fallback.',
      'The fallback component is registered.',
      'Recovery uses ordinary navigation links.'
    ],
    handoffNotes: [
      'Use guards for known denied transitions.',
      'Keep request errors separate.',
      'Check deployment rewrites separately.'
    ]
  }
};
