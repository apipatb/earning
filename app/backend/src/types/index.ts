import { Request } from 'express';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
  };
}

export interface PlatformStats {
  total_earnings: number;
  total_hours: number;
  avg_hourly_rate: number;
}

export interface AnalyticsSummary {
  period: string;
  start_date: string;
  end_date: string;
  total_earnings: number;
  total_hours: number;
  avg_hourly_rate: number;
  by_platform: PlatformBreakdown[];
  daily_breakdown: DailyBreakdown[];
}

export interface PlatformBreakdown {
  platform: {
    id: string;
    name: string;
    color: string | null;
  };
  earnings: number;
  hours: number;
  hourly_rate: number;
  percentage: number;
}

export interface DailyBreakdown {
  date: string;
  earnings: number;
  hours: number;
}
