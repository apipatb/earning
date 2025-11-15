import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Client Management
export const createClient = async (req: Request, res: Response) => {
  try {
    const {
      clientName,
      email,
      phone,
      address,
      city,
      state,
      country,
      zipCode,
      contactPerson,
      industry,
      companySize,
      website
    } = req.body;
    const userId = (req as any).userId;

    const client = await prisma.client.create({
      data: {
        userId,
        clientName,
        email,
        phone: phone || null,
        address: address || null,
        city: city || null,
        state: state || null,
        country: country || null,
        zipCode: zipCode || null,
        contactPerson: contactPerson || null,
        industry: industry || null,
        companySize: companySize || null,
        website: website || null,
        status: 'active',
        createdAt: new Date(),
      },
    });

    res.status(201).json(client);
  } catch (error) {
    res.status(400).json({ error: 'Failed to create client' });
  }
};

export const getClients = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { status, industry, limit = 50, page = 1 } = req.query;

    const where: any = { userId };
    if (status) where.status = status;
    if (industry) where.industry = industry;

    const clients = await prisma.client.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit as string),
      skip: (parseInt(page as string) - 1) * parseInt(limit as string),
      include: {
        projects: true,
        contracts: true,
      },
    });

    res.json(clients);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch clients' });
  }
};

export const getClientById = async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;
    const userId = (req as any).userId;

    const client = await prisma.client.findFirst({
      where: { id: clientId, userId },
      include: {
        projects: true,
        contracts: true,
        communications: true,
        invoices: true,
      },
    });

    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    res.json(client);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch client' });
  }
};

export const updateClient = async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;
    const { clientName, email, phone, address, status } = req.body;
    const userId = (req as any).userId;

    const client = await prisma.client.updateMany({
      where: { id: clientId, userId },
      data: {
        clientName,
        email,
        phone,
        address,
        status,
        updatedAt: new Date(),
      },
    });

    res.json({ success: client.count > 0 });
  } catch (error) {
    res.status(400).json({ error: 'Failed to update client' });
  }
};

export const deleteClient = async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;
    const userId = (req as any).userId;

    await prisma.client.deleteMany({
      where: { id: clientId, userId },
    });

    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: 'Failed to delete client' });
  }
};

// Vendor Management
export const createVendor = async (req: Request, res: Response) => {
  try {
    const {
      vendorName,
      email,
      phone,
      address,
      category,
      paymentTerms,
      taxId,
      website
    } = req.body;
    const userId = (req as any).userId;

    const vendor = await prisma.vendor.create({
      data: {
        userId,
        vendorName,
        email,
        phone: phone || null,
        address: address || null,
        category: category || 'other',
        paymentTerms: paymentTerms || 'net30',
        taxId: taxId || null,
        website: website || null,
        status: 'active',
        createdAt: new Date(),
      },
    });

    res.status(201).json(vendor);
  } catch (error) {
    res.status(400).json({ error: 'Failed to create vendor' });
  }
};

export const getVendors = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { category, status, limit = 50 } = req.query;

    const vendors = await prisma.vendor.findMany({
      where: {
        userId,
        ...(category && { category: category as string }),
        ...(status && { status: status as string }),
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit as string),
    });

    res.json(vendors);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch vendors' });
  }
};

export const updateVendor = async (req: Request, res: Response) => {
  try {
    const { vendorId } = req.params;
    const { vendorName, email, phone, status, paymentTerms } = req.body;
    const userId = (req as any).userId;

    const vendor = await prisma.vendor.updateMany({
      where: { id: vendorId, userId },
      data: {
        vendorName,
        email,
        phone,
        status,
        paymentTerms,
        updatedAt: new Date(),
      },
    });

    res.json({ success: vendor.count > 0 });
  } catch (error) {
    res.status(400).json({ error: 'Failed to update vendor' });
  }
};

// Communication History
export const createCommunication = async (req: Request, res: Response) => {
  try {
    const { clientId, communicationType, subject, content, date } = req.body;
    const userId = (req as any).userId;

    const communication = await prisma.clientCommunication.create({
      data: {
        userId,
        clientId,
        communicationType: communicationType || 'email', // email, call, meeting, message
        subject,
        content,
        date: new Date(date),
        createdAt: new Date(),
      },
    });

    res.status(201).json(communication);
  } catch (error) {
    res.status(400).json({ error: 'Failed to create communication' });
  }
};

