import { moduleSpecifier } from '../application/module-specifier.js';
import { AppBuilderResourceDeclarationMode } from './aurelia-lowering-option.js';
import { AppBuilderDomainFieldValueKind, type AppBuilderDomainPresetDescriptor } from './domain-preset.js';
import type { AppBuilderSeedDataSetDescriptor } from './seed-data.js';
import {
  SourcePlan,
  SourcePlanConflictPolicy,
  SourcePlanEditKind,
  SourcePlanFile,
  SourcePlanFileRole,
  SourcePlanFormattingPolicy,
  SourcePlanLanguage,
  SourcePlanPackageToolingPolicy,
  SourcePlanPolicy,
  SourcePlanText,
  SourcePlanTextAuthority,
} from '../source-plan/source-plan.js';

export interface AppBuilderCollectionListSourceRequest {
  readonly rootDir: string;
  readonly appName: string;
  readonly declarationMode: AppBuilderResourceDeclarationMode.ConventionResource;
  readonly domainPreset: AppBuilderDomainPresetDescriptor;
  readonly seedDataSet: AppBuilderSeedDataSetDescriptor;
}

interface AppBuilderCollectionListSourceModel {
  readonly rootDir: string;
  readonly appName: string;
  readonly entrypointPath: string;
  readonly rootComponentPath: string;
  readonly rootTemplatePath: string;
  readonly domainModelPath: string;
  readonly stateModelPath: string;
  readonly rootComponentClassName: string;
  readonly entityTypeName: string;
  readonly stateClassName: string;
  readonly collectionMemberName: string;
  readonly identityMemberName: string;
  readonly titleMemberName: string;
  readonly doneMemberName: string;
  readonly nextId: number;
  readonly records: readonly Record<string, string | number | boolean>[];
}

export function appBuilderCollectionListSourcePlan(
  request: AppBuilderCollectionListSourceRequest,
): SourcePlan {
  const model = normalizeCollectionListSourceRequest(request);
  return new SourcePlan(
    model.rootDir,
    new SourcePlanPolicy(
      SourcePlanConflictPolicy.MustNotExist,
      SourcePlanFormattingPolicy.AppBuilderBaseline,
      SourcePlanPackageToolingPolicy.NotModeled,
    ),
    [
      new SourcePlanFile(
        model.entrypointPath,
        SourcePlanFileRole.Entrypoint,
        SourcePlanLanguage.TypeScript,
        SourcePlanEditKind.Create,
        null,
        new SourcePlanText(collectionListEntrypointSource(model), SourcePlanTextAuthority.AppBuilderGenerated),
      ),
      new SourcePlanFile(
        model.rootComponentPath,
        SourcePlanFileRole.RootComponent,
        SourcePlanLanguage.TypeScript,
        SourcePlanEditKind.Create,
        null,
        new SourcePlanText(collectionListRootComponentSource(model), SourcePlanTextAuthority.AppBuilderGenerated),
      ),
      new SourcePlanFile(
        model.rootTemplatePath,
        SourcePlanFileRole.Template,
        SourcePlanLanguage.Html,
        SourcePlanEditKind.Create,
        null,
        new SourcePlanText(collectionListRootTemplateSource(model), SourcePlanTextAuthority.AppBuilderGenerated),
      ),
      new SourcePlanFile(
        model.domainModelPath,
        SourcePlanFileRole.DomainModel,
        SourcePlanLanguage.TypeScript,
        SourcePlanEditKind.Create,
        null,
        new SourcePlanText(collectionListDomainModelSource(model), SourcePlanTextAuthority.AppBuilderGenerated),
      ),
      new SourcePlanFile(
        model.stateModelPath,
        SourcePlanFileRole.StateModel,
        SourcePlanLanguage.TypeScript,
        SourcePlanEditKind.Create,
        null,
        new SourcePlanText(collectionListStateModelSource(model), SourcePlanTextAuthority.AppBuilderGenerated),
      ),
    ],
  );
}

function normalizeCollectionListSourceRequest(
  request: AppBuilderCollectionListSourceRequest,
): AppBuilderCollectionListSourceModel {
  if (request.declarationMode !== AppBuilderResourceDeclarationMode.ConventionResource) {
    throw new Error('State-backed collection list source currently lowers through convention resources.');
  }

  const titleField = request.domainPreset.fields.find((field) => field.valueKind === AppBuilderDomainFieldValueKind.Text);
  const doneField = request.domainPreset.fields.find((field) => field.valueKind === AppBuilderDomainFieldValueKind.Boolean);
  if (titleField == null || doneField == null) {
    throw new Error(`Domain preset '${request.domainPreset.id}' must provide text and boolean fields for collection-list lowering.`);
  }

  const entityFileName = kebabCase(request.domainPreset.entityTypeName);
  const nextId = nextNumericId(request.seedDataSet.records, request.domainPreset.identityMemberName);

  return {
    rootDir: request.rootDir,
    appName: request.appName,
    entrypointPath: 'src/main.ts',
    rootComponentPath: 'src/my-app.ts',
    rootTemplatePath: 'src/my-app.html',
    domainModelPath: `src/${entityFileName}.ts`,
    stateModelPath: `src/${entityFileName}-list-state.ts`,
    rootComponentClassName: 'MyApp',
    entityTypeName: request.domainPreset.entityTypeName,
    stateClassName: `${request.domainPreset.entityTypeName}ListState`,
    collectionMemberName: request.domainPreset.collectionMemberName,
    identityMemberName: request.domainPreset.identityMemberName,
    titleMemberName: titleField.name,
    doneMemberName: doneField.name,
    nextId,
    records: request.seedDataSet.records,
  };
}

