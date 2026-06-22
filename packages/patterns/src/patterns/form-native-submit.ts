import type { AureliaPatternExample } from '../pattern-contract.js';

export const formNativeSubmitPattern: AureliaPatternExample = {
  patternId: 'form.native-submit',
  title: 'Native form submission state',
  guidance: {
    summary: 'Use a component view-model to collect native form input, handle submit.trigger, show submission feedback, and keep server work behind a replaceable handoff.',
    whenToUse: [
      'You need a single component form with ordinary text, email, or textarea fields.',
      'Browser constraint validation is enough for the first interaction layer.',
      'The form draft and submit messages belong to the component view lifetime.'
    ],
    whenNotToUse: [
      'The form needs validation-plugin rules, cross-field validation, or reusable validation display components.',
      'The flow is multi-step, dynamic, autosaved, or guarded by router navigation hooks.',
      'The submit boundary is already shared by multiple components and should start as an injected service.'
    ]
  },
  source: {
    files: [
      {
        path: 'native-form-submit.ts',
        language: 'ts',
        contents: `export interface ContactMessage {
  name: string;
  email: string;
  message: string;
}

export class NativeFormSubmit {
  formData: ContactMessage = {
    name: '',
    email: '',
    message: ''
  };

  isSubmitting = false;
  successMessage = '';
  errorMessage = '';

  async handleSubmit(): Promise<void> {
    if (this.isSubmitting) {
      return;
    }

    this.isSubmitting = true;
    this.successMessage = '';
    this.errorMessage = '';

    try {
      await this.submitContactMessage(this.normalizedPayload());
      this.successMessage = 'Message sent.';
      this.resetForm();
    } catch {
      this.errorMessage = 'The message could not be sent. Please try again.';
    } finally {
      this.isSubmitting = false;
    }
  }

  resetForm(): void {
    this.formData = {
      name: '',
      email: '',
      message: ''
    };
  }

  private normalizedPayload(): ContactMessage {
    return {
      name: this.formData.name.trim(),
      email: this.formData.email.trim().toLowerCase(),
      message: this.formData.message.trim()
    };
  }

  private async submitContactMessage(message: ContactMessage): Promise<void> {
    await Promise.resolve(message);
  }
}
`
      },
      {
        path: 'native-form-submit.html',
        language: 'html',
        contents: `<form submit.trigger="handleSubmit()">
  <div>
    <label for="contact-name">Name</label>
    <input
      id="contact-name"
      type="text"
      value.bind="formData.name"
      autocomplete="name"
      required
      maxlength="120"
    >
  </div>

  <div>
    <label for="contact-email">Email</label>
    <input
      id="contact-email"
      type="email"
      value.bind="formData.email"
      autocomplete="email"
      required
    >
  </div>

  <div>
    <label for="contact-message">Message</label>
    <textarea
      id="contact-message"
      value.bind="formData.message"
      rows="5"
      minlength="10"
      maxlength="1000"
      required
    ></textarea>
  </div>

  <p if.bind="successMessage" role="status">\${successMessage}</p>
  <p if.bind="errorMessage" role="alert">\${errorMessage}</p>

  <button type="submit" disabled.bind="isSubmitting">
    \${isSubmitting ? 'Sending...' : 'Send message'}
  </button>
</form>
`
      }
    ]
  },
  adaptation: {
    assumptions: [
      {
        summary: 'The browser can enforce required, type, minlength, and maxlength constraints before submit handling runs.'
      },
      {
        summary: 'Server-side validation remains canonical even when native constraints are present.'
      },
      {
        summary: 'The stub submit method exists only to mark the app-specific API boundary.'
      }
    ],
    handoffNotes: [
      {
        summary: 'Replace the stub submit method with the real application boundary.',
        action: 'Call an injected service or API client from `submitContactMessage` once the app-specific endpoint exists.'
      },
      {
        summary: 'Move submission out of the component when it becomes shared or operationally complex.',
        action: 'Introduce an injected service once submission needs authentication, retries, caching, tests, or reuse from another component.'
      },
      {
        summary: 'Add validation-plugin rules only when native constraints are no longer enough.',
        action: 'Keep simple required/type/minlength checks native; add @aurelia/validation for cross-field, async, reusable, or server-shaped validation.'
      }
    ]
  },
  support: {
    refs: [
      {
        title: 'Form Basics',
        url: 'https://docs.aurelia.io/templates/forms'
      },
      {
        title: 'Form Submission',
        url: 'https://docs.aurelia.io/templates/forms/submission'
      }
    ]
  }
};
