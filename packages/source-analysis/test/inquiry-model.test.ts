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
  isCarrierProvenanceEntryKind,
  isControlFocusKind,
  isEvidenceProvenanceEntryKind,
  isEvidenceFocusKind,
  isMaintenanceQuestionRoute,
  isPayloadReadMode,
  isPolicyFocusKind,
  isPresentationReadMode,
  isSubjectFocusKind,
} from '../src/inquiry-model.js';
import { asFocusKind, supportsRecognizedFocus } from '../src/ingress-hints.js';
import {
  captureKindsForFocusKinds,
  isIngressRecognizableFocusKind,
} from '../src/ingress-recognizers.js';

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
    expect(isMaintenanceQuestionRoute('refresh')).toBe(true);
    expect(isPresentationReadMode('focus-card')).toBe(true);
    expect(isPayloadReadMode('snapshot')).toBe(true);
    expect(isEvidenceProvenanceEntryKind('route')).toBe(true);
    expect(isCarrierProvenanceEntryKind('snapshot')).toBe(true);
  });

  it('keeps ingress-recognizable focus kinds as an explicit subset', () => {
    expect(asFocusKind('claim')).toBe('claim');
    expect(isIngressRecognizableFocusKind('package')).toBe(true);
    expect(isIngressRecognizableFocusKind('symbol')).toBe(true);
    expect(isIngressRecognizableFocusKind('claim')).toBe(false);
    expect(isIngressRecognizableFocusKind('session')).toBe(false);

    expect(captureKindsForFocusKinds(['package', 'claim', 'session', 'file', 'symbol'])).toEqual([
      'package-name',
      'file-path',
      'symbol-name',
    ]);

    expect(supportsRecognizedFocus('package', [{
      kind: 'package-name',
      value: '@aurelia-ls/source-analysis',
      source: 'question',
      recognizerId: 'package-name',
      detail: 'package capture',
    }])).toBe(true);

    expect(supportsRecognizedFocus('claim', [{
      kind: 'package-name',
      value: '@aurelia-ls/source-analysis',
      source: 'question',
      recognizerId: 'package-name',
      detail: 'package capture',
    }])).toBe(false);

    expect(supportsRecognizedFocus('symbol', [{
      kind: 'symbol-name',
      value: 'createAnalysisViews',
      source: 'question',
      recognizerId: 'symbol-name',
      detail: 'symbol capture',
    }])).toBe(true);
  });
});
