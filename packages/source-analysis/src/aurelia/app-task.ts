import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

import { auLink } from './au-link.js';
import type { ConfigurationContribution } from './configurations/index.js';
import {
  analyzeFunctionImplementation,
  createNodeRef,
  findNodeBySpan,
  resolveFunctionImplementation,
  summarizeExpression,
} from './configurations/configuration-function-analysis.js';
import { FrameworkApiCatalog, FrameworkApiIngressScanner } from './framework-api/index.js';
import {
  ConfigurationRegistrationProduction,
  RegistrationPayload,
  RegistrationProduction,
} from './registrations/index.js';
import { OpenSeamEvidence } from './provenance/index.js';
import type { SourceFileRef } from './source-address.js';
import { KeyRef, type SourceNodeRef } from './refs.js';

export const APP_TASK_SLOT_KINDS = [
  'creating',
  'hydrating',
  'hydrated',
  'activating',
  'activated',
  'deactivating',
  'deactivated',
] as const;

export type AppTaskSlotKind =
  typeof APP_TASK_SLOT_KINDS[number];

@auLink('runtime-html:AppTask')
export class AppTaskFactory {
  readonly kind = 'app-task-factory' as const;

  constructor(
    readonly slots: readonly AppTaskSlotKind[] = APP_TASK_SLOT_KINDS,
    readonly note: string | null = 'Runtime AppTask helper surface with fixed lifecycle slot methods that produce IRegistry callbacks.',
  ) {}
}

export const APP_TASK_CALLBACK_KINDS = [
  'inline-function',
  'same-file-function',
  'same-file-binding',
  'same-file-method',
  'open',
] as const;

export type AppTaskCallbackKind =
  typeof APP_TASK_CALLBACK_KINDS[number];

export const APP_TASK_OPEN_SEAM_KINDS = [
  'call-expression-recovery-open',
  'callback-resolution-open',
  'callback-direct-register-open',
  'callback-world-consequence-open',
  'callback-production-key-open',
  'callback-production-payload-open',
  'callback-production-strategy-open',
  'callback-direct-register-state-open',
] as const;

export type AppTaskOpenSeamKind =
  typeof APP_TASK_OPEN_SEAM_KINDS[number];

export class AppTaskOpenSeam {
  readonly evidence: OpenSeamEvidence<AppTaskOpenSeamKind>;

  constructor(
    readonly kind: AppTaskOpenSeamKind,
    readonly source: SourceNodeRef | null,
    readonly note: string,
  ) {
    this.evidence = OpenSeamEvidence.fromSourceNode(kind, source, null, note);
  }
}

export class AppTaskKeyRequest {
  constructor(
    readonly id: string,
    readonly source: SourceNodeRef,
    readonly referenceText: string,
    readonly note: string | null = null,
  ) {}
}

export class AppTaskCallbackSurface {
  constructor(
    readonly kind: AppTaskCallbackKind,
    readonly source: SourceNodeRef | null,
    readonly referenceName: string | null = null,
    readonly helperCalls: readonly import('./configurations/index.js').HelperCall[] = [],
    readonly directRegisterArguments: readonly import('./configurations/index.js').RegisterArgument[] = [],
    readonly productions: readonly ConfigurationRegistrationProduction[] = [],
    readonly openSeams: readonly AppTaskOpenSeam[] = [],
    readonly note: string | null = null,
  ) {}
}

export class AppTaskContribution {
  constructor(
    readonly id: string,
    readonly slot: AppTaskSlotKind,
    readonly contribution: ConfigurationContribution,
    readonly production: ConfigurationRegistrationProduction,
    readonly keyRequest: AppTaskKeyRequest | null = null,
    readonly callback: AppTaskCallbackSurface | null = null,
    readonly note: string | null = null,
  ) {}
}

export interface AppTaskScannerOptions {
  readonly contributions: readonly ConfigurationContribution[];
}

