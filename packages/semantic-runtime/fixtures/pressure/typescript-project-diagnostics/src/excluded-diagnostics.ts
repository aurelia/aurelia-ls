import { watch } from '@aurelia/runtime-html';

const excludedValue: ExcludedProjectDiagnosticType = {};

void excludedValue;

interface ExcludedDiagnosticsModel {
  readonly name: string;
}

export class ExcludedDiagnosticsResource {
  readonly model: ExcludedDiagnosticsModel = { name: 'excluded' };

  @watch((resource: ExcludedDiagnosticsResource) => resource.model.name.trim())
  recordModelName(): void {}
}
