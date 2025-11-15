import React, { useState, useEffect } from 'react';
import { CheckCircle, AlertTriangle, FileText, Settings, BarChart3, Plus, Trash2 } from 'lucide-react';

const Compliance = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [dashboard, setDashboard] = useState<any>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [policies, setPolicies] = useState<any[]>([]);
  const [violations, setViolations] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [frameworks, setFrameworks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddPolicy, setShowAddPolicy] = useState(false);

  // Form states
  const [policyForm, setPolicyForm] = useState({
    policyName: '',
    framework: 'gdpr',
    description: '',
    enforcementLevel: 'critical',
  });

  const [reportForm, setReportForm] = useState({
    framework: 'gdpr',
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    loadComplianceData();
    const interval = setInterval(loadComplianceData, 10000);
    return () => clearInterval(interval);
  }, []);

  const loadComplianceData = async () => {
    setLoading(true);
    try {
      const [dashboardRes, logsRes, policiesRes, violationsRes, reportsRes, frameworksRes] =
        await Promise.all([
          fetch('/api/v1/compliance/dashboard'),
          fetch('/api/v1/compliance/audit-logs'),
          fetch('/api/v1/compliance/policies'),
          fetch('/api/v1/compliance/violations'),
          fetch('/api/v1/compliance/reports'),
          fetch('/api/v1/compliance/frameworks'),
        ]);

      if (dashboardRes.ok) setDashboard(await dashboardRes.json());
      if (logsRes.ok) setAuditLogs(await logsRes.json());
      if (policiesRes.ok) setPolicies(await policiesRes.json());
      if (violationsRes.ok) setViolations(await violationsRes.json());
      if (reportsRes.ok) setReports(await reportsRes.json());
      if (frameworksRes.ok) setFrameworks(await frameworksRes.json());
    } catch (error) {
      console.error('Failed to load compliance data:', error);
    }
    setLoading(false);
  };

  const handleAddPolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/v1/compliance/policies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...policyForm,
          requirements: ['Data protection', 'Access control', 'Audit logging'],
        }),
      });

      if (res.ok) {
        setPolicyForm({
          policyName: '',
          framework: 'gdpr',
          description: '',
          enforcementLevel: 'critical',
        });
        setShowAddPolicy(false);
        loadComplianceData();
      }
    } catch (error) {
      console.error('Failed to add policy:', error);
    }
  };

  const handleGenerateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/v1/compliance/reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reportForm),
      });

      if (res.ok) {
        loadComplianceData();
        alert('Report generated successfully');
      }
    } catch (error) {
      console.error('Failed to generate report:', error);
    }
  };

  const handleResolveViolation = async (violationId: string) => {
    try {
      const res = await fetch(`/api/v1/compliance/violations/${violationId}/resolve`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolution: 'addressed', notes: 'Issue has been resolved' }),
      });

      if (res.ok) {
        loadComplianceData();
      }
    } catch (error) {
      console.error('Failed to resolve violation:', error);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      default:
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    }
  };

  const getStatusColor = (status: string) => {
    return status === 'compliant'
      ? 'text-green-600 dark:text-green-400'
      : 'text-red-600 dark:text-red-400';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Compliance & Audit
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Manage compliance, regulatory frameworks, and audit trails
          </p>
        </div>

        {/* Compliance Status Cards */}
        {dashboard && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">Compliance Rate</p>
                  <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                    {dashboard.complianceOverview.complianceRate.toFixed(1)}%
                  </p>
                </div>
                <CheckCircle className="text-green-500" size={32} />
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">Open Violations</p>
                  <p className="text-3xl font-bold text-red-600 dark:text-red-400">
                    {dashboard.openViolations}
                  </p>
                </div>
                <AlertTriangle className="text-red-500" size={32} />
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">Active Policies</p>
                  <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                    {dashboard.activePolicies}
                  </p>
                </div>
                <FileText className="text-blue-500" size={32} />
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">Recent Activity</p>
                  <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                    {dashboard.recentActivity}
                  </p>
                </div>
                <BarChart3 className="text-purple-500" size={32} />
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <div className="flex gap-0 flex-wrap">
              {[
                { id: 'dashboard', label: 'Dashboard', icon: '📊' },
                { id: 'audit-logs', label: 'Audit Logs', icon: '📋' },
                { id: 'policies', label: 'Policies', icon: '📜' },
                { id: 'violations', label: 'Violations', icon: '⚠️' },
                { id: 'reports', label: 'Reports', icon: '📈' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 min-w-[120px] px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                  }`}
                >
                  <span className="mr-2">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="p-6">
            {/* Dashboard Tab */}
            {activeTab === 'dashboard' && dashboard && (
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
                  Compliance Overview
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  <div className="bg-gray-50 dark:bg-gray-700 p-6 rounded-lg">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
                      Compliance Summary
                    </h3>
                    <div className="space-y-2">
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Total Records: <span className="font-bold">{dashboard.complianceOverview.totalRecords}</span>
                      </p>
                      <p className="text-sm text-green-600 dark:text-green-400">
                        Compliant: <span className="font-bold">{dashboard.complianceOverview.compliant}</span>
                      </p>
                      <p className="text-sm text-red-600 dark:text-red-400">
                        Non-Compliant: <span className="font-bold">{dashboard.complianceOverview.nonCompliant}</span>
                      </p>
                    </div>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-700 p-6 rounded-lg">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
                      Recent Frameworks
                    </h3>
                    <div className="space-y-2">
                      {frameworks.slice(0, 3).map((framework) => (
                        <p key={framework.id} className="text-sm text-gray-600 dark:text-gray-400">
                          {framework.name}: <span className="font-bold">{framework.description}</span>
                        </p>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Audit Logs Tab */}
            {activeTab === 'audit-logs' && (
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Audit Logs</h2>

                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {auditLogs.length > 0 ? (
                    auditLogs.map((log) => (
                      <div key={log.id} className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-semibold text-gray-900 dark:text-white">
                              {log.action}
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {log.entityType} (ID: {log.entityId})
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-500">
                              {new Date(log.timestamp).toLocaleString()}
                            </p>
                          </div>
                          {log.ipAddress && (
                            <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded">
                              {log.ipAddress}
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-600 dark:text-gray-400 text-center py-8">
                      No audit logs found
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Policies Tab */}
            {activeTab === 'policies' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    Compliance Policies
                  </h2>
                  <button
                    onClick={() => setShowAddPolicy(!showAddPolicy)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
                  >
                    <Plus size={20} /> Add Policy
                  </button>
                </div>

                {showAddPolicy && (
                  <form onSubmit={handleAddPolicy} className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <input
                        type="text"
                        placeholder="Policy Name"
                        value={policyForm.policyName}
                        onChange={(e) =>
                          setPolicyForm({ ...policyForm, policyName: e.target.value })
                        }
                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-600 dark:text-white"
                        required
                      />
                      <select
                        value={policyForm.framework}
                        onChange={(e) =>
                          setPolicyForm({ ...policyForm, framework: e.target.value })
                        }
                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-600 dark:text-white"
                      >
                        {frameworks.map((f) => (
                          <option key={f.id} value={f.id}>
                            {f.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <textarea
                      placeholder="Description"
                      value={policyForm.description}
                      onChange={(e) =>
                        setPolicyForm({ ...policyForm, description: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-600 dark:text-white mb-4"
                    />
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg"
                      >
                        Create Policy
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowAddPolicy(false)}
                        className="bg-gray-400 hover:bg-gray-500 text-white px-4 py-2 rounded-lg"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}

                <div className="space-y-3">
                  {policies.length > 0 ? (
                    policies.map((policy) => (
                      <div key={policy.id} className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-semibold text-gray-900 dark:text-white">
                              {policy.policyName}
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {policy.framework.toUpperCase()} • {policy.enforcementLevel}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                              {policy.description}
                            </p>
                          </div>
                          <span
                            className={`px-3 py-1 rounded-full text-sm font-medium ${
                              policy.isActive
                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                : 'bg-gray-200 text-gray-800 dark:bg-gray-600 dark:text-gray-200'
                            }`}
                          >
                            {policy.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-600 dark:text-gray-400 text-center py-8">
                      No compliance policies yet
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Violations Tab */}
            {activeTab === 'violations' && (
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
                  Compliance Violations
                </h2>

                <div className="space-y-3">
                  {violations.length > 0 ? (
                    violations.map((violation) => (
                      <div key={violation.id} className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-semibold text-gray-900 dark:text-white">
                            {violation.violationType}
                          </h3>
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getSeverityColor(violation.severity)}`}>
                            {violation.severity}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                          {violation.description}
                        </p>
                        <div className="flex gap-2">
                          {violation.status === 'open' && (
                            <button
                              onClick={() => handleResolveViolation(violation.id)}
                              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm"
                            >
                              Resolve
                            </button>
                          )}
                          <span className="text-xs bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 px-2 py-1 rounded">
                            {violation.status}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-600 dark:text-gray-400 text-center py-8">
                      No violations reported
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Reports Tab */}
            {activeTab === 'reports' && (
              <div>
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                    Generate Compliance Report
                  </h2>

                  <form onSubmit={handleGenerateReport} className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <select
                        value={reportForm.framework}
                        onChange={(e) =>
                          setReportForm({ ...reportForm, framework: e.target.value })
                        }
                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-600 dark:text-white"
                      >
                        {frameworks.map((f) => (
                          <option key={f.id} value={f.id}>
                            {f.name}
                          </option>
                        ))}
                      </select>
                      <input
                        type="date"
                        value={reportForm.startDate}
                        onChange={(e) =>
                          setReportForm({ ...reportForm, startDate: e.target.value })
                        }
                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-600 dark:text-white"
                      />
                      <input
                        type="date"
                        value={reportForm.endDate}
                        onChange={(e) =>
                          setReportForm({ ...reportForm, endDate: e.target.value })
                        }
                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-600 dark:text-white"
                      />
                    </div>
                    <button
                      type="submit"
                      className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium"
                    >
                      Generate Report
                    </button>
                  </form>
                </div>

                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                  Recent Reports
                </h3>
                <div className="space-y-3">
                  {reports.length > 0 ? (
                    reports.map((report) => (
                      <div key={report.id} className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-semibold text-gray-900 dark:text-white">
                              {report.framework.toUpperCase()} Report
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {new Date(report.startDate).toLocaleDateString()} to{' '}
                              {new Date(report.endDate).toLocaleDateString()}
                            </p>
                            <div className="mt-2 grid grid-cols-3 gap-4 text-sm">
                              <p>
                                Compliant:{' '}
                                <span className="font-bold text-green-600 dark:text-green-400">
                                  {report.compliantChecks}
                                </span>
                              </p>
                              <p>
                                Non-Compliant:{' '}
                                <span className="font-bold text-red-600 dark:text-red-400">
                                  {report.nonCompliantChecks}
                                </span>
                              </p>
                              <p>
                                Rate:{' '}
                                <span className="font-bold text-blue-600 dark:text-blue-400">
                                  {report.complianceRate.toFixed(1)}%
                                </span>
                              </p>
                            </div>
                          </div>
                          <span className="text-xs bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 px-2 py-1 rounded">
                            {new Date(report.generatedAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-600 dark:text-gray-400 text-center py-8">
                      No reports generated yet
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Compliance;
