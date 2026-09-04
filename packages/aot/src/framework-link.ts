import { createHash } from 'node:crypto';
import path from 'node:path';
import { AotFrameworkLinkPackageError, readAotFrameworkLinkPackage } from './framework-link-package.js';

export const AOT_FRAMEWORK_LINK_PROTOCOL = 1 as const;
export const AOT_FRAMEWORK_LINK_MAP_POSTURE = 'performance-no-map' as const;
export const AOT_RC2_FRAMEWORK_LINK_GRAPH_FINGERPRINT =
  'e1580a29e782b3c5ae7681384fea90be87ca6df55e9ad60483f04f117a03639e' as const;
// One build-only RC2 derivation; replace at the GA framework catch-up.
export const AOT_RC2_LINK_MODULES_GRAPH_FINGERPRINT =
  '780e014fb526407e271bae23cfcd9703195382047dda12774b910737a52ea107' as const;

export type AotFrameworkLinkMapPosture = 'performance-no-map' | 'mapped';
export type AotFrameworkLinkPolicy = 'require-applied' | 'allow-c0-fallback';
export type AotFrameworkLinkModuleRole = 'target' | 'guard';

export interface AotFrameworkLinkModuleInput {
  readonly role: AotFrameworkLinkModuleRole;
  readonly packageName: string;
  readonly packageRelativePath: string;
  readonly resolvedId: string;
  readonly expectedSha256: string;
}

export interface AotFrameworkLinksOptions {
  readonly protocol: typeof AOT_FRAMEWORK_LINK_PROTOCOL;
  readonly graphFingerprint: string;
  readonly mapPosture: AotFrameworkLinkMapPosture;
  readonly policy: AotFrameworkLinkPolicy;
  readonly modules: readonly AotFrameworkLinkModuleInput[];
  readonly packages?: readonly AotFrameworkLinkPackageInput[];
}

export interface AotFrameworkLinkPackageInput {
  readonly packageName: string;
  readonly packageRoot: string;
  readonly expectedManifestSha256: string;
  readonly expectedStandardEntrySha256: string;
}

export interface AotFrameworkLinkPackageModuleArtifact {
  readonly resolvedId: string;
  readonly sha256: string;
  readonly code: string;
  /** Verified adjacent source map, retained without narrowing the framework's map contract. */
  readonly map: string;
}

export interface AotLinkedFrameworkPackageArtifact {
  readonly packageName: string;
  readonly packageRoot: string;
  readonly manifestSha256: string;
  readonly entryResolvedId: string;
  readonly modules: readonly AotFrameworkLinkPackageModuleArtifact[];
}

export interface AotPrepareFrameworkLinkModule extends AotFrameworkLinkModuleInput {
  readonly observedSha256: string;
  readonly code: string;
}

export interface AotPrepareFrameworkLinksRequest {
  readonly protocol: typeof AOT_FRAMEWORK_LINK_PROTOCOL;
  readonly graphFingerprint: string;
  readonly mapPosture: AotFrameworkLinkMapPosture;
  readonly policy: AotFrameworkLinkPolicy;
  readonly modules: readonly AotPrepareFrameworkLinkModule[];
  readonly packages?: readonly AotFrameworkLinkPackageInput[];
}

export interface AotLinkedFrameworkModuleArtifact {
  readonly packageName: string;
  readonly packageRelativePath: string;
  readonly resolvedId: string;
  readonly inputSha256: string;
  readonly linkedSha256: string;
  readonly code: string;
  readonly map: null;
}

export interface AotPreparedFrameworkLinksApplied {
  readonly disposition: 'applied';
  readonly recipeFingerprint: string;
  readonly modules: readonly AotLinkedFrameworkModuleArtifact[];
  readonly packages?: readonly AotLinkedFrameworkPackageArtifact[];
}

export type AotFrameworkLinksC0FallbackReasonKind =
  | 'input-hash-mismatch'
  | 'map-unavailable'
  | 'recipe-unavailable'
  | 'unsupported-input';

