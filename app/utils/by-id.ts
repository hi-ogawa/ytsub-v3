import { zip } from "lodash";
import { useMemoWrap } from "./hooks";

export interface ById<T> {
  ids: number[];
  byId: Record<number, T>;
}

export function toById<T extends { id: number }>(data: T[]): ById<T> {
  const ids = data.map((e) => e.id);
  const byId: Record<number, T> = Object.fromEntries(zip(ids, data));
  return { ids, byId };
}

export function useToById<T extends { id: number }>(data: T[]): ById<T> {
  return useMemoWrap(toById, data) as ById<T>;
}
