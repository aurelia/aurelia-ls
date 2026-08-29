export const AOT_TEMPLATE_QUERY = "aurelia-aot";

export function toAotTemplateSpecifier(specifier: string): string {
  const hashIndex = specifier.indexOf("#");
  const beforeHash = hashIndex < 0 ? specifier : specifier.slice(0, hashIndex);
  const hash = hashIndex < 0 ? "" : specifier.slice(hashIndex);
  const separator = beforeHash.includes("?") ? "&" : "?";
  return `${beforeHash}${separator}${AOT_TEMPLATE_QUERY}${hash}`;
}

export function isAotTemplateId(id: string): boolean {
  const query = queryOf(id);
  return query != null && query.split("&").some((entry) => queryKey(entry) === AOT_TEMPLATE_QUERY);
}

export function sourcePathFromAotTemplateId(id: string): string {
  const hashIndex = id.indexOf("#");
  const withoutHash = hashIndex < 0 ? id : id.slice(0, hashIndex);
  const queryIndex = withoutHash.indexOf("?");
  if (queryIndex < 0) {
    return withoutHash;
  }

  const sourcePath = withoutHash.slice(0, queryIndex);
  const remaining = withoutHash.slice(queryIndex + 1)
    .split("&")
    .filter((entry) => queryKey(entry) !== AOT_TEMPLATE_QUERY)
    .join("&");
  return remaining.length === 0 ? sourcePath : `${sourcePath}?${remaining}`;
}

function queryOf(id: string): string | undefined {
  const queryIndex = id.indexOf("?");
  if (queryIndex < 0) {
    return undefined;
  }
  const hashIndex = id.indexOf("#", queryIndex);
  return id.slice(queryIndex + 1, hashIndex < 0 ? undefined : hashIndex);
}

function queryKey(entry: string): string {
  const separator = entry.indexOf("=");
  return separator < 0 ? entry : entry.slice(0, separator);
}