// NOTE: runtime AppTask values are fixed-slot IRegistry producers whose
// callback body runs later against the app container. This clean-room models:
// - slot membership
// - keyed callback ingress
// - bounded callback-body registration consequences
//
// TODO: AppTask ingress still starts from direct lifecycle-slot productions.
// It does not yet surface AppTask values hidden behind:
// - returned registry interiors
// - helper-produced arrays/bundles
// - nested helper indirection such as configure(...).init(...)
//
// TODO: callback consequences are now structurally recovered, and AppRoot does
// spend a bounded per-slot overlay over the closed subset. What is still open
// is wider world construction and cumulative timing:
// - cumulative state across slots
// - imported/helper-built key identity
// - callback-local direct register(...) resource visibility and richer
//   registry-object consequence beyond the bounded constructable subset
// - hidden AppTask ingress behind returned registries or helper indirection
export class AppTaskScanner {
  private readonly contributions: readonly ConfigurationContribution[];
  private readonly parsedFiles = new Map<string, ts.SourceFile | null>();
  private readonly apiCatalog = new FrameworkApiCatalog();
  private readonly apiIngressScanner = new FrameworkApiIngressScanner({
    catalog: this.apiCatalog,
  });

  constructor(
    options: AppTaskScannerOptions,
  ) {
    this.contributions = options.contributions;
  }

  scanAll(): readonly AppTaskContribution[] {
    const tasks: AppTaskContribution[] = [];
    for (const contribution of this.contributions) {
      for (const production of contribution.directProductions) {
        const slot = readAppTaskSlot(production);
        if (slot == null) {
          continue;
        }
        tasks.push(this.materializeTask(contribution, production, slot, tasks.length));
      }
    }
    return tasks;
  }

  private materializeTask(
    contribution: ConfigurationContribution,
    production: ConfigurationRegistrationProduction,
    slot: AppTaskSlotKind,
    index: number,
  ): AppTaskContribution {
    const sourceFile = this.readParsedSourceFile(production.producerCall.source.file);
    if (sourceFile == null) {
      return new AppTaskContribution(
        `${contribution.id}:app-task:${slot}:${index}`,
        slot,
        contribution,
        production,
        null,
        new AppTaskCallbackSurface(
          'open',
          null,
          null,
          [],
          [],
          [],
          [
            new AppTaskOpenSeam(
              'call-expression-recovery-open',
              production.producerCall.source,
              'Could not parse the source file for this AppTask call, so callback ingress stayed open.',
            ),
          ],
          `Configuration contribution ${contribution.configuration.sourceExport.name} produces AppTask.${slot}, but callback ingress stayed open because the call expression could not be rehydrated.`,
        ),
        `Configuration contribution ${contribution.configuration.sourceExport.name} produces AppTask.${slot}.`,
      );
    }

    const callExpression = findNodeBySpan(
      sourceFile,
      production.producerCall.source.span.start,
      production.producerCall.source.span.end,
      ts.isCallExpression,
    );
    if (callExpression == null) {
      return new AppTaskContribution(
        `${contribution.id}:app-task:${slot}:${index}`,
        slot,
        contribution,
        production,
        null,
        new AppTaskCallbackSurface(
          'open',
          null,
          null,
          [],
          [],
          [],
          [
            new AppTaskOpenSeam(
              'call-expression-recovery-open',
              production.producerCall.source,
              'Could not rehydrate the AppTask call expression from its source ref.',
            ),
          ],
          `Configuration contribution ${contribution.configuration.sourceExport.name} produces AppTask.${slot}, but callback ingress stayed open because the call expression could not be rehydrated.`,
        ),
        `Configuration contribution ${contribution.configuration.sourceExport.name} produces AppTask.${slot}.`,
      );
    }

    const callbackArgument = callExpression.arguments.length === 1
      ? callExpression.arguments[0] ?? null
      : callExpression.arguments.length >= 2
        ? callExpression.arguments[1] ?? null
        : null;
    const keyArgument = callExpression.arguments.length >= 2
      ? callExpression.arguments[0] ?? null
      : null;
    const keyRequest = keyArgument == null
      ? null
      : new AppTaskKeyRequest(
        `${contribution.id}:app-task:${slot}:${index}:key`,
        createNodeRef(production.producerCall.source.file, keyArgument),
        summarizeExpression(keyArgument),
        'Recovered from the keyed AppTask callback parameter.',
      );

    const callback = callbackArgument == null
      ? new AppTaskCallbackSurface(
        'open',
        null,
        null,
        [],
        [],
        [],
        [
          new AppTaskOpenSeam(
            'callback-resolution-open',
            production.producerCall.source,
            'AppTask call did not expose a callback argument under the current bounded reader.',
          ),
        ],
        'AppTask callback ingress stayed open because the callback argument could not be identified.',
      )
      : this.materializeCallback(contribution, production, slot, index, sourceFile, callbackArgument);

    return new AppTaskContribution(
      `${contribution.id}:app-task:${slot}:${index}`,
      slot,
      contribution,
      production,
      keyRequest,
      callback,
      `Configuration contribution ${contribution.configuration.sourceExport.name} produces AppTask.${slot}.`,
    );
  }

