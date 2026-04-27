import ts from 'typescript';
import { readPropertyName, readReferenceSeed, unwrapExpression } from '../analysis/ts-ast-helpers.js';
import type { SourceFileRef } from '../source-address.js';
import {
  sourceNodeRefFromTsNode,
  type SourceNodeRef,
} from '../refs.js';
import {
  BindableCallbackTarget,
  BindableContributionEntry,
  BindableEntry,
  BindableFieldProvenance,
  BindableFieldWitness,
  BindableResolutionInput,
  BindableResolutionProvenance,
  BindableSurface,
  BindableSurfaceProvenance,
  BindableSurfaceWitness,
  type BindableCarrierKind,
  type BindableFieldKind,
  type BindableInterceptorKind,
  type BindableResolutionInputKind,
} from './bindable-support.js';

export interface BindableContributorSeed {
  readonly expression: ts.Expression | null;
  readonly carrier: BindableCarrierKind;
  readonly source: SourceNodeRef | null;
  readonly note: string | null;
}

interface BindableContributor {
  readonly bindableName: string | null;
  readonly fields: Partial<Record<BindableFieldKind, ts.Expression | null>>;
  readonly contribution: BindableFieldWitness;
}

export function createBindableResolutionInput(
  kind: BindableResolutionInputKind,
  contributors: readonly BindableContributorSeed[],
): BindableResolutionInput {
  const entries = readBindableContributionEntries(contributors);
  return new BindableResolutionInput(
    kind,
    entries,
    buildBindableSurfaceProvenance(contributors, entries.length),
    contributors.length === 0
      ? noteForEmptyInput(kind)
      : noteForInput(kind),
  );
}

export function readBindableSurfaceFromInputs(
  inputs: readonly BindableResolutionInput[],
  declarationNode: ts.ClassLikeDeclarationBase,
  file: SourceFileRef,
  sourceFile: ts.SourceFile,
): BindableSurface {
  const selectedByName = new Map<string, BindableContributionEntry>();
  const shadowedByName = new Map<string, BindableContributionEntry[]>();

  for (const input of inputs) {
    for (const entry of input.entries) {
      if (entry.name == null) {
        continue;
      }
      const previous = selectedByName.get(entry.name);
      if (previous != null) {
        const shadowed = shadowedByName.get(entry.name) ?? [];
        shadowed.push(previous);
        shadowedByName.set(entry.name, shadowed);
      }
      selectedByName.set(entry.name, entry);
    }
  }

  const entries = [...selectedByName.values()].map((selected) =>
    finalizeBindableEntry(
      selected,
      shadowedByName.get(selected.name ?? '') ?? [],
      declarationNode,
      file,
      sourceFile,
    ),
  );

  const allWitnesses = inputs.flatMap((input) => input.provenance?.contributors ?? []);
  return new BindableSurface(
    inputs,
    entries,
    new BindableSurfaceProvenance(
      inputs.filter((input) => input.entries.length > 0).length > 1 || entries.length > 1 ? 'merged' : 'selected',
      null,
      mergeUniqueSurfaceWitnesses(allWitnesses),
      'Bindable surface resolved through ordered whole-entry overwrite across runtime-shaped bindable inputs.',
    ),
    inputs.length === 0
      ? 'Bindable declaration surface is empty on the current class carrier.'
      : 'Bindable surface resolved from ordered runtime-shaped bindable inputs over the current class carrier.',
  );
}

export function mergeBindableSurface(
  existing: BindableSurface,
  derived: BindableSurface,
): BindableSurface {
  // NOTE: callers pass `existing` as the already-seeded resource surface and
  // `derived` as the declaration-local class surface. Runtime CE/CA/TC
  // creation applies class/type bindables before later definition-object
  // bindables, so merged input order here is intentionally derived-first and
  // existing-last.
  const inputs = [
    ...derived.inputs,
    ...existing.inputs,
    ...surfaceAsSeedInputs(derived),
    ...surfaceAsSeedInputs(existing),
  ];

  const selectedByName = new Map<string, BindableEntry>();
  for (const entry of [...derived.entries, ...existing.entries]) {
    if (entry.name == null) {
      continue;
    }
    selectedByName.set(entry.name, entry);
  }

  const mergedEntries = [...selectedByName.values()];
  const allWitnesses = mergeUniqueSurfaceWitnesses([
    ...(derived.provenance?.contributors ?? []),
    ...(existing.provenance?.contributors ?? []),
  ]);

  return new BindableSurface(
    inputs,
    mergedEntries.length > 0 ? mergedEntries : [...derived.entries, ...existing.entries],
    inputs.length === 0
      ? existing.provenance ?? derived.provenance
      : new BindableSurfaceProvenance(
        inputs.filter((input) => input.entries.length > 0).length > 1 || mergedEntries.length > 1 ? 'merged' : 'selected',
        null,
        allWitnesses,
        'Bindable surface merged across previously materialized runtime-shaped inputs while preserving whole-entry overwrite order.',
      ),
    inputs.length === 0
      ? existing.note ?? derived.note
      : 'Bindable surface merged from previously materialized runtime-shaped inputs.',
  );
}

