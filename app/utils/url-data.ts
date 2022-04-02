import * as qs from "qs";

export function fromRequestQuery(request: Request): any {
  return fromQuery(new URL(request.url).search);
}

export async function fromRequestForm(request: Request): Promise<any> {
  // Assuming "content-type" is "application/x-www-form-urlencoded"
  return fromQuery(await request.text());
}

export function fromQuery(query: string): any {
  return qs.parse(query, { allowDots: true, ignoreQueryPrefix: true });
}

export function toQuery(obj: any): string {
  return qs.stringify(obj, { allowDots: true });
}