export interface AotFrameworkLinksC0FallbackReason {
  readonly kind: AotFrameworkLinksC0FallbackReasonKind;
  readonly summary: string;
  readonly packageName?: string;
  readonly packageRelativePath?: string;
}

export interface AotPreparedFrameworkLinksC0Fallback {
  readonly disposition: 'c0-fallback';
  readonly reason: AotFrameworkLinksC0FallbackReason;
}

export type AotPrepareFrameworkLinksResult =
  | AotPreparedFrameworkLinksApplied
  | AotPreparedFrameworkLinksC0Fallback;

export type AotFrameworkLinkSessionAdmission =
  | { readonly state: 'admitted' }
  | {
      readonly state: 'c0-fallback';
      readonly reasonKind: string;
      readonly reason: string;
    };

export type AotFrameworkLinkErrorCode =
  | 'AOT_FRAMEWORK_LINK_INVALID_REQUEST'
  | 'AOT_FRAMEWORK_LINK_INVALID_MODULE';

export class AotFrameworkLinkError extends Error {
  public override readonly name = 'AotFrameworkLinkError';

  public constructor(
    public readonly code: AotFrameworkLinkErrorCode,
    message: string,
  ) {
    super(message);
  }
}

interface FrameworkLinkRecipeModule {
  readonly role: AotFrameworkLinkModuleRole;
  readonly packageName: string;
  readonly packageRelativePath: 'dist/esm/index.mjs';
  readonly expectedSha256: string;
  readonly operation: string;
  readonly linkedCode: string | null;
}

const expressionParserFacade = `import { DI, emptyArray } from '@aurelia/kernel';

export const IExpressionParser = DI.createInterface('IExpressionParser');

export function createAccessScopeExpression(name, ancestor = 0) {
  return { $kind: 'AccessScope', name, ancestor };
}

export function createInterpolation(parts, expressions = emptyArray) {
  return {
    $kind: 'Interpolation',
    isMulti: expressions.length > 1,
    firstExpression: expressions[0],
    parts,
    expressions,
  };
}

export class CustomExpression {
  $kind = 'Custom';

  constructor(value) {
    this.value = value;
  }

  evaluate() { return this.value; }
  assign(...params) { return params; }
  bind() {}
  unbind() {}
  accept() {}
}

export class ExpressionParser {
  constructor() {
    throw new Error('General expression parsing was removed by the admitted AOT framework link.');
  }

  static register() {
    throw new Error('General expression parsing was removed by the admitted AOT framework link.');
  }

  parse() {
    throw new Error('General expression parsing was removed by the admitted AOT framework link.');
  }
}
`;