function surfaceAsSeedInputs(
  surface: BindableSurface,
): readonly BindableResolutionInput[] {
  if (surface.inputs.length > 0 || surface.entries.length === 0) {
    return [];
  }

  return [
    new BindableResolutionInput(
      'seed-bindables',
      surface.entries.map((entry) => new BindableContributionEntry(
        entry.name,
        entry.attribute,
        entry.callback,
        entry.mode,
        entry.interceptorKind,
        entry.typeReferenceName,
        entry.nullable,
        entry.provenance,
        entry.note,
      )),
      surface.provenance,
      'Seed bindables injected directly into the resource definition.',
    ),
  ];
}

function readBindableContributionEntries(
  contributors: readonly BindableContributorSeed[],
): readonly BindableContributionEntry[] {
  const rawContributors = contributors.flatMap(extractBindableContributors);
  const bindableNamesBySource = new Map<string, string>();

  for (const contributor of rawContributors) {
    const sourceId = contributor.contribution.source?.id;
    if (sourceId == null || contributor.bindableName == null) {
      continue;
    }
    bindableNamesBySource.set(sourceId, bindableNamesBySource.get(sourceId) ?? contributor.bindableName);
  }

  const byName = new Map<string, BindableContributor[]>();
  for (const contributor of rawContributors) {
    const bindableName = contributor.bindableName
      ?? (contributor.contribution.source == null
        ? null
        : bindableNamesBySource.get(contributor.contribution.source.id) ?? null);
    if (bindableName == null) {
      continue;
    }
    const current = byName.get(bindableName) ?? [];
    current.push(contributor);
    byName.set(bindableName, current);
  }

  const entries: BindableContributionEntry[] = [];
  for (const [bindableName, bindableContributors] of byName) {
    const lastContributor = bindableContributors.at(-1) ?? null;
    if (lastContributor == null) {
      continue;
    }

    const nameContributors = bindableContributors.filter((current) => current.fields.name != null);
    const attributeContributors = bindableContributors.filter((current) => current.fields.attribute != null);
    const callbackContributors = bindableContributors.filter((current) => current.fields.callback != null);
    const modeContributors = bindableContributors.filter((current) => current.fields.mode != null);
    const setContributors = bindableContributors.filter((current) => current.fields.set != null);
    const typeContributors = bindableContributors.filter((current) => current.fields.type != null);
    const nullableContributors = bindableContributors.filter((current) => current.fields.nullable != null);

    entries.push(
      new BindableContributionEntry(
        bindableName,
        readBindableStringValue(lastContributor.fields.attribute ?? null),
        readBindableStringValue(lastContributor.fields.callback ?? null),
        readBindableModeValue(lastContributor.fields.mode ?? null),
        readBindableInterceptorKind(lastContributor.fields.set ?? null, lastContributor.fields.type ?? null),
        readBindableTypeReferenceName(lastContributor.fields.type ?? null),
        readBooleanValue(lastContributor.fields.nullable ?? null),
        compactBindableProvenances([
          buildBindableFieldProvenance('name', nameContributors),
          buildBindableFieldProvenance('attribute', attributeContributors),
          buildBindableFieldProvenance('callback', callbackContributors),
          buildBindableFieldProvenance('mode', modeContributors),
          buildBindableFieldProvenance('set', setContributors, 'presence-only'),
          buildBindableFieldProvenance('type', typeContributors, 'presence-only'),
          buildBindableFieldProvenance('nullable', nullableContributors),
        ]),
        'One bindable contribution entry before resource-specific runtime input ordering is applied.',
      ),
    );
  }

  return entries;
}

