import qs from "qs";

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

export function toURLSearchParams(obj: any): URLSearchParams {
  return new URLSearchParams(toQuery(obj));
}

export function toForm(obj: any): FormData {
  const res = new FormData();
  for (let [name, value] of toURLSearchParams(obj)) {
    res.append(name, value);
  }
  return res;
}
