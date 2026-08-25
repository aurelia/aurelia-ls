const assert = require("assert");

async function driveNativeQuickPickOrdinal({
  command,
  flowStart,
  model,
  targetOrdinal,
  observations,
  dispatchSelectNext,
  waitForActive,
}) {
  const selectableOrdinals = model.items
    .filter((item) => item.itemKind === "item")
    .map((item) => item.itemOrdinal);
  assert(selectableOrdinals.includes(targetOrdinal), `Quick Pick model does not contain selectable ordinal ${targetOrdinal}.`);
  const isCorrelatedActive = (event) => event.source === "resource-quick-pick"
    && event.observationId === model.ready.observationId
    && event.phase === "active-changed"
    && event.modelOrdinal === model.ready.modelOrdinal
    && Number.isInteger(event.itemOrdinal);
  const initialObservations = observations();
  const readyIndexes = initialObservations.flatMap((event, index) =>
    index >= flowStart
      && event.source === "resource-quick-pick"
      && event.observationId === model.ready.observationId
      && event.phase === "model-ready"
      && event.modelOrdinal === model.ready.modelOrdinal
      ? [index]
      : []
  );
  assert.strictEqual(
    readyIndexes.length,
    1,
    `${command} must drive from exactly one correlated model-ready receipt for model ${model.ready.modelOrdinal}.`,
  );
  const retainedReceiptIndex = (receipt, start, label) => {
    const index = observations().findIndex((event, eventIndex) => eventIndex >= start && event === receipt);
    assert.notStrictEqual(index, -1, `${command} ${label} must be retained in the monotonic observation trace.`);
    return index;
  };
  const initialActiveIndexes = initialObservations.flatMap((event, index) =>
    index >= flowStart && isCorrelatedActive(event) ? [index] : []
  );
  let activeIndex = initialActiveIndexes.at(-1);
  let active;
  if (activeIndex == null) {
    const initialActiveStart = initialObservations.length;
    active = await waitForActive(
      initialActiveStart,
      isCorrelatedActive,
      `${command} should publish its initial native active item for model ${model.ready.modelOrdinal}`,
    );
    activeIndex = retainedReceiptIndex(active, initialActiveStart, "initial active receipt");
  } else {
    active = initialObservations[activeIndex];
  }
  assert(
    selectableOrdinals.includes(active.itemOrdinal),
    `${command} activated non-selectable ordinal ${active.itemOrdinal} in model ${model.ready.modelOrdinal}.`,
  );
  let correlationCursor = activeIndex + 1;
  const selectNext = async (reason) => {
    const previousOrdinal = active.itemOrdinal;
    const previousIndex = selectableOrdinals.indexOf(previousOrdinal);
    assert.notStrictEqual(
      previousIndex,
      -1,
      `${command} cannot advance non-selectable ordinal ${previousOrdinal} in model ${model.ready.modelOrdinal}.`,
    );
    const expectedOrdinal = selectableOrdinals[(previousIndex + 1) % selectableOrdinals.length];
    const activeStart = observations().length;
    assert(
      activeStart >= correlationCursor,
      `${command} native active-row correlation moved backwards in model ${model.ready.modelOrdinal}.`,
    );
    await dispatchSelectNext();
    const next = await waitForActive(
      activeStart,
      (event) => isCorrelatedActive(event) && event.itemOrdinal !== previousOrdinal,
      `${command} should ${reason} in model ${model.ready.modelOrdinal}`,
    );
    const nextIndex = retainedReceiptIndex(next, activeStart, "Select Next active receipt");
    assert.strictEqual(
      next.itemOrdinal,
      expectedOrdinal,
      `${command} Select Next activated ordinal ${next.itemOrdinal}; expected ${expectedOrdinal} after ${previousOrdinal}.`,
    );
    correlationCursor = nextIndex + 1;
    return next;
  };
  if (active?.itemOrdinal === targetOrdinal && selectableOrdinals.length > 1) {
    active = await selectNext(`move away from already-active ordinal ${targetOrdinal}`);
    assert.notStrictEqual(
      active.itemOrdinal,
      targetOrdinal,
      `${command} must prove a fresh native active-row cycle before accepting ordinal ${targetOrdinal}.`,
    );
  }
  for (let attempts = 0; active?.itemOrdinal !== targetOrdinal && attempts <= selectableOrdinals.length + 2; attempts += 1) {
    active = await selectNext(`move its active item toward ordinal ${targetOrdinal}`);
  }
  assert.strictEqual(active?.itemOrdinal, targetOrdinal);
  const finalObservations = observations();
  const latestActiveIndex = finalObservations.findLastIndex((event, index) =>
    index >= flowStart && isCorrelatedActive(event)
  );
  assert.notStrictEqual(
    latestActiveIndex,
    -1,
    `${command} must retain a correlated native active receipt before accepting model ${model.ready.modelOrdinal}.`,
  );
  const latestActive = finalObservations[latestActiveIndex];
  assert.strictEqual(
    latestActive.itemOrdinal,
    targetOrdinal,
    `${command} latest active ordinal ${latestActive.itemOrdinal}; expected ${targetOrdinal}.`,
  );
  assert(
    latestActiveIndex >= correlationCursor - 1,
    `${command} latest active receipt predates its monotonic correlation cursor.`,
  );
  return latestActive;
}

