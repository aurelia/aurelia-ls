import { customElement } from 'aurelia';
import template from './app.html';

@customElement({
  name: 'app-root',
  template,
})
export class App {
  message = 'di registration open reasons';
}

/** Recognized project resource deliberately omitted from every closed registration. */
@customElement({
  name: 'open-candidate',
  template: '<template>open candidate</template>',
})
export class OpenCandidate {}