function collectionListEntrypointSource(
  model: AppBuilderCollectionListSourceModel,
): string {
  return `import Aurelia from 'aurelia';
import { ${model.rootComponentClassName} } from '${moduleSpecifier(model.entrypointPath, model.rootComponentPath, false)}';

Aurelia
  .app(${model.rootComponentClassName})
  .start();
`;
}

function collectionListRootComponentSource(
  model: AppBuilderCollectionListSourceModel,
): string {
  return `import { resolve } from 'aurelia';
import { ${model.stateClassName} } from '${moduleSpecifier(model.rootComponentPath, model.stateModelPath, false)}';

export class ${model.rootComponentClassName} {
  readonly state = resolve(${model.stateClassName});
}
`;
}

function collectionListDomainModelSource(
  model: AppBuilderCollectionListSourceModel,
): string {
  return `export class ${model.entityTypeName} {
  constructor(
    readonly ${model.identityMemberName}: number,
    public ${model.titleMemberName}: string,
    public ${model.doneMemberName} = false,
  ) {}

  get statusLabel(): string {
    return this.${model.doneMemberName} ? 'Done' : 'Open';
  }
}
`;
}

function collectionListStateModelSource(
  model: AppBuilderCollectionListSourceModel,
): string {
  const records = model.records.map((record) => (
    `    new ${model.entityTypeName}(${recordLiteral(record[model.identityMemberName])}, ${recordLiteral(record[model.titleMemberName])}, ${recordLiteral(record[model.doneMemberName])}),`
  )).join('\n');
  const collectionInitializer = records.length > 0
    ? `[
${records}
  ]`
    : '[]';

  return `import { ${model.entityTypeName} } from '${moduleSpecifier(model.stateModelPath, model.domainModelPath, false)}';

export class ${model.stateClassName} {
  new${model.entityTypeName}Title = '';
  private next${model.entityTypeName}Id = ${model.nextId};

  readonly ${model.collectionMemberName}: ${model.entityTypeName}[] = ${collectionInitializer};

  get canAdd${model.entityTypeName}(): boolean {
    return this.new${model.entityTypeName}Title.trim().length > 0;
  }

  get remainingCount(): number {
    return this.${model.collectionMemberName}.filter((${lowerCamelCase(model.entityTypeName)}) => !${lowerCamelCase(model.entityTypeName)}.${model.doneMemberName}).length;
  }

  get completedCount(): number {
    return this.${model.collectionMemberName}.filter((${lowerCamelCase(model.entityTypeName)}) => ${lowerCamelCase(model.entityTypeName)}.${model.doneMemberName}).length;
  }

  add${model.entityTypeName}(): false {
    const title = this.new${model.entityTypeName}Title.trim();
    if (title.length > 0) {
      this.${model.collectionMemberName}.push(new ${model.entityTypeName}(this.next${model.entityTypeName}Id++, title));
      this.new${model.entityTypeName}Title = '';
    }
    return false;
  }

  clearCompleted${model.entityTypeName}s(): void {
    for (let index = this.${model.collectionMemberName}.length - 1; index >= 0; index--) {
      if (this.${model.collectionMemberName}[index]?.${model.doneMemberName}) {
        this.${model.collectionMemberName}.splice(index, 1);
      }
    }
  }
}
`;
}

function collectionListRootTemplateSource(
  model: AppBuilderCollectionListSourceModel,
): string {
  const itemName = lowerCamelCase(model.entityTypeName);
  return `<main>
  <h1>${model.appName}</h1>

  <form submit.trigger="state.add${model.entityTypeName}()">
    <label>
      <span>New ${model.entityTypeName.toLowerCase()}</span>
      <input value.bind="state.new${model.entityTypeName}Title" autocomplete="off">
    </label>
    <button type="submit" disabled.bind="!state.canAdd${model.entityTypeName}">Add</button>
  </form>

  <p if.bind="state.${model.collectionMemberName}.length === 0">No ${model.collectionMemberName} yet.</p>

  <ul>
    <li repeat.for="${itemName} of state.${model.collectionMemberName}" class.done.bind="${itemName}.${model.doneMemberName}">
      <label>
        <input type="checkbox" checked.bind="${itemName}.${model.doneMemberName}">
        <span>\${${itemName}.${model.titleMemberName}}</span>
      </label>
      <small>\${${itemName}.statusLabel}</small>
    </li>
  </ul>

  <footer if.bind="state.${model.collectionMemberName}.length > 0">
    <span>\${state.remainingCount} remaining</span>
    <button type="button" click.trigger="state.clearCompleted${model.entityTypeName}s()" disabled.bind="state.completedCount === 0">Clear completed</button>
  </footer>
</main>
`;
}

function nextNumericId(
  records: readonly Record<string, string | number | boolean>[],
  identityMemberName: string,
): number {
  let max = 0;
  for (const record of records) {
    const value = record[identityMemberName];
    if (typeof value === 'number' && value > max) {
      max = value;
    }
  }
  return max + 1;
}

function recordLiteral(
  value: string | number | boolean | undefined,
): string {
  if (value == null) {
    return 'undefined';
  }
  if (typeof value === 'string') {
    return `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
  }
  return JSON.stringify(value);
}

function lowerCamelCase(
  value: string,
): string {
  return `${value.slice(0, 1).toLowerCase()}${value.slice(1)}`;
}

function kebabCase(
  value: string,
): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
}