  private materializeCallback(
    contribution: ConfigurationContribution,
    production: ConfigurationRegistrationProduction,
    slot: AppTaskSlotKind,
    index: number,
    sourceFile: ts.SourceFile,
    callbackArgument: ts.Expression,
  ): AppTaskCallbackSurface {
    const resolved = resolveFunctionImplementation(
      production.producerCall.source.file,
      sourceFile,
      callbackArgument,
    );
    if (resolved == null) {
      return new AppTaskCallbackSurface(
        'open',
        createNodeRef(production.producerCall.source.file, callbackArgument),
        summarizeExpression(callbackArgument),
        [],
        [],
        [],
        [
          new AppTaskOpenSeam(
            'callback-resolution-open',
            createNodeRef(production.producerCall.source.file, callbackArgument),
            'AppTask callback is not yet an inline or same-file resolvable function surface under the current bounded reader.',
          ),
        ],
        `AppTask.${slot} callback reference ${summarizeExpression(callbackArgument)} stayed open.`,
      );
    }

    const analysis = analyzeFunctionImplementation(
      production.producerCall.source.file,
      resolved.implementation,
    );
    const callbackProductions = analysis.helperCalls.flatMap((helperCall, helperIndex) => {
      const apiIngress = this.apiIngressScanner.readIngress(helperCall);
      const api = apiIngress.api;
      const productionKind = api?.productionKind ?? null;
      if (apiIngress.status !== 'closed' || api == null || productionKind == null) {
        return [];
      }

      const callbackProduction = materializeCallbackRegistrationProduction(
        contribution,
        slot,
        index,
        helperIndex,
        helperCall.source.file,
        sourceFile,
        helperCall,
        productionKind,
        api.id,
      );

      return [
        new ConfigurationRegistrationProduction(
          `${contribution.id}:app-task:${slot}:${index}:configuration-registration-production:${helperIndex}`,
          contribution.configuration,
          production.originMethod,
          helperCall,
          apiIngress,
          callbackProduction,
          `AppTask.${slot} callback in ${contribution.configuration.sourceExport.name} resolves ${helperCall.calleeName} to canonical framework API ${api.id}.`,
        ),
      ];
    });

    const openSeams: AppTaskOpenSeam[] = [];
    if (analysis.directRegisterArguments.length > 0) {
      openSeams.push(
        new AppTaskOpenSeam(
          'callback-direct-register-state-open',
          resolved.source,
          'AppTask callback directly passes registrable-looking values into register(...). Those direct register arguments are now witnessed here, but their keyed container-state consequence still needs a later stage-aware spending pass.',
        ),
      );
    }

    if (analysis.helperCalls.length > 0 || analysis.directRegisterArguments.length > 0) {
      openSeams.push(
        new AppTaskOpenSeam(
          'callback-world-consequence-open',
          resolved.source,
          'AppTask callback helper calls and direct register arguments are structurally recovered here, but they are not yet spent into stage-aware world construction or container-state consequence.',
        ),
      );
    }

    return new AppTaskCallbackSurface(
      resolved.kind,
      resolved.source,
      resolved.referenceName,
      analysis.helperCalls,
      analysis.directRegisterArguments,
      callbackProductions,
      openSeams,
      resolved.referenceName == null
        ? `Recovered inline AppTask.${slot} callback body.`
        : `Recovered AppTask.${slot} callback body through same-file function surface ${resolved.referenceName}.`,
    );
  }

  private readParsedSourceFile(
    file: SourceFileRef,
  ): ts.SourceFile | null {
    const resolvedPath = path.isAbsolute(file.path)
      ? file.path
      : path.join(file.program.repoRoot, file.path);
    const normalized = resolvedPath.replace(/\\/g, '/');
    const cached = this.parsedFiles.get(normalized);
    if (cached !== undefined) {
      return cached;
    }

    if (!fs.existsSync(resolvedPath)) {
      this.parsedFiles.set(normalized, null);
      return null;
    }

    const text = fs.readFileSync(resolvedPath, 'utf8');
    const sourceFile = ts.createSourceFile(
      resolvedPath,
      text,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS,
    );
    this.parsedFiles.set(normalized, sourceFile);
    return sourceFile;
  }
}

