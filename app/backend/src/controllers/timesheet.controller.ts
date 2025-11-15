import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Timesheet Entry Management
export const createTimesheetEntry = async (req: Request, res: Response) => {
  try {
    const { projectId, taskDescription, date, startTime, endTime, duration, billable } = req.body;
    const userId = (req as any).userId;

    const entry = await prisma.timesheetEntry.create({
      data: {
        userId,
        projectId,
        taskDescription,
        date: new Date(date),
        startTime,
        endTime,
        duration: parseFloat(duration), // hours
        billable: billable || true,
        status: 'submitted',
        createdAt: new Date(),
      },
    });

    res.status(201).json(entry);
  } catch (error) {
    res.status(400).json({ error: 'Failed to create timesheet entry' });
  }
};

export const getTimesheetEntries = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { projectId, dateFrom, dateTo, billable, limit = 50, page = 1 } = req.query;

    const where: any = { userId };
    if (projectId) where.projectId = projectId;
    if (billable !== undefined) where.billable = billable === 'true';
    if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) where.date.gte = new Date(dateFrom as string);
      if (dateTo) where.date.lte = new Date(dateTo as string);
    }

    const entries = await prisma.timesheetEntry.findMany({
      where,
      orderBy: { date: 'desc' },
      take: parseInt(limit as string),
      skip: (parseInt(page as string) - 1) * parseInt(limit as string),
    });

    res.json(entries);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch timesheet entries' });
  }
};

export const updateTimesheetEntry = async (req: Request, res: Response) => {
  try {
    const { entryId } = req.params;
    const { duration, taskDescription, billable, status } = req.body;
    const userId = (req as any).userId;

    const entry = await prisma.timesheetEntry.updateMany({
      where: { id: entryId, userId },
      data: {
        ...(duration && { duration: parseFloat(duration) }),
        taskDescription,
        billable,
        status,
        updatedAt: new Date(),
      },
    });

    res.json({ success: entry.count > 0 });
  } catch (error) {
    res.status(400).json({ error: 'Failed to update entry' });
  }
};

export const deleteTimesheetEntry = async (req: Request, res: Response) => {
  try {
    const { entryId } = req.params;
    const userId = (req as any).userId;

    await prisma.timesheetEntry.deleteMany({
      where: { id: entryId, userId },
    });

    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: 'Failed to delete entry' });
  }
};

// Timesheet Management
export const createTimesheet = async (req: Request, res: Response) => {
  try {
    const { projectId, weekStartDate, weekEndDate } = req.body;
    const userId = (req as any).userId;

    const timesheet = await prisma.timesheet.create({
      data: {
        userId,
        projectId,
        weekStartDate: new Date(weekStartDate),
        weekEndDate: new Date(weekEndDate),
        totalHours: 0,
        billableHours: 0,
        status: 'draft',
        createdAt: new Date(),
      },
    });

    res.status(201).json(timesheet);
  } catch (error) {
    res.status(400).json({ error: 'Failed to create timesheet' });
  }
};

export const getTimesheets = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { projectId, status, limit = 50 } = req.query;

    const timesheets = await prisma.timesheet.findMany({
      where: {
        userId,
        ...(projectId && { projectId: projectId as string }),
        ...(status && { status: status as string }),
      },
      orderBy: { weekStartDate: 'desc' },
      take: parseInt(limit as string),
      include: {
        entries: true,
      },
    });

    res.json(timesheets);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch timesheets' });
  }
};

export const getTimesheetById = async (req: Request, res: Response) => {
  try {
    const { timesheetId } = req.params;
    const userId = (req as any).userId;

    const timesheet = await prisma.timesheet.findFirst({
      where: { id: timesheetId, userId },
      include: {
        entries: true,
      },
    });

    if (!timesheet) {
      return res.status(404).json({ error: 'Timesheet not found' });
    }

    res.json(timesheet);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch timesheet' });
  }
};

