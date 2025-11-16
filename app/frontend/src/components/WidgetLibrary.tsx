import { useState } from 'react';
import {
  X,
  BarChart3,
  TrendingUp,
  Table,
  Type,
  Gauge,
  Activity,
  Calendar,
  DollarSign,
  ShoppingCart,
  Package,
  Users,
  FileText,
  Target,
} from 'lucide-react';

interface WidgetTemplate {
  type: 'CHART' | 'KPI' | 'TABLE' | 'TEXT' | 'GAUGE' | 'HEATMAP' | 'TIME_SERIES';
  title: string;
  icon: any;
  description: string;
  dataSource: string;
  category: string;
  defaultConfig: any;
  defaultSize: { w: number; h: number };
}

interface WidgetLibraryProps {
  onClose: () => void;
  onAddWidget: (widgetConfig: any) => void;
}

const widgetTemplates: WidgetTemplate[] = [
  {
    type: 'KPI',
    title: 'Total Revenue',
    icon: DollarSign,
    description: 'Display total revenue with trend indicator',
    dataSource: 'revenue',
    category: 'Finance',
    defaultConfig: { period: 'month', showTrend: true, metric: 'totalRevenue' },
    defaultSize: { w: 3, h: 2 },
  },
  {
    type: 'KPI',
    title: 'Total Earnings',
    icon: TrendingUp,
    description: 'Display total earnings across all platforms',
    dataSource: 'earnings',
    category: 'Finance',
    defaultConfig: { period: 'month', showTrend: true, metric: 'total' },
    defaultSize: { w: 3, h: 2 },
  },
  {
    type: 'KPI',
    title: 'Total Sales',
    icon: ShoppingCart,
    description: 'Display total sales revenue',
    dataSource: 'sales',
    category: 'Sales',
    defaultConfig: { period: 'month', showTrend: true, metric: 'totalRevenue' },
    defaultSize: { w: 3, h: 2 },
  },
  {
    type: 'KPI',
    title: 'Total Expenses',
    icon: FileText,
    description: 'Display total expenses',
    dataSource: 'expenses',
    category: 'Finance',
    defaultConfig: { period: 'month', showTrend: true, metric: 'total' },
    defaultSize: { w: 3, h: 2 },
  },
  {
    type: 'CHART',
    title: 'Earnings by Platform',
    icon: BarChart3,
    description: 'Bar chart showing earnings breakdown by platform',
    dataSource: 'earnings',
    category: 'Analytics',
    defaultConfig: { chartType: 'bar', period: 'month', groupBy: 'platform' },
    defaultSize: { w: 6, h: 4 },
  },
  {
    type: 'CHART',
    title: 'Sales Trend',
    icon: Activity,
    description: 'Line chart showing sales over time',
    dataSource: 'sales',
    category: 'Sales',
    defaultConfig: { chartType: 'line', period: 'month', metric: 'revenue' },
    defaultSize: { w: 6, h: 4 },
  },
  {
    type: 'CHART',
    title: 'Expenses by Category',
    icon: BarChart3,
    description: 'Pie chart showing expense breakdown by category',
    dataSource: 'expenses',
    category: 'Finance',
    defaultConfig: { chartType: 'pie', period: 'month', groupBy: 'category' },
    defaultSize: { w: 6, h: 4 },
  },
  {
    type: 'TIME_SERIES',
    title: 'Revenue Over Time',
    icon: Calendar,
    description: 'Time series chart showing revenue trends',
    dataSource: 'revenue',
    category: 'Analytics',
    defaultConfig: { period: 'month', interval: 'day' },
    defaultSize: { w: 12, h: 4 },
  },
  {
    type: 'TABLE',
    title: 'Recent Invoices',
    icon: FileText,
    description: 'Table showing recent invoices',
    dataSource: 'invoices',
    category: 'Finance',
    defaultConfig: { limit: 10, status: null },
    defaultSize: { w: 6, h: 4 },
  },
  {
    type: 'TABLE',
    title: 'Active Goals',
    icon: Target,
    description: 'Table showing active goals and progress',
    dataSource: 'goals',
    category: 'Goals',
    defaultConfig: { limit: 5, status: 'ACTIVE' },
    defaultSize: { w: 6, h: 4 },
  },
  {
    type: 'TABLE',
    title: 'Top Products',
    icon: Package,
    description: 'Table showing top-selling products',
    dataSource: 'products',
    category: 'Sales',
    defaultConfig: { limit: 10, orderBy: 'sales' },
    defaultSize: { w: 6, h: 4 },
  },
  {
    type: 'GAUGE',
    title: 'Profit Margin',
    icon: Gauge,
    description: 'Gauge showing current profit margin',
    dataSource: 'revenue',
    category: 'Finance',
    defaultConfig: { period: 'month', metric: 'profitMargin', max: 100 },
    defaultSize: { w: 4, h: 3 },
  },
  {
    type: 'CHART',
    title: 'Platform Performance',
    icon: TrendingUp,
    description: 'Multi-line chart comparing platform performance',
    dataSource: 'platforms',
    category: 'Analytics',
    defaultConfig: { chartType: 'line', period: 'month' },
    defaultSize: { w: 12, h: 4 },
  },
  {
    type: 'TEXT',
    title: 'Custom Note',
    icon: Type,
    description: 'Add custom text or HTML content',
    dataSource: 'custom',
    category: 'Other',
    defaultConfig: { content: '<h2>Welcome to your dashboard!</h2><p>Start customizing...</p>' },
    defaultSize: { w: 4, h: 2 },
  },
];

