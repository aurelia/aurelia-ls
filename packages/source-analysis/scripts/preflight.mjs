import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(scriptDir, '..');

const continuityFiles = {
  campaign: resolve(packageRoot, 'docs/authority-first-campaign.md'),
  handoff: resolve(packageRoot, 'docs/current-handoff.md'),
  decisions: resolve(packageRoot, 'docs/decision-log.md'),
  state: resolve(packageRoot, 'docs/current-state.json'),
  protocol: resolve(packageRoot, 'docs/resume-protocol.md'),
  readme: resolve(packageRoot, 'README.md'),
  workingMap: resolve(packageRoot, 'docs/working-map.md'),
  roadmap: resolve(packageRoot, 'docs/roadmap.md'),
};

const missingFiles = Object.entries(continuityFiles)
  .filter(([, filePath]) => !existsSync(filePath))
  .map(([name, filePath]) => `${name}: ${filePath}`);

if (missingFiles.length > 0) {
  console.error('Source-analysis continuity preflight failed.\n');
  console.error('Missing required files:');
  for (const entry of missingFiles) {
    console.error(`- ${entry}`);
  }
  process.exit(1);
}

const state = parseState(continuityFiles.state);
const inProgressSteps = state.steps.filter((step) => step.status === 'in_progress');

if (inProgressSteps.length !== 1) {
  console.error('Source-analysis continuity preflight failed.\n');
  console.error(`Expected exactly one in_progress step, found ${inProgressSteps.length}.`);
  process.exit(1);
}

const currentStep = inProgressSteps[0];
const handoff = readFileSync(continuityFiles.handoff, 'utf8');
const currentObjective = extractSection(handoff, 'Current objective');
const nextSlice = extractSection(handoff, 'Exact next slice');
const worktreeStatus = readGitStatus(packageRoot);

console.log('Source-analysis continuity preflight');
console.log('');
console.log('Required read order:');
console.log('1. README.md');
console.log('2. docs/working-map.md');
console.log('3. docs/authority-first-campaign.md');
console.log('4. docs/current-handoff.md');
console.log('5. docs/decision-log.md');
console.log('6. docs/current-state.json');
console.log('7. docs/roadmap.md');
console.log('');
console.log(`Campaign: ${state.campaignId}`);
console.log(`Current step: ${currentStep.id} - ${currentStep.title}`);
if (currentObjective) {
  console.log('');
  console.log('Current objective:');
  console.log(indentLines(currentObjective));
}
if (nextSlice) {
  console.log('');
  console.log('Exact next slice:');
  console.log(indentLines(nextSlice));
}
console.log('');
console.log(`Pending steps after current: ${state.steps.filter((step) => step.status === 'pending').length}`);
console.log(`Worktree: ${worktreeStatus.length === 0 ? 'clean' : 'dirty'}`);
if (worktreeStatus.length > 0) {
  console.log('');
  console.log('Worktree status:');
  for (const line of worktreeStatus) {
    console.log(`  ${line}`);
  }
}

function parseState(statePath) {
  const parsed = JSON.parse(readFileSync(statePath, 'utf8'));
  if (parsed == null || typeof parsed !== 'object') {
    throw new Error('current-state.json did not parse into an object.');
  }
  if (!Array.isArray(parsed.steps)) {
    throw new Error('current-state.json must contain a steps array.');
  }
  for (const step of parsed.steps) {
    if (step == null || typeof step !== 'object') {
      throw new Error('Each step must be an object.');
    }
    if (typeof step.id !== 'string' || typeof step.title !== 'string' || typeof step.status !== 'string') {
      throw new Error('Each step must contain string id, title, and status fields.');
    }
  }
  return parsed;
}

function extractSection(markdown, heading) {
  const escapedHeading = escapeRegExp(heading);
  const pattern = new RegExp(`## ${escapedHeading}\\r?\\n\\r?\\n([\\s\\S]*?)(?:\\r?\\n## |$)`);
  const match = markdown.match(pattern);
  return match?.[1]?.trim() ?? '';
}

function indentLines(value) {
  return value
    .split(/\r?\n/)
    .map((line) => `  ${line}`)
    .join('\n');
}

function readGitStatus(cwd) {
  const output = execSync('git status --short', {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  return output
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.length > 0);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

