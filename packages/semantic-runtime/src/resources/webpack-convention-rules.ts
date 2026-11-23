import type ts from 'typescript';
import { closedStaticValueMemberValue, readStaticValueProperty } from '../evaluation/property-access.js';
import { EvaluationUndefined, EvaluationValueKind, readEvaluationCallability, type EvaluationValue } from '../evaluation/values.js';

export const aureliaWebpackLoader = '@aurelia/webpack-loader';

type Match = boolean | null;
type Condition = (resourcePath: string) => Match;

interface Rule {
  readonly matches: Condition;
  readonly transform: boolean;
  readonly rules: readonly Rule[];
  readonly oneOf: readonly Rule[];
}

export interface WebpackConventionRules {
  readonly ruleSource: ts.Node | null;
  readonly hasLoader: boolean;
  readonly open: boolean;
  readonly admits: (resourcePath: string) => boolean;
}

const resourceConditions = new Set(['test', 'resource', 'realResource', 'include', 'exclude']);
// These webpack RuleSet properties contribute effects or child rules, not match conditions.
const effects = new Set(['loader', 'options', 'use', 'rules', 'oneOf', 'enforce', 'type', 'layer',
  'sideEffects', 'parser', 'generator', 'resolve', 'extractSourceMap']);
const yes: Condition = () => true;
const unknown: Condition = () => null;
const unknownRule: Rule = { matches: unknown, transform: false, rules: [], oneOf: [] };

function member(value: EvaluationValue | null, key: string): EvaluationValue | null {
  return value?.kind === EvaluationValueKind.Object
    ? closedStaticValueMemberValue(readStaticValueProperty(value, key, value.node))
    : null;
}

function items(value: EvaluationValue | null): readonly EvaluationValue[] | null {
  return value?.kind === EvaluationValueKind.Array && value.hasExactElementPositions
    && !value.mayHaveUnknownElements && !value.mayHaveUnknownOrder
    ? value.elements.map(element => element.value)
    : null;
}

function combine(conditions: readonly Condition[], conjunction: boolean): Condition {
  return path => {
    let result: Match = conjunction;
    for (const condition of conditions) {
      const match = condition(path);
      if (match === !conjunction) return match;
      if (match === null) result = null;
    }
    return result;
  };
}

function negate(condition: Condition): Condition {
  return path => {
    const match = condition(path);
    return match === null ? null : !match;
  };
}

/** Resource-only webpack conditions. Functions and request/issuer-dependent facts remain open. */
function condition(
  value: EvaluationValue | null,
  seen: ReadonlySet<EvaluationValue>,
  unresolved: () => Condition,
): Condition {
  if (value == null || seen.has(value)) return unresolved();
  if (value.kind === EvaluationValueKind.String) {
    return path => value.value === '' ? path === '' : path.startsWith(value.value);
  }
  if (value.kind === EvaluationValueKind.RegularExpression) {
    if (/[gy]/u.test(value.flags)) return unresolved();
    try {
      const re = new RegExp(value.pattern, value.flags);
      return path => re.test(path);
    } catch {
      return unresolved();
    }
  }

  const next = new Set(seen).add(value);
  const list = items(value);
  if (list != null) return combine(list.map(item => condition(item, next, unresolved)), false);
  if (value.kind !== EvaluationValueKind.Object || value.mayHaveUnknownProperties || !value.properties.size) return unresolved();
  const conditions: Condition[] = [];
  for (const key of value.properties.keys()) {
    const operand = member(value, key);
    if (key === 'not') conditions.push(negate(condition(operand, next, unresolved)));
    else if (key === 'and' || key === 'or') {
      const operands = items(operand);
      if (!operands) return unresolved();
      const nested = operands.map(item => condition(item, next, unresolved));
      if (key === 'and') conditions.push(...nested);
      else conditions.push(combine(nested, false));
    } else return unresolved();
  }
  return conditions.length ? combine(conditions, true) : unresolved();
}

function admits(rules: readonly Rule[], path: string, firstOnly: boolean): boolean {
  for (const rule of rules) {
    const matched = rule.matches(path);
    if (matched === false) continue;
    if (matched === true && (rule.transform || admits(rule.rules, path, false) || admits(rule.oneOf, path, true))) return true;
    // oneOf spends the first *matching rule*, even if it installs an unrelated loader.
    if (firstOnly) return false;
  }
  return false;
}

