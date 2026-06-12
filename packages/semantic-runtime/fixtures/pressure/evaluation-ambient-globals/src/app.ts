import { customElement } from 'aurelia';
import template from './app.html';

export const declaredVersion = __APP_VERSION__;
export const declaredFeature = __FEATURE_FLAG__;
export const browserConstructor = CSSStyleSheet;
export const browserInstance = new CSSStyleSheet();
export const promiseConstructor = Promise;
export const hostPromise = Promise.resolve('ready');
export const missingBoundary = __MISSING_BUILD_VALUE__;

function installHostStylesheet(css: string): CSSStyleSheet {
  const sheet = new CSSStyleSheet();
  sheet.replaceSync(css);
  document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
  return sheet;
}

function createHostCanvasContext(): CanvasRenderingContext2D | null {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  context?.fillRect(0, 0, 10, 10);
  return context;
}

function createHostWebGlContext(): WebGLRenderingContext | null {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('webgl');
  context?.clearColor(0, 0, 0, 1);
  context?.clear(context.COLOR_BUFFER_BIT);
  return context;
}

function installHostInputLoop(): number {
  let lastKey = '';
  window.addEventListener('keydown', (event: KeyboardEvent) => {
    lastKey = event.key;
    localStorage.setItem('last-key', lastKey);
  });
  const frame = requestAnimationFrame((time) => {
    const stored = localStorage.getItem('last-key') ?? '';
    console.log(performance.now(), time, stored.length);
  });
  cancelAnimationFrame(frame);
  return frame;
}

function createHostAudioContext(): AudioContext {
  const context = new AudioContext();
  const gain = context.createGain();
  gain.gain.value = 0.25;
  gain.connect(context.destination);
  return context;
}

function createHostPromiseLabel(value: Promise<string>): Promise<string> {
  return value.then((label) => label.toUpperCase());
}

interface EnemyTier {
  readonly tier: string;
  readonly basePower: number;
  readonly spawnCount: number;
}

function createGameBalanceReport(tiers: readonly EnemyTier[]): string {
  let totalPower = 0;
  const labels: string[] = [];
  for (let index = 0; index < tiers.length; index += 1) {
    const tier = tiers[index]!;
    const title = tier.tier.charAt(0).toUpperCase() + tier.tier.slice(1);
    const power = Math.max(1, tier.basePower * tier.spawnCount);
    totalPower += power;
    labels.push(`${title}:${'-'.repeat(Math.min(5, power))}`);
  }
  const average = totalPower / Math.max(1, tiers.length);
  return labels.join(' | ') + ` avg=${average}`;
}

export const installedHostStylesheet = installHostStylesheet(':host { display: block; }');
export const hostCanvasContext = createHostCanvasContext();
export const hostWebGlContext = createHostWebGlContext();
export const hostInputLoop = installHostInputLoop();
export const hostAudioContext = createHostAudioContext();
export const hostPromiseLabel = createHostPromiseLabel(hostPromise);
export const gameBalanceReport = createGameBalanceReport([
  { tier: 'scout', basePower: 1, spawnCount: 2 },
  { tier: 'brute', basePower: 2, spawnCount: 3 },
  { tier: 'boss', basePower: 5, spawnCount: 1 },
]);

@customElement({
  name: 'app-root',
  template,
})
export class App {
  version = declaredVersion;
  featureEnabled = declaredFeature;
  stylesheetConstructor = browserConstructor;
  stylesheet = browserInstance;
  installedStylesheet = installedHostStylesheet;
  canvasContext = hostCanvasContext;
  webGlContext = hostWebGlContext;
  inputLoop = hostInputLoop;
  audioContext = hostAudioContext;
  promise = hostPromiseLabel;
  balanceReport = gameBalanceReport;
  missing = missingBoundary;
}
