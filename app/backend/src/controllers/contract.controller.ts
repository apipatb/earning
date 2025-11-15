import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const createContract = async (req: Request, res: Response) => {
  const { title, description, contractType, clientId, value, currency, startDate, endDate, terms, status } = req.body;
  const userId = (req as any).userId;

  const contract = await prisma.contract.create({
    data: {
      userId,
      title,
      description,
      contractType: contractType || 'service', // service, nda, employment, vendor, license
      clientId,
      value: parseFloat(value) || 0,
      currency: currency || 'USD',
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      terms: JSON.stringify(terms || {}),
      status: status || 'draft', // draft, pending_signature, active, completed, terminated, expired
      createdAt: new Date(),
      updatedAt: new Date()
    }
  });

  res.status(201).json(contract);
};

export const getContracts = async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const { status, type, clientId } = req.query;

  const filters: any = { userId };
  if (status) filters.status = status;
  if (type) filters.contractType = type;
  if (clientId) filters.clientId = clientId;

  const contracts = await prisma.contract.findMany({
    where: filters,
    include: {
      client: true,
      milestones: true,
      documents: true,
      signatures: true,
    },
    orderBy: { createdAt: 'desc' }
  });

  res.json(contracts);
};

export const getContractById = async (req: Request, res: Response) => {
  const { contractId } = req.params;
  const userId = (req as any).userId;

  const contract = await prisma.contract.findUnique({
    where: { id: contractId },
    include: {
      client: true,
      milestones: true,
      documents: true,
      signatures: true,
      payments: true,
      renewals: true,
      amendments: true,
    }
  });

  if (!contract || contract.userId !== userId) {
    return res.status(404).json({ error: 'Contract not found' });
  }

  res.json(contract);
};

export const updateContract = async (req: Request, res: Response) => {
  const { contractId } = req.params;
  const userId = (req as any).userId;
  const { title, description, status, terms, endDate } = req.body;

  const contract = await prisma.contract.findUnique({ where: { id: contractId } });
  if (!contract || contract.userId !== userId) {
    return res.status(404).json({ error: 'Contract not found' });
  }

  const updated = await prisma.contract.update({
    where: { id: contractId },
    data: {
      ...(title && { title }),
      ...(description && { description }),
      ...(status && { status }),
      ...(terms && { terms: JSON.stringify(terms) }),
      ...(endDate && { endDate: new Date(endDate) }),
      updatedAt: new Date()
    }
  });

  res.json(updated);
};

export const deleteContract = async (req: Request, res: Response) => {
  const { contractId } = req.params;
  const userId = (req as any).userId;

  const contract = await prisma.contract.findUnique({ where: { id: contractId } });
  if (!contract || contract.userId !== userId) {
    return res.status(404).json({ error: 'Contract not found' });
  }

  await prisma.contract.delete({ where: { id: contractId } });

  res.json({ success: true, message: 'Contract deleted' });
};

export const createMilestone = async (req: Request, res: Response) => {
  const { contractId, name, description, dueDate, deliverable, value } = req.body;
  const userId = (req as any).userId;

  const contract = await prisma.contract.findUnique({ where: { id: contractId } });
  if (!contract || contract.userId !== userId) {
    return res.status(404).json({ error: 'Contract not found' });
  }

  const milestone = await prisma.contractMilestone.create({
    data: {
      userId,
      contractId,
      name,
      description,
      dueDate: new Date(dueDate),
      deliverable,
      value: parseFloat(value) || 0,
      status: 'pending',
      createdAt: new Date()
    }
  });

  res.status(201).json(milestone);
};

export const getMilestones = async (req: Request, res: Response) => {
  const { contractId } = req.params;
  const userId = (req as any).userId;

  const contract = await prisma.contract.findUnique({ where: { id: contractId } });
  if (!contract || contract.userId !== userId) {
    return res.status(404).json({ error: 'Contract not found' });
  }

  const milestones = await prisma.contractMilestone.findMany({
    where: { contractId },
    orderBy: { dueDate: 'asc' }
  });

  res.json(milestones);
};

export const updateMilestone = async (req: Request, res: Response) => {
  const { milestoneId } = req.params;
  const userId = (req as any).userId;
  const { status, completedAt } = req.body;

  const milestone = await prisma.contractMilestone.findUnique({ where: { id: milestoneId } });
  if (!milestone || milestone.userId !== userId) {
    return res.status(404).json({ error: 'Milestone not found' });
  }

  const updated = await prisma.contractMilestone.update({
    where: { id: milestoneId },
    data: {
      ...(status && { status }),
      ...(completedAt && { completedAt: new Date(completedAt) })
    }
  });

  res.json(updated);
};

