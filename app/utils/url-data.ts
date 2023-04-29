import qs from "qs";

export function fromRequestQuery(request: Request): any {
  return fromQuery(new URL(request.url).search);
}

function fromQuery(query: string): any {
  return qs.parse(query, { allowDots: true, ignoreQueryPrefix: true });
}

export function toQuery(obj: any): string {
  return qs.stringify(obj, { allowDots: true });
}
