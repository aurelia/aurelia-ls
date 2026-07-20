import type ts from 'typescript';

import {
  EvaluationBindingKind,
  type ModuleEnvironmentRecord,
} from './environment.js';
import {
  EvaluationObjectProperty,
  EvaluationObjectPropertyPresence,
  EvaluationObjectPropertyState,
  EvaluationObjectValue,
  EvaluationValueKind,
  type EvaluationValue,
} from './values.js';
import { EvaluationValueEvidence } from './value-pressure.js';

/** Lazily materialize the authored CommonJS `exports` object in an evaluator environment. */
export function ensureStaticCommonJsExports(
  environment: ModuleEnvironmentRecord,
  node: ts.Node,
): EvaluationObjectValue {
  const existing = environment.readValue('exports');
  if (existing?.kind === EvaluationValueKind.Object) {
    return existing;
  }
  const moduleValue = environment.readValue('module');
  if (moduleValue?.kind === EvaluationValueKind.Object) {
    const moduleExports = moduleValue.properties.get('exports')?.value;
    if (moduleExports?.kind === EvaluationValueKind.Object) {
      environment.initializeBinding('exports', moduleExports, EvaluationBindingKind.CommonJs, false, node, []);
      return moduleExports;
    }
  }
  const exportsValue = new EvaluationObjectValue(new Map(), false, node);
  environment.initializeBinding('exports', exportsValue, EvaluationBindingKind.CommonJs, false, node, []);
  if (moduleValue?.kind === EvaluationValueKind.Object) {
    moduleValue.properties.set('exports', new EvaluationObjectProperty('exports', exportsValue, node, EvaluationObjectPropertyState.Closed));
  }
  return exportsValue;
}

/** Lazily materialize the authored CommonJS `module` object in an evaluator environment. */
export function ensureStaticCommonJsModule(
  environment: ModuleEnvironmentRecord,
  node: ts.Node,
): EvaluationObjectValue {
  const existing = environment.readValue('module');
  if (existing?.kind === EvaluationValueKind.Object) {
    if (!existing.properties.has('exports')) {
      existing.properties.set('exports', new EvaluationObjectProperty(
        'exports',
        ensureStaticCommonJsExports(environment, node),
        node,
        EvaluationObjectPropertyState.Closed,
      ));
    }
    return existing;
  }
  const exportsValue = ensureStaticCommonJsExports(environment, node);
  const moduleValue = new EvaluationObjectValue(new Map([
    ['exports', new EvaluationObjectProperty('exports', exportsValue, node, EvaluationObjectPropertyState.Closed)],
  ]), false, node);
  environment.initializeBinding('module', moduleValue, EvaluationBindingKind.CommonJs, false, node, []);
  return moduleValue;
}

/** Read a named export through CommonJS `module.exports` / `exports` carriers. */
export function readStaticCommonJsExportValue(
  environment: ModuleEnvironmentRecord,
  exportName: string,
): EvaluationValue | null {
  return readStaticCommonJsExportEvidence(environment, exportName)?.value ?? null;
}

/** Read a named CommonJS export together with pressure retained by its carrier and property edges. */
export function readStaticCommonJsExportEvidence(
  environment: ModuleEnvironmentRecord,
  exportName: string,
): EvaluationValueEvidence | null {
  const moduleExports = readStaticCommonJsModuleExportsEvidence(environment);
  if (exportName === 'default' && moduleExports != null) {
    return moduleExports;
  }
  if (moduleExports?.value.kind === EvaluationValueKind.Object) {
    return readObjectPropertyEvidence(moduleExports, exportName);
  }
  const exportsValue = readStaticCommonJsExportsBindingEvidence(environment);
  if (exportName === 'default') {
    return exportsValue;
  }
  return exportsValue == null ? null : readObjectPropertyEvidence(exportsValue, exportName);
}

/** Read all named CommonJS exports visible from an evaluator environment. */
export function readStaticCommonJsExportMap(
  environment: ModuleEnvironmentRecord,
): ReadonlyMap<string, EvaluationValue> {
  return new Map([...readStaticCommonJsExportEvidenceMap(environment)].map(
    ([name, evidence]) => [name, evidence.value],
  ));
}

/** Read all named CommonJS exports without dropping their value-edge evidence. */
export function readStaticCommonJsExportEvidenceMap(
  environment: ModuleEnvironmentRecord,
): ReadonlyMap<string, EvaluationValueEvidence> {
  const moduleExports = readStaticCommonJsModuleExportsEvidence(environment);
  const exports = moduleExports?.value.kind === EvaluationValueKind.Object
    ? moduleExports
    : readStaticCommonJsExportsBindingEvidence(environment);
  if (exports?.value.kind !== EvaluationValueKind.Object) {
    return new Map();
  }
  return new Map([...exports.value.properties.keys()].flatMap((name) => {
    const evidence = readObjectPropertyEvidence(exports, name);
    return evidence == null ? [] : [[name, evidence] as const];
  }));
}

/** Read the value that `require(...)` should receive for a local CommonJS module. */
export function readStaticCommonJsRequireValue(
  environment: ModuleEnvironmentRecord,
): EvaluationValue | null {
  return readStaticCommonJsRequireEvidence(environment)?.value ?? null;
}

/** Read the CommonJS `require(...)` result without dropping its carrier pressure. */
export function readStaticCommonJsRequireEvidence(
  environment: ModuleEnvironmentRecord,
): EvaluationValueEvidence | null {
  return readStaticCommonJsModuleExportsEvidence(environment)
    ?? readStaticCommonJsExportsBindingEvidence(environment);
}

function readStaticCommonJsModuleExportsValue(
  environment: ModuleEnvironmentRecord,
): EvaluationValue | null {
  return readStaticCommonJsModuleExportsEvidence(environment)?.value ?? null;
}

function readStaticCommonJsModuleExportsEvidence(
  environment: ModuleEnvironmentRecord,
): EvaluationValueEvidence | null {
  const moduleValue = environment.readEvidence('module');
  return moduleValue?.value.kind === EvaluationValueKind.Object
    ? readObjectPropertyEvidence(moduleValue, 'exports')
    : null;
}

function readStaticCommonJsExportsBindingObject(
  environment: ModuleEnvironmentRecord,
): EvaluationObjectValue | null {
  const exportsValue = readStaticCommonJsExportsBindingEvidence(environment)?.value ?? null;
  return exportsValue?.kind === EvaluationValueKind.Object ? exportsValue : null;
}

function readStaticCommonJsExportsBindingEvidence(
  environment: ModuleEnvironmentRecord,
): EvaluationValueEvidence | null {
  const exportsValue = environment.readEvidence('exports');
  return exportsValue?.value.kind === EvaluationValueKind.Object ? exportsValue : null;
}

function readObjectPropertyEvidence(
  owner: EvaluationValueEvidence,
  propertyName: string,
): EvaluationValueEvidence | null {
  if (owner.value.kind !== EvaluationValueKind.Object) {
    return null;
  }
  const property = owner.value.properties.get(propertyName);
  return property == null || property.presence === EvaluationObjectPropertyPresence.Conditional
    ? null
    : new EvaluationValueEvidence(property.value, [
        ...owner.openSeams,
        ...property.openSeams,
        ...property.presenceOpenSeams,
      ]);
}
