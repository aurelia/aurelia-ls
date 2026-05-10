export function bindableAttributeNameForProperty(name: string): string {
  return name.replace(/([A-Z])/g, (_match, char: string) => `-${char.toLowerCase()}`);
}
