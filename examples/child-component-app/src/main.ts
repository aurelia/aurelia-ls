import Aurelia from 'aurelia';
import { MyApp } from './my-app';

// Client-side hydration entry point
// The server renders with SSR, then this takes over for interactivity
Aurelia.app(MyApp).start();
