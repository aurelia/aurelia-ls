import { describe, expect, test } from 'vitest';

import {
  isLocalTemplateAuthoringIssueKind,
  TemplateCompilerIssueKind,
} from '../src/template/compiler-issue.js';

describe('template compiler issue authority classification', () => {
  test('keeps exactly the seven broad _compileLocalElement findings out of reached refusal authority', () => {
    const authoringKinds = [
      TemplateCompilerIssueKind.OnlyLocalTemplates,
      TemplateCompilerIssueKind.LocalTemplateNotUnderRoot,
      TemplateCompilerIssueKind.LocalTemplateBindableNotUnderRoot,
      TemplateCompilerIssueKind.LocalTemplateBindableNameMissing,
      TemplateCompilerIssueKind.LocalTemplateBindableDuplicate,
      TemplateCompilerIssueKind.LocalTemplateNameEmpty,
      TemplateCompilerIssueKind.LocalTemplateNameDuplicate,
    ];
    expect(authoringKinds).toHaveLength(7);
    expect(authoringKinds.every(isLocalTemplateAuthoringIssueKind)).toBe(true);
    expect(isLocalTemplateAuthoringIssueKind(TemplateCompilerIssueKind.RootTemplateCannotBeLocal))
      .toBe(false);
    expect(isLocalTemplateAuthoringIssueKind(TemplateCompilerIssueKind.InvalidSurrogateAttribute))
      .toBe(false);
  });
});
