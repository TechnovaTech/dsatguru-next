'use client'
import { useState } from 'react'
import { FiSave, FiRefreshCw, FiSettings, FiMail, FiDatabase, FiShield } from 'react-icons/fi'

export default function SystemSettings() {
  const [settings, setSettings] = useState({
    siteName: 'DSATGURU',
    siteDescription: 'Digital SAT/PSAT Preparation Platform',
    adminEmail: 'admin@dsatguru.com',
    supportEmail: 'support@dsatguru.com',
    maintenanceMode: false,
    registrationEnabled: true,
    emailNotifications: true,
    smsNotifications: false,
    maxFileSize: 10,
    sessionTimeout: 30,
    backupFrequency: 'daily'
  })

  const handleSave = () => {
    alert('Settings saved successfully!')
  }

  const handleReset = () => {
    if (window.confirm('Are you sure you want to reset all settings to default?')) {
      // reset logic placeholder
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">System Settings</h1>
          <div className="flex gap-2">
            <button
              onClick={handleReset}
              className="bg-gray-500 text-white px-4 py-2 rounded flex items-center gap-2"
            >
              <FiRefreshCw /> Reset
            </button>
            <button
              onClick={handleSave}
              className="bg-blue-500 text-white px-4 py-2 rounded flex items-center gap-2"
            >
              <FiSave /> Save Changes
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-2 mb-4">
              <FiSettings className="text-blue-600" />
              <h3 className="text-lg font-semibold">General Settings</h3>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Site Name</label>
                <input
                  type="text"
                  value={settings.siteName}
                  onChange={(e) => setSettings({ ...settings, siteName: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Site Description</label>
                <textarea
                  value={settings.siteDescription}
                  onChange={(e) => setSettings({ ...settings, siteDescription: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  rows="3"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="maintenance"
                  checked={settings.maintenanceMode}
                  onChange={(e) => setSettings({ ...settings, maintenanceMode: e.target.checked })}
                />
                <label htmlFor="maintenance" className="text-sm">Maintenance Mode</label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="registration"
                  checked={settings.registrationEnabled}
                  onChange={(e) => setSettings({ ...settings, registrationEnabled: e.target.checked })}
                />
                <label htmlFor="registration" className="text-sm">Enable Registration</label>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-2 mb-4">
              <FiMail className="text-green-600" />
              <h3 className="text-lg font-semibold">Email Settings</h3>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Admin Email</label>
                <input
                  type="email"
                  value={settings.adminEmail}
                  onChange={(e) => setSettings({ ...settings, adminEmail: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Support Email</label>
                <input
                  type="email"
                  value={settings.supportEmail}
                  onChange={(e) => setSettings({ ...settings, supportEmail: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="emailNotif"
                  checked={settings.emailNotifications}
                  onChange={(e) => setSettings({ ...settings, emailNotifications: e.target.checked })}
                />
                <label htmlFor="emailNotif" className="text-sm">Email Notifications</label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="smsNotif"
                  checked={settings.smsNotifications}
                  onChange={(e) => setSettings({ ...settings, smsNotifications: e.target.checked })}
                />
                <label htmlFor="smsNotif" className="text-sm">SMS Notifications</label>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-2 mb-4">
              <FiDatabase className="text-purple-600" />
              <h3 className="text-lg font-semibold">System Configuration</h3>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Max File Size (MB)</label>
                <input
                  type="number"
                  value={settings.maxFileSize}
                  onChange={(e) => setSettings({ ...settings, maxFileSize: parseInt(e.target.value) })}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text sm font-medium mb-1">Session Timeout (minutes)</label>
                <input
                  type="number"
                  value={settings.sessionTimeout}
                  onChange={(e) => setSettings({ ...settings, sessionTimeout: parseInt(e.target.value) })}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Backup Frequency</label>
                <select
                  value={settings.backupFrequency}
                  onChange={(e) => setSettings({ ...settings, backupFrequency: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="hourly">Hourly</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-2 mb-4">
              <FiShield className="text-red-600" />
              <h3 className="text-lg font-semibold">Security Settings</h3>
            </div>
            <div className="space-y-4">
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
                <h4 className="font-medium text-yellow-800 mb-2">Security Status</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>SSL Certificate:</span>
                    <span className="text-green-600 font-medium">Active</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Two-Factor Auth:</span>
                    <span className="text-green-600 font-medium">Enabled</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Password Policy:</span>
                    <span className="text-green-600 font-medium">Strong</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Last Security Scan:</span>
                    <span className="text-gray-600">2 hours ago</span>
                  </div>
                </div>
              </div>
              <button className="w-full bg-red-500 text-white py-2 rounded hover:bg-red-600">
                Run Security Scan
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
