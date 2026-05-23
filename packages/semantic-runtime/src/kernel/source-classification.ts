import { extname } from 'node:path';
import {
  SourceFileRole,
  SourceLanguage,
} from './address.js';

/** Infer a coarse source language from a path extension. */
export function inferSourceLanguage(path: string): SourceLanguage {
  switch (extname(path).toLowerCase()) {
    case '.ts':
    case '.tsx':
    case '.mts':
    case '.cts':
      return SourceLanguage.TypeScript;
    case '.js':
    case '.jsx':
    case '.mjs':
    case '.cjs':
      return SourceLanguage.JavaScript;
    case '.html':
      return SourceLanguage.Html;
    case '.css':
      return SourceLanguage.Css;
    case '.json':
      return SourceLanguage.Json;
    default:
      return SourceLanguage.Unknown;
  }
}

/** Infer a source role without interpreting project config yet. */
export function inferSourceFileRole(path: string): SourceFileRole {
  const normalized = path.replace(/\\/g, '/').toLowerCase();
  const segments = normalized.split('/');
  const baseName = segments.at(-1) ?? normalized;
  const language = inferSourceLanguage(path);

  if (segments.includes('.aurelia-artifacts')) {
    return SourceFileRole.Generated;
  }
  if (isDeclarationFileName(baseName)) {
    return SourceFileRole.Declaration;
  }
  if (segments.includes('node_modules')) {
    return SourceFileRole.ExternalSource;
  }
  if (isExampleSourcePath(segments, baseName)) {
    return SourceFileRole.ExampleSource;
  }
  if (isTestSourcePath(segments, baseName)) {
    return SourceFileRole.TestSource;
  }
  if (isToolingConfigPath(baseName)) {
    return SourceFileRole.ToolingConfig;
  }
  if (baseName === 'package.json') {
    return SourceFileRole.PackageManifest;
  }

  switch (language) {
    case SourceLanguage.TypeScript:
    case SourceLanguage.JavaScript:
      return SourceFileRole.AppSource;
    case SourceLanguage.Html:
      return SourceFileRole.Template;
    case SourceLanguage.Css:
      return SourceFileRole.Style;
    case SourceLanguage.Json:
      return SourceFileRole.ToolingConfig;
    default:
      return SourceFileRole.Unknown;
  }
}

function isDeclarationFileName(baseName: string): boolean {
  return baseName.endsWith('.d.ts') || baseName.endsWith('.d.mts') || baseName.endsWith('.d.cts');
}

function isTestSourcePath(segments: readonly string[], baseName: string): boolean {
  return (
    segments.some((segment) =>
      segment === '__tests__' ||
      segment === 'test' ||
      segment === 'tests' ||
      segment === 'spec' ||
      segment === 'specs' ||
      segment === 'e2e'
    ) ||
    /\.(spec|test|e2e|cy)\.[cm]?[tj]sx?$/.test(baseName)
  );
}

function isExampleSourcePath(segments: readonly string[], baseName: string): boolean {
  return (
    segments.some((segment) =>
      segment === 'story' ||
      segment === 'stories' ||
      segment === 'demo' ||
      segment === 'demos'
    ) ||
    /\.(story|stories)\.[cm]?[tj]sx?$/.test(baseName)
  );
}

function isToolingConfigPath(baseName: string): boolean {
  return (
    /^(vite|vitest|webpack|rollup|jest|playwright|karma|tsup|eslint|prettier|postcss|tailwind|babel|commitlint)\.config\./.test(baseName) ||
    /^\.(eslint|prettier|commitlint|babel|stylelint|lintstaged)rc(?:\.[cm]?[jt]s(?:x)?|\.json)?$/.test(baseName) ||
    /^karma\.conf\.[cm]?js$/.test(baseName) ||
    baseName === 'tsconfig.json' ||
    baseName.startsWith('tsconfig.') ||
    baseName === 'jsconfig.json' ||
    baseName === 'nx.json' ||
    baseName === 'turbo.json'
  );
}