const templateCompilerFacade = `import { DI } from '@aurelia/kernel';

export const BindingMode = Object.freeze({
  default: 0,
  oneTime: 1,
  toView: 2,
  fromView: 4,
  twoWay: 6,
});

export const itHydrateElement = 0;
export const itHydrateAttribute = 1;
export const itHydrateTemplateController = 2;
export const itHydrateLetElement = 3;
export const itSetProperty = 10;
export const itInterpolation = 11;
export const itPropertyBinding = 12;
export const itLetBinding = 13;
export const itRefBinding = 14;
export const itIteratorBinding = 15;
export const itMultiAttr = 16;
export const itTextBinding = 30;
export const itListenerBinding = 31;
export const itAttributeBinding = 32;
export const itStylePropertyBinding = 33;
export const itSetAttribute = 34;
export const itSetClassAttribute = 35;
export const itSetStyleAttribute = 36;
export const itSpreadTransferedBinding = 50;
export const itSpreadElementProp = 51;
export const itSpreadValueBinding = 52;

export const ITemplateCompiler = DI.createInterface('ITemplateCompiler');
export const IInstruction = DI.createInterface('Instruction');
export const IAttrMapper = DI.createInterface('IAttrMapper');
export const IResourceResolver = DI.createInterface('IResourceResolver');
export const IAttributePattern = DI.createInterface('IAttributePattern');
export const IAttributeParser = DI.createInterface('IAttributeParser');
export const ITemplateElementFactory = DI.createInterface('ITemplateElementFactory');
export const ITemplateCompilerHooks = DI.createInterface('ITemplateCompilerHooks');

export class AttrSyntax {
  constructor(rawName, rawValue, target, command, parts = null) {
    this.rawName = rawName;
    this.rawValue = rawValue;
    this.target = target;
    this.command = command;
    this.parts = parts;
  }
}

export const AttributePattern = Object.freeze({
  name: 'au:resource:attribute-pattern',
  create() {
    return {
      register() { unsupportedCompilerSurface('AttributePattern registration'); },
    };
  },
});

export const TemplateCompilerHooks = Object.freeze({
  name: 'au:resource:compiler-hooks',
  define() { unsupportedCompilerSurface('TemplateCompilerHooks.define'); },
  findAll() { unsupportedCompilerSurface('TemplateCompilerHooks.findAll'); },
});

export function attributePattern() { unsupportedCompilerSurface('attributePattern'); }
export function bindingCommand() { unsupportedCompilerSurface('bindingCommand'); }
export function templateCompilerHooks() { unsupportedCompilerSurface('templateCompilerHooks'); }

export const BindingCommand = Object.freeze({
  define() { unsupportedCompilerSurface('BindingCommand.define'); },
  get() { unsupportedCompilerSurface('BindingCommand.get'); },
  find() { unsupportedCompilerSurface('BindingCommand.find'); },
});

export class TemplateCompiler {
  constructor() {
    unsupportedCompilerSurface('TemplateCompiler construction');
  }

  static register() {
    unsupportedCompilerSurface('TemplateCompiler registration');
  }
}

class UnsupportedCompilerResource {
  constructor() {
    unsupportedCompilerSurface(new.target.name);
  }
}

export class DotSeparatedAttributePattern extends UnsupportedCompilerResource {}
export class RefAttributePattern extends UnsupportedCompilerResource {}
export class EventAttributePattern extends UnsupportedCompilerResource {}
export class ColonPrefixedBindAttributePattern extends UnsupportedCompilerResource {}
export class AtPrefixedTriggerAttributePattern extends UnsupportedCompilerResource {}
export class DefaultBindingCommand extends UnsupportedCompilerResource {}
export class OneTimeBindingCommand extends UnsupportedCompilerResource {}
export class FromViewBindingCommand extends UnsupportedCompilerResource {}
export class ToViewBindingCommand extends UnsupportedCompilerResource {}
export class TwoWayBindingCommand extends UnsupportedCompilerResource {}
export class ForBindingCommand extends UnsupportedCompilerResource {}
export class RefBindingCommand extends UnsupportedCompilerResource {}
export class TriggerBindingCommand extends UnsupportedCompilerResource {}
export class CaptureBindingCommand extends UnsupportedCompilerResource {}
export class ClassBindingCommand extends UnsupportedCompilerResource {}
export class StyleBindingCommand extends UnsupportedCompilerResource {}
export class AttrBindingCommand extends UnsupportedCompilerResource {}
export class SpreadValueBindingCommand extends UnsupportedCompilerResource {}

function unsupportedCompilerSurface(name) {
  throw new Error(name + ' is unavailable in the admitted AOT framework link.');
}
`;

export const AOT_RC2_FRAMEWORK_LINK_OPERATION = {
  expressionParser: 'aurelia-aot/framework-link/expression-parser-runtime-abi/v1',
  templateCompiler: 'aurelia-aot/framework-link/template-compiler-runtime-abi/v1',
  runtimeHtmlGuard: 'aurelia-aot/framework-link/runtime-html-import-guard/v1',
  aureliaGuard: 'aurelia-aot/framework-link/aurelia-reexport-guard/v1',
} as const;

