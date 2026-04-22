import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

import {
  guessScriptKind,
  readPropertyName,
  readStringLiteralValue,
  unwrapExpression,
} from '../analysis/index.js';
import {
  AureliaConventionsActivation,
  type AureliaConventionsDriverKind,
  BuildToolActivation,
  type BuildToolKind,
  type ToolingActivationStatusKind,
  ToolingEnvironment,
  ToolingEvidence,
} from './tooling-environment.js';

export interface ToolingEnvironmentScannerOptions {
  readonly rootDir: string;
  readonly conventionsActive?: boolean | null;
}

export interface ToolingEnvironmentScannerState {
  readonly rootDir: string;
  readonly parsedConfigFileCount: number;
}

interface PackageJsonRecord {
  readonly dependencies: Readonly<Record<string, string>>;
  readonly devDependencies: Readonly<Record<string, string>>;
}

interface BuildToolDetection {
  readonly activation: BuildToolActivation;
  readonly configPath: string | null;
}

interface ConfigBodyConventionsResult {
  readonly status: ToolingActivationStatusKind;
  readonly driver: AureliaConventionsDriverKind;
  readonly evidence: readonly ToolingEvidence[];
  readonly note: string;
}

interface ConventionsUsageResolution {
  readonly status: ToolingActivationStatusKind;
  readonly note: string;
}

export class ToolingEnvironmentScanner {
  private readonly rootDirValue: string;
  private readonly explicitConventionsActive: boolean | null;
  private readonly parsedConfigFiles = new Map<string, ts.SourceFile | null>();

  constructor(
    options: ToolingEnvironmentScannerOptions,
  ) {
    this.rootDirValue = options.rootDir;
    this.explicitConventionsActive = options.conventionsActive ?? null;
  }

  scan(): ToolingEnvironment {
    const packageJson = readPackageJson(this.rootDirValue);
    const buildTool = readBuildToolDetection(this.rootDirValue, packageJson);
    const conventions = readConventionsActivation(
      this.rootDirValue,
      packageJson,
      buildTool,
      this.explicitConventionsActive,
      (filePath) => this.readConfigSourceFile(filePath),
    );

    return new ToolingEnvironment(
      this.rootDirValue,
      buildTool.activation,
      conventions,
    );
  }

  inspectState(): ToolingEnvironmentScannerState {
    return {
      rootDir: this.rootDirValue,
      parsedConfigFileCount: this.parsedConfigFiles.size,
    };
  }

  private readConfigSourceFile(
    filePath: string,
  ): ts.SourceFile | null {
    if (this.parsedConfigFiles.has(filePath)) {
      return this.parsedConfigFiles.get(filePath) ?? null;
    }

    try {
      const text = fs.readFileSync(filePath, 'utf8');
      const parsed = ts.createSourceFile(
        filePath,
        text,
        ts.ScriptTarget.Latest,
        true,
        guessScriptKind(filePath),
      );
      this.parsedConfigFiles.set(filePath, parsed);
      return parsed;
    } catch {
      this.parsedConfigFiles.set(filePath, null);
      return null;
    }
  }
}

// NOTE: this scanner now closes Vite and webpack conventions activation only
// from bounded config-body shapes that correspond to real Aurelia driver usage.
// More indirect config law still stays open rather than being guessed.

function readBuildToolDetection(
  rootDir: string,
  packageJson: PackageJsonRecord | null,
): BuildToolDetection {
  const detected = readDetectedBuildTool(rootDir, packageJson);
  if (detected != null) {
    return detected;
  }

  return {
    activation: new BuildToolActivation(
      null,
      'open',
      packageJson == null
        ? [
          new ToolingEvidence(
            'missing-package-json',
            path.join(rootDir, 'package.json'),
            'No package.json was available for bounded build-tool detection.',
          ),
        ]
        : [
          new ToolingEvidence(
            'bounded-scan-open',
            rootDir,
            'No known Aurelia-relevant build-tool configuration file or package dependency closed under the current bounded scanner.',
          ),
        ],
      'Build tool stayed open under the bounded tooling scanner.',
    ),
    configPath: null,
  };
}

