import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Receipt Upload & Processing
export const uploadReceipt = async (req: Request, res: Response) => {
  try {
    const { fileUrl, fileName, receiptDate, vendorName } = req.body;
    const userId = (req as any).userId;

    const receipt = await prisma.receipt.create({
      data: {
        userId,
        fileUrl,
        fileName,
        receiptDate: receiptDate ? new Date(receiptDate) : new Date(),
        vendorName: vendorName || 'Unknown',
        status: 'uploaded',
        uploadedAt: new Date(),
      },
    });

    res.status(201).json(receipt);
  } catch (error) {
    res.status(400).json({ error: 'Failed to upload receipt' });
  }
};

export const processReceipt = async (req: Request, res: Response) => {
  try {
    const { receiptId } = req.params;
    const userId = (req as any).userId;

    const receipt = await prisma.receipt.findFirst({
      where: { id: receiptId, userId },
    });

    if (!receipt) {
      return res.status(404).json({ error: 'Receipt not found' });
    }

    // Simulate OCR processing
    const ocrResult = await prisma.receiptOCRResult.create({
      data: {
        receiptId,
        rawText: 'Sample OCR extracted text',
        confidence: 0.95,
        processedAt: new Date(),
        status: 'completed',
      },
    });

    // Update receipt status
    await prisma.receipt.update({
      where: { id: receiptId },
      data: { status: 'processed' },
    });

    res.json(ocrResult);
  } catch (error) {
    res.status(400).json({ error: 'Failed to process receipt' });
  }
};

export const extractExpenseData = async (req: Request, res: Response) => {
  try {
    const { receiptId, totalAmount, itemCount, category, paymentMethod, description } = req.body;
    const userId = (req as any).userId;

    const receipt = await prisma.receipt.findFirst({
      where: { id: receiptId, userId },
    });

    if (!receipt) {
      return res.status(404).json({ error: 'Receipt not found' });
    }

    const expense = await prisma.extractedExpense.create({
      data: {
        receiptId,
        userId,
        totalAmount: parseFloat(totalAmount),
        itemCount: itemCount || 1,
        category: category || 'uncategorized',
        paymentMethod: paymentMethod || 'cash',
        description: description || receipt.vendorName,
        extractedAt: new Date(),
        confidence: 0.9,
      },
    });

    res.status(201).json(expense);
  } catch (error) {
    res.status(400).json({ error: 'Failed to extract expense data' });
  }
};

export const getReceipts = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { status, days = 30, limit = 50 } = req.query;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days as string));

    const receipts = await prisma.receipt.findMany({
      where: {
        userId,
        ...(status && { status: status as string }),
        uploadedAt: { gte: startDate },
      },
      orderBy: { uploadedAt: 'desc' },
      take: parseInt(limit as string),
    });

    res.json(receipts);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch receipts' });
  }
};

export const getReceiptById = async (req: Request, res: Response) => {
  try {
    const { receiptId } = req.params;
    const userId = (req as any).userId;

    const receipt = await prisma.receipt.findFirst({
      where: { id: receiptId, userId },
      include: {
        ocrResults: true,
        expense: true,
      },
    });

    if (!receipt) {
      return res.status(404).json({ error: 'Receipt not found' });
    }

    res.json(receipt);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch receipt' });
  }
};

export const updateReceiptData = async (req: Request, res: Response) => {
  try {
    const { receiptId } = req.params;
    const { vendorName, receiptDate, notes } = req.body;
    const userId = (req as any).userId;

    const receipt = await prisma.receipt.updateMany({
      where: { id: receiptId, userId },
      data: {
        vendorName,
        receiptDate: receiptDate ? new Date(receiptDate) : undefined,
        notes: notes || null,
        updatedAt: new Date(),
      },
    });

    res.json({ success: receipt.count > 0 });
  } catch (error) {
    res.status(400).json({ error: 'Failed to update receipt' });
  }
};

export const deleteReceipt = async (req: Request, res: Response) => {
  try {
    const { receiptId } = req.params;
    const userId = (req as any).userId;

    await prisma.receipt.deleteMany({
      where: { id: receiptId, userId },
    });

    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: 'Failed to delete receipt' });
  }
};

// Extracted Expenses
export const getExtractedExpenses = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { category, limit = 50 } = req.query;

    const expenses = await prisma.extractedExpense.findMany({
      where: {
        userId,
        ...(category && { category: category as string }),
      },
      orderBy: { extractedAt: 'desc' },
      take: parseInt(limit as string),
    });

    res.json(expenses);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch extracted expenses' });
  }
};

export const updateExpenseData = async (req: Request, res: Response) => {
  try {
    const { expenseId } = req.params;
    const { totalAmount, category, description, confirmed } = req.body;
    const userId = (req as any).userId;

    const expense = await prisma.extractedExpense.updateMany({
      where: { id: expenseId, userId },
      data: {
        totalAmount: totalAmount ? parseFloat(totalAmount) : undefined,
        category,
        description,
        confirmed: confirmed || false,
        updatedAt: new Date(),
      },
    });

    res.json({ success: expense.count > 0 });
  } catch (error) {
    res.status(400).json({ error: 'Failed to update expense' });
  }
};

