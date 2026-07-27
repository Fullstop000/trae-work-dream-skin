export type VersionParts = readonly [number, number, number];

const VERSION = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:[-+][0-9A-Za-z.-]+)?$/;
const COMPATIBLE_RANGE = /^>=(\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?)\s+<(\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?)$/;

export function parseVersion(value: string): VersionParts | null {
  const match = String(value).match(VERSION);
  return match ? [Number(match[1]), Number(match[2]), Number(match[3])] : null;
}

export function isVersion(value: unknown): value is string {
  return typeof value === "string" && parseVersion(value) !== null;
}

export function compareVersions(left: VersionParts, right: VersionParts): number {
  for (const index of [0, 1, 2] as const) {
    if (left[index] !== right[index]) return left[index] < right[index] ? -1 : 1;
  }
  return 0;
}

export function compareVersionStrings(left: string, right: string): number | null {
  const parsedLeft = parseVersion(left);
  const parsedRight = parseVersion(right);
  return parsedLeft && parsedRight ? compareVersions(parsedLeft, parsedRight) : null;
}

export function isCompatibleRange(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const match = value.match(COMPATIBLE_RANGE);
  return Boolean(match && parseVersion(match[1]!) && parseVersion(match[2]!));
}

export function satisfiesRange(range: string, currentVersion: string): boolean {
  const match = range.match(COMPATIBLE_RANGE);
  const current = parseVersion(currentVersion);
  const minimum = match ? parseVersion(match[1]!) : null;
  const maximum = match ? parseVersion(match[2]!) : null;
  return Boolean(current && minimum && maximum && compareVersions(current, minimum) >= 0 && compareVersions(current, maximum) < 0);
}
