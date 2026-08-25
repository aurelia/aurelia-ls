import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { eachMapping, TraceMap } from "@jridgewell/trace-mapping";
import ts from "typescript";

import { admitSourceFile } from "../boot/boot-workspace.js";
import type { ProjectBootFrame, SourceFileAdmission } from "../boot/frames.js";
import {
  isEvaluatedProjectSource,
  type StaticProjectEvaluationResult,
} from "../evaluation/project-evaluation.js";
import { normalizeModuleKey } from "../evaluation/module-graph.js";
import { SourceFileRole, SourceLanguage } from "../kernel/address.js";
import {
  EvidenceKind,
  EvidenceRecord,
  EvidenceRole,
} from "../kernel/evidence.js";
import {
  stableKernelLocalHash,
  type EvidenceHandle,
} from "../kernel/handles.js";
import {
  KernelPublicationPlan,
  type KernelPublicationContext,
} from "../kernel/publication.js";
import {
  KernelStoreBatch,
  type KernelStore,
  type KernelStoreRecord,
} from "../kernel/store.js";
import { readClassTarget } from "../evaluation/expression-reader.js";
import { createNamedResourceDefinitionHeader } from "./named-resource-kind.js";
import {
  ResourceRecognitionObservation,
  ResourceTargetObservation,
} from "./resource-observation.js";
import type { ResourceRecognitionContext } from "./resource-recognition-context.js";
import {
  ResourceCarrierKind,
  ResourceDefinitionKind,
} from "./resource-kind.js";

interface RawSourceMap {
  readonly file?: unknown;
  readonly sourceRoot?: unknown;
  readonly sources?: unknown;
  readonly sourcesContent?: unknown;
}

interface SourceMapSource {
  readonly absolutePath: string;
  readonly packageRelativePath: string;
  readonly content: string | null;
}

interface GeneratedMetadataUse {
  readonly metadataModulePath: string;
  readonly metadataExportName: string;
  readonly decoratorHelperCall: ts.CallExpression;
}

interface GeneratedCustomElementMetadata {
  readonly name: string;
  readonly template: string;
  readonly virtualSourcePath: string;
  readonly sourceMapPath: string;
}

class PackageResourceBuildBridge {
  constructor(
    readonly sourceAdmission: SourceFileAdmission,
    readonly exportedClassName: string,
    readonly resourceName: string,
    readonly templateAdmission: SourceFileAdmission,
    readonly supportingEvidenceHandles: readonly EvidenceHandle[],
  ) {}
}

/** Exact build-generated resource facts indexed by the evaluator source they refine. */
export class PackageResourceBuildBridgeIndex {
  private readonly bySourceAdmission = new Map<
    string,
    readonly PackageResourceBuildBridge[]
  >();

  constructor(
    readonly bridges: readonly PackageResourceBuildBridge[],
    readonly templateAdmissions: readonly SourceFileAdmission[],
  ) {
    for (const bridge of bridges) {
      const existing =
        this.bySourceAdmission.get(bridge.sourceAdmission.addressHandle) ?? [];
      this.bySourceAdmission.set(bridge.sourceAdmission.addressHandle, [
        ...existing,
        bridge,
      ]);
    }
  }

  observationsForContext(
    context: ResourceRecognitionContext,
  ): readonly ResourceRecognitionObservation[] {
    const bridges =
      this.bySourceAdmission.get(context.sourceFileAddressHandle) ?? [];
    return bridges.flatMap((bridge) => {
      const targetClass = exportedClassDeclaration(
        context.sourceFile,
        bridge.exportedClassName,
      );
      if (targetClass == null) {
        return [];
      }
      const target = readClassTarget(targetClass);
      return [
        new ResourceRecognitionObservation(
          ResourceCarrierKind.Convention,
          targetClass,
          null,
          createNamedResourceDefinitionHeader(
            ResourceDefinitionKind.CustomElement,
            new ResourceTargetObservation(
              target.localName,
              target.node,
              target.declarationNode,
            ),
            bridge.resourceName,
            [],
          ),
          [],
          bridge.supportingEvidenceHandles,
        ),
      ];
    });
  }
}

