import type { AureliaPatternExample } from '../pattern-contract.js';
import type { DocsCorpus } from '../corpus/corpus-types.js';
import { resourceCustomAttributeAdmission } from './admission-records.js';
import {
  analyzePatternEvidence,
  formatPatternEvidenceReport,
  type PatternDocumentEvidence,
  type PatternEvidenceCheck,
  type PatternEvidenceProfile,
  type PatternEvidenceReport,
  type PatternMetadataDraft
} from './evidence-review.js';

export type ResourceCustomAttributeEvidenceReport = PatternEvidenceReport;
export type ResourceCustomAttributeEvidenceCheck = PatternEvidenceCheck;
export type ResourceCustomAttributeDocumentEvidence = PatternDocumentEvidence;
export type ResourceCustomAttributeMetadataDraft = PatternMetadataDraft;

export const resourceCustomAttributeEvidenceProfile: PatternEvidenceProfile = {
  admission: resourceCustomAttributeAdmission,
  documents: [
    {
      relativePath: 'templates/custom-attributes.md',
      role: 'primary-grounding',
      curationNote: 'Grounds basic custom attribute declaration, bindables, host element access through INode, change callbacks, and lifecycle options.'
    },
    {
      relativePath: 'templates/advanced-custom-attributes.md',
      role: 'deferred-evidence',
      curationNote: 'Advanced template controllers, complex bindings, third-party integrations, and performance patterns are useful evidence but not the first public example.'
    },
    {
      relativePath: 'components/component-lifecycles.md',
      role: 'supporting-grounding',
      curationNote: 'Grounds that lifecycle hooks apply to custom attributes as well as custom elements.'
    },
    {
      relativePath: 'developer-guides/working-with-web-standards.md',
      role: 'supporting-grounding',
      curationNote: 'Grounds platform-first DOM behavior as an application concern.'
    },
    {
      relativePath: 'reference/examples/custom-attributes/README.md',
      role: 'supporting-grounding',
      curationNote: 'Provides additional custom-attribute example inventory without making the reference examples the public pattern source.'
    }
  ],
  requiredEvidence: [
    { key: 'custom attribute declaration', signalNames: ['custom-attribute'] },
    { key: 'host element access through DI', signalNames: ['host-element', 'resolve-service', 'dependency-injection'] },
    { key: 'bindable attribute value', signalNames: ['bindable-component'] },
    {
      key: 'deferred concerns detected before admission',
      signalNames: resourceCustomAttributeAdmission.deferredSignals
    }
  ],
  metadataDraft: {
    summary:
      'Use a custom attribute when one reusable DOM element behavior should be attached declaratively to ordinary markup.',
    whenToUse: [
      'Several elements need the same host-level behavior or class policy.',
      'The behavior belongs to the element it is attached to, not to a wrapper component.',
      'The attribute can be configured with a small bindable value.'
    ],
    whenNotToUse: [
      'The UI needs its own template, projected content, or a reusable visual frame.',
      'The behavior is one-off local component logic that does not need a reusable resource.',
      'The attribute would control rendering, container scope, or third-party lifecycle policy.'
    ],
    assumptions: [
      'The custom attribute owns only host-element decoration.',
      'The status tone is a small controlled value supplied by the consuming component.',
      'The attribute is imported where it is used.'
    ],
    handoffNotes: [
      'Use custom elements when behavior needs markup.',
      'Keep host access behind Aurelia DI.',
      'Separate advanced attribute roles.'
    ]
  }
};

export function analyzeResourceCustomAttributeEvidence(
  corpus: DocsCorpus,
  pattern?: AureliaPatternExample
): ResourceCustomAttributeEvidenceReport {
  return analyzePatternEvidence(corpus, resourceCustomAttributeEvidenceProfile, pattern);
}

export function formatResourceCustomAttributeEvidenceReport(
  report: ResourceCustomAttributeEvidenceReport
): string {
  return formatPatternEvidenceReport(report);
}
