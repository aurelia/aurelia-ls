import type { AureliaPatternExample } from '../pattern-contract.js';

export const formFileUploadPattern: AureliaPatternExample = {
  patternId: 'form.file-upload',
  title: 'Native file upload form',
  guidance: {
    summary: 'Use a native file input plus `FormData` when a component owns a direct upload interaction.',
    whenToUse: [
      'The user selects one or more files from a native file input.',
      'The upload can be represented as a normal form submission workflow.',
      'The component only owns transient selection, upload, and feedback state.'
    ],
    whenNotToUse: [
      'Uploads need resumable chunks, background queues, or cross-route state.',
      'The upload is part of a larger editor draft that should live in an injected service.',
      'The server requires a specialized SDK or signed upload transaction.'
    ]
  },
  source: {
    files: [
      {
        path: 'profile-upload.ts',
        language: 'ts',
        contents: `interface UploadResult {
  uploaded: number;
}

export class ProfileUpload {
  selectedFiles: File[] = [];
  isUploading = false;
  errorMessage = '';
  successMessage = '';

  handleFileSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedFiles = input.files === null ? [] : Array.from(input.files);
    this.errorMessage = '';
    this.successMessage = '';
  }

  async uploadFiles(): Promise<void> {
    if (this.selectedFiles.length === 0) {
      this.errorMessage = 'Choose at least one file before uploading.';
      return;
    }

    const formData = new FormData();
    for (const file of this.selectedFiles) {
      formData.append('files', file, file.name);
    }

    this.isUploading = true;
    this.errorMessage = '';
    this.successMessage = '';

    try {
      const response = await fetch('/api/profile/files', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(\`Upload failed: \${response.status}\`);
      }

      const result = await response.json() as UploadResult;
      this.successMessage = \`\${result.uploaded} file(s) uploaded.\`;
      this.selectedFiles = [];
    } catch (error) {
      this.errorMessage = error instanceof Error ? error.message : 'Upload failed.';
    } finally {
      this.isUploading = false;
    }
  }
}
`
      },
      {
        path: 'profile-upload.html',
        language: 'html',
        contents: `<form submit.trigger="uploadFiles()">
  <label for="profile-files">Profile files</label>
  <input
    id="profile-files"
    type="file"
    multiple
    change.trigger="handleFileSelect($event)"
    disabled.bind="isUploading">

  <p if.bind="selectedFiles.length > 0">\${selectedFiles.length} file(s) selected</p>
  <p if.bind="errorMessage" role="alert">\${errorMessage}</p>
  <p if.bind="successMessage" role="status">\${successMessage}</p>

  <button type="submit" disabled.bind="isUploading || selectedFiles.length === 0">
    Upload
  </button>
</form>
`
      }
    ]
  },
  adaptation: {
    assumptions: [
      {
        summary: 'The upload endpoint accepts multipart `FormData` from the browser.'
      },
      {
        summary: 'Selected files are transient component state.'
      },
      {
        summary: 'The component can clear local selection after a successful upload.'
      }
    ],
    handoffNotes: [
      {
        summary: 'Promote complex upload state intentionally.',
        action: 'Use an injected upload service when uploads need cancellation, retries, progress aggregation, or cross-component status.'
      },
      {
        summary: 'Keep native file semantics intact.',
        action: 'Let the browser own file picking and only copy the selected `File` objects into view-model state for the current interaction.'
      },
      {
        summary: 'Match server contract details separately.',
        action: 'Adapt field names, accepted file types, auth headers, and response parsing to the real endpoint before relying on the example shape.'
      }
    ]
  },
  support: {
    refs: [
      {
        title: 'File Uploads',
        url: 'https://docs.aurelia.io/templates/forms/file-uploads'
      },
      {
        title: 'Form Submission',
        url: 'https://docs.aurelia.io/templates/forms/submission'
      },
      {
        title: 'Working with Web Standards',
        url: 'https://docs.aurelia.io/developer-guides/working-with-web-standards'
      }
    ]
  }
};