/**
 * Recover build-generated custom-element identity without treating compiled layout or class names as public policy.
 *
 * A bridge is admitted only through an exact package export-condition link, explicit runtime imports, source-map-owned
 * source identity, an explicit `customElement(generatedMetadata)` use, closed generated metadata, and matching shipped
 * HTML. Any missing or ambiguous witness simply leaves the package on its existing open path.
 */
export class PackageResourceBuildBridgeMaterializer {
  materializeAndEmit(
    store: KernelStore,
    project: ProjectBootFrame,
    evaluation: StaticProjectEvaluationResult,
    publication: KernelPublicationContext,
  ): PackageResourceBuildBridgeIndex {
    const host = project.inputGeneration.host;
    const evaluatedByPackageSource = new Map<
      string,
      ReturnType<StaticProjectEvaluationResult["readEvaluatedSources"]>[number]
    >();
    for (const source of evaluation.readEvaluatedSources()) {
      if (source.packageOrigin == null) continue;
      evaluatedByPackageSource.set(
        packageSourceKey(
          source.packageOrigin.packageInstance.instanceKey,
          source.packageOrigin.packageRelativePath,
        ),
        source,
      );
    }

    const bridgeByKey = new Map<string, PackageResourceBuildBridge>();
    const conflictingBridgeKeys = new Set<string>();
    const templateAdmissionByHandle = new Map<string, SourceFileAdmission>();
    const evidenceRecords: KernelStoreRecord[] = [];
    const evidenceHandles = new Set<string>();

    for (const entrySource of evaluation.sources) {
      if (!isEvaluatedProjectSource(entrySource)) continue;
      const origin = entrySource.packageOrigin;
      if (origin == null || origin.buildLinks.length === 0) continue;
      const packageRoot = origin.packageInstance.physicalRootDir;
      for (const buildLink of origin.buildLinks) {
        const runtimeEntry = buildLink.physicalRuntimePath;
        for (const runtimeModule of readSamePackageRuntimeGraph(
          host,
          packageRoot,
          runtimeEntry,
        )) {
          const uses = readGeneratedMetadataUses(
            runtimeModule.sourceFile,
            runtimeModule.fileName,
            packageRoot,
            host,
          );
          if (uses.length !== 1) continue;
          const sourceMap = readGeneratedModuleSourceMap(
            host,
            packageRoot,
            runtimeModule.fileName,
            runtimeModule.text,
          );
          if (sourceMap == null) continue;
          const mapped = mappedSourceClassForDecoratorUse(
            sourceMap,
            uses[0]!.decoratorHelperCall,
            origin.packageInstance.instanceKey,
            evaluatedByPackageSource,
          );
          if (mapped == null) continue;
          const {
            source: authoredSource,
            evaluatedSource,
            declaration: exportedClass,
          } = mapped;
          const hostSourceText = host.readFile(authoredSource.absolutePath);
          if (
            hostSourceText == null ||
            authoredSource.content == null ||
            authoredSource.content !== hostSourceText ||
            authoredSource.content !== evaluatedSource.sourceFile.text
          )
            continue;
          if (
            !runtimeModuleExportsName(
              runtimeModule.sourceFile,
              exportedClass.name!.text,
            )
          )
            continue;

          const metadata = readGeneratedCustomElementMetadata(
            host,
            packageRoot,
            uses[0]!.metadataModulePath,
            uses[0]!.metadataExportName,
            authoredSource.packageRelativePath,
          );
          if (metadata == null) continue;
          const htmlPath = path.resolve(
            packageRoot,
            metadata.virtualSourcePath.replace(/\.\$au\.ts$/u, ".html"),
          );
          const html = host.readFile(htmlPath);
          if (html == null || html !== metadata.template) continue;

          const templateAdmission = admitSourceFile(
            publication,
            project.workspaceRootDir,
            project.rootDir,
            project.projectKey,
            {
              path: htmlPath,
              language: SourceLanguage.Html,
              role: SourceFileRole.Template,
              note: "External package template admitted through exact build-generated resource metadata.",
            },
          );
          if (templateAdmission.role !== SourceFileRole.Template) continue;
          templateAdmissionByHandle.set(
            templateAdmission.addressHandle,
            templateAdmission,
          );

          const runtimeAdmission = admitSourceFile(
            publication,
            project.workspaceRootDir,
            project.rootDir,
            project.projectKey,
            {
              path: runtimeModule.fileName,
              language: SourceLanguage.JavaScript,
              role: SourceFileRole.Generated,
              note: "Package runtime module admitted as build-transform evidence.",
            },
          );
          const metadataMapAdmission = admitSourceFile(
            publication,
            project.workspaceRootDir,
            project.rootDir,
            project.projectKey,
            {
              path: metadata.sourceMapPath,
              language: SourceLanguage.Json,
              role: SourceFileRole.Generated,
              note: "Package generated-metadata source map admitted as build-transform evidence.",
            },
          );
          const local = stableKernelLocalHash(
            JSON.stringify({
              packageInstance: origin.packageInstance.instanceKey,
              source: authoredSource.packageRelativePath,
              runtime: normalizeModuleKey(
                path.relative(packageRoot, runtimeModule.fileName),
              ),
              metadata: metadata.virtualSourcePath,
              name: metadata.name,
            }),
          );
          const runtimeEvidenceHandle = store.handles.evidence(
            `package-resource-build:${local}:runtime`,
          );
          const metadataEvidenceHandle = store.handles.evidence(
            `package-resource-build:${local}:metadata`,
          );
          retainEvidenceRecord(
            evidenceRecords,
            evidenceHandles,
            new EvidenceRecord(
              runtimeEvidenceHandle,
              EvidenceKind.Generated,
              [EvidenceRole.Declaration, EvidenceRole.TransformOutput],
              "Condition-selected package runtime output applies generated custom-element metadata to this exported class.",
              runtimeAdmission.addressHandle,
            ),
          );
          retainEvidenceRecord(
            evidenceRecords,
            evidenceHandles,
            new EvidenceRecord(
              metadataEvidenceHandle,
              EvidenceKind.Generated,
              [EvidenceRole.Declaration, EvidenceRole.TransformOutput],
              "Generated $au metadata and its source map preserve the exact custom-element name and shipped template.",
              metadataMapAdmission.addressHandle,
            ),
          );
          const bridgeKey = packageSourceKey(
            origin.packageInstance.instanceKey,
            `${authoredSource.packageRelativePath}\0${
              exportedClass.name!.text
            }`,
          );
          const bridge = new PackageResourceBuildBridge(
            evaluatedSource.admission,
            exportedClass.name!.text,
            metadata.name,
            templateAdmission,
            [
              runtimeEvidenceHandle,
              metadataEvidenceHandle,
              templateAdmission.evidenceHandle,
            ],
          );
          const existingBridge = bridgeByKey.get(bridgeKey) ?? null;
          if (conflictingBridgeKeys.has(bridgeKey)) continue;
          if (
            existingBridge != null &&
            (existingBridge.resourceName !== bridge.resourceName ||
              existingBridge.templateAdmission.path !==
                bridge.templateAdmission.path)
          ) {
            bridgeByKey.delete(bridgeKey);
            conflictingBridgeKeys.add(bridgeKey);
            continue;
          }
          if (existingBridge == null) bridgeByKey.set(bridgeKey, bridge);
        }
      }
    }

    if (evidenceRecords.length > 0) {
      publication.publish(
        new KernelPublicationPlan(
          new KernelStoreBatch(
            evidenceRecords,
            `package-resource-build:${project.projectKey}`,
          ),
        ),
      );
    }
    return new PackageResourceBuildBridgeIndex(
      [...bridgeByKey.values()],
      [...templateAdmissionByHandle.values()],
    );
  }
}

