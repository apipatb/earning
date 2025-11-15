import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const createVendor = async (req: Request, res: Response) => {
  const { vendorName, email, phone, category, paymentTerms, taxId, website, address, city, state, country } = req.body;
  const userId = (req as any).userId;

  const vendor = await prisma.vendor.create({
    data: {
      userId,
      vendorName,
      email,
      phone: phone || null,
      category: category || 'other',
      paymentTerms: paymentTerms || 'net30',
      taxId: taxId || null,
      website: website || null,
      address: address || null,
      city: city || null,
      state: state || null,
      country: country || null,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date()
    }
  });

  res.status(201).json(vendor);
};

export const getVendors = async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const { status, category } = req.query;

  const filters: any = { userId };
  if (status) filters.status = status;
  if (category) filters.category = category;

  const vendors = await prisma.vendor.findMany({
    where: filters,
    include: {
      purchaseOrders: true,
      invoices: true,
      ratings: true
    },
    orderBy: { createdAt: 'desc' }
  });

  res.json(vendors);
};

export const getVendorById = async (req: Request, res: Response) => {
  const { vendorId } = req.params;
  const userId = (req as any).userId;

  const vendor = await prisma.vendor.findUnique({
    where: { id: vendorId },
    include: {
      purchaseOrders: true,
      invoices: true,
      ratings: true,
      performanceMetrics: true
    }
  });

  if (!vendor || vendor.userId !== userId) {
    return res.status(404).json({ error: 'Vendor not found' });
  }

  res.json(vendor);
};

export const updateVendor = async (req: Request, res: Response) => {
  const { vendorId } = req.params;
  const userId = (req as any).userId;
  const { vendorName, status, paymentTerms, website } = req.body;

  const vendor = await prisma.vendor.findUnique({ where: { id: vendorId } });
  if (!vendor || vendor.userId !== userId) {
    return res.status(404).json({ error: 'Vendor not found' });
  }

  const updated = await prisma.vendor.update({
    where: { id: vendorId },
    data: {
      ...(vendorName && { vendorName }),
      ...(status && { status }),
      ...(paymentTerms && { paymentTerms }),
      ...(website && { website }),
      updatedAt: new Date()
    }
  });

  res.json(updated);
};

export const deleteVendor = async (req: Request, res: Response) => {
  const { vendorId } = req.params;
  const userId = (req as any).userId;

  const vendor = await prisma.vendor.findUnique({ where: { id: vendorId } });
  if (!vendor || vendor.userId !== userId) {
    return res.status(404).json({ error: 'Vendor not found' });
  }

  await prisma.vendor.delete({ where: { id: vendorId } });

  res.json({ success: true, message: 'Vendor deleted' });
};

export const createPurchaseOrder = async (req: Request, res: Response) => {
  const { vendorId, poNumber, description, items, totalAmount, dueDate, status } = req.body;
  const userId = (req as any).userId;

  const vendor = await prisma.vendor.findUnique({ where: { id: vendorId } });
  if (!vendor || vendor.userId !== userId) {
    return res.status(404).json({ error: 'Vendor not found' });
  }

  const po = await prisma.purchaseOrder.create({
    data: {
      userId,
      vendorId,
      poNumber,
      description: description || null,
      items: JSON.stringify(items || []),
      totalAmount: parseFloat(totalAmount) || 0,
      dueDate: new Date(dueDate),
      status: status || 'draft', // draft, issued, confirmed, received, cancelled
      createdAt: new Date(),
      updatedAt: new Date()
    }
  });

  res.status(201).json(po);
};

export const getPurchaseOrders = async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const { vendorId, status } = req.query;

  const filters: any = { userId };
  if (vendorId) filters.vendorId = vendorId;
  if (status) filters.status = status;

  const pos = await prisma.purchaseOrder.findMany({
    where: filters,
    include: { vendor: true },
    orderBy: { createdAt: 'desc' }
  });

  res.json(pos);
};

export const updatePurchaseOrder = async (req: Request, res: Response) => {
  const { poId } = req.params;
  const userId = (req as any).userId;
  const { status, receivedDate, totalAmount } = req.body;

  const po = await prisma.purchaseOrder.findUnique({ where: { id: poId } });
  if (!po || po.userId !== userId) {
    return res.status(404).json({ error: 'Purchase order not found' });
  }

  const updated = await prisma.purchaseOrder.update({
    where: { id: poId },
    data: {
      ...(status && { status }),
      ...(receivedDate && { receivedDate: new Date(receivedDate) }),
      ...(totalAmount && { totalAmount: parseFloat(totalAmount) }),
      updatedAt: new Date()
    }
  });

  res.json(updated);
};

export const createVendorInvoice = async (req: Request, res: Response) => {
  const { vendorId, invoiceNumber, amount, dueDate, description, poId } = req.body;
  const userId = (req as any).userId;

  const vendor = await prisma.vendor.findUnique({ where: { id: vendorId } });
  if (!vendor || vendor.userId !== userId) {
    return res.status(404).json({ error: 'Vendor not found' });
  }

  const invoice = await prisma.vendorInvoice.create({
    data: {
      userId,
      vendorId,
      invoiceNumber,
      amount: parseFloat(amount) || 0,
      dueDate: new Date(dueDate),
      description: description || null,
      purchaseOrderId: poId || null,
      status: 'pending', // pending, received, approved, paid, rejected
      createdAt: new Date()
    }
  });

  res.status(201).json(invoice);
};