function readConventionsActivation(
  rootDir: string,
  packageJson: PackageJsonRecord | null,
  buildTool: BuildToolDetection,
  explicitConventionsActive: boolean | null,
  readConfigSourceFile: (filePath: string) => ts.SourceFile | null,
): AureliaConventionsActivation {
  if (explicitConventionsActive === true) {
    return new AureliaConventionsActivation(
      'active',
      null,
      [
        new ToolingEvidence(
          'explicit-option',
          rootDir,
          'Conventions activation was forced active through explicit project options.',
        ),
      ],
      'Conventions are explicitly active for this project-owned tooling environment.',
    );
  }

  if (explicitConventionsActive === false) {
    return new AureliaConventionsActivation(
      'inactive',
      null,
      [
        new ToolingEvidence(
          'explicit-option',
          rootDir,
          'Conventions activation was forced inactive through explicit project options.',
        ),
      ],
      'Conventions are explicitly inactive for this project-owned tooling environment.',
    );
  }

  const configBodyResult = readConfigBodyConventionsActivation(
    buildTool,
    readConfigSourceFile,
  );
  if (configBodyResult != null) {
    return new AureliaConventionsActivation(
      configBodyResult.status,
      configBodyResult.driver,
      configBodyResult.evidence,
      configBodyResult.note,
    );
  }

  const driver = readDetectedConventionsDriver(rootDir, packageJson);
  if (driver == null) {
    return new AureliaConventionsActivation(
      'open',
      null,
      packageJson == null
        ? [
          new ToolingEvidence(
            'missing-package-json',
            path.join(rootDir, 'package.json'),
            'No package.json was available for bounded conventions-driver detection.',
          ),
        ]
        : [
          new ToolingEvidence(
            'bounded-scan-open',
            rootDir,
            'No Aurelia conventions driver package or verified config-body usage closed under the current tooling scanner.',
          ),
        ],
      'Conventions activation stayed open because the scanner has not yet proven an Aurelia preprocessing driver for this project.',
    );
  }

  return new AureliaConventionsActivation(
    'open',
    driver.driver,
    [
      driver.evidence,
      ...(buildTool.activation.evidence.length === 0 ? [] : [buildTool.activation.evidence[0]!]),
    ],
    `Detected ${driver.driver} as a potential Aurelia conventions driver, but activation remains open until config-body usage is proven for the owning build tool.`,
  );
}

function readConfigBodyConventionsActivation(
  buildTool: BuildToolDetection,
  readConfigSourceFile: (filePath: string) => ts.SourceFile | null,
): ConfigBodyConventionsResult | null {
  const configPath = buildTool.configPath;
  if (configPath == null || buildTool.activation.kind == null) {
    return null;
  }

  const sourceFile = readConfigSourceFile(configPath);
  if (sourceFile == null) {
    return null;
  }

  switch (buildTool.activation.kind) {
    case 'vite':
      return readViteConventionsFromConfig(configPath, sourceFile);
    case 'webpack':
      return readWebpackConventionsFromConfig(configPath, sourceFile);
    case 'parcel':
      // TODO: parcel-transformer, plugin-gulp, ts-jest, and babel-jest want
      // their own config/test-runner ingress slices. Do not treat build-tool
      // presence alone as proof that Aurelia conventions are active there.
      return null;
  }
}

