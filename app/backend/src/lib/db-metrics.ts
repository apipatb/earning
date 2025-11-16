import { recordDatabaseQuery } from './metrics';

/**
 * Database metrics tracking utilities
 * Use these functions to track database query performance
 */

/**
 * Wrap a database query to track metrics
 * @param queryType - Type of query (SELECT, INSERT, UPDATE, DELETE)
 * @param table - Table name
 * @param queryFn - The actual query function to execute
 */
export async function trackQueryMetrics<T>(
  queryType: string,
  table: string,
  queryFn: () => Promise<T>
): Promise<T> {
  const startTime = Date.now();

  try {
    const result = await queryFn();
    const duration = Date.now() - startTime;
    recordDatabaseQuery(queryType, table, duration);
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    recordDatabaseQuery(queryType, table, duration);
    throw error;
  }
}

/**
 * Wrap synchronous database queries to track metrics
 * @param queryType - Type of query (SELECT, INSERT, UPDATE, DELETE)
 * @param table - Table name
 * @param queryFn - The actual query function to execute
 */
export function trackQueryMetricsSync<T>(
  queryType: string,
  table: string,
  queryFn: () => T
): T {
  const startTime = Date.now();

  try {
    const result = queryFn();
    const duration = Date.now() - startTime;
    recordDatabaseQuery(queryType, table, duration);
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    recordDatabaseQuery(queryType, table, duration);
    throw error;
  }
}

/**
 * Helper function for SELECT queries
 */
export async function trackSelectQuery<T>(
  table: string,
  queryFn: () => Promise<T>
): Promise<T> {
  return trackQueryMetrics('SELECT', table, queryFn);
}

/**
 * Helper function for INSERT queries
 */
export async function trackInsertQuery<T>(
  table: string,
  queryFn: () => Promise<T>
): Promise<T> {
  return trackQueryMetrics('INSERT', table, queryFn);
}

/**
 * Helper function for UPDATE queries
 */
export async function trackUpdateQuery<T>(
  table: string,
  queryFn: () => Promise<T>
): Promise<T> {
  return trackQueryMetrics('UPDATE', table, queryFn);
}

/**
 * Helper function for DELETE queries
 */
export async function trackDeleteQuery<T>(
  table: string,
  queryFn: () => Promise<T>
): Promise<T> {
  return trackQueryMetrics('DELETE', table, queryFn);
}

/**
 * Example usage in Prisma client extension:
 *
 * import { PrismaClient } from '@prisma/client';
 * import { trackQueryMetrics } from './lib/db-metrics';
 *
 * const prisma = new PrismaClient();
 *
 * // Extend Prisma to automatically track metrics
 * const extendedPrisma = prisma.$extends({
 *   query: {
 *     $allOperations({ operation, model, args, query }) {
 *       return trackQueryMetrics(
 *         operation.toUpperCase(),
 *         model,
 *         () => query(args)
 *       );
 *     },
 *   },
 * });
 *
 * export default extendedPrisma;
 */

/**
 * Manual tracking example:
 *
 * Instead of:
 *   const user = await prisma.user.findUnique({ where: { id: '123' } });
 *
 * Use:
 *   const user = await trackSelectQuery(
 *     'user',
 *     () => prisma.user.findUnique({ where: { id: '123' } })
 *   );
 */