export const getCommunications = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { clientId, type, limit = 50 } = req.query;

    const communications = await prisma.clientCommunication.findMany({
      where: {
        userId,
        ...(clientId && { clientId: clientId as string }),
        ...(type && { communicationType: type as string }),
      },
      orderBy: { date: 'desc' },
      take: parseInt(limit as string),
    });

    res.json(communications);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch communications' });
  }
};

// Contract Management
export const createContract = async (req: Request, res: Response) => {
  try {
    const {
      clientId,
      contractName,
      value,
      startDate,
      endDate,
      terms,
      status
    } = req.body;
    const userId = (req as any).userId;

    const contract = await prisma.clientContract.create({
      data: {
        userId,
        clientId,
        contractName,
        value: parseFloat(value),
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        terms: terms || null,
        status: status || 'active',
        createdAt: new Date(),
      },
    });

    res.status(201).json(contract);
  } catch (error) {
    res.status(400).json({ error: 'Failed to create contract' });
  }
};

export const getContracts = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { clientId, status, limit = 50 } = req.query;

    const contracts = await prisma.clientContract.findMany({
      where: {
        userId,
        ...(clientId && { clientId: clientId as string }),
        ...(status && { status: status as string }),
      },
      orderBy: { startDate: 'desc' },
      take: parseInt(limit as string),
    });

    res.json(contracts);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch contracts' });
  }
};

// Client Analytics
export const getClientAnalytics = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { days = 30 } = req.query;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days as string));

    const clients = await prisma.client.findMany({
      where: { userId },
      include: {
        projects: true,
        invoices: true,
      },
    });

    const activeClients = clients.filter((c) => c.status === 'active').length;
    const totalClients = clients.length;

    const totalProjectValue = clients.reduce((sum, c) => {
      const projectSum = c.projects.reduce((ps, p) => ps + (p.budget ? Number(p.budget) : 0), 0);
      return sum + projectSum;
    }, 0);

    const analytics = {
      period: days,
      totalClients,
      activeClients,
      inactiveClients: totalClients - activeClients,
      totalProjectValue,
      avgProjectValue: totalClients > 0 ? totalProjectValue / totalClients : 0,
      timestamp: new Date(),
    };

    res.json(analytics);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
};

// Client Ratings
export const rateClient = async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;
    const { rating, feedback } = req.body;
    const userId = (req as any).userId;

    const clientRating = await prisma.clientRating.create({
      data: {
        userId,
        clientId,
        rating: parseInt(rating),
        feedback: feedback || null,
        createdAt: new Date(),
      },
    });

    res.status(201).json(clientRating);
  } catch (error) {
    res.status(400).json({ error: 'Failed to rate client' });
  }
};

export const getClientRatings = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { clientId } = req.query;

    const ratings = await prisma.clientRating.findMany({
      where: {
        userId,
        ...(clientId && { clientId: clientId as string }),
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(ratings);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch ratings' });
  }
};

// Service Level Agreements
export const createSLA = async (req: Request, res: Response) => {
  try {
    const { clientId, serviceName, responseTime, resolutionTime, uptime } = req.body;
    const userId = (req as any).userId;

    const sla = await prisma.serviceLevelAgreement.create({
      data: {
        userId,
        clientId,
        serviceName,
        responseTime: parseInt(responseTime), // hours
        resolutionTime: parseInt(resolutionTime), // hours
        uptime: parseFloat(uptime), // percentage
        createdAt: new Date(),
      },
    });

    res.status(201).json(sla);
  } catch (error) {
    res.status(400).json({ error: 'Failed to create SLA' });
  }
};

export const getSLAs = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { clientId } = req.query;

    const slas = await prisma.serviceLevelAgreement.findMany({
      where: {
        userId,
        ...(clientId && { clientId: clientId as string }),
      },
    });

    res.json(slas);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch SLAs' });
  }
};

// Client Statistics
export const getClientStatistics = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;

    const clients = await prisma.client.findMany({
      where: { userId },
      include: {
        projects: true,
        invoices: true,
        contracts: true,
      },
    });

    const stats = {
      totalClients: clients.length,
      activeClients: clients.filter((c) => c.status === 'active').length,
      totalProjects: clients.reduce((sum, c) => sum + c.projects.length, 0),
      totalContracts: clients.reduce((sum, c) => sum + c.contracts.length, 0),
      totalInvoices: clients.reduce((sum, c) => sum + c.invoices.length, 0),
      avgProjectsPerClient: clients.length > 0
        ? clients.reduce((sum, c) => sum + c.projects.length, 0) / clients.length
        : 0,
      timestamp: new Date(),
    };

    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
};
