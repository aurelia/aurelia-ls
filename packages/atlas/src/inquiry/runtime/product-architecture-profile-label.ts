export function productArchitectureProfileLaneName(
  includeCallSites: boolean,
  includeCallDetails: boolean,
  includeSymbols: boolean,
  includeKernelRecords: boolean,
): string {
  const kernelSuffix = includeKernelRecords ? "+kernel-records" : "";
  if (includeCallSites && includeSymbols) {
    return includeCallDetails ? `full exact-call${kernelSuffix}` : `full compact-call${kernelSuffix}`;
  }
  if (includeCallSites) {
    return includeCallDetails ? `core exact-call${kernelSuffix}` : `core compact-call${kernelSuffix}`;
  }
  if (includeSymbols) {
    return `symbol${kernelSuffix}`;
  }
  return `structure${kernelSuffix}`;
}