export const submitTimesheet = async (req: Request, res: Response) => {
  try {
    const { timesheetId } = req.params;
    const userId = (req as any).userId;

    const timesheet = await prisma.timesheet.updateMany({
      where: { id: timesheetId, userId },
      data: { status: 'submitted', submittedAt: new Date() },
    });

    res.json({ success: timesheet.count > 0 });
  } catch (error) {
    res.status(400).json({ error: 'Failed to submit timesheet' });
  }
};

export const approveTimesheet = async (req: Request, res: Response) => {
  try {
    const { timesheetId } = req.params;
    const userId = (req as any).userId;

    const timesheet = await prisma.timesheet.updateMany({
      where: { id: timesheetId, userId },
      data: { status: 'approved', approvedAt: new Date() },
    });

    res.json({ success: timesheet.count > 0 });
  } catch (error) {
    res.status(400).json({ error: 'Failed to approve timesheet' });
  }
};

// Time Off Management
export const createTimeOff = async (req: Request, res: Response) => {
  try {
    const { type, startDate, endDate, reason, duration } = req.body;
    const userId = (req as any).userId;

    const timeOff = await prisma.timeOff.create({
      data: {
        userId,
        type: type || 'vacation', // vacation, sick_leave, personal, unpaid
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        duration: parseFloat(duration), // hours
        reason,
        status: 'pending',
        createdAt: new Date(),
      },
    });

    res.status(201).json(timeOff);
  } catch (error) {
    res.status(400).json({ error: 'Failed to create time off' });
  }
};

export const getTimeOff = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { type, status, limit = 50 } = req.query;

    const timeOff = await prisma.timeOff.findMany({
      where: {
        userId,
        ...(type && { type: type as string }),
        ...(status && { status: status as string }),
      },
      orderBy: { startDate: 'desc' },
      take: parseInt(limit as string),
    });

    res.json(timeOff);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch time off' });
  }
};

export const approveTimeOff = async (req: Request, res: Response) => {
  try {
    const { timeOffId } = req.params;
    const userId = (req as any).userId;

    const timeOff = await prisma.timeOff.updateMany({
      where: { id: timeOffId, userId },
      data: { status: 'approved', approvedAt: new Date() },
    });

    res.json({ success: timeOff.count > 0 });
  } catch (error) {
    res.status(400).json({ error: 'Failed to approve time off' });
  }
};

// Time Tracking Analytics
export const getTimeAnalytics = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { projectId, days = 30 } = req.query;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days as string));

    const entries = await prisma.timesheetEntry.findMany({
      where: {
        userId,
        ...(projectId && { projectId: projectId as string }),
        date: { gte: startDate },
      },
    });

    const totalHours = entries.reduce((sum, entry) => sum + entry.duration, 0);
    const billableHours = entries
      .filter((e) => e.billable)
      .reduce((sum, entry) => sum + entry.duration, 0);
    const nonBillableHours = totalHours - billableHours;

    const hoursByProject = {} as any;
    entries.forEach((entry) => {
      if (!hoursByProject[entry.projectId]) {
        hoursByProject[entry.projectId] = 0;
      }
      hoursByProject[entry.projectId] += entry.duration;
    });

    const analytics = {
      period: days,
      totalEntries: entries.length,
      totalHours,
      billableHours,
      nonBillableHours,
      billablePercentage: totalHours > 0 ? (billableHours / totalHours) * 100 : 0,
      avgHoursPerDay: entries.length > 0 ? totalHours / 7 : 0, // Average per week
      hoursByProject,
      timestamp: new Date(),
    };

    res.json(analytics);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
};

// Billable Hours
export const getBillableHours = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { projectId, dateFrom, dateTo } = req.query;

    const where: any = { userId, billable: true };
    if (projectId) where.projectId = projectId;
    if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) where.date.gte = new Date(dateFrom as string);
      if (dateTo) where.date.lte = new Date(dateTo as string);
    }

    const billableEntries = await prisma.timesheetEntry.findMany({
      where,
      orderBy: { date: 'desc' },
    });

    const totalBillable = billableEntries.reduce((sum, entry) => sum + entry.duration, 0);
    const entryCount = billableEntries.length;

    res.json({
      totalBillableHours: totalBillable,
      entryCount,
      entries: billableEntries,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch billable hours' });
  }
};

