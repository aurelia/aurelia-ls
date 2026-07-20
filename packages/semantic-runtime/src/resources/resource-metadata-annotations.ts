import ts from 'typescript';
import {
  authoredStringLiteralNode,
  readStaticStringArrayEntries,
  readStaticStringValue,
} from '../evaluation/expression-reader.js';
import { OpenSeamReasonKind } from '../kernel/open-seam.js';
import { EvaluationValueKind } from '../evaluation/values.js';
import {
  CustomElementCaptureDefinition,
  CustomElementCaptureKind,
  ShadowOptionsDefinition,
  ShadowRootMode,
} from './custom-element-definition.js';
import type { ResourceRecognitionContext } from './resource-recognition-context.js';
import {
  ResourceDependencyReference,
  ResourceDependencyReferenceKind,
  ResourceRegistryDependencyKind,
  type ResourceTargetReference,
} from './resource-reference.js';
import {
  ConvergenceOpen,
  convergenceOpenForReadPressure,
  convergenceReasonKindsForRead,
  decoratorCallNamed,
  decoratorIdentifierNamed,
  memberName,
  readStaticClassPropertyValue,
  targetReferenceForFunction,
} from './resource-convergence-support.js';
import { ResourceAliasObservation } from './resource-observation.js';

export interface AliasAnnotationRead {
  /** Class-level `@alias(...)` values in framework annotation priority position. */
  readonly aliases: readonly ResourceAliasObservation[];
  /** Alias decorators that exist but did not close to static string arguments. */
  readonly open: readonly ConvergenceOpen[];
}

export interface CustomElementMetadataAnnotationRead {
  /** `@alias(...)` values shared by Aurelia resource kinds. */
  readonly aliases: readonly ResourceAliasObservation[];
  /** `@capture(...)` / `@capture()` metadata, when statically visible. */
  readonly capture: CustomElementCaptureDefinition | null;
  /** Source node for the capture annotation that supplied the current value. */
  readonly captureSourceNode: ts.Node | null;
  /** `@containerless` / `@containerless()` metadata, when present. */
  readonly containerless: boolean | null;
  /** Source node for the containerless annotation that supplied the current value. */
  readonly containerlessSourceNode: ts.Node | null;
  /** `@useShadowDOM(...)` metadata, when statically visible. */
  readonly shadowOptions: ShadowOptionsDefinition | null;
  /** Source node for the shadow annotation that supplied the current value. */
  readonly shadowOptionsSourceNode: ts.Node | null;
  /** Registry dependencies contributed by resource metadata decorators such as `@children` and `@slotted`. */
  readonly dependencies: readonly ResourceDependencyReference[];
  /** Metadata decorators that exist but did not close to static resource facts. */
  readonly open: readonly ConvergenceOpen[];
}

export function readAliasMetadataAnnotations(
  context: ResourceRecognitionContext,
  targetClass: ts.ClassLikeDeclarationBase | null,
): AliasAnnotationRead {
  if (targetClass == null) {
    return { aliases: [], open: [] };
  }
  const aliases: ResourceAliasObservation[] = [];
  const open: ConvergenceOpen[] = [];
  for (const decorator of classDecorators(targetClass)) {
    const call = decoratorCallNamed(decorator, 'alias');
    if (call == null) {
      continue;
    }
    for (const argument of call.arguments) {
      const read = context.expressionReader.evaluateExpression(argument);
      const value = read.value;
      const alias = value == null ? null : readStaticStringValue(value);
      if (alias == null || value == null) {
        open.push(new ConvergenceOpen(
          '@alias(...) argument did not close to a static string.',
          argument,
          convergenceReasonKindsForRead(read, [OpenSeamReasonKind.ResourceAnnotationOpen]),
        ));
        continue;
      }
      aliases.push(new ResourceAliasObservation(
        alias,
        authoredStringLiteralNode(value, value.node, argument),
      ));
    }
  }
  return { aliases, open };
}

/** Read class-side alias metadata without discarding directly authored array-entry tokens. */
export function readStaticAliasMetadata(
  context: ResourceRecognitionContext,
  targetClass: ts.ClassLikeDeclarationBase | null,
): AliasAnnotationRead {
  if (targetClass == null) {
    return { aliases: [], open: [] };
  }
  const read = readStaticClassPropertyValue(context, targetClass, 'aliases');
  if (read == null) {
    return { aliases: [], open: [] };
  }
  if (read.value == null) {
    return {
      aliases: [],
      open: [new ConvergenceOpen(
        'Static resource aliases evaluation did not produce a value.',
        read.node ?? targetClass,
        convergenceReasonKindsForRead(read, [OpenSeamReasonKind.ResourceAnnotationOpen]),
      )],
    };
  }
  if (read.value.kind === EvaluationValueKind.Undefined || read.value.kind === EvaluationValueKind.Null) {
    return {
      aliases: [],
      open: convergenceOpenForReadPressure('Static resource aliases evaluation remained open.', read),
    };
  }
  const entries = readStaticStringArrayEntries(read.value, read.node);
  return entries == null
    ? {
        aliases: [],
        open: [new ConvergenceOpen(
          'Static resource aliases did not close to a string array.',
          read.node ?? targetClass,
          convergenceReasonKindsForRead(read, [OpenSeamReasonKind.ResourceAnnotationOpen]),
        )],
      }
    : {
        aliases: entries.map((entry) => new ResourceAliasObservation(entry.value, entry.valueNode)),
        open: [],
      };
}

