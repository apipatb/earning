import { X, BarChart3, TrendingUp, DollarSign, Package, Briefcase } from 'lucide-react';

interface DashboardPreset {
  id: string;
  name: string;
  description: string;
  icon: any;
  layout: any;
  widgets: any[];
}

interface DashboardPresetsProps {
  onClose: () => void;
  onLoadPreset: (preset: DashboardPreset) => void;
}

const presets: DashboardPreset[] = [
  {
    id: 'executive',
    name: 'Executive Summary',
    description: 'High-level overview of business performance with key metrics',
    icon: Briefcase,
    layout: { cols: 12, rowHeight: 100 },
    widgets: [
      {
        type: 'KPI',
        title: 'Total Revenue',
        dataSource: 'revenue',
        positionX: 0,
        positionY: 0,
        sizeW: 3,
        sizeH: 2,
        config: { period: 'month', showTrend: true, metric: 'totalRevenue' },
      },
      {
        type: 'KPI',
        title: 'Net Profit',
        dataSource: 'revenue',
        positionX: 3,
        positionY: 0,
        sizeW: 3,
        sizeH: 2,
        config: { period: 'month', showTrend: true, metric: 'netProfit' },
      },
      {
        type: 'KPI',
        title: 'Profit Margin',
        dataSource: 'revenue',
        positionX: 6,
        positionY: 0,
        sizeW: 3,
        sizeH: 2,
        config: { period: 'month', showTrend: true, metric: 'profitMargin' },
      },
      {
        type: 'KPI',
        title: 'Total Expenses',
        dataSource: 'expenses',
        positionX: 9,
        positionY: 0,
        sizeW: 3,
        sizeH: 2,
        config: { period: 'month', showTrend: true, metric: 'total' },
      },
      {
        type: 'TIME_SERIES',
        title: 'Revenue Trend',
        dataSource: 'revenue',
        positionX: 0,
        positionY: 2,
        sizeW: 8,
        sizeH: 4,
        config: { period: 'quarter', interval: 'day' },
      },
      {
        type: 'CHART',
        title: 'Expenses Breakdown',
        dataSource: 'expenses',
        positionX: 8,
        positionY: 2,
        sizeW: 4,
        sizeH: 4,
        config: { chartType: 'pie', period: 'month', groupBy: 'category' },
      },
    ],
  },
  {
    id: 'sales',
    name: 'Sales Analytics',
    description: 'Detailed sales performance and product analytics',
    icon: BarChart3,
    layout: { cols: 12, rowHeight: 100 },
    widgets: [
      {
        type: 'KPI',
        title: 'Total Sales',
        dataSource: 'sales',
        positionX: 0,
        positionY: 0,
        sizeW: 3,
        sizeH: 2,
        config: { period: 'month', showTrend: true, metric: 'totalRevenue' },
      },
      {
        type: 'KPI',
        title: 'Units Sold',
        dataSource: 'sales',
        positionX: 3,
        positionY: 0,
        sizeW: 3,
        sizeH: 2,
        config: { period: 'month', showTrend: true, metric: 'totalQuantity' },
      },
      {
        type: 'KPI',
        title: 'Avg Order Value',
        dataSource: 'sales',
        positionX: 6,
        positionY: 0,
        sizeW: 3,
        sizeH: 2,
        config: { period: 'month', showTrend: true, metric: 'avgOrderValue' },
      },
      {
        type: 'KPI',
        title: 'Total Orders',
        dataSource: 'sales',
        positionX: 9,
        positionY: 0,
        sizeW: 3,
        sizeH: 2,
        config: { period: 'month', showTrend: true, metric: 'count' },
      },
      {
        type: 'CHART',
        title: 'Sales Trend',
        dataSource: 'sales',
        positionX: 0,
        positionY: 2,
        sizeW: 8,
        sizeH: 4,
        config: { chartType: 'line', period: 'month', metric: 'revenue' },
      },
      {
        type: 'TABLE',
        title: 'Top Products',
        dataSource: 'products',
        positionX: 8,
        positionY: 2,
        sizeW: 4,
        sizeH: 4,
        config: { limit: 10, orderBy: 'sales' },
      },
    ],
  },
  {
    id: 'financial',
    name: 'Financial Overview',
    description: 'Complete financial picture with income, expenses, and profitability',
    icon: DollarSign,
    layout: { cols: 12, rowHeight: 100 },
    widgets: [
      {
        type: 'KPI',
        title: 'Total Revenue',
        dataSource: 'revenue',
        positionX: 0,
        positionY: 0,
        sizeW: 4,
        sizeH: 2,
        config: { period: 'month', showTrend: true, metric: 'totalRevenue' },
      },
      {
        type: 'KPI',
        title: 'Total Expenses',
        dataSource: 'expenses',
        positionX: 4,
        positionY: 0,
        sizeW: 4,
        sizeH: 2,
        config: { period: 'month', showTrend: true, metric: 'total' },
      },
      {
        type: 'GAUGE',
        title: 'Profit Margin',
        dataSource: 'revenue',
        positionX: 8,
        positionY: 0,
        sizeW: 4,
        sizeH: 3,
        config: { period: 'month', metric: 'profitMargin', max: 100 },
      },
      {
        type: 'CHART',
        title: 'Income vs Expenses',
        dataSource: 'revenue',
        positionX: 0,
        positionY: 2,
        sizeW: 8,
        sizeH: 4,
        config: { chartType: 'area', period: 'quarter' },
      },
      {
        type: 'TABLE',
        title: 'Recent Invoices',
        dataSource: 'invoices',
        positionX: 0,
        positionY: 6,
        sizeW: 6,
        sizeH: 4,
        config: { limit: 10, status: null },
      },
      {
        type: 'CHART',
        title: 'Expenses by Category',
        dataSource: 'expenses',
        positionX: 6,
        positionY: 6,
        sizeW: 6,
        sizeH: 4,
        config: { chartType: 'bar', period: 'month', groupBy: 'category' },
      },
    ],
  },
  {
    id: 'earnings',
    name: 'Earnings Tracker',
    description: 'Monitor earnings across all platforms and sources',
    icon: TrendingUp,
    layout: { cols: 12, rowHeight: 100 },
    widgets: [
      {
        type: 'KPI',
        title: 'Total Earnings',
        dataSource: 'earnings',
        positionX: 0,
        positionY: 0,
        sizeW: 4,
        sizeH: 2,
        config: { period: 'month', showTrend: true, metric: 'total' },
      },
      {
        type: 'KPI',
        title: 'Avg per Day',
        dataSource: 'earnings',
        positionX: 4,
        positionY: 0,
        sizeW: 4,
        sizeH: 2,
        config: { period: 'month', showTrend: true, metric: 'avgPerDay' },
      },
      {
        type: 'KPI',
        title: 'Active Platforms',
        dataSource: 'platforms',
        positionX: 8,
        positionY: 0,
        sizeW: 4,
        sizeH: 2,
        config: { period: 'month', metric: 'count' },
      },
      {
        type: 'TIME_SERIES',
        title: 'Earnings Over Time',
        dataSource: 'earnings',
        positionX: 0,
        positionY: 2,
        sizeW: 12,
        sizeH: 4,
        config: { period: 'month', interval: 'day' },
      },
      {
        type: 'CHART',
        title: 'Earnings by Platform',
        dataSource: 'earnings',
        positionX: 0,
        positionY: 6,
        sizeW: 6,
        sizeH: 4,
        config: { chartType: 'bar', period: 'month', groupBy: 'platform' },
      },
      {
        type: 'CHART',
        title: 'Platform Performance',
        dataSource: 'platforms',
        positionX: 6,
        positionY: 6,
        sizeW: 6,
        sizeH: 4,
        config: { chartType: 'line', period: 'month' },
      },
    ],
  },
  {
    id: 'inventory',
    name: 'Inventory Management',
    description: 'Track inventory levels, stock alerts, and product performance',
    icon: Package,
    layout: { cols: 12, rowHeight: 100 },
    widgets: [
      {
        type: 'KPI',
        title: 'Total Products',
        dataSource: 'products',
        positionX: 0,
        positionY: 0,
        sizeW: 3,
        sizeH: 2,
        config: { metric: 'count' },
      },
      {
        type: 'KPI',
        title: 'Low Stock Items',
        dataSource: 'products',
        positionX: 3,
        positionY: 0,
        sizeW: 3,
        sizeH: 2,
        config: { metric: 'lowStock' },
      },
      {
        type: 'KPI',
        title: 'Total Inventory Value',
        dataSource: 'products',
        positionX: 6,
        positionY: 0,
        sizeW: 3,
        sizeH: 2,
        config: { metric: 'totalValue' },
      },
      {
        type: 'KPI',
        title: 'Units Sold',
        dataSource: 'sales',
        positionX: 9,
        positionY: 0,
        sizeW: 3,
        sizeH: 2,
        config: { period: 'month', metric: 'totalQuantity' },
      },
      {
        type: 'TABLE',
        title: 'Low Stock Products',
        dataSource: 'products',
        positionX: 0,
        positionY: 2,
        sizeW: 6,
        sizeH: 4,
        config: { limit: 10, orderBy: 'quantity' },
      },
      {
        type: 'TABLE',
        title: 'Top Selling Products',
        dataSource: 'products',
        positionX: 6,
        positionY: 2,
        sizeW: 6,
        sizeH: 4,
        config: { limit: 10, orderBy: 'sales' },
      },
    ],
  },
];