// Timesheet Reports
export const generateTimesheetReport = async (req: Request, res: Response) => {
  try {
    const { projectId, startDate, endDate } = req.body;
    const userId = (req as any).userId;

    const entries = await prisma.timesheetEntry.findMany({
      where: {
        userId,
        ...(projectId && { projectId }),
        date: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      },
      orderBy: { date: 'asc' },
    });

    const report = {
      period: { start: startDate, end: endDate },
      summary: {
        totalEntries: entries.length,
        totalHours: entries.reduce((sum, e) => sum + e.duration, 0),
        billableHours: entries
          .filter((e) => e.billable)
          .reduce((sum, e) => sum + e.duration, 0),
        nonBillableHours: entries
          .filter((e) => !e.billable)
          .reduce((sum, e) => sum + e.duration, 0),
      },
      entries,
      generatedAt: new Date(),
    };

    res.json(report);
  } catch (error) {
    res.status(400).json({ error: 'Failed to generate report' });
  }
};

// Timesheet Statistics
export const getTimesheetStatistics = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { days = 90 } = req.query;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days as string));

    const entries = await prisma.timesheetEntry.findMany({
      where: {
        userId,
        date: { gte: startDate },
      },
    });

    const totalHours = entries.reduce((sum, e) => sum + e.duration, 0);
    const billableHours = entries
      .filter((e) => e.billable)
      .reduce((sum, e) => sum + e.duration, 0);

    const stats = {
      period: days,
      totalEntries: entries.length,
      totalHours,
      billableHours,
      nonBillableHours: totalHours - billableHours,
      avgHoursPerEntry: entries.length > 0 ? totalHours / entries.length : 0,
      workDays: Math.ceil(totalHours / 8),
      billablePercentage: totalHours > 0 ? (billableHours / totalHours) * 100 : 0,
      timestamp: new Date(),
    };

    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
};

// Weekly Summary
export const getWeeklySummary = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { weekStartDate } = req.query;

    const startDate = new Date(weekStartDate as string);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 6);

    const entries = await prisma.timesheetEntry.findMany({
      where: {
        userId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { date: 'asc' },
    });

    const dailyTotals = {} as any;
    entries.forEach((entry) => {
      const dateKey = entry.date.toISOString().split('T')[0];
      if (!dailyTotals[dateKey]) {
        dailyTotals[dateKey] = {
          date: dateKey,
          hours: 0,
          billable: 0,
          nonBillable: 0,
          taskCount: 0,
        };
      }
      dailyTotals[dateKey].hours += entry.duration;
      if (entry.billable) {
        dailyTotals[dateKey].billable += entry.duration;
      } else {
        dailyTotals[dateKey].nonBillable += entry.duration;
      }
      dailyTotals[dateKey].taskCount++;
    });

    const summary = {
      weekStart: startDate,
      weekEnd: endDate,
      totalHours: entries.reduce((sum, e) => sum + e.duration, 0),
      totalBillable: entries
        .filter((e) => e.billable)
        .reduce((sum, e) => sum + e.duration, 0),
      dailyTotals: Object.values(dailyTotals),
      entryCount: entries.length,
    };

    res.json(summary);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch weekly summary' });
  }
};

// Timesheet Approval Workflow
export const rejectTimesheet = async (req: Request, res: Response) => {
  try {
    const { timesheetId } = req.params;
    const { reason } = req.body;
    const userId = (req as any).userId;

    const timesheet = await prisma.timesheet.updateMany({
      where: { id: timesheetId, userId },
      data: { status: 'rejected', rejectionReason: reason || null },
    });

    res.json({ success: timesheet.count > 0 });
  } catch (error) {
    res.status(400).json({ error: 'Failed to reject timesheet' });
  }
};
