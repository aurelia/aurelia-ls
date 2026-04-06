import { customElement } from "./aurelia.js";
import { resourceNames } from "./resource-names.js";

@customElement({
  name: resourceNames.inlineNotice,
  template: "<inline-notice>${message}</inline-notice>"
})
export class InlineNotice {}
