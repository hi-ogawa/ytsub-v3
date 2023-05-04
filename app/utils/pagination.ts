import { z } from "zod";

export const PAGINATION_PARAMS_SCHEMA = z.object({
  page: z.coerce.number().int().default(1),
  perPage: z.coerce.number().int().default(20),
});

export type PaginationParams = z.infer<typeof PAGINATION_PARAMS_SCHEMA>;

export type PaginationMetadata = PaginationParams & {
  total: number;
  totalPage: number;
};
