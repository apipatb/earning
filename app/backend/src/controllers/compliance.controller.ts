import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Compliance Tracking
export const createComplianceRecord = async (req: Request, res: Response) => {
  try {
    const { complianceType, framework, status, description, metadata } = req.body;
    const userId = (req as any).userId;

    const record = await prisma.complianceRecord.create({
      data: {
        userId,
        complianceType,
        framework,
        status,
        description,
        metadata: metadata ? JSON.stringify(metadata) : null,
        checkedAt: new Date(),
      },
    });

    res.status(201).json(record);
  } catch (error) {
    res.status(400).json({ error: 'Failed to create compliance record' });
  }
};

export const getComplianceRecords = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { framework, status, limit = 50 } = req.query;

    const records = await prisma.complianceRecord.findMany({
      where: {
        userId,
        ...(framework && { framework: framework as string }),
        ...(status && { status: status as string }),
      },
      orderBy: { checkedAt: 'desc' },
      take: parseInt(limit as string),
    });

    res.json(records);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch compliance records' });
  }
};

export const getComplianceStatus = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;

    const totalCompliance = await prisma.complianceRecord.count({ where: { userId } });
    const compliant = await prisma.complianceRecord.count({
      where: { userId, status: 'compliant' },
    });
    const nonCompliant = await prisma.complianceRecord.count({
      where: { userId, status: 'non_compliant' },
    });

    const status = {
      timestamp: new Date(),
      totalRecords: totalCompliance,
      compliant,
      nonCompliant,
      complianceRate: totalCompliance > 0 ? (compliant / totalCompliance) * 100 : 0,
    };

    res.json(status);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch compliance status' });
  }
};

// Audit Logs
export const createAuditLog = async (req: Request, res: Response) => {
  try {
    const { action, entityType, entityId, changes, ipAddress, userAgent } = req.body;
    const userId = (req as any).userId;

    const log = await prisma.auditLogEntry.create({
      data: {
        userId,
        action,
        entityType,
        entityId,
        changes: changes ? JSON.stringify(changes) : null,
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
        timestamp: new Date(),
      },
    });

    res.status(201).json(log);
  } catch (error) {
    res.status(400).json({ error: 'Failed to create audit log' });
  }
};

export const getAuditLogs = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { action, entityType, days = 30, limit = 100 } = req.query;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days as string));

    const logs = await prisma.auditLogEntry.findMany({
      where: {
        userId,
        ...(action && { action: action as string }),
        ...(entityType && { entityType: entityType as string }),
        timestamp: { gte: startDate },
      },
      orderBy: { timestamp: 'desc' },
      take: parseInt(limit as string),
    });

    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
};

export const getAuditTrail = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { entityType, entityId } = req.query;

    const trail = await prisma.auditLogEntry.findMany({
      where: {
        userId,
        ...(entityType && { entityType: entityType as string }),
        ...(entityId && { entityId: entityId as string }),
      },
      orderBy: { timestamp: 'desc' },
    });

    res.json(trail);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch audit trail' });
  }
};

// Compliance Policies
export const createCompliancePolicy = async (req: Request, res: Response) => {
  try {
    const { policyName, framework, description, requirements, enforcementLevel } = req.body;
    const userId = (req as any).userId;

    const policy = await prisma.compliancePolicy.create({
      data: {
        userId,
        policyName,
        framework,
        description,
        requirements: JSON.stringify(requirements),
        enforcementLevel,
        isActive: true,
        createdAt: new Date(),
      },
    });

    res.status(201).json(policy);
  } catch (error) {
    res.status(400).json({ error: 'Failed to create compliance policy' });
  }
};

export const getCompliancePolicies = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { framework } = req.query;

    const policies = await prisma.compliancePolicy.findMany({
      where: {
        userId,
        ...(framework && { framework: framework as string }),
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(policies);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch compliance policies' });
  }
};

export const updateCompliancePolicy = async (req: Request, res: Response) => {
  try {
    const { policyId } = req.params;
    const { policyName, description, requirements, enforcementLevel, isActive } = req.body;
    const userId = (req as any).userId;

    const policy = await prisma.compliancePolicy.updateMany({
      where: { id: policyId, userId },
      data: {
        policyName,
        description,
        requirements: requirements ? JSON.stringify(requirements) : undefined,
        enforcementLevel,
        isActive,
        updatedAt: new Date(),
      },
    });

    res.json({ success: policy.count > 0 });
  } catch (error) {
    res.status(400).json({ error: 'Failed to update compliance policy' });
  }
};

// Compliance Violations
export const reportViolation = async (req: Request, res: Response) => {
  try {
    const { violationType, policyId, severity, description, evidence } = req.body;
    const userId = (req as any).userId;

    const violation = await prisma.complianceViolation.create({
      data: {
        userId,
        violationType,
        policyId: policyId || null,
        severity,
        description,
        evidence: evidence ? JSON.stringify(evidence) : null,
        status: 'open',
        detectedAt: new Date(),
      },
    });

    res.status(201).json(violation);
  } catch (error) {
    res.status(400).json({ error: 'Failed to report violation' });
  }
};

export const getViolations = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { status, severity, limit = 50 } = req.query;

    const violations = await prisma.complianceViolation.findMany({
      where: {
        userId,
        ...(status && { status: status as string }),
        ...(severity && { severity: severity as string }),
      },
      orderBy: { detectedAt: 'desc' },
      take: parseInt(limit as string),
    });

    res.json(violations);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch violations' });
  }
};