export const getVendorInvoices = async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const { vendorId, status } = req.query;

  const filters: any = { userId };
  if (vendorId) filters.vendorId = vendorId;
  if (status) filters.status = status;

  const invoices = await prisma.vendorInvoice.findMany({
    where: filters,
    include: { vendor: true },
    orderBy: { createdAt: 'desc' }
  });

  res.json(invoices);
};

export const updateVendorInvoice = async (req: Request, res: Response) => {
  const { invoiceId } = req.params;
  const userId = (req as any).userId;
  const { status, paidDate, amount } = req.body;

  const invoice = await prisma.vendorInvoice.findUnique({ where: { id: invoiceId } });
  if (!invoice || invoice.userId !== userId) {
    return res.status(404).json({ error: 'Invoice not found' });
  }

  const updated = await prisma.vendorInvoice.update({
    where: { id: invoiceId },
    data: {
      ...(status && { status }),
      ...(paidDate && { paidDate: new Date(paidDate) }),
      ...(amount && { amount: parseFloat(amount) }),
      updatedAt: new Date()
    }
  });

  res.json(updated);
};

export const createVendorRating = async (req: Request, res: Response) => {
  const { vendorId, rating, comment, category } = req.body;
  const userId = (req as any).userId;

  const vendor = await prisma.vendor.findUnique({ where: { id: vendorId } });
  if (!vendor || vendor.userId !== userId) {
    return res.status(404).json({ error: 'Vendor not found' });
  }

  const vendorRating = await prisma.vendorRating.create({
    data: {
      userId,
      vendorId,
      rating: parseInt(rating) || 5, // 1-5 stars
      comment: comment || null,
      category: category || 'overall', // quality, delivery, communication, pricing, overall
      createdAt: new Date()
    }
  });

  res.status(201).json(vendorRating);
};

export const getVendorRatings = async (req: Request, res: Response) => {
  const { vendorId } = req.params;
  const userId = (req as any).userId;

  const vendor = await prisma.vendor.findUnique({ where: { id: vendorId } });
  if (!vendor || vendor.userId !== userId) {
    return res.status(404).json({ error: 'Vendor not found' });
  }

  const ratings = await prisma.vendorRating.findMany({
    where: { vendorId },
    orderBy: { createdAt: 'desc' }
  });

  res.json(ratings);
};

export const createPerformanceMetric = async (req: Request, res: Response) => {
  const { vendorId, onTimeDeliveryRate, qualityScore, communicationScore, priceCompetitiveness } = req.body;
  const userId = (req as any).userId;

  const vendor = await prisma.vendor.findUnique({ where: { id: vendorId } });
  if (!vendor || vendor.userId !== userId) {
    return res.status(404).json({ error: 'Vendor not found' });
  }

  const metric = await prisma.vendorPerformanceMetric.create({
    data: {
      userId,
      vendorId,
      onTimeDeliveryRate: parseFloat(onTimeDeliveryRate) || 0,
      qualityScore: parseFloat(qualityScore) || 0,
      communicationScore: parseFloat(communicationScore) || 0,
      priceCompetitiveness: parseFloat(priceCompetitiveness) || 0,
      overallScore: (parseFloat(onTimeDeliveryRate) + parseFloat(qualityScore) + parseFloat(communicationScore) + parseFloat(priceCompetitiveness)) / 4 || 0,
      createdAt: new Date()
    }
  });

  res.status(201).json(metric);
};

export const getPerformanceMetrics = async (req: Request, res: Response) => {
  const { vendorId } = req.params;
  const userId = (req as any).userId;

  const vendor = await prisma.vendor.findUnique({ where: { id: vendorId } });
  if (!vendor || vendor.userId !== userId) {
    return res.status(404).json({ error: 'Vendor not found' });
  }

  const metrics = await prisma.vendorPerformanceMetric.findMany({
    where: { vendorId },
    orderBy: { createdAt: 'desc' }
  });

  res.json(metrics);
};

