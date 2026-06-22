import { routerGuardRedirectAdmission } from './admission-records.js';
import type { PatternEvidenceProfile } from './evidence-review.js';

export const routerGuardRedirectEvidenceProfile: PatternEvidenceProfile = {
  admission: routerGuardRedirectAdmission,
  documents: [
    {
      relativePath: 'router/routing-lifecycle.md',
      role: 'primary-grounding',
      curationNote: 'Grounds canLoad, redirecting from canLoad, and route lifecycle order.'
    },
    {
      relativePath: 'router/configuring-routes.md',
      role: 'primary-grounding',
      curationNote: 'Grounds route configuration and route targets.'
    },
    {
      relativePath: 'router/navigating.md',
      role: 'supporting-grounding',
      curationNote: 'Supports navigation instructions and route links.'
    },
    {
      relativePath: 'router/router-events.md',
      role: 'deferred-evidence',
      curationNote: 'Shell progress belongs beside async guards rather than inside this guard example.'
    }
  ],
  requiredEvidence: [
    { key: 'route guard lifecycle', signalNames: ['can-load-hook', 'route-lifecycle'] },
    { key: 'route configuration', signalNames: ['route-config', 'route-link'] }
  ],
  metadataDraft: {
    summary: 'Use `canLoad` to decide route entry and return a navigation instruction when the user should be redirected.',
    whenToUse: [
      'A route parameter or permission check decides entry.',
      'The redirect is part of the route transaction.',
      'The guard can answer quickly.'
    ],
    whenNotToUse: [
      'The page may render before secondary content loads.',
      'Long setup belongs in `loading()`.',
      'The decision belongs in shared state/service code.'
    ],
    assumptions: [
      'The guard can decide quickly.',
      'Denied entry should redirect.',
      'Critical data loading stays separate.'
    ],
    handoffNotes: [
      'Keep `canLoad` focused on entry decisions.',
      'Move reusable decision state behind DI.',
      'Pair async waits with shell navigation progress.'
    ]
  }
};
