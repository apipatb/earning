import React, { useState, useEffect } from 'react';
import { Activity, Smartphone, AlertTriangle, Settings, Plus, Trash2, RefreshCw } from 'lucide-react';

const Sync = () => {
  const [activeTab, setActiveTab] = useState('devices');
  const [devices, setDevices] = useState<any[]>([]);
  const [syncStatus, setSyncStatus] = useState<any>(null);
  const [conflicts, setConflicts] = useState<any[]>([]);
  const [syncQueue, setSyncQueue] = useState<any[]>([]);
  const [showAddDevice, setShowAddDevice] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form states
  const [deviceForm, setDeviceForm] = useState({
    deviceName: '',
    deviceType: 'mobile',
    osVersion: '',
  });

  const [selectiveSync, setSelectiveSync] = useState({
    enabled: true,
    dataTypes: ['earnings', 'goals', 'platforms', 'analytics'],
  });

  useEffect(() => {
    loadSyncData();
    const interval = setInterval(loadSyncData, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadSyncData = async () => {
    setLoading(true);
    try {
      const [devicesRes, statusRes, conflictsRes, queueRes] = await Promise.all([
        fetch('/api/v1/sync/devices'),
        fetch('/api/v1/sync/status'),
        fetch('/api/v1/sync/conflicts'),
        fetch('/api/v1/sync/queue'),
      ]);

      if (devicesRes.ok) setDevices(await devicesRes.json());
      if (statusRes.ok) setSyncStatus(await statusRes.json());
      if (conflictsRes.ok) setConflicts(await conflictsRes.json());
      if (queueRes.ok) setSyncQueue(await queueRes.json());
    } catch (error) {
      console.error('Failed to load sync data:', error);
    }
    setLoading(false);
  };

  const handleAddDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/v1/sync/devices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(deviceForm),
      });

      if (res.ok) {
        setDeviceForm({ deviceName: '', deviceType: 'mobile', osVersion: '' });
        setShowAddDevice(false);
        loadSyncData();
      }
    } catch (error) {
      console.error('Failed to add device:', error);
    }
  };

  const handleDeleteDevice = async (deviceId: string) => {
    if (!confirm('Are you sure you want to remove this device?')) return;

    try {
      const res = await fetch(`/api/v1/sync/devices/${deviceId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        loadSyncData();
      }
    } catch (error) {
      console.error('Failed to delete device:', error);
    }
  };

  const handleResolveConflict = async (conflictId: string, resolution: string) => {
    try {
      const res = await fetch(`/api/v1/sync/conflicts/${conflictId}/resolve`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolution, selectedVersion: resolution }),
      });

      if (res.ok) {
        loadSyncData();
      }
    } catch (error) {
      console.error('Failed to resolve conflict:', error);
    }
  };

  const handleProcessQueue = async () => {
    try {
      const res = await fetch('/api/v1/sync/queue/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchSize: 10 }),
      });

      if (res.ok) {
        loadSyncData();
      }
    } catch (error) {
      console.error('Failed to process sync queue:', error);
    }
  };

  const handleSaveSelectiveSync = async () => {
    try {
      const res = await fetch('/api/v1/sync/selective-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(selectiveSync),
      });

      if (res.ok) {
        alert('Selective sync settings saved');
      }
    } catch (error) {
      console.error('Failed to save selective sync:', error);
    }
  };

  const getDeviceIcon = (type: string) => {
    const icons: { [key: string]: string } = {
      mobile: '📱',
      tablet: '📱',
      web: '🖥️',
      desktop: '💻',
      other: '📟',
    };
    return icons[type] || '📟';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Multi-Device Sync
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Synchronize data across all your devices
          </p>
        </div>

        {/* Sync Status Cards */}
        {syncStatus && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">Active Devices</p>
                  <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                    {syncStatus.activeDevices}/{syncStatus.totalDevices}
                  </p>
                </div>
                <Smartphone className="text-blue-500" size={32} />
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">Pending Syncs</p>
                  <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">
                    {syncStatus.pendingSync}
                  </p>
                </div>
                <Activity className="text-yellow-500" size={32} />
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">Unresolved Conflicts</p>
                  <p className="text-3xl font-bold text-red-600 dark:text-red-400">
                    {syncStatus.unresolvedConflicts}
                  </p>
                </div>
                <AlertTriangle className="text-red-500" size={32} />
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">Sync Health</p>
                  <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                    {syncStatus.syncHealth?.toFixed(0)}%
                  </p>
                </div>
                <RefreshCw className="text-green-500" size={32} />
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <div className="flex gap-0">
              {[
                { id: 'devices', label: 'Devices', icon: '📱' },
                { id: 'sync-queue', label: 'Sync Queue', icon: '⏳' },
                { id: 'conflicts', label: 'Conflicts', icon: '⚠️' },
                { id: 'settings', label: 'Settings', icon: '⚙️' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
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
            {/* Devices Tab */}
            {activeTab === 'devices' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">Registered Devices</h2>
                  <button
                    onClick={() => setShowAddDevice(!showAddDevice)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
                  >
                    <Plus size={20} /> Add Device
                  </button>
                </div>

                {showAddDevice && (
                  <form onSubmit={handleAddDevice} className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <input
                        type="text"
                        placeholder="Device Name"
                        value={deviceForm.deviceName}
                        onChange={(e) => setDeviceForm({ ...deviceForm, deviceName: e.target.value })}
                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-600 dark:text-white"
                        required
                      />
                      <select
                        value={deviceForm.deviceType}
                        onChange={(e) => setDeviceForm({ ...deviceForm, deviceType: e.target.value })}
                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-600 dark:text-white"
                      >
                        <option value="mobile">Mobile</option>
                        <option value="tablet">Tablet</option>
                        <option value="web">Web</option>
                        <option value="desktop">Desktop</option>
                      </select>
                      <input
                        type="text"
                        placeholder="OS Version"
                        value={deviceForm.osVersion}
                        onChange={(e) => setDeviceForm({ ...deviceForm, osVersion: e.target.value })}
                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-600 dark:text-white"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg"
                      >
                        Register Device
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowAddDevice(false)}
                        className="bg-gray-400 hover:bg-gray-500 text-white px-4 py-2 rounded-lg"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}

                <div className="space-y-3">
                  {devices.length > 0 ? (
                    devices.map((device) => (
                      <div
                        key={device.id}
                        className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg flex items-center justify-between"
                      >
                        <div className="flex items-center gap-4">
                          <span className="text-3xl">{getDeviceIcon(device.deviceType)}</span>
                          <div>
                            <h3 className="font-semibold text-gray-900 dark:text-white">
                              {device.deviceName}
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {device.deviceType} • {device.osVersion}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-500">
                              Last sync: {new Date(device.lastSyncAt).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-3 py-1 rounded-full text-sm font-medium ${
                              device.isActive
                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                : 'bg-gray-200 text-gray-800 dark:bg-gray-600 dark:text-gray-200'
                            }`}
                          >
                            {device.isActive ? 'Active' : 'Inactive'}
                          </span>
                          <button
                            onClick={() => handleDeleteDevice(device.id)}
                            className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                          >
                            <Trash2 size={20} />
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-600 dark:text-gray-400 text-center py-8">
                      No devices registered yet
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Sync Queue Tab */}
            {activeTab === 'sync-queue' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">Sync Queue</h2>
                  <button
                    onClick={handleProcessQueue}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
                  >
                    <RefreshCw size={20} /> Process Queue
                  </button>
                </div>

                <div className="space-y-3">
                  {syncQueue.length > 0 ? (
                    syncQueue.map((item) => (
                      <div
                        key={item.id}
                        className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-semibold text-gray-900 dark:text-white">
                              {item.operationType} - {item.dataType}
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              Retry count: {item.retryCount}
                            </p>
                          </div>
                          <span
                            className={`px-3 py-1 rounded-full text-sm font-medium ${
                              item.status === 'pending'
                                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900'
                                : item.status === 'synced'
                                ? 'bg-green-100 text-green-800 dark:bg-green-900'
                                : 'bg-red-100 text-red-800 dark:bg-red-900'
                            }`}
                          >
                            {item.status}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-600 dark:text-gray-400 text-center py-8">
                      Sync queue is empty
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Conflicts Tab */}
            {activeTab === 'conflicts' && (
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Sync Conflicts</h2>

                <div className="space-y-3">
                  {conflicts.length > 0 ? (
                    conflicts.map((conflict) => (
                      <div
                        key={conflict.id}
                        className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg"
                      >
                        <div className="mb-3">
                          <h3 className="font-semibold text-gray-900 dark:text-white">
                            {conflict.dataType} (ID: {conflict.dataId})
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Detected: {new Date(conflict.detectedAt).toLocaleString()}
                          </p>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <div className="bg-white dark:bg-gray-800 p-3 rounded">
                            <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">
                              Local Version
                            </p>
                            <p className="text-sm text-gray-900 dark:text-white break-all">
                              {JSON.stringify(JSON.parse(conflict.localData), null, 2).substring(0, 100)}...
                            </p>
                          </div>
                          <div className="bg-white dark:bg-gray-800 p-3 rounded">
                            <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">
                              Remote Version
                            </p>
                            <p className="text-sm text-gray-900 dark:text-white break-all">
                              {JSON.stringify(JSON.parse(conflict.remoteData), null, 2).substring(0, 100)}...
                            </p>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => handleResolveConflict(conflict.id, 'local')}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm"
                          >
                            Use Local
                          </button>
                          <button
                            onClick={() => handleResolveConflict(conflict.id, 'remote')}
                            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm"
                          >
                            Use Remote
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-600 dark:text-gray-400 text-center py-8">
                      No sync conflicts
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Settings Tab */}
            {activeTab === 'settings' && (
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Sync Settings</h2>

                <div className="bg-gray-50 dark:bg-gray-700 p-6 rounded-lg">
                  <div className="mb-6">
                    <label className="flex items-center gap-3 mb-4">
                      <input
                        type="checkbox"
                        checked={selectiveSync.enabled}
                        onChange={(e) =>
                          setSelectiveSync({ ...selectiveSync, enabled: e.target.checked })
                        }
                        className="w-5 h-5"
                      />
                      <span className="text-gray-900 dark:text-white font-medium">
                        Enable Selective Sync
                      </span>
                    </label>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Choose which data types to sync across devices
                    </p>
                  </div>

                  {selectiveSync.enabled && (
                    <div className="mb-6 space-y-3">
                      <h3 className="font-semibold text-gray-900 dark:text-white">Data Types to Sync</h3>
                      {['earnings', 'goals', 'platforms', 'analytics'].map((dataType) => (
                        <label key={dataType} className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={selectiveSync.dataTypes.includes(dataType)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectiveSync({
                                  ...selectiveSync,
                                  dataTypes: [...selectiveSync.dataTypes, dataType],
                                });
                              } else {
                                setSelectiveSync({
                                  ...selectiveSync,
                                  dataTypes: selectiveSync.dataTypes.filter((d) => d !== dataType),
                                });
                              }
                            }}
                            className="w-4 h-4"
                          />
                          <span className="text-gray-900 dark:text-white capitalize">{dataType}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  <button
                    onClick={handleSaveSelectiveSync}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium"
                  >
                    Save Settings
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sync;
