export interface TemplateControllerSwitchCaseBranchRequest<TCase> {
  readonly cases: readonly TCase[];
  readonly current: TCase;
  readonly readFallThrough: (candidate: TCase) => boolean | null;
}

export class TemplateControllerSwitchCaseBranch<TCase> {
  constructor(
    readonly activeCases: readonly TCase[],
    readonly excludedCases: readonly TCase[],
  ) {}
}

/** Framework-shaped active-case topology for runtime-html Switch/Case first-match and fall-through behavior. */
export function templateControllerSwitchCaseBranch<TCase>(
  request: TemplateControllerSwitchCaseBranchRequest<TCase>,
): TemplateControllerSwitchCaseBranch<TCase> | null {
  const currentIndex = request.cases.indexOf(request.current);
  if (currentIndex < 0) {
    return null;
  }

  const active = new Set<TCase>([request.current]);
  for (let index = currentIndex - 1; index >= 0; index -= 1) {
    const candidate = request.cases[index];
    if (candidate == null) {
      return null;
    }
    const fallThrough = request.readFallThrough(candidate);
    if (fallThrough == null) {
      return null;
    }
    if (!fallThrough) {
      break;
    }
    active.add(candidate);
  }

  const activeCases: TCase[] = [];
  const excludedCases: TCase[] = [];
  for (let index = 0; index <= currentIndex; index += 1) {
    const candidate = request.cases[index];
    if (candidate == null) {
      return null;
    }
    if (active.has(candidate)) {
      activeCases.push(candidate);
    } else {
      excludedCases.push(candidate);
    }
  }

  return new TemplateControllerSwitchCaseBranch(activeCases, excludedCases);
}
