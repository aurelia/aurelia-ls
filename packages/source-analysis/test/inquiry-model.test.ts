import { describe, expect, it } from './test-harness.js';

import { ANSWER_REF_KINDS } from '../src/answer-ref.js';
import {
  CARRIER_PROVENANCE_ENTRY_KINDS,
  COGNITIVE_QUESTION_ROUTES,
  CONTROL_FOCUS_KINDS,
  EVIDENCE_FOCUS_KINDS,
  EVIDENCE_PROVENANCE_ENTRY_KINDS,
  FOCUS_KINDS,
  MAINTENANCE_QUESTION_ROUTES,
  PAYLOAD_READ_MODES,
  POLICY_FOCUS_KINDS,
  PRESENTATION_READ_MODES,
  QUESTION_ROUTES,
  READ_MODES,
  SUBJECT_FOCUS_KINDS,
  composeWorldFrame,
  createReadModeFamilies,
  createQuestionRouteFamilies,
  executionPostureFromFrame,
  flattenReadModeFamilies,
  flattenQuestionRouteFamilies,
  isCarrierProvenanceEntryKind,
  isCognitiveQuestionRoute,
  isControlFocusKind,
  isEvidenceProvenanceEntryKind,
  isEvidenceFocusKind,
  isMaintenanceQuestionRoute,
  isPayloadReadMode,
  isPolicyFocusKind,
  isPresentationReadMode,
  isSubjectFocusKind,
  questionRouteFromSelection,
  resolvePresentationReadMode,
  selectCognitiveQuestionRoute,
  selectMaintenanceQuestionRoute,
  selectQuestionRoute,
  worldTargetingFromFrame,
} from '../src/inquiry-model.js';

describe('Source-analysis inquiry ontology', () => {
  it('splits inquiry focus, route, read, and provenance kinds into explicit families', () => {
    expect(FOCUS_KINDS).toEqual([
      ...SUBJECT_FOCUS_KINDS,
      ...EVIDENCE_FOCUS_KINDS,
      ...CONTROL_FOCUS_KINDS,
    ]);
    expect(POLICY_FOCUS_KINDS).toEqual([
      ...SUBJECT_FOCUS_KINDS,
      ...CONTROL_FOCUS_KINDS,
    ]);
    expect(QUESTION_ROUTES).toEqual([
      ...COGNITIVE_QUESTION_ROUTES,
      ...MAINTENANCE_QUESTION_ROUTES,
    ]);
    expect(READ_MODES).toEqual([
      ...PRESENTATION_READ_MODES,
      ...PAYLOAD_READ_MODES,
    ]);
    expect(ANSWER_REF_KINDS).toEqual([
      ...FOCUS_KINDS,
      'subsystem',
    ]);
    expect([
      ...EVIDENCE_PROVENANCE_ENTRY_KINDS,
      ...CARRIER_PROVENANCE_ENTRY_KINDS,
    ]).toEqual(['substrate', 'claim', 'route', 'snapshot', 'host']);

    expect(isSubjectFocusKind('package')).toBe(true);
    expect(isEvidenceFocusKind('claim')).toBe(true);
    expect(isControlFocusKind('session')).toBe(true);
    expect(isPolicyFocusKind('package')).toBe(true);
    expect(isPolicyFocusKind('claim')).toBe(false);
    expect(isCognitiveQuestionRoute('route')).toBe(true);
    expect(isMaintenanceQuestionRoute('refresh')).toBe(true);
    expect(isPresentationReadMode('focus-card')).toBe(true);
    expect(isPayloadReadMode('snapshot')).toBe(true);
    expect(isEvidenceProvenanceEntryKind('route')).toBe(true);
    expect(isCarrierProvenanceEntryKind('snapshot')).toBe(true);
  });

  it('can split and recompose route families and world-frame slices', () => {
    const routeFamilies = createQuestionRouteFamilies({
      cognitive: ['search', 'route'],
      maintenance: ['refresh'],
    });

    expect(routeFamilies).toEqual({
      cognitive: ['search', 'route'],
      maintenance: ['refresh'],
    });
    expect(flattenQuestionRouteFamilies(routeFamilies)).toEqual([
      'search',
      'route',
      'refresh',
    ]);

    const worldFrame = composeWorldFrame(
      {
        repoPath: 'C:/projects/aurelia-ls2',
        target: 'fixture-target',
        profilePath: 'profiles/framework-core.json',
      },
      {
        regimeAnchor: 'hosted',
        partiality: 'complete',
        freshness: 'live',
      },
    );

    expect(worldTargetingFromFrame(worldFrame)).toEqual({
      repoPath: 'C:/projects/aurelia-ls2',
      target: 'fixture-target',
      profilePath: 'profiles/framework-core.json',
    });
    expect(executionPostureFromFrame(worldFrame)).toEqual({
      regimeAnchor: 'hosted',
      partiality: 'complete',
      freshness: 'live',
    });
    expect(selectCognitiveQuestionRoute('join')).toEqual({
      family: 'cognitive',
      route: 'join',
    });
    expect(selectMaintenanceQuestionRoute('refresh')).toEqual({
      family: 'maintenance',
      route: 'refresh',
    });
    expect(selectQuestionRoute('inventory')).toEqual({
      family: 'cognitive',
      route: 'inventory',
    });
    expect(questionRouteFromSelection(selectQuestionRoute('diff'))).toBe('diff');
  });

  it('keeps presentation and payload read modes in explicit families', () => {
    const readModeFamilies = createReadModeFamilies({
      presentation: ['summary-card', 'delta-card'],
      payload: ['snapshot'],
    });

    expect(readModeFamilies).toEqual({
      presentation: ['summary-card', 'delta-card'],
      payload: ['snapshot'],
    });
    expect(flattenReadModeFamilies(readModeFamilies)).toEqual([
      'summary-card',
      'delta-card',
      'snapshot',
    ]);
    expect(resolvePresentationReadMode('snapshot', 'focus-card')).toBe('focus-card');
    expect(resolvePresentationReadMode('supporting-evidence', 'focus-card')).toBe('supporting-evidence');
  });
});