/** Merge framework-priority alias sources while preserving the winning authored token. */
export function mergeResourceAliasObservations(
  ...aliasLists: readonly (readonly ResourceAliasObservation[])[]
): readonly ResourceAliasObservation[] {
  const seen = new Set<string>();
  const result: ResourceAliasObservation[] = [];
  for (const aliases of aliasLists) {
    for (const alias of aliases) {
      if (seen.has(alias.name)) {
        continue;
      }
      seen.add(alias.name);
      result.push(alias);
    }
  }
  return result;
}

export function readCustomElementMetadataAnnotations(
  context: ResourceRecognitionContext,
  targetClass: ts.ClassLikeDeclarationBase | null,
): CustomElementMetadataAnnotationRead {
  if (targetClass == null) {
    return emptyCustomElementMetadataAnnotationRead();
  }

  const aliases = readAliasMetadataAnnotations(context, targetClass);
  const open: ConvergenceOpen[] = [...aliases.open];
  let capture: CustomElementCaptureDefinition | null = null;
  let captureSourceNode: ts.Node | null = null;
  let containerless: boolean | null = null;
  let containerlessSourceNode: ts.Node | null = null;
  let shadowOptions: ShadowOptionsDefinition | null = null;
  let shadowOptionsSourceNode: ts.Node | null = null;
  const dependencies = readCustomElementDependencyMetadataAnnotations(targetClass);

  for (const decorator of classDecorators(targetClass)) {
    if (decoratorIdentifierNamed(decorator, 'containerless') || decoratorCallNamed(decorator, 'containerless') != null) {
      containerless = true;
      containerlessSourceNode = decorator;
      continue;
    }

    const shadowCall = decoratorCallNamed(decorator, 'useShadowDOM');
    if (decoratorIdentifierNamed(decorator, 'useShadowDOM') || shadowCall != null) {
      const shadowRead = readShadowDomAnnotation(context, shadowCall);
      shadowOptions = shadowRead.shadowOptions;
      shadowOptionsSourceNode = shadowRead.sourceNode ?? decorator;
      if (shadowRead.open != null) {
        open.push(shadowRead.open);
      }
      continue;
    }

    const captureCall = decoratorCallNamed(decorator, 'capture');
    if (captureCall != null) {
      const captureRead = readCaptureAnnotation(context, captureCall);
      capture = captureRead.capture;
      captureSourceNode = captureRead.sourceNode ?? decorator;
      if (captureRead.open != null) {
        open.push(captureRead.open);
      }
    }
  }

  return {
    aliases: aliases.aliases,
    capture,
    captureSourceNode,
    containerless,
    containerlessSourceNode,
    shadowOptions,
    shadowOptionsSourceNode,
    dependencies,
    open,
  };
}

function emptyCustomElementMetadataAnnotationRead(): CustomElementMetadataAnnotationRead {
  return {
    aliases: [],
    capture: null,
    captureSourceNode: null,
    containerless: null,
    containerlessSourceNode: null,
    shadowOptions: null,
    shadowOptionsSourceNode: null,
    dependencies: [],
    open: [],
  };
}

function readCustomElementDependencyMetadataAnnotations(
  targetClass: ts.ClassLikeDeclarationBase,
): readonly ResourceDependencyReference[] {
  return targetClass.members.flatMap((member): readonly ResourceDependencyReference[] => {
    if (!ts.canHaveDecorators(member)) {
      return [];
    }
    const propertyName = memberName(member);
    if (propertyName == null) {
      return [];
    }
    const dependencies: ResourceDependencyReference[] = [];
    for (const decorator of ts.getDecorators(member) ?? []) {
      if (decoratorIdentifierNamed(decorator, 'children') || decoratorCallNamed(decorator, 'children') != null) {
        dependencies.push(frameworkRegistryDependency(ResourceRegistryDependencyKind.ChildrenLifecycleHooks, 'ChildrenLifecycleHooks', propertyName));
      }
      if (decoratorIdentifierNamed(decorator, 'slotted') || decoratorCallNamed(decorator, 'slotted') != null) {
        dependencies.push(frameworkRegistryDependency(ResourceRegistryDependencyKind.SlottedLifecycleHooks, 'SlottedLifecycleHooks', propertyName));
      }
    }
    return dependencies;
  });
}

