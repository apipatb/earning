import { AuditAction, AuditStatus, ComplianceReportType } from '@prisma/client';
import prisma from '../lib/prisma';
import { logger } from '../utils/logger';

interface AuditLogData {
  userId?: string;
  action: AuditAction;
  resource: string;
  resourceId?: string;
  changes?: Record<string, { before: any; after: any }>;
  ipAddress?: string;
  userAgent?: string;
  status?: AuditStatus;
  errorMsg?: string;
}

interface AuditLogFilters {
  userId?: string;
  action?: AuditAction;
  resource?: string;
  resourceId?: string;
  status?: AuditStatus;
  startDate?: Date;
  endDate?: Date;
}

export class AuditService {
  /**
   * Log an audit event
   */
  static async logAction(data: AuditLogData): Promise<any> {
    try {
      const auditLog = await prisma.auditLog.create({
        data: {
          userId: data.userId,
          action: data.action,
          resource: data.resource,
          resourceId: data.resourceId,
          changes: data.changes ? JSON.stringify(data.changes) : null,
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
          status: data.status || 'SUCCESS',
          errorMsg: data.errorMsg,
          timestamp: new Date(),
        },
      });

      return auditLog;
    } catch (error) {
      logger.error('Error creating audit log:', error instanceof Error ? error : new Error(String(error)));
      // Don't throw error - audit logging should not break the main operation
      return null;
    }
  }

  /**
   * Log CREATE action
   */
  static async logCreate(
    userId: string,
    resource: string,
    resourceId: string,
    data: any,
    ipAddress?: string,
    userAgent?: string
  ): Promise<any> {
    return this.logAction({
      userId,
      action: 'CREATE',
      resource,
      resourceId,
      changes: { after: data },
      ipAddress,
      userAgent,
      status: 'SUCCESS',
    });
  }

  /**
   * Log UPDATE action
   */
  static async logUpdate(
    userId: string,
    resource: string,
    resourceId: string,
    before: any,
    after: any,
    ipAddress?: string,
    userAgent?: string
  ): Promise<any> {
    const changes: Record<string, { before: any; after: any }> = {};

    // Calculate changes
    for (const key in after) {
      if (before[key] !== after[key]) {
        changes[key] = {
          before: before[key],
          after: after[key],
        };
      }
    }

    return this.logAction({
      userId,
      action: 'UPDATE',
      resource,
      resourceId,
      changes,
      ipAddress,
      userAgent,
      status: 'SUCCESS',
    });
  }

  /**
   * Log DELETE action
   */
  static async logDelete(
    userId: string,
    resource: string,
    resourceId: string,
    data: any,
    ipAddress?: string,
    userAgent?: string
  ): Promise<any> {
    return this.logAction({
      userId,
      action: 'DELETE',
      resource,
      resourceId,
      changes: { before: data },
      ipAddress,
      userAgent,
      status: 'SUCCESS',
    });
  }