/** Compile the evaluated rule tree once, then ask it independently about each actual resource path. */
export function readWebpackConventionRules(config: EvaluationValue | null): WebpackConventionRules {
  let hasLoader = false;
  let unresolvedLoader = false;
  let open = false;
  function loader(name: EvaluationValue | null, options?: EvaluationValue | null): boolean {
    if (name?.kind === EvaluationValueKind.Undefined) return false;
    if (name?.kind !== EvaluationValueKind.String || name.value.startsWith(`${aureliaWebpackLoader}?`)) {
      unresolvedLoader = true;
      return false;
    }
    if (name.value !== aureliaWebpackLoader) return false;
    hasLoader = true;
    if (options === undefined || options?.kind === EvaluationValueKind.Undefined) return true;
    const enabled = member(options, 'enableConventions');
    if (enabled?.kind === EvaluationValueKind.Undefined) return true;
    if (enabled?.kind === EvaluationValueKind.Boolean) return enabled.value;
    open = true;
    return false;
  }
  function use(item: EvaluationValue | null): boolean {
    return item?.kind === EvaluationValueKind.Object
      ? loader(member(item, 'loader'), member(item, 'options'))
      : loader(item);
  }
  function readRules(value: EvaluationValue | null, stack: ReadonlySet<EvaluationValue>): readonly Rule[] {
    if (value?.kind === EvaluationValueKind.Undefined) return [];
    const list = items(value);
    if (value == null || list == null || stack.has(value)) {
      open = true;
      return [unknownRule];
    }
    const next = new Set(stack).add(value);
    return list.map(rule => {
      // webpack skips false/null entries in rule arrays rather than selecting them in oneOf.
      if (rule.kind === EvaluationValueKind.Null || rule.kind === EvaluationValueKind.Undefined
        || (rule.kind === EvaluationValueKind.Boolean && !rule.value)) return { ...unknownRule, matches: () => false };
      if (rule.kind !== EvaluationValueKind.Object || next.has(rule)) {
        open = true;
        return unknownRule;
      }
      const filters: Condition[] = [];
      const unresolved = () => {
        open = true;
        return unknown;
      };
      if (rule.mayHaveUnknownProperties) filters.push(unresolved());
      for (const key of rule.properties.keys()) {
        if (effects.has(key)) continue;
        const test = resourceConditions.has(key) ? condition(member(rule, key), new Set(), unresolved) : unresolved();
        filters.push(key === 'exclude' ? negate(test) : test);
      }
      const useValue = member(rule, 'use');
      const useItems = items(useValue);
      const direct = loader(member(rule, 'loader'), member(rule, 'options'));
      const configured = useItems == null ? use(useValue) : useItems.some(use);
      return {
        matches: filters.length ? combine(filters, true) : yes,
        transform: direct || configured,
        rules: readRules(member(rule, 'rules'), next),
        oneOf: readRules(member(rule, 'oneOf'), next),
      };
    });
  }
  const then = member(config, 'then');
  if (then == null || readEvaluationCallability(then) !== false) {
    return { ruleSource: null, hasLoader: false, open: true, admits: () => false };
  }
  const moduleOptions = member(config, 'module');
  const ruleList = moduleOptions?.kind === EvaluationValueKind.Undefined ? EvaluationUndefined : member(moduleOptions, 'rules');
  const rules = readRules(ruleList, new Set());
  const ruleSource = ruleList?.kind === EvaluationValueKind.Array ? ruleList.node : null;
  const resolver = member(config, 'resolveLoader');
  // A custom resolver can retarget the package-name loader request to a different implementation.
  const defaultResolver = resolver?.kind === EvaluationValueKind.Undefined || (
    resolver?.kind === EvaluationValueKind.Object && !resolver.mayHaveUnknownProperties && resolver.properties.size === 0);
  return {
    ruleSource,
    hasLoader: hasLoader && defaultResolver,
    open: unresolvedLoader || (hasLoader && !defaultResolver) || (open && (hasLoader || ruleList?.kind !== EvaluationValueKind.Array)),
    admits: path => defaultResolver && admits(rules, path, false),
  };
}
