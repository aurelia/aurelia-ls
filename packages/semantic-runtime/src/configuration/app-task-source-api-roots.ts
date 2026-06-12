import ts from 'typescript';

import { AppTaskCallbackKind } from './app-task.js';
import type { AppTaskObservation } from './configuration-observation.js';
import type { ConfigurationRecognitionProjectResult } from './configuration-recognition-project-pass.js';
import {
  sourceRootSymbolForName,
  type AureliaSourceAppTaskCallbackRoot,
} from '../framework/source-api-root-recognition.js';
import type { TypeSystemProject } from '../type-system/project.js';

/** Translate configuration-owned AppTask observations into neutral framework source-root callback facts. */
export function readAppTaskCallbackRoots(
  configuration: ConfigurationRecognitionProjectResult,
  typeSystem: TypeSystemProject,
): readonly AureliaSourceAppTaskCallbackRoot[] {
  return configuration.sources.flatMap((source) => {
    const sourceFile = typeSystem.readProgramSourceFileByPath(source.admission.path);
    if (sourceFile == null) {
      return [];
    }
    return source.observations.flatMap((sequence) =>
      sequence.steps.flatMap((step) =>
        step.appTasks.flatMap((appTask) =>
          appTaskCallbackRoot(source.admission.path, typeSystem, appTask)
        )
      )
    );
  });
}

function appTaskCallbackRoot(
  sourcePath: string,
  typeSystem: TypeSystemProject,
  appTask: AppTaskObservation,
): readonly AureliaSourceAppTaskCallbackRoot[] {
  if (
    appTask.callbackKind !== AppTaskCallbackKind.ResolvedKey
    || appTask.keyExpression == null
    || appTask.callback == null
  ) {
    return [];
  }
  const callback = appTask.callback.node;
  const programCallback = typeSystem.readProgramNode(callback) ?? callback;
  if (!ts.isArrowFunction(programCallback) && !ts.isFunctionExpression(programCallback)) {
    return [];
  }
  const firstParameter = programCallback.parameters[0] ?? null;
  if (firstParameter == null || !ts.isIdentifier(firstParameter.name)) {
    return [];
  }
  const symbol = sourceRootSymbolForName(typeSystem, firstParameter.name);
  return symbol == null
    ? []
    : [{
        sourcePath,
        keyExpression: appTask.keyExpression,
        symbol,
        parameterStart: firstParameter.name.getStart(programCallback.getSourceFile()),
        parameterEnd: firstParameter.name.end,
        callbackStart: programCallback.getStart(programCallback.getSourceFile()),
        callbackEnd: programCallback.end,
      }];
}
