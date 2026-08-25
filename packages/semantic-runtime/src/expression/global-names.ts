/** ECMAScript host globals whose identity the static evaluator models. */
export const enum StaticEvaluationGlobalName {
  /** Numeric infinity global admitted by Aurelia's expression parser. */
  Infinity = 'Infinity',
  /** Numeric not-a-number global admitted by Aurelia's expression parser. */
  NaN = 'NaN',
  /** Host finite-number predicate admitted as an unobserved global call. */
  IsFinite = 'isFinite',
  /** Host not-a-number predicate admitted as an unobserved global call. */
  IsNaN = 'isNaN',
  /** Host floating-point parser admitted as an unobserved global call. */
  ParseFloat = 'parseFloat',
  /** Host integer parser admitted as an unobserved global call. */
  ParseInt = 'parseInt',
  /** Host URI decoder admitted as an unobserved global call. */
  DecodeURI = 'decodeURI',
  /** Host URI component decoder admitted as an unobserved global call. */
  DecodeURIComponent = 'decodeURIComponent',
  /** Host URI encoder admitted as an unobserved global call. */
  EncodeURI = 'encodeURI',
  /** Host URI component encoder admitted as an unobserved global call. */
  EncodeURIComponent = 'encodeURIComponent',
  /** Array constructor namespace admitted as an unobserved global. */
  Array = 'Array',
  /** BigInt constructor namespace admitted as an unobserved global. */
  BigInt = 'BigInt',
  /** Boolean constructor namespace admitted as an unobserved global. */
  Boolean = 'Boolean',
  /** Date constructor namespace admitted as an unobserved global. */
  Date = 'Date',
  /** Map constructor namespace admitted as an unobserved global. */
  Map = 'Map',
  /** WeakMap constructor namespace modeled for TypeScript static evaluation. */
  WeakMap = 'WeakMap',
  /** Number constructor namespace admitted as an unobserved global. */
  Number = 'Number',
  /** Object constructor namespace admitted as an unobserved global. */
  Object = 'Object',
  /** RegExp constructor namespace admitted as an unobserved global. */
  RegExp = 'RegExp',
  /** Set constructor namespace admitted as an unobserved global. */
  Set = 'Set',
  /** WeakSet constructor namespace modeled for TypeScript static evaluation. */
  WeakSet = 'WeakSet',
  /** String constructor namespace admitted as an unobserved global. */
  String = 'String',
  /** JSON namespace admitted as an unobserved global. */
  JSON = 'JSON',
  /** Math namespace admitted as an unobserved global. */
  Math = 'Math',
  /** Intl namespace admitted as an unobserved global. */
  Intl = 'Intl',
  /** Promise constructor namespace modeled for TypeScript static evaluation. */
  Promise = 'Promise',
}

/** Exact AccessGlobal allowlist mirrored from Aurelia's expression parser. */
export const aureliaExpressionGlobalNames: readonly StaticEvaluationGlobalName[] = [
  StaticEvaluationGlobalName.Infinity,
  StaticEvaluationGlobalName.NaN,
  StaticEvaluationGlobalName.IsFinite,
  StaticEvaluationGlobalName.IsNaN,
  StaticEvaluationGlobalName.ParseFloat,
  StaticEvaluationGlobalName.ParseInt,
  StaticEvaluationGlobalName.DecodeURI,
  StaticEvaluationGlobalName.DecodeURIComponent,
  StaticEvaluationGlobalName.EncodeURI,
  StaticEvaluationGlobalName.EncodeURIComponent,
  StaticEvaluationGlobalName.Array,
  StaticEvaluationGlobalName.BigInt,
  StaticEvaluationGlobalName.Boolean,
  StaticEvaluationGlobalName.Date,
  StaticEvaluationGlobalName.Map,
  StaticEvaluationGlobalName.Number,
  StaticEvaluationGlobalName.Object,
  StaticEvaluationGlobalName.RegExp,
  StaticEvaluationGlobalName.Set,
  StaticEvaluationGlobalName.String,
  StaticEvaluationGlobalName.JSON,
  StaticEvaluationGlobalName.Math,
  StaticEvaluationGlobalName.Intl,
];

export const staticEvaluationGlobalNames: readonly StaticEvaluationGlobalName[] = [
  ...aureliaExpressionGlobalNames,
  StaticEvaluationGlobalName.WeakMap,
  StaticEvaluationGlobalName.WeakSet,
  StaticEvaluationGlobalName.Promise,
];

/** Modeled global identities whose ECMAScript `typeof` result is `function`. */
export const staticEvaluationCallableGlobalNames: readonly StaticEvaluationGlobalName[] = [
  StaticEvaluationGlobalName.IsFinite,
  StaticEvaluationGlobalName.IsNaN,
  StaticEvaluationGlobalName.ParseFloat,
  StaticEvaluationGlobalName.ParseInt,
  StaticEvaluationGlobalName.DecodeURI,
  StaticEvaluationGlobalName.DecodeURIComponent,
  StaticEvaluationGlobalName.EncodeURI,
  StaticEvaluationGlobalName.EncodeURIComponent,
  StaticEvaluationGlobalName.Array,
  StaticEvaluationGlobalName.BigInt,
  StaticEvaluationGlobalName.Boolean,
  StaticEvaluationGlobalName.Date,
  StaticEvaluationGlobalName.Map,
  StaticEvaluationGlobalName.WeakMap,
  StaticEvaluationGlobalName.Number,
  StaticEvaluationGlobalName.Object,
  StaticEvaluationGlobalName.Promise,
  StaticEvaluationGlobalName.RegExp,
  StaticEvaluationGlobalName.Set,
  StaticEvaluationGlobalName.WeakSet,
  StaticEvaluationGlobalName.String,
];

const aureliaExpressionGlobalNameSet: ReadonlySet<string> = new Set(aureliaExpressionGlobalNames);
const staticEvaluationGlobalNameSet: ReadonlySet<string> = new Set(staticEvaluationGlobalNames);
const staticEvaluationCallableGlobalNameSet: ReadonlySet<string> = new Set(staticEvaluationCallableGlobalNames);

/** Returns whether the identifier is admitted as AccessGlobal by Aurelia expression parsing. */
export function isAureliaExpressionGlobalName(name: string): boolean {
  return aureliaExpressionGlobalNameSet.has(name);
}

/** Returns whether static evaluation has a modeled identity for this ECMAScript global. */
export function isStaticEvaluationGlobalName(name: string): boolean {
  return staticEvaluationGlobalNameSet.has(name);
}

/** Returns whether the modeled global identity is callable at runtime. */
export function isStaticEvaluationCallableGlobalName(name: string): boolean {
  return staticEvaluationCallableGlobalNameSet.has(name);
}
