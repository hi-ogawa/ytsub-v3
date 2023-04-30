import qs from "qs";

// TODO: remove
export function toQuery(obj: any): string {
  return qs.stringify(obj, { allowDots: true });
}