export const createSignature = async (req: Request, res: Response) => {
  const { contractId, signedBy, signatureData, date } = req.body;
  const userId = (req as any).userId;

  const contract = await prisma.contract.findUnique({ where: { id: contractId } });
  if (!contract || contract.userId !== userId) {
    return res.status(404).json({ error: 'Contract not found' });
  }

  const signature = await prisma.contractSignature.create({
    data: {
      userId,
      contractId,
      signedBy,
      signatureData,
      date: new Date(date),
      createdAt: new Date()
    }
  });

  // Update contract status to active if all parties signed
  const totalSignatures = await prisma.contractSignature.count({ where: { contractId } });
  if (totalSignatures >= 2) {
    await prisma.contract.update({
      where: { id: contractId },
      data: { status: 'active' }
    });
  }

  res.status(201).json(signature);
};

export const getSignatures = async (req: Request, res: Response) => {
  const { contractId } = req.params;
  const userId = (req as any).userId;

  const contract = await prisma.contract.findUnique({ where: { id: contractId } });
  if (!contract || contract.userId !== userId) {
    return res.status(404).json({ error: 'Contract not found' });
  }

  const signatures = await prisma.contractSignature.findMany({
    where: { contractId },
    orderBy: { date: 'desc' }
  });

  res.json(signatures);
};

export const createPayment = async (req: Request, res: Response) => {
  const { contractId, amount, dueDate, status, milestone } = req.body;
  const userId = (req as any).userId;

  const contract = await prisma.contract.findUnique({ where: { id: contractId } });
  if (!contract || contract.userId !== userId) {
    return res.status(404).json({ error: 'Contract not found' });
  }

  const payment = await prisma.contractPayment.create({
    data: {
      userId,
      contractId,
      amount: parseFloat(amount) || 0,
      dueDate: new Date(dueDate),
      status: status || 'pending',
      milestone: milestone || null,
      createdAt: new Date()
    }
  });

  res.status(201).json(payment);
};

export const getPayments = async (req: Request, res: Response) => {
  const { contractId } = req.params;
  const userId = (req as any).userId;

  const contract = await prisma.contract.findUnique({ where: { id: contractId } });
  if (!contract || contract.userId !== userId) {
    return res.status(404).json({ error: 'Contract not found' });
  }

  const payments = await prisma.contractPayment.findMany({
    where: { contractId },
    orderBy: { dueDate: 'asc' }
  });

  res.json(payments);
};

export const uploadDocument = async (req: Request, res: Response) => {
  const { contractId, name, fileUrl, type } = req.body;
  const userId = (req as any).userId;

  const contract = await prisma.contract.findUnique({ where: { id: contractId } });
  if (!contract || contract.userId !== userId) {
    return res.status(404).json({ error: 'Contract not found' });
  }

  const document = await prisma.contractDocument.create({
    data: {
      userId,
      contractId,
      name,
      fileUrl,
      type: type || 'other',
      uploadedAt: new Date(),
      createdAt: new Date()
    }
  });

  res.status(201).json(document);
};

export const getDocuments = async (req: Request, res: Response) => {
  const { contractId } = req.params;
  const userId = (req as any).userId;

  const contract = await prisma.contract.findUnique({ where: { id: contractId } });
  if (!contract || contract.userId !== userId) {
    return res.status(404).json({ error: 'Contract not found' });
  }

  const documents = await prisma.contractDocument.findMany({
    where: { contractId },
    orderBy: { uploadedAt: 'desc' }
  });

  res.json(documents);
};

export const createRenewal = async (req: Request, res: Response) => {
  const { contractId, renewalDate, terms, autoRenewal } = req.body;
  const userId = (req as any).userId;

  const contract = await prisma.contract.findUnique({ where: { id: contractId } });
  if (!contract || contract.userId !== userId) {
    return res.status(404).json({ error: 'Contract not found' });
  }

  const renewal = await prisma.contractRenewal.create({
    data: {
      userId,
      contractId,
      renewalDate: new Date(renewalDate),
      terms: JSON.stringify(terms || {}),
      autoRenewal: autoRenewal || false,
      status: 'pending',
      createdAt: new Date()
    }
  });

  res.status(201).json(renewal);
};

export const getRenewals = async (req: Request, res: Response) => {
  const { contractId } = req.params;
  const userId = (req as any).userId;

  const contract = await prisma.contract.findUnique({ where: { id: contractId } });
  if (!contract || contract.userId !== userId) {
    return res.status(404).json({ error: 'Contract not found' });
  }

  const renewals = await prisma.contractRenewal.findMany({
    where: { contractId },
    orderBy: { renewalDate: 'desc' }
  });

  res.json(renewals);
};

