import { useState, useCallback } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface Dashboard {
  id: string;
  name: string;
  layout: any;
  isDefault: boolean;
  widgets: Widget[];
  createdAt: string;
  updatedAt: string;
}

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

interface DashboardConfig {
  name: string;
  layout?: any;
  isDefault?: boolean;
}

interface WidgetConfig {
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

export function useDashboard() {
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [currentDashboard, setCurrentDashboard] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };
  };

  /**
   * Get all dashboards
   */
  const getDashboards = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await axios.get(`${API_URL}/api/v1/dashboards`, getAuthHeaders());
      setDashboards(response.data);
      return response.data;
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'Failed to fetch dashboards';
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Get a single dashboard
   */
  const getDashboard = useCallback(async (dashboardId: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await axios.get(
        `${API_URL}/api/v1/dashboards/${dashboardId}`,
        getAuthHeaders()
      );
      setCurrentDashboard(response.data);
      return response.data;
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'Failed to fetch dashboard';
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Create a new dashboard
   */
  const createDashboard = useCallback(async (config: DashboardConfig) => {
    try {
      setLoading(true);
      setError(null);

      const response = await axios.post(
        `${API_URL}/api/v1/dashboards`,
        config,
        getAuthHeaders()
      );

      const newDashboard = response.data;
      setDashboards(prev => [...prev, newDashboard]);
      setCurrentDashboard(newDashboard);
      return newDashboard;
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'Failed to create dashboard';
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Update dashboard
   */
  const updateDashboard = useCallback(
    async (dashboardId: string, updates: Partial<DashboardConfig>) => {
      try {
        setLoading(true);
        setError(null);

        const response = await axios.put(
          `${API_URL}/api/v1/dashboards/${dashboardId}`,
          updates,
          getAuthHeaders()
        );

        const updatedDashboard = response.data;
        setDashboards(prev =>
          prev.map(d => (d.id === dashboardId ? updatedDashboard : d))
        );
        setCurrentDashboard(updatedDashboard);
        return updatedDashboard;
      } catch (err: any) {
        const errorMsg = err.response?.data?.error || 'Failed to update dashboard';
        setError(errorMsg);
        throw new Error(errorMsg);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /**
   * Delete dashboard
   */
  const deleteDashboard = useCallback(async (dashboardId: string) => {
    try {
      setLoading(true);
      setError(null);

      await axios.delete(
        `${API_URL}/api/v1/dashboards/${dashboardId}`,
        getAuthHeaders()
      );

      setDashboards(prev => prev.filter(d => d.id !== dashboardId));
      if (currentDashboard?.id === dashboardId) {
        setCurrentDashboard(null);
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'Failed to delete dashboard';
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  }, [currentDashboard]);

  /**
   * Add widget to dashboard
   */
  const addWidget = useCallback(
    async (dashboardId: string, widgetConfig: WidgetConfig) => {
      try {
        setLoading(true);
        setError(null);

        const response = await axios.post(
          `${API_URL}/api/v1/dashboards/${dashboardId}/widgets`,
          widgetConfig,
          getAuthHeaders()
        );

        const newWidget = response.data;

        // Update current dashboard
        if (currentDashboard && currentDashboard.id === dashboardId) {
          setCurrentDashboard({
            ...currentDashboard,
            widgets: [...currentDashboard.widgets, newWidget],
          });
        }

        return newWidget;
      } catch (err: any) {
        const errorMsg = err.response?.data?.error || 'Failed to add widget';
        setError(errorMsg);
        throw new Error(errorMsg);
      } finally {
        setLoading(false);
      }
    },
    [currentDashboard]
  );

  /**
   * Update widget
   */
  const updateWidget = useCallback(
    async (dashboardId: string, widgetId: string, updates: Partial<WidgetConfig>) => {
      try {
        setLoading(true);
        setError(null);

        const response = await axios.put(
          `${API_URL}/api/v1/dashboards/${dashboardId}/widgets/${widgetId}`,
          updates,
          getAuthHeaders()
        );

        const updatedWidget = response.data;

        // Update current dashboard
        if (currentDashboard && currentDashboard.id === dashboardId) {
          setCurrentDashboard({
            ...currentDashboard,
            widgets: currentDashboard.widgets.map(w =>
              w.id === widgetId ? updatedWidget : w
            ),
          });
        }

        return updatedWidget;
      } catch (err: any) {
        const errorMsg = err.response?.data?.error || 'Failed to update widget';
        setError(errorMsg);
        throw new Error(errorMsg);
      } finally {
        setLoading(false);
      }
    },
    [currentDashboard]
  );

  /**
   * Delete widget
   */
  const deleteWidget = useCallback(
    async (dashboardId: string, widgetId: string) => {
      try {
        setLoading(true);
        setError(null);

        await axios.delete(
          `${API_URL}/api/v1/dashboards/${dashboardId}/widgets/${widgetId}`,
          getAuthHeaders()
        );

        // Update current dashboard
        if (currentDashboard && currentDashboard.id === dashboardId) {
          setCurrentDashboard({
            ...currentDashboard,
            widgets: currentDashboard.widgets.filter(w => w.id !== widgetId),
          });
        }
      } catch (err: any) {
        const errorMsg = err.response?.data?.error || 'Failed to delete widget';
        setError(errorMsg);
        throw new Error(errorMsg);
      } finally {
        setLoading(false);
      }
    },
    [currentDashboard]
  );

  /**
   * Get widget data
   */
  const getWidgetData = useCallback(async (dashboardId: string, widgetId: string) => {
    try {
      const response = await axios.get(
        `${API_URL}/api/v1/dashboards/${dashboardId}/widgets/${widgetId}`,
        getAuthHeaders()
      );
      return response.data;
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'Failed to fetch widget data';
      throw new Error(errorMsg);
    }
  }, []);

  /**
   * Get widget templates
   */
  const getWidgetTemplates = useCallback(async (category?: string) => {
    try {
      const url = category
        ? `${API_URL}/api/v1/dashboard/templates?category=${category}`
        : `${API_URL}/api/v1/dashboard/templates`;

      const response = await axios.get(url, getAuthHeaders());
      return response.data;
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'Failed to fetch widget templates';
      throw new Error(errorMsg);
    }
  }, []);

  return {
    dashboards,
    currentDashboard,
    loading,
    error,
    getDashboards,
    getDashboard,
    createDashboard,
    updateDashboard,
    deleteDashboard,
    addWidget,
    updateWidget,
    deleteWidget,
    getWidgetData,
    getWidgetTemplates,
  };
}