function finalizeBindableEntry(
  selected: BindableContributionEntry,
  shadowed: readonly BindableContributionEntry[],
  declarationNode: ts.ClassLikeDeclarationBase,
  file: SourceFileRef,
  sourceFile: ts.SourceFile,
): BindableEntry {
  const callbackName = selected.callback ?? `${selected.name}Changed`;
  return new BindableEntry(
    selected.name,
    selected.attribute ?? toKebabCase(selected.name ?? ''),
    callbackName,
    resolveBindableCallbackTarget(declarationNode, callbackName, file, sourceFile, selected.callback == null),
    selected.mode ?? 'toView',
    selected.interceptorKind === 'open' ? 'default-noop' : selected.interceptorKind,
    selected.typeReferenceName,
    selected.nullable,
    new BindableResolutionProvenance(
      selected.attribute == null || selected.callback == null || selected.mode == null
        ? 'default-filled'
        : 'selected-contribution',
      selected,
      shadowed,
      shadowed.length === 0
        ? 'Final bindable entry closed from one selected contribution.'
        : 'Final bindable entry closed from the latest contribution after whole-entry overwrite over earlier inputs.',
    ),
    selected.provenance,
    null,
  );
}

function extractBindableContributors(
  contributor: BindableContributorSeed,
): readonly BindableContributor[] {
  const expression = contributor.expression == null ? null : unwrapExpression(contributor.expression);
  if (expression == null) {
    return [];
  }

  if (isStringLike(expression)) {
    return [createStringBindableContributor(expression.text, contributor)];
  }

  if (ts.isArrayLiteralExpression(expression)) {
    const items: BindableContributor[] = [];
    for (const element of expression.elements) {
      const current = unwrapExpression(element);
      if (isStringLike(current)) {
        items.push(createStringBindableContributor(current.text, contributor));
        continue;
      }

      if (ts.isObjectLiteralExpression(current)) {
        const bindableName = readBindableStringValue(readObjectLiteralPropertyInitializer(current, 'name'));
        items.push({
          bindableName,
          fields: readBindableFieldMap(current),
          contribution: toBindableWitness('name', contributor),
        });
      }
    }
    return items;
  }

  if (ts.isObjectLiteralExpression(expression)) {
    const explicitName = readBindableStringValue(readObjectLiteralPropertyInitializer(expression, 'name'));
    if (contributor.carrier === 'bindable-decorator') {
      return [{
        bindableName: null,
        fields: readBindableFieldMap(expression),
        contribution: toBindableWitness('name', contributor),
      }];
    }

    if (explicitName != null) {
      return [{
        bindableName: explicitName,
        fields: readBindableFieldMap(expression),
        contribution: toBindableWitness('name', contributor),
      }];
    }

    const items: BindableContributor[] = [];
    for (const property of expression.properties) {
      if (!ts.isPropertyAssignment(property) && !ts.isShorthandPropertyAssignment(property)) {
        continue;
      }

      const bindableName = readPropertyName(property.name);
      if (bindableName == null) {
        continue;
      }

      if (ts.isShorthandPropertyAssignment(property)) {
        items.push({
          bindableName,
          fields: { name: ts.factory.createStringLiteral(bindableName) },
          contribution: toBindableWitness('name', contributor),
        });
        continue;
      }

      const initializer = unwrapExpression(property.initializer);
      if (initializer.kind === ts.SyntaxKind.TrueKeyword) {
        items.push({
          bindableName,
          fields: { name: ts.factory.createStringLiteral(bindableName) },
          contribution: toBindableWitness('name', contributor),
        });
        continue;
      }

      if (isStringLike(initializer)) {
        items.push({
          bindableName,
          fields: {
            name: ts.factory.createStringLiteral(bindableName),
            attribute: initializer,
          },
          contribution: toBindableWitness('name', contributor),
        });
        continue;
      }

      if (ts.isObjectLiteralExpression(initializer)) {
        items.push({
          bindableName,
          fields: {
            name: ts.factory.createStringLiteral(bindableName),
            ...readBindableFieldMap(initializer),
          },
          contribution: toBindableWitness('name', contributor),
        });
      }
    }

    return items;
  }

  return [];
}

function createStringBindableContributor(
  name: string,
  contributor: BindableContributorSeed,
): BindableContributor {
  return {
    bindableName: name,
    fields: { name: ts.factory.createStringLiteral(name) },
    contribution: toBindableWitness('name', contributor),
  };
}

