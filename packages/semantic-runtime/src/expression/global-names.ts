export const enum AureliaExpressionGlobalName {
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
  /** Number constructor namespace admitted as an unobserved global. */
  Number = 'Number',
  /** Object constructor namespace admitted as an unobserved global. */
  Object = 'Object',
  /** RegExp constructor namespace admitted as an unobserved global. */
  RegExp = 'RegExp',
  /** Set constructor namespace admitted as an unobserved global. */
  Set = 'Set',
  /** String constructor namespace admitted as an unobserved global. */
  String = 'String',
  /** JSON namespace admitted as an unobserved global. */
  JSON = 'JSON',
  /** Math namespace admitted as an unobserved global. */
  Math = 'Math',
  /** Intl namespace admitted as an unobserved global. */
  Intl = 'Intl',
}

export const aureliaExpressionGlobalNames: readonly AureliaExpressionGlobalName[] = [
  AureliaExpressionGlobalName.Infinity,
  AureliaExpressionGlobalName.NaN,
  AureliaExpressionGlobalName.IsFinite,
  AureliaExpressionGlobalName.IsNaN,
  AureliaExpressionGlobalName.ParseFloat,
  AureliaExpressionGlobalName.ParseInt,
  AureliaExpressionGlobalName.DecodeURI,
  AureliaExpressionGlobalName.DecodeURIComponent,
  AureliaExpressionGlobalName.EncodeURI,
  AureliaExpressionGlobalName.EncodeURIComponent,
  AureliaExpressionGlobalName.Array,
  AureliaExpressionGlobalName.BigInt,
  AureliaExpressionGlobalName.Boolean,
  AureliaExpressionGlobalName.Date,
  AureliaExpressionGlobalName.Map,
  AureliaExpressionGlobalName.Number,
  AureliaExpressionGlobalName.Object,
  AureliaExpressionGlobalName.RegExp,
  AureliaExpressionGlobalName.Set,
  AureliaExpressionGlobalName.String,
  AureliaExpressionGlobalName.JSON,
  AureliaExpressionGlobalName.Math,
  AureliaExpressionGlobalName.Intl,
];

const aureliaExpressionGlobalNameSet: ReadonlySet<string> = new Set(aureliaExpressionGlobalNames);

/** Returns whether the identifier is admitted as AccessGlobal by Aurelia expression parsing. */
export function isAureliaExpressionGlobalName(name: string): boolean {
  return aureliaExpressionGlobalNameSet.has(name);
}
