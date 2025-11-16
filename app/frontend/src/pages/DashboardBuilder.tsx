import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, Save, Trash2, Settings, Eye, Grid, ArrowLeft, Download, Share2 } from 'lucide-react';
import GridLayout from '../components/GridLayout';
import WidgetLibrary from '../components/WidgetLibrary';
import WidgetRenderer from '../components/WidgetRenderer';
import DashboardPresets from '../components/DashboardPresets';
import { useDashboard } from '../hooks/useDashboard';
import jsPDF from 'jspdf';

interface Widget {
  id: string;
  type: 'CHART' | 'KPI' | 'TABLE' | 'TEXT' | 'GAUGE' | 'HEATMAP' | 'TIME_SERIES';
  title: string;
  config: any;
  positionX: number;
  positionY: number;
  sizeW: number;
  sizeH: number;
  dataSource: string;
  refreshInterval?: number;
}

interface Dashboard {
  id: string;
  name: string;
  layout: any;
  isDefault: boolean;
  widgets: Widget[];
}

export default function DashboardBuilder() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const {
    dashboards,
    currentDashboard,
    loading,
    getDashboards,
    getDashboard,
    createDashboard,
    updateDashboard,
    deleteDashboard,
    addWidget,
    updateWidget,
    deleteWidget,
  } = useDashboard();

  const [showWidgetLibrary, setShowWidgetLibrary] = useState(false);
  const [showPresets, setShowPresets] = useState(false);
  const [editMode, setEditMode] = useState(true);
  const [dashboardName, setDashboardName] = useState('My Dashboard');
  const [layoutConfig, setLayoutConfig] = useState({ cols: 12, rowHeight: 100 });

  useEffect(() => {
    if (id) {
      loadDashboard(id);
    } else {
      getDashboards();
    }
  }, [id]);

  useEffect(() => {
    if (currentDashboard) {
      setDashboardName(currentDashboard.name);
      if (currentDashboard.layout) {
        setLayoutConfig(currentDashboard.layout);
      }
    }
  }, [currentDashboard]);

  const loadDashboard = async (dashboardId: string) => {
    await getDashboard(dashboardId);
  };

  const handleSave = async () => {
    if (!currentDashboard) {
      // Create new dashboard
      const newDashboard = await createDashboard({
        name: dashboardName,
        layout: layoutConfig,
        isDefault: false,
      });
      if (newDashboard) {
        navigate(`/dashboard-builder/${newDashboard.id}`);
      }
    } else {
      // Update existing dashboard
      await updateDashboard(currentDashboard.id, {
        name: dashboardName,
        layout: layoutConfig,
      });
    }
  };

  const handleDelete = async () => {
    if (!currentDashboard) return;

    if (window.confirm('Are you sure you want to delete this dashboard?')) {
      await deleteDashboard(currentDashboard.id);
      navigate('/dashboards');
    }
  };

  const handleAddWidget = async (widgetConfig: any) => {
    if (!currentDashboard) {
      alert('Please save the dashboard first before adding widgets');
      return;
    }

    await addWidget(currentDashboard.id, widgetConfig);
    setShowWidgetLibrary(false);
  };

  const handleUpdateWidget = async (widgetId: string, updates: any) => {
    if (!currentDashboard) return;
    await updateWidget(currentDashboard.id, widgetId, updates);
  };

  const handleDeleteWidget = async (widgetId: string) => {
    if (!currentDashboard) return;

    if (window.confirm('Are you sure you want to delete this widget?')) {
      await deleteWidget(currentDashboard.id, widgetId);
    }
  };

  const handleLayoutChange = (layout: any[]) => {
    if (!currentDashboard || !editMode) return;

    // Update widget positions based on layout
    layout.forEach(item => {
      const widget = currentDashboard.widgets.find(w => w.id === item.i);
      if (widget) {
        handleUpdateWidget(item.i, {
          positionX: item.x,
          positionY: item.y,
          sizeW: item.w,
          sizeH: item.h,
        });
      }
    });
  };

  const handleExportPDF = async () => {
    if (!currentDashboard) return;

    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    });

    doc.setFontSize(18);
    doc.text(currentDashboard.name, 20, 20);

    doc.setFontSize(12);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, 30);

    doc.setFontSize(10);
    let yPos = 40;

    currentDashboard.widgets.forEach((widget, index) => {
      if (yPos > 180) {
        doc.addPage();
        yPos = 20;
      }

      doc.text(`${index + 1}. ${widget.title}`, 20, yPos);
      doc.text(`   Type: ${widget.type}`, 25, yPos + 5);
      doc.text(`   Data Source: ${widget.dataSource}`, 25, yPos + 10);
      yPos += 20;
    });

    doc.save(`${currentDashboard.name}-dashboard.pdf`);
  };

  const handleLoadPreset = async (preset: any) => {
    setDashboardName(preset.name);
    setLayoutConfig(preset.layout);
    setShowPresets(false);
  };

  if (loading && !currentDashboard) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-500">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/dashboards')}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <input
                type="text"
                value={dashboardName}
                onChange={(e) => setDashboardName(e.target.value)}
                className="text-xl font-bold text-gray-900 bg-transparent border-b-2 border-transparent hover:border-gray-300 focus:border-indigo-500 focus:outline-none px-2"
                placeholder="Dashboard Name"
              />
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setEditMode(!editMode)}
                className={`px-4 py-2 rounded-lg flex items-center space-x-2 ${
                  editMode
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                {editMode ? <Settings className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                <span>{editMode ? 'Edit Mode' : 'View Mode'}</span>
              </button>

              <button
                onClick={() => setShowPresets(true)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center space-x-2"
              >
                <Grid className="w-4 h-4" />
                <span>Presets</span>
              </button>

              <button
                onClick={handleExportPDF}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center space-x-2"
              >
                <Download className="w-4 h-4" />
                <span>Export PDF</span>
              </button>

              <button
                onClick={handleSave}
                disabled={loading}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 flex items-center space-x-2"
              >
                <Save className="w-4 h-4" />
                <span>Save</span>
              </button>

              {currentDashboard && (
                <button
                  onClick={handleDelete}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center space-x-2"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {editMode && (
          <div className="mb-6">
            <button
              onClick={() => setShowWidgetLibrary(true)}
              className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center space-x-2"
            >
              <Plus className="w-5 h-5" />
              <span>Add Widget</span>
            </button>
          </div>
        )}

        {/* Dashboard Grid */}
        {currentDashboard && currentDashboard.widgets.length > 0 ? (
          <GridLayout
            widgets={currentDashboard.widgets}
            editMode={editMode}
            onLayoutChange={handleLayoutChange}
            cols={layoutConfig.cols}
            rowHeight={layoutConfig.rowHeight}
          >
            {currentDashboard.widgets.map((widget) => (
              <div key={widget.id} className="bg-white rounded-lg shadow-lg p-4 overflow-hidden">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">{widget.title}</h3>
                  {editMode && (
                    <button
                      onClick={() => handleDeleteWidget(widget.id)}
                      className="p-1 text-gray-400 hover:text-red-600 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <WidgetRenderer
                  widget={widget}
                  dashboardId={currentDashboard.id}
                />
              </div>
            ))}
          </GridLayout>
        ) : (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <Grid className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No widgets yet</h3>
            <p className="text-gray-500 mb-6">
              Add widgets to your dashboard to start visualizing your data
            </p>
            <button
              onClick={() => setShowWidgetLibrary(true)}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              Add Your First Widget
            </button>
          </div>
        )}
      </div>

      {/* Widget Library Modal */}
      {showWidgetLibrary && (
        <WidgetLibrary
          onClose={() => setShowWidgetLibrary(false)}
          onAddWidget={handleAddWidget}
        />
      )}

      {/* Presets Modal */}
      {showPresets && (
        <DashboardPresets
          onClose={() => setShowPresets(false)}
          onLoadPreset={handleLoadPreset}
        />
      )}
    </div>
  );
}
