import Aurelia from 'aurelia';
import { ExpressionResourceCombinatorsApp } from './expression-resource-combinators-app';

void Aurelia.app({
  host: document.querySelector('app-root')!,
  component: ExpressionResourceCombinatorsApp,
}).start();