export const confirmExpense = async (req: Request, res: Response) => {
  try {
    const { expenseId } = req.params;
    const userId = (req as any).userId;

    const expense = await prisma.extractedExpense.updateMany({
      where: { id: expenseId, userId },
      data: {
        confirmed: true,
        confirmedAt: new Date(),
      },
    });

    res.json({ success: expense.count > 0 });
  } catch (error) {
    res.status(400).json({ error: 'Failed to confirm expense' });
  }
};

// Receipt Analysis
export const getReceiptAnalytics = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { days = 30 } = req.query;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days as string));

    const totalReceipts = await prisma.receipt.count({
      where: { userId, uploadedAt: { gte: startDate } },
    });

    const processedReceipts = await prisma.receipt.count({
      where: { userId, status: 'processed', uploadedAt: { gte: startDate } },
    });

    const expenses = await prisma.extractedExpense.findMany({
      where: { userId, extractedAt: { gte: startDate } },
    });

    const totalExpenseAmount = expenses.reduce((sum, exp) => sum + exp.totalAmount, 0);
    const avgExpenseAmount = expenses.length > 0 ? totalExpenseAmount / expenses.length : 0;

    const expensesByCategory = await prisma.extractedExpense.groupBy({
      by: ['category'],
      where: { userId, extractedAt: { gte: startDate } },
      _sum: { totalAmount: true },
      _count: true,
    });

    const analytics = {
      period: days,
      totalReceipts,
      processedReceipts,
      processingRate: totalReceipts > 0 ? (processedReceipts / totalReceipts) * 100 : 0,
      totalExpenses: expenses.length,
      totalExpenseAmount,
      avgExpenseAmount,
      expensesByCategory,
      timestamp: new Date(),
    };

    res.json(analytics);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch receipt analytics' });
  }
};

// Receipt Categories
export const getReceiptCategories = async (req: Request, res: Response) => {
  try {
    const categories = [
      { id: 'food', name: 'Food & Dining', icon: '🍽️' },
      { id: 'transport', name: 'Transportation', icon: '🚗' },
      { id: 'accommodation', name: 'Accommodation', icon: '🏨' },
      { id: 'office', name: 'Office Supplies', icon: '📝' },
      { id: 'software', name: 'Software & Tools', icon: '💻' },
      { id: 'utilities', name: 'Utilities', icon: '💡' },
      { id: 'marketing', name: 'Marketing', icon: '📢' },
      { id: 'equipment', name: 'Equipment', icon: '🔧' },
      { id: 'other', name: 'Other', icon: '📦' },
    ];

    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
};

// OCR Results
export const getOCRResults = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { receiptId } = req.query;

    const results = await prisma.receiptOCRResult.findMany({
      where: {
        receipt: { userId },
        ...(receiptId && { receiptId: receiptId as string }),
      },
      orderBy: { processedAt: 'desc' },
    });

    res.json(results);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch OCR results' });
  }
};

// Generate Receipt Report
export const generateReceiptReport = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, category } = req.body;
    const userId = (req as any).userId;

    const expenses = await prisma.extractedExpense.findMany({
      where: {
        userId,
        ...(category && { category }),
        extractedAt: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      },
    });

    const report = {
      period: {
        start: startDate,
        end: endDate,
      },
      summary: {
        totalExpenses: expenses.length,
        totalAmount: expenses.reduce((sum, exp) => sum + exp.totalAmount, 0),
        avgAmount: expenses.length > 0 ? expenses.reduce((sum, exp) => sum + exp.totalAmount, 0) / expenses.length : 0,
        byCategory: {} as any,
      },
      expenses,
      generatedAt: new Date(),
    };

    // Group by category
    expenses.forEach((exp) => {
      if (!report.summary.byCategory[exp.category]) {
        report.summary.byCategory[exp.category] = { count: 0, total: 0 };
      }
      report.summary.byCategory[exp.category].count++;
      report.summary.byCategory[exp.category].total += exp.totalAmount;
    });

    res.json(report);
  } catch (error) {
    res.status(400).json({ error: 'Failed to generate receipt report' });
  }
};

// Receipt Statistics
export const getReceiptStatistics = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { days = 90 } = req.query;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days as string));

    const totalUploaded = await prisma.receipt.count({
      where: { userId, uploadedAt: { gte: startDate } },
    });

    const processingStats = await prisma.receipt.groupBy({
      by: ['status'],
      where: { userId, uploadedAt: { gte: startDate } },
      _count: true,
    });

    const avgProcessingTime = 2.5; // Simulated average in seconds

    const stats = {
      period: days,
      totalUploaded,
      processingStats,
      avgProcessingTime,
      accuracyRate: 94.5, // Simulated accuracy
      totalExpensesExtracted: await prisma.extractedExpense.count({
        where: { userId, extractedAt: { gte: startDate } },
      }),
      timestamp: new Date(),
    };

    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch receipt statistics' });
  }
};
