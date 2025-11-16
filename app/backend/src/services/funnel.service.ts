import prisma from '../lib/prisma';
import { logger } from '../utils/logger';

export interface FunnelStep {
  name: string;
  order: number;
  conditions?: Record<string, any>;
}

export interface CreateFunnelInput {
  name: string;
  description?: string;
  steps: FunnelStep[];
  trackingEnabled?: boolean;
  metadata?: Record<string, any>;
}

export interface FunnelEventInput {
  funnelId: string;
  sessionId: string;
  step: string;
  stepNumber: number;
  metadata?: Record<string, any>;
}

export interface FunnelAnalysis {
  funnelId: string;
  funnelName: string;
  totalSessions: number;
  completionRate: number;
  averageTimeToComplete: number;
  steps: StepAnalysis[];
  dropOffPoints: DropOffPoint[];
  cohortAnalysis?: CohortData[];
  segmentAnalysis?: SegmentData[];
}

export interface StepAnalysis {
  step: string;
  stepNumber: number;
  totalUsers: number;
  conversionRate: number;
  dropOffRate: number;
  avgTimeToNext: number;
  avgTimeFromStart: number;
}

export interface DropOffPoint {
  step: string;
  stepNumber: number;
  dropOffCount: number;
  dropOffRate: number;
}

export interface CohortData {
  cohortDate: string;
  totalUsers: number;
  completedUsers: number;
  completionRate: number;
  avgCompletionTime: number;
}

export interface SegmentData {
  segment: string;
  totalUsers: number;
  completionRate: number;
  avgCompletionTime: number;
  topDropOffStep: string;
}

