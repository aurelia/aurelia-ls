import { routerAuthSessionGuardAdmission } from './admission-records.js';
import type { PatternEvidenceProfile } from './evidence-review.js';

export const routerAuthSessionGuardEvidenceProfile: PatternEvidenceProfile = {
  admission: routerAuthSessionGuardAdmission,
  documents: [
    {
      relativePath: 'router/router-hooks.md',
      role: 'primary-grounding',
      curationNote: 'Grounds canLoad route admission hooks and route lifecycle behavior.'
    },
    {
      relativePath: 'developer-guides/security.md',
      role: 'primary-grounding',
      curationNote: 'Grounds auth as a server-enforced security boundary while still allowing client-side routing UX.'
    },
    {
      relativePath: 'getting-started/extended-tutorial/step-6-route-data-and-roles.md',
      role: 'primary-grounding',
      curationNote: 'Grounds route data and role-based route checks.'
    },
    {
      relativePath: 'router/route-parameters.md',
      role: 'supporting-grounding',
      curationNote: 'Grounds route node and route-context parameter reading used by routed view-models.'
    }
  ],
  requiredEvidence: [
    { key: 'canLoad route admission', signalNames: ['can-load-hook'] },
    { key: 'route data and roles', signalNames: ['route-config', 'route-lifecycle'] },
    { key: 'auth/security grounding', signalNames: ['auth-interceptor', 'http-client', 'router'] },
    { key: 'injected session boundary', signalNames: ['dependency-injection', 'di-interface-token'] }
  ],
  metadataDraft: {
    summary: 'Use canLoad and injected session state when route entry depends on authentication or static role metadata.',
    whenToUse: [
      'Protected routed areas need redirects before entry.',
      'Route data names static roles.',
      'Shell and pages share session state.'
    ],
    whenNotToUse: [
      'Server authorization is missing.',
      'The check is a single command affordance.',
      'An external auth SDK owns redirects.'
    ],
    assumptions: [
      'Client guards improve UX only.',
      'Session state is shared through DI.',
      'Route data is small static metadata.'
    ],
    handoffNotes: [
      'Keep auth facts in an injected session boundary.',
      'Use route data only for simple static requirements.',
      'Mirror client guards on the server.'
    ]
  }
};
