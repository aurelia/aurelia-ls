import { describe, expect, it } from 'vitest';

import { createAuditAnswer } from '../src/audit.js';
import { loadCurrentLiveAnalysisViews } from './live-analysis-views.js';

describe('Source-analysis package audit', () => {
  it('no longer reports package blind spots after the tests gained explicit tsconfig coverage', () => {
    const analysis = loadCurrentLiveAnalysisViews();
    const answer = createAuditAnswer({
      focusRef: { kind: 'package', value: '@aurelia-ls/source-analysis' },
      questionRoute: 'inventory',
    }, analysis);

    expect(answer.outcome.tag).toBe('hit');
    const uncoveredFinding = answer.outcome.value?.findings.find((finding) =>
      finding.code === 'package-uncovered-files',
    );
    expect(uncoveredFinding).toBeUndefined();
  });

  it('no longer reports exercise-only structural substrate helpers after they became an intentional public subpath', () => {
    const analysis = loadCurrentLiveAnalysisViews();
    const answer = createAuditAnswer({
      focusRef: { kind: 'package', value: '@aurelia-ls/source-analysis' },
      questionRoute: 'inventory',
    }, analysis);

    const exerciseOnlyFinding = answer.outcome.value?.findings.find((finding) =>
      finding.code === 'exercise-only-files',
    );
    expect(exerciseOnlyFinding).toBeUndefined();
  });

  it('no longer reports an under-integrated orphan after the subsystem coupling helper was integrated', () => {
    const analysis = loadCurrentLiveAnalysisViews();
    const answer = createAuditAnswer({
      focusRef: { kind: 'package', value: '@aurelia-ls/source-analysis' },
      questionRoute: 'inventory',
    }, analysis);

    const dormantFinding = answer.outcome.value?.findings.find((finding) =>
      finding.code === 'under-integrated-file',
    );
    expect(dormantFinding).toBeUndefined();
  });

  it('no longer reports unanchored candidate roots for the package after the helper integration', () => {
    const analysis = loadCurrentLiveAnalysisViews();
    const answer = createAuditAnswer({
      focusRef: { kind: 'package', value: '@aurelia-ls/source-analysis' },
      questionRoute: 'inventory',
    }, analysis);

    const candidateRootsFinding = answer.outcome.value?.findings.find((finding) =>
      finding.code === 'candidate-entry-roots',
    );
    expect(candidateRootsFinding).toBeUndefined();
  });

  it('no longer reports public surface without exercise routes after the helper tests were added', () => {
    const analysis = loadCurrentLiveAnalysisViews();
    const answer = createAuditAnswer({
      focusRef: { kind: 'package', value: '@aurelia-ls/source-analysis' },
      questionRoute: 'inventory',
    }, analysis);

    const publicUnexercisedFinding = answer.outcome.value?.findings.find((finding) =>
      finding.code === 'public-surface-unexercised',
    );
    expect(publicUnexercisedFinding).toBeUndefined();
  });

  it('no longer flags fragmented local answer builders after the shared envelope extraction', () => {
    const analysis = loadCurrentLiveAnalysisViews();
    const answer = createAuditAnswer({
      focusRef: { kind: 'package', value: '@aurelia-ls/source-analysis' },
      questionRoute: 'inventory',
    }, analysis);

    const coordinationFinding = answer.outcome.value?.findings.find((finding) =>
      finding.code === 'answer-coordination-fragmentation',
    );
    expect(coordinationFinding).toBeUndefined();
  });

  it('no longer flags fragmented local answer carriers after the shared card extraction', () => {
    const analysis = loadCurrentLiveAnalysisViews();
    const answer = createAuditAnswer({
      focusRef: { kind: 'package', value: '@aurelia-ls/source-analysis' },
      questionRoute: 'inventory',
    }, analysis);

    const presentationFinding = answer.outcome.value?.findings.find((finding) =>
      finding.code === 'answer-presentation-fragmentation',
    );
    expect(presentationFinding).toBeUndefined();
  });
});
