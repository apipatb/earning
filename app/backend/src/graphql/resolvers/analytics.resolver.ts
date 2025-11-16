import prisma from '../../lib/prisma';
import { GraphQLError } from 'graphql';

export const analyticsResolvers = {
  Query: {
    analyticsSummary: async (_: any, { filter }: any, context: any) => {
      if (!context.user) {
        throw new GraphQLError('Not authenticated', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      let startDate: Date;
      let endDate: Date = new Date();

      if (filter?.startDate && filter?.endDate) {
        startDate = new Date(filter.startDate);
        endDate = new Date(filter.endDate);
      } else {
        const now = new Date();
        const period = filter?.period || 'month';

        switch (period) {
          case 'today':
            startDate = new Date(now.setHours(0, 0, 0, 0));
            endDate = new Date(now.setHours(23, 59, 59, 999));
            break;
          case 'week':
            startDate = new Date(now.setDate(now.getDate() - 7));
            break;
          case 'month':
            startDate = new Date(now.setMonth(now.getMonth() - 1));
            break;
          case 'year':
            startDate = new Date(now.setFullYear(now.getFullYear() - 1));
            break;
          default:
            startDate = new Date(0);
        }
      }

      const earnings = await prisma.earning.findMany({
        where: {
          userId: context.user.id,
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
        include: {
          platform: {
            select: {
              id: true,
              name: true,
              color: true,
            },
          },
        },
      });

      const totalEarnings = earnings.reduce((sum, e) => sum + Number(e.amount), 0);
      const totalHours = earnings.reduce((sum, e) => sum + Number(e.hours || 0), 0);
      const avgHourlyRate = totalHours > 0 ? totalEarnings / totalHours : 0;

      // Group by platform
      const platformMap = new Map();
      earnings.forEach((e) => {
        const platformId = e.platform.id;
        if (!platformMap.has(platformId)) {
          platformMap.set(platformId, {
            platform: e.platform,
            earnings: 0,
            hours: 0,
            hourlyRate: 0,
            percentage: 0,
          });
        }
        const platform = platformMap.get(platformId);
        platform.earnings += Number(e.amount);
        platform.hours += Number(e.hours || 0);
      });

      const byPlatform = Array.from(platformMap.values()).map((p: any) => ({
        ...p,
        hourlyRate: p.hours > 0 ? p.earnings / p.hours : 0,
        percentage: totalEarnings > 0 ? (p.earnings / totalEarnings) * 100 : 0,
      }));

      // Group by date
      const dailyMap = new Map();
      earnings.forEach((e) => {
        const dateStr = e.date.toISOString().split('T')[0];
        if (!dailyMap.has(dateStr)) {
          dailyMap.set(dateStr, {
            date: new Date(dateStr),
            earnings: 0,
            hours: 0,
          });
        }
        const daily = dailyMap.get(dateStr);
        daily.earnings += Number(e.amount);
        daily.hours += Number(e.hours || 0);
      });

      const dailyBreakdown = Array.from(dailyMap.values()).sort((a: any, b: any) =>
        a.date.getTime() - b.date.getTime()
      );

      return {
        period: filter?.period || 'month',
        startDate,
        endDate,
        totalEarnings,
        totalHours,
        avgHourlyRate,
        byPlatform,
        dailyBreakdown,
      };
    },
  },
};
