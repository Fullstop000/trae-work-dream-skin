import type { CliError } from "./errors.js";

export function emit(payload: Record<string, unknown>, human: string, json: boolean): void {
  if (json) console.log(JSON.stringify({ schemaVersion: 1, ok: true, ...payload }, null, 2));
  else if (human) console.log(human);
}

export function emitError(error: CliError, json = false): void {
  if (json) {
    console.log(JSON.stringify({
      schemaVersion: 1,
      ok: false,
      error: {
        code: error.code,
        message: error.message,
        hint: error.hint || undefined,
        detail: error.detail,
      },
    }, null, 2));
    return;
  }
  console.error(`twskin: ${error.message}`);
  if (error.hint) console.error(`建议：${error.hint}`);
  if (process.env.TWSKIN_DEBUG && error.detail) console.error(error.detail);
}
