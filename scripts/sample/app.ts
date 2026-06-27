import { inc, get } from "./counter";

export function run(): number {
  inc();
  inc();
  return get();
}
