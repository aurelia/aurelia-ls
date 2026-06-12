export function productArchitectureProfileLaneName(
  includeFunctionBodyAnalysis: boolean,
  includeCallSites: boolean,
  includeCallDetails: boolean,
  includeSymbols: boolean,
  includeKernelRecords: boolean,
): string {
  const bodyPrefix = includeFunctionBodyAnalysis ? "body+" : "";
  const kernelSuffix = includeKernelRecords ? "+kernel-records" : "";
  if (includeCallSites && includeSymbols) {
    return includeCallDetails ? `${bodyPrefix}full exact-call${kernelSuffix}` : `${bodyPrefix}full compact-call${kernelSuffix}`;
  }
  if (includeCallSites) {
    return includeCallDetails ? `${bodyPrefix}core exact-call${kernelSuffix}` : `${bodyPrefix}core compact-call${kernelSuffix}`;
  }
  if (includeSymbols) {
    return `${bodyPrefix}symbol${kernelSuffix}`;
  }
  return `${bodyPrefix}structure${kernelSuffix}`;
}
