import { customElement } from 'aurelia';
import template from './app.html';

export const declaredVersion = __APP_VERSION__;
export const declaredFeature = __FEATURE_FLAG__;
export const missingBoundary = __MISSING_BUILD_VALUE__;

@customElement({
  name: 'app-root',
  template,
})
export class App {
  version = declaredVersion;
  featureEnabled = declaredFeature;
  missing = missingBoundary;
}