function readBindableFieldMap(
  objectLiteral: ts.ObjectLiteralExpression,
): Partial<Record<BindableFieldKind, ts.Expression | null>> {
  return {
    name: readObjectLiteralPropertyInitializer(objectLiteral, 'name'),
    attribute: readObjectLiteralPropertyInitializer(objectLiteral, 'attribute'),
    callback: readObjectLiteralPropertyInitializer(objectLiteral, 'callback'),
    mode: readObjectLiteralPropertyInitializer(objectLiteral, 'mode'),
    set: readObjectLiteralPropertyInitializer(objectLiteral, 'set'),
    type: readObjectLiteralPropertyInitializer(objectLiteral, 'type'),
    nullable: readObjectLiteralPropertyInitializer(objectLiteral, 'nullable'),
  };
}

function buildBindableSurfaceProvenance(
  contributors: readonly BindableContributorSeed[],
  entryCount: number,
): BindableSurfaceProvenance | null {
  if (contributors.length === 0) {
    return null;
  }

  const witnesses = mergeUniqueSurfaceWitnesses(
    contributors.map((current) => new BindableSurfaceWitness(current.carrier, current.source, current.note)),
  );

  return new BindableSurfaceProvenance(
    contributors.length > 1 || entryCount > 1 ? 'merged' : 'selected',
    null,
    witnesses,
    'Bindable input provenance over one ordered runtime-shaped bindable input.',
  );
}

function toBindableWitness(
  field: BindableFieldKind,
  contributor: BindableContributorSeed,
): BindableFieldWitness {
  return new BindableFieldWitness(
    field,
    contributor.carrier,
    contributor.source,
    contributor.note,
  );
}

function buildBindableFieldProvenance(
  field: BindableFieldKind,
  contributors: readonly BindableContributor[],
  modeOverride?: 'selected' | 'presence-only',
): BindableFieldProvenance | null {
  if (contributors.length === 0) {
    return null;
  }

  const lastContributor = contributors.at(-1) ?? null;
  const contributorWitnesses = mergeUniqueBindableWitnesses(
    contributors.map((current) =>
      new BindableFieldWitness(
        field,
        current.contribution.carrier,
        current.contribution.source,
        current.contribution.note,
      ),
    ),
  );

  return new BindableFieldProvenance(
    field,
    modeOverride ?? 'selected',
    lastContributor == null
      ? null
      : new BindableFieldWitness(
        field,
        lastContributor.contribution.carrier,
        lastContributor.contribution.source,
        lastContributor.contribution.note,
      ),
    contributorWitnesses,
  );
}

function compactBindableProvenances(
  values: readonly (BindableFieldProvenance | null)[],
): readonly BindableFieldProvenance[] {
  return values.filter((value): value is BindableFieldProvenance => value != null);
}

function mergeUniqueBindableWitnesses(
  values: readonly BindableFieldWitness[],
): readonly BindableFieldWitness[] {
  const seen = new Set<string>();
  const merged: BindableFieldWitness[] = [];

  for (const value of values) {
    const key = `${value.field}:${value.carrier}:${value.source?.id ?? '<none>'}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    merged.push(value);
  }

  return merged;
}

function mergeUniqueSurfaceWitnesses(
  values: readonly BindableSurfaceWitness[],
): readonly BindableSurfaceWitness[] {
  const seen = new Set<string>();
  const merged: BindableSurfaceWitness[] = [];

  for (const value of values) {
    const key = `${value.carrier}:${value.source?.id ?? '<none>'}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    merged.push(value);
  }

  return merged;
}

function readBindableStringValue(
  expression: ts.Expression | null,
): string | null {
  return isStringLike(expression) ? expression.text : null;
}

function readBindableModeValue(
  expression: ts.Expression | null,
): string | number | null {
  if (expression == null) {
    return null;
  }
  if (isStringLike(expression)) {
    return expression.text;
  }
  if (ts.isIdentifier(expression)) {
    return expression.text;
  }
  if (ts.isPropertyAccessExpression(expression)) {
    return expression.name.text;
  }
  if (ts.isNumericLiteral(expression)) {
    return Number(expression.text);
  }
  return null;
}

function readBindableTypeReferenceName(
  expression: ts.Expression | null,
): string | null {
  if (expression == null) {
    return null;
  }

  const seed = readReferenceSeed(expression);
  return seed.candidateName;
}

function readBindableInterceptorKind(
  setExpression: ts.Expression | null,
  typeExpression: ts.Expression | null,
): BindableInterceptorKind {
  if (setExpression != null) {
    return 'explicit-set';
  }
  if (typeExpression != null) {
    return 'type-coercer';
  }
  return 'default-noop';
}