class FunnelService {
  /**
   * Create a new funnel definition
   */
  async createFunnel(userId: string, input: CreateFunnelInput) {
    try {
      const funnel = await prisma.funnelDefinition.create({
        data: {
          userId,
          name: input.name,
          description: input.description,
          steps: JSON.stringify(input.steps),
          trackingEnabled: input.trackingEnabled ?? true,
          metadata: input.metadata ? JSON.stringify(input.metadata) : null,
        },
      });

      return {
        ...funnel,
        steps: JSON.parse(funnel.steps),
        metadata: funnel.metadata ? JSON.parse(funnel.metadata) : null,
      };
    } catch (error) {
      logger.error('Create funnel error:', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Get all funnels for a user
   */
  async getFunnels(userId: string) {
    try {
      const funnels = await prisma.funnelDefinition.findMany({
        where: { userId },
        include: {
          _count: {
            select: {
              events: true,
              metrics: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return funnels.map(funnel => ({
        ...funnel,
        steps: JSON.parse(funnel.steps),
        metadata: funnel.metadata ? JSON.parse(funnel.metadata) : null,
      }));
    } catch (error) {
      logger.error('Get funnels error:', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Get a single funnel by ID
   */
  async getFunnel(userId: string, funnelId: string) {
    try {
      const funnel = await prisma.funnelDefinition.findFirst({
        where: {
          id: funnelId,
          userId,
        },
        include: {
          _count: {
            select: {
              events: true,
            },
          },
        },
      });

      if (!funnel) {
        throw new Error('Funnel not found');
      }

      return {
        ...funnel,
        steps: JSON.parse(funnel.steps),
        metadata: funnel.metadata ? JSON.parse(funnel.metadata) : null,
      };
    } catch (error) {
      logger.error('Get funnel error:', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Update funnel definition
   */
  async updateFunnel(
    userId: string,
    funnelId: string,
    updates: Partial<CreateFunnelInput>
  ) {
    try {
      const existing = await prisma.funnelDefinition.findFirst({
        where: { id: funnelId, userId },
      });

      if (!existing) {
        throw new Error('Funnel not found');
      }

      const updateData: any = {};
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.steps !== undefined) updateData.steps = JSON.stringify(updates.steps);
      if (updates.trackingEnabled !== undefined) updateData.trackingEnabled = updates.trackingEnabled;
      if (updates.metadata !== undefined) updateData.metadata = JSON.stringify(updates.metadata);

      const funnel = await prisma.funnelDefinition.update({
        where: { id: funnelId },
        data: updateData,
      });

      return {
        ...funnel,
        steps: JSON.parse(funnel.steps),
        metadata: funnel.metadata ? JSON.parse(funnel.metadata) : null,
      };
    } catch (error) {
      logger.error('Update funnel error:', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Delete funnel
   */
  async deleteFunnel(userId: string, funnelId: string) {
    try {
      const funnel = await prisma.funnelDefinition.findFirst({
        where: { id: funnelId, userId },
      });

      if (!funnel) {
        throw new Error('Funnel not found');
      }

      await prisma.funnelDefinition.delete({
        where: { id: funnelId },
      });

      logger.info(`Deleted funnel ${funnelId} for user ${userId}`);
    } catch (error) {
      logger.error('Delete funnel error:', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Track a funnel event
   */
  async trackEvent(userId: string, input: FunnelEventInput) {
    try {
      // Verify funnel exists and is enabled
      const funnel = await prisma.funnelDefinition.findFirst({
        where: {
          id: input.funnelId,
          userId,
          trackingEnabled: true,
        },
      });

      if (!funnel) {
        throw new Error('Funnel not found or tracking disabled');
      }

      const event = await prisma.funnelEvent.create({
        data: {
          userId,
          funnelId: input.funnelId,
          sessionId: input.sessionId,
          step: input.step,
          stepNumber: input.stepNumber,
          metadata: input.metadata ? JSON.stringify(input.metadata) : null,
        },
      });

      return {
        ...event,
        metadata: event.metadata ? JSON.parse(event.metadata) : null,
      };
    } catch (error) {
      logger.error('Track event error:', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Get funnel metrics for a specific period
   */
  async getFunnelMetrics(
    userId: string,
    funnelId: string,
    period?: string
  ) {
    try {
      const funnel = await prisma.funnelDefinition.findFirst({
        where: { id: funnelId, userId },
      });

      if (!funnel) {
        throw new Error('Funnel not found');
      }

      const where: any = { funnelId };
      if (period) {
        where.period = period;
      }

      const metrics = await prisma.funnelMetrics.findMany({
        where,
        orderBy: [
          { period: 'desc' },
          { stepNumber: 'asc' },
        ],
      });

      return metrics.map(metric => ({
        ...metric,
        conversionRate: Number(metric.conversionRate),
        dropOffRate: Number(metric.dropOffRate),
        segmentData: metric.segmentData ? JSON.parse(metric.segmentData) : null,
      }));
    } catch (error) {
      logger.error('Get funnel metrics error:', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Calculate and store funnel metrics for a period
   */
  async calculateMetrics(
    userId: string,
    funnelId: string,
    periodStart: Date,
    periodEnd: Date
  ) {
    try {
      const funnel = await prisma.funnelDefinition.findFirst({
        where: { id: funnelId, userId },
      });

      if (!funnel) {
        throw new Error('Funnel not found');
      }

      const steps: FunnelStep[] = JSON.parse(funnel.steps);
      const period = this.getPeriodString(periodStart);

      // Get all events in the period
      const events = await prisma.funnelEvent.findMany({
        where: {
          funnelId,
          timestamp: {
            gte: periodStart,
            lte: periodEnd,
          },
        },
        orderBy: [
          { sessionId: 'asc' },
          { stepNumber: 'asc' },
          { timestamp: 'asc' },
        ],
      });

      // Group events by session
      const sessionMap = new Map<string, typeof events>();
      events.forEach(event => {
        if (!sessionMap.has(event.sessionId)) {
          sessionMap.set(event.sessionId, []);
        }
        sessionMap.get(event.sessionId)!.push(event);
      });

      // Calculate metrics for each step
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        const stepEvents = events.filter(e => e.stepNumber === step.order);
        const totalCount = new Set(stepEvents.map(e => e.sessionId)).size;

        // Calculate conversion rate (users who progressed to next step)
        let conversionRate = 0;
        let dropOffRate = 0;
        let avgTimeToNext = null;

        if (i < steps.length - 1) {
          const nextStepEvents = events.filter(e => e.stepNumber === steps[i + 1].order);
          const nextStepSessions = new Set(nextStepEvents.map(e => e.sessionId));

          const converted = Array.from(new Set(stepEvents.map(e => e.sessionId)))
            .filter(sessionId => nextStepSessions.has(sessionId)).length;

          conversionRate = totalCount > 0 ? (converted / totalCount) * 100 : 0;
          dropOffRate = 100 - conversionRate;

          // Calculate average time to next step
          const timeDiffs: number[] = [];
          stepEvents.forEach(event => {
            const nextEvent = events.find(
              e => e.sessionId === event.sessionId && e.stepNumber === steps[i + 1].order
            );
            if (nextEvent) {
              const diff = nextEvent.timestamp.getTime() - event.timestamp.getTime();
              timeDiffs.push(Math.floor(diff / 1000)); // Convert to seconds
            }
          });

          if (timeDiffs.length > 0) {
            avgTimeToNext = Math.floor(
              timeDiffs.reduce((sum, t) => sum + t, 0) / timeDiffs.length
            );
          }
        } else {
          // Last step
          conversionRate = 100;
          dropOffRate = 0;
        }

        // Upsert metrics
        await prisma.funnelMetrics.upsert({
          where: {
            funnelId_step_period: {
              funnelId,
              step: step.name,
              period,
            },
          },
          create: {
            funnelId,
            step: step.name,
            stepNumber: step.order,
            totalCount,
            conversionRate,
            dropOffRate,
            avgTimeToNext,
            period,
            periodStart,
            periodEnd,
          },
          update: {
            totalCount,
            conversionRate,
            dropOffRate,
            avgTimeToNext,
            periodStart,
            periodEnd,
          },
        });
      }

      logger.info(`Calculated metrics for funnel ${funnelId} period ${period}`);
    } catch (error) {
      logger.error('Calculate metrics error:', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Get comprehensive funnel analysis
   */
  async getFunnelAnalysis(
    userId: string,
    funnelId: string,
    periodStart?: Date,
    periodEnd?: Date
  ): Promise<FunnelAnalysis> {
    try {
      const funnel = await prisma.funnelDefinition.findFirst({
        where: { id: funnelId, userId },
      });

      if (!funnel) {
        throw new Error('Funnel not found');
      }

      const steps: FunnelStep[] = JSON.parse(funnel.steps);

      // Default to last 30 days
      const end = periodEnd || new Date();
      const start = periodStart || new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Get all events in the period
      const events = await prisma.funnelEvent.findMany({
        where: {
          funnelId,
          timestamp: {
            gte: start,
            lte: end,
          },
        },
        orderBy: [
          { sessionId: 'asc' },
          { stepNumber: 'asc' },
          { timestamp: 'asc' },
        ],
      });

      // Group by session
      const sessionMap = new Map<string, typeof events>();
      events.forEach(event => {
        if (!sessionMap.has(event.sessionId)) {
          sessionMap.set(event.sessionId, []);
        }
        sessionMap.get(event.sessionId)!.push(event);
      });

      const totalSessions = sessionMap.size;

      // Calculate completion rate
      const completedSessions = Array.from(sessionMap.values()).filter(
        sessionEvents => {
          const maxStep = Math.max(...sessionEvents.map(e => e.stepNumber));
          return maxStep === steps.length - 1;
        }
      ).length;

      const completionRate = totalSessions > 0 ? (completedSessions / totalSessions) * 100 : 0;

      // Calculate average completion time
      const completionTimes: number[] = [];
      sessionMap.forEach(sessionEvents => {
        const maxStep = Math.max(...sessionEvents.map(e => e.stepNumber));
        if (maxStep === steps.length - 1) {
          const firstEvent = sessionEvents[0];
          const lastEvent = sessionEvents[sessionEvents.length - 1];
          const timeDiff = lastEvent.timestamp.getTime() - firstEvent.timestamp.getTime();
          completionTimes.push(timeDiff / 1000); // Convert to seconds
        }
      });

      const averageTimeToComplete = completionTimes.length > 0
        ? completionTimes.reduce((sum, t) => sum + t, 0) / completionTimes.length
        : 0;

      // Step analysis
      const stepAnalysis: StepAnalysis[] = [];
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        const stepEvents = events.filter(e => e.stepNumber === step.order);
        const totalUsers = new Set(stepEvents.map(e => e.sessionId)).size;

        let conversionRate = 0;
        let dropOffRate = 0;
        let avgTimeToNext = 0;
        let avgTimeFromStart = 0;

        if (i < steps.length - 1) {
          const nextStepEvents = events.filter(e => e.stepNumber === steps[i + 1].order);
          const nextStepSessions = new Set(nextStepEvents.map(e => e.sessionId));

          const converted = Array.from(new Set(stepEvents.map(e => e.sessionId)))
            .filter(sessionId => nextStepSessions.has(sessionId)).length;

          conversionRate = totalUsers > 0 ? (converted / totalUsers) * 100 : 0;
          dropOffRate = 100 - conversionRate;

          // Time to next step
          const timeDiffs: number[] = [];
          stepEvents.forEach(event => {
            const nextEvent = events.find(
              e => e.sessionId === event.sessionId && e.stepNumber === steps[i + 1].order
            );
            if (nextEvent) {
              timeDiffs.push((nextEvent.timestamp.getTime() - event.timestamp.getTime()) / 1000);
            }
          });

          avgTimeToNext = timeDiffs.length > 0
            ? timeDiffs.reduce((sum, t) => sum + t, 0) / timeDiffs.length
            : 0;
        } else {
          conversionRate = 100;
        }

        // Time from start
        const timeFromStartDiffs: number[] = [];
        stepEvents.forEach(event => {
          const sessionEvents = sessionMap.get(event.sessionId);
          if (sessionEvents && sessionEvents.length > 0) {
            const firstEvent = sessionEvents[0];
            timeFromStartDiffs.push((event.timestamp.getTime() - firstEvent.timestamp.getTime()) / 1000);
          }
        });

        avgTimeFromStart = timeFromStartDiffs.length > 0
          ? timeFromStartDiffs.reduce((sum, t) => sum + t, 0) / timeFromStartDiffs.length
          : 0;

        stepAnalysis.push({
          step: step.name,
          stepNumber: step.order,
          totalUsers,
          conversionRate,
          dropOffRate,
          avgTimeToNext,
          avgTimeFromStart,
        });
      }

      // Identify drop-off points
      const dropOffPoints: DropOffPoint[] = stepAnalysis
        .filter(s => s.dropOffRate > 0)
        .map(s => ({
          step: s.step,
          stepNumber: s.stepNumber,
          dropOffCount: Math.floor((s.totalUsers * s.dropOffRate) / 100),
          dropOffRate: s.dropOffRate,
        }))
        .sort((a, b) => b.dropOffRate - a.dropOffRate);

      return {
        funnelId,
        funnelName: funnel.name,
        totalSessions,
        completionRate,
        averageTimeToComplete,
        steps: stepAnalysis,
        dropOffPoints,
      };
    } catch (error) {
      logger.error('Get funnel analysis error:', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Get cohort analysis for a funnel
   */
  async getCohortAnalysis(
    userId: string,
    funnelId: string,
    periodStart: Date,
    periodEnd: Date,
    cohortBy: 'day' | 'week' | 'month' = 'day'
  ): Promise<CohortData[]> {
    try {
      const funnel = await prisma.funnelDefinition.findFirst({
        where: { id: funnelId, userId },
      });

      if (!funnel) {
        throw new Error('Funnel not found');
      }

      const steps: FunnelStep[] = JSON.parse(funnel.steps);
      const maxStepNumber = steps.length - 1;

      const events = await prisma.funnelEvent.findMany({
        where: {
          funnelId,
          timestamp: {
            gte: periodStart,
            lte: periodEnd,
          },
        },
        orderBy: [
          { sessionId: 'asc' },
          { timestamp: 'asc' },
        ],
      });

      // Group by session
      const sessionMap = new Map<string, typeof events>();
      events.forEach(event => {
        if (!sessionMap.has(event.sessionId)) {
          sessionMap.set(event.sessionId, []);
        }
        sessionMap.get(event.sessionId)!.push(event);
      });

      // Group sessions by cohort date
      const cohortMap = new Map<string, Array<typeof events[0][]>>();
      sessionMap.forEach((sessionEvents, sessionId) => {
        const firstEvent = sessionEvents[0];
        const cohortDate = this.getCohortDate(firstEvent.timestamp, cohortBy);

        if (!cohortMap.has(cohortDate)) {
          cohortMap.set(cohortDate, []);
        }
        cohortMap.get(cohortDate)!.push(sessionEvents);
      });

      // Calculate cohort metrics
      const cohortData: CohortData[] = [];
      cohortMap.forEach((sessions, cohortDate) => {
        const totalUsers = sessions.length;
        const completedUsers = sessions.filter(sessionEvents => {
          const maxStep = Math.max(...sessionEvents.map(e => e.stepNumber));
          return maxStep === maxStepNumber;
        }).length;

        const completionRate = totalUsers > 0 ? (completedUsers / totalUsers) * 100 : 0;

        // Calculate average completion time for completed users
        const completionTimes: number[] = [];
        sessions.forEach(sessionEvents => {
          const maxStep = Math.max(...sessionEvents.map(e => e.stepNumber));
          if (maxStep === maxStepNumber) {
            const firstEvent = sessionEvents[0];
            const lastEvent = sessionEvents[sessionEvents.length - 1];
            completionTimes.push((lastEvent.timestamp.getTime() - firstEvent.timestamp.getTime()) / 1000);
          }
        });

        const avgCompletionTime = completionTimes.length > 0
          ? completionTimes.reduce((sum, t) => sum + t, 0) / completionTimes.length
          : 0;

        cohortData.push({
          cohortDate,
          totalUsers,
          completedUsers,
          completionRate,
          avgCompletionTime,
        });
      });

      return cohortData.sort((a, b) => a.cohortDate.localeCompare(b.cohortDate));
    } catch (error) {
      logger.error('Get cohort analysis error:', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Get segment analysis for a funnel
   */
  async getSegmentAnalysis(
    userId: string,
    funnelId: string,
    segmentBy: string, // e.g., 'browser', 'device', 'source'
    periodStart?: Date,
    periodEnd?: Date
  ): Promise<SegmentData[]> {
    try {
      const funnel = await prisma.funnelDefinition.findFirst({
        where: { id: funnelId, userId },
      });

      if (!funnel) {
        throw new Error('Funnel not found');
      }

      const steps: FunnelStep[] = JSON.parse(funnel.steps);
      const maxStepNumber = steps.length - 1;

      const end = periodEnd || new Date();
      const start = periodStart || new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

      const events = await prisma.funnelEvent.findMany({
        where: {
          funnelId,
          timestamp: {
            gte: start,
            lte: end,
          },
        },
        orderBy: [
          { sessionId: 'asc' },
          { timestamp: 'asc' },
        ],
      });

      // Group by session
      const sessionMap = new Map<string, typeof events>();
      events.forEach(event => {
        if (!sessionMap.has(event.sessionId)) {
          sessionMap.set(event.sessionId, []);
        }
        sessionMap.get(event.sessionId)!.push(event);
      });

      // Group sessions by segment
      const segmentMap = new Map<string, Array<typeof events[0][]>>();
      sessionMap.forEach((sessionEvents, sessionId) => {
        const firstEvent = sessionEvents[0];
        const metadata = firstEvent.metadata ? JSON.parse(firstEvent.metadata as any) : {};
        const segment = metadata[segmentBy] || 'Unknown';

        if (!segmentMap.has(segment)) {
          segmentMap.set(segment, []);
        }
        segmentMap.get(segment)!.push(sessionEvents);
      });

      // Calculate segment metrics
      const segmentData: SegmentData[] = [];
      segmentMap.forEach((sessions, segment) => {
        const totalUsers = sessions.length;
        const completedUsers = sessions.filter(sessionEvents => {
          const maxStep = Math.max(...sessionEvents.map(e => e.stepNumber));
          return maxStep === maxStepNumber;
        }).length;

        const completionRate = totalUsers > 0 ? (completedUsers / totalUsers) * 100 : 0;

        // Calculate average completion time
        const completionTimes: number[] = [];
        sessions.forEach(sessionEvents => {
          const maxStep = Math.max(...sessionEvents.map(e => e.stepNumber));
          if (maxStep === maxStepNumber) {
            const firstEvent = sessionEvents[0];
            const lastEvent = sessionEvents[sessionEvents.length - 1];
            completionTimes.push((lastEvent.timestamp.getTime() - firstEvent.timestamp.getTime()) / 1000);
          }
        });

        const avgCompletionTime = completionTimes.length > 0
          ? completionTimes.reduce((sum, t) => sum + t, 0) / completionTimes.length
          : 0;

        // Find top drop-off step
        const dropOffCounts = new Map<string, number>();
        sessions.forEach(sessionEvents => {
          const maxStep = Math.max(...sessionEvents.map(e => e.stepNumber));
          if (maxStep < maxStepNumber) {
            const dropOffStep = steps.find(s => s.order === maxStep + 1)?.name || 'Unknown';
            dropOffCounts.set(dropOffStep, (dropOffCounts.get(dropOffStep) || 0) + 1);
          }
        });

        let topDropOffStep = 'None';
        let maxDropOffs = 0;
        dropOffCounts.forEach((count, step) => {
          if (count > maxDropOffs) {
            maxDropOffs = count;
            topDropOffStep = step;
          }
        });

        segmentData.push({
          segment,
          totalUsers,
          completionRate,
          avgCompletionTime,
          topDropOffStep,
        });
      });

      return segmentData.sort((a, b) => b.totalUsers - a.totalUsers);
    } catch (error) {
      logger.error('Get segment analysis error:', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Create preset funnels for customer service platform
   */
  async createPresetFunnels(userId: string) {
    try {
      // Support Ticket Creation Funnel
      await this.createFunnel(userId, {
        name: 'Support Ticket Creation',
        description: 'Track customer journey from issue discovery to ticket submission',
        steps: [
          { name: 'Help Center Visit', order: 0 },
          { name: 'Search Articles', order: 1 },
          { name: 'Click Contact Support', order: 2 },
          { name: 'Fill Ticket Form', order: 3 },
          { name: 'Submit Ticket', order: 4 },
        ],
      });

      // Customer Subscription Funnel
      await this.createFunnel(userId, {
        name: 'Customer Subscription',
        description: 'Track subscription signup flow',
        steps: [
          { name: 'View Pricing Page', order: 0 },
          { name: 'Select Plan', order: 1 },
          { name: 'Enter Account Details', order: 2 },
          { name: 'Add Payment Method', order: 3 },
          { name: 'Complete Subscription', order: 4 },
        ],
      });

      // Feature Adoption Funnel
      await this.createFunnel(userId, {
        name: 'Feature Adoption',
        description: 'Track new feature discovery and adoption',
        steps: [
          { name: 'Feature Announcement', order: 0 },
          { name: 'View Feature Page', order: 1 },
          { name: 'Start Feature Setup', order: 2 },
          { name: 'Configure Feature', order: 3 },
          { name: 'First Feature Use', order: 4 },
        ],
      });

      logger.info(`Created preset funnels for user ${userId}`);
    } catch (error) {
      logger.error('Create preset funnels error:', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Helper: Get period string from date
   */
  private getPeriodString(date: Date): string {
    return date.toISOString().split('T')[0]; // YYYY-MM-DD
  }

  /**
   * Helper: Get cohort date string based on cohort type
   */
  private getCohortDate(date: Date, cohortBy: 'day' | 'week' | 'month'): string {
    switch (cohortBy) {
      case 'day':
        return date.toISOString().split('T')[0]; // YYYY-MM-DD
      case 'week':
        const week = this.getWeekNumber(date);
        return `${date.getFullYear()}-W${week.toString().padStart(2, '0')}`;
      case 'month':
        return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      default:
        return date.toISOString().split('T')[0];
    }
  }

  /**
   * Helper: Get ISO week number
   */
  private getWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  }
}

export const funnelService = new FunnelService();
