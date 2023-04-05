import { z } from "zod";

export const PAGINATION_PARAMS_SCHEMA = z.object({
  page: z.coerce.number().int().default(1),
  perPage: z.coerce.number().int().default(20),
});

type PaginationParams = z.infer<typeof PAGINATION_PARAMS_SCHEMA>;

export function toNewPages({
  page,
  perPage,
  totalPage,
}: {
  page: number;
  perPage: number;
  totalPage: number;
}): {
  first: PaginationParams;
  previous?: PaginationParams;
  next?: PaginationParams;
  last: PaginationParams;
} {
  const res = {
    first: { perPage, page: 1 },
    previous: { perPage, page: page - 1 },
    next: { perPage, page: page + 1 },
    last: { perPage, page: totalPage },
  };
  if (res.previous.page < 1) {
    delete (res as any).previous;
  }
  if (res.next.page > totalPage) {
    delete (res as any).next;
  }
  return res;
}
