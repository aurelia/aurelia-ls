import type { AureliaAppWorldProjectEmission } from '../configuration/app-world-project-pass.js';
import type { KernelStore } from '../kernel/store.js';
import type { BindableDefinition } from '../resources/bindable-definition.js';
import type { FullResourceDefinition } from '../resources/resource-definition.js';
import { ResourceDefinitionKind } from '../resources/resource-kind.js';
import type { ResourceDependencyReference } from '../resources/resource-reference.js';
import {
  describeAddress,
} from './source-reference.js';
import type {
  SemanticResourceDefinitionBindableRow,
  SemanticResourceDefinitionDependencyRow,
  SemanticResourceDefinitionPatternRow,
  SemanticResourceDefinitionRow,
  SemanticResourceDefinitionTemplateRow,
} from './contracts.js';

export function readResourceDefinitionRows(
  emission: AureliaAppWorldProjectEmission,
  store: KernelStore,
  handles: boolean,
): readonly SemanticResourceDefinitionRow[] {
  return emission.resources.readDefinitions()
    .map((definition): SemanticResourceDefinitionRow => ({
      projectKey: emission.project.projectKey,
      resourceKind: resourceKindForApi(definition),
      name: readDefinitionName(definition),
      aliases: readDefinitionAliases(definition),
      key: readDefinitionKey(definition),
      targetName: definition.target.localName,
      captureKind: 'capture' in definition ? definition.capture.kind : null,
      template: 'template' in definition ? templateRow(definition.template, store) : null,
      bindables: 'bindables' in definition ? bindableRows(definition.bindables, store) : [],
      dependencies: 'dependencies' in definition ? dependencyRows(definition.dependencies) : [],
      isTemplateController: 'isTemplateController' in definition ? definition.isTemplateController : null,
      containerStrategy: 'containerStrategy' in definition ? definition.containerStrategy : null,
      defaultProperty: 'defaultProperty' in definition ? definition.defaultProperty : null,
      containerless: 'containerless' in definition ? definition.containerless : null,
      shadowMode: 'shadowOptions' in definition ? definition.shadowOptions?.mode ?? null : null,
      hasSlots: 'hasSlots' in definition ? definition.hasSlots : null,
      needsCompile: 'needsCompile' in definition ? definition.needsCompile : null,
      patterns: 'patterns' in definition ? definition.patterns.map((pattern): SemanticResourceDefinitionPatternRow => ({
        pattern: pattern.pattern,
        symbols: pattern.symbols,
        source: describeAddress(store, pattern.addressHandle),
      })) : [],
      source: describeAddress(store, definition.sourceAddressHandle),
      targetSource: describeAddress(store, definition.target.addressHandle),
      ...(handles ? {
        handles: {
          definitionProductHandle: definition.productHandle,
          identityHandle: definition.identityHandle,
          targetIdentityHandle: definition.target.identityHandle,
          sourceAddressHandle: definition.sourceAddressHandle,
          targetAddressHandle: definition.target.addressHandle,
        },
      } : {}),
    }))
    .sort((left, right) =>
      `${left.resourceKind}:${left.name ?? ''}:${left.targetName ?? ''}:${left.source?.label ?? ''}`
        .localeCompare(`${right.resourceKind}:${right.name ?? ''}:${right.targetName ?? ''}:${right.source?.label ?? ''}`)
    );
}

function resourceKindForApi(definition: FullResourceDefinition): ResourceDefinitionKind {
  return definition.type === ResourceDefinitionKind.CustomAttribute
    && 'isTemplateController' in definition
    && definition.isTemplateController
    ? ResourceDefinitionKind.TemplateController
    : definition.type;
}

function readDefinitionName(definition: FullResourceDefinition): string | null {
  return 'name' in definition ? definition.name : null;
}

function readDefinitionAliases(definition: FullResourceDefinition): readonly string[] {
  return 'aliases' in definition ? definition.aliases.map((alias) => alias.name) : [];
}

function readDefinitionKey(definition: FullResourceDefinition): string | null {
  return 'key' in definition ? definition.key : null;
}

function templateRow(
  template: Extract<FullResourceDefinition, { readonly type: ResourceDefinitionKind.CustomElement }>['template'],
  store: KernelStore,
): SemanticResourceDefinitionTemplateRow | null {
  if (template == null) {
    return null;
  }
  return {
    kind: template.kind,
    hasMarkup: template.markup != null && template.markup.length > 0,
    source: describeAddress(store, template.addressHandle),
  };
}

function bindableRows(
  bindables: readonly BindableDefinition[],
  store: KernelStore,
): readonly SemanticResourceDefinitionBindableRow[] {
  return bindables
    .map((bindable): SemanticResourceDefinitionBindableRow => ({
      name: bindable.name,
      attribute: bindable.attribute,
      callback: bindable.callback,
      mode: bindable.mode,
      setterKind: bindable.set.kind,
      source: describeAddress(store, bindable.sourceAddressHandle),
    }))
    .sort((left, right) => left.name.localeCompare(right.name));
}

function dependencyRows(
  dependencies: readonly ResourceDependencyReference[],
): readonly SemanticResourceDefinitionDependencyRow[] {
  return dependencies
    .map((dependency): SemanticResourceDefinitionDependencyRow => ({
      keyName: dependency.keyName,
      hasIdentity: dependency.identityHandle != null,
    }))
    .sort((left, right) => `${left.keyName ?? ''}:${left.hasIdentity}`.localeCompare(`${right.keyName ?? ''}:${right.hasIdentity}`));
}