function readBooleanValue(
  expression: ts.Expression | null,
): boolean | null {
  if (expression == null) {
    return null;
  }
  if (expression.kind === ts.SyntaxKind.TrueKeyword) {
    return true;
  }
  if (expression.kind === ts.SyntaxKind.FalseKeyword) {
    return false;
  }
  return null;
}

function readObjectLiteralPropertyInitializer(
  literal: ts.ObjectLiteralExpression,
  propertyName: string,
): ts.Expression | null {
  for (const property of literal.properties) {
    if (ts.isPropertyAssignment(property) && readPropertyName(property.name) === propertyName) {
      return property.initializer;
    }
  }
  return null;
}

function resolveBindableCallbackTarget(
  declarationNode: ts.ClassLikeDeclarationBase,
  callbackName: string,
  file: SourceFileRef,
  sourceFile: ts.SourceFile,
  isDefaulted: boolean,
): BindableCallbackTarget {
  const method = findInstanceMethod(declarationNode, callbackName);
  if (method != null) {
    return new BindableCallbackTarget(
      'resolved-instance-method',
      callbackName,
      toNodeRef(method, file, sourceFile),
      isDefaulted
        ? 'Bindable callback target resolved from the runtime default callback name.'
        : 'Bindable callback target resolved from the authored callback name.',
    );
  }

  return new BindableCallbackTarget(
    'name-only',
    callbackName,
    null,
    isDefaulted
      ? 'Bindable callback target currently closes only as a default callback name; no matching instance method was found on the current class carrier.'
      : 'Bindable callback target currently closes only as an authored callback name; no matching instance method was found on the current class carrier.',
  );
}

function findInstanceMethod(
  declarationNode: ts.ClassLikeDeclarationBase,
  name: string,
): ts.MethodDeclaration | null {
  for (const member of declarationNode.members) {
    if (!ts.isMethodDeclaration(member)) {
      continue;
    }
    if (member.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.StaticKeyword)) {
      continue;
    }
    if (readPropertyName(member.name) === name) {
      return member;
    }
  }
  return null;
}

function toNodeRef(
  node: ts.Node,
  file: SourceFileRef,
  sourceFile: ts.SourceFile,
): SourceNodeRef {
  return sourceNodeRefFromTsNode(file, node, sourceFile, { endKind: 'token-end' });
}

function isStringLike(
  expression: ts.Expression | null,
): expression is ts.StringLiteral | ts.NoSubstitutionTemplateLiteral {
  return expression != null && (ts.isStringLiteral(expression) || ts.isNoSubstitutionTemplateLiteral(expression));
}

function toKebabCase(
  value: string,
): string {
  return value.replace(/([A-Z])/g, (_, capital: string) => `-${capital.toLowerCase()}`);
}

function noteForEmptyInput(
  kind: BindableResolutionInputKind,
): string {
  switch (kind) {
    case 'inherited-bindable-metadata':
      return 'Inherited bindable metadata is not materialized in the current declaration-local slice.';
    case 'local-bindable-decorator-metadata':
      return 'No local bindable decorator metadata was found on the current class carrier.';
    case 'annotated-bindables':
      return 'No annotated/static-au bindables were found on the current class carrier.';
    case 'static-own-bindables':
      return 'No static own bindables were found on the current class carrier.';
    case 'definition-bindables':
      return 'No explicit definition-object bindables were supplied to this clean-room slice.';
    case 'seed-bindables':
      return 'No seed bindables were supplied to this resource definition.';
    case 'open':
    default:
      return 'Bindable input stayed open.';
  }
}

function noteForInput(
  kind: BindableResolutionInputKind,
): string {
  switch (kind) {
    case 'inherited-bindable-metadata':
      return 'Inherited bindable metadata input. The current clean-room still leaves full prototype-chain recovery to a later layer.';
    case 'local-bindable-decorator-metadata':
      return 'Local bindable decorator metadata input from @bindable class/field/getter surfaces.';
    case 'annotated-bindables':
      return 'Annotated bindables input from definition-like annotation/static-au surfaces.';
    case 'static-own-bindables':
      return 'Static own bindables input from Type.bindables-style class members.';
    case 'definition-bindables':
      return 'Definition-object bindables input from later definition-object recovery.';
    case 'seed-bindables':
      return 'Seed bindables input supplied directly to the clean-room resource definition.';
    case 'open':
    default:
      return 'Open bindable input.';
  }
}
