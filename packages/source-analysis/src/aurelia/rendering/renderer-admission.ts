import type { AdmittedSubject } from '../admissions/index.js';
import type { ConfigurationContribution } from '../configurations/index.js';

export class InstructionRendererAdmissionProvenance {
  constructor(
    readonly ownerContribution: ConfigurationContribution,
    readonly admittedSubject: AdmittedSubject,
    readonly note: string | null = null,
  ) {}
}
