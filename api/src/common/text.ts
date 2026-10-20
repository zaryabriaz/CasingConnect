export function emptyToNull(value: string | undefined) {
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

export function clean(value: string) {
  return value.trim();
}

export function hasAny(dto: object) {
  return Object.values(dto).some((value) => value !== undefined);
}
