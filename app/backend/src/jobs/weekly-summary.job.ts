import { PrismaClient } from '@prisma/client';
import logger from '../lib/logger';

const prisma = new PrismaClient();

/**
 * Weekly Summary Job
 * Runs: Every Monday at 8 AM
 * Task: Calculate weekly earnings/expenses/invoices and send summary email to user
 */
export async function weeklySummaryJob(): Promise<void> {
  logger.info('Starting weekly summary job');

  try {
    // Get all active users
    const users = await prisma.user.findMany({
      select: { id: true, email: true, name: true, timezone: true },
    });

    for (const user of users) {
      try {
        // Calculate date range for this week (Monday to Sunday)
        const now = new Date();
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay() + 1); // Monday
        startOfWeek.setHours(0, 0, 0, 0);

        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6); // Sunday
        endOfWeek.setHours(23, 59, 59, 999);

        // Get weekly earnings
        const earnings = await prisma.earning.aggregate({
          where: {
            userId: user.id,
            date: {
              gte: startOfWeek,
              lte: endOfWeek,
            },
          },
          _sum: { amount: true },
          _count: true,
        });

        // Get weekly expenses
        const expenses = await prisma.expense.aggregate({
          where: {
            userId: user.id,
            expenseDate: {
              gte: startOfWeek,
              lte: endOfWeek,
            },
          },
          _sum: { amount: true },
          _count: true,
        });

        // Get weekly invoices (paid and unpaid)
        const invoices = await prisma.invoice.aggregate({
          where: {
            userId: user.id,
            createdAt: {
              gte: startOfWeek,
              lte: endOfWeek,
            },
          },
          _sum: { totalAmount: true },
          _count: true,
        });

        const totalEarnings = earnings._sum.amount || 0;
        const totalExpenses = expenses._sum.amount || 0;
        const netProfit = totalEarnings - totalExpenses;

        // Prepare summary data
        const summary = {
          userId: user.id,
          weekStartDate: startOfWeek,
          weekEndDate: endOfWeek,
          totalEarnings: totalEarnings.toFixed(2),
          earningsCount: earnings._count,
          totalExpenses: totalExpenses.toFixed(2),
          expensesCount: expenses._count,
          netProfit: netProfit.toFixed(2),
          invoicesCount: invoices._count,
          invoicesTotal: invoices._sum.totalAmount?.toFixed(2) || '0.00',
        };

        logger.info(`Weekly summary calculated for user ${user.id}:`, summary);

        // TODO: Send email with summary
        // await sendWeeklySummaryEmail(user, summary);

        logger.info(`Weekly summary processed for user: ${user.email}`);
      } catch (userError) {
        logger.error(`Failed to process weekly summary for user ${user.id}:`, userError);
      }
    }

    logger.info('Weekly summary job completed successfully');
  } catch (error) {
    logger.error('Weekly summary job failed:', error);
    throw error;
  }
}
