/** WHATWG ASCII-lowercase transform; non-ASCII code points are deliberately preserved. */
export function htmlAsciiLowercase(value: string): string {
  return value.replace(/[A-Z]/gu, (character) =>
    String.fromCharCode(character.charCodeAt(0) + 0x20));
}

/** WHATWG ASCII-uppercase transform; non-ASCII code points are deliberately preserved. */
export function htmlAsciiUppercase(value: string): string {
  return value.replace(/[a-z]/gu, (character) =>
    String.fromCharCode(character.charCodeAt(0) - 0x20));
}
