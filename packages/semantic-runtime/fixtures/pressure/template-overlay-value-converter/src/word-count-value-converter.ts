import { valueConverter, type ICallerContext } from '@aurelia/runtime-html';

@valueConverter('wordCount')
export class WordCountValueConverter {
  toView(value: string, minimum: number): string {
    const count = value.split(/\s+/u).filter(Boolean).length;
    return count >= minimum ? `${count} words` : 'too short';
  }
}

@valueConverter('minimumLength')
export class MinimumLengthValueConverter {
  toView(values: readonly string[], minimum: number): readonly string[] {
    return values.filter((value) => value.length >= minimum);
  }
}

@valueConverter('identityOnly')
export class IdentityOnlyValueConverter {
  readonly label = 'identity-only';
}

@valueConverter('contextualWord')
export class ContextualWordValueConverter {
  readonly withContext = true;

  toView(value: string, caller: ICallerContext, minimum: number): string {
    const prefix = caller.binding == null ? 'unbound' : 'bound';
    const count = value.split(/\s+/u).filter(Boolean).length;
    return count >= minimum ? `${prefix}:${count}` : prefix;
  }
}

@valueConverter('contextFirst')
export class ContextFirstValueConverter {
  readonly withContext = true;

  toView(value: string, caller: ICallerContext, minimum: number): string;
  toView(value: string, minimum: string): number;
  toView(value: string, callerOrMinimum: ICallerContext | string, minimum?: number): string | number {
    if (typeof callerOrMinimum === 'string') {
      return callerOrMinimum.length;
    }
    const count = value.split(/\s+/u).filter(Boolean).length;
    return count >= (minimum ?? 0) ? `${count} words` : 'too short';
  }
}

@valueConverter('dynamicContextualWord')
export class DynamicContextualWordValueConverter {
  withContext: boolean = true;

  toView(value: string, caller: ICallerContext, minimum: number): string;
  toView(value: string, minimum: number): number;
  toView(value: string, callerOrMinimum: ICallerContext | number, minimum?: number): string | number {
    const resolvedMinimum = typeof callerOrMinimum === 'number' ? callerOrMinimum : minimum ?? 0;
    const count = value.split(/\s+/u).filter(Boolean).length;
    if (typeof callerOrMinimum === 'number') {
      return count >= resolvedMinimum ? count : 0;
    }
    return count >= resolvedMinimum ? `${count} dynamic words` : 'too short';
  }
}