async function acceptNativeQuickPickOrdinal({
  command,
  flowStart,
  model,
  targetOrdinal,
  observations,
  dispatchAccept,
  waitForAccept,
  closeQuickPick,
  waitForSettlement,
  delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)),
}) {
  const expectedItem = model.items.find((item) => item.itemOrdinal === targetOrdinal && item.itemKind === "item");
  assert(expectedItem, `Quick Pick model does not retain selectable ordinal ${targetOrdinal}.`);
  let acceptDispatch;
  try {
    const beforeAccept = observations();
    const latestActive = beforeAccept.slice(flowStart).filter((event) =>
      event.source === "resource-quick-pick"
        && event.observationId === model.ready.observationId
        && event.phase === "active-changed"
        && event.modelOrdinal === model.ready.modelOrdinal
        && Number.isInteger(event.itemOrdinal)
    ).at(-1);
    assert(latestActive, `${command} cannot accept before a correlated native active receipt.`);
    assert.strictEqual(
      latestActive.itemOrdinal,
      targetOrdinal,
      `${command} latest active ordinal ${latestActive.itemOrdinal}; expected ${targetOrdinal} before accept.`,
    );
    const acceptStart = beforeAccept.length;
    acceptDispatch = Promise.resolve().then(dispatchAccept).then(
      (value) => ({ status: "fulfilled", value }),
      (error) => ({ status: "rejected", error }),
    );
    const accepted = await waitForAccept(
      acceptStart,
      (event) => event.source === "resource-quick-pick"
        && event.observationId === model.ready.observationId
        && event.phase === "accept"
        && event.modelOrdinal === model.ready.modelOrdinal,
      `${command} should accept from Quick Pick model ${model.ready.modelOrdinal}`,
    );
    const dispatch = await acceptDispatch;
    if (dispatch.status === "rejected") throw dispatch.error;
    assert.strictEqual(
      accepted.itemOrdinal,
      targetOrdinal,
      `${command} accepted ordinal ${accepted.itemOrdinal}; expected ${targetOrdinal}.`,
    );
    assert.strictEqual(
      accepted.selectedLabel,
      expectedItem.label,
      `${command} accepted label ${String(accepted.selectedLabel)}; expected ${expectedItem.label}.`,
    );
    return accepted;
  } catch (error) {
    await Promise.resolve().then(closeQuickPick).catch(() => undefined);
    let settlement = "settled";
    try {
      await waitForSettlement(5_000);
    } catch {
      settlement = "still-running-after-5000ms";
    }
    if (acceptDispatch != null) await Promise.race([acceptDispatch, delay(1_000)]);
    const trace = observations().slice(flowStart).filter((event) =>
      event.observationId === model.ready.observationId
    );
    throw new Error(`${error instanceof Error ? error.message : String(error)}; `
      + `targetOrdinal=${targetOrdinal}; modelOrdinal=${model.ready.modelOrdinal}; `
      + `model=${JSON.stringify(model.items)}; settlement=${settlement}; `
      + `correlatedTrace=${JSON.stringify(trace)}`);
  }
}

module.exports = { acceptNativeQuickPickOrdinal, driveNativeQuickPickOrdinal };
