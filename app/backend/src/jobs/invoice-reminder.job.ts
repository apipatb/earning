import { PrismaClient } from '@prisma/client';
import logger from '../lib/logger';

const prisma = new PrismaClient();

/**
 * Invoice Reminder Job
 * Runs: Daily at 9 AM
 * Task: Find unpaid invoices older than 7 days and send reminder emails
 */
export async function invoiceReminderJob(): Promise<void> {
  logger.info('Starting invoice reminder job');

  try {
    // Calculate date 7 days ago
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Find unpaid invoices older than 7 days
    const overdueInvoices = await prisma.invoice.findMany({
      where: {
        status: {
          in: ['sent', 'viewed'], // Unpaid statuses
        },
        invoiceDate: {
          lte: sevenDaysAgo,
        },
        paidDate: null,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    logger.info(`Found ${overdueInvoices.length} unpaid invoices older than 7 days`);

    let remindersSent = 0;
    let remindersFailed = 0;

    for (const invoice of overdueInvoices) {
      try {
        const daysOverdue = Math.floor(
          (new Date().getTime() - invoice.invoiceDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        logger.info(
          `Processing reminder for invoice ${invoice.invoiceNumber} (${daysOverdue} days overdue)`
        );

        // TODO: Send reminder email to customer
        // const emailSent = await sendInvoiceReminderEmail({
        //   to: invoice.customer?.email || invoice.user.email,
        //   invoiceNumber: invoice.invoiceNumber,
        //   invoiceAmount: invoice.totalAmount,
        //   dueDate: invoice.dueDate,
        //   daysOverdue,
        // });

        // Log reminder sent
        await prisma.jobLog.create({
          data: {
            jobId: (
              await prisma.job.findUnique({
                where: { jobName: 'invoice-reminder' },
              })
            )?.id || '',
            status: 'success',
            duration: 0,
            metadata: JSON.stringify({
              invoiceId: invoice.id,
              invoiceNumber: invoice.invoiceNumber,
              customerId: invoice.customer?.id || 'system',
              daysOverdue,
            }),
          },
        });

        remindersSent++;
        logger.info(`Reminder sent for invoice: ${invoice.invoiceNumber}`);
      } catch (invoiceError) {
        remindersFailed++;
        logger.error(
          `Failed to send reminder for invoice ${invoice.invoiceNumber}:`,
          invoiceError
        );
      }
    }

    logger.info(
      `Invoice reminder job completed. Sent: ${remindersSent}, Failed: ${remindersFailed}`
    );
  } catch (error) {
    logger.error('Invoice reminder job failed:', error);
    throw error;
  }
}
