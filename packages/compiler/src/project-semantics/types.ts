// Shared types for compiler project-semantics

export interface Logger {
  log(message: string): void;
  info(message: string): void;
  warn(message: string): void;
  error(message: string): void;
}