interface RuntimeModule {
  readonly fileName: string;
  readonly text: string;
  readonly sourceFile: ts.SourceFile;
}

interface GeneratedModuleSourceMap {
  readonly mapPath: string;
  readonly traceMap: TraceMap;
  readonly sources: readonly SourceMapSource[];
}

interface MappedSourceClass {
  readonly source: SourceMapSource;
  readonly evaluatedSource: ReturnType<
    StaticProjectEvaluationResult["readEvaluatedSources"]
  >[number];
  readonly declaration: ts.ClassDeclaration;
}

function readSamePackageRuntimeGraph(
  host: ProjectBootFrame["inputGeneration"]["host"],
  packageRoot: string,
  entryFile: string,
): readonly RuntimeModule[] {
  const pending = [entryFile];
  const seen = new Set<string>();
  const modules: RuntimeModule[] = [];
  while (pending.length > 0) {
    const candidate = pending.pop()!;
    const fileName = host.realpath(candidate);
    const key = normalizeHostPath(fileName);
    if (seen.has(key) || !isPathWithin(fileName, packageRoot)) continue;
    seen.add(key);
    const text = host.readFile(fileName);
    if (text == null) continue;
    const sourceFile = ts.createSourceFile(
      fileName,
      text,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.JS,
    );
    modules.push({ fileName, text, sourceFile });
    for (const specifier of staticModuleSpecifiers(sourceFile)) {
      const resolved = resolveRelativeRuntimeModule(
        host,
        packageRoot,
        fileName,
        specifier,
      );
      if (resolved != null) pending.push(resolved);
    }
  }
  return modules;
}

