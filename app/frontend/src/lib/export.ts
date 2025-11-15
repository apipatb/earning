/**
 * Export utilities for CSV and Excel
 */

export const exportToCSV = (data: any[], filename: string) => {
  if (data.length === 0) {
    alert('No data to export');
    return;
  }

  // Get headers from first object
  const headers = Object.keys(data[0]);

  // Create CSV content
  const csvContent = [
    headers.join(','), // Header row
    ...data.map(row =>
      headers.map(header => {
        const value = row[header];
        // Handle values that might contain commas or quotes
        if (value === null || value === undefined) return '';
        const stringValue = String(value);
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      }).join(',')
    )
  ].join('\n');

  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const exportEarningsToCSV = (earnings: any[]) => {
  const exportData = earnings.map(earning => ({
    Date: new Date(earning.date).toLocaleDateString(),
    Platform: earning.platform?.name || 'N/A',
    Category: earning.platform?.category || 'N/A',
    Amount: Number(earning.amount).toFixed(2),
    Hours: earning.hours ? Number(earning.hours).toFixed(2) : 'N/A',
    'Hourly Rate': earning.hours
      ? (Number(earning.amount) / Number(earning.hours)).toFixed(2)
      : 'N/A',
    Notes: earning.notes || '',
  }));

  const today = new Date().toISOString().split('T')[0];
  exportToCSV(exportData, `earnings-${today}`);
};

export const exportPlatformsToCSV = (platforms: any[]) => {
  const exportData = platforms.map(platform => ({
    Name: platform.name,
    Category: platform.category,
    'Expected Rate': platform.expectedRate ? `$${Number(platform.expectedRate).toFixed(2)}` : 'N/A',
    Active: platform.isActive ? 'Yes' : 'No',
    Color: platform.color || 'N/A',
  }));

  const today = new Date().toISOString().split('T')[0];
  exportToCSV(exportData, `platforms-${today}`);
};

export const exportGoalsToCSV = (goals: any[]) => {
  const exportData = goals.map(goal => ({
    Title: goal.title,
    Description: goal.description || '',
    'Target Amount': `$${Number(goal.targetAmount).toFixed(2)}`,
    'Current Amount': `$${Number(goal.currentAmount).toFixed(2)}`,
    Progress: `${((Number(goal.currentAmount) / Number(goal.targetAmount)) * 100).toFixed(1)}%`,
    Deadline: goal.deadline ? new Date(goal.deadline).toLocaleDateString() : 'N/A',
    Status: goal.status,
    Created: new Date(goal.createdAt).toLocaleDateString(),
  }));

  const today = new Date().toISOString().split('T')[0];
  exportToCSV(exportData, `goals-${today}`);
};

export const exportAnalyticsToCSV = (analytics: any) => {
  // Export platform breakdown
  const platformData = analytics.earningsByPlatform.map((item: any) => ({
    Platform: item.platform,
    Amount: `$${Number(item.amount).toFixed(2)}`,
    Percentage: `${item.percentage.toFixed(1)}%`,
  }));

  const today = new Date().toISOString().split('T')[0];
  exportToCSV(platformData, `analytics-platforms-${today}`);
};

export const exportDateRangeToCSV = (data: any[], startDate: string, endDate: string) => {
  const exportData = data.map(item => ({
    Date: new Date(item.date).toLocaleDateString(),
    Amount: `$${Number(item.amount).toFixed(2)}`,
    Hours: item.hours ? Number(item.hours).toFixed(2) : 'N/A',
  }));

  exportToCSV(exportData, `earnings-${startDate}-to-${endDate}`);
};
