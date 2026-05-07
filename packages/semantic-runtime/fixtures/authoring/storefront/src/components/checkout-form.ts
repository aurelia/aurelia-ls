import { customElement } from '@aurelia/runtime-html';
import { resolve } from '@aurelia/kernel';
import { StorefrontState, type CheckoutAddon, type ContactPreference, type FulfillmentMethod } from '../state/storefront-state';
import { FieldShell } from './field-shell';
import template from './checkout-form.html';

@customElement({
  name: 'checkout-form',
  template,
  dependencies: [FieldShell],
})
export class CheckoutForm {
  private readonly state = resolve(StorefrontState);

  readonly shipFulfillmentMethod = 'ship';
  readonly pickupFulfillmentMethod = 'pickup';
  readonly emailContactPreference = 'email';
  readonly phoneContactPreference = 'phone';
  readonly installationAddOn = 'installation';
  readonly supportAddOn = 'support';
  checkoutFormElement: HTMLFormElement | null = null;

  get email(): string {
    return this.state.checkout.email;
  }

  set email(value: string) {
    this.state.checkout.email = value;
  }

  get fulfillmentMethod(): FulfillmentMethod {
    return this.state.checkout.fulfillmentMethod;
  }

  set fulfillmentMethod(value: FulfillmentMethod) {
    this.state.checkout.fulfillmentMethod = value;
  }

  get contactPreference(): ContactPreference {
    return this.state.checkout.contactPreference;
  }

  set contactPreference(value: ContactPreference) {
    this.state.checkout.contactPreference = value;
  }

  get selectedAddOns(): CheckoutAddon[] {
    return this.state.checkout.selectedAddOns;
  }

  get postalCode(): string {
    return this.state.checkout.postalCode;
  }

  set postalCode(value: string) {
    this.state.checkout.postalCode = value;
  }

  get giftWrap(): boolean {
    return this.state.checkout.giftWrap;
  }

  set giftWrap(value: boolean) {
    this.state.checkout.giftWrap = value;
  }

  get instructions(): string {
    return this.state.checkout.instructions;
  }

  set instructions(value: string) {
    this.state.checkout.instructions = value;
  }

  get requiresPostalCode(): boolean {
    return this.state.checkout.requiresPostalCode;
  }

  get canSubmit(): boolean {
    return this.state.checkout.canSubmit;
  }

  get checkoutPanelClasses(): Record<string, boolean> {
    return {
      'checkout-panel': true,
      'checkout-panel-ready': this.canSubmit,
      'checkout-panel-needs-details': !this.canSubmit,
      'checkout-panel-submitted': this.state.checkout.submitCount > 0,
    };
  }

  get checkoutPanelStyles(): Record<string, string> {
    return {
      borderColor: this.statusAccentColor,
      '--checkout-accent': this.statusAccentColor,
      'accent-color': this.statusAccentColor,
    };
  }

  get statusToneClass(): string {
    return this.canSubmit ? 'quote-ready' : 'quote-needs-details';
  }

  get checkoutStateName(): string {
    return this.canSubmit ? 'ready' : 'needs-details';
  }

  get checkoutStateDataId(): string {
    return `checkout-${this.checkoutStateName}`;
  }

  get ariaInvalid(): string {
    return String(!this.canSubmit);
  }

  get statusAccentColor(): string {
    return this.canSubmit ? '#2f7d32' : '#9a5b13';
  }

  get statusBackgroundColor(): string {
    return this.canSubmit
      ? 'color-mix(in srgb, #2f7d32 12%, transparent)'
      : 'color-mix(in srgb, #9a5b13 14%, transparent)';
  }

  get statusTextColor(): string {
    return this.canSubmit ? '#1f5d23' : '#6f3f08';
  }

  get statusDecoration(): string {
    return this.canSubmit ? 'none' : 'underline';
  }

  get fulfillmentClassTokens(): readonly string[] {
    return [
      'fulfillment-summary',
      this.requiresPostalCode ? 'fulfillment-shipping' : 'fulfillment-pickup',
    ];
  }

  get fulfillmentStyles(): Record<string, string> {
    return {
      'border-inline-start-color': this.statusAccentColor,
      '--fulfillment-gap': this.requiresPostalCode ? '0.75rem' : '0.5rem',
    };
  }

  get submitButtonPadding(): string {
    return this.canSubmit ? '0.65rem 1rem' : '0.65rem 0.85rem';
  }

  get submitButtonOutline(): string {
    return this.canSubmit ? '2px solid transparent' : `2px dashed ${this.statusAccentColor}`;
  }

  get progressWidth(): string {
    return this.canSubmit ? '100' : '42';
  }

  get progressStrokeWidth(): string {
    return this.canSubmit ? '4' : '3';
  }

  get progressLabel(): string {
    return this.canSubmit ? 'Checkout details are complete' : 'Checkout details need attention';
  }

  get submitCountText(): string {
    return String(this.state.checkout.submitCount);
  }

  get statusMessage(): string {
    return this.state.checkout.statusMessage;
  }

  requestQuote(): void {
    this.state.checkout.submit();
  }
}