const recipeModules: readonly FrameworkLinkRecipeModule[] = [
  {
    role: 'target',
    packageName: '@aurelia/expression-parser',
    packageRelativePath: 'dist/esm/index.mjs',
    expectedSha256: '5d9589bd3696384f28ef93cc6087c1f0975fe04bcac46df93e9bede65b91a1e9',
    operation: AOT_RC2_FRAMEWORK_LINK_OPERATION.expressionParser,
    linkedCode: expressionParserFacade,
  },
  {
    role: 'target',
    packageName: '@aurelia/template-compiler',
    packageRelativePath: 'dist/esm/index.mjs',
    expectedSha256: 'dbdbb282410c4ae7d3a30b45ff32e21a440a769b125ce8e7de6ded7a4b88b81e',
    operation: AOT_RC2_FRAMEWORK_LINK_OPERATION.templateCompiler,
    linkedCode: templateCompilerFacade,
  },
  {
    role: 'guard',
    packageName: '@aurelia/runtime-html',
    packageRelativePath: 'dist/esm/index.mjs',
    expectedSha256: '9fac331a0cedfe167035f7a6b41cdf564704d25421ea5a9c8795510c683cb310',
    operation: AOT_RC2_FRAMEWORK_LINK_OPERATION.runtimeHtmlGuard,
    linkedCode: null,
  },
  {
    role: 'guard',
    packageName: 'aurelia',
    packageRelativePath: 'dist/esm/index.mjs',
    expectedSha256: '0abe65b6419293e0ad24c6cb4fdae88e8b21cc277a8d8562d397435a5d9d4bd6',
    operation: AOT_RC2_FRAMEWORK_LINK_OPERATION.aureliaGuard,
    linkedCode: null,
  },
];

export const AOT_RC2_FRAMEWORK_LINK_EXPECTATIONS = recipeModules.map((module) => ({
  role: module.role,
  packageName: module.packageName,
  packageRelativePath: module.packageRelativePath,
  expectedSha256: module.expectedSha256,
  operation: module.operation,
}));

const linkEntryForwarder = "export * from '../link/index.mjs';\n";
const linkPackageNames = ['@aurelia/kernel', '@aurelia/runtime', '@aurelia/runtime-html'] as const;
const linkPackageManifestHashes = [
  '6f8fc882405178e94eab168ca1ebdced234188db34520595e432a6b7e6920a9b',
  '042a1ac1597f1e7e3c2dab641fe3b4243c7183696867b9bc5b82ddb9c64228ae',
  '5c525c4f886fc28dc35c428bdc7c3bedcfbccd3fc22865883c3497888da580ed',
] as const;
const linkModulesRecipe = ([
  ...recipeModules.map((module): FrameworkLinkRecipeModule => module.packageName === '@aurelia/runtime-html'
    ? { ...module, role: 'target', operation: 'framework-link/package-entry/v1', linkedCode: linkEntryForwarder }
    : module),
  {
    role: 'target', packageName: '@aurelia/kernel', packageRelativePath: 'dist/esm/index.mjs',
    expectedSha256: '6e5a9925ce2b2b1efbbbee43607d67e83aae7b4e6e93938081006df5c1728b23',
    operation: 'framework-link/package-entry/v1', linkedCode: linkEntryForwarder,
  },
  {
    role: 'target', packageName: '@aurelia/runtime', packageRelativePath: 'dist/esm/index.mjs',
    expectedSha256: 'ee9d1f96e3b2e7d22276f09a9b6f1a8661261d70cf8484ae91271f079f2fc998',
    operation: 'framework-link/package-entry/v1', linkedCode: linkEntryForwarder,
  },
] satisfies FrameworkLinkRecipeModule[]).sort(compareFrameworkLinkModules);

export const AOT_RC2_LINK_MODULES_EXPECTATIONS = linkModulesRecipe.map(({ linkedCode: _code, ...module }) => module);

