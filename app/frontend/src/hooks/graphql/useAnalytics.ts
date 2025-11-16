import { useQuery, gql } from '@apollo/client';

// Query to get analytics summary
const GET_ANALYTICS_SUMMARY = gql`
  query GetAnalyticsSummary($filter: AnalyticsFilterInput) {
    analyticsSummary(filter: $filter) {
      period
      startDate
      endDate
      totalEarnings
      totalHours
      avgHourlyRate
      byPlatform {
        platform {
          id
          name
          color
        }
        earnings
        hours
        hourlyRate
        percentage
      }
      dailyBreakdown {
        date
        earnings
        hours
      }
    }
  }
`;

// Custom hook to fetch analytics summary
export const useAnalyticsSummary = (filter?: any) => {
  return useQuery(GET_ANALYTICS_SUMMARY, {
    variables: { filter },
    fetchPolicy: 'cache-and-network',
  });
};
