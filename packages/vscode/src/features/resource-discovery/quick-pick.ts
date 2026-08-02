import type {
  CancellationToken,
  QuickInputButton,
  QuickPickItem,
} from "vscode";
import type { VscodeApi } from "../../vscode-api.js";

export interface ResourceQuickPickModel<T extends QuickPickItem> {
  readonly title: string;
  readonly placeholder: string;
  readonly items: readonly T[];
  readonly step?: number;
  readonly totalSteps?: number;
}

export type ResourceQuickPickOutcome<T> =
  | { readonly status: "selected"; readonly value: T }
  | { readonly status: "back" }
  | { readonly status: "cancelled" };

/** Programmatic Quick Pick keeps loading, cancellation, empty, and back states inside the native control. */
export async function showResourceQuickPick<T extends QuickPickItem>(
  vscode: VscodeApi,
  initialTitle: string,
  load: (token: CancellationToken) => Promise<ResourceQuickPickModel<T>>,
  allowBack = false,
): Promise<ResourceQuickPickOutcome<T>> {
  const cancellation = new vscode.CancellationTokenSource();
  const picker = vscode.window.createQuickPick<T>();
  picker.title = initialTitle;
  picker.placeholder = "Discovering Aurelia resources...";
  picker.busy = true;
  if (allowBack) picker.buttons = [vscode.QuickInputButtons.Back];

  let settled = false;
  let settle!: (outcome: ResourceQuickPickOutcome<T>) => void;
  const outcome = new Promise<ResourceQuickPickOutcome<T>>((resolve) => { settle = resolve; });
  const finish = (value: ResourceQuickPickOutcome<T>): void => {
    if (settled) return;
    settled = true;
    settle(value);
    picker.hide();
  };
  const subscriptions = [
    picker.onDidAccept(() => {
      const selected = picker.selectedItems[0];
      if (selected != null) finish({ status: "selected", value: selected });
    }),
    picker.onDidHide(() => {
      cancellation.cancel();
      finish({ status: "cancelled" });
    }),
    picker.onDidTriggerButton((button: QuickInputButton) => {
      if (allowBack && button === vscode.QuickInputButtons.Back) finish({ status: "back" });
    }),
  ];
  picker.show();

  try {
    const loading = load(cancellation.token).then(
      (model) => ({ status: "loaded" as const, model }),
      (error: unknown) => ({ status: "failed" as const, error }),
    );
    const first = await Promise.race([
      loading,
      outcome.then((value) => ({ status: "outcome" as const, value })),
    ]);
    if (first.status === "outcome") return first.value;
    if (first.status === "failed") {
      if (cancellation.token.isCancellationRequested) {
        finish({ status: "cancelled" });
        return await outcome;
      }
      settled = true;
      picker.hide();
      throw first.error;
    }
    const model = first.model;
    picker.title = model.title;
    picker.placeholder = model.placeholder;
    picker.items = model.items;
    picker.busy = false;
    picker.matchOnDescription = true;
    picker.matchOnDetail = true;
    picker.step = model.step;
    picker.totalSteps = model.totalSteps;
    return await outcome;
  } finally {
    for (const subscription of subscriptions) subscription.dispose();
    cancellation.dispose();
    picker.dispose();
  }
}
