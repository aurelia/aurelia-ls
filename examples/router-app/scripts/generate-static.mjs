#!/usr/bin/env node
/**
 * Static Site Generation Script
 *
 * Generates static HTML files from the built SSR handler.
 * Run this after building both client and SSR bundles.
 *
 * Usage:
 *   npm run build:ssg
 *   # or directly:
 *   node scripts/generate-static.mjs
 */

import { writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');
const distDir = resolve(projectRoot, 'dist');
const serverDir = resolve(distDir, 'server');

// Routes to generate
const routes = ['/', '/about'];

async function main() {
  console.log('='.repeat(60));
  console.log('STATIC SITE GENERATION');
  console.log('='.repeat(60));
  console.log();

  // Load the SSR handler
  const handlerPath = join(serverDir, 'entry-server.js');
  console.log(`Loading SSR handler from: ${handlerPath}`);

  let handler;
  try {
    const handlerModule = await import(`file://${handlerPath.replace(/\\/g, '/')}`);
    handler = handlerModule.default;
  } catch (error) {
    console.error(`Failed to load SSR handler: ${error.message}`);
    console.error('Make sure you have run: npm run build:ssr');
    process.exit(1);
  }

  console.log('SSR handler loaded successfully');
  console.log();

  // Generate each route
  console.log('Generating static pages...');
  console.log('-'.repeat(60));

  for (const route of routes) {
    try {
      const result = await handler.render(route);

      // Determine output path
      const outputPath = route === '/'
        ? join(distDir, 'index.html')
        : join(distDir, route.slice(1), 'index.html');

      // Ensure directory exists
      mkdirSync(dirname(outputPath), { recursive: true });

      // Write the HTML file
      writeFileSync(outputPath, result.html);

      console.log(`  ${route.padEnd(15)} → ${outputPath.replace(projectRoot, '.')}`);
    } catch (error) {
      console.error(`  ${route.padEnd(15)} ✗ ${error.message}`);
    }
  }

  // Generate 404 page
  try {
    const result = await handler.render('/404');
    const outputPath = join(distDir, '404.html');
    writeFileSync(outputPath, result.html);
    console.log(`  /404           → ./dist/404.html`);
  } catch (error) {
    console.error(`  /404           ✗ ${error.message}`);
  }

  console.log();
  console.log('='.repeat(60));
  console.log('DONE');
  console.log('='.repeat(60));
  console.log();
  console.log('Static files generated in: ./dist/');
  console.log();
  console.log('To preview:');
  console.log('  npx serve dist');
  console.log();
}

main().catch(console.error);
