import prisma from '../../lib/prisma';
import { GraphQLError } from 'graphql';

interface GenerateReportInput {
  name: string;
  type: string;
  format: string;
  startDate?: string;
  endDate?: string;
  filters?: string;
}

export const reportResolvers = {
  Query: {
    reports: async (_: any, __: any, context: any) => {
      if (!context.user) {
        throw new GraphQLError('Not authenticated', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      try {
        // Fetch reports for the authenticated user
        const reports = await prisma.report.findMany({
          where: { userId: context.user.id },
          orderBy: { createdAt: 'desc' },
        });

        // Map Prisma Report model to GraphQL Report type
        return reports.map((report) => {
          // Parse filters to extract format if stored there
          let format = 'PDF'; // default
          try {
            const parsedFilters = JSON.parse(report.filters);
            format = parsedFilters.format || 'PDF';
          } catch (e) {
            // If filters is not valid JSON, use default
          }

          return {
            id: report.id,
            name: report.name,
            type: report.reportType,
            format,
            data: null, // Report config doesn't have data, only snapshots do
            generatedAt: report.createdAt,
            userId: report.userId,
          };
        });
      } catch (error) {
        throw new GraphQLError('Failed to fetch reports', {
          extensions: {
            code: 'INTERNAL_SERVER_ERROR',
            originalError: error instanceof Error ? error.message : 'Unknown error'
          },
        });
      }
    },

    report: async (_: any, { id }: { id: string }, context: any) => {
      if (!context.user) {
        throw new GraphQLError('Not authenticated', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      try {
        // Fetch report ensuring it belongs to the authenticated user
        const report = await prisma.report.findFirst({
          where: {
            id,
            userId: context.user.id
          },
        });

        if (!report) {
          throw new GraphQLError('Report not found', {
            extensions: { code: 'NOT_FOUND' },
          });
        }

        // Parse filters to extract format
        let format = 'PDF'; // default
        try {
          const parsedFilters = JSON.parse(report.filters);
          format = parsedFilters.format || 'PDF';
        } catch (e) {
          // If filters is not valid JSON, use default
        }

        return {
          id: report.id,
          name: report.name,
          type: report.reportType,
          format,
          data: null, // Report config doesn't have data, only snapshots do
          generatedAt: report.createdAt,
          userId: report.userId,
        };
      } catch (error) {
        if (error instanceof GraphQLError) {
          throw error;
        }
        throw new GraphQLError('Failed to fetch report', {
          extensions: {
            code: 'INTERNAL_SERVER_ERROR',
            originalError: error instanceof Error ? error.message : 'Unknown error'
          },
        });
      }
    },
  },

  Mutation: {
    generateReport: async (_: any, { input }: { input: GenerateReportInput }, context: any) => {
      if (!context.user) {
        throw new GraphQLError('Not authenticated', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      // Validate input
      if (!input.name || input.name.trim().length === 0) {
        throw new GraphQLError('Report name is required', {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }

      if (!input.type || input.type.trim().length === 0) {
        throw new GraphQLError('Report type is required', {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }

      // Validate report type against allowed values
      const validReportTypes = ['EARNINGS', 'SALES', 'EXPENSES', 'FINANCIAL'];
      if (!validReportTypes.includes(input.type.toUpperCase())) {
        throw new GraphQLError(
          `Invalid report type. Must be one of: ${validReportTypes.join(', ')}`,
          {
            extensions: { code: 'BAD_USER_INPUT' },
          }
        );
      }

      // Validate format
      const validFormats = ['PDF', 'CSV', 'EXCEL'];
      if (!input.format || !validFormats.includes(input.format.toUpperCase())) {
        throw new GraphQLError(
          `Invalid format. Must be one of: ${validFormats.join(', ')}`,
          {
            extensions: { code: 'BAD_USER_INPUT' },
          }
        );
      }

      try {
        // Build filters object
        const filtersObject: any = {
          format: input.format.toUpperCase(),
        };

        if (input.startDate) {
          filtersObject.startDate = input.startDate;
        }

        if (input.endDate) {
          filtersObject.endDate = input.endDate;
        }

        // Merge with any additional filters provided
        if (input.filters) {
          try {
            const additionalFilters = JSON.parse(input.filters);
            Object.assign(filtersObject, additionalFilters);
          } catch (e) {
            throw new GraphQLError('Invalid filters JSON format', {
              extensions: { code: 'BAD_USER_INPUT' },
            });
          }
        }

        // Create the report in the database
        const report = await prisma.report.create({
          data: {
            userId: context.user.id,
            name: input.name.trim(),
            description: `Generated ${input.type} report`, // Default description
            reportType: input.type.toUpperCase(),
            columns: JSON.stringify([]), // Default empty columns array
            filters: JSON.stringify(filtersObject),
            sorting: JSON.stringify({ field: 'date', order: 'desc' }), // Default sorting
            isPublic: false,
          },
        });

        // Return in GraphQL Report format
        return {
          id: report.id,
          name: report.name,
          type: report.reportType,
          format: input.format.toUpperCase(),
          data: null, // Will be populated when report is actually generated/snapshot is created
          generatedAt: report.createdAt,
          userId: report.userId,
        };
      } catch (error) {
        if (error instanceof GraphQLError) {
          throw error;
        }
        throw new GraphQLError('Failed to create report', {
          extensions: {
            code: 'INTERNAL_SERVER_ERROR',
            originalError: error instanceof Error ? error.message : 'Unknown error'
          },
        });
      }
    },
  },
};