export const AOT_RC2_FRAMEWORK_LINK_RECIPE_FINGERPRINT = digest(JSON.stringify({
  protocol: AOT_FRAMEWORK_LINK_PROTOCOL,
  graphFingerprint: AOT_RC2_FRAMEWORK_LINK_GRAPH_FINGERPRINT,
  mapPosture: AOT_FRAMEWORK_LINK_MAP_POSTURE,
  modules: recipeModules.map((module) => ({
    role: module.role,
    packageName: module.packageName,
    packageRelativePath: module.packageRelativePath,
    expectedSha256: module.expectedSha256,
    operation: module.operation,
    linkedSha256: module.linkedCode == null ? module.expectedSha256 : digest(module.linkedCode),
  })),
}));

export class AotFrameworkLinkEmitter {
  public async prepare(
    request: AotPrepareFrameworkLinksRequest,
    admission: AotFrameworkLinkSessionAdmission,
  ): Promise<AotPrepareFrameworkLinksResult> {
    const hasPackages = request.packages !== undefined;
    const recipe = hasPackages ? linkModulesRecipe : recipeModules;
    const graphFingerprint = hasPackages ? AOT_RC2_LINK_MODULES_GRAPH_FINGERPRINT : AOT_RC2_FRAMEWORK_LINK_GRAPH_FINGERPRINT;
    const modules = validateRequest(request, recipe);
    if (admission.state === 'c0-fallback') {
      return fallback('unsupported-input', `${admission.reasonKind}: ${admission.reason}`);
    }
    if (request.graphFingerprint !== graphFingerprint) {
      return fallback(
        'unsupported-input',
        `RC2 framework linking expected graph '${graphFingerprint}', but received '${request.graphFingerprint}'.`,
      );
    }
    if (request.mapPosture !== AOT_FRAMEWORK_LINK_MAP_POSTURE) {
      return fallback(
        'map-unavailable',
        `RC2 framework linking admits '${AOT_FRAMEWORK_LINK_MAP_POSTURE}' only; received '${request.mapPosture}'.`,
      );
    }
    const mismatch = modules.find((module) => module.observedSha256 !== module.expectedSha256);
    if (mismatch != null) {
      return fallback(
        'input-hash-mismatch',
        `RC2 framework link expected ${mismatch.packageName}/${mismatch.packageRelativePath} ${mismatch.expectedSha256}, but observed ${mismatch.observedSha256}.`,
        mismatch,
      );
    }
    const recipeMismatchIndex = modules.findIndex((module, index) =>
      module.expectedSha256 !== recipe[index]!.expectedSha256
    );
    if (recipeMismatchIndex >= 0) {
      const module = modules[recipeMismatchIndex]!;
      return fallback(
        'unsupported-input',
        `RC2 framework link has no recipe for ${module.packageName}/${module.packageRelativePath} ${module.observedSha256}.`,
        module,
      );
    }

    let packages: readonly AotLinkedFrameworkPackageArtifact[] | undefined;
    if (request.packages !== undefined) {
      const inputs = validatePackageInputs(request.packages, modules);
      if (inputs.some((input, index) => input.expectedManifestSha256 !== linkPackageManifestHashes[index])) {
        return fallback('unsupported-input', 'RC2 framework linking has no recipe for the supplied package manifests.');
      }
      try {
        const verified = await Promise.all(inputs.map(readAotFrameworkLinkPackage));
        if (new Set(verified.map((pkg) => pkg.buildPolicySha256)).size !== 1) {
          return fallback('unsupported-input', 'The three framework link packages do not share one build policy.');
        }
        packages = verified.map((pkg) => ({
          packageName: pkg.packageName,
          packageRoot: pkg.packageRoot,
          manifestSha256: pkg.manifestSha256,
          entryResolvedId: pkg.linkEntry,
          modules: pkg.modules.map((module) => ({
            resolvedId: module.resolvedId,
            sha256: module.sha256,
            code: module.code,
            map: module.map.code,
          })),
        }));
      } catch (error) {
        if (!(error instanceof AotFrameworkLinkPackageError)) throw error;
        return fallback('unsupported-input', error.message);
      }
    }

    return {
      disposition: 'applied',
      recipeFingerprint: packages === undefined ? AOT_RC2_FRAMEWORK_LINK_RECIPE_FINGERPRINT : digest(JSON.stringify({
        graphFingerprint,
        facadeRecipe: AOT_RC2_FRAMEWORK_LINK_RECIPE_FINGERPRINT,
        forwarder: linkEntryForwarder,
        packages: packages.map((pkg) => ({ packageName: pkg.packageName, manifestSha256: pkg.manifestSha256 })),
      })),
      ...(packages === undefined ? {} : { packages }),
      modules: modules.flatMap((module, index): AotLinkedFrameworkModuleArtifact[] => {
        const code = recipe[index]!.linkedCode;
        return code == null ? [] : [{
          packageName: module.packageName,
          packageRelativePath: module.packageRelativePath,
          resolvedId: module.resolvedId,
          inputSha256: module.observedSha256,
          linkedSha256: digest(code),
          code,
          map: null,
        }];
      }),
    };
  }
}

