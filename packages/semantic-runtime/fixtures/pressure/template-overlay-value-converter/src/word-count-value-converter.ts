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