function readViteConventionsFromConfig(
  configPath: string,
  sourceFile: ts.SourceFile,
): ConfigBodyConventionsResult | null {
  const pluginNames = readImportedPackageLocalNames(sourceFile, '@aurelia/vite-plugin');
  if (pluginNames.size === 0) {
    return null;
  }

  const resolutions: ConventionsUsageResolution[] = [];
  for (const configObject of readExportedConfigObjects(sourceFile)) {
    const plugins = readObjectLiteralPropertyInitializer(configObject, 'plugins');
    const pluginArray = plugins != null && ts.isArrayLiteralExpression(unwrapExpression(plugins))
      ? unwrapExpression(plugins) as ts.ArrayLiteralExpression
      : null;
    if (pluginArray == null) {
      continue;
    }

    for (const element of pluginArray.elements) {
      const resolution = readVitePluginElementResolution(element, pluginNames);
      if (resolution != null) {
        resolutions.push(resolution);
      }
    }
  }

  if (resolutions.length === 0) {
    return {
      status: 'open',
      driver: 'vite-plugin',
      evidence: [
        new ToolingEvidence(
          'bounded-scan-open',
          configPath,
          'The config imports @aurelia/vite-plugin, but the current bounded scanner did not prove a direct plugin call inside a plugins array.',
        ),
      ],
      note: 'Conventions stayed open because the Vite config referenced the Aurelia plugin package without closing direct plugin usage under the bounded scanner.',
    };
  }

  const aggregate = summarizeUsageResolutions(resolutions);
  return {
    status: aggregate.status,
    driver: 'vite-plugin',
    evidence: [
      new ToolingEvidence(
        'config-body',
        configPath,
        aggregate.note,
      ),
    ],
    note: aggregate.note,
  };
}

function readWebpackConventionsFromConfig(
  configPath: string,
  sourceFile: ts.SourceFile,
): ConfigBodyConventionsResult | null {
  const loaderNames = readImportedPackageLocalNames(sourceFile, '@aurelia/webpack-loader');
  const resolutions: ConventionsUsageResolution[] = [];

  for (const configObject of readExportedConfigObjects(sourceFile)) {
    const moduleLiteral = readObjectLiteralPropertyInitializer(configObject, 'module');
    const rulesExpression = moduleLiteral != null && ts.isObjectLiteralExpression(unwrapExpression(moduleLiteral))
      ? readObjectLiteralPropertyInitializer(unwrapExpression(moduleLiteral) as ts.ObjectLiteralExpression, 'rules')
      : null;
    const rulesArray = rulesExpression != null && ts.isArrayLiteralExpression(unwrapExpression(rulesExpression))
      ? unwrapExpression(rulesExpression) as ts.ArrayLiteralExpression
      : null;
    if (rulesArray == null) {
      continue;
    }

    for (const ruleElement of rulesArray.elements) {
      const rule = ts.isObjectLiteralExpression(unwrapExpression(ruleElement))
        ? unwrapExpression(ruleElement) as ts.ObjectLiteralExpression
        : null;
      if (rule == null) {
        continue;
      }

      const directLoader = readWebpackLoaderResolution(
        readObjectLiteralPropertyInitializer(rule, 'loader'),
        null,
        loaderNames,
      );
      if (directLoader != null) {
        resolutions.push(directLoader);
      }

      const useExpression = readObjectLiteralPropertyInitializer(rule, 'use');
      if (useExpression == null) {
        continue;
      }

      for (const resolution of readWebpackUseResolutions(useExpression, loaderNames)) {
        resolutions.push(resolution);
      }
    }
  }

  if (resolutions.length === 0) {
    return {
      status: 'open',
      driver: 'webpack-loader',
      evidence: [
        new ToolingEvidence(
          'bounded-scan-open',
          configPath,
          'The config did not close direct @aurelia/webpack-loader rule usage under the current bounded scanner.',
        ),
      ],
      note: 'Conventions stayed open because the webpack config did not close direct Aurelia loader usage under the bounded scanner.',
    };
  }

  const aggregate = summarizeUsageResolutions(resolutions);
  return {
    status: aggregate.status,
    driver: 'webpack-loader',
    evidence: [
      new ToolingEvidence(
        'config-body',
        configPath,
        aggregate.note,
      ),
    ],
    note: aggregate.note,
  };
}

function readVitePluginElementResolution(
  element: ts.Expression | ts.SpreadElement,
  pluginNames: ReadonlySet<string>,
): ConventionsUsageResolution | null {
  const current = unwrapExpression(ts.isSpreadElement(element) ? element.expression : element);
  if (!ts.isCallExpression(current)) {
    return null;
  }

  const callee = unwrapExpression(current.expression);
  if (!ts.isIdentifier(callee) || !pluginNames.has(callee.text)) {
    return null;
  }

  return readEnableConventionsCallResolution(
    current,
    'Aurelia Vite plugin usage',
  );
}

