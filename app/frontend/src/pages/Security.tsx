import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface Session {
  id: string;
  ipAddress: string;
  userAgent: string;
  createdAt: string;
  isActive: boolean;
}

interface WhitelistedIP {
  id: string;
  ipAddress: string;
  description: string;
  addedAt: string;
}

interface AuditLog {
  id: string;
  action: string;
  ipAddress: string;
  timestamp: string;
}

export default function Security() {
  const [activeTab, setActiveTab] = useState('overview');
  const [securitySettings, setSecuritySettings] = useState<any>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [whitelistedIPs, setWhitelistedIPs] = useState<WhitelistedIP[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  // 2FA
  const [twoFAQR, setTwoFAQR] = useState<string>('');
  const [twoFAToken, setTwoFAToken] = useState<string>('');
  const [showingBackupCodes, setShowingBackupCodes] = useState<string[]>([]);

  // IP Whitelist
  const [newIP, setNewIP] = useState<string>('');
  const [newIPDesc, setNewIPDesc] = useState<string>('');

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const settingsRes = await axios.get('/api/v1/security/settings');
      setSecuritySettings(settingsRes.data);

      if (activeTab === 'sessions') {
        const sessionsRes = await axios.get('/api/v1/security/sessions');
        setSessions(sessionsRes.data);
      } else if (activeTab === 'ips') {
        const ipsRes = await axios.get('/api/v1/security/ip-whitelist');
        setWhitelistedIPs(ipsRes.data);
      } else if (activeTab === 'audit') {
        const auditRes = await axios.get('/api/v1/security/audit-log');
        setAuditLogs(auditRes.data.logs);
      }
    } catch (error) {
      console.error('Error fetching security data:', error);
    } finally {
      setLoading(false);
    }
  };

  const setup2FA = async () => {
    try {
      const res = await axios.post('/api/v1/security/2fa/setup');
      setTwoFAQR(res.data.qrCode);
    } catch (error) {
      console.error('Error setting up 2FA:', error);
    }
  };

  const enable2FA = async () => {
    try {
      const res = await axios.post('/api/v1/security/2fa/enable', {
        secret: twoFAQR,
        token: twoFAToken,
      });
      setShowingBackupCodes(res.data.backupCodes);
      setTwoFAToken('');
      alert('2FA enabled successfully! Save your backup codes.');
    } catch (error) {
      console.error('Error enabling 2FA:', error);
      alert('Failed to enable 2FA. Please check the token and try again.');
    }
  };

  const disable2FA = async () => {
    try {
      await axios.post('/api/v1/security/2fa/disable');
      setSecuritySettings({ ...securitySettings, twoFAEnabled: false });
      alert('2FA disabled');
    } catch (error) {
      console.error('Error disabling 2FA:', error);
    }
  };

  const addWhitelistedIP = async () => {
    try {
      await axios.post('/api/v1/security/ip-whitelist', {
        ipAddress: newIP,
        description: newIPDesc,
      });
      setNewIP('');
      setNewIPDesc('');
      fetchData();
      alert('IP added to whitelist');
    } catch (error) {
      console.error('Error adding IP:', error);
      alert('Failed to add IP');
    }
  };

  const removeWhitelistedIP = async (ipId: string) => {
    try {
      await axios.delete(`/api/v1/security/ip-whitelist/${ipId}`);
      fetchData();
    } catch (error) {
      console.error('Error removing IP:', error);
    }
  };

  const revokeSession = async (sessionId: string) => {
    try {
      await axios.delete(`/api/v1/security/sessions/${sessionId}`);
      fetchData();
      alert('Session revoked');
    } catch (error) {
      console.error('Error revoking session:', error);
    }
  };

  const requestDataExport = async () => {
    try {
      const res = await axios.post('/api/v1/security/data/export');
      alert('Data export requested. Check your email when ready.');
    } catch (error) {
      console.error('Error requesting data export:', error);
    }
  };

  const requestDataDeletion = async () => {
    if (!window.confirm('Are you sure? You have 30 days to cancel this request.')) {
      return;
    }
    try {
      await axios.post('/api/v1/security/data/delete', {
        reason: 'User requested account deletion',
      });
      alert('Account deletion scheduled. You have 30 days to cancel.');
    } catch (error) {
      console.error('Error requesting deletion:', error);
    }
  };

  if (loading && !securitySettings) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Security & Privacy</h1>
          <p className="text-gray-400">Manage your account security and privacy settings</p>
        </div>

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-700 flex gap-8">
          {[
            { id: 'overview', label: '🔒 Overview' },
            { id: '2fa', label: '🔐 Two-Factor Auth' },
            { id: 'sessions', label: '📱 Sessions' },
            { id: 'ips', label: '🌐 IP Whitelist' },
            { id: 'audit', label: '📋 Audit Log' },
            { id: 'privacy', label: '👤 Privacy' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 border-b-2 font-medium transition ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <h3 className="text-lg font-bold text-white mb-4">Two-Factor Authentication</h3>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Status</p>
                    <p className={`text-lg font-semibold ${
                      securitySettings?.twoFAEnabled ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {securitySettings?.twoFAEnabled ? 'Enabled ✓' : 'Disabled'}
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveTab('2fa')}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                  >
                    Manage
                  </button>
                </div>
              </div>

              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <h3 className="text-lg font-bold text-white mb-4">IP Whitelist</h3>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Whitelisted IPs</p>
                    <p className="text-lg font-semibold text-blue-400">{whitelistedIPs.length}</p>
                  </div>
                  <button
                    onClick={() => setActiveTab('ips')}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                  >
                    Manage
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h3 className="text-lg font-bold text-white mb-4">Active Sessions</h3>
              <p className="text-gray-400 mb-4">
                You have {sessions.length} active session(s)
              </p>
              <button
                onClick={() => setActiveTab('sessions')}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
              >
                View Sessions
              </button>
            </div>
          </div>
        )}

        {/* 2FA Tab */}
        {activeTab === '2fa' && (
          <div className="space-y-6">
            {!securitySettings?.twoFAEnabled ? (
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 max-w-2xl">
                <h3 className="text-xl font-bold text-white mb-4">Enable Two-Factor Authentication</h3>
                <p className="text-gray-400 mb-6">
                  Protect your account by requiring a second form of verification when logging in.
                </p>

                {!twoFAQR ? (
                  <button
                    onClick={setup2FA}
                    className="px-6 py-3 bg-blue-600 text-white rounded hover:bg-blue-700 transition font-medium"
                  >
                    Set Up 2FA
                  </button>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Scan QR Code
                      </label>
                      <img src={twoFAQR} alt="2FA QR Code" className="w-48 h-48" />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Enter 6-digit code
                      </label>
                      <input
                        type="text"
                        value={twoFAToken}
                        onChange={(e) => setTwoFAToken(e.target.value)}
                        placeholder="000000"
                        maxLength={6}
                        className="w-full px-4 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 outline-none"
                      />
                    </div>

                    <button
                      onClick={enable2FA}
                      className="w-full px-6 py-3 bg-green-600 text-white rounded hover:bg-green-700 transition font-medium"
                    >
                      Enable 2FA
                    </button>
                  </div>
                )}

                {showingBackupCodes.length > 0 && (
                  <div className="mt-6 bg-yellow-900 bg-opacity-30 border border-yellow-600 rounded p-4">
                    <h4 className="text-yellow-400 font-bold mb-3">Backup Codes</h4>
                    <p className="text-yellow-300 text-sm mb-3">
                      Save these codes in a safe place. You can use them if you lose access to your authenticator.
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {showingBackupCodes.map((code, idx) => (
                        <div key={idx} className="bg-gray-700 px-3 py-2 rounded font-mono text-sm">
                          {code}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-gray-800 rounded-lg p-6 border border-green-700 max-w-2xl">
                <h3 className="text-xl font-bold text-green-400 mb-4">✓ 2FA Enabled</h3>
                <p className="text-gray-400 mb-6">
                  Your account is protected with two-factor authentication.
                </p>
                <button
                  onClick={disable2FA}
                  className="px-6 py-3 bg-red-600 text-white rounded hover:bg-red-700 transition font-medium"
                >
                  Disable 2FA
                </button>
              </div>
            )}
          </div>
        )}

        {/* Sessions Tab */}
        {activeTab === 'sessions' && (
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-white">Active Sessions</h3>
            {sessions.length > 0 ? (
              sessions.map((session) => (
                <div key={session.id} className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-white font-semibold">{session.ipAddress}</p>
                      <p className="text-gray-400 text-sm">{session.userAgent}</p>
                      <p className="text-gray-500 text-xs">
                        Created: {new Date(session.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      onClick={() => revokeSession(session.id)}
                      className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
                    >
                      Revoke
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-400">No active sessions</p>
            )}
          </div>
        )}

        {/* IP Whitelist Tab */}
        {activeTab === 'ips' && (
          <div className="space-y-6">
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 max-w-2xl">
              <h3 className="text-xl font-bold text-white mb-4">Add IP to Whitelist</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    IP Address
                  </label>
                  <input
                    type="text"
                    value={newIP}
                    onChange={(e) => setNewIP(e.target.value)}
                    placeholder="192.168.1.1"
                    className="w-full px-4 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Description (optional)
                  </label>
                  <input
                    type="text"
                    value={newIPDesc}
                    onChange={(e) => setNewIPDesc(e.target.value)}
                    placeholder="Home Network"
                    className="w-full px-4 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 outline-none"
                  />
                </div>

                <button
                  onClick={addWhitelistedIP}
                  className="w-full px-6 py-3 bg-blue-600 text-white rounded hover:bg-blue-700 transition font-medium"
                >
                  Add IP
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-xl font-bold text-white">Whitelisted IPs</h3>
              {whitelistedIPs.length > 0 ? (
                whitelistedIPs.map((ip) => (
                  <div key={ip.id} className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-white font-semibold">{ip.ipAddress}</p>
                        {ip.description && (
                          <p className="text-gray-400 text-sm">{ip.description}</p>
                        )}
                        <p className="text-gray-500 text-xs">
                          Added: {new Date(ip.addedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <button
                        onClick={() => removeWhitelistedIP(ip.id)}
                        className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-400">No whitelisted IPs</p>
              )}
            </div>
          </div>
        )}

        {/* Audit Log Tab */}
        {activeTab === 'audit' && (
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-white">Security Audit Log</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-700">
                    <th className="px-6 py-3 text-left text-gray-300">Action</th>
                    <th className="px-6 py-3 text-left text-gray-300">IP Address</th>
                    <th className="px-6 py-3 text-left text-gray-300">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="border-b border-gray-700 hover:bg-gray-700">
                      <td className="px-6 py-3 text-white">{log.action}</td>
                      <td className="px-6 py-3 text-gray-400">{log.ipAddress}</td>
                      <td className="px-6 py-3 text-gray-400">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Privacy Tab */}
        {activeTab === 'privacy' && (
          <div className="space-y-6">
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 max-w-2xl">
              <h3 className="text-xl font-bold text-white mb-4">🔽 Export Your Data</h3>
              <p className="text-gray-400 mb-6">
                Download a copy of all your data in JSON format. You'll receive a download link via email.
              </p>
              <button
                onClick={requestDataExport}
                className="px-6 py-3 bg-blue-600 text-white rounded hover:bg-blue-700 transition font-medium"
              >
                Request Data Export
              </button>
            </div>

            <div className="bg-red-900 bg-opacity-30 rounded-lg p-6 border border-red-700 max-w-2xl">
              <h3 className="text-xl font-bold text-red-400 mb-4">🗑️ Delete Account</h3>
              <p className="text-red-300 mb-4">
                Permanently delete your account and all associated data. This action cannot be undone.
              </p>
              <p className="text-red-300 text-sm mb-6">
                You will have 30 days to cancel this request before permanent deletion.
              </p>
              <button
                onClick={requestDataDeletion}
                className="px-6 py-3 bg-red-600 text-white rounded hover:bg-red-700 transition font-medium"
              >
                Delete Account
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