export default function WidgetLibrary({ onClose, onAddWidget }: WidgetLibraryProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedTemplate, setSelectedTemplate] = useState<WidgetTemplate | null>(null);
  const [customTitle, setCustomTitle] = useState('');

  const categories = ['All', ...Array.from(new Set(widgetTemplates.map(t => t.category)))];

  const filteredTemplates = selectedCategory === 'All'
    ? widgetTemplates
    : widgetTemplates.filter(t => t.category === selectedCategory);

  const handleSelectTemplate = (template: WidgetTemplate) => {
    setSelectedTemplate(template);
    setCustomTitle(template.title);
  };

  const handleAddWidget = () => {
    if (!selectedTemplate) return;

    const widgetConfig = {
      type: selectedTemplate.type,
      title: customTitle || selectedTemplate.title,
      config: selectedTemplate.defaultConfig,
      positionX: 0,
      positionY: 0,
      sizeW: selectedTemplate.defaultSize.w,
      sizeH: selectedTemplate.defaultSize.h,
      dataSource: selectedTemplate.dataSource,
      refreshInterval: 60,
    };

    onAddWidget(widgetConfig);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Widget Library</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Categories */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedCategory === category
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTemplates.map((template, index) => {
              const Icon = template.icon;
              return (
                <button
                  key={index}
                  onClick={() => handleSelectTemplate(template)}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    selectedTemplate === template
                      ? 'border-indigo-600 bg-indigo-50'
                      : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <div className={`p-2 rounded-lg ${
                      selectedTemplate === template
                        ? 'bg-indigo-100 text-indigo-600'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 mb-1">
                        {template.title}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {template.description}
                      </p>
                      <div className="mt-2 flex items-center space-x-2">
                        <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">
                          {template.type}
                        </span>
                        <span className="text-xs text-gray-400">
                          {template.defaultSize.w}x{template.defaultSize.h}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        {selectedTemplate && (
          <div className="p-6 border-t border-gray-200 bg-gray-50">
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Widget Title
              </label>
              <input
                type="text"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Enter widget title"
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                <span className="font-medium">Selected: </span>
                {selectedTemplate.title} ({selectedTemplate.type})
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={onClose}
                  className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddWidget}
                  className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  Add Widget
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