function readAppTaskSlot(
  production: ConfigurationRegistrationProduction,
): AppTaskSlotKind | null {
  if (production.production.kind !== 'lifecycle-slot-task') {
    return null;
  }

  const apiId = production.apiIngress.api?.id ?? null;
  if (apiId == null || !apiId.startsWith('app-task.')) {
    return null;
  }

  const slot = apiId.slice('app-task.'.length);
  return isAppTaskSlot(slot)
    ? slot
    : null;
}

function isAppTaskSlot(
  value: string,
): value is AppTaskSlotKind {
  return (APP_TASK_SLOT_KINDS as readonly string[]).includes(value);
}

function materializeCallbackRegistrationProduction(
  contribution: ConfigurationContribution,
  slot: AppTaskSlotKind,
  taskIndex: number,
  helperIndex: number,
  file: SourceFileRef,
  sourceFile: ts.SourceFile,
  helperCall: import('./configurations/index.js').HelperCall,
  productionKind: RegistrationProduction['kind'],
  apiId: string,
): RegistrationProduction {
  const callExpression = findNodeBySpan(
    sourceFile,
    helperCall.source.span.start,
    helperCall.source.span.end,
    ts.isCallExpression,
  );
  const args = callExpression?.arguments ?? [];
  const owner = contribution.configuration.sourceExport.symbol ?? contribution.configuration.source;
  const productionId = `${contribution.id}:app-task:${slot}:${taskIndex}:callback-production:${helperIndex}`;

  switch (productionKind) {
    case 'instance': {
      const key = readAppTaskRegistrationKey(file, args[0] ?? null);
      const payload = readInstancePayload(file, args[1] ?? null);
      return new RegistrationProduction(
        productionId,
        productionKind,
        owner,
        helperCall.source,
        null,
        key,
        payload,
        key == null
          ? `Recovered from canonical framework API ${apiId} inside AppTask.${slot} callback for ${contribution.configuration.sourceExport.name}, but the registration key stayed open.`
          : `Recovered from canonical framework API ${apiId} inside AppTask.${slot} callback for ${contribution.configuration.sourceExport.name}.`,
      );
    }
    case 'singleton':
    case 'transient': {
      const keyExpression = args[0] ?? null;
      const valueExpression = args[1] ?? keyExpression;
      const key = readAppTaskRegistrationKey(file, keyExpression);
      const payload = readConstructablePayload(file, valueExpression);
      return new RegistrationProduction(
        productionId,
        productionKind,
        owner,
        helperCall.source,
        null,
        key,
        payload,
        key == null || payload == null
          ? `Recovered from canonical framework API ${apiId} inside AppTask.${slot} callback for ${contribution.configuration.sourceExport.name}, but key/payload closure stayed partial.`
          : `Recovered from canonical framework API ${apiId} inside AppTask.${slot} callback for ${contribution.configuration.sourceExport.name}.`,
      );
    }
    case 'callback':
    case 'cached-callback': {
      const key = readAppTaskRegistrationKey(file, args[0] ?? null);
      const payload = readCallbackPayload(file, args[1] ?? null);
      return new RegistrationProduction(
        productionId,
        productionKind,
        owner,
        helperCall.source,
        null,
        key,
        payload,
        key == null
          ? `Recovered from canonical framework API ${apiId} inside AppTask.${slot} callback for ${contribution.configuration.sourceExport.name}, but the callback key stayed open.`
          : `Recovered from canonical framework API ${apiId} inside AppTask.${slot} callback for ${contribution.configuration.sourceExport.name}.`,
      );
    }
    case 'alias': {
      const originalKey = readAppTaskRegistrationKey(file, args[0] ?? null);
      const aliasKey = readAppTaskRegistrationKey(file, args[1] ?? null);
      const payload = originalKey == null
        ? null
        : new RegistrationPayload(
          'alias-target',
          helperCall.source,
          null,
          originalKey,
          'AppTask callback alias target recovered from the original-key argument.',
        );
      return new RegistrationProduction(
        productionId,
        productionKind,
        owner,
        helperCall.source,
        null,
        aliasKey,
        payload,
        aliasKey == null || payload == null
          ? `Recovered from canonical framework API ${apiId} inside AppTask.${slot} callback for ${contribution.configuration.sourceExport.name}, but alias linkage stayed partially open.`
          : `Recovered from canonical framework API ${apiId} inside AppTask.${slot} callback for ${contribution.configuration.sourceExport.name}.`,
      );
    }
    case 'defer': {
      const key = readAppTaskRegistrationKey(file, args[0] ?? null);
      const payload = args[0] == null
        ? null
        : new RegistrationPayload(
          'deferred-parameters',
          helperCall.source,
          null,
          null,
          'AppTask callback defer(...) parameters were seen, but parameterized registry consequence stays open.',
        );
      return new RegistrationProduction(
        productionId,
        productionKind,
        owner,
        helperCall.source,
        null,
        key,
        payload,
        `Recovered from canonical framework API ${apiId} inside AppTask.${slot} callback for ${contribution.configuration.sourceExport.name}; parameterized registry consequence remains open.`,
      );
    }
    default:
      return new RegistrationProduction(
        productionId,
        productionKind,
        owner,
        helperCall.source,
        null,
        null,
        null,
        `Recovered from canonical framework API ${apiId} inside AppTask.${slot} callback for ${contribution.configuration.sourceExport.name}.`,
      );
  }
}

