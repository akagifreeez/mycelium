// A module-level global — the thing to refactor away.
let count = 0;

export function inc(): number {
  count += 1;
  return count;
}

export function get(): number {
  return count;
}

export function reset(): void {
  count = 0;
}
