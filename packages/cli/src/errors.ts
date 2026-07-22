export class CliError extends Error {
  readonly code: string;
  readonly exitCode: number;
  readonly hint: string;
  readonly detail: unknown;

  constructor(code: string, exitCode: number, message: string, hint = "", detail?: unknown) {
    super(message);
    this.name = "CliError";
    this.code = code;
    this.exitCode = exitCode;
    this.hint = hint;
    this.detail = detail;
  }
}

export function asCliError(error: unknown): CliError {
  return error instanceof CliError
    ? error
    : new CliError("INTERNAL_ERROR", 1, error instanceof Error ? error.message : String(error));
}
