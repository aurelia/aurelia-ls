import { expect, test } from 'vitest';
import { EvidenceKind, EvidenceRecord, EvidenceRole } from '../src/kernel/evidence.js';
import { KernelPublicationManifest, KernelPublicationPlan, KernelStoreBatch } from '../src/kernel/publication.js';
import { KernelStore } from '../src/kernel/store.js';

test('publishes a changed evidence value and advances the read projection when its last record is withdrawn', () => {
  const store = new KernelStore('evidence-transition');
  const handle = store.handles.evidence('same-authored-registration');
  const plan = (summary: string) => new KernelPublicationPlan(new KernelStoreBatch([
    new EvidenceRecord(handle, EvidenceKind.SourceObservation, [EvidenceRole.Registration], summary),
  ]));
  const first = store.replacePublication(KernelPublicationManifest.empty, plan('singleton')).manifest;
  const unchanged = store.readProjectionRevision();
  const retained = store.replacePublication(first, plan('singleton')).manifest;
  expect(store.readProjectionRevision().equals(unchanged)).toBe(true);
  const changed = store.replacePublication(retained, plan('transient')).manifest;
  expect(store.readEvidence(handle)?.summary).toBe('transient');
  const beforeWithdrawal = store.readProjectionRevision();
  store.replacePublication(changed, new KernelPublicationPlan(new KernelStoreBatch([])));
  expect(store.readEvidence(handle)).toBeNull();
  expect(store.readProjectionRevision().equals(beforeWithdrawal)).toBe(false);
});