function validateRequest(
  request: AotPrepareFrameworkLinksRequest,
  recipe: readonly FrameworkLinkRecipeModule[],
): readonly AotPrepareFrameworkLinkModule[] {
  if (request.protocol !== AOT_FRAMEWORK_LINK_PROTOCOL) {
    invalidRequest('Framework-link protocol must be 1.');
  }
  assertSha256(request.graphFingerprint, 'graphFingerprint', 'AOT_FRAMEWORK_LINK_INVALID_REQUEST');
  if (request.mapPosture !== 'performance-no-map' && request.mapPosture !== 'mapped') {
    invalidRequest(`Unsupported framework-link map posture '${String(request.mapPosture)}'.`);
  }
  if (request.policy !== 'require-applied' && request.policy !== 'allow-c0-fallback') {
    invalidRequest(`Unsupported framework-link policy '${String(request.policy)}'.`);
  }
  const rawModules: unknown = request.modules;
  if (!Array.isArray(rawModules) || rawModules.length !== recipe.length) {
    invalidRequest(`Framework-link request must contain exactly ${recipe.length} recipe modules.`);
  }
  const moduleValues: readonly unknown[] = rawModules;
  const modules = moduleValues.map((value, index): AotPrepareFrameworkLinkModule => {
    if (value == null || typeof value !== 'object') {
      invalidModule(`Framework-link module ${index} is not an object.`);
    }
    return value as AotPrepareFrameworkLinkModule;
  }).sort(compareFrameworkLinkModules);
  for (let index = 0; index < recipe.length; index++) {
    const module = modules[index]!;
    const expected = recipe[index]!;
    if (
      module.role !== expected.role
      || module.packageName !== expected.packageName
      || module.packageRelativePath !== expected.packageRelativePath
    ) {
      invalidModule(
        `Framework-link module ${index} must be ${expected.role} ${expected.packageName}/${expected.packageRelativePath}.`,
      );
    }
    assertResolvedModulePath(module);
    if (typeof module.code !== 'string' || module.code.length === 0) {
      invalidModule(`Framework-link module ${expected.packageName} has no source code.`);
    }
    assertSha256(module.expectedSha256, `${expected.packageName}.expectedSha256`, 'AOT_FRAMEWORK_LINK_INVALID_MODULE');
    assertSha256(module.observedSha256, `${expected.packageName}.observedSha256`, 'AOT_FRAMEWORK_LINK_INVALID_MODULE');
    const actual = digest(module.code);
    if (actual !== module.observedSha256) {
      invalidModule(
        `Framework-link module ${expected.packageName} observed hash '${module.observedSha256}' does not match its bytes '${actual}'.`,
      );
    }
  }
  return modules;
}

