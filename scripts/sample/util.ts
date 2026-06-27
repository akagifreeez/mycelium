import { get } from "./counter";

export function summary(): string {
  return `count=${get()}`;
}
