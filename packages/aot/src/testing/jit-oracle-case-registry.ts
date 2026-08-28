import type { CompilerCase } from "./compiler-case.js";
import { JIT_ORACLE_BREADTH_CASES } from "./jit-oracle-breadth-cases.js";
import { JIT_ORACLE_BROWSER_INTERACTION_CASES } from "./jit-oracle-browser-interaction-cases.js";
import { JIT_ORACLE_DEFINITION_HEADER_CASES } from "./jit-oracle-definition-header-cases.js";
import { JIT_ORACLE_CASES as JIT_ORACLE_CORE_CASES } from "./jit-oracle-cases.js";
import { JIT_ORACLE_EXTENSION_CASES } from "./jit-oracle-extension-cases.js";
import { JIT_ORACLE_INTERACTION_CASES } from "./jit-oracle-interaction-cases.js";
import { JIT_ORACLE_LOCAL_ELEMENT_CASES } from "./jit-oracle-local-element-cases.js";
import { JIT_ORACLE_OPERATION_CASES } from "./jit-oracle-operation-cases.js";
import { JIT_ORACLE_ORDER_CASES } from "./jit-oracle-order-cases.js";
import { JIT_ORACLE_RESOURCE_CASES } from "./jit-oracle-resource-cases.js";

/** Complete currently executable framework-JIT characterization registry. */
export const JIT_ORACLE_CASES: readonly CompilerCase[] = [
  ...JIT_ORACLE_CORE_CASES,
  ...JIT_ORACLE_BREADTH_CASES,
  ...JIT_ORACLE_BROWSER_INTERACTION_CASES,
  ...JIT_ORACLE_DEFINITION_HEADER_CASES,
  ...JIT_ORACLE_EXTENSION_CASES,
  ...JIT_ORACLE_INTERACTION_CASES,
  ...JIT_ORACLE_LOCAL_ELEMENT_CASES,
  ...JIT_ORACLE_OPERATION_CASES,
  ...JIT_ORACLE_ORDER_CASES,
  ...JIT_ORACLE_RESOURCE_CASES,
];
