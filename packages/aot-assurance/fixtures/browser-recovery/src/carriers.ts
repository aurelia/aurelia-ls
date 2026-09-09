import { customElement } from 'aurelia';

// Current TemplateElementFactory checks immediate siblings of the sole template.
// The comments shield the outside text; it must not become rendered content.
@customElement({ name: 'selected-carrier', template: 'discard-before<!--shield--><template><b id="selected-content">${message}</b></template><!--shield-->discard-after' })
export class SelectedCarrier { message = 'selected'; }

// Multiple elements prevent selecting an inner template as the resource carrier.
@customElement({ name: 'wrapped-carrier', template: '<i id="wrapped-before">${message}</i><template id="wrapped-inert"><b>${message}</b></template><i id="wrapped-after">${message}</i>' })
export class WrappedCarrier { message = 'wrapped'; }
