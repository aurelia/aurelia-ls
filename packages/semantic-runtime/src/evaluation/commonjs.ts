import type ts from 'typescript';

import {
  EvaluationBindingKind,
  type ModuleEnvironmentRecord,
} from './environment.js';
import {
  EvaluationObjectProperty,
  EvaluationObjectValue,
  EvaluationValueKind,
  type EvaluationValue,
} from './values.js';

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
      environment.initializeBinding('exports', moduleExports, EvaluationBindingKind.CommonJs, false, node);
      return moduleExports;
    }
  }
  const exportsValue = new EvaluationObjectValue(new Map(), false, node);
  environment.initializeBinding('exports', exportsValue, EvaluationBindingKind.CommonJs, false, node);
  if (moduleValue?.kind === EvaluationValueKind.Object) {
    moduleValue.properties.set('exports', new EvaluationObjectProperty('exports', exportsValue, node));
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
      ));
    }
    return existing;
  }
  const exportsValue = ensureStaticCommonJsExports(environment, node);
  const moduleValue = new EvaluationObjectValue(new Map([
    ['exports', new EvaluationObjectProperty('exports', exportsValue, node)],
  ]), false, node);
  environment.initializeBinding('module', moduleValue, EvaluationBindingKind.CommonJs, false, node);
  return moduleValue;
}

/** Read a named export through CommonJS `module.exports` / `exports` carriers. */
export function readStaticCommonJsExportValue(
  environment: ModuleEnvironmentRecord,
  exportName: string,
): EvaluationValue | null {
  const moduleExports = readStaticCommonJsModuleExportsValue(environment);
  if (exportName === 'default' && moduleExports != null) {
    return moduleExports;
  }
  if (moduleExports?.kind === EvaluationValueKind.Object) {
    return moduleExports.properties.get(exportName)?.value ?? null;
  }
  const exportsValue = readStaticCommonJsExportsBindingObject(environment);
  if (exportName === 'default') {
    return exportsValue;
  }
  return exportsValue?.properties.get(exportName)?.value ?? null;
}

/** Read all named CommonJS exports visible from an evaluator environment. */
export function readStaticCommonJsExportMap(
  environment: ModuleEnvironmentRecord,
): ReadonlyMap<string, EvaluationValue> {
  const moduleExports = readStaticCommonJsModuleExportsValue(environment);
  const exports = moduleExports?.kind === EvaluationValueKind.Object
    ? moduleExports
    : readStaticCommonJsExportsBindingObject(environment);
  if (exports == null) {
    return new Map();
  }
  return new Map([...exports.properties].map(([name, property]) => [name, property.value]));
}

/** Read the value that `require(...)` should receive for a local CommonJS module. */
export function readStaticCommonJsRequireValue(
  environment: ModuleEnvironmentRecord,
): EvaluationValue | null {
  return readStaticCommonJsModuleExportsValue(environment)
    ?? readStaticCommonJsExportsBindingObject(environment);
}

function readStaticCommonJsModuleExportsValue(
  environment: ModuleEnvironmentRecord,
): EvaluationValue | null {
  const moduleValue = environment.readValue('module');
  if (moduleValue?.kind === EvaluationValueKind.Object) {
    return moduleValue.properties.get('exports')?.value ?? null;
  }
  return null;
}

function readStaticCommonJsExportsBindingObject(
  environment: ModuleEnvironmentRecord,
): EvaluationObjectValue | null {
  const exportsValue = environment.readValue('exports');
  return exportsValue?.kind === EvaluationValueKind.Object ? exportsValue : null;
}