  /**
   * Log READ action (for sensitive data access)
   */
  static async logRead(
    userId: string,
    resource: string,
    resourceId?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<any> {
    return this.logAction({
      userId,
      action: 'READ',
      resource,
      resourceId,
      ipAddress,
      userAgent,
      status: 'SUCCESS',
    });
  }

  /**
   * Log LOGIN action
   */
  static async logLogin(
    userId: string,
    success: boolean,
    ipAddress?: string,
    userAgent?: string,
    errorMsg?: string
  ): Promise<any> {
    return this.logAction({
      userId,
      action: 'LOGIN',
      resource: 'auth',
      status: success ? 'SUCCESS' : 'FAILED',
      ipAddress,
      userAgent,
      errorMsg,
    });
  }

  /**
   * Log LOGOUT action
   */
  static async logLogout(
    userId: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<any> {
    return this.logAction({
      userId,
      action: 'LOGOUT',
      resource: 'auth',
      ipAddress,
      userAgent,
      status: 'SUCCESS',
    });
  }

  /**
   * Log data EXPORT action (GDPR compliance)
   */
  static async logExport(
    userId: string,
    resource: string,
    recordCount: number,
    ipAddress?: string,
    userAgent?: string
  ): Promise<any> {
    return this.logAction({
      userId,
      action: 'EXPORT',
      resource,
      changes: { recordCount },
      ipAddress,
      userAgent,
      status: 'SUCCESS',
    });
  }

  /**
   * Get audit logs with filters
   */
  static async getAuditLogs(
    filters: AuditLogFilters,
    limit = 100,
    offset = 0
  ): Promise<{ logs: any[]; total: number; hasMore: boolean }> {
    const where: any = {};

    if (filters.userId) where.userId = filters.userId;
    if (filters.action) where.action = filters.action;
    if (filters.resource) where.resource = filters.resource;
    if (filters.resourceId) where.resourceId = filters.resourceId;
    if (filters.status) where.status = filters.status;

    if (filters.startDate || filters.endDate) {
      where.timestamp = {};
      if (filters.startDate) where.timestamp.gte = filters.startDate;
      if (filters.endDate) where.timestamp.lte = filters.endDate;
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
        orderBy: { timestamp: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return {
      logs: logs.map((log) => ({
        id: log.id,
        userId: log.userId,
        user: log.user,
        action: log.action,
        resource: log.resource,
        resourceId: log.resourceId,
        changes: log.changes ? JSON.parse(log.changes) : null,
        ipAddress: log.ipAddress,
        userAgent: log.userAgent,
        status: log.status,
        errorMsg: log.errorMsg,
        timestamp: log.timestamp,
      })),
      total,
      hasMore: total > offset + limit,
    };
  }

  /**
   * Search audit logs
   */
  static async searchAuditLogs(
    query: string,
    filters: AuditLogFilters,
    limit = 100,
    offset = 0
  ): Promise<{ logs: any[]; total: number; hasMore: boolean }> {
    const where: any = {};

    if (filters.userId) where.userId = filters.userId;
    if (filters.action) where.action = filters.action;
    if (filters.resource) where.resource = filters.resource;
    if (filters.status) where.status = filters.status;

    if (filters.startDate || filters.endDate) {
      where.timestamp = {};
      if (filters.startDate) where.timestamp.gte = filters.startDate;
      if (filters.endDate) where.timestamp.lte = filters.endDate;
    }

    // Add text search
    if (query) {
      where.OR = [
        { resource: { contains: query, mode: 'insensitive' } },
        { resourceId: { contains: query, mode: 'insensitive' } },
        { ipAddress: { contains: query, mode: 'insensitive' } },
        { errorMsg: { contains: query, mode: 'insensitive' } },
      ];
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
        orderBy: { timestamp: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return {
      logs: logs.map((log) => ({
        id: log.id,
        userId: log.userId,
        user: log.user,
        action: log.action,
        resource: log.resource,
        resourceId: log.resourceId,
        changes: log.changes ? JSON.parse(log.changes) : null,
        ipAddress: log.ipAddress,
        userAgent: log.userAgent,
        status: log.status,
        errorMsg: log.errorMsg,
        timestamp: log.timestamp,
      })),
      total,
      hasMore: total > offset + limit,
    };
  }

  /**
   * Generate audit report
   */
  static async generateAuditReport(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<any> {
    const logs = await prisma.auditLog.findMany({
      where: {
        userId,
        timestamp: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { timestamp: 'desc' },
    });

    // Aggregate statistics
    const stats = {
      totalActions: logs.length,
      actionsByType: {} as Record<string, number>,
      actionsByResource: {} as Record<string, number>,
      successRate: 0,
      failedActions: 0,
    };

    logs.forEach((log) => {
      // Count by action
      stats.actionsByType[log.action] = (stats.actionsByType[log.action] || 0) + 1;

      // Count by resource
      stats.actionsByResource[log.resource] = (stats.actionsByResource[log.resource] || 0) + 1;

      // Count failures
      if (log.status === 'FAILED') {
        stats.failedActions++;
      }
    });

    stats.successRate = stats.totalActions > 0
      ? ((stats.totalActions - stats.failedActions) / stats.totalActions) * 100
      : 100;

    return {
      period: {
        start: startDate,
        end: endDate,
      },
      stats,
      logs: logs.map((log) => ({
        id: log.id,
        action: log.action,
        resource: log.resource,
        resourceId: log.resourceId,
        changes: log.changes ? JSON.parse(log.changes) : null,
        ipAddress: log.ipAddress,
        status: log.status,
        timestamp: log.timestamp,
      })),
    };
  }

  /**
   * Generate compliance report (GDPR data export)
   */
  static async generateComplianceReport(
    userId: string,
    reportType: ComplianceReportType,
    startDate?: Date,
    endDate?: Date
  ): Promise<any> {
    let data: any = {};
    let recordCount = 0;

    switch (reportType) {
      case 'DATA_EXPORT':
      case 'GDPR':
        // Export all user data
        const userData = await this.exportUserData(userId);
        data = userData;
        recordCount = this.countRecords(userData);
        break;

      case 'ACTIVITY':
        // Export activity logs
        const activityData = await this.exportActivityData(userId, startDate, endDate);
        data = activityData;
        recordCount = activityData.logs?.length || 0;
        break;

      case 'ACCESS_LOG':
        // Export access logs (READ actions)
        const accessData = await this.exportAccessLogs(userId, startDate, endDate);
        data = accessData;
        recordCount = accessData.logs?.length || 0;
        break;

      case 'RETENTION':
        // Export data retention information
        const retentionData = await this.exportRetentionData();
        data = retentionData;
        recordCount = retentionData.policies?.length || 0;
        break;

      default:
        throw new Error(`Unsupported report type: ${reportType}`);
    }

    // Create compliance report record
    const report = await prisma.complianceReport.create({
      data: {
        generatedBy: userId,
        reportType,
        period: `${startDate?.toISOString() || ''} - ${endDate?.toISOString() || ''}`,
        startDate,
        endDate,
        data: JSON.stringify(data),
        recordCount,
        status: 'COMPLETED',
      },
    });

    // Log the export action
    await this.logExport(userId, `compliance_report_${reportType}`, recordCount);

    return report;
  }

  /**
   * Export all user data (GDPR)
   */
  private static async exportUserData(userId: string): Promise<any> {
    const [
      user,
      platforms,
      earnings,
      goals,
      products,
      sales,
      customers,
      expenses,
      invoices,
      auditLogs,
    ] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          timezone: true,
          currency: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.platform.findMany({ where: { userId } }),
      prisma.earning.findMany({ where: { userId } }),
      prisma.goal.findMany({ where: { userId } }),
      prisma.product.findMany({ where: { userId } }),
      prisma.sale.findMany({ where: { userId } }),
      prisma.customer.findMany({ where: { userId } }),
      prisma.expense.findMany({ where: { userId } }),
      prisma.invoice.findMany({ where: { userId } }),
      prisma.auditLog.findMany({ where: { userId }, orderBy: { timestamp: 'desc' }, take: 1000 }),
    ]);

    return {
      user,
      platforms,
      earnings,
      goals,
      products,
      sales,
      customers,
      expenses,
      invoices,
      auditLogs,
    };
  }

  /**
   * Export activity data
   */
  private static async exportActivityData(
    userId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<any> {
    const where: any = { userId };

    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp.gte = startDate;
      if (endDate) where.timestamp.lte = endDate;
    }

    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
    });

    return {
      period: {
        start: startDate,
        end: endDate,
      },
      logs: logs.map((log) => ({
        action: log.action,
        resource: log.resource,
        resourceId: log.resourceId,
        changes: log.changes ? JSON.parse(log.changes) : null,
        timestamp: log.timestamp,
      })),
    };
  }

  /**
   * Export access logs (READ actions)
   */
  private static async exportAccessLogs(
    userId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<any> {
    const where: any = {
      userId,
      action: 'READ',
    };

    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp.gte = startDate;
      if (endDate) where.timestamp.lte = endDate;
    }

    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
    });

    return {
      period: {
        start: startDate,
        end: endDate,
      },
      logs: logs.map((log) => ({
        resource: log.resource,
        resourceId: log.resourceId,
        ipAddress: log.ipAddress,
        timestamp: log.timestamp,
      })),
    };
  }

  /**
   * Export data retention policies
   */
  private static async exportRetentionData(): Promise<any> {
    const policies = await prisma.dataRetention.findMany({
      where: { isActive: true },
      orderBy: { dataType: 'asc' },
    });

    return {
      policies: policies.map((policy) => ({
        dataType: policy.dataType,
        retentionDays: policy.retentionDays,
        description: policy.description,
        lastReview: policy.lastReview,
      })),
    };
  }

  /**
   * Count records in export data
   */
  private static countRecords(data: any): number {
    let count = 0;

    for (const key in data) {
      if (Array.isArray(data[key])) {
        count += data[key].length;
      } else if (typeof data[key] === 'object' && data[key] !== null) {
        count += 1;
      }
    }

    return count;
  }

  /**
   * Get compliance reports for a user
   */
  static async getComplianceReports(
    userId: string,
    limit = 50,
    offset = 0
  ): Promise<{ reports: any[]; total: number; hasMore: boolean }> {
    const [reports, total] = await Promise.all([
      prisma.complianceReport.findMany({
        where: { generatedBy: userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.complianceReport.count({ where: { generatedBy: userId } }),
    ]);

    return {
      reports: reports.map((report) => ({
        id: report.id,
        reportType: report.reportType,
        period: report.period,
        startDate: report.startDate,
        endDate: report.endDate,
        recordCount: report.recordCount,
        status: report.status,
        createdAt: report.createdAt,
      })),
      total,
      hasMore: total > offset + limit,
    };
  }

  /**
   * Get compliance report details
   */
  static async getComplianceReportDetails(reportId: string, userId: string): Promise<any> {
    const report = await prisma.complianceReport.findFirst({
      where: {
        id: reportId,
        generatedBy: userId,
      },
    });

    if (!report) {
      return null;
    }

    return {
      id: report.id,
      reportType: report.reportType,
      period: report.period,
      startDate: report.startDate,
      endDate: report.endDate,
      data: report.data ? JSON.parse(report.data) : null,
      recordCount: report.recordCount,
      status: report.status,
      createdAt: report.createdAt,
    };
  }

  /**
   * Clean up old audit logs based on retention policy
   */
  static async cleanupOldLogs(): Promise<{ deleted: number }> {
    const retention = await prisma.dataRetention.findUnique({
      where: { dataType: 'audit_logs' },
    });

    if (!retention || !retention.isActive) {
      return { deleted: 0 };
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retention.retentionDays);

    const result = await prisma.auditLog.deleteMany({
      where: {
        timestamp: {
          lt: cutoffDate,
        },
      },
    });

    logger.info(`Cleaned up ${result.count} old audit logs older than ${cutoffDate.toISOString()}`);

    return { deleted: result.count };
  }
}