function readAppTaskRegistrationKey(
  file: SourceFileRef,
  expression: ts.Expression | null,
): KeyRef | null {
  if (expression == null) {
    return null;
  }

  const current = unwrapExpression(expression);
  const source = createNodeRef(file, current);
  if (ts.isStringLiteral(current) || ts.isNoSubstitutionTemplateLiteral(current)) {
    return new KeyRef(
      `app-task-key:property:${current.text}`,
      'property',
      source,
      current.text,
    );
  }

  if (ts.isClassExpression(current) && current.name != null) {
    return new KeyRef(
      `app-task-key:constructable:${current.name.text}`,
      'constructable',
      source,
      current.name.text,
    );
  }

  if (ts.isIdentifier(current) || ts.isPropertyAccessExpression(current)) {
    const text = summarizeExpression(current);
    return new KeyRef(
      `app-task-key:object:${text}`,
      'object',
      source,
      text,
    );
  }

  return null;
}

function readInstancePayload(
  file: SourceFileRef,
  expression: ts.Expression | null,
): RegistrationPayload | null {
  if (expression == null) {
    return null;
  }

  return new RegistrationPayload(
    'instance-value',
    createNodeRef(file, unwrapExpression(expression)),
    createNodeRef(file, unwrapExpression(expression)),
    null,
    'AppTask callback instance payload recovered from the value argument as a syntax witness only.',
  );
}

function readConstructablePayload(
  file: SourceFileRef,
  expression: ts.Expression | null,
): RegistrationPayload | null {
  if (expression == null) {
    return null;
  }

  const current = unwrapExpression(expression);
  if (
    !ts.isClassExpression(current)
    && !ts.isIdentifier(current)
    && !ts.isPropertyAccessExpression(current)
  ) {
    return null;
  }

  return new RegistrationPayload(
    'constructable-type',
    createNodeRef(file, current),
    createNodeRef(file, current),
    null,
    'AppTask callback constructable payload recovered from the provider argument as a bounded syntax witness; imported/provider declaration closure may still remain open.',
  );
}

function readCallbackPayload(
  file: SourceFileRef,
  expression: ts.Expression | null,
): RegistrationPayload | null {
  if (expression == null) {
    return null;
  }

  return new RegistrationPayload(
    'callback',
    createNodeRef(file, unwrapExpression(expression)),
    createNodeRef(file, unwrapExpression(expression)),
    null,
    'AppTask callback resolver payload recovered from the callback argument as a syntax witness only.',
  );
}

function unwrapExpression(
  expression: ts.Expression,
): ts.Expression {
  let current = expression;
  while (
    ts.isAsExpression(current)
    || ts.isTypeAssertionExpression(current)
    || ts.isParenthesizedExpression(current)
    || ts.isNonNullExpression(current)
  ) {
    current = current.expression;
  }
  return current;
}
