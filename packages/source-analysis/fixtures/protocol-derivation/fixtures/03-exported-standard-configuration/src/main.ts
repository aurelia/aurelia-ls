import { Aurelia } from '@aurelia/runtime-html';
import { AppConfig } from './app-config';
import { AppRoot } from './app-root';

void Aurelia.register(AppConfig).app(AppRoot).start();
