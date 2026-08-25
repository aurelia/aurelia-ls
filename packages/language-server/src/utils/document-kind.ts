import {
  inferSourceLanguage,
  SourceLanguage,
} from "@aurelia-ls/semantic-runtime";

export function isTemplateDocument(doc: { readonly uri: string }): boolean {
  return inferSourceLanguage(doc.uri) === SourceLanguage.Html;
}

export function isScriptDocument(doc: { readonly uri: string }): boolean {
  const language = inferSourceLanguage(doc.uri);
  return language === SourceLanguage.TypeScript || language === SourceLanguage.JavaScript;
}

export function isAnalyzedSourceDocumentUri(uri: string): boolean {
  return inferSourceLanguage(uri) !== SourceLanguage.Unknown;
}

export function languageIdForSource(source: string): string {
  switch (inferSourceLanguage(source)) {
    case SourceLanguage.TypeScript: return "typescript";
    case SourceLanguage.JavaScript: return "javascript";
    case SourceLanguage.Json: return "json";
    case SourceLanguage.Css: return "css";
    case SourceLanguage.Html: return "html";
    case SourceLanguage.Unknown: return "plaintext";
  }
}
