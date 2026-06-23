// ============================================================
// Pagination Utilities
// Per TRD: offset-based pagination for admin tables
// Default page=1, limit=20, max limit=100
// ============================================================

export interface PaginationQuery {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginationParams {
  skip: number;
  take: number;
  page: number;
  limit: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/**
 * Parse pagination from request query params
 */
export function parsePagination(query: PaginationQuery): PaginationParams {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  const skip = (page - 1) * limit;

  return { skip, take: limit, page, limit };
}

/**
 * Build pagination meta from results
 */
export function buildPaginationMeta(
  total: number,
  page: number,
  limit: number
): PaginationMeta {
  const totalPages = Math.ceil(total / limit);

  return {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}

/**
 * Build Prisma orderBy from sort params
 */
export function buildOrderBy(
  sortBy?: string,
  sortOrder?: 'asc' | 'desc',
  defaultSort: string = 'createdAt',
  defaultOrder: 'asc' | 'desc' = 'desc'
): Record<string, 'asc' | 'desc'> {
  return { [sortBy || defaultSort]: sortOrder || defaultOrder };
}

/**
 * Get pagination offset (skip/take)
 */
export function getPaginationOffset(page: number, limit: number): { skip: number; take: number } {
  const take = Math.min(100, Math.max(1, limit || 20));
  const skip = (Math.max(1, page || 1) - 1) * take;
  return { skip, take };
}

