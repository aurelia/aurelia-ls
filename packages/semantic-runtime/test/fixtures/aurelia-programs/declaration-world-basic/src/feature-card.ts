import { CustomElement } from "./aurelia.js";

export const FeatureCard = CustomElement.define(
  {
    name: "feature-card",
    template: "<feature-card>${title}</feature-card>"
  },
  class FeatureCard {}
);