export const resolveViolation = async (req: Request, res: Response) => {
  try {
    const { violationId } = req.params;
    const { resolution, notes } = req.body;
    const userId = (req as any).userId;

    const violation = await prisma.complianceViolation.updateMany({
      where: { id: violationId, userId },
      data: {
        status: 'resolved',
        resolution,
        notes,
        resolvedAt: new Date(),
      },
    });

    res.json({ success: violation.count > 0 });
  } catch (error) {
    res.status(400).json({ error: 'Failed to resolve violation' });
  }
};

// Data Retention Policies
export const setDataRetentionPolicy = async (req: Request, res: Response) => {
  try {
    const { dataType, retentionDays, archiveAfterDays, deleteAfterDays } = req.body;
    const userId = (req as any).userId;

    // Delete existing policy for this data type
    await prisma.dataRetentionPolicy.deleteMany({
      where: { userId, dataType },
    });

    const policy = await prisma.dataRetentionPolicy.create({
      data: {
        userId,
        dataType,
        retentionDays,
        archiveAfterDays: archiveAfterDays || null,
        deleteAfterDays: deleteAfterDays || null,
        isActive: true,
        createdAt: new Date(),
      },
    });

    res.status(201).json(policy);
  } catch (error) {
    res.status(400).json({ error: 'Failed to set data retention policy' });
  }
};

export const getDataRetentionPolicies = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;

    const policies = await prisma.dataRetentionPolicy.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    res.json(policies);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch data retention policies' });
  }
};

// Compliance Reports
export const generateComplianceReport = async (req: Request, res: Response) => {
  try {
    const { framework, startDate, endDate } = req.body;
    const userId = (req as any).userId;

    const records = await prisma.complianceRecord.findMany({
      where: {
        userId,
        ...(framework && { framework }),
        checkedAt: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      },
    });

    const totalChecks = records.length;
    const compliantChecks = records.filter((r) => r.status === 'compliant').length;
    const nonCompliantChecks = records.filter((r) => r.status === 'non_compliant').length;

    const report = await prisma.complianceReport.create({
      data: {
        userId,
        framework: framework || 'general',
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        totalChecks,
        compliantChecks,
        nonCompliantChecks,
        complianceRate: (compliantChecks / totalChecks) * 100,
        reportData: JSON.stringify(records),
        generatedAt: new Date(),
      },
    });

    res.status(201).json(report);
  } catch (error) {
    res.status(400).json({ error: 'Failed to generate compliance report' });
  }
};

export const getComplianceReports = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { framework, limit = 20 } = req.query;

    const reports = await prisma.complianceReport.findMany({
      where: {
        userId,
        ...(framework && { framework: framework as string }),
      },
      orderBy: { generatedAt: 'desc' },
      take: parseInt(limit as string),
    });

    res.json(reports);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch compliance reports' });
  }
};

// Audit Evidence
export const collectAuditEvidence = async (req: Request, res: Response) => {
  try {
    const { violationId, evidenceType, description, attachments } = req.body;
    const userId = (req as any).userId;

    const evidence = await prisma.auditEvidence.create({
      data: {
        userId,
        violationId,
        evidenceType,
        description,
        attachments: attachments ? JSON.stringify(attachments) : null,
        collectedAt: new Date(),
      },
    });

    res.status(201).json(evidence);
  } catch (error) {
    res.status(400).json({ error: 'Failed to collect audit evidence' });
  }
};

export const getAuditEvidence = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { violationId } = req.query;

    const evidence = await prisma.auditEvidence.findMany({
      where: {
        userId,
        ...(violationId && { violationId: violationId as string }),
      },
      orderBy: { collectedAt: 'desc' },
    });

    res.json(evidence);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch audit evidence' });
  }
};

// Compliance Dashboard
export const getComplianceDashboard = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;

    const totalRecords = await prisma.complianceRecord.count({ where: { userId } });
    const compliant = await prisma.complianceRecord.count({
      where: { userId, status: 'compliant' },
    });
    const violations = await prisma.complianceViolation.count({
      where: { userId, status: 'open' },
    });
    const policies = await prisma.compliancePolicy.count({
      where: { userId, isActive: true },
    });
    const recentLogs = await prisma.auditLogEntry.findMany({
      where: { userId },
      orderBy: { timestamp: 'desc' },
      take: 10,
    });

    const dashboard = {
      timestamp: new Date(),
      complianceOverview: {
        totalRecords,
        compliant,
        nonCompliant: totalRecords - compliant,
        complianceRate: totalRecords > 0 ? (compliant / totalRecords) * 100 : 0,
      },
      openViolations: violations,
      activePolicies: policies,
      recentActivity: recentLogs.length,
      lastAuditLog: recentLogs[0],
    };

    res.json(dashboard);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch compliance dashboard' });
  }
};

// Regulatory Frameworks
export const getRegulatoryFrameworks = async (req: Request, res: Response) => {
  try {
    const frameworks = [
      { id: 'gdpr', name: 'GDPR', description: 'General Data Protection Regulation' },
      { id: 'ccpa', name: 'CCPA', description: 'California Consumer Privacy Act' },
      { id: 'hipaa', name: 'HIPAA', description: 'Health Insurance Portability and Accountability Act' },
      { id: 'sox', name: 'SOX', description: 'Sarbanes-Oxley Act' },
      { id: 'pci-dss', name: 'PCI DSS', description: 'Payment Card Industry Data Security Standard' },
      { id: 'iso-27001', name: 'ISO 27001', description: 'Information Security Management' },
    ];

    res.json(frameworks);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch regulatory frameworks' });
  }
};
