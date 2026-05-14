import { resolve } from '@aurelia/kernel';
import { Aurelia, StandardConfiguration } from '@aurelia/runtime-html';
import {
  LookupService,
  ResolveContextApp,
} from './resolve-context-app';

const moduleLookup = resolve(LookupService);

class StaticResolveHolder {
  static lookup = resolve(LookupService);
}

function callerDependentLookup(): LookupService {
  return resolve(LookupService);
}

void moduleLookup;
void StaticResolveHolder.lookup;
void callerDependentLookup;

new Aurelia()
  .register(
    StandardConfiguration,
    LookupService,
  )
  .app({
    host: document.querySelector('resolve-context-app') ?? document.body,
    component: ResolveContextApp,
  })
  .start();