export const createAmendment = async (req: Request, res: Response) => {
  const { contractId, title, description, changes } = req.body;
  const userId = (req as any).userId;

  const contract = await prisma.contract.findUnique({ where: { id: contractId } });
  if (!contract || contract.userId !== userId) {
    return res.status(404).json({ error: 'Contract not found' });
  }

  const amendment = await prisma.contractAmendment.create({
    data: {
      userId,
      contractId,
      title,
      description,
      changes: JSON.stringify(changes || {}),
      status: 'pending',
      createdAt: new Date()
    }
  });

  res.status(201).json(amendment);
};

export const getAmendments = async (req: Request, res: Response) => {
  const { contractId } = req.params;
  const userId = (req as any).userId;

  const contract = await prisma.contract.findUnique({ where: { id: contractId } });
  if (!contract || contract.userId !== userId) {
    return res.status(404).json({ error: 'Contract not found' });
  }

  const amendments = await prisma.contractAmendment.findMany({
    where: { contractId },
    orderBy: { createdAt: 'desc' }
  });

  res.json(amendments);
};

export const getContractAnalytics = async (req: Request, res: Response) => {
  const userId = (req as any).userId;

  const totalContracts = await prisma.contract.count({ where: { userId } });
  const activeContracts = await prisma.contract.count({ where: { userId, status: 'active' } });
  const completedContracts = await prisma.contract.count({ where: { userId, status: 'completed' } });
  const pendingContracts = await prisma.contract.count({ where: { userId, status: 'pending_signature' } });

  const contracts = await prisma.contract.findMany({
    where: { userId },
    select: { value: true }
  });
  const totalValue = contracts.reduce((sum: number, c: any) => sum + (c.value || 0), 0);

  const pendingPayments = await prisma.contractPayment.findMany({
    where: { userId, status: 'pending' }
  });
  const totalPendingPayments = pendingPayments.reduce((sum: number, p: any) => sum + (p.amount || 0), 0);

  res.json({
    totalContracts,
    activeContracts,
    completedContracts,
    pendingContracts,
    totalValue,
    totalPendingPayments,
    contractsByType: await getContractsByType(userId),
    upcomingMilestones: await getUpcomingMilestones(userId),
    upcomingRenewals: await getUpcomingRenewals(userId)
  });
};

async function getContractsByType(userId: string) {
  const types = ['service', 'nda', 'employment', 'vendor', 'license'];
  const result: any = {};
  for (const type of types) {
    result[type] = await prisma.contract.count({ where: { userId, contractType: type } });
  }
  return result;
}

async function getUpcomingMilestones(userId: string) {
  const today = new Date();
  const futureDate = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

  return await prisma.contractMilestone.findMany({
    where: {
      userId,
      dueDate: { gte: today, lte: futureDate },
      status: 'pending'
    },
    orderBy: { dueDate: 'asc' },
    take: 10
  });
}

async function getUpcomingRenewals(userId: string) {
  const today = new Date();
  const futureDate = new Date(today.getTime() + 60 * 24 * 60 * 60 * 1000); // 60 days

  return await prisma.contractRenewal.findMany({
    where: {
      userId,
      renewalDate: { gte: today, lte: futureDate },
      status: 'pending'
    },
    orderBy: { renewalDate: 'asc' },
    take: 10
  });
}

export const getContractStatistics = async (req: Request, res: Response) => {
  const userId = (req as any).userId;

  const contracts = await prisma.contract.findMany({ where: { userId } });
  const activeValue = contracts
    .filter(c => c.status === 'active')
    .reduce((sum, c) => sum + (c.value || 0), 0);

  const completedValue = contracts
    .filter(c => c.status === 'completed')
    .reduce((sum, c) => sum + (c.value || 0), 0);

  const milestones = await prisma.contractMilestone.findMany({ where: { userId } });
  const completedMilestones = milestones.filter(m => m.status === 'completed').length;
  const completionRate = milestones.length > 0 ? (completedMilestones / milestones.length) * 100 : 0;

  res.json({
    contractStats: {
      total: contracts.length,
      byStatus: {
        draft: contracts.filter(c => c.status === 'draft').length,
        pendingSignature: contracts.filter(c => c.status === 'pending_signature').length,
        active: contracts.filter(c => c.status === 'active').length,
        completed: contracts.filter(c => c.status === 'completed').length,
        terminated: contracts.filter(c => c.status === 'terminated').length,
        expired: contracts.filter(c => c.status === 'expired').length
      }
    },
    valueStats: {
      activeValue,
      completedValue,
      totalValue: contracts.reduce((sum, c) => sum + (c.value || 0), 0)
    },
    milestoneStats: {
      total: milestones.length,
      completed: completedMilestones,
      completionRate: completionRate.toFixed(2)
    }
  });
};
