export function appendRuntimeBindingProductValue<TValue>(
  map: Map<string, TValue[]>,
  bindingProductHandle: string,
  value: TValue,
): void {
  let values = map.get(bindingProductHandle);
  if (values === undefined) {
    values = [];
    map.set(bindingProductHandle, values);
  }
  values.push(value);
}
