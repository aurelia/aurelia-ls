/** AttributeBinding and SetClassAttributeRenderer separate class names on literal U+0020. */
export function runtimeClassNames(value: string): readonly string[] {
  return value.split(' ').filter(name => name.length > 0);
}

/** Aurelia kernel word boundaries shared by binding targets and conventional resource names. */
export function camelCase(input: string): string {
  return baseCase(input, (char, separator) => separator ? char.toUpperCase() : char.toLowerCase());
}

export function kebabCase(input: string): string {
  return baseCase(input, (char, separator) => separator ? `-${char.toLowerCase()}` : char.toLowerCase());
}

function baseCase(
  input: string,
  map: (char: string, separator: boolean) => string,
): string {
  let separator = false;
  let output = '';
  let previousKind = CharKind.None;
  let current = input.charAt(0);
  let currentKind = charKind(current);

  for (let index = 0; index < input.length; index++) {
    const previous = previousKind;
    const char = current;
    const kind = currentKind;
    current = input.charAt(index + 1);
    currentKind = charKind(current);

    if (kind === CharKind.None) {
      if (output.length > 0) {
        separator = true;
      }
      previousKind = kind;
      continue;
    }

    if (!separator && output.length > 0 && kind === CharKind.Upper) {
      separator = previous === CharKind.Lower || currentKind === CharKind.Lower;
    }
    output += map(char, separator);
    separator = false;
    previousKind = kind;
  }

  return output;
}

const enum CharKind {
  None,
  Digit,
  Upper,
  Lower,
}

function charKind(char: string): CharKind {
  if (char.length === 0) {
    return CharKind.None;
  }
  if (char !== char.toUpperCase()) {
    return CharKind.Lower;
  }
  if (char !== char.toLowerCase()) {
    return CharKind.Upper;
  }
  return char >= '0' && char <= '9' ? CharKind.Digit : CharKind.None;
}
