/**
 * Fixture: Let element for computed values
 *
 * Tests: hydrateLetElement instructions
 */

import { customElement } from "aurelia";

@customElement({
  name: "computed-values",
  template: `
    <let full-name.bind="firstName + ' ' + lastName"></let>
    <let age-in-months.bind="age * 12" to-binding-context></let>

    <h1>\${fullName}</h1>
    <p>Age: \${age} years (\${ageInMonths} months)</p>

    <let discount.bind="total > 100 ? 0.1 : 0"></let>
    <let final-price.bind="total * (1 - discount)"></let>
    <p>Total: $\${total} → Final: $\${finalPrice}</p>
  `,
})
export class ComputedValues {
  firstName = "John";
  lastName = "Doe";
  age = 25;
  total = 150;
}