function frameworkRegistryDependency(
  registryKind: ResourceRegistryDependencyKind,
  keyName: string,
  localName: string,
): ResourceDependencyReference {
  return new ResourceDependencyReference(
    null,
    keyName,
    null,
    localName,
    ResourceDependencyReferenceKind.Registry,
    registryKind,
  );
}

function classDecorators(targetClass: ts.ClassLikeDeclarationBase): readonly ts.Decorator[] {
  return ts.canHaveDecorators(targetClass) ? ts.getDecorators(targetClass) ?? [] : [];
}

function readShadowDomAnnotation(
  context: ResourceRecognitionContext,
  call: ts.CallExpression | null,
): {
  readonly shadowOptions: ShadowOptionsDefinition | null;
  readonly sourceNode: ts.Node | null;
  readonly open: ConvergenceOpen | null;
} {
  if (call == null || call.arguments.length === 0) {
    return {
      shadowOptions: new ShadowOptionsDefinition(ShadowRootMode.Open),
      sourceNode: call,
      open: null,
    };
  }
  const argument = call.arguments[0] ?? null;
  if (argument == null) {
    return {
      shadowOptions: new ShadowOptionsDefinition(ShadowRootMode.Open),
      sourceNode: call,
      open: null,
    };
  }
  const read = context.expressionReader.evaluateExpression(argument);
  const value = read.value;
  if (value == null || value.kind === EvaluationValueKind.Unknown || value.kind === EvaluationValueKind.BoundaryValue) {
    return {
      shadowOptions: null,
      sourceNode: argument,
      open: new ConvergenceOpen(
        '@useShadowDOM(...) options did not close to a static shadow-root mode.',
        argument,
        convergenceReasonKindsForRead(read, [OpenSeamReasonKind.ResourceAnnotationOpen]),
      ),
    };
  }
  if (value.kind !== EvaluationValueKind.Object) {
    return {
      shadowOptions: new ShadowOptionsDefinition(ShadowRootMode.Open),
      sourceNode: argument,
      open: null,
    };
  }
  const modeRead = context.expressionReader.readObjectProperty(argument, 'mode');
  const mode = modeRead.value;
  const modeText = mode == null ? null : readStaticStringValue(mode);
  const pressure = convergenceOpenForReadPressure(
    '@useShadowDOM(...) options retained open evaluator pressure.',
    modeRead,
  )[0] ?? null;
  switch (modeText) {
    case 'open':
      return { shadowOptions: new ShadowOptionsDefinition(ShadowRootMode.Open), sourceNode: argument, open: pressure };
    case 'closed':
      return { shadowOptions: new ShadowOptionsDefinition(ShadowRootMode.Closed), sourceNode: argument, open: pressure };
    default:
      return {
        shadowOptions: null,
        sourceNode: argument,
        open: new ConvergenceOpen(
          '@useShadowDOM(...) options did not expose a static open/closed mode.',
          argument,
          convergenceReasonKindsForRead(modeRead, [OpenSeamReasonKind.ResourceAnnotationOpen]),
        ),
      };
  }
}

function readCaptureAnnotation(
  context: ResourceRecognitionContext,
  call: ts.CallExpression,
): {
  readonly capture: CustomElementCaptureDefinition | null;
  readonly sourceNode: ts.Node | null;
  readonly open: ConvergenceOpen | null;
} {
  const argument = call.arguments[0] ?? null;
  if (argument == null) {
    return {
      capture: new CustomElementCaptureDefinition(CustomElementCaptureKind.All),
      sourceNode: call,
      open: null,
    };
  }
  const read = context.expressionReader.evaluateExpression(argument);
  const value = read.value;
  if (value?.kind === EvaluationValueKind.Function) {
    return {
      capture: new CustomElementCaptureDefinition(
        CustomElementCaptureKind.Predicate,
        targetReferenceForFunction(value, null) satisfies ResourceTargetReference,
      ),
      sourceNode: argument,
      open: null,
    };
  }
  if (value == null || value.kind === EvaluationValueKind.Unknown || value.kind === EvaluationValueKind.BoundaryValue) {
    return {
      capture: new CustomElementCaptureDefinition(CustomElementCaptureKind.Open),
      sourceNode: argument,
      open: new ConvergenceOpen(
        '@capture(...) predicate did not close to a static function or non-function value.',
        argument,
        convergenceReasonKindsForRead(read, [OpenSeamReasonKind.ResourceAnnotationOpen]),
      ),
    };
  }
  return {
    capture: new CustomElementCaptureDefinition(CustomElementCaptureKind.All),
    sourceNode: argument,
    open: null,
  };
}