function readWebpackUseResolutions(
  expression: ts.Expression,
  loaderNames: ReadonlySet<string>,
): readonly ConventionsUsageResolution[] {
  const current = unwrapExpression(expression);
  if (ts.isArrayLiteralExpression(current)) {
    return current.elements.flatMap((element) => {
      const resolution = readWebpackUseEntryResolution(element, loaderNames);
      return resolution == null ? [] : [resolution];
    });
  }

  const resolution = readWebpackUseEntryResolution(current, loaderNames);
  return resolution == null ? [] : [resolution];
}

function readWebpackUseEntryResolution(
  expression: ts.Expression | ts.SpreadElement,
  loaderNames: ReadonlySet<string>,
): ConventionsUsageResolution | null {
  const current = unwrapExpression(ts.isSpreadElement(expression) ? expression.expression : expression);
  if (ts.isObjectLiteralExpression(current)) {
    return readWebpackLoaderResolution(
      readObjectLiteralPropertyInitializer(current, 'loader'),
      readObjectLiteralPropertyInitializer(current, 'options'),
      loaderNames,
    );
  }

  return readWebpackLoaderResolution(current, null, loaderNames);
}

function readWebpackLoaderResolution(
  loaderExpression: ts.Expression | null,
  optionsExpression: ts.Expression | null,
  loaderNames: ReadonlySet<string>,
): ConventionsUsageResolution | null {
  if (loaderExpression == null || !isWebpackLoaderReference(loaderExpression, loaderNames)) {
    return null;
  }

  if (optionsExpression == null) {
    return {
      status: 'active',
      note: 'Aurelia webpack-loader usage closed from config-body analysis with default plugin-conventions enableConventions=true.',
    };
  }

  const current = unwrapExpression(optionsExpression);
  if (!ts.isObjectLiteralExpression(current)) {
    return {
      status: 'open',
      note: 'Aurelia webpack-loader usage was proven, but its options surface did not close to an object literal under the bounded scanner.',
    };
  }

  const enableConventions = readBooleanObjectLiteralProperty(current, 'enableConventions');
  if (enableConventions === true) {
    return {
      status: 'active',
      note: 'Aurelia webpack-loader usage closed from config-body analysis with explicit enableConventions=true.',
    };
  }
  if (enableConventions === false) {
    return {
      status: 'inactive',
      note: 'Aurelia webpack-loader usage closed from config-body analysis with explicit enableConventions=false.',
    };
  }

  if (hasObjectLiteralProperty(current, 'enableConventions')) {
    return {
      status: 'open',
      note: 'Aurelia webpack-loader usage was proven, but enableConventions did not close to a boolean literal under the bounded scanner.',
    };
  }

  return {
    status: 'active',
    note: 'Aurelia webpack-loader usage closed from config-body analysis with default plugin-conventions enableConventions=true.',
  };
}

function readEnableConventionsCallResolution(
  call: ts.CallExpression,
  ownerLabel: string,
): ConventionsUsageResolution {
  const firstArgument = call.arguments[0] ?? null;
  if (firstArgument == null) {
    return {
      status: 'active',
      note: `${ownerLabel} closed from config-body analysis with default plugin-conventions enableConventions=true.`,
    };
  }

  const current = unwrapExpression(firstArgument);
  if (!ts.isObjectLiteralExpression(current)) {
    return {
      status: 'open',
      note: `${ownerLabel} was proven, but its options argument did not close to an object literal under the bounded scanner.`,
    };
  }

  const enableConventions = readBooleanObjectLiteralProperty(current, 'enableConventions');
  if (enableConventions === true) {
    return {
      status: 'active',
      note: `${ownerLabel} closed from config-body analysis with explicit enableConventions=true.`,
    };
  }
  if (enableConventions === false) {
    return {
      status: 'inactive',
      note: `${ownerLabel} closed from config-body analysis with explicit enableConventions=false.`,
    };
  }

  if (hasObjectLiteralProperty(current, 'enableConventions')) {
    return {
      status: 'open',
      note: `${ownerLabel} was proven, but enableConventions did not close to a boolean literal under the bounded scanner.`,
    };
  }

  return {
    status: 'active',
    note: `${ownerLabel} closed from config-body analysis with default plugin-conventions enableConventions=true.`,
  };
}