export default function DashboardPresets({ onClose, onLoadPreset }: DashboardPresetsProps) {
  const handleSelectPreset = (preset: DashboardPreset) => {
    onLoadPreset(preset);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Dashboard Presets</h2>
            <p className="text-sm text-gray-500 mt-1">
              Choose a preset to quickly set up your dashboard
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {presets.map((preset) => {
              const Icon = preset.icon;
              return (
                <div
                  key={preset.id}
                  className="border-2 border-gray-200 rounded-lg p-6 hover:border-indigo-500 hover:shadow-lg transition-all cursor-pointer group"
                  onClick={() => handleSelectPreset(preset)}
                >
                  <div className="flex items-start space-x-4">
                    <div className="p-3 bg-indigo-100 text-indigo-600 rounded-lg group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                      <Icon className="w-8 h-8" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        {preset.name}
                      </h3>
                      <p className="text-sm text-gray-600 mb-4">
                        {preset.description}
                      </p>
                      <div className="flex items-center justify-between">
                        <div className="text-xs text-gray-500">
                          {preset.widgets.length} widgets
                        </div>
                        <button className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 opacity-0 group-hover:opacity-100 transition-opacity">
                          Use This Preset
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Widget Preview */}
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="text-xs font-medium text-gray-700 mb-2">Includes:</div>
                    <div className="flex flex-wrap gap-2">
                      {preset.widgets.slice(0, 6).map((widget, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded"
                        >
                          {widget.title}
                        </span>
                      ))}
                      {preset.widgets.length > 6 && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                          +{preset.widgets.length - 6} more
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              You can customize any preset after loading it
            </p>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