function compareFrameworkLinkModules(
  left: Pick<AotPrepareFrameworkLinkModule, 'role' | 'packageName' | 'packageRelativePath'>,
  right: Pick<AotPrepareFrameworkLinkModule, 'role' | 'packageName' | 'packageRelativePath'>,
): number {
  return roleOrdinal(left.role) - roleOrdinal(right.role)
    || left.packageName.localeCompare(right.packageName)
    || left.packageRelativePath.localeCompare(right.packageRelativePath);
}

function validatePackageInputs(
  inputs: readonly AotFrameworkLinkPackageInput[],
  modules: readonly AotPrepareFrameworkLinkModule[],
): readonly AotFrameworkLinkPackageInput[] {
  if (!Array.isArray(inputs) || inputs.length !== linkPackageNames.length) {
    invalidRequest('Framework linking requires kernel, runtime and runtime-html packages together.');
  }
  return linkPackageNames.map((packageName) => {
    const matches = inputs.filter((input) => input.packageName === packageName);
    if (matches.length !== 1) invalidRequest(`Framework linking requires exactly one '${packageName}' package.`);
    const input = matches[0]!;
    const module = modules.find((candidate) => candidate.packageName === packageName)!;
    if (typeof input.packageRoot !== 'string' || !path.isAbsolute(input.packageRoot)
      || path.resolve(input.packageRoot, 'dist/esm/index.mjs') !== path.resolve(module.resolvedId)
      || input.expectedStandardEntrySha256 !== module.expectedSha256) {
      invalidRequest(`Framework link package '${packageName}' does not match its exact default entry.`);
    }
    assertSha256(input.expectedManifestSha256, `${packageName}.expectedManifestSha256`, 'AOT_FRAMEWORK_LINK_INVALID_REQUEST');
    return input;
  });
}

function roleOrdinal(role: AotFrameworkLinkModuleRole): number {
  return role === 'target' ? 0 : 1;
}

function assertResolvedModulePath(module: AotPrepareFrameworkLinkModule): void {
  if (
    typeof module.resolvedId !== 'string'
    || module.resolvedId.length === 0
    || module.resolvedId.includes('\0')
    || module.resolvedId.includes('?')
    || module.resolvedId.includes('#')
    || !path.isAbsolute(module.resolvedId)
  ) {
    invalidModule(`Framework-link module ${module.packageName} has an invalid resolvedId.`);
  }
  const normalized = module.resolvedId.replaceAll('\\', '/');
  const expectedSuffix = `/node_modules/${module.packageName}/${module.packageRelativePath}`;
  if (!normalized.endsWith(expectedSuffix)) {
    invalidModule(
      `Framework-link module ${module.packageName} resolvedId does not end in '${expectedSuffix}'.`,
    );
  }
}

function assertSha256(
  value: string,
  field: string,
  code: AotFrameworkLinkErrorCode,
): void {
  if (!/^[0-9a-f]{64}$/u.test(value)) {
    throw new AotFrameworkLinkError(code, `${field} must be a lowercase sha256 digest.`);
  }
}

function fallback(
  kind: AotFrameworkLinksC0FallbackReasonKind,
  summary: string,
  module?: Pick<AotPrepareFrameworkLinkModule, 'packageName' | 'packageRelativePath'>,
): AotPreparedFrameworkLinksC0Fallback {
  return {
    disposition: 'c0-fallback',
    reason: {
      kind,
      summary,
      ...(module == null
        ? {}
        : {
            packageName: module.packageName,
            packageRelativePath: module.packageRelativePath,
          }),
    },
  };
}

function digest(code: string): string {
  return createHash('sha256').update(code, 'utf8').digest('hex');
}

function invalidRequest(message: string): never {
  throw new AotFrameworkLinkError('AOT_FRAMEWORK_LINK_INVALID_REQUEST', message);
}

function invalidModule(message: string): never {
  throw new AotFrameworkLinkError('AOT_FRAMEWORK_LINK_INVALID_MODULE', message);
}
