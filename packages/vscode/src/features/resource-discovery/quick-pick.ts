import type {
  CancellationToken,
  QuickInputButton,
  QuickPickItem,
} from "vscode";
import {
  emitExtensionHostObservation,
  nextExtensionHostObservationId,
  type ExtensionHostObservationValue,
} from "../../extension-host-observation.js";
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
  observationId?: string,
): Promise<ResourceQuickPickOutcome<T>> {
  const effectiveObservationId = observationId ?? nextExtensionHostObservationId("quick-pick");
  const observe = (
    phase: string,
    details: Readonly<Record<string, ExtensionHostObservationValue>> = {},
  ): void => {
    if (effectiveObservationId == null) return;
    emitExtensionHostObservation({
      ...details,
      source: "resource-quick-pick",
      observationId: effectiveObservationId,
      phase,
    });
  };
  const cancellation = new vscode.CancellationTokenSource();
  const picker = vscode.window.createQuickPick<T>();
  picker.title = initialTitle;
  picker.placeholder = "Discovering Aurelia resources...";
  picker.busy = true;
  if (allowBack) picker.buttons = [vscode.QuickInputButtons.Back];

  let settled = false;
  let finishedStatus: ResourceQuickPickOutcome<T>["status"] | "failed" | undefined;
  let settle!: (outcome: ResourceQuickPickOutcome<T>) => void;
  const outcome = new Promise<ResourceQuickPickOutcome<T>>((resolve) => { settle = resolve; });
  const finish = (value: ResourceQuickPickOutcome<T>): void => {
    if (settled) return;
    settled = true;
    finishedStatus = value.status;
    settle(value);
    picker.hide();
  };
  const subscriptions = [
    picker.onDidChangeActive((items) => {
      observe("active-changed", { activeLabel: items[0]?.label ?? null });
    }),
    picker.onDidAccept(() => {
      const selected = picker.selectedItems[0];
      observe("accept", { selectedLabel: selected?.label ?? null });
      if (selected != null) finish({ status: "selected", value: selected });
    }),
    picker.onDidHide(() => {
      observe("hidden");
      cancellation.cancel();
      finish({ status: "cancelled" });
    }),
    picker.onDidTriggerButton((button: QuickInputButton) => {
      if (allowBack && button === vscode.QuickInputButtons.Back) finish({ status: "back" });
    }),
  ];
  picker.show();
  observe("shown");

  try {
    let loading: Promise<
      | { readonly status: "loaded"; readonly model: ResourceQuickPickModel<T> }
      | { readonly status: "failed"; readonly error: unknown }
    >;
    try {
      loading = load(cancellation.token).then(
        (model) => ({ status: "loaded" as const, model }),
        (error: unknown) => ({ status: "failed" as const, error }),
      );
    } catch (error: unknown) {
      loading = Promise.resolve({ status: "failed", error });
    }
    const first = await Promise.race([
      loading,
      outcome.then((value) => ({ status: "outcome" as const, value })),
    ]);
    if (first.status === "outcome") return first.value;
    if (first.status === "failed") {
      observe("load-failed");
      if (cancellation.token.isCancellationRequested) {
        finish({ status: "cancelled" });
        return await outcome;
      }
      settled = true;
      finishedStatus = "failed";
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
    observe("model-ready", { itemCount: model.items.length, title: model.title });
    return await outcome;
  } finally {
    if (finishedStatus != null) observe("finished", { status: finishedStatus });
    for (const subscription of subscriptions) subscription.dispose();
    cancellation.dispose();
    picker.dispose();
    observe("disposed");
  }
}
