import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Plus,
  Search,
  Filter,
  Download,
  Share2,
  Settings,
  FileText,
  BarChart3,
  Grid3x3,
  Clock,
  TrendingUp,
} from 'lucide-react';

interface Report {
  id: string;
  name: string;
  description?: string;
  reportType: string;
  format: string;
  schedule: string;
  isActive: boolean;
  createdAt: string;
}

interface Dashboard {
  id: string;
  name: string;
  description?: string;
  layout: string;
  isDefault: boolean;
  createdAt: string;
}

const Reports: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [reports, setReports] = useState<Report[]>([]);
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateReport, setShowCreateReport] = useState(false);
  const [showCreateDashboard, setShowCreateDashboard] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const apiClient = axios.create({
    baseURL: 'http://localhost:5000/api/v1',
    headers: {
      Authorization: 'Bearer ' + (localStorage.getItem('token') || ''),
    },
  });

  useEffect(() => {
    fetchAllData();
  }, [activeTab]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'reports') {
        const res = await apiClient.get('/reports/reports');
        setReports(res.data);
      } else if (activeTab === 'dashboards') {
        const res = await apiClient.get('/reports/dashboards');
        setDashboards(res.data);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateReport = async (formData: any) => {
    try {
      await apiClient.post('/reports/reports', formData);
      setShowCreateReport(false);
      fetchAllData();
    } catch (error) {
      console.error('Failed to create report:', error);
    }
  };

  const handleCreateDashboard = async (formData: any) => {
    try {
      await apiClient.post('/reports/dashboards', formData);
      setShowCreateDashboard(false);
      fetchAllData();
    } catch (error) {
      console.error('Failed to create dashboard:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Reports & Dashboards</h1>
          <p className="text-slate-400">Create, manage, and share reports and dashboards</p>
        </div>

        <div className="flex gap-2 mb-8 border-b border-slate-700">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={activeTab === 'dashboard' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-slate-400'}
          >
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={activeTab === 'reports' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-slate-400'}
          >
            Reports
          </button>
          <button
            onClick={() => setActiveTab('dashboards')}
            className={activeTab === 'dashboards' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-slate-400'}
          >
            Dashboards
          </button>
        </div>

        {activeTab === 'dashboard' && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-6 text-white">
              <p className="text-sm opacity-80">Total Reports</p>
              <p className="text-3xl font-bold">{reports.length}</p>
            </div>
            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-6 text-white">
              <p className="text-sm opacity-80">Active Reports</p>
              <p className="text-3xl font-bold">{reports.filter((r: Report) => r.isActive).length}</p>
            </div>
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-6 text-white">
              <p className="text-sm opacity-80">Total Dashboards</p>
              <p className="text-3xl font-bold">{dashboards.length}</p>
            </div>
            <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg p-6 text-white">
              <p className="text-sm opacity-80">Default Dashboards</p>
              <p className="text-3xl font-bold">{dashboards.filter((d: Dashboard) => d.isDefault).length}</p>
            </div>
          </div>
        )}

        {activeTab === 'reports' && (
          <button
            onClick={() => setShowCreateReport(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg"
          >
            <Plus className="w-5 h-5" />
            New Report
          </button>
        )}

        {activeTab === 'dashboards' && (
          <button
            onClick={() => setShowCreateDashboard(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg"
          >
            <Plus className="w-5 h-5" />
            New Dashboard
          </button>
        )}

        {showCreateReport && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-slate-800 rounded-lg p-8 max-w-md w-full">
              <h2 className="text-2xl font-bold text-white mb-6">Create Report</h2>
              <form onSubmit={(e) => {
                e.preventDefault();
                handleCreateReport({ name: 'Test' });
              }} className="space-y-4">
                <input type="text" placeholder="Report Name" required className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg" />
                <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg">Create</button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Reports;