export const getProcurementAnalytics = async (req: Request, res: Response) => {
  const userId = (req as any).userId;

  const totalVendors = await prisma.vendor.count({ where: { userId } });
  const activeVendors = await prisma.vendor.count({ where: { userId, status: 'active' } });

  const purchaseOrders = await prisma.purchaseOrder.findMany({ where: { userId } });
  const totalPoAmount = purchaseOrders.reduce((sum, po) => sum + (po.totalAmount || 0), 0);
  const completedPos = purchaseOrders.filter(po => po.status === 'received').length;

  const vendorInvoices = await prisma.vendorInvoice.findMany({ where: { userId } });
  const totalInvoiceAmount = vendorInvoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);
  const paidInvoices = vendorInvoices.filter(inv => inv.status === 'paid').length;
  const pendingInvoiceAmount = vendorInvoices
    .filter(inv => inv.status !== 'paid')
    .reduce((sum, inv) => sum + (inv.amount || 0), 0);

  const ratings = await prisma.vendorRating.findMany({ where: { userId } });
  const avgRating = ratings.length > 0 ? (ratings.reduce((sum, r) => sum + (r.rating || 0), 0) / ratings.length) : 0;

  const categoryBreakdown: any = {};
  const vendors = await prisma.vendor.findMany({ where: { userId } });
  for (const vendor of vendors) {
    categoryBreakdown[vendor.category] = (categoryBreakdown[vendor.category] || 0) + 1;
  }

  res.json({
    vendorMetrics: {
      totalVendors,
      activeVendors,
      inactiveVendors: totalVendors - activeVendors,
      categoryBreakdown
    },
    purchasingMetrics: {
      totalPOs: purchaseOrders.length,
      totalPoAmount,
      completedPos,
      pendingPos: purchaseOrders.filter(po => po.status !== 'received' && po.status !== 'cancelled').length
    },
    invoiceMetrics: {
      totalInvoices: vendorInvoices.length,
      totalInvoiceAmount,
      paidInvoices,
      pendingInvoices: vendorInvoices.filter(inv => inv.status !== 'paid').length,
      pendingInvoiceAmount
    },
    performanceMetrics: {
      averageVendorRating: avgRating.toFixed(2),
      topRatedCategory: ratings.length > 0 ? ratings.reduce((a, b) => (a.rating || 0) > (b.rating || 0) ? a : b).category : null
    }
  });
};

export const getProcurementStatistics = async (req: Request, res: Response) => {
  const userId = (req as any).userId;

  const vendors = await prisma.vendor.findMany({ where: { userId } });
  const pos = await prisma.purchaseOrder.findMany({ where: { userId } });
  const invoices = await prisma.vendorInvoice.findMany({ where: { userId } });
  const ratings = await prisma.vendorRating.findMany({ where: { userId } });
  const metrics = await prisma.vendorPerformanceMetric.findMany({ where: { userId } });

  const avgPoAmount = pos.length > 0 ? (pos.reduce((sum, po) => sum + (po.totalAmount || 0), 0) / pos.length) : 0;
  const avgInvoiceAmount = invoices.length > 0 ? (invoices.reduce((sum, inv) => sum + (inv.amount || 0), 0) / invoices.length) : 0;

  const posByStatus: any = {};
  const poStatuses = ['draft', 'issued', 'confirmed', 'received', 'cancelled'];
  for (const status of poStatuses) {
    posByStatus[status] = pos.filter(p => p.status === status).length;
  }

  const invoicesByStatus: any = {};
  const invoiceStatuses = ['pending', 'received', 'approved', 'paid', 'rejected'];
  for (const status of invoiceStatuses) {
    invoicesByStatus[status] = invoices.filter(i => i.status === status).length;
  }

  res.json({
    vendorStatistics: {
      totalVendors: vendors.length,
      byStatus: {
        active: vendors.filter(v => v.status === 'active').length,
        inactive: vendors.filter(v => v.status === 'inactive').length
      },
      byCategory: vendors.reduce((acc: any, v: any) => {
        acc[v.category] = (acc[v.category] || 0) + 1;
        return acc;
      }, {})
    },
    poStatistics: {
      totalPos: pos.length,
      totalPoAmount: pos.reduce((sum, po) => sum + (po.totalAmount || 0), 0),
      avgPoAmount: avgPoAmount.toFixed(2),
      byStatus: posByStatus
    },
    invoiceStatistics: {
      totalInvoices: invoices.length,
      totalInvoiceAmount: invoices.reduce((sum, inv) => sum + (inv.amount || 0), 0),
      avgInvoiceAmount: avgInvoiceAmount.toFixed(2),
      byStatus: invoicesByStatus
    },
    performanceStatistics: {
      totalRatings: ratings.length,
      avgRating: ratings.length > 0 ? (ratings.reduce((sum, r) => sum + (r.rating || 0), 0) / ratings.length).toFixed(2) : 0,
      avgPerformanceScore: metrics.length > 0 ? (metrics.reduce((sum, m) => sum + (m.overallScore || 0), 0) / metrics.length).toFixed(2) : 0
    }
  });
};

export const getTopVendors = async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const { limit } = req.query;
  const limitNum = parseInt(limit as string) || 5;

  const vendors = await prisma.vendor.findMany({
    where: { userId },
    include: {
      purchaseOrders: true,
      ratings: true,
      performanceMetrics: true
    }
  });

  const vendorsWithScore = vendors.map(v => ({
    ...v,
    poCount: v.purchaseOrders.length,
    avgRating: v.ratings.length > 0 ? v.ratings.reduce((sum, r) => sum + r.rating, 0) / v.ratings.length : 0,
    avgPerformance: v.performanceMetrics.length > 0 ? v.performanceMetrics.reduce((sum, m) => sum + m.overallScore, 0) / v.performanceMetrics.length : 0
  }));

  const topVendors = vendorsWithScore.sort((a, b) => b.poCount - a.poCount).slice(0, limitNum);

  res.json(topVendors);
};
