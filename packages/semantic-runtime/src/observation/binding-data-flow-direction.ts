import {
  RuntimeBindingDataFlowDirection,
} from './runtime-binding-observation.js';

/** Returns whether a binding data-flow direction transports values from source expression to target. */
export function bindingDataFlowDirectionIncludesSourceToTarget(direction: RuntimeBindingDataFlowDirection): boolean {
  return direction === RuntimeBindingDataFlowDirection.SourceToTarget
    || direction === RuntimeBindingDataFlowDirection.TwoWay;
}

/** Returns whether a binding data-flow direction transports values from target/observer back into the source. */
export function bindingDataFlowDirectionIncludesTargetToSource(direction: RuntimeBindingDataFlowDirection): boolean {
  return direction === RuntimeBindingDataFlowDirection.TargetToSource
    || direction === RuntimeBindingDataFlowDirection.TwoWay;
}
