import { PrismaClient, Customer } from '@prisma/client';
import kmeans from 'ml-kmeans';
import { euclidean } from 'ml-distance-euclidean';

const prisma = new PrismaClient();

// ============================================
// TYPES & INTERFACES
// ============================================

export interface SegmentCriteria {
  rules?: SegmentRule[];
  conditions?: 'AND' | 'OR';
  mlConfig?: MLConfig;
}

export interface SegmentRule {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'in' | 'between';
  value: any;
}

export interface MLConfig {
  type: 'rfm' | 'behavioral' | 'engagement';
  clusters: number;
  features: string[];
}

export interface RFMScore {
  recency: number;
  frequency: number;
  monetary: number;
  rfmScore: number;
  segment: string;
}

export interface CustomerData {
  customerId: string;
  totalPurchases: number;
  purchaseCount: number;
  lastPurchase: Date | null;
  ticketCount: number;
  avgTicketResolutionTime: number;
  createdAt: Date;
}

// ============================================
// SEGMENTATION SERVICE
// ============================================

export class SegmentationService {
  /**
   * Create a new segment
   */
  async createSegment(
    userId: string,
    name: string,
    criteria: SegmentCriteria,
    segmentType: 'manual' | 'rule-based' | 'ml-clustering',
    description?: string
  ) {
    const segment = await prisma.customerSegment.create({
      data: {
        userId,
        name,
        description,
        criteria: JSON.stringify(criteria),
        segmentType,
        isAuto: segmentType !== 'manual',
      },
    });

    // If not manual, auto-populate members
    if (segmentType !== 'manual') {
      await this.updateSegmentMembership(segment.id, userId, criteria, segmentType);
    }

    return segment;
  }

