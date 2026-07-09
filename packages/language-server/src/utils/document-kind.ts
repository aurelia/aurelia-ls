export function isTemplateDocument(doc: { readonly languageId: string }): boolean {
  return doc.languageId === "html";
}

export function isScriptDocumentUri(uri: string): boolean {
  const lower = uri.toLowerCase();
  return lower.endsWith(".ts") || lower.endsWith(".js") || lower.endsWith(".tsx") || lower.endsWith(".jsx");
}

export function isTemplateDocumentUri(uri: string): boolean {
  return uri.toLowerCase().endsWith(".html");
}

export function isAnalyzedSourceDocumentUri(uri: string): boolean {
  return isTemplateDocumentUri(uri) || isScriptDocumentUri(uri);
}