function summarizeUsageResolutions(
  resolutions: readonly ConventionsUsageResolution[],
): ConventionsUsageResolution {
  const hasActive = resolutions.some((current) => current.status === 'active');
  const hasOpen = resolutions.some((current) => current.status === 'open');
  const hasInactive = resolutions.some((current) => current.status === 'inactive');

  if (hasActive && hasInactive) {
    return {
      status: 'active',
      note: 'Config-body analysis found mixed Aurelia preprocessing entries; at least one explicitly or implicitly enables conventions, so conventions stay active overall.',
    };
  }

  if (hasActive) {
    return {
      status: 'active',
      note: resolutions.find((current) => current.status === 'active')?.note
        ?? 'Config-body analysis proved Aurelia preprocessing with conventions active.',
    };
  }

  if (hasOpen) {
    return {
      status: 'open',
      note: resolutions.find((current) => current.status === 'open')?.note
        ?? 'Config-body analysis proved an Aurelia preprocessing surface but left enableConventions open.',
    };
  }

  if (hasInactive) {
    return {
      status: 'inactive',
      note: resolutions.find((current) => current.status === 'inactive')?.note
        ?? 'Config-body analysis proved Aurelia preprocessing with conventions inactive.',
    };
  }

  return {
    status: 'open',
    note: 'Config-body analysis did not close Aurelia preprocessing usage.',
  };
}

function readExportedConfigObjects(
  sourceFile: ts.SourceFile,
): readonly ts.ObjectLiteralExpression[] {
  const result: ts.ObjectLiteralExpression[] = [];

  for (const statement of sourceFile.statements) {
    if (ts.isExportAssignment(statement)) {
      result.push(...readConfigObjectsFromExpression(statement.expression));
      continue;
    }

    if (ts.isFunctionDeclaration(statement) && hasExportDefaultModifier(statement) && statement.body != null) {
      result.push(...readConfigObjectsFromFunctionBody(statement.body));
      continue;
    }

    if (!ts.isExpressionStatement(statement) || !ts.isBinaryExpression(statement.expression)) {
      continue;
    }

    const expression = statement.expression;
    if (expression.operatorToken.kind !== ts.SyntaxKind.EqualsToken) {
      continue;
    }

    if (isModuleExportsReference(expression.left)) {
      result.push(...readConfigObjectsFromExpression(expression.right));
    }
  }

  return dedupeConfigObjects(result);
}

function readConfigObjectsFromExpression(
  expression: ts.Expression,
): readonly ts.ObjectLiteralExpression[] {
  const current = unwrapExpression(expression);
  if (ts.isObjectLiteralExpression(current)) {
    return [current];
  }

  if (ts.isCallExpression(current)) {
    return current.arguments.flatMap((currentArgument) => readConfigObjectsFromExpression(currentArgument));
  }

  if (ts.isArrowFunction(current) || ts.isFunctionExpression(current)) {
    return readConfigObjectsFromFunction(current);
  }

  // TODO: config indirection through identifiers/imported helpers stays open
  // for now. The bounded scanner only closes direct object/call/function
  // shapes so it can prove usage without inventing evaluation semantics.
  return [];
}

function readConfigObjectsFromFunction(
  expression: ts.ArrowFunction | ts.FunctionExpression,
): readonly ts.ObjectLiteralExpression[] {
  if (ts.isObjectLiteralExpression(expression.body)) {
    return [expression.body];
  }

  if (ts.isBlock(expression.body)) {
    return readConfigObjectsFromFunctionBody(expression.body);
  }

  return [];
}

function readConfigObjectsFromFunctionBody(
  body: ts.Block,
): readonly ts.ObjectLiteralExpression[] {
  const result: ts.ObjectLiteralExpression[] = [];
  for (const statement of body.statements) {
    if (ts.isReturnStatement(statement) && statement.expression != null) {
      result.push(...readConfigObjectsFromExpression(statement.expression));
    }
  }
  return result;
}

