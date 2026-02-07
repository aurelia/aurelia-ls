#!/usr/bin/env node
/**
 * SSR Build Script
 *
 * Builds the SSR entry point using esbuild with Aurelia transform.
 * This avoids Vite's vite:build-html plugin which conflicts with
 * Aurelia's .html template transformation.
 *
 * Usage:
 *   npm run build:ssr
 */

import { readFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import esbuild from 'esbuild';
import ts from 'typescript';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');
const packagesRoot = resolve(projectRoot, '../..');

// Import the transform package dynamically (from workspace)
const transformPath = pathToFileURL(resolve(packagesRoot, 'packages/transform/out/index.js')).href;
const ssrPath = pathToFileURL(resolve(packagesRoot, 'packages/ssr/out/index.js')).href;
const resolutionPath = pathToFileURL(resolve(packagesRoot, 'packages/compiler/out/index.js')).href;

const { transform } = await import(transformPath);
const { compileWithAot } = await import(ssrPath);
const { resolve: runResolution } = await import(resolutionPath);

console.log('='.repeat(60));
console.log('SSR BUILD');
console.log('='.repeat(60));
console.log();

// Step 1: Run resolution to discover components
console.log('Step 1: Discovering resources...');
const tsconfigPath = resolve(projectRoot, 'tsconfig.json');
const configFile = ts.readConfigFile(tsconfigPath, ts.sys.readFile);
const parsedConfig = ts.parseJsonConfigFileContent(configFile.config, ts.sys, projectRoot);
const program = ts.createProgram({ rootNames: parsedConfig.fileNames, options: parsedConfig.options });

const logger = {
  log: () => {},
  info: (msg) => console.log(`  ${msg}`),
  warn: (msg) => console.log(`  WARN: ${msg}`),
  error: (msg) => console.log(`  ERROR: ${msg}`),
};

const resolution = runResolution(program, {}, logger);
console.log(`  Found ${resolution.candidates.length} resources, ${resolution.templates.length} templates`);
console.log();

// Step 2: Build component transforms map
console.log('Step 2: Compiling templates...');
const transforms = new Map();

for (const templateInfo of resolution.templates) {
  const templateContent = readFileSync(templateInfo.templatePath, 'utf-8');
  const aot = compileWithAot(templateContent, {
    templatePath: templateInfo.templatePath,
    name: templateInfo.resourceName,
    semantics: resolution.semantics,
    resourceGraph: resolution.resourceGraph,
    resourceScope: templateInfo.scopeId,
  });

  // Get bindables from candidate
  const candidate = resolution.candidates.find(c => c.className === templateInfo.className);

  transforms.set(templateInfo.componentPath, {
    templateInfo,
    aot,
    candidate,
  });

  console.log(`  ${templateInfo.className}: ${aot.raw.codeResult.expressions.length} expressions`);
}
console.log();

// Step 3: Create esbuild plugin for transforms
console.log('Step 3: Building SSR bundle...');

const aureliaPlugin = {
  name: 'aurelia-transform',
  setup(build) {
    // Transform .html imports to inline JS
    build.onLoad({ filter: /\.html$/ }, async (args) => {
      const content = readFileSync(args.path, 'utf-8');
      // Convert to JS module that exports the template
      const js = `export default ${JSON.stringify(content)};`;
      return { contents: js, loader: 'js' };
    });

    // Transform component .ts files to inject $au
    build.onLoad({ filter: /\.ts$/ }, async (args) => {
      const source = readFileSync(args.path, 'utf-8');

      // Check if this is a component we need to transform
      const normalizedPath = args.path.replace(/\\/g, '/');
      let transformData = null;
      for (const [compPath, data] of transforms) {
        if (normalizedPath.includes(compPath) || compPath.includes(normalizedPath.split('/').slice(-2).join('/'))) {
          transformData = data;
          break;
        }
      }

      if (transformData) {
        const { templateInfo, aot, candidate } = transformData;
        try {
          const result = transform({
            source,
            filePath: args.path,
            aot: aot.raw.codeResult,
            resource: {
              kind: 'custom-element',
              name: templateInfo.resourceName,
              className: templateInfo.className,
              bindables: candidate?.bindables ?? [],
              declarationForm: 'decorator',
            },
            template: aot.template,
            nestedHtmlTree: aot.raw.nestedHtmlTree,
            removeDecorators: true,
            includeComments: false,
          });
          return { contents: result.code, loader: 'ts' };
        } catch (error) {
          console.error(`  Transform error for ${templateInfo.className}:`, error.message);
        }
      }

      return { contents: source, loader: 'ts' };
    });
  },
};

// Build
mkdirSync(resolve(projectRoot, 'dist/server'), { recursive: true });

await esbuild.build({
  entryPoints: [resolve(projectRoot, 'src/entry-server.ts')],
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node18',
  outfile: resolve(projectRoot, 'dist/server/entry-server.js'),
  plugins: [aureliaPlugin],
  external: [
    '@aurelia/*',
    'aurelia',
    '@aurelia-ls/*',
  ],
  // Don't include node_modules in bundle
  packages: 'external',
});

console.log('  Built: dist/server/entry-server.js');
console.log();
console.log('='.repeat(60));
console.log('DONE');
console.log('='.repeat(60));