function staticModuleSpecifiers(sourceFile: ts.SourceFile): readonly string[] {
  return sourceFile.statements.flatMap((statement) => {
    if (
      (ts.isImportDeclaration(statement) ||
        ts.isExportDeclaration(statement)) &&
      statement.moduleSpecifier != null &&
      ts.isStringLiteralLike(statement.moduleSpecifier)
    ) {
      return [statement.moduleSpecifier.text];
    }
    return [];
  });
}

function resolveRelativeRuntimeModule(
  host: ProjectBootFrame["inputGeneration"]["host"],
  packageRoot: string,
  fromFile: string,
  specifier: string,
): string | null {
  if (!specifier.startsWith(".")) return null;
  const clean = specifier.split(/[?#]/u, 1)[0] ?? "";
  const base = path.resolve(path.dirname(fromFile), clean);
  const candidates =
    path.extname(base).length > 0
      ? [base]
      : [
          `${base}.js`,
          `${base}.mjs`,
          `${base}.cjs`,
          path.join(base, "index.js"),
        ];
  for (const candidate of candidates) {
    if (!isPathWithin(candidate, packageRoot) || !host.fileExists(candidate))
      continue;
    const physical = host.realpath(candidate);
    if (isPathWithin(physical, packageRoot)) return physical;
  }
  return null;
}

function readGeneratedMetadataUses(
  sourceFile: ts.SourceFile,
  modulePath: string,
  packageRoot: string,
  host: ProjectBootFrame["inputGeneration"]["host"],
): readonly GeneratedMetadataUse[] {
  const customElementLocals = new Set<string>();
  const metadataModulesByLocal = new Map<
    string,
    { readonly path: string; readonly exportName: string }
  >();
  for (const statement of sourceFile.statements) {
    if (
      !ts.isImportDeclaration(statement) ||
      !ts.isStringLiteralLike(statement.moduleSpecifier) ||
      statement.importClause?.namedBindings == null ||
      !ts.isNamedImports(statement.importClause.namedBindings)
    )
      continue;
    const specifier = statement.moduleSpecifier.text;
    for (const element of statement.importClause.namedBindings.elements) {
      const importedName = element.propertyName?.text ?? element.name.text;
      if (
        importedName === "customElement" &&
        (specifier === "@aurelia/runtime-html" || specifier === "aurelia")
      ) {
        customElementLocals.add(element.name.text);
      }
      if (
        importedName.endsWith("_$au_exports") &&
        /\._au\.[cm]?js$/u.test(specifier)
      ) {
        const resolved = resolveRelativeRuntimeModule(
          host,
          packageRoot,
          modulePath,
          specifier,
        );
        if (resolved != null) {
          metadataModulesByLocal.set(element.name.text, {
            path: resolved,
            exportName: importedName,
          });
        }
      }
    }
  }
  const uses: GeneratedMetadataUse[] = [];
  const visit = (node: ts.Node): void => {
    const argument = ts.isCallExpression(node) ? node.arguments[0] : undefined;
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      customElementLocals.has(node.expression.text) &&
      node.arguments.length === 1 &&
      argument != null &&
      ts.isIdentifier(argument)
    ) {
      const metadata = metadataModulesByLocal.get(argument.text) ?? null;
      const decoratorHelperCall = enclosingDecoratorHelperCall(node);
      if (metadata != null && decoratorHelperCall != null) {
        uses.push({
          metadataModulePath: metadata.path,
          metadataExportName: metadata.exportName,
          decoratorHelperCall,
        });
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return uses;
}

function enclosingDecoratorHelperCall(
  call: ts.CallExpression,
): ts.CallExpression | null {
  let current: ts.Node | undefined = call.parent;
  while (current != null && !ts.isSourceFile(current)) {
    if (
      ts.isCallExpression(current) &&
      current.arguments.some(
        (argument) => argument.kind === ts.SyntaxKind.ThisKeyword,
      ) &&
      current.arguments.some(
        (argument) => argument.pos <= call.pos && argument.end >= call.end,
      ) &&
      enclosingClassLike(current) != null
    ) {
      return current;
    }
    current = current.parent;
  }
  return null;
}

function enclosingClassLike(node: ts.Node): ts.ClassLikeDeclarationBase | null {
  let current: ts.Node | undefined = node.parent;
  while (current != null && !ts.isSourceFile(current)) {
    if (ts.isClassDeclaration(current) || ts.isClassExpression(current))
      return current;
    current = current.parent;
  }
  return null;
}

function readGeneratedCustomElementMetadata(
  host: ProjectBootFrame["inputGeneration"]["host"],
  packageRoot: string,
  metadataModulePath: string,
  metadataExportName: string,
  componentSourcePath: string,
): GeneratedCustomElementMetadata | null {
  const text = host.readFile(metadataModulePath);
  if (text == null) return null;
  const runtimeSourceFile = ts.createSourceFile(
    metadataModulePath,
    text,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.JS,
  );
  if (!generatedNamespaceExportIsExact(runtimeSourceFile, metadataExportName))
    return null;
  const sourceMap = readGeneratedModuleSourceMap(
    host,
    packageRoot,
    metadataModulePath,
    text,
  );
  if (sourceMap == null) return null;
  const virtualSources = sourceMap.sources.filter((source) =>
    source.packageRelativePath.endsWith(".$au.ts"),
  );
  if (virtualSources.length !== 1 || virtualSources[0]!.content == null)
    return null;
  const virtual = virtualSources[0]!;
  if (
    virtual.packageRelativePath.replace(/\.\$au\.ts$/u, ".ts") !==
    componentSourcePath
  ) {
    return null;
  }
  const sourceFile = ts.createSourceFile(
    virtual.absolutePath,
    virtual.content!,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const name = readExportedStringConstant(sourceFile, "name");
  const template = readExportedStringConstant(sourceFile, "template");
  const dependencies = readExportedVariableInitializer(
    sourceFile,
    "dependencies",
  );
  const bindables = readExportedVariableInitializer(sourceFile, "bindables");
  if (
    !generatedVirtualMetadataSurfaceIsExact(sourceFile) ||
    name == null ||
    template == null ||
    dependencies == null ||
    !ts.isArrayLiteralExpression(dependencies) ||
    dependencies.elements.length !== 0 ||
    bindables == null ||
    !ts.isObjectLiteralExpression(bindables) ||
    bindables.properties.length !== 0
  ) {
    return null;
  }
  return {
    name,
    template,
    virtualSourcePath: virtual.packageRelativePath,
    sourceMapPath: sourceMap.mapPath,
  };
}

const generatedMetadataFieldNames = [
  "bindables",
  "default",
  "dependencies",
  "name",
  "register",
  "template",
] as const;

function generatedNamespaceExportIsExact(
  sourceFile: ts.SourceFile,
  metadataExportName: string,
): boolean {
  if (!metadataExportName.endsWith("_$au_exports")) return false;
  const exportLocals = new Map<string, string>();
  const exportAllHelpers = new Set<string>();
  for (const statement of sourceFile.statements) {
    if (
      ts.isImportDeclaration(statement) &&
      ts.isStringLiteralLike(statement.moduleSpecifier) &&
      statement.moduleSpecifier.text.startsWith(".") &&
      statement.importClause?.namedBindings != null &&
      ts.isNamedImports(statement.importClause.namedBindings)
    ) {
      for (const element of statement.importClause.namedBindings.elements) {
        if (
          (element.propertyName?.text ?? element.name.text) === "__exportAll"
        ) {
          exportAllHelpers.add(element.name.text);
        }
      }
    }
    if (
      ts.isExportDeclaration(statement) &&
      statement.moduleSpecifier == null &&
      statement.exportClause != null &&
      ts.isNamedExports(statement.exportClause)
    ) {
      for (const element of statement.exportClause.elements) {
        exportLocals.set(
          element.name.text,
          element.propertyName?.text ?? element.name.text,
        );
      }
    }
  }
  const expectedExports = new Set<string>([
    ...generatedMetadataFieldNames,
    metadataExportName,
  ]);
  if (
    exportLocals.size !== expectedExports.size ||
    [...expectedExports].some((name) => !exportLocals.has(name))
  )
    return false;
  const wrapperLocal = exportLocals.get(metadataExportName)!;
  const initializer = variableInitializer(sourceFile, wrapperLocal);
  const wrapper =
    initializer != null && ts.isCallExpression(initializer)
      ? initializer.arguments[0]
      : undefined;
  if (
    initializer == null ||
    !ts.isCallExpression(initializer) ||
    !ts.isIdentifier(initializer.expression) ||
    !exportAllHelpers.has(initializer.expression.text) ||
    initializer.arguments.length !== 1 ||
    wrapper == null ||
    !ts.isObjectLiteralExpression(wrapper)
  )
    return false;
  const wrapperTargets = new Map<string, string>();
  for (const property of wrapper.properties) {
    if (
      !ts.isPropertyAssignment(property) ||
      !ts.isIdentifier(property.name) ||
      !ts.isArrowFunction(property.initializer) ||
      !ts.isIdentifier(property.initializer.body)
    )
      return false;
    wrapperTargets.set(property.name.text, property.initializer.body.text);
  }
  return (
    wrapperTargets.size === generatedMetadataFieldNames.length &&
    generatedMetadataFieldNames.every(
      (name) => wrapperTargets.get(name) === exportLocals.get(name),
    )
  );
}

function generatedVirtualMetadataSurfaceIsExact(
  sourceFile: ts.SourceFile,
): boolean {
  const exported = new Set<string>();
  let defaultTarget: string | null = null;
  for (const statement of sourceFile.statements) {
    if (ts.isVariableStatement(statement) && hasExportModifier(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        if (ts.isIdentifier(declaration.name))
          exported.add(declaration.name.text);
      }
      continue;
    }
    if (
      ts.isFunctionDeclaration(statement) &&
      statement.name != null &&
      hasExportModifier(statement)
    ) {
      exported.add(statement.name.text);
      continue;
    }
    if (
      ts.isExportAssignment(statement) &&
      !statement.isExportEquals &&
      ts.isIdentifier(statement.expression)
    ) {
      exported.add("default");
      defaultTarget = statement.expression.text;
    }
  }
  return (
    exported.size === generatedMetadataFieldNames.length &&
    generatedMetadataFieldNames.every((name) => exported.has(name)) &&
    defaultTarget === "template"
  );
}

function variableInitializer(
  sourceFile: ts.SourceFile,
  name: string,
): ts.Expression | null {
  for (const statement of sourceFile.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    for (const declaration of statement.declarationList.declarations) {
      if (ts.isIdentifier(declaration.name) && declaration.name.text === name) {
        return declaration.initializer ?? null;
      }
    }
  }
  return null;
}

function readGeneratedModuleSourceMap(
  host: ProjectBootFrame["inputGeneration"]["host"],
  packageRoot: string,
  generatedPath: string,
  generatedText: string,
): GeneratedModuleSourceMap | null {
  const match = /\/\/[#@]\s*sourceMappingURL=([^\s]+)\s*$/mu.exec(
    generatedText,
  );
  const specifier = match?.[1] ?? null;
  if (
    specifier == null ||
    specifier.startsWith("data:") ||
    /^(?:[a-z]+:|\/)/iu.test(specifier)
  ) {
    return null;
  }
  const mapCandidate = path.resolve(path.dirname(generatedPath), specifier);
  if (
    !isPathWithin(mapCandidate, packageRoot) ||
    !host.fileExists(mapCandidate)
  )
    return null;
  const mapPath = host.realpath(mapCandidate);
  if (!isPathWithin(mapPath, packageRoot)) return null;
  const text = host.readFile(mapPath);
  if (text == null) return null;
  let raw: RawSourceMap;
  try {
    raw = JSON.parse(text) as RawSourceMap;
  } catch {
    return null;
  }
  if (
    typeof raw.file !== "string" ||
    /^(?:[a-z]+:|\/)/iu.test(raw.file) ||
    path.isAbsolute(raw.file) ||
    normalizeHostPath(path.resolve(path.dirname(mapPath), raw.file)) !==
      normalizeHostPath(generatedPath)
  ) {
    return null;
  }
  const rawSources = raw.sources;
  if (
    !Array.isArray(rawSources) ||
    !rawSources.every((value) => typeof value === "string")
  ) {
    return null;
  }
  const contents: readonly unknown[] = Array.isArray(raw.sourcesContent)
    ? raw.sourcesContent
    : [];
  const sourceRoot = typeof raw.sourceRoot === "string" ? raw.sourceRoot : "";
  if (/^(?:[a-z]+:|\/)/iu.test(sourceRoot) || path.isAbsolute(sourceRoot))
    return null;
  const sources: SourceMapSource[] = [];
  for (let index = 0; index < rawSources.length; index++) {
    const source = rawSources[index]!;
    if (/^(?:[a-z]+:|\/)/iu.test(source)) return null;
    const absolutePath = path.resolve(
      path.dirname(mapPath),
      sourceRoot,
      source,
    );
    if (!isPathWithin(absolutePath, packageRoot)) return null;
    const content = contents[index];
    if (content != null && typeof content !== "string") return null;
    sources.push({
      absolutePath,
      packageRelativePath: normalizeModuleKey(
        path.relative(packageRoot, absolutePath),
      ),
      content: typeof content === "string" ? content : null,
    });
  }
  let traceMap: TraceMap;
  try {
    traceMap = new TraceMap(text, pathToFileURL(mapPath).href);
    eachMapping(traceMap, () => {});
  } catch {
    return null;
  }
  return { mapPath, traceMap, sources };
}

function mappedSourceClassForDecoratorUse(
  sourceMap: GeneratedModuleSourceMap,
  helperCall: ts.CallExpression,
  packageInstanceKey: string,
  evaluatedByPackageSource: ReadonlyMap<
    string,
    ReturnType<StaticProjectEvaluationResult["readEvaluatedSources"]>[number]
  >,
): MappedSourceClass | null {
  const generatedSource = helperCall.getSourceFile();
  const start = generatedSource.getLineAndCharacterOfPosition(
    helperCall.getStart(generatedSource),
  );
  const end = generatedSource.getLineAndCharacterOfPosition(helperCall.end);
  const sourcesByPath = new Map(
    sourceMap.sources.map((source) => [
      normalizeHostPath(source.absolutePath),
      source,
    ]),
  );
  const candidates = new Map<string, MappedSourceClass>();
  let invalid = false;
  try {
    eachMapping(sourceMap.traceMap, (mapping) => {
      if (
        invalid ||
        !generatedPositionWithin(
          mapping.generatedLine - 1,
          mapping.generatedColumn,
          start,
          end,
        )
      ) {
        return;
      }
      if (
        mapping.source == null ||
        mapping.originalLine == null ||
        mapping.originalColumn == null
      ) {
        return;
      }
      const mappedPath = sourceMapMappingHostPath(mapping.source);
      const source =
        mappedPath == null
          ? null
          : sourcesByPath.get(normalizeHostPath(mappedPath)) ?? null;
      if (
        source == null ||
        !source.packageRelativePath.endsWith(".ts") ||
        source.packageRelativePath.endsWith(".$au.ts")
      ) {
        invalid = true;
        return;
      }
      const evaluatedSource =
        evaluatedByPackageSource.get(
          packageSourceKey(packageInstanceKey, source.packageRelativePath),
        ) ?? null;
      if (evaluatedSource == null) {
        invalid = true;
        return;
      }
      const line = mapping.originalLine - 1;
      if (
        line < 0 ||
        line >= evaluatedSource.sourceFile.getLineStarts().length
      ) {
        invalid = true;
        return;
      }
      const offset = evaluatedSource.sourceFile.getPositionOfLineAndCharacter(
        line,
        mapping.originalColumn,
      );
      const declaration = topLevelExportedClassContaining(
        evaluatedSource.sourceFile,
        offset,
      );
      if (declaration?.name == null) return;
      const key = `${evaluatedSource.admission.addressHandle}\0${declaration.pos}\0${declaration.end}`;
      candidates.set(key, { source, evaluatedSource, declaration });
    });
  } catch {
    return null;
  }
  return !invalid && candidates.size === 1
    ? [...candidates.values()][0]!
    : null;
}

function generatedPositionWithin(
  line: number,
  column: number,
  start: ts.LineAndCharacter,
  end: ts.LineAndCharacter,
): boolean {
  return (
    (line > start.line || (line === start.line && column >= start.character)) &&
    (line < end.line || (line === end.line && column < end.character))
  );
}

function sourceMapMappingHostPath(source: string): string | null {
  try {
    return source.startsWith("file:")
      ? fileURLToPath(source)
      : path.resolve(source);
  } catch {
    return null;
  }
}

function topLevelExportedClassContaining(
  sourceFile: ts.SourceFile,
  offset: number,
): ts.ClassDeclaration | null {
  const matches = exportedClassDeclarations(sourceFile).filter(
    (declaration) =>
      declaration.getStart(sourceFile) <= offset && offset < declaration.end,
  );
  return matches.length === 1 ? matches[0]! : null;
}

function readExportedStringConstant(
  sourceFile: ts.SourceFile,
  name: string,
): string | null {
  const initializer = readExportedVariableInitializer(sourceFile, name);
  return initializer != null && ts.isStringLiteralLike(initializer)
    ? initializer.text
    : null;
}

function readExportedVariableInitializer(
  sourceFile: ts.SourceFile,
  name: string,
): ts.Expression | null {
  for (const statement of sourceFile.statements) {
    if (!ts.isVariableStatement(statement) || !hasExportModifier(statement))
      continue;
    for (const declaration of statement.declarationList.declarations) {
      if (ts.isIdentifier(declaration.name) && declaration.name.text === name) {
        return declaration.initializer ?? null;
      }
    }
  }
  return null;
}

function exportedClassDeclarations(
  sourceFile: ts.SourceFile,
): readonly ts.ClassDeclaration[] {
  return sourceFile.statements.filter(
    (statement): statement is ts.ClassDeclaration =>
      ts.isClassDeclaration(statement) &&
      statement.name != null &&
      hasExportModifier(statement),
  );
}

function exportedClassDeclaration(
  sourceFile: ts.SourceFile,
  name: string,
): ts.ClassDeclaration | null {
  const matches = exportedClassDeclarations(sourceFile).filter(
    (declaration) => declaration.name!.text === name,
  );
  return matches.length === 1 ? matches[0]! : null;
}

function hasExportModifier(node: ts.Node): boolean {
  return (
    ts.canHaveModifiers(node) &&
    (ts.getModifiers(node) ?? []).some(
      (modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword,
    )
  );
}

function runtimeModuleExportsName(
  sourceFile: ts.SourceFile,
  name: string,
): boolean {
  return sourceFile.statements.some(
    (statement) =>
      ts.isExportDeclaration(statement) &&
      statement.exportClause != null &&
      ts.isNamedExports(statement.exportClause) &&
      statement.exportClause.elements.some(
        (element) => element.name.text === name,
      ),
  );
}

function packageSourceKey(
  packageInstanceKey: string,
  relativePath: string,
): string {
  return `${packageInstanceKey}\0${normalizeModuleKey(relativePath)}`;
}

function retainEvidenceRecord(
  records: KernelStoreRecord[],
  handles: Set<string>,
  record: EvidenceRecord,
): void {
  if (handles.has(record.handle)) return;
  handles.add(record.handle);
  records.push(record);
}

function isPathWithin(fileName: string, rootDir: string): boolean {
  const relative = path.relative(path.resolve(rootDir), path.resolve(fileName));
  return (
    relative === "" ||
    (!relative.startsWith("..") && !path.isAbsolute(relative))
  );
}

function normalizeHostPath(fileName: string): string {
  const normalized = normalizeModuleKey(path.resolve(fileName));
  return ts.sys.useCaseSensitiveFileNames
    ? normalized
    : normalized.toLowerCase();
}