function readImportedPackageLocalNames(
  sourceFile: ts.SourceFile,
  packageName: string,
): ReadonlySet<string> {
  const names = new Set<string>();

  for (const statement of sourceFile.statements) {
    if (ts.isImportDeclaration(statement) && readStringLiteralValue(statement.moduleSpecifier) === packageName) {
      const clause = statement.importClause;
      if (clause?.name != null) {
        names.add(clause.name.text);
      }

      const bindings = clause?.namedBindings;
      if (bindings != null && ts.isNamespaceImport(bindings)) {
        names.add(bindings.name.text);
      } else if (bindings != null && ts.isNamedImports(bindings)) {
        for (const element of bindings.elements) {
          names.add(element.name.text);
        }
      }
    }

    if (!ts.isVariableStatement(statement)) {
      continue;
    }

    for (const declaration of statement.declarationList.declarations) {
      if (!ts.isIdentifier(declaration.name) || declaration.initializer == null) {
        continue;
      }

      const initializer = unwrapExpression(declaration.initializer);
      if (
        ts.isCallExpression(initializer)
        && ts.isIdentifier(initializer.expression)
        && initializer.expression.text === 'require'
        && readStringLiteralValue(initializer.arguments[0] ?? null) === packageName
      ) {
        names.add(declaration.name.text);
      }
    }
  }

  return names;
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

function hasExportDefaultModifier(
  statement: ts.Node,
): boolean {
  if (!ts.canHaveModifiers(statement)) {
    return false;
  }

  const modifiers = ts.getModifiers(statement) ?? [];
  const hasExport = modifiers.some((current) => current.kind === ts.SyntaxKind.ExportKeyword);
  const hasDefault = modifiers.some((current) => current.kind === ts.SyntaxKind.DefaultKeyword);
  return hasExport && hasDefault;
}

function hasObjectLiteralProperty(
  literal: ts.ObjectLiteralExpression,
  propertyName: string,
): boolean {
  return readObjectLiteralPropertyInitializer(literal, propertyName) != null;
}

function readBooleanObjectLiteralProperty(
  literal: ts.ObjectLiteralExpression,
  propertyName: string,
): boolean | null {
  const initializer = readObjectLiteralPropertyInitializer(literal, propertyName);
  if (initializer == null) {
    return null;
  }

  const current = unwrapExpression(initializer);
  return current.kind === ts.SyntaxKind.TrueKeyword
    ? true
    : current.kind === ts.SyntaxKind.FalseKeyword
      ? false
      : null;
}

function isModuleExportsReference(
  expression: ts.Expression,
): boolean {
  const current = unwrapExpression(expression);
  return ts.isPropertyAccessExpression(current)
    && ts.isIdentifier(current.expression)
    && current.expression.text === 'module'
    && current.name.text === 'exports';
}

function isWebpackLoaderReference(
  expression: ts.Expression,
  loaderNames: ReadonlySet<string>,
): boolean {
  const current = unwrapExpression(expression);
  const stringValue = readStringLiteralValue(current);
  if (stringValue === '@aurelia/webpack-loader') {
    return true;
  }

  return ts.isIdentifier(current) && loaderNames.has(current.text);
}

function dedupeConfigObjects(
  objects: readonly ts.ObjectLiteralExpression[],
): readonly ts.ObjectLiteralExpression[] {
  const seen = new Set<string>();
  const result: ts.ObjectLiteralExpression[] = [];

  for (const current of objects) {
    const key = `${current.getSourceFile().fileName}:${current.getStart()}:${current.end}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(current);
  }

  return result;
}

function readDetectedBuildTool(
  rootDir: string,
  packageJson: PackageJsonRecord | null,
): BuildToolDetection | null {
  for (const entry of BUILD_TOOL_CONFIG_CANDIDATES) {
    const configPath = entry.configNames
      .map((name) => path.join(rootDir, name))
      .find((current) => fs.existsSync(current));
    if (configPath != null) {
      return {
        activation: new BuildToolActivation(
          entry.kind,
          'active',
          [
            new ToolingEvidence(
              'config-file',
              configPath,
              `Detected ${entry.kind} from ${path.basename(configPath)}.`,
            ),
          ],
          `Build tool closed to ${entry.kind} from a known config-file surface.`,
        ),
        configPath,
      };
    }
  }

  if (packageJson == null) {
    return null;
  }

  for (const entry of BUILD_TOOL_PACKAGE_CANDIDATES) {
    const source = readDependencyCarrier(packageJson, entry.packageName);
    if (source == null) {
      continue;
    }

    return {
      activation: new BuildToolActivation(
        entry.kind,
        'open',
        [
          new ToolingEvidence(
            source,
            path.join(rootDir, 'package.json'),
            `package.json mentions ${entry.packageName}, which suggests ${entry.kind} but does not yet prove configured use.`,
          ),
        ],
        `Build tool likely involves ${entry.kind}, but the scanner has not yet verified config-file or workspace-tool usage.`,
      ),
      configPath: null,
    };
  }

  return null;
}

function readDetectedConventionsDriver(
  rootDir: string,
  packageJson: PackageJsonRecord | null,
): {
  readonly driver: AureliaConventionsDriverKind;
  readonly evidence: ToolingEvidence;
} | null {
  if (packageJson == null) {
    return null;
  }

  for (const entry of CONVENTIONS_DRIVER_PACKAGES) {
    const source = readDependencyCarrier(packageJson, entry.packageName);
    if (source == null) {
      continue;
    }

    return {
      driver: entry.driver,
      evidence: new ToolingEvidence(
        source,
        path.join(rootDir, 'package.json'),
        `package.json mentions ${entry.packageName}.`,
      ),
    };
  }

  return null;
}

function readDependencyCarrier(
  packageJson: PackageJsonRecord,
  packageName: string,
): ToolingEvidence['carrier'] | null {
  if (packageJson.dependencies[packageName] != null) {
    return 'package-json-dependency';
  }
  if (packageJson.devDependencies[packageName] != null) {
    return 'package-json-dev-dependency';
  }
  return null;
}

function readPackageJson(
  rootDir: string,
): PackageJsonRecord | null {
  const packageJsonPath = path.join(rootDir, 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    return null;
  }

  try {
    const raw = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8')) as {
      readonly dependencies?: Record<string, string>;
      readonly devDependencies?: Record<string, string>;
    };

    return {
      dependencies: raw.dependencies ?? {},
      devDependencies: raw.devDependencies ?? {},
    };
  } catch {
    return null;
  }
}

const BUILD_TOOL_CONFIG_CANDIDATES: readonly {
  readonly kind: BuildToolKind;
  readonly configNames: readonly string[];
}[] = [
  {
    kind: 'vite',
    configNames: ['vite.config.ts', 'vite.config.js', 'vite.config.mts', 'vite.config.mjs', 'vite.config.cts', 'vite.config.cjs'],
  },
  {
    kind: 'webpack',
    configNames: ['webpack.config.ts', 'webpack.config.js', 'webpack.config.mts', 'webpack.config.mjs', 'webpack.config.cts', 'webpack.config.cjs'],
  },
  {
    kind: 'parcel',
    configNames: ['.parcelrc'],
  },
];

const BUILD_TOOL_PACKAGE_CANDIDATES: readonly {
  readonly kind: BuildToolKind;
  readonly packageName: string;
}[] = [
  { kind: 'vite', packageName: 'vite' },
  { kind: 'webpack', packageName: 'webpack' },
  { kind: 'parcel', packageName: 'parcel' },
  { kind: 'parcel', packageName: '@parcel/core' },
];

const CONVENTIONS_DRIVER_PACKAGES: readonly {
  readonly driver: AureliaConventionsDriverKind;
  readonly packageName: string;
}[] = [
  { driver: 'vite-plugin', packageName: '@aurelia/vite-plugin' },
  { driver: 'webpack-loader', packageName: '@aurelia/webpack-loader' },
  { driver: 'parcel-transformer', packageName: '@aurelia/parcel-transformer' },
  { driver: 'plugin-gulp', packageName: '@aurelia/plugin-gulp' },
  { driver: 'ts-jest', packageName: '@aurelia/ts-jest' },
  { driver: 'babel-jest', packageName: '@aurelia/babel-jest' },
  { driver: 'plugin-conventions', packageName: '@aurelia/plugin-conventions' },
];