  /**
   * Get all segments for a user
   */
  async getSegments(userId: string, includeAnalysis = false) {
    return prisma.customerSegment.findMany({
      where: { userId, isActive: true },
      include: {
        analysis: includeAnalysis,
        _count: {
          select: { members: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get segment by ID
   */
  async getSegmentById(segmentId: string, userId: string) {
    return prisma.customerSegment.findFirst({
      where: { id: segmentId, userId },
      include: {
        members: {
          include: {
            customer: true,
          },
          orderBy: { addedAt: 'desc' },
        },
        analysis: true,
      },
    });
  }

  /**
   * Update segment criteria and refresh membership
   */
  async updateSegment(
    segmentId: string,
    userId: string,
    name?: string,
    criteria?: SegmentCriteria,
    description?: string
  ) {
    const segment = await prisma.customerSegment.findFirst({
      where: { id: segmentId, userId },
    });

    if (!segment) {
      throw new Error('Segment not found');
    }

    const updatedSegment = await prisma.customerSegment.update({
      where: { id: segmentId },
      data: {
        name: name ?? segment.name,
        description: description ?? segment.description,
        criteria: criteria ? JSON.stringify(criteria) : segment.criteria,
      },
    });

    // Refresh membership if criteria changed
    if (criteria && segment.segmentType !== 'manual') {
      await this.updateSegmentMembership(segmentId, userId, criteria, segment.segmentType);
    }

    return updatedSegment;
  }

  /**
   * Update segment membership based on criteria
   */
  async updateSegmentMembership(
    segmentId: string,
    userId: string,
    criteria: SegmentCriteria,
    segmentType: 'rule-based' | 'ml-clustering'
  ) {
    let customerIds: string[] = [];

    if (segmentType === 'rule-based') {
      customerIds = await this.applyRuleBasedSegmentation(userId, criteria);
    } else if (segmentType === 'ml-clustering' && criteria.mlConfig) {
      const clusterResults = await this.applyMLClustering(userId, criteria.mlConfig);
      customerIds = clusterResults.members;
    }

    // Clear existing members
    await prisma.segmentMember.deleteMany({
      where: { segmentId },
    });

    // Add new members
    if (customerIds.length > 0) {
      await prisma.segmentMember.createMany({
        data: customerIds.map((customerId) => ({
          segmentId,
          customerId,
        })),
      });
    }

    // Update member count and last updated
    await prisma.customerSegment.update({
      where: { id: segmentId },
      data: {
        memberCount: customerIds.length,
        lastUpdated: new Date(),
      },
    });

    // Calculate analytics
    await this.calculateSegmentAnalytics(segmentId, userId);

    return customerIds.length;
  }

  /**
   * Apply rule-based segmentation
   */
  private async applyRuleBasedSegmentation(
    userId: string,
    criteria: SegmentCriteria
  ): Promise<string[]> {
    const { rules = [], conditions = 'AND' } = criteria;

    // Build dynamic where clause
    const whereConditions = rules.map((rule) => this.buildWhereCondition(rule));

    const customers = await prisma.customer.findMany({
      where: {
        userId,
        isActive: true,
        ...(conditions === 'AND'
          ? { AND: whereConditions }
          : { OR: whereConditions }),
      },
      select: { id: true },
    });

    return customers.map((c) => c.id);
  }

  /**
   * Build Prisma where condition from rule
   */
  private buildWhereCondition(rule: SegmentRule): any {
    const { field, operator, value } = rule;

    switch (operator) {
      case 'eq':
        return { [field]: value };
      case 'neq':
        return { [field]: { not: value } };
      case 'gt':
        return { [field]: { gt: value } };
      case 'gte':
        return { [field]: { gte: value } };
      case 'lt':
        return { [field]: { lt: value } };
      case 'lte':
        return { [field]: { lte: value } };
      case 'contains':
        return { [field]: { contains: value, mode: 'insensitive' } };
      case 'in':
        return { [field]: { in: value } };
      case 'between':
        return { [field]: { gte: value[0], lte: value[1] } };
      default:
        return {};
    }
  }

  /**
   * Apply ML-based clustering (K-means)
   */
  private async applyMLClustering(
    userId: string,
    config: MLConfig
  ): Promise<{ members: string[]; clusters: any[] }> {
    const { type, clusters: k } = config;

    if (type === 'rfm') {
      return this.rfmClustering(userId, k);
    } else if (type === 'behavioral') {
      return this.behavioralClustering(userId, k);
    } else if (type === 'engagement') {
      return this.engagementClustering(userId, k);
    }

    return { members: [], clusters: [] };
  }

  /**
   * RFM (Recency, Frequency, Monetary) Clustering
   */
  private async rfmClustering(
    userId: string,
    k: number
  ): Promise<{ members: string[]; clusters: any[] }> {
    // Get customer data with RFM metrics
    const customers = await prisma.customer.findMany({
      where: { userId, isActive: true },
      include: {
        tickets: {
          select: { id: true },
        },
      },
    });

    if (customers.length === 0) {
      return { members: [], clusters: [] };
    }

    const now = new Date();
    const customerData: Array<{ id: string; features: number[] }> = [];

    for (const customer of customers) {
      // Calculate Recency (days since last purchase)
      const recency = customer.lastPurchase
        ? Math.floor((now.getTime() - customer.lastPurchase.getTime()) / (1000 * 60 * 60 * 24))
        : 999;

      // Frequency (purchase count)
      const frequency = customer.purchaseCount;

      // Monetary (total purchases)
      const monetary = Number(customer.totalPurchases);

      customerData.push({
        id: customer.id,
        features: [recency, frequency, monetary],
      });
    }

    // Normalize features
    const normalized = this.normalizeFeatures(customerData.map((c) => c.features));

    // Apply K-means clustering
    const result = kmeans(normalized, k, {
      distanceFunction: euclidean,
    });

    // Get members from the best cluster (highest average monetary value)
    const clusterAverages = result.clusters.map((clusterIdx) => {
      const clusterMembers = customerData.filter((_, i) => result.clusters[i] === clusterIdx);
      const avgMonetary =
        clusterMembers.reduce((sum, c) => sum + c.features[2], 0) / clusterMembers.length;
      return { clusterIdx, avgMonetary, members: clusterMembers };
    });

    // Sort by average monetary value and get top cluster
    clusterAverages.sort((a, b) => b.avgMonetary - a.avgMonetary);
    const topCluster = clusterAverages[0];

    return {
      members: topCluster?.members.map((m) => m.id) || [],
      clusters: result.centroids,
    };
  }

  /**
   * Behavioral Clustering (based on purchase patterns and ticket activity)
   */
  private async behavioralClustering(
    userId: string,
    k: number
  ): Promise<{ members: string[]; clusters: any[] }> {
    const customers = await prisma.customer.findMany({
      where: { userId, isActive: true },
      include: {
        tickets: {
          select: { id: true, status: true },
        },
      },
    });

    if (customers.length === 0) {
      return { members: [], clusters: [] };
    }

    const customerData = customers.map((customer) => {
      const avgPurchaseValue = customer.purchaseCount > 0
        ? Number(customer.totalPurchases) / customer.purchaseCount
        : 0;

      return {
        id: customer.id,
        features: [
          customer.purchaseCount,
          avgPurchaseValue,
          customer.tickets.length,
          Number(customer.totalQuantity),
        ],
      };
    });

    const normalized = this.normalizeFeatures(customerData.map((c) => c.features));
    const result = kmeans(normalized, k, { distanceFunction: euclidean });

    // Get the most engaged cluster (highest purchase count)
    const clusterAverages = result.clusters.map((clusterIdx) => {
      const clusterMembers = customerData.filter((_, i) => result.clusters[i] === clusterIdx);
      const avgPurchaseCount =
        clusterMembers.reduce((sum, c) => sum + c.features[0], 0) / clusterMembers.length;
      return { clusterIdx, avgPurchaseCount, members: clusterMembers };
    });

    clusterAverages.sort((a, b) => b.avgPurchaseCount - a.avgPurchaseCount);
    const topCluster = clusterAverages[0];

    return {
      members: topCluster?.members.map((m) => m.id) || [],
      clusters: result.centroids,
    };
  }

  /**
   * Engagement Clustering
   */
  private async engagementClustering(
    userId: string,
    k: number
  ): Promise<{ members: string[]; clusters: any[] }> {
    const customers = await prisma.customer.findMany({
      where: { userId, isActive: true },
      include: {
        tickets: true,
        invoices: true,
      },
    });

    if (customers.length === 0) {
      return { members: [], clusters: [] };
    }

    const now = new Date();
    const customerData = customers.map((customer) => {
      const daysSinceCreation = Math.floor(
        (now.getTime() - customer.createdAt.getTime()) / (1000 * 60 * 60 * 24)
      );

      const recency = customer.lastPurchase
        ? Math.floor((now.getTime() - customer.lastPurchase.getTime()) / (1000 * 60 * 60 * 24))
        : 999;

      return {
        id: customer.id,
        features: [
          daysSinceCreation,
          customer.purchaseCount,
          customer.tickets.length,
          customer.invoices.length,
          recency,
        ],
      };
    });

    const normalized = this.normalizeFeatures(customerData.map((c) => c.features));
    const result = kmeans(normalized, k, { distanceFunction: euclidean });

    // Get highly engaged cluster
    const clusterAverages = result.clusters.map((clusterIdx) => {
      const clusterMembers = customerData.filter((_, i) => result.clusters[i] === clusterIdx);
      const avgEngagement =
        clusterMembers.reduce((sum, c) => sum + c.features[1] + c.features[2] + c.features[3], 0) /
        clusterMembers.length;
      return { clusterIdx, avgEngagement, members: clusterMembers };
    });

    clusterAverages.sort((a, b) => b.avgEngagement - a.avgEngagement);
    const topCluster = clusterAverages[0];

    return {
      members: topCluster?.members.map((m) => m.id) || [],
      clusters: result.centroids,
    };
  }

  /**
   * Normalize features using min-max normalization
   */
  private normalizeFeatures(features: number[][]): number[][] {
    if (features.length === 0) return [];

    const numFeatures = features[0].length;
    const mins = new Array(numFeatures).fill(Infinity);
    const maxs = new Array(numFeatures).fill(-Infinity);

    // Find min and max for each feature
    features.forEach((row) => {
      row.forEach((val, idx) => {
        mins[idx] = Math.min(mins[idx], val);
        maxs[idx] = Math.max(maxs[idx], val);
      });
    });

    // Normalize
    return features.map((row) =>
      row.map((val, idx) => {
        const range = maxs[idx] - mins[idx];
        return range === 0 ? 0 : (val - mins[idx]) / range;
      })
    );
  }

  /**
   * Calculate segment analytics
   */
  async calculateSegmentAnalytics(segmentId: string, userId: string) {
    const segment = await prisma.customerSegment.findFirst({
      where: { id: segmentId, userId },
      include: {
        members: {
          include: {
            customer: {
              include: {
                tickets: true,
              },
            },
          },
        },
      },
    });

    if (!segment || segment.members.length === 0) {
      return null;
    }

    const customers = segment.members.map((m) => m.customer);
    const totalMembers = customers.length;

    // Calculate metrics
    const totalLifetimeValue = customers.reduce(
      (sum, c) => sum + Number(c.totalPurchases),
      0
    );
    const avgLifetimeValue = totalLifetimeValue / totalMembers;

    const avgPurchaseFrequency =
      customers.reduce((sum, c) => sum + c.purchaseCount, 0) / totalMembers;

    const now = new Date();
    const recencies = customers.map((c) =>
      c.lastPurchase
        ? Math.floor((now.getTime() - c.lastPurchase.getTime()) / (1000 * 60 * 60 * 24))
        : 999
    );
    const avgRecency = Math.floor(
      recencies.reduce((sum, r) => sum + r, 0) / totalMembers
    );

    // Churn risk: higher recency = higher churn risk
    const avgChurnRisk = Math.min(100, (avgRecency / 90) * 100);

    // Engagement score: based on purchase frequency and recency
    const avgEngagementScore = Math.max(
      0,
      Math.min(100, (avgPurchaseFrequency * 10) - (avgRecency / 3))
    );

    const avgTicketCount =
      customers.reduce((sum, c) => sum + c.tickets.length, 0) / totalMembers;

    // Calculate retention rate (customers with purchases in last 90 days)
    const activeCustomers = customers.filter((c) =>
      c.lastPurchase
        ? (now.getTime() - c.lastPurchase.getTime()) / (1000 * 60 * 60 * 24) <= 90
        : false
    ).length;
    const retentionRate = (activeCustomers / totalMembers) * 100;

    // Conversion rate (customers with at least one purchase)
    const convertedCustomers = customers.filter((c) => c.purchaseCount > 0).length;
    const conversionRate = (convertedCustomers / totalMembers) * 100;

    // Upsert analytics
    const analytics = await prisma.segmentAnalysis.upsert({
      where: { segmentId },
      create: {
        segmentId,
        totalMembers,
        avgLifetimeValue,
        totalLifetimeValue,
        avgChurnRisk,
        avgEngagementScore,
        avgPurchaseFrequency,
        avgRecency,
        avgTicketCount,
        conversionRate,
        retentionRate,
        lastCalculated: new Date(),
      },
      update: {
        totalMembers,
        avgLifetimeValue,
        totalLifetimeValue,
        avgChurnRisk,
        avgEngagementScore,
        avgPurchaseFrequency,
        avgRecency,
        avgTicketCount,
        conversionRate,
        retentionRate,
        lastCalculated: new Date(),
      },
    });

    return analytics;
  }

  /**
   * Add customers to a manual segment
   */
  async addCustomersToSegment(segmentId: string, customerIds: string[], userId: string) {
    const segment = await prisma.customerSegment.findFirst({
      where: { id: segmentId, userId },
    });

    if (!segment) {
      throw new Error('Segment not found');
    }

    if (segment.segmentType !== 'manual') {
      throw new Error('Can only manually add customers to manual segments');
    }

    // Add members (ignore duplicates)
    for (const customerId of customerIds) {
      await prisma.segmentMember.upsert({
        where: {
          segmentId_customerId: {
            segmentId,
            customerId,
          },
        },
        create: {
          segmentId,
          customerId,
        },
        update: {},
      });
    }

    // Update member count
    const count = await prisma.segmentMember.count({
      where: { segmentId },
    });

    await prisma.customerSegment.update({
      where: { id: segmentId },
      data: {
        memberCount: count,
        lastUpdated: new Date(),
      },
    });

    // Recalculate analytics
    await this.calculateSegmentAnalytics(segmentId, userId);

    return count;
  }

  /**
   * Remove customers from a segment
   */
  async removeCustomersFromSegment(segmentId: string, customerIds: string[], userId: string) {
    const segment = await prisma.customerSegment.findFirst({
      where: { id: segmentId, userId },
    });

    if (!segment) {
      throw new Error('Segment not found');
    }

    if (segment.segmentType !== 'manual') {
      throw new Error('Can only manually remove customers from manual segments');
    }

    await prisma.segmentMember.deleteMany({
      where: {
        segmentId,
        customerId: { in: customerIds },
      },
    });

    // Update member count
    const count = await prisma.segmentMember.count({
      where: { segmentId },
    });

    await prisma.customerSegment.update({
      where: { id: segmentId },
      data: {
        memberCount: count,
        lastUpdated: new Date(),
      },
    });

    // Recalculate analytics
    await this.calculateSegmentAnalytics(segmentId, userId);

    return count;
  }

  /**
   * Delete a segment
   */
  async deleteSegment(segmentId: string, userId: string) {
    const segment = await prisma.customerSegment.findFirst({
      where: { id: segmentId, userId },
    });

    if (!segment) {
      throw new Error('Segment not found');
    }

    await prisma.customerSegment.delete({
      where: { id: segmentId },
    });

    return true;
  }

  /**
   * Create predefined segments
   */
  async createPredefinedSegments(userId: string) {
    const segments = [
      {
        name: 'High-Value Customers',
        description: 'Customers with high lifetime value',
        criteria: {
          rules: [{ field: 'totalPurchases', operator: 'gte' as const, value: 1000 }],
          conditions: 'AND' as const,
        },
        segmentType: 'rule-based' as const,
      },
      {
        name: 'At-Risk Customers',
        description: 'Customers who haven\'t purchased in 90+ days',
        criteria: {
          rules: [
            { field: 'lastPurchase', operator: 'lte' as const, value: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
            { field: 'purchaseCount', operator: 'gt' as const, value: 0 },
          ],
          conditions: 'AND' as const,
        },
        segmentType: 'rule-based' as const,
      },
      {
        name: 'New Customers',
        description: 'Customers created in the last 30 days',
        criteria: {
          rules: [
            { field: 'createdAt', operator: 'gte' as const, value: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
          ],
          conditions: 'AND' as const,
        },
        segmentType: 'rule-based' as const,
      },
      {
        name: 'Active Customers',
        description: 'Customers with recent purchases',
        criteria: {
          rules: [
            { field: 'lastPurchase', operator: 'gte' as const, value: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
          ],
          conditions: 'AND' as const,
        },
        segmentType: 'rule-based' as const,
      },
      {
        name: 'Inactive Customers',
        description: 'Customers with no purchases in 180+ days',
        criteria: {
          rules: [
            { field: 'lastPurchase', operator: 'lte' as const, value: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000) },
          ],
          conditions: 'AND' as const,
        },
        segmentType: 'rule-based' as const,
      },
    ];

    const created = [];
    for (const seg of segments) {
      const segment = await this.createSegment(
        userId,
        seg.name,
        seg.criteria,
        seg.segmentType,
        seg.description
      );
      created.push(segment);
    }

    return created;
  }

  /**
   * Refresh all auto segments for a user
   */
  async refreshAutoSegments(userId: string) {
    const autoSegments = await prisma.customerSegment.findMany({
      where: { userId, isAuto: true, isActive: true },
    });

    for (const segment of autoSegments) {
      const criteria: SegmentCriteria = JSON.parse(segment.criteria);
      await this.updateSegmentMembership(
        segment.id,
        userId,
        criteria,
        segment.segmentType as 'rule-based' | 'ml-clustering'
      );
    }

    return autoSegments.length;
  }
}

export const segmentationService = new SegmentationService();
